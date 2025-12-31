
import { createClient } from "@libsql/client";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import * as fs from "fs";
import * as path from "path";
import {
  ingredients,
  recipeIngredients,
  recipes
} from "../src/db/schema";

async function main() {
  console.log("🛠️  Starting Logic Verification...");

  // 1. Setup In-Memory DB
  const client = createClient({ url: "file::memory:" });
  const db = drizzle(client);

  // 2. Create Tables (Manual DDL for speed)
  await client.execute(`
        CREATE TABLE recipes (
            id TEXT PRIMARY KEY, name_it TEXT NOT NULL, name_en TEXT NOT NULL, slug TEXT NOT NULL UNIQUE,
            description_it TEXT, description_en TEXT, category TEXT NOT NULL, image_url TEXT,
            prep_time_min INTEGER, cook_time_min INTEGER, total_time_min INTEGER, servings INTEGER NOT NULL DEFAULT 1,
            difficulty TEXT NOT NULL DEFAULT 'easy', kcal_per_100g INTEGER NOT NULL,
            protein_per_100g REAL NOT NULL, carbs_per_100g REAL NOT NULL, fat_per_100g REAL NOT NULL, fiber_per_100g REAL,
            kcal_per_serving INTEGER, serving_weight_g INTEGER, is_published INTEGER NOT NULL DEFAULT 0,
            created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
        );
    `);
  await client.execute(`
        CREATE TABLE ingredients (
            id TEXT PRIMARY KEY, usda_fdc_id TEXT, name_it TEXT NOT NULL, name_en TEXT NOT NULL, category TEXT,
            kcal_per_100g INTEGER NOT NULL, protein_per_100g REAL NOT NULL, carbs_per_100g REAL NOT NULL,
            fat_per_100g REAL NOT NULL, fiber_per_100g REAL, cooked_weight_factor REAL DEFAULT 1,
            default_unit TEXT NOT NULL DEFAULT 'g', created_at INTEGER NOT NULL
        );
    `);
  await client.execute(`
        CREATE TABLE recipe_ingredients (
            id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, ingredient_id TEXT NOT NULL, quantity REAL NOT NULL,
            unit TEXT NOT NULL DEFAULT 'g', is_optional INTEGER NOT NULL DEFAULT 0,
            notes_it TEXT, notes_en TEXT, "order" INTEGER NOT NULL DEFAULT 0
        );
    `);
  await client.execute(`
        CREATE TABLE recipe_steps (
            id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, step_number INTEGER NOT NULL, instruction_it TEXT NOT NULL,
            instruction_en TEXT NOT NULL, image_url TEXT
        );
    `);

  // 3. Load JSON Data
  const jsonPath = path.join(process.cwd(), "recipe-manager/recipes_data/hamburger_manzo.json");
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
  console.log(`📄 Loaded JSON: ${jsonData.name_it}`);

  // 4. Simulate Import (Simplified)
  const recipeId = "test-recipe-id";
  await db.insert(recipes).values({
    id: recipeId,
    nameIt: jsonData.name_it,
    nameEn: jsonData.name_en,
    slug: jsonData.slug,
    category: jsonData.category,
    kcalPer100g: jsonData.kcal_per_100g,
    proteinPer100g: jsonData.protein_per_100g,
    carbsPer100g: jsonData.carbs_per_100g,
    fatPer100g: jsonData.fat_per_100g,
    createdAt: new Date(), updatedAt: new Date(),
    // Defaults
    servings: 1, difficulty: 'easy', isPublished: true
  });

  for (const [i, ing] of jsonData.ingredients.entries()) {
    const ingId = `ing-${i}`;

    // Insert Ingredient
    await db.insert(ingredients).values({
      id: ingId,
      nameIt: ing.name_it,
      nameEn: ing.name_en,
      kcalPer100g: 100, // Dummy
      proteinPer100g: 10,
      carbsPer100g: 10,
      fatPer100g: 10,
      createdAt: new Date()
    });

    // Link
    await db.insert(recipeIngredients).values({
      id: `ri-${i}`,
      recipeId: recipeId,
      ingredientId: ingId,
      quantity: ing.quantity,
      unit: ing.unit,
      order: i
    });
  }
  console.log("💾 Data inserted successfully.");

  // 5. Test Query Logic (copied from recipe.service.ts)
  console.log("🔍 Running Service Query Logic...");

  const ingredientsResult = await db
    .select({
      id: recipeIngredients.id,
      // Simplified selection
      ingredient: {
        id: ingredients.id,
        nameIt: ingredients.nameIt,
      },
      quantity: recipeIngredients.quantity
    })
    .from(recipeIngredients)
    .innerJoin(ingredients, eq(recipeIngredients.ingredientId, ingredients.id))
    .where(eq(recipeIngredients.recipeId, recipeId))
    .orderBy(recipeIngredients.order);

  console.log(`📊 Query returned ${ingredientsResult.length} ingredients.`);
  ingredientsResult.forEach(row => {
    console.log(`   - ${row.quantity} ${row.ingredient.nameIt}`);
  });

  if (ingredientsResult.length === jsonData.ingredients.length) {
    console.log("✅ SUCCESS: Logic works correctly.");
  } else {
    console.error("❌ FAILURE: Missing ingredients in result.");
  }
}

main().catch(console.error);
