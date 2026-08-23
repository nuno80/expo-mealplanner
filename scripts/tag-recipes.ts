/**
 * Tag existing recipes with nutritional tags for Harvard Plate logic (v2.6).
 * - Tags vegetable-heavy recipes with "vegetable_heavy"
 * - Verifies bread/starch items have correct kcal/CHO for side2 logic
 *
 * Usage: pnpm exec tsx scripts/tag-recipes.ts
 */
import { createClient } from "@libsql/client";
import * as dotenv from "dotenv";

// Load env from multiple possible locations
dotenv.config({ path: "recipe-manager/.env" });
dotenv.config({ path: "apps/algorithm-playground/.env.local" });

const url = process.env.TURSO_DATABASE_URL ?? process.env.VITE_TURSO_URL;
const authToken = process.env.TURSO_AUTH_TOKEN ?? process.env.VITE_TURSO_TOKEN;

if (!url) {
  console.error("❌ No Turso URL found.");
  process.exit(1);
}

const client = createClient({ url, authToken });

// Keywords that indicate a recipe is vegetable-heavy
const VEG_HEAVY_KEYWORDS = [
  "verdur", "vegetale", "spinaci", "broccol", "zucchine", "melanzane",
  "peperoni", "cavolfiore", "insalata", "minestrone", "ratatouille",
  "ribollita", "caponata", "parmigiana di melanzane", "ciambotta",
  "bietol", "cime di rapa", "fagiolini", "finocch", "aspara",
  "carote", "zuppa di verdure", "vellutata",
];

async function tagRecipes() {
  console.log("🏷️  Tagging recipes for Harvard Plate logic...\n");

  // Get all recipes
  const result = await client.execute(
    "SELECT id, name_it, name_en, category, tags FROM recipes WHERE is_published = 1"
  );

  const allRecipes = result.rows;
  console.log(`📋 Found ${allRecipes.length} published recipes.\n`);

  let taggedCount = 0;
  let alreadyTagged = 0;

  for (const recipe of allRecipes) {
    const nameIt = (recipe.name_it as string).toLowerCase();
    const nameEn = (recipe.name_en as string).toLowerCase();
    const category = recipe.category as string;
    const existingTags = recipe.tags as string | null;

    // Skip vegetable_side category (they ARE vegetables, not vegetable_heavy main courses)
    if (category === "vegetable_side" || category === "side_dish") continue;

    // Check if already tagged
    if (existingTags) {
      try {
        const parsed = JSON.parse(existingTags);
        if (parsed.includes("vegetable_heavy")) {
          alreadyTagged++;
          continue;
        }
      } catch { }
    }

    // Check if name matches vegetable-heavy keywords
    const isVegHeavy = VEG_HEAVY_KEYWORDS.some(
      (kw) => nameIt.includes(kw) || nameEn.includes(kw.toLowerCase())
    );

    if (isVegHeavy) {
      const newTags = existingTags
        ? JSON.stringify([...JSON.parse(existingTags), "vegetable_heavy"])
        : JSON.stringify(["vegetable_heavy"]);

      await client.execute({
        sql: "UPDATE recipes SET tags = ? WHERE id = ?",
        args: [newTags, recipe.id as string],
      });

      console.log(`  🥬 Tagged: ${recipe.name_it} (${category})`);
      taggedCount++;
    }
  }

  console.log(`\n✅ Tagged ${taggedCount} recipes, ${alreadyTagged} already tagged.\n`);

  // D3: Verify bread/starch items for side2 logic
  console.log("🍞 Verifying bread/starch items for side2 logic:\n");

  const breadItems = await client.execute(
    "SELECT id, name_it, kcal_per_100g, carbs_per_100g, category FROM recipes WHERE (name_it LIKE '%pane%' OR name_it LIKE '%riso%' OR name_it LIKE '%patate%') AND is_published = 1"
  );

  for (const item of breadItems.rows) {
    const kcal = item.kcal_per_100g as number;
    const carbs = item.carbs_per_100g as number;
    const ok = kcal >= 80 && carbs >= 15; // Minimum thresholds for starchy side
    console.log(
      `  ${ok ? "✅" : "⚠️"} ${item.name_it}: ${kcal} kcal/100g, ${carbs}g CHO/100g (${item.category})`
    );
  }

  console.log("\n🏁 Tagging complete.");
}

tagRecipes().catch(console.error);
