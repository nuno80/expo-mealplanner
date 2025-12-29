import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
	ingredients,
	recipeIngredients,
	recipeSteps,
	recipes,
} from "@/db/schema";
import type {
	Recipe,
	RecipeCategory,
	RecipeListItem,
	RecipeWithDetails,
} from "@/schemas/recipe";

// ============================================================================
// RECIPE QUERIES
// ============================================================================

/**
 * Get all published recipes, optionally filtered by category.
 */
export async function getRecipes(
	category?: RecipeCategory,
): Promise<RecipeListItem[]> {
	const conditions = [eq(recipes.isPublished, true)];

	if (category) {
		conditions.push(eq(recipes.category, category));
	}

	const result = await db
		.select({
			id: recipes.id,
			nameIt: recipes.nameIt,
			nameEn: recipes.nameEn,
			slug: recipes.slug,
			category: recipes.category,
			imageUrl: recipes.imageUrl,
			totalTimeMin: recipes.totalTimeMin,
			difficulty: recipes.difficulty,
			kcalPerServing: recipes.kcalPerServing,
			servingWeightG: recipes.servingWeightG,
			kcalPer100g: recipes.kcalPer100g,
		})
		.from(recipes)
		.where(and(...conditions));

	return result as RecipeListItem[];
}

/**
 * Get a single recipe by ID with full details (ingredients + steps).
 */
export async function getRecipeById(
	recipeId: string,
): Promise<RecipeWithDetails | null> {
	// Get recipe
	const recipeResult = await db
		.select()
		.from(recipes)
		.where(eq(recipes.id, recipeId));

	if (!recipeResult[0]) return null;

	const recipe = recipeResult[0];

	// Get ingredients with details
	const ingredientsResult = await db
		.select({
			id: recipeIngredients.id,
			recipeId: recipeIngredients.recipeId,
			ingredientId: recipeIngredients.ingredientId,
			quantity: recipeIngredients.quantity,
			unit: recipeIngredients.unit,
			isOptional: recipeIngredients.isOptional,
			notesIt: recipeIngredients.notesIt,
			notesEn: recipeIngredients.notesEn,
			order: recipeIngredients.order,
			ingredient: {
				id: ingredients.id,
				usdaFdcId: ingredients.usdaFdcId,
				nameIt: ingredients.nameIt,
				nameEn: ingredients.nameEn,
				category: ingredients.category,
				kcalPer100g: ingredients.kcalPer100g,
				proteinPer100g: ingredients.proteinPer100g,
				carbsPer100g: ingredients.carbsPer100g,
				fatPer100g: ingredients.fatPer100g,
				fiberPer100g: ingredients.fiberPer100g,
				cookedWeightFactor: ingredients.cookedWeightFactor,
				defaultUnit: ingredients.defaultUnit,
				createdAt: ingredients.createdAt,
			},
		})
		.from(recipeIngredients)
		.innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
		.where(eq(recipeIngredients.recipeId, recipeId))
		.orderBy(recipeIngredients.order);

	// Get steps
	const stepsResult = await db
		.select()
		.from(recipeSteps)
		.where(eq(recipeSteps.recipeId, recipeId))
		.orderBy(recipeSteps.stepNumber);

	return {
		...recipe,
		ingredients: ingredientsResult,
		steps: stepsResult,
	} as RecipeWithDetails;
}

/**
 * Get a recipe by its slug.
 */
export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
	const result = await db.select().from(recipes).where(eq(recipes.slug, slug));

	return (result[0] as Recipe) ?? null;
}

/**
 * Search recipes by name (Italian or English).
 */
export async function searchRecipes(query: string): Promise<RecipeListItem[]> {
	if (!query.trim()) return [];

	const searchTerm = `%${query.toLowerCase()}%`;

	// SQLite doesn't have native ILIKE, we'll use LIKE with lowercase
	const result = await db
		.select({
			id: recipes.id,
			nameIt: recipes.nameIt,
			nameEn: recipes.nameEn,
			slug: recipes.slug,
			category: recipes.category,
			imageUrl: recipes.imageUrl,
			totalTimeMin: recipes.totalTimeMin,
			difficulty: recipes.difficulty,
			kcalPerServing: recipes.kcalPerServing,
			servingWeightG: recipes.servingWeightG,
			kcalPer100g: recipes.kcalPer100g,
		})
		.from(recipes)
		.where(eq(recipes.isPublished, true));

	// Filter in memory for case-insensitive search
	// (Drizzle SQLite doesn't support ilike natively)
	const lowerQuery = query.toLowerCase();
	return result.filter(
		(r) =>
			r.nameIt.toLowerCase().includes(lowerQuery) ||
			r.nameEn.toLowerCase().includes(lowerQuery),
	) as RecipeListItem[];
}

/**
 * Get multiple recipes by IDs (for meal plan display).
 */
export async function getRecipesByIds(ids: string[]): Promise<Recipe[]> {
	if (ids.length === 0) return [];

	const result = await db
		.select()
		.from(recipes)
		.where(inArray(recipes.id, ids));

	return result as Recipe[];
}

/**
 * Get recipes for a specific category (for meal plan algorithm).
 * Excludes recently used recipes if provided.
 */
export async function getRecipesForPlanning(
	category: RecipeCategory,
	excludeIds: string[] = [],
): Promise<Recipe[]> {
	const conditions = [
		eq(recipes.isPublished, true),
		eq(recipes.category, category),
	];

	const result = await db
		.select()
		.from(recipes)
		.where(and(...conditions));

	// Filter out excluded IDs in memory
	const filtered =
		excludeIds.length > 0
			? result.filter((r) => !excludeIds.includes(r.id))
			: result;

	return filtered as Recipe[];
}
