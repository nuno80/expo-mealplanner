import { db } from "@/db/client";
import { familyMembers, mealPlans, plannedMeals, recipes } from "@/db/schema";
import type {
  GenerateMealPlanInput,
  MealPlan,
  MealPlanWithMeals,
  MealType,
  PlannedMealWithRecipe,
  SwapMealInput,
} from "@/schemas/mealPlan";
import type { ProteinSource, RecipeCategory } from "@/schemas/recipe";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "expo-crypto";
import { getRecipesForPlanning } from "./recipe.service";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Mediterranean Diet weekly protein source targets (for 14 main meals)
 */
const WEEKLY_PROTEIN_TARGETS: Record<
  ProteinSource,
  { min: number; max: number; current: number }
> = {
  legumes: { min: 3, max: 5, current: 0 },
  fish: { min: 3, max: 4, current: 0 },
  white_meat: { min: 2, max: 3, current: 0 },
  eggs: { min: 2, max: 4, current: 0 },
  dairy: { min: 2, max: 3, current: 0 },
  red_meat: { min: 0, max: 1, current: 0 },
  plant_based: { min: 0, max: 3, current: 0 },
  mixed: { min: 0, max: 3, current: 0 },
  none: { min: 0, max: 1, current: 0 },
};

const DAILY_MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];

const SNACK_MEAL_TYPES: MealType[] = ["snack_am", "snack_pm"];

const MEAL_TYPE_TO_CATEGORY = {
  breakfast: "breakfast",
  lunch: "main_course",
  dinner: "main_course",
  snack_am: "snack",
  snack_pm: "snack",
} as const;

// ============================================================================
// MEAL PLAN QUERIES
// ============================================================================

/**
 * Get meal plan for a family member for a specific week.
 */
export async function getMealPlan(
  familyMemberId: string,
  weekStart: Date,
): Promise<MealPlanWithMeals | null> {
  // Get the meal plan
  const planResult = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.familyMemberId, familyMemberId),
        eq(mealPlans.weekStart, weekStart),
      ),
    );

  if (!planResult[0]) return null;

  const plan = planResult[0];

  // Get all planned meals for this plan
  const mealsResult = await db
    .select({
      id: plannedMeals.id,
      mealPlanId: plannedMeals.mealPlanId,
      recipeId: plannedMeals.recipeId,
      day: plannedMeals.day,
      mealType: plannedMeals.mealType,
      portionGrams: plannedMeals.portionGrams,
      portionKcal: plannedMeals.portionKcal,
      isCompleted: plannedMeals.isCompleted,
      createdAt: plannedMeals.createdAt,
      recipe: {
        id: recipes.id,
        nameIt: recipes.nameIt,
        nameEn: recipes.nameEn,
        imageUrl: recipes.imageUrl,
        category: recipes.category,
        kcalPer100g: recipes.kcalPer100g,
      },
    })
    .from(plannedMeals)
    .innerJoin(recipes, eq(plannedMeals.recipeId, recipes.id))
    .where(eq(plannedMeals.mealPlanId, plan.id));

  // Debug: check raw planned_meals count (without join)
  const rawMeals = await db
    .select({ id: plannedMeals.id, recipeId: plannedMeals.recipeId })
    .from(plannedMeals)
    .where(eq(plannedMeals.mealPlanId, plan.id));

  if (rawMeals.length > 0 && mealsResult.length === 0) {
    console.log(`[MealPlan] DEBUG: ${rawMeals.length} planned_meals exist but JOIN returned 0. Sample recipeId: ${rawMeals[0].recipeId}`);
    // Check if sample recipe exists
    const sampleRecipe = await db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, rawMeals[0].recipeId));
    console.log(`[MealPlan] DEBUG: Recipe ${rawMeals[0].recipeId} exists: ${sampleRecipe.length > 0}`);
  }

  console.log(`[MealPlan] getMealPlan found ${mealsResult.length} meals for plan ${plan.id}`);

  return {
    ...plan,
    meals: mealsResult as PlannedMealWithRecipe[],
  } as MealPlanWithMeals;
}

/**
 * Get all meal plans for a user (for history/overview).
 */
