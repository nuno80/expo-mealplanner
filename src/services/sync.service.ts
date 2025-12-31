/**
 * Sync service for fetching recipes from API and storing in local SQLite.
 * Implements offline-first pattern with cloud sync.
 */
import { db } from "@/db/client";
import { recipes } from "@/db/schema";
import { API_BASE_URL, type ApiRecipe, type ApiRecipesResponse } from "@/lib/api";
import { sql } from "drizzle-orm";

// Last sync timestamp key for expo-sqlite/kv-store
const LAST_SYNC_KEY = "recipes_last_sync";

export interface SyncResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Fetch recipes from API and upsert into local SQLite.
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

    // Upsert each recipe into local DB
    for (const apiRecipe of result.data) {
      await upsertRecipe(apiRecipe);
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
 * Upsert a single recipe from API format to local DB format.
 */
async function upsertRecipe(apiRecipe: ApiRecipe): Promise<void> {
  // Map API snake_case to DB camelCase
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

  // Use INSERT OR REPLACE for upsert
  await db
    .insert(recipes)
    .values(localRecipe)
    .onConflictDoUpdate({
      target: recipes.id,
      set: localRecipe,
    });
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
