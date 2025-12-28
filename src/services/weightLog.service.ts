import { desc, eq } from "drizzle-orm";
import { randomUUID } from "expo-crypto";
import { db } from "@/db/client";
import { weightLogs } from "@/db/schema";
import type { AddWeightInput, WeightLog } from "@/schemas/weightLog";

// ============================================================================
// WEIGHT LOG OPERATIONS
// ============================================================================

/**
 * Add a new weight entry for a family member.
 * Also updates the family member's current weight and recalculates TDEE.
 */
export async function addWeight(
	userId: string,
	input: AddWeightInput,
): Promise<WeightLog> {
	const id = randomUUID();

	const [entry] = await db
		.insert(weightLogs)
		.values({
			id,
			userId,
			familyMemberId: input.familyMemberId,
			date: input.date,
			weightKg: input.weightKg,
			notes: input.notes ?? null,
		})
		.returning();

	// Also update the family member's weight if this is the latest entry
	const latestEntry = await getLatestWeight(input.familyMemberId);
	if (latestEntry && latestEntry.id === id) {
		// Import dynamically to avoid circular dependency
		const { updateMemberWeight } = await import("./user.service");
		await updateMemberWeight(input.familyMemberId, input.weightKg);
	}

	return entry as unknown as WeightLog;
}

/**
 * Get weight history for a family member, sorted by date descending.
 */
export async function getWeightHistory(
	familyMemberId: string,
	limit = 30,
): Promise<WeightLog[]> {
	const results = await db
		.select()
		.from(weightLogs)
		.where(eq(weightLogs.familyMemberId, familyMemberId))
		.orderBy(desc(weightLogs.date))
		.limit(limit);

	return results as unknown as WeightLog[];
}

/**
 * Get the latest (most recent) weight entry for a family member.
 */
export async function getLatestWeight(
	familyMemberId: string,
): Promise<WeightLog | null> {
	const results = await db
		.select()
		.from(weightLogs)
		.where(eq(weightLogs.familyMemberId, familyMemberId))
		.orderBy(desc(weightLogs.date))
		.limit(1);

	return (results[0] as unknown as WeightLog) ?? null;
}

/**
 * Delete a weight entry by ID.
 */
export async function deleteWeight(id: string): Promise<void> {
	await db.delete(weightLogs).where(eq(weightLogs.id, id));
}

/**
 * Get weight change over a period.
 * Returns the difference between the latest weight and the weight from X days ago.
 */
export async function getWeightChange(
	familyMemberId: string,
	days = 30,
): Promise<{ current: number; previous: number; change: number } | null> {
	const history = await getWeightHistory(familyMemberId, 100);

	if (history.length === 0) return null;

	const current = history[0].weightKg;
	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - days);

	// Find the earliest entry within the period or the first entry before it
	const previousEntry = history.find(
		(entry) => new Date(entry.date) <= cutoffDate,
	);

	const previous =
		previousEntry?.weightKg ?? history[history.length - 1].weightKg;

	return {
		current,
		previous,
		change: Number((current - previous).toFixed(1)),
	};
}
