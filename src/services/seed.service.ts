import { eq, sql } from "drizzle-orm";
import { randomUUID } from "expo-crypto";
import { allSeedRecipes } from "@/data/seedRecipes";
import { db } from "@/db/client";
import { familyMembers, recipes, weightLogs } from "@/db/schema";

/**
 * Seed the database with demo recipes.
 * Skips if recipes already exist.
 */
export async function seedRecipes(): Promise<{
	inserted: number;
	skipped: boolean;
}> {
	// Check if recipes already exist
	const existing = await db
		.select({ count: sql<number>`count(*)` })
		.from(recipes);
	const count = existing[0]?.count ?? 0;

	if (count > 0) {
		return { inserted: 0, skipped: true };
	}

	// Insert all seed recipes
	for (const recipe of allSeedRecipes) {
		await db.insert(recipes).values({
			id: recipe.id,
			nameIt: recipe.nameIt,
			nameEn: recipe.nameEn,
			slug: recipe.slug,
			descriptionIt: recipe.descriptionIt,
			descriptionEn: recipe.descriptionEn,
			category: recipe.category,
			prepTimeMin: recipe.prepTimeMin,
			cookTimeMin: recipe.cookTimeMin,
			totalTimeMin: recipe.totalTimeMin,
			servings: recipe.servings,
			difficulty: recipe.difficulty,
			kcalPer100g: recipe.kcalPer100g,
			proteinPer100g: recipe.proteinPer100g,
			carbsPer100g: recipe.carbsPer100g,
			fatPer100g: recipe.fatPer100g,
			fiberPer100g: recipe.fiberPer100g,
			kcalPerServing: recipe.kcalPerServing,
			servingWeightG: recipe.servingWeightG,
			isPublished: recipe.isPublished,
		});
	}

	return { inserted: allSeedRecipes.length, skipped: false };
}

/**
 * Seed demo weight logs for the selected family member.
 * Creates 30 days of weight data with realistic fluctuations.
 */
export async function seedWeightLogs(
	userId: string,
	familyMemberId: string,
): Promise<{ inserted: number; skipped: boolean }> {
	// Check existing logs
	const existing = await db
		.select({ count: sql<number>`count(*)` })
		.from(weightLogs)
		.where(eq(weightLogs.familyMemberId, familyMemberId));

	if ((existing[0]?.count ?? 0) > 5) {
		return { inserted: 0, skipped: true };
	}

	// Get member's current weight
	const [member] = await db
		.select()
		.from(familyMembers)
		.where(eq(familyMembers.id, familyMemberId));

	if (!member) return { inserted: 0, skipped: true };

	const baseWeight = member.weightKg;
	const startWeight = baseWeight + 2; // Start 2kg heavier (simulating progress)
	const today = new Date();
	const entries: { date: Date; weight: number }[] = [];

	// Generate 30 days of data
	for (let i = 29; i >= 0; i--) {
		const date = new Date(today);
		date.setDate(date.getDate() - i);

		// Linear progression with noise
		const progress = (29 - i) / 29; // 0 to 1
		const targetDelta = startWeight - baseWeight; // e.g., 2kg
		const expectedWeight = startWeight - targetDelta * progress;
		const noise = (Math.random() - 0.5) * 0.6; // ±0.3kg
		const weight = Math.round((expectedWeight + noise) * 10) / 10;

		entries.push({ date, weight });
	}

	// Insert entries
	for (const entry of entries) {
		await db.insert(weightLogs).values({
			id: randomUUID(),
			userId,
			familyMemberId,
			date: entry.date,
			weightKg: entry.weight,
			notes: null,
		});
	}

	return { inserted: entries.length, skipped: false };
}

/**
 * Run all seed functions.
 */
export async function seedAllDemoData(
	userId: string,
	familyMemberId: string,
): Promise<{
	recipes: { inserted: number; skipped: boolean };
	weightLogs: { inserted: number; skipped: boolean };
}> {
	const recipesResult = await seedRecipes();
	const weightResult = await seedWeightLogs(userId, familyMemberId);

	return {
		recipes: recipesResult,
		weightLogs: weightResult,
	};
}
