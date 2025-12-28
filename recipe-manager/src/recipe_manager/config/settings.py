from pathlib import Path
from dotenv import load_dotenv
import os

# Load .env
env_path = Path(__file__).parents[3] / ".env"
load_dotenv(env_path)

class Config:
    # Turso
    TURSO_URL = os.getenv("TURSO_DATABASE_URL")
    TURSO_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

    # USDA
    USDA_KEY = os.getenv("USDA_API_KEY")
    USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"

    # Cloudinary
    CLOUDINARY_CLOUD = os.getenv("CLOUDINARY_CLOUD_NAME")
    CLOUDINARY_KEY = os.getenv("CLOUDINARY_API_KEY")
    CLOUDINARY_SECRET = os.getenv("CLOUDINARY_API_SECRET")

    @classmethod
    def validate(cls):
        missing = []
        if not cls.TURSO_URL: missing.append("TURSO_DATABASE_URL")
        if not cls.USDA_KEY: missing.append("USDA_API_KEY")

        if missing:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing)}")
