// ============================================================================
// MEAL PLAN LOGIC (Pure Functions) - v2.6 (Harvard Plate + Quotas)
// Migrated from algorithm-playground - Mediterranean Diet compliant
// ============================================================================

import type { MealType, SnackPreference } from "@/schemas/mealPlan";
import type { Recipe } from "@/schemas/recipe";

// ============================================================================
// TYPES
// ============================================================================

export interface MealPlanConfig {
  familyMemberId: string;
  weightKg: number;
  goal: "cut" | "maintain" | "bulk";
  weekStart: Date;
  dailyTargetKcal: number;
  snackPreference: SnackPreference;
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

export interface LogicRecipe
  extends Pick<
    Recipe,
    | "id"
    | "category"
    | "kcalPer100g"
    | "proteinPer100g"
    | "carbsPer100g"
    | "fatPer100g"
    | "proteinSource" // Mod 16: For legume-grain complementation
    | "tags" // Mod 18: For Harvard Plate
  > { }

// ============================================================================
// CONSTANTS
// ============================================================================

/** Maximum portion for a "reasonable" meal without side (grams) */
const REASONABLE_MAX_PORTION = 350;

/** Maximum ratio of side dish kcal vs meal target (Mod 3) */
const MAX_SIDE_RATIO = 0.35;

/** Minimum side density to qualify (kcal/100g) - Set to 110 to avoid low-density options like potatoes */
const MIN_SIDE_DENSITY = 110;

/** Maximum side portion (grams) - Prevents unrealistic servings, 200g is a reasonable side portion */
const MAX_SIDE_GRAMS = 200;

/** Minimum remaining gap (kcal) to trigger a secondary side dish */
const MIN_GAP_FOR_SIDE2 = 80;

// ============================================================================
// MEAL DISTRIBUTION
// ============================================================================

export const MEAL_DISTRIBUTION = {
  none: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "lunch" as const, ratio: 0.4 },
    { type: "dinner" as const, ratio: 0.4 },
  ],
  one: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "lunch" as const, ratio: 0.35 },
    { type: "snack_pm" as const, ratio: 0.1 },
    { type: "dinner" as const, ratio: 0.35 },
  ],
  two: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "snack_am" as const, ratio: 0.1 },
    { type: "lunch" as const, ratio: 0.3 },
    { type: "snack_pm" as const, ratio: 0.1 },
    { type: "dinner" as const, ratio: 0.3 },
  ],
  // Mod 7: Bulk Distribution (Smoother curve for high calories)
  bulk_two: [
    { type: "breakfast" as const, ratio: 0.2 },
    { type: "snack_am" as const, ratio: 0.15 },
    { type: "lunch" as const, ratio: 0.25 },
    { type: "snack_pm" as const, ratio: 0.15 },
    { type: "dinner" as const, ratio: 0.25 },
  ],
} as const;

// ============================================================================
// GAP FILL LOGIC (v2.6)
// ============================================================================

export interface MealCompositionResult {
  mainGrams: number;
  mainKcal: number;
  sideRecipeId: string | null;
  sideGrams: number | null;
  sideKcal: number | null;
  side2RecipeId: string | null;
  side2Grams: number | null;
  side2Kcal: number | null;
  debugLog: string[];
}

export interface MealCompositionOptions {
  /** Last side dish ID used, to avoid repetition (Mod 2) */
  lastSideId?: string | null;
}

/**
 * Calculates adaptive MAX threshold based on daily target.
 */
function getMaxDynamicThreshold(dailyTargetKcal: number): number {
  if (dailyTargetKcal > 3000) return 220;
  if (dailyTargetKcal > 2000) return 180;
  return 150;
}

/**
 * Calculates adaptive MAX MAIN portion cap based on daily target and recipe density.
 */
function getMaxMainGrams(dailyTargetKcal: number, kcalPer100g: number): number {
  // Density-aware cap (Mod 11): Allow higher volume for light meals to avoid redundant sides
  let baseCap = 300;
  if (kcalPer100g < 140) {
    baseCap = 450;
  }

  // Daily target scaling
  if (dailyTargetKcal > 3000) return Math.max(500, baseCap);
  if (dailyTargetKcal > 2500) return Math.max(375, baseCap);

  return baseCap;
}

