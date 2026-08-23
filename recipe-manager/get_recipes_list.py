import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
import libsql_client
import json

# Load env manually
env_path = Path('.') / ".env"
load_dotenv(env_path)

url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

async def list_recipes():
    try:
        client = libsql_client.create_client(url=url, auth_token=token)
        res = await client.execute("SELECT name_it, slug FROM recipes")

        recipes = [{"name": row[0], "slug": row[1]} for row in res.rows]
        print(json.dumps(recipes))

        await client.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(list_recipes())
