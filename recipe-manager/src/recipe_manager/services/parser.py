"""
Recipe parser service.
Extracts recipe data from text or HTML content.
"""
import re
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


# ============ Models ============

class ParsedIngredient(BaseModel):
    """Ingredient extracted from recipe text."""
    name: str
    quantity: float = 0
    unit: str = "g"
    grams: Optional[float] = None  # Weight in grams if known
    original_text: str = ""  # Original line for debugging


class ParsedNutrition(BaseModel):
    """Nutritional info per serving."""
    kcal: int = 0
    protein: float = 0
    carbs: float = 0
    fat: float = 0
    fiber: Optional[float] = None
    serving_weight_g: Optional[int] = None


class ParsedRecipe(BaseModel):
    """Complete parsed recipe."""
    name_it: str
    name_en: Optional[str] = None
    source_url: Optional[str] = None
    category: str = "lunch"  # breakfast/lunch/dinner/snack
    servings: int = 4
    prep_time_min: int = 0
    cook_time_min: int = 0
    difficulty: str = "easy"
    ingredients: list[ParsedIngredient] = Field(default_factory=list)
    steps: list[str] = Field(default_factory=list)
    nutrition: ParsedNutrition = Field(default_factory=ParsedNutrition)
    tags: list[str] = Field(default_factory=list)


# ============ Unit Conversions ============

UNIT_TO_GRAMS = {
    # Volume
    "cucchiaio": 15,
    "cucchiai": 15,
    "cucchiaino": 5,
    "cucchiaini": 5,
    "tazza": 240,
    "tazze": 240,
    "ml": 1,  # Approximate for water-based
    "l": 1000,
    "litro": 1000,
    "litri": 1000,
    # Count
    "pz": None,  # Pieces - need specific conversion
    "pezzi": None,
    "pezzo": None,
    "fetta": 30,
    "fette": 30,
    "spicchio": 5,
    "spicchi": 5,
    "pizzico": 0.5,
    # Weight
    "g": 1,
    "gr": 1,
    "grammi": 1,
    "kg": 1000,
    "mg": 0.001,
}


# ============ Parser Functions ============

def parse_ingredient_line(line: str) -> Optional[ParsedIngredient]:
    """
    Parse a single ingredient line.

    Examples:
    - "8 sovracoscia di pollo, disossata 500 g"
    - "2 cucchiaini salsa di sriracha piccante 10 g"
    - "250 mL latte di cocco senza zucchero"
    """
    line = line.strip()
    if not line or len(line) < 3:
        return None

    # Pattern 1: "quantity unit name weight_g"
    # e.g., "8 sovracoscia di pollo, disossata 500 g"
    pattern1 = r"^([\d.,/]+)\s*([a-zA-Z]+)?\s+(.+?)\s+(\d+)\s*(g|gr|ml|kg)$"
    match = re.match(pattern1, line, re.IGNORECASE)
    if match:
        qty_str, unit, name, grams, gram_unit = match.groups()
        qty = _parse_quantity(qty_str)
        grams_val = float(grams)
        if gram_unit and gram_unit.lower() in ("kg",):
            grams_val *= 1000
        return ParsedIngredient(
            name=name.strip(),
            quantity=qty,
            unit=unit or "pz",
            grams=grams_val,
            original_text=line,
        )

    # Pattern 2: "quantity unit name" (no gram weight)
    # e.g., "250 mL latte di cocco"
    pattern2 = r"^([\d.,/]+)\s*(g|gr|ml|mL|l|L|kg|cucchiai?o?|cucchiaini?|tazz[ae]|pz|pezz[oi])?\s+(.+)$"
    match = re.match(pattern2, line, re.IGNORECASE)
    if match:
        qty_str, unit, name = match.groups()
        qty = _parse_quantity(qty_str)
        unit = unit or "pz"

        # Try to estimate grams from unit
        grams = None
        unit_lower = unit.lower()
        if unit_lower in UNIT_TO_GRAMS:
            factor = UNIT_TO_GRAMS[unit_lower]
            if factor is not None:
                grams = qty * factor

        return ParsedIngredient(
            name=name.strip(),
            quantity=qty,
            unit=unit,
            grams=grams,
            original_text=line,
        )

    # Pattern 3: Just name (no quantity)
    # e.g., "sale q.b."
    return ParsedIngredient(
        name=line,
        quantity=0,
        unit="q.b.",
        original_text=line,
    )


