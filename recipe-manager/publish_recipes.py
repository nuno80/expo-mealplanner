import httpx
import os
from dotenv import load_dotenv

load_dotenv()

TURSO_URL = os.getenv("TURSO_DATABASE_URL", "").replace("libsql://", "https://") + "/v2/pipeline"
TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN", "")

print(f"Using URL: {TURSO_URL}")

def publish_recipes():
    headers = {
        "Authorization": f"Bearer {TURSO_TOKEN}",
        "Content-Type": "application/json"
    }

    # Publish all unpublished recipes
    payload = {
        "requests": [
            {"type": "execute", "stmt": {"sql": "UPDATE recipes SET is_published = 1 WHERE is_published = 0"}}
        ]
    }

    response = httpx.post(TURSO_URL, headers=headers, json=payload, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text[:500]}")

    if response.status_code == 200:
        # Verify count
        payload2 = {
            "requests": [
                {"type": "execute", "stmt": {"sql": "SELECT COUNT(*) as total FROM recipes WHERE is_published = 1"}}
            ]
        }
        response2 = httpx.post(TURSO_URL, headers=headers, json=payload2, timeout=30)
        print(f"\nVerification: {response2.text}")

if __name__ == "__main__":
    publish_recipes()
