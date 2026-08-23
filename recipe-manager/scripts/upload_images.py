#!/usr/bin/env python3
"""
Upload generated recipe images to Cloudinary and update JSON files.
"""
import json
import re
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.recipe_manager.services.cloudinary import CloudinaryClient


def extract_slug_from_filename(filename: str) -> str:
    """Extract recipe slug from generated image filename."""
    # Remove timestamp suffix and extension: "asparagi_limone_1767641035775.png" -> "asparagi-limone"
    name = Path(filename).stem
    # Remove timestamp (last underscore + digits)
    name = re.sub(r'_\d+$', '', name)
    # Convert underscores to hyphens
    return name.replace('_', '-')


def main():
    client = CloudinaryClient()
    images_dir = Path("images")
    recipes_dir = Path("recipes_data")

    # Track results
    uploaded = []
    updated = []
    errors = []

    # Get all PNG images
    image_files = list(images_dir.glob("*.png"))
    print(f"Found {len(image_files)} images to upload\n")

    for img_path in sorted(image_files):
        slug = extract_slug_from_filename(img_path.name)
        json_path = recipes_dir / f"{slug}.json"

        # Check if recipe JSON exists
        if not json_path.exists():
            print(f"⚠ No JSON found for {slug}, skipping...")
            continue

        try:
            # Upload to Cloudinary
            print(f"📤 Uploading {slug}...", end=" ")
            url = client.upload_image(str(img_path), folder="nutriplanit/recipes", public_id=slug)
            uploaded.append(slug)
            print(f"✓")

            # Update JSON file
            with open(json_path, 'r', encoding='utf-8') as f:
                recipe = json.load(f)

            recipe['image_url'] = url

            with open(json_path, 'w', encoding='utf-8') as f:
                json.dump(recipe, f, ensure_ascii=False, indent=2)

            updated.append(slug)
            print(f"   └─ Updated {json_path.name} with image_url")

        except Exception as e:
            errors.append((slug, str(e)))
            print(f"✗ Error: {e}")

    # Summary
    print(f"\n{'='*50}")
    print(f"✅ Uploaded: {len(uploaded)}")
    print(f"📝 Updated:  {len(updated)}")
    if errors:
        print(f"❌ Errors:   {len(errors)}")
        for slug, err in errors:
            print(f"   - {slug}: {err}")


if __name__ == "__main__":
    main()