export async function getUserMealPlans(userId: string): Promise<MealPlan[]> {
  const result = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.userId, userId))
    .orderBy(mealPlans.weekStart);

  return result as MealPlan[];
}

// ============================================================================
// MEAL PLAN GENERATION
// ============================================================================

/**
 * Generate a new meal plan for a family member.
 *
 * Algorithm (Mediterranean Diet):
 * 1. Initialize weekly protein quotas
 * 2. Iterate days
 * 3. For main meals (lunch/dinner):
 *    - Prioritize protein sources that haven't met MIN quota
 *    - Exclude sources that met MAX quota
 *    - Try to select different source from Lunch for Dinner
 * 4. Apply standard caloric and variety constraints
 */
export async function generateMealPlan(
  input: GenerateMealPlanInput,
): Promise<MealPlanWithMeals> {
  // Get family member data
  const memberResult = await db
    .select()
    .from(familyMembers)
    .where(eq(familyMembers.id, input.familyMemberId));

  if (!memberResult[0]) {
    throw new Error("Family member not found");
  }

  const member = memberResult[0];
  const includeSnacks = input.includeSnacks ?? member.snacksEnabled;
  const targetKcalWeekly = input.targetKcalWeekly ?? member.targetKcal * 7;
  const dailyTarget = Math.round(targetKcalWeekly / 7);

  // Delete ALL existing meal plans for this week/member
  // This ensures we don't have duplicate plans with stale recipeIds
  const existingPlans = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.familyMemberId, input.familyMemberId),
        eq(mealPlans.weekStart, input.weekStart),
      ),
    );

  if (existingPlans.length > 0) {
    console.log(`[MealPlan] Deleting ${existingPlans.length} existing plan(s) before regenerating`);
    for (const plan of existingPlans) {
      await db.delete(mealPlans).where(eq(mealPlans.id, plan.id));
    }
  }

  // Create the meal plan
  const planId = randomUUID();
  await db.insert(mealPlans).values({
    id: planId,
    userId: member.userId,
    familyMemberId: input.familyMemberId,
    weekStart: input.weekStart,
    targetKcalWeekly,
    actualKcalWeekly: 0,
    status: "draft",
  });

  // Get recipes for each category
  const breakfastRecipes = await getRecipesForPlanning("breakfast");
  const mainCourseRecipes = await getRecipesForPlanning("main_course");
  const snackRecipes = includeSnacks
    ? await getRecipesForPlanning("snack")
    : [];

  // Debug: log recipe counts
  console.log(`[MealPlan] Recipes loaded - breakfast: ${breakfastRecipes.length}, main_course: ${mainCourseRecipes.length}, snack: ${snackRecipes.length}`);

  const recipesByCategory = {
    breakfast: breakfastRecipes,
    main_course: mainCourseRecipes,
    snack: snackRecipes,
  };

  // Initialize Protein Tracker
  // Clone targets to track current usage for this generation run
  const proteinTracker = Object.fromEntries(
    Object.entries(WEEKLY_PROTEIN_TARGETS).map(([key, val]) => [
      key,
      { ...val, current: 0 },
    ]),
  ) as Record<ProteinSource, { min: number; max: number; current: number }>;

  // Track recently used recipes (avoid repeats within 3 days)
  const recentlyUsed: Map<RecipeCategory, string[]> = new Map([
    ["breakfast", []],
    ["main_course", []],
    ["snack", []],
  ]);

  const plannedMealsToInsert: {
    id: string;
    mealPlanId: string;
    recipeId: string;
    day: number;
    mealType: MealType;
    portionGrams: number;
    portionKcal: number;
    isCompleted: boolean;
  }[] = [];

  let totalKcal = 0;

  // Generate meals for each day
  for (let day = 1; day <= 7; day++) {
    const mealTypes = includeSnacks
      ? [...DAILY_MEAL_TYPES, ...SNACK_MEAL_TYPES]
      : DAILY_MEAL_TYPES;

    // Allocate kcal per meal (rough distribution)
    const mealKcalTargets = includeSnacks
      ? {
        breakfast: Math.round(dailyTarget * 0.2),
        lunch: Math.round(dailyTarget * 0.3),
        dinner: Math.round(dailyTarget * 0.35),
        snack_am: Math.round(dailyTarget * 0.075),
        snack_pm: Math.round(dailyTarget * 0.075),
      }
      : {
        breakfast: Math.round(dailyTarget * 0.25),
        lunch: Math.round(dailyTarget * 0.35),
        dinner: Math.round(dailyTarget * 0.4),
        snack_am: 0,
        snack_pm: 0,
      };

    // Track protein source used at lunch to avoid repeat at dinner
    let lunchProteinSource: ProteinSource | null = null;

    for (const mealType of mealTypes) {
      const category = MEAL_TYPE_TO_CATEGORY[mealType];
      let pool = [...recipesByCategory[category]];
      const recent = recentlyUsed.get(category) ?? [];

      // --- PROTEIN ROTATION LOGIC (Lunch & Dinner) ---
      if (category === "main_course") {
        // 1. Filter out sources that hit MAX quota
        const validSources = Object.keys(proteinTracker).filter(
          (s) =>
            proteinTracker[s as ProteinSource].current <
            proteinTracker[s as ProteinSource].max,
        );

        let rotationPool = pool.filter((r) =>
          validSources.includes(r.proteinSource),
        );

        // 2. Identify priority sources (min quota not met)
        const prioritySources = Object.keys(proteinTracker).filter(
          (s) =>
            proteinTracker[s as ProteinSource].current <
            proteinTracker[s as ProteinSource].min,
        );

        // If we have priority sources, try to stick to them
        // But only if we have recipes for them available in the rotation pool
        const priorityPool = rotationPool.filter((r) =>
          prioritySources.includes(r.proteinSource),
        );

        if (priorityPool.length > 0) {
          rotationPool = priorityPool;
        }

        // 3. Dinner differentiation: try to avoid same source as lunch
        if (mealType === "dinner" && lunchProteinSource) {
          const diffPool = rotationPool.filter(
            (r) => r.proteinSource !== lunchProteinSource,
          );
          if (diffPool.length > 0) {
            rotationPool = diffPool;
          }
        }

        // If we successfully filtered, use the rotation pool
        // Fallback: if rotation filters emptied the pool (too restrictive), revert to original pool
        if (rotationPool.length > 0) {
          pool = rotationPool;
        }
      }

      // --- STANDARD VARIETY LOGIC ---
      // Filter out recently used recipes
      const candidates = pool.filter((r) => !recent.includes(r.id));

      // If no candidates after variety filter, use the pool (ignore recent used)
      const finalPool = candidates.length > 0 ? candidates : pool;

      if (finalPool.length === 0) {
        console.warn(`No recipes available for category: ${category}`);
        // Emergency fallback: use ALL recipes of category ignoring everything
        pool = recipesByCategory[category];
        if (pool.length === 0) continue;
        // Reset finalPool to full category pool
        finalPool.push(...pool);
      }

      // Random selection
      const recipe = finalPool[Math.floor(Math.random() * finalPool.length)];

      // --- UPDATE TRACKERS ---
      if (category === "main_course") {
        const source = recipe.proteinSource as ProteinSource;
        if (proteinTracker[source]) {
          proteinTracker[source].current++;
        }
        if (mealType === "lunch") {
          lunchProteinSource = source;
        }
      }

      // Update recently used (keep last 3)
      recent.push(recipe.id);
      if (recent.length > 3) recent.shift();
      recentlyUsed.set(category, recent);

      // Calculate portion to hit target kcal
      const targetKcal = mealKcalTargets[mealType];
      const portionGrams =
        recipe.kcalPer100g > 0
          ? Math.round((targetKcal / recipe.kcalPer100g) * 100)
          : (recipe.servingWeightG ?? 150);
      const actualKcal = Math.round((portionGrams / 100) * recipe.kcalPer100g);

      plannedMealsToInsert.push({
        id: randomUUID(),
        mealPlanId: planId,
        recipeId: recipe.id,
        day,
        mealType,
        portionGrams,
        portionKcal: actualKcal,
        isCompleted: false,
      });

      totalKcal += actualKcal;
    }
  }

  // Insert all planned meals
  console.log(`[MealPlan] Generated ${plannedMealsToInsert.length} planned meals, inserting...`);
  if (plannedMealsToInsert.length > 0) {
    try {
      await db.insert(plannedMeals).values(plannedMealsToInsert);
      console.log(`[MealPlan] Insert successful!`);
    } catch (error) {
      console.error(`[MealPlan] Insert FAILED:`, error);
      throw error;
    }
  }

  // Update actual kcal
  await db
    .update(mealPlans)
    .set({ actualKcalWeekly: totalKcal, status: "active" })
    .where(eq(mealPlans.id, planId));

  console.log(`[MealPlan] Plan created with ID ${planId}, fetching full plan...`);

  // Return the full plan
  return (await getMealPlan(input.familyMemberId, input.weekStart))!;
}

