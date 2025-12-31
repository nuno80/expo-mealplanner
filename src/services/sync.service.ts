/**
 * Sync service for fetching recipes from API and storing in local SQLite.
 * Implements offline-first pattern with cloud sync.
 */

import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
	ingredients,
	recipeIngredients,
	recipeSteps,
	recipes,
} from "@/db/schema";
import { API_BASE_URL } from "@/lib/api";

export interface SyncResult {
	success: boolean;
	count: number;
	error?: string;
}

// API response types (extended to include ingredients/steps)
interface ApiIngredient {
	id: string;
	recipe_id: string;
	ingredient_id: string;
	quantity: number;
	unit: string;
	is_optional: boolean;
	notes_it: string | null;
	notes_en: string | null;
	display_order: number;
	ingredient_name_it: string;
	ingredient_name_en: string;
	kcal_per_100g?: number;
	cooked_weight_factor?: number;
}

interface ApiStep {
	id: string;
	recipe_id: string;
	step_number: number;
	instruction_it: string;
	instruction_en: string;
	image_url: string | null;
}

interface ApiRecipe {
	id: string;
	name_it: string;
	name_en: string;
	slug: string;
	description_it: string | null;
	description_en: string | null;
	category: string;
	image_url: string | null;
	prep_time_min: number;
	cook_time_min: number;
	total_time_min: number;
	servings: number;
	difficulty: string;
	kcal_per_100g: number;
	protein_per_100g: number;
	carbs_per_100g: number;
	fat_per_100g: number;
	fiber_per_100g: number | null;
	kcal_per_serving: number;
	serving_weight_g: number;
	is_published: boolean;
	created_at: string;
	updated_at: string;
	// NEW: Nested data
	ingredients: ApiIngredient[];
	steps: ApiStep[];
}

interface ApiRecipesResponse {
	success: boolean;
	count: number;
	data: ApiRecipe[];
}

/**
 * Fetch recipes from API and upsert into local SQLite (including ingredients/steps).
 */
export async function syncRecipes(): Promise<SyncResult> {
	try {
		console.log("[Sync] Fetching recipes from API...");

		const response = await fetch(`${API_BASE_URL}/recipes`, {
			headers: { "Content-Type": "application/json" },
		});

		if (!response.ok) {
			throw new Error(`API error: ${response.status}`);
		}

		const result: ApiRecipesResponse = await response.json();

		if (!result.success) {
			throw new Error("API returned unsuccessful response");
		}

		console.log(`[Sync] Received ${result.count} recipes, upserting...`);

		// Upsert each recipe + ingredients + steps into local DB
		for (const apiRecipe of result.data) {
			await upsertFullRecipe(apiRecipe);
		}

		console.log(`[Sync] Successfully synced ${result.count} recipes`);

		return { success: true, count: result.count };
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("[Sync] Failed:", message);

		// Check if local DB has recipes (offline fallback)
		const localCount = await getLocalRecipeCount();
		if (localCount > 0) {
			console.log(`[Sync] Using ${localCount} cached recipes`);
			return { success: true, count: localCount, error: message };
		}

		return { success: false, count: 0, error: message };
	}
}

/**
 * Upsert a full recipe including ingredients and steps.
 */
async function upsertFullRecipe(apiRecipe: ApiRecipe): Promise<void> {
	// 1. Upsert Recipe
	const localRecipe = {
		id: apiRecipe.id,
		nameIt: apiRecipe.name_it,
		nameEn: apiRecipe.name_en,
		slug: apiRecipe.slug,
		descriptionIt: apiRecipe.description_it,
		descriptionEn: apiRecipe.description_en,
		category: apiRecipe.category,
		imageUrl: apiRecipe.image_url,
		prepTimeMin: apiRecipe.prep_time_min,
		cookTimeMin: apiRecipe.cook_time_min,
		totalTimeMin: apiRecipe.total_time_min,
		servings: apiRecipe.servings,
		difficulty: apiRecipe.difficulty,
		kcalPer100g: apiRecipe.kcal_per_100g,
		proteinPer100g: apiRecipe.protein_per_100g,
		carbsPer100g: apiRecipe.carbs_per_100g,
		fatPer100g: apiRecipe.fat_per_100g,
		fiberPer100g: apiRecipe.fiber_per_100g,
		kcalPerServing: apiRecipe.kcal_per_serving,
		servingWeightG: apiRecipe.serving_weight_g,
		isPublished: true,
	};

	await db.insert(recipes).values(localRecipe).onConflictDoUpdate({
		target: recipes.id,
		set: localRecipe,
	});

	// 2. Upsert Ingredients (the "master" ingredient entry)
	for (const apiIng of apiRecipe.ingredients) {
		const localIngredient = {
			id: apiIng.ingredient_id,
			nameIt: apiIng.ingredient_name_it || "Ingrediente",
			nameEn: apiIng.ingredient_name_en || "Ingredient",
			kcalPer100g: apiIng.kcal_per_100g ?? 0,
			proteinPer100g: 0,
			carbsPer100g: 0,
			fatPer100g: 0,
			cookedWeightFactor: apiIng.cooked_weight_factor ?? 1,
			defaultUnit: apiIng.unit || "g",
		};

		await db.insert(ingredients).values(localIngredient).onConflictDoUpdate({
			target: ingredients.id,
			set: localIngredient,
		});
	}

	// 3. Delete existing recipe_ingredients for this recipe (clean sync)
	await db.delete(recipeIngredients).where(sql`recipe_id = ${apiRecipe.id}`);

	// 4. Insert recipe_ingredients (link table)
	for (const apiIng of apiRecipe.ingredients) {
		await db.insert(recipeIngredients).values({
			id: apiIng.id,
			recipeId: apiRecipe.id,
			ingredientId: apiIng.ingredient_id,
			quantity: apiIng.quantity,
			unit: apiIng.unit,
			isOptional: apiIng.is_optional,
			notesIt: apiIng.notes_it,
			notesEn: apiIng.notes_en,
			order: apiIng.display_order,
		});
	}

	// 5. Delete existing recipe_steps for this recipe (clean sync)
	await db.delete(recipeSteps).where(sql`recipe_id = ${apiRecipe.id}`);

	// 6. Insert recipe_steps
	for (const apiStep of apiRecipe.steps) {
		await db.insert(recipeSteps).values({
			id: apiStep.id,
			recipeId: apiRecipe.id,
			stepNumber: apiStep.step_number,
			instructionIt: apiStep.instruction_it,
			instructionEn: apiStep.instruction_en,
			imageUrl: apiStep.image_url,
		});
	}
}

/**
 * Get count of recipes in local DB.
 */
async function getLocalRecipeCount(): Promise<number> {
	const result = await db
		.select({ count: sql<number>`count(*)` })
		.from(recipes);
	return result[0]?.count ?? 0;
}

/**
 * Check if sync is needed (no local recipes or stale data).
 */
export async function isSyncNeeded(): Promise<boolean> {
	const count = await getLocalRecipeCount();
	return count === 0;
}

/**
 * Clear all local recipes (for testing/reset).
 */
export async function clearLocalRecipes(): Promise<void> {
	await db.delete(recipes);
}
