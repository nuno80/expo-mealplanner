"""
Turso Database Client for Recipe Manager.
Writes directly to Turso Cloud (remote).
"""
import libsql_client
from typing import Any, Optional
from uuid import UUID

from ..config.settings import Config


class TursoClient:
    """Async client for Turso/libSQL database operations."""

    def __init__(self):
        self.url = Config.TURSO_URL
        self.token = Config.TURSO_TOKEN
        self._client = None

    async def connect(self):
        """Create connection if not exists."""
        if not self._client:
            self._client = libsql_client.create_client(
                url=self.url,
                auth_token=self.token
            )
        return self._client

    async def close(self):
        """Close connection."""
        if self._client:
            await self._client.close()
            self._client = None

    async def execute(self, sql: str, params: Optional[list] = None) -> Any:
        """Execute a SQL query with optional parameters."""
        client = await self.connect()
        try:
            if params:
                return await client.execute(sql, params)
            return await client.execute(sql)
        except KeyError as e:
            # libsql-client raises KeyError when table doesn't exist
            raise RuntimeError(
                f"Database error (table may not exist). "
                f"Run Drizzle migrations first: pnpm drizzle-kit push"
            ) from e

    async def test_connection(self) -> tuple[bool, str]:
        """Test database connectivity."""
        try:
            await self.execute("SELECT 1")
            return True, "Connected successfully"
        except Exception as e:
            return False, str(e)
        finally:
            await self.close()

    def _rows_to_dicts(self, result) -> list[dict]:
        """Convert libsql ResultSet to list of dicts."""
        if not result.rows:
            return []
        columns = result.columns
        return [dict(zip(columns, row)) for row in result.rows]

    # ============ Ingredient CRUD ============

    async def insert_ingredient(
        self,
        id: UUID,
        usda_fdc_id: Optional[str],
        name_it: str,
        name_en: str,
        category: Optional[str],
        kcal_per_100g: int,
        protein_per_100g: float,
        carbs_per_100g: float,
        fat_per_100g: float,
        fiber_per_100g: Optional[float],
        cooked_weight_factor: float,
        default_unit: str,
    ) -> None:
        """Insert a new ingredient into the database."""
        sql = """
            INSERT INTO ingredients (
                id, usda_fdc_id, name_it, name_en, category,
                kcal_per_100g, protein_per_100g, carbs_per_100g,
                fat_per_100g, fiber_per_100g, cooked_weight_factor,
                default_unit, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now') * 1000)
        """
        await self.execute(sql, [
            str(id), usda_fdc_id, name_it, name_en, category,
            kcal_per_100g, protein_per_100g, carbs_per_100g,
            fat_per_100g, fiber_per_100g, cooked_weight_factor,
            default_unit
        ])

    async def get_ingredients(self) -> list[dict]:
        """Fetch all ingredients."""
        sql = "SELECT * FROM ingredients ORDER BY name_it"
        result = await self.execute(sql)
        return self._rows_to_dicts(result)

    async def get_ingredient_by_id(self, id: UUID) -> Optional[dict]:
        """Fetch a single ingredient by ID."""
        sql = "SELECT * FROM ingredients WHERE id = ?"
        result = await self.execute(sql, [str(id)])
        rows = self._rows_to_dicts(result)
        return rows[0] if rows else None

    # ============ Recipe CRUD ============

    async def insert_recipe(
        self,
        id: UUID,
        name_it: str,
        name_en: str,
        slug: str,
        description_it: Optional[str],
        description_en: Optional[str],
        category: str,
        image_url: Optional[str],
        prep_time_min: int,
        cook_time_min: int,
        total_time_min: int,
        servings: int,
        difficulty: str,
        kcal_per_100g: int,
        kcal_per_serving: int,
        protein_per_100g: float,
        carbs_per_100g: float,
        fat_per_100g: float,
        fiber_per_100g: Optional[float],
        serving_weight_g: int,
        is_published: bool,
    ) -> None:
        """Insert a new recipe into the database."""
        sql = """
            INSERT INTO recipes (
                id, name_it, name_en, slug, description_it, description_en,
                category, image_url, prep_time_min, cook_time_min, total_time_min,
                servings, difficulty, kcal_per_100g, kcal_per_serving,
                protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
                serving_weight_g, is_published, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, strftime('%s', 'now') * 1000, strftime('%s', 'now') * 1000)
        """
        await self.execute(sql, [
            str(id), name_it, name_en, slug, description_it, description_en,
            category, image_url, prep_time_min, cook_time_min, total_time_min,
            servings, difficulty, kcal_per_100g, kcal_per_serving,
            protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
            serving_weight_g, 1 if is_published else 0
        ])

    async def get_recipes(self, category: Optional[str] = None) -> list[dict]:
        """Fetch all recipes, optionally filtered by category."""
        if category:
            sql = "SELECT * FROM recipes WHERE category = ? ORDER BY name_it"
            result = await self.execute(sql, [category])
        else:
            sql = "SELECT * FROM recipes ORDER BY name_it"
            result = await self.execute(sql)
        return self._rows_to_dicts(result)

    async def get_recipe_by_id(self, id: UUID) -> Optional[dict]:
        """Fetch a single recipe by ID."""
        sql = "SELECT * FROM recipes WHERE id = ?"
        result = await self.execute(sql, [str(id)])
        rows = self._rows_to_dicts(result)
        return rows[0] if rows else None

    # ============ RecipeIngredient ============

    async def insert_recipe_ingredient(
        self,
        id: UUID,
        recipe_id: UUID,
        ingredient_id: UUID,
        quantity: float,
        unit: str,
        is_optional: bool,
        notes_it: Optional[str],
        notes_en: Optional[str],
        order: int,
    ) -> None:
        """Link an ingredient to a recipe."""
        sql = """
            INSERT INTO recipe_ingredients (
                id, recipe_id, ingredient_id, quantity, unit,
                is_optional, notes_it, notes_en, "order"
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        await self.execute(sql, [
            str(id), str(recipe_id), str(ingredient_id),
            quantity, unit, 1 if is_optional else 0,
            notes_it, notes_en, order
        ])

    async def get_recipe_ingredients(self, recipe_id: UUID) -> list[dict]:
        """Fetch all ingredients for a recipe with ingredient details."""
        sql = """
            SELECT ri.*, i.name_it as ingredient_name_it, i.name_en as ingredient_name_en,
                   i.kcal_per_100g, i.protein_per_100g, i.carbs_per_100g, i.fat_per_100g
            FROM recipe_ingredients ri
            JOIN ingredients i ON ri.ingredient_id = i.id
            WHERE ri.recipe_id = ?
            ORDER BY ri."order"
        """
        result = await self.execute(sql, [str(recipe_id)])
        return self._rows_to_dicts(result)

    # ============ RecipeStep ============

    async def insert_recipe_step(
        self,
        id: UUID,
        recipe_id: UUID,
        step_number: int,
        instruction_it: str,
        instruction_en: str,
        image_url: Optional[str],
    ) -> None:
        """Add a preparation step to a recipe."""
        sql = """
            INSERT INTO recipe_steps (
                id, recipe_id, step_number, instruction_it, instruction_en, image_url
            ) VALUES (?, ?, ?, ?, ?, ?)
        """
        await self.execute(sql, [
            str(id), str(recipe_id), step_number,
            instruction_it, instruction_en, image_url
        ])

    async def get_recipe_steps(self, recipe_id: UUID) -> list[dict]:
        """Fetch all steps for a recipe."""
        sql = "SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY step_number"
        result = await self.execute(sql, [str(recipe_id)])
        return self._rows_to_dicts(result)