// ============================================================================
// MEAL PLAN MUTATIONS
// ============================================================================

/**
 * Swap a planned meal with a different recipe.
 */
export async function swapMeal(input: SwapMealInput): Promise<void> {
  // Get the current planned meal
  const currentMeal = await db
    .select()
    .from(plannedMeals)
    .where(eq(plannedMeals.id, input.plannedMealId));

  if (!currentMeal[0]) {
    throw new Error("Planned meal not found");
  }

  const meal = currentMeal[0];

  // Get the new recipe
  const newRecipe = await db
    .select()
    .from(recipes)
    .where(eq(recipes.id, input.newRecipeId));

  if (!newRecipe[0]) {
    throw new Error("New recipe not found");
  }

  const recipe = newRecipe[0];

  // Calculate new portion (maintain similar kcal)
  const newPortionGrams =
    recipe.kcalPer100g > 0
      ? Math.round((meal.portionKcal / recipe.kcalPer100g) * 100)
      : (recipe.servingWeightG ?? 150);
  const newKcal = Math.round((newPortionGrams / 100) * recipe.kcalPer100g);

  // Update the meal
  await db
    .update(plannedMeals)
    .set({
      recipeId: input.newRecipeId,
      portionGrams: newPortionGrams,
      portionKcal: newKcal,
    })
    .where(eq(plannedMeals.id, input.plannedMealId));

  // Update the meal plan's actual kcal
  const planId = meal.mealPlanId;
  const allMeals = await db
    .select()
    .from(plannedMeals)
    .where(eq(plannedMeals.mealPlanId, planId));

  const totalKcal = allMeals.reduce((sum, m) => {
    if (m.id === input.plannedMealId) {
      return sum + newKcal;
    }
    return sum + m.portionKcal;
  }, 0);

  await db
    .update(mealPlans)
    .set({ actualKcalWeekly: totalKcal, updatedAt: new Date() })
    .where(eq(mealPlans.id, planId));
}

