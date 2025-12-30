"""
Web scraper service for recipe websites.
Extracts recipe data from supported sites.
"""
import httpx
import re
from typing import Optional
from bs4 import BeautifulSoup

from .parser import (
    ParsedRecipe,
    ParsedIngredient,
    ParsedNutrition,
    parse_ingredient_line,
    parse_nutrition_text,
    parse_time_text,
    parse_servings,
    parse_difficulty,
)


async def scrape_url(url: str) -> Optional[ParsedRecipe]:
    """
    Scrape a recipe from a supported URL.
    Auto-detects the site and uses appropriate parser.
    """
    if "soscuisine.com" in url:
        return await scrape_soscuisine(url)
    elif "giallozafferano" in url:
        return await scrape_giallozafferano(url)
    else:
        # Try generic scraping
        return await scrape_generic(url)


async def fetch_html(url: str) -> str:
    """Fetch HTML content from URL."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    }
    async with httpx.AsyncClient(follow_redirects=True) as client:
        response = await client.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        return response.text


async def scrape_soscuisine(url: str) -> ParsedRecipe:
    """
    Scrape recipe from SOSCuisine.

    Site structure (2024):
    - Title in h1
    - Ingredients in .recipe-ingredients or similar
    - Nutrition in .nutrition-facts
    """
    html = await fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # Title
    title_elem = soup.find("h1")
    name_it = title_elem.get_text(strip=True) if title_elem else "Unknown Recipe"

    # Meta info
    page_text = soup.get_text()
    prep_min, cook_min = parse_time_text(page_text)
    servings = parse_servings(page_text)
    difficulty = parse_difficulty(page_text)

    # Ingredients
    ingredients = []

    # Try multiple selectors for ingredients
    ingredient_selectors = [
        ".recipe-ingredients li",
        ".ingredients li",
        "[class*='ingredient'] li",
        "ul.ingredients li",
    ]

    for selector in ingredient_selectors:
        items = soup.select(selector)
        if items:
            for item in items:
                text = item.get_text(strip=True)
                parsed = parse_ingredient_line(text)
                if parsed:
                    ingredients.append(parsed)
            break

    # If no structured ingredients found, try parsing from text
    if not ingredients:
        # Look for text between "Ingredienti" and "Metodo"
        text = soup.get_text()
        if "Ingredienti" in text:
            start = text.find("Ingredienti")
            end = text.find("Metodo", start) or text.find("Prima di", start) or len(text)
            ingredient_section = text[start:end]
            for line in ingredient_section.split("\n"):
                line = line.strip()
                if line and len(line) > 3:
                    parsed = parse_ingredient_line(line)
                    if parsed and parsed.name and "Ingredienti" not in parsed.name:
                        ingredients.append(parsed)

    # Nutrition
    nutrition = parse_nutrition_text(page_text)

    # Steps
    steps = []
    step_selectors = [
        ".recipe-method li",
        ".method li",
        ".instructions li",
        "[class*='step']",
    ]

    for selector in step_selectors:
        items = soup.select(selector)
        if items:
            for item in items:
                text = item.get_text(strip=True)
                if text and len(text) > 20:
                    steps.append(text)
            break

    # If no structured steps, parse from text
    if not steps:
        text = soup.get_text()
        if "Metodo" in text:
            start = text.find("Metodo")
            end = text.find("Tabella nutrizionale", start) or text.find("Osservazioni", start) or len(text)
            method_section = text[start:end]
            for line in method_section.split("\n"):
                line = line.strip()
                if line and len(line) > 30 and "Metodo" not in line:
                    steps.append(line)

    # Tags
    tags = []
    tag_keywords = {
        "Vegane": "vegan",
        "Vegetariane": "vegetarian",
        "Glutine": "gluten-free",
        "Lattosio": "lactose-free",
        "Halal": "halal",
        "Kosher": "kosher",
    }
    for keyword, tag in tag_keywords.items():
        if keyword in page_text:
            tags.append(tag)

    return ParsedRecipe(
        name_it=name_it,
        source_url=url,
        servings=servings,
        prep_time_min=prep_min,
        cook_time_min=cook_min,
        difficulty=difficulty,
        ingredients=ingredients,
        steps=steps,
        nutrition=nutrition,
        tags=tags,
    )


async def scrape_giallozafferano(url: str) -> ParsedRecipe:
    """Scrape recipe from GialloZafferano."""
    html = await fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # Title
    title_elem = soup.find("h1")
    name_it = title_elem.get_text(strip=True) if title_elem else "Unknown Recipe"

    page_text = soup.get_text()
    prep_min, cook_min = parse_time_text(page_text)
    servings = parse_servings(page_text)
    difficulty = parse_difficulty(page_text)

    # Ingredients
    ingredients = []
    for item in soup.select(".gz-ingredient"):
        text = item.get_text(strip=True)
        parsed = parse_ingredient_line(text)
        if parsed:
            ingredients.append(parsed)

    # Nutrition
    nutrition = parse_nutrition_text(page_text)

    # Steps
    steps = []
    for step in soup.select(".gz-content-recipe-step"):
        text = step.get_text(strip=True)
        if text:
            steps.append(text)

    return ParsedRecipe(
        name_it=name_it,
        source_url=url,
        servings=servings,
        prep_time_min=prep_min,
        cook_time_min=cook_min,
        difficulty=difficulty,
        ingredients=ingredients,
        steps=steps,
        nutrition=nutrition,
    )


async def scrape_generic(url: str) -> ParsedRecipe:
    """
    Generic scraping using JSON-LD schema.org Recipe format.
    Many modern recipe sites use this standard.
    """
    import json

    html = await fetch_html(url)
    soup = BeautifulSoup(html, "html.parser")

    # Look for JSON-LD Recipe schema
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string)

            # Handle array of schemas
            if isinstance(data, list):
                for item in data:
                    if item.get("@type") == "Recipe":
                        data = item
                        break

            if data.get("@type") == "Recipe":
                return _parse_jsonld_recipe(data, url)
        except (json.JSONDecodeError, KeyError):
            continue

    # Fallback: basic HTML parsing
    title = soup.find("h1")
    return ParsedRecipe(
        name_it=title.get_text(strip=True) if title else "Unknown Recipe",
        source_url=url,
    )


def _parse_jsonld_recipe(data: dict, url: str) -> ParsedRecipe:
    """Parse a schema.org Recipe JSON-LD object."""

    # Parse times (ISO 8601 duration)
    def parse_duration(duration: str) -> int:
        """Convert PT30M or PT1H30M to minutes."""
        if not duration:
            return 0
        match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?", duration)
        if match:
            hours = int(match.group(1) or 0)
            minutes = int(match.group(2) or 0)
            return hours * 60 + minutes
        return 0

    prep_min = parse_duration(data.get("prepTime", ""))
    cook_min = parse_duration(data.get("cookTime", ""))

    # Servings
    servings = 4
    yield_val = data.get("recipeYield")
    if yield_val:
        if isinstance(yield_val, list):
            yield_val = yield_val[0]
        match = re.search(r"(\d+)", str(yield_val))
        if match:
            servings = int(match.group(1))

    # Ingredients
    ingredients = []
    for ing in data.get("recipeIngredient", []):
        parsed = parse_ingredient_line(ing)
        if parsed:
            ingredients.append(parsed)

    # Steps
    steps = []
    instructions = data.get("recipeInstructions", [])
    if isinstance(instructions, str):
        steps = [instructions]
    elif isinstance(instructions, list):
        for step in instructions:
            if isinstance(step, str):
                steps.append(step)
            elif isinstance(step, dict):
                steps.append(step.get("text", ""))

    # Nutrition
    nutrition = ParsedNutrition()
    nut_data = data.get("nutrition", {})
    if nut_data:
        def extract_number(val):
            if not val:
                return 0
            match = re.search(r"([\d.]+)", str(val))
            return float(match.group(1)) if match else 0

        nutrition.kcal = int(extract_number(nut_data.get("calories")))
        nutrition.protein = extract_number(nut_data.get("proteinContent"))
        nutrition.carbs = extract_number(nut_data.get("carbohydrateContent"))
        nutrition.fat = extract_number(nut_data.get("fatContent"))
        nutrition.fiber = extract_number(nut_data.get("fiberContent")) or None

    return ParsedRecipe(
        name_it=data.get("name", "Unknown Recipe"),
        source_url=url,
        servings=servings,
        prep_time_min=prep_min,
        cook_time_min=cook_min,
        difficulty="easy",
        ingredients=ingredients,
        steps=steps,
        nutrition=nutrition,
    )
