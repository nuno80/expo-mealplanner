import { type Goal } from "@/lib/tdee";
import type { MealType } from "@/schemas/mealPlan";
import type { Recipe } from "@/schemas/recipe";

// ===================================
// TYPES
// ===================================

export interface MealPlanConfig {
  familyMemberId: string;
  weightKg: number;
  goal: Goal;
  weekStart: Date;
  dailyTargetKcal: number;
  snackPreference: "none" | "one" | "two";
}

export interface PlannedMealResult {
  day: number;
  mealType: MealType;
  recipeId: string;
  portionGrams: number;
  portionKcal: number;
  sideRecipeId?: string | null;
  sidePortionGrams?: number | null;
  sidePortionKcal?: number | null;
}

export interface LogicRecipe extends Pick<Recipe, "id" | "category" | "kcalPer100g" | "proteinPer100g" | "carbsPer100g" | "fatPer100g"> { }

// ===================================
// LOGIC
// ===================================

const MEAL_DISTRIBUTION = {
  none: [
    { type: "breakfast", ratio: 0.20 },
    { type: "lunch", ratio: 0.40 },
    { type: "dinner", ratio: 0.40 },
  ],
  one: [
    { type: "breakfast", ratio: 0.20 },
    { type: "lunch", ratio: 0.35 },
    { type: "snack_pm", ratio: 0.10 },
    { type: "dinner", ratio: 0.35 },
  ],
  two: [
    { type: "breakfast", ratio: 0.20 },
    { type: "snack_am", ratio: 0.10 },
    { type: "lunch", ratio: 0.30 },
    { type: "snack_pm", ratio: 0.10 },
    { type: "dinner", ratio: 0.30 },
  ]
} as const;

/**
 * Calculates a single meal's composition (Main + potential Side).
 * Pure function: takes inputs, returns result.
 */
export function calculateMealComposition(
  targetKcal: number,
  mainRecipe: LogicRecipe,
  sideRecipes: LogicRecipe[],
  isMainMeal: boolean // lunch or dinner
): {
  mainGrams: number;
  mainKcal: number;
  sideRecipeId: string | null;
  sideGrams: number | null;
  sideKcal: number | null;
} {
  let mainKcal = targetKcal;
  let mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);

  let sideRecipeId: string | null = null;
  let sideGrams: number | null = null;
  let sideKcal: number | null = null;

  // Gap Analysis: Only for Main Courses
  if (isMainMeal && sideRecipes.length > 0) {
    const isHighProtein = mainRecipe.proteinPer100g > 15;
    const isLowCarb = mainRecipe.carbsPer100g < 10;
    const isLowDensity = mainRecipe.kcalPer100g < 120; // NEW: Trigger for light dishes

    // Trigger reasons
    const triggerHighProteinLowCarb = isHighProtein && isLowCarb;
    const triggerLowDensity = isLowDensity;
    const shouldTrigger = triggerHighProteinLowCarb || triggerLowDensity;

    // Debug: Log Gap Fill evaluation
    console.log(`[GapFill] Recipe ${mainRecipe.id.slice(0, 8)}... → Kcal:${mainRecipe.kcalPer100g} P:${mainRecipe.proteinPer100g}g C:${mainRecipe.carbsPer100g}g → LowDensity:${isLowDensity} HighP+LowC:${triggerHighProteinLowCarb} → Trigger:${shouldTrigger}`);

    // Trigger Side Dish logic if:
    // 1. Main is High Protein + Low Carb (protein-focused dish like chicken/fish)
    // 2. OR Main is Low Density (<120 kcal/100g, like salads/tofu that would need huge portions)
    if (shouldTrigger) {
      // Step 1: Cap Main at 70% kcal (or 60% for very low density)
      const capRatio = isLowDensity ? 0.60 : 0.70;
      mainKcal = Math.round(targetKcal * capRatio);
      mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);

      // Step 2: Apply 300g MAX PORTION CAP (Option A)
      const MAX_MAIN_GRAMS = 300;
      if (mainGrams > MAX_MAIN_GRAMS) {
        console.log(`[GapFill] ⚠️ Portion ${mainGrams}g exceeds ${MAX_MAIN_GRAMS}g cap, applying limit`);
        mainGrams = MAX_MAIN_GRAMS;
        mainKcal = Math.round((mainGrams / 100) * mainRecipe.kcalPer100g);
      }

      const gapKcal = targetKcal - mainKcal;

      if (gapKcal > 50) { // Threshold for adding a side
        // Filter to HIGH-DENSITY sides only (>150 kcal/100g) to avoid absurd portions
        // Examples: Pane (250), Riso (350), Patate (90 - excluded)
        // Excluded: Insalata (20), Verdure (40)
        const highDensitySides = sideRecipes.filter(s => s.kcalPer100g >= 150);

        if (highDensitySides.length > 0) {
          const sideIndex = Math.floor(Math.random() * highDensitySides.length);
          const selectedSide = highDensitySides[sideIndex];

          sideRecipeId = selectedSide.id;
          sideKcal = gapKcal;
          sideGrams = Math.round((sideKcal / selectedSide.kcalPer100g) * 100);

          console.log(`[GapFill] ✅ Added side: ${selectedSide.id.slice(0, 8)}... (${sideGrams}g = ${sideKcal} kcal, ${selectedSide.kcalPer100g} kcal/100g) [reason: ${isLowDensity ? 'low-density' : 'high-protein'}]`);
        } else {
          // No high-density sides available, revert main to full target
          console.log(`[GapFill] ⚠️ No high-density sides available, using full main portion`);
          mainKcal = targetKcal;
          mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);
        }
      } else {
        // Revert if gap is too small
        mainKcal = targetKcal;
        mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);
      }
    }
  }

  return {
    mainGrams,
    mainKcal,
    sideRecipeId,
    sideGrams,
    sideKcal
  };
}

/**
 * Validates if the logic handles missing side dishes correctly.
 */
export function validateSideDishFallback(
  targetKcal: number,
  mainRecipe: LogicRecipe
): boolean {
  // If no sides provided, should just return Main = targetKcal
  const result = calculateMealComposition(targetKcal, mainRecipe, [], true);
  return result.sideRecipeId === null && result.mainKcal === targetKcal;
}
