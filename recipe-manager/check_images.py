import json
import glob
import os

files = glob.glob("recipes_data/*.json")
missing_images = []

for f in files:
    try:
        with open(f, 'r', encoding='utf-8') as file:
            data = json.load(file)
            if "image_url" not in data or not data["image_url"]:
                missing_images.append(os.path.basename(f))
    except Exception as e:
        print(f"Error reading {f}: {e}")

print("Missing images:")
print(json.dumps(missing_images, indent=2))
