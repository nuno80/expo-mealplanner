
import { eq } from "drizzle-orm";
import { db } from "../src/db/client";
import { recipeIngredients, recipes } from "../src/db/schema";

async function main() {
  console.log("🔍 Checking Recipe: Hamburger di manzo mediterraneo");

  // 1. Find Recipe
  const recipe = await db.query.recipes.findFirst({
    where: eq(recipes.slug, "hamburger-di-manzo-mediterraneo"),
  });

  if (!recipe) {
    console.error("❌ Recipe not found in DB!");
    process.exit(1);
  }

  console.log(`✅ Recipe Found: ${recipe.nameIt} (ID: ${recipe.id})`);

  // 2. Find Ingredients
  const relations = await db.query.recipeIngredients.findMany({
    where: eq(recipeIngredients.recipeId, recipe.id),
    with: {
      ingredient: true
    }
  });

  console.log(`📊 Found ${relations.length} linked ingredients in 'recipe_ingredients' table.`);

  if (relations.length === 0) {
    console.log("⚠️ NO INGREDIENTS LINKED! Checking raw count...");
    const rawCount = await db.select().from(recipeIngredients).where(eq(recipeIngredients.recipeId, recipe.id));
    console.log(`Raw count in recipe_ingredients for this ID: ${rawCount.length}`);
  } else {
    relations.forEach((rel, i) => {
      console.log(`   ${i + 1}. ${rel.ingredient?.nameIt} - ${rel.quantity} ${rel.unit}`);
    });
  }
}

main().catch(console.error);