def _parse_quantity(qty_str: str) -> float:
    """Parse quantity string to float."""
    qty_str = qty_str.replace(",", ".").strip()

    # Handle fractions like "1/2"
    if "/" in qty_str:
        parts = qty_str.split("/")
        if len(parts) == 2:
            try:
                return float(parts[0]) / float(parts[1])
            except (ValueError, ZeroDivisionError):
                return 0

    # Handle mixed numbers like "1 1/2"
    if " " in qty_str:
        parts = qty_str.split()
        total = 0
        for part in parts:
            total += _parse_quantity(part)
        return total

    try:
        return float(qty_str)
    except ValueError:
        return 0


def parse_nutrition_text(text: str) -> ParsedNutrition:
    """
    Extract nutrition info from text.

    Examples:
    - "610 calorie/porzione"
    - "Calorie 610 | Grassi 21g | Carboidrati 69g | Proteine 37g"
    - "Tabella nutrizionale per porzione (460g)"
    """
    nutrition = ParsedNutrition()

    # Calories - multiple patterns (SOSCuisine + GialloZafferano)
    kcal_patterns = [
        r"Energia\s*[:,]?\s*(\d+(?:[.,]\d+)?)\s*[Kk]cal",  # GialloZafferano: "Energia: 558,7 Kcal"
        r"Calorie\s+(\d+)",  # SOSCuisine: "Calorie  610"
        r"(\d+)\s*calorie[/\s]porzione",  # "610 calorie/porzione"
        r"(\d+)\s*(?:kcal|cal)\b",  # "610 kcal"
    ]
    for pattern in kcal_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            # Handle decimal comma (e.g., "558,7" -> 558)
            kcal_str = match.group(1).replace(",", ".")
            nutrition.kcal = int(float(kcal_str))
            break

    # Protein - SOSCuisine format: "Proteine  37 g"
    protein_patterns = [
        r"Proteine?\s+(\d+(?:[.,]\d+)?)\s*g",  # "Proteine  37 g"
        r"protein[ea]?\s*[:,]?\s*(\d+(?:[.,]\d+)?)\s*g",
    ]
    for pattern in protein_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition.protein = float(match.group(1).replace(",", "."))
            break

    # Carbs - SOSCuisine: "Carboidrati  69 g"
    carbs_patterns = [
        r"Carboidrati\s+(\d+(?:[.,]\d+)?)\s*g",  # "Carboidrati  69 g"
        r"carb[oidrat]*\s*[:,]?\s*(\d+(?:[.,]\d+)?)\s*g",
    ]
    for pattern in carbs_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition.carbs = float(match.group(1).replace(",", "."))
            break

    # Fat - SOSCuisine: "Grassi  21 g"
    fat_patterns = [
        r"Grassi\s+(\d+(?:[.,]\d+)?)\s*g",  # "Grassi  21 g"
        r"grass[io]?\s*[:,]?\s*(\d+(?:[.,]\d+)?)\s*g",
    ]
    for pattern in fat_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition.fat = float(match.group(1).replace(",", "."))
            break

    # Fiber - SOSCuisine + GialloZafferano: "Fibre 7 g" or "Fibre: 2,7 g"
    fiber_patterns = [
        r"Fibre?\s*[:,]?\s*(\d+(?:[.,]\d+)?)\s*g",
        r"fiber\s*[:,]?\s*(\d+(?:[.,]\d+)?)\s*g",
    ]
    for pattern in fiber_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition.fiber = float(match.group(1).replace(",", "."))
            break

    # Serving weight - SOSCuisine: "per porzione (460g)" or "Tabella nutrizionale per porzione (460g)"
    weight_patterns = [
        r"per\s+porzione\s*\((\d+)\s*g\)",  # "per porzione (460g)"
        r"porzione\s*\((\d+)\s*g\)",  # "porzione (460g)"
        r"\((\d+)\s*g\)\s*$",  # "(460g)" at end of line
    ]
    for pattern in weight_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            nutrition.serving_weight_g = int(match.group(1))
            break

    return nutrition