/**
 * Mark a meal as completed.
 */
export async function completeMeal(plannedMealId: string): Promise<void> {
  await db
    .update(plannedMeals)
    .set({ isCompleted: true })
    .where(eq(plannedMeals.id, plannedMealId));
}

/**
 * Regenerate meals for a specific day.
 */
export async function regenerateDay(
  mealPlanId: string,
  day: number,
): Promise<void> {
  // Delete existing meals for this day
  await db
    .delete(plannedMeals)
    .where(
      and(eq(plannedMeals.mealPlanId, mealPlanId), eq(plannedMeals.day, day)),
    );

  // Get the plan details
  const plan = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.id, mealPlanId));

  if (!plan[0]) return;

  // Regenerate by calling generateMealPlan logic (simplified version)
  // In a full implementation, you'd extract the day generation logic
  // For now, we just mark the plan as needing regeneration
  await db
    .update(mealPlans)
    .set({ updatedAt: new Date() })
    .where(eq(mealPlans.id, mealPlanId));
}

/**
 * Delete a meal plan.
 */
export async function deleteMealPlan(mealPlanId: string): Promise<void> {
  await db.delete(mealPlans).where(eq(mealPlans.id, mealPlanId));
}

// ============================================================================
// MEAL PLAN ENHANCEMENTS (Jan 2026)
// ============================================================================

/**
 * Check if a meal plan exists for given member/week and return info about completed meals.
 * Used to confirm before regenerating.
 */
