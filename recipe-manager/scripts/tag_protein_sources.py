#!/usr/bin/env python3
"""
Script to tag recipes with protein_source based on recipe name/ingredients.
Mediterranean Diet categories:
- legumes: ceci, fagioli, lenticchie, hummus
- fish: salmone, tonno, aringa, gamberi, pesce
- white_meat: pollo, tacchino
- eggs: uova, frittata
- dairy: yogurt, formaggio, mozzarella
- red_meat: manzo, maiale
- plant_based: tofu, seitan, tempeh
- mixed: multiple sources
- none: no significant protein (some snacks)
"""

import json
from pathlib import Path

RECIPES_DIR = Path(__file__).parent.parent / "recipes_data"

# Protein source rules based on recipe name/main ingredient
PROTEIN_RULES = {
    # Fish
    "salmone": "fish",
    "tonno": "fish",
    "aringa": "fish",
    "gamberi": "fish",
    "nizzarda": "fish",  # Insalata nizzarda has tuna/anchovies

    # Legumes
    "ceci": "legumes",
    "fagioli": "legumes",
    "lenticchie": "legumes",
    "hummus": "legumes",
    "flageolet": "legumes",

    # White meat
    "pollo": "white_meat",
    "wrap": "white_meat",  # wrap_pollo_verdure
    "spiedini": "white_meat",  # spiedini_di_pollo

    # Eggs
    "uova": "eggs",
    "frittata": "eggs",
    "pancake": "eggs",  # pancake_proteici has eggs

    # Dairy
    "yogurt": "dairy",
    "greca": "dairy",  # insalata_greca has feta

    # Plant-based
    "tofu": "plant_based",

    # Special cases - mixed/none
    "porridge": "dairy",  # milk-based
    "banana_burro": "none",  # snack, no significant protein
    "waldorf": "dairy",  # has yogurt/mayo
    "invernale": "mixed",  # depends on ingredients
    "fagiolini": "legumes",  # green beans are legumes
    "farro": "legumes",  # farro e broccoli - plant-based
    "broccoli": "none",  # side dish
    "spaghetti_di_riso": "white_meat",  # usually with meat
    "petto": "white_meat",
    "pesto": "none",  # pasta al pesto - mostly carbs
    "patate": "mixed",  # insalata di patate e tonno -> fish
}

def detect_protein_source(recipe_name: str) -> str:
    """Detect protein source from recipe name."""
    name_lower = recipe_name.lower()

    # Special case: patate e tonno
    if "patate" in name_lower and "tonno" in name_lower:
        return "fish"

    # Check each rule
    for keyword, source in PROTEIN_RULES.items():
        if keyword in name_lower:
            return source

    return "mixed"  # Default

def main():
    json_files = list(RECIPES_DIR.glob("*.json"))
    print(f"Found {len(json_files)} recipe files\n")

    for file_path in sorted(json_files):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            recipe_name = data.get("name_it", file_path.stem)
            old_source = data.get("protein_source")
            new_source = detect_protein_source(recipe_name)

            # Only update if different or missing
            if old_source != new_source:
                data["protein_source"] = new_source

                with open(file_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)

                status = "UPDATED" if old_source else "ADDED"
                print(f"{status}: {recipe_name[:40]:<40} -> {new_source}")
            else:
                print(f"OK:      {recipe_name[:40]:<40} = {new_source}")

        except Exception as e:
            print(f"ERROR:   {file_path.name}: {e}")

    print("\nDone! Run 'uv run python -m recipe_manager sync -f' to push to Turso.")

if __name__ == "__main__":
    main()
