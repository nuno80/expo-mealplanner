"""
LLM-based recipe parser using Gemini API.
Parses recipe text into clean, structured JSON with translations.
"""
import json
import os
from typing import Optional

from google import genai
from google.genai import types

from .parser import ParsedRecipe, ParsedIngredient, ParsedNutrition, DietaryFlags


# System prompt for recipe parsing - aligned with prompts/recipe_parser.md
SYSTEM_PROMPT = """You are a professional recipe parser for a meal planning app. Extract structured data with PRECISE nutritional and weight information to enable portion scaling for different family members.

OUTPUT FORMAT (strict JSON, nothing else):
{
  "name_it": "Nome italiano della ricetta",
  "name_en": "English recipe name",
  "slug": "nome-ricetta-lowercase-with-dashes",
  "description_it": "Breve descrizione in italiano (1-2 frasi)",
  "description_en": "Short description in English (1-2 sentences)",
  "category": "breakfast|main_course|snack",
  "preferred_meal": "lunch|dinner|both",
  "servings": 4,
  "prep_time_min": 15,
  "cook_time_min": 30,
  "difficulty": "easy|medium|hard",

  "kcal_per_100g": 145,
  "protein_per_100g": 17.5,
  "carbs_per_100g": 7.7,
  "fat_per_100g": 5.4,
  "fiber_per_100g": 1.0,

  "kcal_per_serving": 268,
  "serving_weight_g": 185,
  "total_raw_weight_g": 752,
  "total_cooked_weight_g": 740,
  "cooking_factor": 0.98,

  "allergens": ["gluten", "dairy"],
  "dietary_flags": {
    "vegetarian": false,
    "vegan": false,
    "gluten_free": false,
    "dairy_free": false,
    "nut_free": true
  },

  "ingredients": [
    {
      "name_it": "petto di pollo",
      "name_en": "chicken breast",
      "quantity": 500,
      "unit": "g",
      "cooking_factor": 0.80,
      "is_optional": false,
      "notes_it": "tagliato a cubetti",
      "notes_en": "cut into cubes"
    }
  ],

  "steps": [
    {
      "step_number": 1,
      "instruction_it": "Tagliare il pollo a cubetti.",
      "instruction_en": "Cut the chicken into cubes."
    }
  ],

  "tags": ["chicken", "baked", "healthy", "high-protein"]
}

RULES:
1. ALL FIELDS REQUIRED - never return null. Use defaults if unknown.
2. CATEGORY: "breakfast", "main_course", or "snack" only.
3. PREFERRED_MEAL: "lunch", "dinner", or "both" for main_course.
4. COOKING FACTORS per ingredient: pasta=2.1, rice=2.5, meat=0.75-0.85, vegetables=0.85-0.95, eggs/cheese/oils=1.0
5. WEIGHT CALCULATIONS:
   - total_raw_weight_g = SUM of all ingredient quantities
   - total_cooked_weight_g = SUM of (quantity × cooking_factor) for each ingredient
   - cooking_factor (recipe) = total_cooked_weight_g / total_raw_weight_g
   - serving_weight_g = total_cooked_weight_g / servings
6. NUTRITION: If source gives kcal per serving, calculate: kcal_per_100g = (kcal_per_serving / serving_weight_g) × 100
7. ALLERGENS: Include from list ["gluten", "dairy", "eggs", "nuts", "soy", "fish", "shellfish", "celery", "mustard", "sesame", "sulphites"]
8. Round decimals: kcal to integer, macros to 1 decimal.
9. Output ONLY valid JSON.
"""


