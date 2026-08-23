import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
import libsql_client

# Load env manually to be sure
env_path = Path('.') / ".env"
load_dotenv(env_path)

url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

async def test_db():
    print(f"Connecting to {url}...")
    try:
        client = libsql_client.create_client(url=url, auth_token=token)

        # Check connection
        await client.execute("SELECT 1")
        print("✅ Connection successful")

        # Check tables
        tables = await client.execute("SELECT name FROM sqlite_schema WHERE type='table'")
        print("Tables found:")
        for row in tables.rows:
            print(f" - {row[0]}")

        # Check recipes count
        res = await client.execute("SELECT count(*) FROM recipes")
        count = res.rows[0][0]
        print(f"\n📊 Total recipes in DB: {count}")

        if count > 0:
            res = await client.execute("SELECT name_it FROM recipes LIMIT 5")
            print("Sample recipes:")
            for row in res.rows:
                print(f" - {row[0]}")

        await client.close()
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_db())
