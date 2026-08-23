import httpx
import os
from dotenv import load_dotenv

load_dotenv()

TURSO_URL = os.getenv("TURSO_DATABASE_URL", "").replace("libsql://", "https://") + "/v2/pipeline"
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

# Recipes to fix with their correct nutritional values
FIXES = [
    # Starchy sides
    ("gallette-di-riso", 387, 8.0, 81.0, 2.8),
    ("crostini-di-pane-integrale", 380, 12.0, 65.0, 6.5),
    ("patate-arrosto-al-rosmarino", 95, 2.0, 18.0, 1.5),
    ("fette-di-pane-tostato", 290, 9.0, 52.0, 3.5),
    # Egg recipes
    ("shakshuka-mediterranea", 95, 6.5, 5.8, 5.2),
    ("uova-alla-fiorentina", 115, 9.0, 3.5, 7.5),
    ("frittata-di-patate-e-cipolle", 145, 7.0, 12.0, 8.0),
    ("uova-in-purgatorio", 105, 7.0, 6.0, 6.5),
]

def fix_recipes():
    headers = {
        "Authorization": f"Bearer {TURSO_TOKEN}",
        "Content-Type": "application/json"
    }

    for slug, kcal, protein, carbs, fat in FIXES:
        sql = f"""UPDATE recipes SET
            kcal_per_100g = {kcal},
            protein_per_100g = {protein},
            carbs_per_100g = {carbs},
            fat_per_100g = {fat}
            WHERE slug = '{slug}'"""

        payload = {"requests": [{"type": "execute", "stmt": {"sql": sql}}]}
        response = httpx.post(TURSO_URL, headers=headers, json=payload, timeout=30)

        if response.status_code == 200:
            print(f"✅ Fixed {slug}: {kcal} kcal/100g")
        else:
            print(f"❌ Error fixing {slug}: {response.text[:100]}")

    # Verify
    print("\n--- Verification ---")
    verify_sql = "SELECT slug, kcal_per_100g, carbs_per_100g FROM recipes WHERE slug LIKE '%purgatorio%' OR slug LIKE '%shakshuka%' OR slug LIKE '%gallette%'"
    payload = {"requests": [{"type": "execute", "stmt": {"sql": verify_sql}}]}
    response = httpx.post(TURSO_URL, headers=headers, json=payload, timeout=30)
    print(response.text[:500])

if __name__ == "__main__":
    fix_recipes()