export async function getMealPlanStatus(
  familyMemberId: string,
  weekStart: Date,
): Promise<{
  exists: boolean;
  planId: string | null;
  completedMealsCount: number;
  totalMealsCount: number;
}> {
  const plan = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.familyMemberId, familyMemberId),
        eq(mealPlans.weekStart, weekStart),
      ),
    );

  if (!plan[0]) {
    return { exists: false, planId: null, completedMealsCount: 0, totalMealsCount: 0 };
  }

  const meals = await db
    .select()
    .from(plannedMeals)
    .where(eq(plannedMeals.mealPlanId, plan[0].id));

  return {
    exists: true,
    planId: plan[0].id,
    completedMealsCount: meals.filter((m) => m.isCompleted).length,
    totalMealsCount: meals.length,
  };
}

/**
 * Delete existing meal plan for a member/week combination.
 * Called before regenerating to replace the plan.
 */
export async function deleteMealPlanForWeek(
  familyMemberId: string,
  weekStart: Date,
): Promise<void> {
  const plan = await db
    .select()
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.familyMemberId, familyMemberId),
        eq(mealPlans.weekStart, weekStart),
      ),
    );

  if (plan[0]) {
    // Cascade delete will remove all planned_meals
    await db.delete(mealPlans).where(eq(mealPlans.id, plan[0].id));
  }
}

/**
 * Get alternative recipes for swapping a meal.
 * Returns recipes from the same category, excluding current recipe.
 */
export async function getSwapAlternatives(
  plannedMealId: string,
  options?: { limit?: number; similarKcal?: boolean },
): Promise<
  {
    id: string;
    nameIt: string;
    nameEn: string;
    imageUrl: string | null;
    kcalPer100g: number;
    totalTimeMin: number | null;
  }[]
> {
  // Get the current planned meal
  const currentMeal = await db
    .select({
      recipeId: plannedMeals.recipeId,
      mealType: plannedMeals.mealType,
      portionKcal: plannedMeals.portionKcal,
    })
    .from(plannedMeals)
    .where(eq(plannedMeals.id, plannedMealId));

  if (!currentMeal[0]) {
    throw new Error("Planned meal not found");
  }

  const { recipeId, mealType, portionKcal } = currentMeal[0];

  // Map meal type to recipe category
  const category = MEAL_TYPE_TO_CATEGORY[mealType as keyof typeof MEAL_TYPE_TO_CATEGORY];

  // Get all published recipes in the same category, excluding current
  const allRecipes = await db
    .select({
      id: recipes.id,
      nameIt: recipes.nameIt,
      nameEn: recipes.nameEn,
      imageUrl: recipes.imageUrl,
      kcalPer100g: recipes.kcalPer100g,
      totalTimeMin: recipes.totalTimeMin,
    })
    .from(recipes)
    .where(
      and(
        eq(recipes.category, category),
        eq(recipes.isPublished, true),
      ),
    );

  // Filter out current recipe
  let alternatives = allRecipes.filter((r) => r.id !== recipeId);

  // If similarKcal option, sort by kcal similarity
  if (options?.similarKcal && portionKcal > 0) {
    alternatives = alternatives.sort((a, b) => {
      const diffA = Math.abs(a.kcalPer100g - (portionKcal / 100) * 100);
      const diffB = Math.abs(b.kcalPer100g - (portionKcal / 100) * 100);
      return diffA - diffB;
    });
  }

  // Apply limit
  if (options?.limit) {
    alternatives = alternatives.slice(0, options.limit);
  }

  return alternatives;
}

/**
 * Swap a meal with a random alternative from the same category.
 */
export async function swapMealRandom(plannedMealId: string): Promise<void> {
  // Get alternatives
  const alternatives = await getSwapAlternatives(plannedMealId);

  if (alternatives.length === 0) {
    throw new Error("No alternative recipes available");
  }

  // Pick a random one
  const randomRecipe = alternatives[Math.floor(Math.random() * alternatives.length)];

  // Use existing swapMeal logic
  await swapMeal({
    plannedMealId,
    newRecipeId: randomRecipe.id,
  });
}

/**
 * Proportion weights for meal types (used for recalculation).
 */
const MEAL_PROPORTIONS: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.35,
  dinner: 0.40,
  snack_am: 0.075,
  snack_pm: 0.075,
};

/**
 * Recalculate portion sizes for a day when snacks are toggled.
 * Only updates meals that are not completed and not skipped.
 */