def parse_time_text(text: str) -> tuple[int, int]:
    """
    Extract prep and cook time from text.
    Returns (prep_min, cook_min)

    Examples:
    - "Preparazione : 30 min Cottura : 4 h"
    - "Prep: 10 min | Cook: 20 min"
    """
    prep_min = 0
    cook_min = 0

    # Prep time (SOSCuisine + GialloZafferano)
    prep_patterns = [
        r"Tempo\s+di\s+preparazione\s*:?\s*(\d+)\s*(min|minut|h|ore?)",  # GialloZafferano
        r"Preparazione\s*:?\s*(\d+)\s*(min|h|ore?)",  # SOSCuisine
        r"Prep\s*:?\s*(\d+)\s*(min|h|ore?)",
    ]
    for pattern in prep_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = int(match.group(1))
            unit = match.group(2).lower()
            if unit in ("h", "ore", "ora"):
                value *= 60
            prep_min = value
            break

    # Cook time (SOSCuisine + GialloZafferano)
    cook_patterns = [
        r"Tempo\s+di\s+cottura\s*:?\s*(\d+)\s*(min|minut|h|ore?)",  # GialloZafferano
        r"Cottura\s*:?\s*(\d+)\s*(min|h|ore?)",  # SOSCuisine
        r"Cook\s*:?\s*(\d+)\s*(min|h|ore?)",
    ]
    for pattern in cook_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = int(match.group(1))
            unit = match.group(2).lower()
            if unit in ("h", "ore", "ora"):
                value *= 60
            cook_min = value
            break

    return prep_min, cook_min


def parse_servings(text: str) -> int:
    """Extract servings count."""
    patterns = [
        r"Dosi\s+per\s*:?\s*(\d+)\s*person",  # GialloZafferano: "Dosi per: 4 persone"
        r"(\d+)\s*(?:porzioni?|servings?|person[ae])",
        r"Quantità\s*:?\s*(\d+)",  # SOSCuisine
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return int(match.group(1))
    return 4  # Default


def parse_difficulty(text: str) -> str:
    """Extract difficulty level."""
    text_lower = text.lower()
    if "molto facile" in text_lower or "very easy" in text_lower:
        return "easy"
    if "facile" in text_lower or "easy" in text_lower:
        return "easy"
    if "medio" in text_lower or "medium" in text_lower:
        return "medium"
    if "difficile" in text_lower or "hard" in text_lower:
        return "hard"
    return "easy"


def parse_full_recipe_text(text: str) -> ParsedRecipe:
    """
    Parse a full recipe from pasted text.
    Expects SOSCuisine-style format.
    """
    lines = text.strip().split("\n")

    # Find recipe name (usually first non-empty line after source)
    name_it = ""
    for line in lines[:10]:
        line = line.strip()
        if line and not line.startswith("http") and "SOSCuisine" not in line:
            if len(line) > 5 and not re.match(r"^[\d\s]+$", line):
                name_it = line
                break

    # Find URL
    source_url = None
    for line in lines:
        if "http" in line:
            source_url = line.strip()
            break

    # Parse times
    prep_min, cook_min = parse_time_text(text)

    # Parse servings
    servings = parse_servings(text)

    # Parse difficulty
    difficulty = parse_difficulty(text)

    # Parse nutrition
    nutrition = parse_nutrition_text(text)

    # Parse ingredients
    ingredients = []
    in_ingredients = False
    for line in lines:
        line = line.strip()

        # Detect ingredient section
        if "Ingredienti" in line or "Ingredients" in line:
            in_ingredients = True
            continue

        # End of ingredients
        if in_ingredients and ("Metodo" in line or "Method" in line or "Prima di" in line):
            in_ingredients = False
            continue

        if in_ingredients and line:
            parsed = parse_ingredient_line(line)
            if parsed and parsed.name:
                ingredients.append(parsed)

    # Parse steps
    steps = []
    in_method = False
    for line in lines:
        line = line.strip()

        if "Metodo" in line or "Method" in line:
            in_method = True
            continue

        if in_method and ("Tabella nutrizionale" in line or "Osservazioni" in line):
            in_method = False
            continue

        if in_method and line and len(line) > 20:
            steps.append(line)

    # Parse tags
    tags = []
    tag_keywords = {
        "Vegane": "vegan",
        "Vegetariane": "vegetarian",
        "Glutine": "gluten-free",
        "Lattosio": "lactose-free",
        "Halal": "halal",
        "Kosher": "kosher",
        "Diabetiche": "diabetic-friendly",
    }
    for keyword, tag in tag_keywords.items():
        if keyword in text:
            tags.append(tag)

    return ParsedRecipe(
        name_it=name_it,
        source_url=source_url,
        servings=servings,
        prep_time_min=prep_min,
        cook_time_min=cook_min,
        difficulty=difficulty,
        ingredients=ingredients,
        steps=steps,
        nutrition=nutrition,
        tags=tags,
    )