def parse_recipe_with_llm(text: str, api_key: Optional[str] = None) -> dict:
    """
    Parse recipe text using Gemini LLM.
    Returns parsed JSON dict ready for database insertion.
    """
    key = api_key or os.getenv("GEMINI_API_KEY")
    if not key:
        raise ValueError(
            "GEMINI_API_KEY not found. Set it in .env or pass as argument."
        )

    client = genai.Client(api_key=key)

    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents=f"Parse this recipe and extract ALL required fields with accurate nutritional data and cooking factors:\n\n{text}",
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            temperature=0.1,
            max_output_tokens=4096,
        )
    )

    # Extract JSON from response
    response_text = response.text.strip()

    # Remove markdown code blocks if present
    if response_text.startswith("```"):
        lines = response_text.split("\n")
        # Remove first line (```json) and last line (```)
        lines = [l for l in lines if not l.startswith("```")]
        response_text = "\n".join(lines)

    try:
        return json.loads(response_text)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse LLM response as JSON: {e}\nResponse: {response_text[:500]}")


def llm_result_to_parsed_recipe(data: dict) -> ParsedRecipe:
    """Convert LLM JSON output to ParsedRecipe model."""

    # Parse ingredients with new fields
    ingredients = []
    for ing in data.get("ingredients", []):
        ingredients.append(ParsedIngredient(
            name=ing.get("name_it", ""),
            name_it=ing.get("name_it", ""),
            name_en=ing.get("name_en", ""),
            quantity=float(ing.get("quantity", 0)),
            unit=ing.get("unit", "g"),
            cooking_factor=float(ing.get("cooking_factor", 1.0)),
            is_optional=ing.get("is_optional", False),
            notes_it=ing.get("notes_it"),
            notes_en=ing.get("notes_en"),
            grams=float(ing.get("quantity", 0)) if ing.get("unit") == "g" else None,
            original_text=f"{ing.get('name_it')} - {ing.get('notes_it', '')}".strip(" -"),
        ))

    # Parse nutrition with all new fields
    serving_weight = data.get("serving_weight_g", 100)
    nutrition = ParsedNutrition(
        # Per 100g fields
        kcal_per_100g=data.get("kcal_per_100g", 0),
        protein_per_100g=data.get("protein_per_100g", 0),
        carbs_per_100g=data.get("carbs_per_100g", 0),
        fat_per_100g=data.get("fat_per_100g", 0),
        fiber_per_100g=data.get("fiber_per_100g", 0),
        # Per serving (for display)
        kcal=data.get("kcal_per_serving", 0),
        protein=data.get("protein_per_100g", 0) * serving_weight / 100,
        carbs=data.get("carbs_per_100g", 0) * serving_weight / 100,
        fat=data.get("fat_per_100g", 0) * serving_weight / 100,
        fiber=data.get("fiber_per_100g"),
        # Weight data
        serving_weight_g=serving_weight,
        total_raw_weight_g=data.get("total_raw_weight_g"),
        total_cooked_weight_g=data.get("total_cooked_weight_g"),
        cooking_factor=data.get("cooking_factor", 1.0),
    )

    # Parse dietary flags
    flags_data = data.get("dietary_flags", {})
    dietary_flags = DietaryFlags(
        vegetarian=flags_data.get("vegetarian", False),
        vegan=flags_data.get("vegan", False),
        gluten_free=flags_data.get("gluten_free", False),
        dairy_free=flags_data.get("dairy_free", False),
        nut_free=flags_data.get("nut_free", True),
    )

    return ParsedRecipe(
        name_it=data.get("name_it", ""),
        name_en=data.get("name_en"),
        slug=data.get("slug"),
        description_it=data.get("description_it"),
        description_en=data.get("description_en"),
        source_url=data.get("source_url"),
        category=data.get("category", "main_course"),
        preferred_meal=data.get("preferred_meal", "both"),
        servings=data.get("servings", 4),
        prep_time_min=data.get("prep_time_min", 0),
        cook_time_min=data.get("cook_time_min", 0),
        difficulty=data.get("difficulty", "easy"),
        ingredients=ingredients,
        steps=[s.get("instruction_it", "") for s in data.get("steps", [])],
        nutrition=nutrition,
        tags=data.get("tags", []),
        allergens=data.get("allergens", []),
        dietary_flags=dietary_flags,
    )
