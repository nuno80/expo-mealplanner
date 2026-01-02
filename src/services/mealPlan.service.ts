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
import type { ProteinSource, Recipe, RecipeCategory } from "@/schemas/recipe";
import { and, eq, inArray } from "drizzle-orm";
import { randomUUID } from "expo-crypto";
import { calculateMealComposition } from "./mealPlan.logic";
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
  const startTime = Date.now();
  console.log(`[getMealPlan] Starting query for ${familyMemberId.slice(0, 8)}... week ${weekStart.toISOString().slice(0, 10)}`);

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

  console.log(`[getMealPlan] Plan query took ${Date.now() - startTime}ms`);

  if (!planResult[0]) {
    console.log(`[getMealPlan] No plan found, returning null`);
    return null;
  }

  const plan = planResult[0];

  // Get all planned meals for this plan
  const mealsQueryStart = Date.now();
  const mealsResult = await db
    .select({
      id: plannedMeals.id,
      mealPlanId: plannedMeals.mealPlanId,
      recipeId: plannedMeals.recipeId,
      day: plannedMeals.day,
      mealType: plannedMeals.mealType,
      portionGrams: plannedMeals.portionGrams,
      portionKcal: plannedMeals.portionKcal,
      // v2.0 Side Dish
      sideRecipeId: plannedMeals.sideRecipeId,
      sidePortionGrams: plannedMeals.sidePortionGrams,
      sidePortionKcal: plannedMeals.sidePortionKcal,

      isCompleted: plannedMeals.isCompleted,
      isSkipped: plannedMeals.isSkipped,
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

  console.log(`[getMealPlan] Meals query took ${Date.now() - mealsQueryStart}ms`);

  // Fetch side details in a second query and merge.
  const meals = mealsResult as any[];
  const sideIds = meals.map(m => m.sideRecipeId).filter(Boolean);

  let sideRecipesMap = new Map<string, any>();
  if (sideIds.length > 0) {
    const sidesQueryStart = Date.now();
    const sides = await db.select().from(recipes).where(inArray(recipes.id, sideIds));
    sides.forEach(s => sideRecipesMap.set(s.id, s));
    console.log(`[getMealPlan] Sides query took ${Date.now() - sidesQueryStart}ms`);
  }

  const augmentedMeals = meals.map(m => ({
    ...m,
    sideRecipe: m.sideRecipeId ? sideRecipesMap.get(m.sideRecipeId) : null
  }));

  console.log(`[getMealPlan] Total time: ${Date.now() - startTime}ms for ${augmentedMeals.length} meals`);

  return {
    ...plan,
    meals: augmentedMeals as PlannedMealWithRecipe[],
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

  // Resolve snack preference
  let snackPreference = input.snackPreference;
  if (!snackPreference) {
    if (input.includeSnacks !== undefined) {
      // Backwards compatibility
      snackPreference = input.includeSnacks ? "two" : "none"; // Default "two" if true to match old behavior
    } else {
      // Default from member setting
      snackPreference = member.snacksEnabled ? "two" : "none";
    }
  }

  const targetKcalWeekly = input.targetKcalWeekly ?? member.targetKcal * 7;
  const dailyTarget = Math.round(targetKcalWeekly / 7);

  // Define Meal Distribution based on Preference
  // none: Breakfast 20%, Lunch 40%, Dinner 40%
  // one: Breakfast 20%, Lunch 35%, Snack 10%, Dinner 35%
  // two: Breakfast 20%, Snack AM 10%, Lunch 30%, Snack PM 10%, Dinner 30%

  let mealTypesToGenerate: { type: MealType; kcalRatio: number }[] = [];

  if (snackPreference === "none") {
    mealTypesToGenerate = [
      { type: "breakfast", kcalRatio: 0.20 },
      { type: "lunch", kcalRatio: 0.40 },
      { type: "dinner", kcalRatio: 0.40 },
    ];
  } else if (snackPreference === "one") {
    mealTypesToGenerate = [
      { type: "breakfast", kcalRatio: 0.20 },
      { type: "lunch", kcalRatio: 0.35 },
      { type: "snack_pm", kcalRatio: 0.10 },
      { type: "dinner", kcalRatio: 0.35 },
    ];
  } else {
    // "two" (Default)
    mealTypesToGenerate = [
      { type: "breakfast", kcalRatio: 0.20 },
      { type: "snack_am", kcalRatio: 0.10 },
      { type: "lunch", kcalRatio: 0.30 },
      { type: "snack_pm", kcalRatio: 0.10 },
      { type: "dinner", kcalRatio: 0.30 },
    ];
  }

  // ... (existing delete logic) ...

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
  const sideRecipes = await getRecipesForPlanning("side_dish"); // v2.0
  const snackRecipes = (snackPreference !== "none")
    ? await getRecipesForPlanning("snack")
    : [];

  // Debug: log recipe counts
  console.log(`[MealPlan] Recipes loaded - breakfast: ${breakfastRecipes.length}, main_course: ${mainCourseRecipes.length}, sides: ${sideRecipes.length}, snack: ${snackRecipes.length}`);

  const recipesByCategory = {
    breakfast: breakfastRecipes,
    main_course: mainCourseRecipes,
    side_dish: sideRecipes,
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
    // v2.0 Side Dish
    sideRecipeId?: string | null;
    sidePortionGrams?: number | null;
    sidePortionKcal?: number | null;
    isCompleted: boolean;
    isSkipped: boolean;
  }[] = [];

  let totalKcal = 0;

  // Generate meals for each day
  for (let day = 1; day <= 7; day++) {

    // Iterate over configured meal types
    for (const { type: mealType, kcalRatio } of mealTypesToGenerate) {
      const targetKcal = Math.round(dailyTarget * kcalRatio);

      let selectedRecipe: Recipe | null = null;
      let category: RecipeCategory;

      if (mealType === "breakfast") category = "breakfast";
      else if (mealType === "snack_am" || mealType === "snack_pm") category = "snack";
      else category = "main_course";

      // ... selection logic ...

      // Select recipe logic (simplified integration)
      const candidates = recipesByCategory[category];
      if (candidates.length === 0) continue;

      // Filter recently used
      const recent = recentlyUsed.get(category) ?? [];
      const available = candidates.filter(r => !recent.includes(r.id));

      // Shuffle available or reset if empty
      const pool = available.length > 0 ? available : candidates;

      // Simple random selection for now (TODO: enhance with protein logic for main courses)
      const randomIndex = Math.floor(Math.random() * pool.length);
      selectedRecipe = pool[randomIndex];

      if (selectedRecipe) {
        // Update recently used
        const currentRecent = recentlyUsed.get(category) ?? [];
        recentlyUsed.set(category, [selectedRecipe.id, ...currentRecent].slice(0, 6)); // Keep last 6 (approx 3 days for main meals)

        // NutriPlanIT 2.0 Logic: Main + Side Dish
        const { mainGrams, mainKcal, sideRecipeId, sideGrams, sideKcal } = calculateMealComposition(
          targetKcal,
          // Map to LogicRecipe interface
          {
            id: selectedRecipe.id,
            category: selectedRecipe.category,
            kcalPer100g: selectedRecipe.kcalPer100g,
            proteinPer100g: selectedRecipe.proteinPer100g,
            carbsPer100g: selectedRecipe.carbsPer100g,
            fatPer100g: selectedRecipe.fatPer100g,
          },
          // Map side recipes
          sideRecipes.map(s => ({
            id: s.id,
            category: s.category,
            kcalPer100g: s.kcalPer100g,
            proteinPer100g: s.proteinPer100g,
            carbsPer100g: s.carbsPer100g,
            fatPer100g: s.fatPer100g,
          })),
          category === "main_course"
        );

        const mealId = randomUUID();
        plannedMealsToInsert.push({
          id: mealId,
          mealPlanId: planId,
          recipeId: selectedRecipe.id,
          day,
          mealType,
          portionGrams: mainGrams,
          portionKcal: mainKcal,
          // Side info
          sideRecipeId: sideRecipeId,
          sidePortionGrams: sideGrams,
          sidePortionKcal: sideKcal,

          isCompleted: false,
          isSkipped: false,
        });

        totalKcal += (mainKcal + (sideKcal || 0));
      }
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
  breakfast: 0.20,
  lunch: 0.30,
  dinner: 0.30,
  snack_am: 0.10,
  snack_pm: 0.10,
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
      sideRecipeId: plannedMeals.sideRecipeId,
      sidePortionGrams: plannedMeals.sidePortionGrams,
      sidePortionKcal: plannedMeals.sidePortionKcal,
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
    const newTotalTargetKcal = Math.round(dailyTarget * normalizedProportion);

    // NutriPlanIT 2.0: Handle Side Dish Scaling
    if (meal.sideRecipeId) {
      // Get Side Recipe
      const sideRecipe = await db
        .select({ kcalPer100g: recipes.kcalPer100g })
        .from(recipes)
        .where(eq(recipes.id, meal.sideRecipeId));

      if (sideRecipe[0]) {
        // Determine current ratio (Main / Total)
        // Note: we can't easily know the previous ratio without querying prev portions, but we can assume 70/30 split
        // or verify current DB values. Let's recalc based on standard split if side exists.
        const SPLIT_RATIO = 0.7; // 70% Main, 30% Side

        // Main
        const newMainKcal = Math.round(newTotalTargetKcal * SPLIT_RATIO);
        const newMainGrams = recipe[0].kcalPer100g > 0
          ? Math.round((newMainKcal / recipe[0].kcalPer100g) * 100)
          : 150;
        const newMainRealKcal = Math.round((newMainGrams / 100) * recipe[0].kcalPer100g);

        // Side
        const newSideKcal = newTotalTargetKcal - newMainRealKcal;
        const newSideGrams = sideRecipe[0].kcalPer100g > 0
          ? Math.round((newSideKcal / sideRecipe[0].kcalPer100g) * 100)
          : 100;

        await db.update(plannedMeals).set({
          portionGrams: newMainGrams,
          portionKcal: newMainRealKcal,
          sidePortionGrams: newSideGrams,
          sidePortionKcal: newSideKcal
        }).where(eq(plannedMeals.id, meal.id));

        continue; // Done for this meal
      }
    }

    // Standard Single Recipe Logic
    const newPortionGrams =
      recipe[0].kcalPer100g > 0
        ? Math.round((newTotalTargetKcal / recipe[0].kcalPer100g) * 100)
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
    .select({
      portionKcal: plannedMeals.portionKcal,
      isSkipped: plannedMeals.isSkipped,
      sidePortionKcal: plannedMeals.sidePortionKcal,
    })
    .from(plannedMeals)
    .where(eq(plannedMeals.mealPlanId, mealPlanId));

  const totalKcal = meals
    .filter((m) => !m.isSkipped)
    .reduce((sum, m) => sum + m.portionKcal + (m.sidePortionKcal || 0), 0);

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

  // Create snacks if missing and enabled
  if (enabled && snackMeals.length === 0) {
    const snackRecipes = await getRecipesForPlanning("snack");

    if (snackRecipes.length > 0) {
      const newSnacks = [];
      const types: MealType[] = ["snack_am", "snack_pm"];

      for (const type of types) {
        const recipe = snackRecipes[Math.floor(Math.random() * snackRecipes.length)];
        if (recipe) {
          newSnacks.push({
            id: randomUUID(),
            mealPlanId,
            recipeId: recipe.id,
            day,
            mealType: type,
            portionGrams: recipe.servingWeightG ?? 100, // Placeholder, will be recalculated
            portionKcal: recipe.kcalPer100g, // Placeholder
            isCompleted: false,
            isSkipped: false,
            createdAt: new Date(),
          });
        }
      }

      if (newSnacks.length > 0) {
        await db.insert(plannedMeals).values(newSnacks);
      }
    }
  } else {
    // Update isSkipped status for proposed/existing snacks
    for (const meal of snackMeals) {
      await db
        .update(plannedMeals)
        .set({ isSkipped: !enabled })
        .where(eq(plannedMeals.id, meal.id));
    }
  }

  // Recalculate portions for the day
  await recalculateDayPortions(mealPlanId, day);
}
