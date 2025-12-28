import { z } from "zod";
import {
	ActivityLevelSchema,
	AddFamilyMemberSchema,
	FamilyMemberSchema,
	GoalSchema,
	SexSchema,
} from "./auth";

// Re-export from auth for convenience
export type { AddFamilyMemberInput, FamilyMember } from "./auth";
export { AddFamilyMemberSchema, FamilyMemberSchema };

// Re-export TDEE utilities from lib (avoid duplication)
export { calculateBMR, calculateTargetKcal, calculateTDEE } from "@/lib/tdee";

// ============================================================================
// UPDATE SCHEMA
// All fields optional for partial updates
// ============================================================================

export const UpdateFamilyMemberSchema = z.object({
	name: z.string().min(1, "Nome richiesto").optional(),
	birthYear: z
		.number()
		.int()
		.min(1900)
		.max(new Date().getFullYear())
		.optional(),
	sex: SexSchema.optional(),
	heightCm: z.number().int().min(50).max(250).optional(),
	weightKg: z.number().min(10).max(300).optional(),
	activityLevel: ActivityLevelSchema.optional(),
	goal: GoalSchema.optional(),
	calorieAdjustment: z.number().int().optional(),
	macroProteinPct: z.number().int().min(10).max(60).optional(),
	macroCarbPct: z.number().int().min(10).max(70).optional(),
	macroFatPct: z.number().int().min(10).max(60).optional(),
	snacksEnabled: z.boolean().optional(),
});
export type UpdateFamilyMemberInput = z.infer<typeof UpdateFamilyMemberSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

export const ACTIVITY_MULTIPLIERS = {
	sedentary: 1.2,
	light: 1.375,
	moderate: 1.55,
	active: 1.725,
	very_active: 1.9,
} as const;

export const DEFAULT_CALORIE_ADJUSTMENTS = {
	cut: -400,
	maintain: 0,
	bulk: 300,
} as const;

/**
 * Get age from birth year
 */
export function getAgeFromBirthYear(birthYear: number): number {
	return new Date().getFullYear() - birthYear;
}
