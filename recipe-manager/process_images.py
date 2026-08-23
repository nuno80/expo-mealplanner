import os
import shutil
import json
from pathlib import Path
from glob import glob
from dotenv import load_dotenv
from recipe_manager.services.cloudinary import CloudinaryClient

# Load env
env_path = Path('.') / ".env"
load_dotenv(env_path)

# Artifacts dir (WSL path)
ARTIFACTS_DIR = "/mnt/c/Users/Nuno/.gemini/antigravity/brain/0dbc3126-accf-414c-ac8f-68d898211bb9"
RECIPES_DIR = Path("recipes_data")

# Map GenerateName -> Slug (filename without .json)
MAPPING = {
    "caesar_salad_light": "caesar-salad-light",
    "fusilli_rucola_yogurt": "fusilli-con-pesto-di-rucola-e-yogurt",
    "insalata_di_riso": "insalata-di-riso",
    "melanzane_parmigiana_light": "melanzane-alla-parmigiana-light",
    "omelette_di_cipolle": "omelette-di-cipolle",
    "pasta_e_fagioli": "pasta-e-fagioli",
    "piadina_salmone_yogurt": "piadina-con-salmone-e-salsa-di-yogurt",
    "platessa_alla_mugnaia": "platessa-alla-mugnaia",
    "ricetta_caprese": "ricetta-caprese",
    "risotto_spinaci_provola": "risotto-con-spinaci-provola",
    "tortilla_spagnola": "tortilla-spagnola"
}

def main():
    client = CloudinaryClient()

    print(f"Scanning artifacts in {ARTIFACTS_DIR}...")
    files = glob(os.path.join(ARTIFACTS_DIR, "*.png"))

    for gen_name, slug in MAPPING.items():
        # Find matching file (starts with gen_name)
        # We look for the most recent one if multiple match
        matches = [f for f in files if Path(f).name.startswith(gen_name + "_")]

        if not matches:
            print(f"⚠️  No image found for {gen_name}")
            continue

        # Pick latest
        image_path = matches[-1] # glob order might not be guaranteed, but usually ok. better sort
        matches.sort()
        image_path = matches[-1]

        print(f"Found image for {slug}: {Path(image_path).name}")

        # Upload
        try:
            print(f"  Uploading to Cloudinary...")
            url = client.upload_image(
                image_path,
                folder="nutriplanit/recipes",
                public_id=slug
            )
            print(f"  ✅ Uploaded: {url}")

            # Update JSON
            json_path = RECIPES_DIR / f"{slug}.json"
            if json_path.exists():
                with open(json_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)

                data["image_url"] = url

                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(data, f, indent=2, ensure_ascii=False)
                print(f"  Updated JSON: {json_path}")
            else:
                print(f"  ❌ JSON file not found: {json_path}")

        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    main()
