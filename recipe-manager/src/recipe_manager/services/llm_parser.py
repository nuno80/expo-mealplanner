"""
LLM-based recipe parser using Gemini API.
Parses recipe text into clean, structured JSON with translations.
"""
import json
import os
from typing import Optional

from google import genai
from google.genai import types

from .parser import ParsedRecipe, ParsedIngredient, ParsedNutrition


# System prompt for recipe parsing
SYSTEM_PROMPT = """You are a recipe parser. Extract structured data from recipe text and output valid JSON.

OUTPUT FORMAT (strict JSON, nothing else):
{
  "name_it": "Nome italiano della ricetta",
  "name_en": "English recipe name",
  "slug": "nome-ricetta-lowercase-with-dashes",
  "description_it": "Breve descrizione in italiano",
  "description_en": "Short description in English",
  "category": "breakfast|main_course|snack",
  "servings": 4,
  "prep_time_min": 15,
  "cook_time_min": 30,
  "difficulty": "easy|medium|hard",
  "kcal_per_100g": 150,
  "protein_per_100g": 8.5,
  "carbs_per_100g": 20.0,
  "fat_per_100g": 5.2,
  "fiber_per_100g": 2.0,
  "kcal_per_serving": 450,
  "serving_weight_g": 300,
  "ingredients": [
    {
      "name_it": "pasta",
      "name_en": "pasta",
      "quantity": 100,
      "unit": "g",
      "notes_it": "preferibilmente integrale",
      "notes_en": "preferably whole wheat"
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "instruction_it": "Cuocere la pasta in acqua salata",
      "instruction_en": "Cook pasta in salted water"
    }
  ],
  "tags": ["halal", "vegetarian", "gluten-free"]
}

RULES:
1. **ALL FIELDS REQUIRED**: Do not return null values. If unknown, use reasonable default or empty list/string.
2. If nutrition is per serving, calculate per 100g.
3. If kcal has decimal (558,7), round to integer: 559.
4. Translate all Italian text to English for _en fields.
5. Slug must be lowercase, spaces as dashes.
6. Category: infer from context (default 'main_course'). Allowed: "breakfast", "main_course", "snack".
7. Difficulty: map to "easy", "medium", "hard".
8. Clean ingredient names (no tabs, no "q.b.", no brand names).
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
        contents=f"Parse this recipe:\n\n{text}",
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
    ingredients = []
    for ing in data.get("ingredients", []):
        ingredients.append(ParsedIngredient(
            name=ing.get("name_it", ""),
            quantity=float(ing.get("quantity", 0)),
            unit=ing.get("unit", "g"),
            grams=float(ing.get("quantity", 0)) if ing.get("unit") == "g" else None,
            original_text=f"{ing.get('name_it')} - {ing.get('notes_it', '')}".strip(" -"),
        ))

    nutrition = ParsedNutrition(
        kcal=data.get("kcal_per_serving", 0),
        protein=data.get("protein_per_100g", 0) * data.get("serving_weight_g", 100) / 100,
        carbs=data.get("carbs_per_100g", 0) * data.get("serving_weight_g", 100) / 100,
        fat=data.get("fat_per_100g", 0) * data.get("serving_weight_g", 100) / 100,
        fiber=data.get("fiber_per_100g"),
        serving_weight_g=data.get("serving_weight_g"),
    )

    return ParsedRecipe(
        name_it=data.get("name_it", ""),
        name_en=data.get("name_en"),
        slug=data.get("slug"),
        source_url=data.get("source_url"),
        category=data.get("category", "main_course"),
        servings=data.get("servings", 4),
        prep_time_min=data.get("prep_time_min", 0),
        cook_time_min=data.get("cook_time_min", 0),
        difficulty=data.get("difficulty", "easy"),
        ingredients=ingredients,
        steps=[s.get("instruction_it", "") for s in data.get("steps", [])],
        nutrition=nutrition,
        tags=data.get("tags", []),
    )