/**
 * Calculates the dynamic density threshold based on meal target.
 * (Mod 5) If recipe density is below this, GapFill triggers.
 */
function calculateDynamicThreshold(
  mealTargetKcal: number,
  maxThreshold: number,
): number {
  // Formula: what density would require exactly REASONABLE_MAX_PORTION grams?
  const dynamicThreshold = (mealTargetKcal / REASONABLE_MAX_PORTION) * 100;
  // Cap to avoid over-triggering
  return Math.min(dynamicThreshold, maxThreshold);
}

/**
 * Calculates a single meal's composition (Main + potential Side).
 * Pure function: takes inputs, returns result.
 *
 * Changes v2.6:
 * - Added dailyTargetKcal as argument
 * - Adaptive MAX_DYNAMIC_THRESHOLD (scaling with daily target)
 * - Adaptive MAX_MAIN_GRAMS (scaling with daily target)
 * - Legume-Grain complementation (Mod 16)
 * - Bread-only side2 logic (Mod 17)
 */
export function calculateMealComposition(
  targetKcal: number,
  dailyTargetKcal: number,
  mainRecipe: LogicRecipe,
  sideRecipes: LogicRecipe[],
  isMainMeal: boolean, // lunch or dinner
  options: MealCompositionOptions = {},
): MealCompositionResult {
  const debugLog: string[] = [];

  let mainKcal = targetKcal;
  let mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);

  let sideRecipeId: string | null = null;
  let sideGrams: number | null = null;
  let sideKcal: number | null = null;

  let side2RecipeId: string | null = null;
  let side2Grams: number | null = null;
  let side2Kcal: number | null = null;

  // Determine adaptive constraints
  const maxDynamicThreshold = getMaxDynamicThreshold(dailyTargetKcal);
  const maxMainGrams = getMaxMainGrams(dailyTargetKcal, mainRecipe.kcalPer100g);

  // Gap Analysis: Only for Main Courses
  if (isMainMeal && sideRecipes.length > 0) {
    const isHighProtein = mainRecipe.proteinPer100g > 15;
    const isLowCarb = mainRecipe.carbsPer100g < 10;

    // Mod 5: Dynamic threshold with adaptive max
    const dynamicThreshold = calculateDynamicThreshold(
      targetKcal,
      maxDynamicThreshold,
    );
    const isLowDensity = mainRecipe.kcalPer100g < dynamicThreshold;

    const triggerHighProteinLowCarb = isHighProtein && isLowCarb;
    const triggerLowDensity = isLowDensity;
    const shouldTrigger = triggerHighProteinLowCarb || triggerLowDensity;

    debugLog.push(
      `[GapFill] Recipe ${mainRecipe.id.slice(
        0,
        8,
      )}... → Kcal:${mainRecipe.kcalPer100g} P:${mainRecipe.proteinPer100g}g C:${mainRecipe.carbsPer100g}g → Threshold:${dynamicThreshold.toFixed(
        0,
      )} (Max:${maxDynamicThreshold}) LowDensity:${isLowDensity} HighP+LowC:${triggerHighProteinLowCarb} → Trigger:${shouldTrigger}`,
    );

    if (shouldTrigger) {
      // Step 1: Cap Main at 70% kcal (or 60% for very low density)
      const capRatio = isLowDensity ? 0.6 : 0.7;
      mainKcal = Math.round(targetKcal * capRatio);
      mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);

      // Step 2: Apply ADAPTIVE MAX PORTION CAP
      if (mainGrams > maxMainGrams) {
        debugLog.push(
          `[GapFill] ⚠️ Portion ${mainGrams}g exceeds ${maxMainGrams}g cap, applying limit`,
        );
        mainGrams = maxMainGrams;
        mainKcal = Math.round((mainGrams / 100) * mainRecipe.kcalPer100g);
      }

      // Mod 3: Calculate gap but cap side at MAX_SIDE_RATIO
      let gapKcal = targetKcal - mainKcal;
      const maxSideKcal = Math.round(targetKcal * MAX_SIDE_RATIO);

      if (gapKcal > maxSideKcal) {
        debugLog.push(
          `[GapFill] ⚠️ Gap ${gapKcal} kcal exceeds ${MAX_SIDE_RATIO * 100
          }% cap (${maxSideKcal} kcal), limiting side`,
        );
        // Adjust main to take more, side takes max allowed
        gapKcal = maxSideKcal;
        mainKcal = targetKcal - gapKcal;
        mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);

        // Re-check main cap (strict cap)
        if (mainGrams > maxMainGrams) {
          mainGrams = maxMainGrams;
          mainKcal = Math.round((mainGrams / 100) * mainRecipe.kcalPer100g);
          gapKcal = targetKcal - mainKcal;
          // Note: If we are here, we might exceed the max side ratio again,
          // but avoiding an enormous main portion is prioritized.
          if (gapKcal > maxSideKcal) {
            debugLog.push(
              `[GapFill] ⚠️ Side still exceeds cap after main limit, but prioritizing main cap`,
            );
          }
        }
      }

      if (gapKcal > 50) {
        // Filter to HIGH-DENSITY sides only (≥110 kcal/100g)
        let highDensitySides = sideRecipes.filter(
          (s) => s.kcalPer100g >= MIN_SIDE_DENSITY,
        );

        // Mod 16 (Legume-Grain Complementation): If main is legumes, FORCE grain-based sides
        // Legumes lack methionine → grains provide it for complete protein profile
        // This takes priority over Mod 12 (Carb Safeguard) for legume dishes
        const isLegumeDish = mainRecipe.proteinSource === "legumes";

        if (isLegumeDish) {
          debugLog.push(
            `[GapFill] 🫘 Legume Main detected (${mainRecipe.proteinSource}), forcing GRAIN sides for protein complementation`,
          );

          // Grains have high carbs (>25g/100g) - bread, rice, pasta, farro, etc.
          // Higher threshold than generic starchy (25 vs 20) to ensure actual grains
          const grainSides = sideRecipes.filter((s) => s.carbsPer100g > 25);

          if (grainSides.length > 0) {
            // Prefer dense grains (bread ~250kcal/100g) over light ones
            const denseGrains = grainSides.filter(
              (s) => s.kcalPer100g >= MIN_SIDE_DENSITY,
            );
            if (denseGrains.length > 0) {
              highDensitySides = denseGrains;
              debugLog.push(
                `[GapFill] ✅ Found ${denseGrains.length} grain+dense sides (CHO >25g AND ≥${MIN_SIDE_DENSITY} kcal/100g) for legume complementation`,
              );
            } else {
              highDensitySides = grainSides;
              debugLog.push(
                `[GapFill] ⚠️ Using ${grainSides.length} grain sides (CHO >25g/100g) - lower density but necessary for complementation`,
              );
            }
          } else {
            debugLog.push(
              `[GapFill] ⚠️ No grain sides found for legume complementation, falling back to starchy`,
            );
            // Fallback to any starchy side
            const starchySides = sideRecipes.filter((s) => s.carbsPer100g > 20);
            if (starchySides.length > 0) {
              highDensitySides = starchySides;
            }
          }
        }
        // Mod 12 (Carb Safeguard): If main is low-carb (<12g/100g) and NOT legumes, prefer starchy sides
        else if (mainRecipe.carbsPer100g < 12) {
          debugLog.push(
            `[GapFill] 🍞 Low Carb Main detected (<12g/100g), forcing starchy sides`,
          );

          // First try: Starchy AND dense (ideal - e.g., Bread 250kcal/100g, Rice 130kcal/100g)
          const starchyAndDense = sideRecipes.filter(
            (s) => s.carbsPer100g > 20 && s.kcalPer100g >= MIN_SIDE_DENSITY,
          );

          if (starchyAndDense.length > 0) {
            highDensitySides = starchyAndDense;
            debugLog.push(
              `[GapFill] ✅ Found ${starchyAndDense.length} starchy+dense sides (CHO >20 AND ≥${MIN_SIDE_DENSITY} kcal/100g)`,
            );
          } else {
            // Fallback: Just starchy (including potatoes 90kcal/100g) - but warn
            const starchySides = sideRecipes.filter((s) => s.carbsPer100g > 20);
            if (starchySides.length > 0) {
              highDensitySides = starchySides;
              debugLog.push(
                `[GapFill] ⚠️ No starchy+dense sides, falling back to ${starchySides.length} starchy sides (CHO >20g/100g)`,
              );
            } else {
              debugLog.push(
                `[GapFill] ⚠️ No starchy sides found, keeping density-only filter`,
              );
            }
          }
        }

        // Mod 2: Exclude last used side dish
        if (options.lastSideId && highDensitySides.length > 1) {
          const filteredSides = highDensitySides.filter(
            (s) => s.id !== options.lastSideId,
          );
          if (filteredSides.length > 0) {
            highDensitySides = filteredSides;
            debugLog.push(
              `[GapFill] Excluding last side ${options.lastSideId?.slice(
                0,
                8,
              )}... for rotation`,
            );
          }
        }

        if (highDensitySides.length > 0) {
          const sideIndex = Math.floor(Math.random() * highDensitySides.length);
          const selectedSide = highDensitySides[sideIndex];

          sideRecipeId = selectedSide.id;
          sideKcal = gapKcal;
          sideGrams = Math.round((sideKcal / selectedSide.kcalPer100g) * 100);

          // Apply MAX_SIDE_GRAMS cap to prevent unrealistic portions
          let remainingGap = 0;
          if (sideGrams > MAX_SIDE_GRAMS) {
            debugLog.push(
              `[GapFill] ⚠️ Side ${sideGrams}g exceeds ${MAX_SIDE_GRAMS}g cap, limiting`,
            );
            const originalSideKcal = sideKcal;
            sideGrams = MAX_SIDE_GRAMS;
            sideKcal = Math.round((sideGrams / 100) * selectedSide.kcalPer100g);
            remainingGap = originalSideKcal - sideKcal;
          }

          debugLog.push(
            `[GapFill] ✅ Added side: ${selectedSide.id.slice(
              0,
              8,
            )}... (${sideGrams}g = ${sideKcal} kcal, ${selectedSide.kcalPer100g
            } kcal/100g) [reason: ${isLowDensity ? "low-density" : "high-protein"}]`,
          );

          // DOUBLE SIDE (Mod 17): If there's remaining gap after cap, add BREAD only
          // Avoid redundant grains like rice + rice cakes
          if (remainingGap >= MIN_GAP_FOR_SIDE2) {
            // Filter for BREAD only: high carbs (>40g/100g) AND high density (>250 kcal/100g)
            // This excludes rice cakes (387 kcal but 81g CHO - too similar to rice side)
            // and includes: Pane tostato (~290), Crostini (~380), Fette biscottate, etc.
            const breadSides = sideRecipes
              .filter(
                (s) =>
                  s.kcalPer100g >= 250 &&
                  s.carbsPer100g >= 40 &&
                  s.carbsPer100g < 75 && // Exclude gallette (81g CHO)
                  s.id !== selectedSide.id,
              )
              .sort((a, b) => b.kcalPer100g - a.kcalPer100g);

            if (breadSides.length > 0) {
              const side2 = breadSides[0]; // Pick the densest bread
              side2RecipeId = side2.id;
              side2Grams = Math.round((remainingGap / side2.kcalPer100g) * 100);
              side2Kcal = Math.round((side2Grams / 100) * side2.kcalPer100g);

              debugLog.push(
                `[GapFill] 🍞 Added side2 (bread): ${side2.id.slice(
                  0,
                  8,
                )}... (${side2Grams}g = ${side2Kcal} kcal, ${side2.kcalPer100g
                } kcal/100g) [filling ${remainingGap} kcal gap]`,
              );
            } else {
              debugLog.push(
                `[GapFill] ⚠️ No bread available for side2, ${remainingGap} kcal gap remains`,
              );
            }
          }
        } else {
          debugLog.push(
            `[GapFill] ⚠️ No high-density sides available, using full main portion`,
          );
          mainKcal = targetKcal;
          mainGrams = Math.round((mainKcal / mainRecipe.kcalPer100g) * 100);
        }
      } else {
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
    sideKcal,
    side2RecipeId,
    side2Grams,
    side2Kcal,
    debugLog,
  };
}

/**
 * Validates if the logic handles missing side dishes correctly.
 */
export function validateSideDishFallback(
  targetKcal: number,
  mainRecipe: LogicRecipe,
): boolean {
  // Pass a dummy daily target (e.g. 2000) for validation
  const result = calculateMealComposition(
    targetKcal,
    2000,
    mainRecipe,
    [],
    true,
  );
  return result.sideRecipeId === null && result.mainKcal === targetKcal;
}
