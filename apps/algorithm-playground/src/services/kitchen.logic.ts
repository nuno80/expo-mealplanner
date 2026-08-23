// ============================================================================
// KITCHEN LOGIC - v1.0
// Calculates raw/cooked portions for family cooking scenarios.
// Port of /src/utils/portion-calculator.ts adapted for playground.
// ============================================================================

import type { FamilyMember, MealType, Recipe } from "@/types";
import { MEAL_DISTRIBUTION } from "./mealPlan.logic";

// ============================================================================
// TYPES
// ============================================================================

export interface Ingredient {
  id: string;
  nameIt: string;
  nameEn: string;
  quantity: number;
  unit: string;
  cookedWeightFactor: number; // e.g., 2.1 for pasta, 0.8 for meat
}

export interface MemberPortion {
  memberId: string;
  memberName: string;
  targetKcal: number;
  totalCookedG: number;
  ingredients: IngredientPortion[];
}

export interface IngredientPortion {
  name: string;
  rawG: number;
  cookedG: number;
  factor: number;
}

export interface KitchenMetrics {
  recipeName: string;
  mealType: MealType;
  day: number;
  // Total batch to cook
  totalBatch: {
    name: string;
    rawG: number;
    cookedG: number;
    factor: number;
  }[];
  // Individual portions (cooked) per member
  memberPortions: MemberPortion[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculates target calories for a meal based on the family member and meal type.
 * Uses the same distribution as the meal plan generator.
 */
export function getMealTargetKcal(
  member: FamilyMember,
  mealType: MealType
): number {
  // Get the right distribution based on snacks preference and target
  // Use explicit type to handle different distribution lengths
  type MealEntry = { readonly type: string; readonly ratio: number };
  let distribution: readonly MealEntry[] = MEAL_DISTRIBUTION.none;

  if (member.targetKcal > 2800) {
    distribution = MEAL_DISTRIBUTION.bulk_two;
  } else if (member.snacksEnabled) {
    distribution = MEAL_DISTRIBUTION.two;
  }

  const mealRatio = distribution.find((d) => d.type === mealType)?.ratio ?? 0.3;
  return Math.round(member.targetKcal * mealRatio);
}

/**
 * Calculates the cooked portion weight (in grams) for a specific kcal target.
 * Formula: (TargetKcal / RecipeKcalPer100g) * 100
 */
export function calculateCookedPortion(
  recipe: Recipe,
  targetKcal: number
): number {
  if (!recipe.kcalPer100g || recipe.kcalPer100g === 0) return 0;
  return Math.round((targetKcal / recipe.kcalPer100g) * 100);
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Calculates kitchen metrics for a meal shared by multiple family members.
 * Returns:
 * - Total batch to cook (raw + cooked)
 * - Individual portions per member
 */
export function calculateKitchenMetrics(
  recipe: Recipe,
  ingredients: Ingredient[],
  members: FamilyMember[],
  mealType: MealType,
  day: number
): KitchenMetrics {
  // Filter to main ingredients (> 20g, grams only)
  const MAIN_WEIGHT_THRESHOLD = 20;
  const mainIngredients = ingredients.filter(
    (ing) => ing.unit === "g" && ing.quantity >= MAIN_WEIGHT_THRESHOLD
  );

  // Calculate total raw weight for scaling
  const totalRecipeRawWeight = mainIngredients.reduce(
    (sum, ing) => sum + ing.quantity,
    0
  );

  // Calculate each member's target and cooked portion
  const memberTargets = members.map((m) => ({
    member: m,
    targetKcal: getMealTargetKcal(m, mealType),
    cookedG: calculateCookedPortion(recipe, getMealTargetKcal(m, mealType)),
  }));

  // Total cooked weight needed (sum of all members)
  const totalCookedNeeded = memberTargets.reduce(
    (sum, mt) => sum + mt.cookedG,
    0
  );

  // Calculate batch to cook (per ingredient)
  // We need to find the raw weight that produces totalCookedNeeded
  const totalBatch = mainIngredients.map((ing) => {
    // Proportion of this ingredient in the recipe
    const proportion = ing.quantity / totalRecipeRawWeight;
    // This ingredient's share of total cooked weight
    const cookedShare = totalCookedNeeded * proportion;
    // Raw weight = cooked / factor
    const rawWeight = cookedShare / ing.cookedWeightFactor;

    return {
      name: ing.nameIt || ing.nameEn,
      rawG: Math.round(rawWeight),
      cookedG: Math.round(cookedShare),
      factor: ing.cookedWeightFactor,
    };
  });

  // Calculate per-member portions
  const memberPortions: MemberPortion[] = memberTargets.map((mt) => {
    const memberRatio = mt.cookedG / totalCookedNeeded;

    const ingredients = totalBatch.map((batch) => ({
      name: batch.name,
      rawG: Math.round(batch.rawG * memberRatio),
      cookedG: Math.round(batch.cookedG * memberRatio),
      factor: batch.factor,
    }));

    return {
      memberId: mt.member.id,
      memberName: mt.member.name,
      targetKcal: mt.targetKcal,
      totalCookedG: mt.cookedG,
      ingredients,
    };
  });

  return {
    recipeName: recipe.nameIt,
    mealType,
    day,
    totalBatch,
    memberPortions,
  };
}

// ============================================================================
// FORMATTING HELPER
// ============================================================================

/**
 * Formats kitchen metrics as debug log lines.
 */
export function formatKitchenMetrics(metrics: KitchenMetrics): string[] {
  const lines: string[] = [];

  lines.push(`👨‍🍳 KITCHEN METRICS: "${metrics.recipeName}" (Day ${metrics.day}, ${metrics.mealType})`);
  lines.push(`📦 TOTALE DA CUCINARE:`);

  for (const batch of metrics.totalBatch) {
    if (batch.factor === 1) {
      lines.push(`   - ${batch.name}: ${batch.rawG}g (nessun cambio)`);
    } else {
      lines.push(
        `   - ${batch.name}: ${batch.rawG}g CRUDO ➔ ${batch.cookedG}g COTTO (x${batch.factor})`
      );
    }
  }

  lines.push(`📊 DIVISIONE PORZIONI (COTTO):`);

  for (const mp of metrics.memberPortions) {
    const ingredientList = mp.ingredients
      .map((ing) => `${ing.name} ${ing.cookedG}g`)
      .join(", ");
    lines.push(`   - ${mp.memberName} (${mp.targetKcal} kcal): ${ingredientList}`);
  }

  return lines;
}
