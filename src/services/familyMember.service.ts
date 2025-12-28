import { and, eq } from "drizzle-orm";
import { randomUUID } from "expo-crypto";
import { db } from "@/db/client";
import {
	familyMembers,
	mealPlans,
	plannedMeals,
	weightLogs,
} from "@/db/schema";
import { calculateTargetKcal, calculateTDEE } from "@/lib/tdee";
import type { AddFamilyMemberInput, FamilyMember } from "@/schemas/auth";
import type { UpdateFamilyMemberInput } from "@/schemas/familyMember";

// ============================================================================
// FAMILY MEMBER CRUD OPERATIONS
// ============================================================================

/**
 * Add a new family member (non-primary).
 * Calculates TDEE automatically based on provided data.
 */
export async function addFamilyMember(
	userId: string,
	input: AddFamilyMemberInput,
): Promise<FamilyMember> {
	const id = randomUUID();

	const { tdee } = calculateTDEE({
		sex: input.sex,
		weightKg: input.weightKg,
		heightCm: input.heightCm,
		birthYear: input.birthYear,
		activityLevel: input.activityLevel,
	});

	const calorieAdjustment = input.calorieAdjustment ?? 0;
	const targetKcal = calculateTargetKcal(tdee, calorieAdjustment);

	const [member] = await db
		.insert(familyMembers)
		.values({
			id,
			userId,
			name: input.name,
			isPrimary: false,
			birthYear: input.birthYear,
			sex: input.sex,
			heightCm: input.heightCm,
			weightKg: input.weightKg,
			activityLevel: input.activityLevel,
			goal: input.goal,
			calorieAdjustment,
			tdee,
			targetKcal,
			macroProteinPct: 30,
			macroCarbPct: 40,
			macroFatPct: 30,
			snacksEnabled: input.snacksEnabled ?? false,
		})
		.returning();

	return member as unknown as FamilyMember;
}

/**
 * Update a family member's data.
 * Recalculates TDEE if physical stats or activity level changes.
 */
export async function updateFamilyMember(
	memberId: string,
	input: UpdateFamilyMemberInput,
): Promise<FamilyMember | null> {
	// Get current member data
	const [current] = await db
		.select()
		.from(familyMembers)
		.where(eq(familyMembers.id, memberId));

	if (!current) return null;

	// Merge updates with current data
	const updatedData = {
		...current,
		...input,
	};

	// Recalculate TDEE if relevant fields changed
	const needsTdeeRecalc =
		input.weightKg !== undefined ||
		input.heightCm !== undefined ||
		input.birthYear !== undefined ||
		input.sex !== undefined ||
		input.activityLevel !== undefined;

	let tdee = current.tdee;
	let targetKcal = current.targetKcal;

	if (needsTdeeRecalc) {
		const result = calculateTDEE({
			sex: updatedData.sex as "male" | "female",
			weightKg: updatedData.weightKg,
			heightCm: updatedData.heightCm,
			birthYear: updatedData.birthYear,
			activityLevel: updatedData.activityLevel as
				| "sedentary"
				| "light"
				| "moderate"
				| "active"
				| "very_active",
		});
		tdee = result.tdee;
		targetKcal = calculateTargetKcal(
			tdee,
			updatedData.calorieAdjustment ?? current.calorieAdjustment,
		);
	} else if (input.calorieAdjustment !== undefined) {
		// Only adjustment changed
		targetKcal = calculateTargetKcal(tdee, input.calorieAdjustment);
	}

	const [updated] = await db
		.update(familyMembers)
		.set({
			...input,
			tdee,
			targetKcal,
			updatedAt: new Date(),
		})
		.where(eq(familyMembers.id, memberId))
		.returning();

	return updated as unknown as FamilyMember;
}

/**
 * Delete a family member and all associated data.
 * Cannot delete the primary member.
 */
export async function deleteFamilyMember(memberId: string): Promise<boolean> {
	// Check if this is the primary member
	const [member] = await db
		.select()
		.from(familyMembers)
		.where(eq(familyMembers.id, memberId));

	if (!member) return false;

	if (member.isPrimary) {
		throw new Error("Cannot delete the primary family member");
	}

	// Delete weight logs for this member
	await db.delete(weightLogs).where(eq(weightLogs.familyMemberId, memberId));

	// Delete planned meals associated with this member's meal plans
	const memberMealPlans = await db
		.select({ id: mealPlans.id })
		.from(mealPlans)
		.where(eq(mealPlans.familyMemberId, memberId));

	for (const plan of memberMealPlans) {
		await db.delete(plannedMeals).where(eq(plannedMeals.mealPlanId, plan.id));
	}

	// Delete meal plans for this member
	await db.delete(mealPlans).where(eq(mealPlans.familyMemberId, memberId));

	// Finally delete the member
	await db.delete(familyMembers).where(eq(familyMembers.id, memberId));

	return true;
}

/**
 * Get all family members for a user.
 */
export async function getFamilyMembers(
	userId: string,
): Promise<FamilyMember[]> {
	const results = await db
		.select()
		.from(familyMembers)
		.where(eq(familyMembers.userId, userId));

	return results as unknown as FamilyMember[];
}

/**
 * Get a single family member by ID.
 */
export async function getFamilyMemberById(
	memberId: string,
): Promise<FamilyMember | null> {
	const [result] = await db
		.select()
		.from(familyMembers)
		.where(eq(familyMembers.id, memberId));

	return (result as unknown as FamilyMember) ?? null;
}

/**
 * Get the primary family member (the user themselves).
 */
export async function getPrimaryMember(
	userId: string,
): Promise<FamilyMember | null> {
	const [result] = await db
		.select()
		.from(familyMembers)
		.where(
			and(eq(familyMembers.userId, userId), eq(familyMembers.isPrimary, true)),
		);

	return (result as unknown as FamilyMember) ?? null;
}

/**
 * Get all non-primary family members.
 */
export async function getSecondaryMembers(
	userId: string,
): Promise<FamilyMember[]> {
	const results = await db
		.select()
		.from(familyMembers)
		.where(
			and(eq(familyMembers.userId, userId), eq(familyMembers.isPrimary, false)),
		);

	return results as unknown as FamilyMember[];
}
