import { Hono } from "hono";
import { createTursoClient, type Env, type Recipe, type RecipeIngredient, type RecipeStep } from "../db";

const recipes = new Hono<{ Bindings: Env }>();

/**
 * GET /recipes - List all published recipes
 */
recipes.get("/", async (c) => {
  const db = createTursoClient(c.env);

  try {
    const result = await db.execute(`
      SELECT
        id, name_it, name_en, slug, description_it, description_en,
        category, image_url, prep_time_min, cook_time_min, total_time_min,
        servings, difficulty, kcal_per_100g, protein_per_100g, carbs_per_100g,
        fat_per_100g, fiber_per_100g, kcal_per_serving, serving_weight_g,
        is_published, created_at, updated_at
      FROM recipes
      WHERE is_published = 1
      ORDER BY name_it
    `);

    const recipes = result.rows as unknown as Recipe[];

    return c.json({
      success: true,
      count: recipes.length,
      data: recipes,
    });
  } catch (error) {
    console.error("Error fetching recipes:", error);
    return c.json({ success: false, error: "Failed to fetch recipes" }, 500);
  }
});

/**
 * GET /recipes/:id - Get single recipe with ingredients and steps
 */
recipes.get("/:id", async (c) => {
  const db = createTursoClient(c.env);
  const id = c.req.param("id");

  try {
    // Get recipe
    const recipeResult = await db.execute({
      sql: `SELECT * FROM recipes WHERE id = ?`,
      args: [id],
    });

    if (recipeResult.rows.length === 0) {
      return c.json({ success: false, error: "Recipe not found" }, 404);
    }

    const recipe = recipeResult.rows[0] as unknown as Recipe;

    // Get ingredients with ingredient details
    const ingredientsResult = await db.execute({
      sql: `
        SELECT
          ri.id, ri.recipe_id, ri.ingredient_id, ri.quantity, ri.unit,
          ri.is_optional, ri.notes_it, ri.notes_en, ri.display_order,
          i.name_it as ingredient_name_it, i.name_en as ingredient_name_en
        FROM recipe_ingredients ri
        LEFT JOIN ingredients i ON ri.ingredient_id = i.id
        WHERE ri.recipe_id = ?
        ORDER BY ri.display_order
      `,
      args: [id],
    });

    // Get steps
    const stepsResult = await db.execute({
      sql: `
        SELECT id, recipe_id, step_number, instruction_it, instruction_en, image_url
        FROM recipe_steps
        WHERE recipe_id = ?
        ORDER BY step_number
      `,
      args: [id],
    });

    return c.json({
      success: true,
      data: {
        ...recipe,
        ingredients: ingredientsResult.rows as unknown as RecipeIngredient[],
        steps: stepsResult.rows as unknown as RecipeStep[],
      },
    });
  } catch (error) {
    console.error("Error fetching recipe:", error);
    return c.json({ success: false, error: "Failed to fetch recipe" }, 500);
  }
});

export default recipes;
