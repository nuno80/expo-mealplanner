"""
Pydantic models for Recipe Manager.
Aligned with docs/data-models.md schema.
"""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel, Field


# ============ Enums ============

class Category(str, Enum):
    BREAKFAST = "breakfast"
    MAIN_COURSE = "main_course"
    SNACK = "snack"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# ============ Nutrient Data ============

class NutrientData(BaseModel):
    """Nutritional values per 100g."""
    kcal: int = 0
    protein: Decimal = Field(default=Decimal("0"), decimal_places=2)
    carbs: Decimal = Field(default=Decimal("0"), decimal_places=2)
    fat: Decimal = Field(default=Decimal("0"), decimal_places=2)
    fiber: Optional[Decimal] = Field(default=None, decimal_places=2)


# ============ USDA Models ============

class USDAFood(BaseModel):
    """Parsed USDA FoodData Central response."""
    fdc_id: str
    description: str
    brand_owner: Optional[str] = None
    nutrients: NutrientData = Field(default_factory=NutrientData)


# ============ Ingredient ============

class IngredientCreate(BaseModel):
    """Input model for creating an ingredient."""
    usda_fdc_id: Optional[str] = None
    name_it: str
    name_en: str
    category: Optional[str] = None
    kcal_per_100g: int = 0
    protein_per_100g: Decimal = Field(default=Decimal("0"), decimal_places=2)
    carbs_per_100g: Decimal = Field(default=Decimal("0"), decimal_places=2)
    fat_per_100g: Decimal = Field(default=Decimal("0"), decimal_places=2)
    fiber_per_100g: Optional[Decimal] = Field(default=None, decimal_places=2)
    cooked_weight_factor: Decimal = Field(default=Decimal("1.0"), decimal_places=2)
    default_unit: str = "g"


class Ingredient(IngredientCreate):
    """Full ingredient model with ID and timestamp."""
    id: UUID = Field(default_factory=uuid4)
    created_at: datetime = Field(default_factory=datetime.now)


# ============ Recipe ============

class RecipeCreate(BaseModel):
    """Input model for creating a recipe."""
    name_it: str
    name_en: str
    slug: Optional[str] = None  # Generated from name if not provided
    description_it: Optional[str] = None
    description_en: Optional[str] = None
    category: Category
    image_url: Optional[str] = None
    prep_time_min: int = 0
    cook_time_min: int = 0
    servings: int = 1
    difficulty: Difficulty = Difficulty.EASY


class Recipe(RecipeCreate):
    """Full recipe model with computed fields."""
    id: UUID = Field(default_factory=uuid4)
    total_time_min: int = 0
    kcal_per_100g: int = 0
    kcal_per_serving: int = 0
    protein_per_100g: Decimal = Field(default=Decimal("0"), decimal_places=2)
    carbs_per_100g: Decimal = Field(default=Decimal("0"), decimal_places=2)
    fat_per_100g: Decimal = Field(default=Decimal("0"), decimal_places=2)
    fiber_per_100g: Optional[Decimal] = Field(default=None, decimal_places=2)
    serving_weight_g: int = 0
    is_published: bool = False
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)

    def model_post_init(self, __context):
        """Compute total_time after init."""
        if self.total_time_min == 0:
            object.__setattr__(self, 'total_time_min', self.prep_time_min + self.cook_time_min)


# ============ RecipeIngredient ============

class RecipeIngredientCreate(BaseModel):
    """Input model for linking ingredient to recipe."""
    recipe_id: UUID
    ingredient_id: UUID
    quantity: Decimal = Field(decimal_places=2)
    unit: str = "g"
    is_optional: bool = False
    notes_it: Optional[str] = None
    notes_en: Optional[str] = None
    order: int = 0


class RecipeIngredient(RecipeIngredientCreate):
    """Full recipe-ingredient link with ID."""
    id: UUID = Field(default_factory=uuid4)


# ============ RecipeStep ============

class RecipeStepCreate(BaseModel):
    """Input model for recipe preparation step."""
    recipe_id: UUID
    step_number: int
    instruction_it: str
    instruction_en: str
    image_url: Optional[str] = None


class RecipeStep(RecipeStepCreate):
    """Full recipe step with ID."""
    id: UUID = Field(default_factory=uuid4)
