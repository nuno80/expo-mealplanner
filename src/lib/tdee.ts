import type { ActivityLevel, Sex } from "@/schemas/auth";

/**
 * Activity multipliers for TDEE calculation (Mifflin-St Jeor).
 * Source: GEMINI.md domain rules.
 */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export interface TdeeCalculationInput {
  sex: Sex;
  weightKg: number;
  heightCm: number;
  birthYear: number;
  activityLevel: ActivityLevel;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation.
 * Male:   10×weight(kg) + 6.25×height(cm) - 5×age + 5
 * Female: 10×weight(kg) + 6.25×height(cm) - 5×age - 161
 */
export function calculateBMR(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/**
 * Calculate Total Daily Energy Expenditure (TDEE).
 * TDEE = BMR × Activity Multiplier
 */
export function calculateTDEE(input: TdeeCalculationInput): TdeeResult {
  const currentYear = new Date().getFullYear();
  const age = currentYear - input.birthYear;

  const bmr = calculateBMR(input.sex, input.weightKg, input.heightCm, age);
  const tdee = Math.round(bmr * ACTIVITY_MULTIPLIERS[input.activityLevel]);

  return { bmr: Math.round(bmr), tdee };
}

/**
 * Calculate target calories based on goal.
 * @param tdee - Total Daily Energy Expenditure
 * @param adjustment - Calorie adjustment (negative for cut, positive for bulk)
 */
export function calculateTargetKcal(tdee: number, adjustment: number): number {
  return tdee + adjustment;
}

/**
 * NutriPlanIT 2.0: Dynamic Macro Calculation (Command-by-Cut)
 * Calculates macronutrient grams based on goal and weight.
 *
 * Rules:
 * - Protein:
 *    - Cut: 2.1 g/kg (High density for muscle preservation)
 *    - Bulk/Maintain: 1.7 g/kg
 * - Fat: Fixed at 30% of total calories (0.8-1g/kg typically)
 * - Carbs: Fills the remaining calories
 */
export interface MacroTargets {
  proteinGrams: number;
  proteinPct: number;
  fatGrams: number;
  fatPct: number;
  carbGrams: number;
  carbPct: number;
}

export function calculateMacroTargets(
  weightKg: number,
  goal: "cut" | "maintain" | "bulk",
  targetKcal: number,
): MacroTargets {
  // 1. Calculate Protein (g/kg)
  const proteinFactor = goal === "cut" ? 2.1 : 1.7;
  const proteinGrams = Math.round(weightKg * proteinFactor);
  const proteinKcal = proteinGrams * 4;
  const proteinPct = Math.round((proteinKcal / targetKcal) * 100);

  // 2. Calculate Fats (Fixed 30% for hormonal health)
  const fatPct = 30;
  const fatKcal = targetKcal * 0.3;
  const fatGrams = Math.round(fatKcal / 9);

  // 3. Calculate Carbs (Remainder)
  const carbKcal = targetKcal - proteinKcal - fatKcal;
  const carbGrams = Math.max(0, Math.round(carbKcal / 4));
  const carbPct = Math.round((carbKcal / targetKcal) * 100);

  // Sanity Check: If Carbs < 0 (e.g. extremely low cal + high protein), cap fats/protein
  // For MVP we assume targets are reasonable.

  return {
    proteinGrams,
    proteinPct,
    fatGrams,
    fatPct, // Should be approx 30
    carbGrams,
    carbPct,
  };
}
