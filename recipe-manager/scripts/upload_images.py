#!/usr/bin/env python3
"""
Upload recipe images to Cloudinary and update JSON files.
"""
import os
import json
import glob
import cloudinary
import cloudinary.uploader
from pathlib import Path

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME", "dicgdstzz"),
    api_key=os.getenv("CLOUDINARY_API_KEY", "234577781724952"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET", "iiAUMPOrQpycgXgOp6taREC32go"),
)

# Paths
IMAGES_DIR = Path("/home/nuno/.gemini/antigravity/brain/231c12b6-50e7-442e-899e-e9b5deef07a6")
RECIPES_DIR = Path("/home/nuno/programmazione/expo-mealplanner/recipe-manager/recipes_data")

# Image to recipe mapping
IMAGE_MAPPING = {
    "porridge_avena_mirtilli": "porridge_avena_mirtilli.json",
    "uova_strapazzate_avocado": "uova_strapazzate_avocado.json",
    "pancake_proteici_banana": "pancake_proteici_banana.json",
    "insalata_greca": "insalata_greca.json",
    "wrap_pollo_verdure": "wrap_pollo_verdure.json",
    "buddha_bowl_vegano": "buddha_bowl_vegano.json",
    "zuppa_lenticchie_rosse": "zuppa_lenticchie_rosse.json",
    "insalata_fagioli": "insalata_fagioli.json",
    "salmone_forno_asparagi": "salmone_forno_asparagi.json",
    "petto_pollo_griglia_patate": "petto_pollo_griglia_patate.json",
    "pasta_integrale_pesto": "pasta_integrale_pesto.json",
    "tofu_saltato_verdure": "tofu_saltato_verdure.json",
    "frittata_zucchine": "frittata_zucchine.json",
    "yogurt_greco_noci_miele": "yogurt_greco_noci_miele.json",
    "hummus_bastoncini_verdure": "hummus_bastoncini_verdure.json",
    "banana_burro_mandorle": "banana_burro_mandorle.json",
    "hamburger_manzo": "hamburger_manzo.json",
    "pollo_allo_yogurt": "pollo_allo_yogurt.json",
}


def find_image(base_name: str) -> Path | None:
    """Find image file matching base name (with timestamp suffix)."""
    pattern = f"{base_name}_*.png"
    matches = list(IMAGES_DIR.glob(pattern))
    return matches[0] if matches else None


def upload_to_cloudinary(image_path: Path, public_id: str) -> str:
    """Upload image to Cloudinary and return URL."""
    result = cloudinary.uploader.upload(
        str(image_path),
        public_id=f"nutriplanit/recipes/{public_id}",
        folder="nutriplanit/recipes",
        overwrite=True,
        resource_type="image",
    )
    return result["secure_url"]


def update_recipe_json(recipe_file: Path, image_url: str):
    """Update recipe JSON with image_url."""
    with open(recipe_file, "r", encoding="utf-8") as f:
        recipe = json.load(f)

    recipe["image_url"] = image_url

    with open(recipe_file, "w", encoding="utf-8") as f:
        json.dump(recipe, f, ensure_ascii=False, indent=2)


def main():
    print("Starting Cloudinary upload...")

    successful = 0
    failed = 0

    for base_name, recipe_file in IMAGE_MAPPING.items():
        image_path = find_image(base_name)
        recipe_path = RECIPES_DIR / recipe_file

        if not image_path:
            print(f"❌ Image not found: {base_name}")
            failed += 1
            continue

        if not recipe_path.exists():
            print(f"❌ Recipe not found: {recipe_file}")
            failed += 1
            continue

        try:
            print(f"📤 Uploading {base_name}...", end=" ")
            url = upload_to_cloudinary(image_path, base_name)
            update_recipe_json(recipe_path, url)
            print(f"✅ {url}")
            successful += 1
        except Exception as e:
            print(f"❌ Error: {e}")
            failed += 1

    print(f"\n=== Upload Complete ===")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")


if __name__ == "__main__":
    main()
