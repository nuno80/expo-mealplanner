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
