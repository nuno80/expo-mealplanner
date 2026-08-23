from dotenv import load_dotenv
import os
from pathlib import Path

# Force load from current directory
env_path = Path('.') / ".env"
load_dotenv(env_path)

url = os.getenv("TURSO_DATABASE_URL")
token = os.getenv("TURSO_AUTH_TOKEN")

print(f"Env Path: {env_path.absolute()}")
print(f"File exists: {env_path.exists()}")
print(f"URL: {url}")
if token:
    print(f"TOKEN found (len={len(token)})")
else:
    print("TOKEN NOT FOUND")
