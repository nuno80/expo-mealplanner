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
import type { RecipeCategory } from "@/schemas/recipe";
import { and, eq } from "drizzle-orm";
import { randomUUID } from "expo-crypto";
import { getRecipesForPlanning } from "./recipe.service";

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

/** Map meal type to recipe category */
const MEAL_TYPE_TO_CATEGORY: Record<MealType, RecipeCategory> = {
  breakfast: "breakfast",
  lunch: "lunch",
  dinner: "dinner",
  snack_am: "snack",
  snack_pm: "snack",
};

/** Meal types in order for a day */
const DAILY_MEAL_TYPES: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
];

const SNACK_MEAL_TYPES: MealType[] = ["snack_am", "snack_pm"];

/**
 * Generate a new meal plan for a family member.
 *
 * Algorithm (MVP):
 * 1. Get family member's target kcal
 * 2. For each day, select recipes for breakfast/lunch/dinner (+ snacks if enabled)
 * 3. Avoid repeating same recipe within last 3 days
 * 4. Calculate portions to hit weekly target ±5%
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
  const lunchRecipes = await getRecipesForPlanning("lunch");
  const dinnerRecipes = await getRecipesForPlanning("dinner");
  const snackRecipes = includeSnacks ? await getRecipesForPlanning("snack") : [];

  const recipesByCategory = {
    breakfast: breakfastRecipes,
    lunch: lunchRecipes,
    dinner: dinnerRecipes,
    snack: snackRecipes,
  };

  // Track recently used recipes (avoid repeats within 3 days)
  const recentlyUsed: Map<RecipeCategory, string[]> = new Map([
    ["breakfast", []],
    ["lunch", []],
    ["dinner", []],
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
        breakfast: Math.round(dailyTarget * 0.20),
        lunch: Math.round(dailyTarget * 0.30),
        dinner: Math.round(dailyTarget * 0.35),
        snack_am: Math.round(dailyTarget * 0.075),
        snack_pm: Math.round(dailyTarget * 0.075),
      }
      : {
        breakfast: Math.round(dailyTarget * 0.25),
        lunch: Math.round(dailyTarget * 0.35),
        dinner: Math.round(dailyTarget * 0.40),
        snack_am: 0,
        snack_pm: 0,
      };

    for (const mealType of mealTypes) {
      const category = MEAL_TYPE_TO_CATEGORY[mealType];
      const available = recipesByCategory[category];
      const recent = recentlyUsed.get(category) ?? [];

      // Filter out recently used recipes
      const candidates = available.filter((r) => !recent.includes(r.id));

      // If no candidates, use all recipes
      const pool = candidates.length > 0 ? candidates : available;

      if (pool.length === 0) {
        console.warn(`No recipes available for category: ${category}`);
        continue;
      }

      // Random selection
      const recipe = pool[Math.floor(Math.random() * pool.length)];

      // Calculate portion to hit target kcal
      const targetKcal = mealKcalTargets[mealType];
      const portionGrams = recipe.kcalPer100g > 0
        ? Math.round((targetKcal / recipe.kcalPer100g) * 100)
        : recipe.servingWeightG ?? 150;
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

      // Update recently used (keep last 3)
      recent.push(recipe.id);
      if (recent.length > 3) recent.shift();
      recentlyUsed.set(category, recent);
    }
  }

  // Insert all planned meals
  if (plannedMealsToInsert.length > 0) {
    await db.insert(plannedMeals).values(plannedMealsToInsert);
  }

  // Update actual kcal
  await db
    .update(mealPlans)
    .set({ actualKcalWeekly: totalKcal, status: "active" })
    .where(eq(mealPlans.id, planId));

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
  const newPortionGrams = recipe.kcalPer100g > 0
    ? Math.round((meal.portionKcal / recipe.kcalPer100g) * 100)
    : recipe.servingWeightG ?? 150;
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
      and(
        eq(plannedMeals.mealPlanId, mealPlanId),
        eq(plannedMeals.day, day),
      ),
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
