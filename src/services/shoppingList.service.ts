import { db } from "@/db/client";
import {
  ingredients,
  mealPlans,
  plannedMeals,
  recipeIngredients,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export interface AggregatedShoppingItem {
  ingredientId: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

/**
 * Get aggregated shopping list from a meal plan for specific days.
 * @param mealPlanId - The meal plan ID
 * @param days - Array of day numbers (1-7) to include. Empty = all days.
 * @returns Aggregated list of ingredients with combined quantities
 */
export async function getShoppingListFromMealPlan(
  mealPlanId: string,
  days: number[] = [],
): Promise<AggregatedShoppingItem[]> {
  // 1. Get planned meals for the specified days
  const whereCondition = days.length > 0
    ? and(eq(plannedMeals.mealPlanId, mealPlanId), inArray(plannedMeals.day, days))
    : eq(plannedMeals.mealPlanId, mealPlanId);

  const meals = await db
    .select({
      recipeId: plannedMeals.recipeId,
      portionGrams: plannedMeals.portionGrams,
      sideRecipeId: plannedMeals.sideRecipeId,
    })
    .from(plannedMeals)
    .where(whereCondition);

  if (meals.length === 0) {
    return [];
  }

  // 2. Get recipe IDs (Main + Side)
  const recipeIds: string[] = [
    ...new Set([
      ...meals.map((m) => m.recipeId),
      ...meals.map((m) => m.sideRecipeId).filter((id): id is string => !!id),
    ]),
  ];

  // 3. Get ingredients for all recipes
  const recipeIngredientsData = await db
    .select({
      recipeId: recipeIngredients.recipeId,
      ingredientId: recipeIngredients.ingredientId,
      quantity: recipeIngredients.quantity,
      unit: recipeIngredients.unit,
    })
    .from(recipeIngredients)
    .where(inArray(recipeIngredients.recipeId, recipeIds));

  // 4. Get ingredient details
  const ingredientIds = [
    ...new Set(recipeIngredientsData.map((ri) => ri.ingredientId)),
  ];

  if (ingredientIds.length === 0) {
    return [];
  }

  const ingredientDetails = await db
    .select({
      id: ingredients.id,
      nameIt: ingredients.nameIt,
      category: ingredients.category,
    })
    .from(ingredients)
    .where(inArray(ingredients.id, ingredientIds));

  const ingredientMap = new Map(
    ingredientDetails.map((i) => [
      i.id,
      { name: i.nameIt, category: i.category ?? "Altro" },
    ]),
  );

  // 5. Aggregate quantities by normalized ingredient NAME (not ID)
  // This combines "aglio" from different recipes into one entry
  const aggregated: Record<string, AggregatedShoppingItem> = {};

  for (const ri of recipeIngredientsData) {
    const detail = ingredientMap.get(ri.ingredientId);
    if (!detail) continue;

    // Normalize name: lowercase, trim, remove extra spaces
    const normalizedName = detail.name.toLowerCase().trim().replace(/\s+/g, ' ');
    // Key by normalized name + unit (e.g., "aglio-g")
    const key = `${normalizedName}-${ri.unit}`;

    if (!aggregated[key]) {
      aggregated[key] = {
        ingredientId: ri.ingredientId, // Keep first ID for reference
        name: detail.name, // Use original name for display
        quantity: 0,
        unit: ri.unit,
        category: detail.category,
      };
    }

    // Count how many times this recipe appears in meals (Main or Side)
    const mainCount = meals.filter((m) => m.recipeId === ri.recipeId).length;
    const sideCount = meals.filter((m) => m.sideRecipeId === ri.recipeId).length;

    // Note: This logic assumes 1 serving of ingredient per occurrence.
    // Ideally we should scale by portionGrams/servingGrams, but this requires recipe serving metadata.
    // For now, this ensures simple aggregation.
    aggregated[key].quantity += ri.quantity * (mainCount + sideCount);
  }

  // 6. Sort by category and name
  return Object.values(aggregated).sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });
}

/**
 * Get shopping list for a family member's current week.
 */
export async function getShoppingListForWeek(
  familyMemberId: string,
  weekStart: Date,
  days: number[] = [],
): Promise<AggregatedShoppingItem[]> {
  // Find the meal plan
  const [mealPlan] = await db
    .select({ id: mealPlans.id })
    .from(mealPlans)
    .where(
      and(
        eq(mealPlans.familyMemberId, familyMemberId),
        eq(mealPlans.weekStart, weekStart),
      ),
    )
    .limit(1);

  if (!mealPlan) {
    return [];
  }

  return getShoppingListFromMealPlan(mealPlan.id, days);
}