export async function recalculateDayPortions(
  mealPlanId: string,
  day: number,
): Promise<void> {
  // Get the meal plan for daily target
  const plan = await db
    .select()
    .from(mealPlans)
    .where(eq(mealPlans.id, mealPlanId));

  if (!plan[0]) return;

  const dailyTarget = Math.round(plan[0].targetKcalWeekly / 7);

  // Get all meals for this day
  const mealsToday = await db
    .select({
      id: plannedMeals.id,
      recipeId: plannedMeals.recipeId,
      mealType: plannedMeals.mealType,
      isCompleted: plannedMeals.isCompleted,
      isSkipped: plannedMeals.isSkipped,
    })
    .from(plannedMeals)
    .where(
      and(eq(plannedMeals.mealPlanId, mealPlanId), eq(plannedMeals.day, day)),
    );

  // Filter to active meals (not completed, not skipped)
  const activeMeals = mealsToday.filter((m) => !m.isCompleted && !m.isSkipped);

  if (activeMeals.length === 0) return;

  // Calculate total proportion for active meals
  const totalProportion = activeMeals.reduce(
    (sum, m) => sum + (MEAL_PROPORTIONS[m.mealType] || 0),
    0,
  );

  if (totalProportion === 0) return;

  // Update each active meal
  for (const meal of activeMeals) {
    // Get recipe kcal
    const recipe = await db
      .select({ kcalPer100g: recipes.kcalPer100g, servingWeightG: recipes.servingWeightG })
      .from(recipes)
      .where(eq(recipes.id, meal.recipeId));

    if (!recipe[0]) continue;

    // Calculate new target kcal for this meal
    const normalizedProportion = (MEAL_PROPORTIONS[meal.mealType] || 0) / totalProportion;
    const newTargetKcal = Math.round(dailyTarget * normalizedProportion);

    // Calculate new portion
    const newPortionGrams =
      recipe[0].kcalPer100g > 0
        ? Math.round((newTargetKcal / recipe[0].kcalPer100g) * 100)
        : (recipe[0].servingWeightG ?? 150);
    const newPortionKcal = Math.round((newPortionGrams / 100) * recipe[0].kcalPer100g);

    await db
      .update(plannedMeals)
      .set({ portionGrams: newPortionGrams, portionKcal: newPortionKcal })
      .where(eq(plannedMeals.id, meal.id));
  }

  // Update meal plan actual kcal
  await updateMealPlanActualKcal(mealPlanId);
}

/**
 * Helper to update meal plan's actual weekly kcal.
 */
async function updateMealPlanActualKcal(mealPlanId: string): Promise<void> {
  const meals = await db
    .select({ portionKcal: plannedMeals.portionKcal, isSkipped: plannedMeals.isSkipped })
    .from(plannedMeals)
    .where(eq(plannedMeals.mealPlanId, mealPlanId));

  const totalKcal = meals
    .filter((m) => !m.isSkipped)
    .reduce((sum, m) => sum + m.portionKcal, 0);

  await db
    .update(mealPlans)
    .set({ actualKcalWeekly: totalKcal, updatedAt: new Date() })
    .where(eq(mealPlans.id, mealPlanId));
}

/**
 * Toggle snacks for a specific day.
 * - If disabling: marks snacks as skipped and recalculates other meals
 * - If enabling: un-skips snacks and recalculates
 */
export async function toggleSnackForDay(
  mealPlanId: string,
  day: number,
  enabled: boolean,
): Promise<void> {
  // Get snacks for this day
  const snacks = await db
    .select()
    .from(plannedMeals)
    .where(
      and(
        eq(plannedMeals.mealPlanId, mealPlanId),
        eq(plannedMeals.day, day),
      ),
    );

  const snackMeals = snacks.filter(
    (m) => m.mealType === "snack_am" || m.mealType === "snack_pm",
  );

  if (snackMeals.length === 0) return;

  // Update isSkipped for snacks
  for (const snack of snackMeals) {
    await db
      .update(plannedMeals)
      .set({ isSkipped: !enabled })
      .where(eq(plannedMeals.id, snack.id));
  }

  // Recalculate portions for the day
  await recalculateDayPortions(mealPlanId, day);
}
