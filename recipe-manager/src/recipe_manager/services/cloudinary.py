"""
Cloudinary Image Upload Service.
Uploads recipe images and returns optimized URLs.
"""
import cloudinary
import cloudinary.uploader
from pathlib import Path
from typing import Optional

from ..config.settings import Config


class CloudinaryClient:
    """Client for Cloudinary image uploads."""

    def __init__(self):
        self._configured = False

    def _configure(self):
        """Initialize Cloudinary SDK with credentials."""
        if self._configured:
            return

        if not all([Config.CLOUDINARY_CLOUD, Config.CLOUDINARY_KEY, Config.CLOUDINARY_SECRET]):
            raise EnvironmentError(
                "Missing Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, "
                "CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env"
            )

        cloudinary.config(
            cloud_name=Config.CLOUDINARY_CLOUD,
            api_key=Config.CLOUDINARY_KEY,
            api_secret=Config.CLOUDINARY_SECRET,
            secure=True
        )
        self._configured = True

    def upload_image(
        self,
        file_path: str,
        folder: str = "nutriplanit/recipes",
        public_id: Optional[str] = None,
    ) -> str:
        """
        Upload an image to Cloudinary.

        Args:
            file_path: Local path to image file
            folder: Cloudinary folder path
            public_id: Optional custom public ID (filename)

        Returns:
            Optimized Cloudinary URL
        """
        self._configure()

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {file_path}")

        upload_options = {
            "folder": folder,
            "overwrite": True,
            "resource_type": "image",
            "transformation": [
                {"width": 800, "height": 600, "crop": "fill", "gravity": "auto"},
                {"quality": "auto:good"},
                {"fetch_format": "auto"},
            ]
        }

        if public_id:
            upload_options["public_id"] = public_id

        result = cloudinary.uploader.upload(file_path, **upload_options)
        return result["secure_url"]

    def get_optimized_url(self, public_id: str, width: int = 400, height: int = 300) -> str:
        """
        Generate an optimized URL for an existing image.

        Args:
            public_id: Cloudinary public ID
            width: Desired width
            height: Desired height

        Returns:
            Optimized URL with transformations
        """
        self._configure()

        return cloudinary.CloudinaryImage(public_id).build_url(
            width=width,
            height=height,
            crop="fill",
            gravity="auto",
            quality="auto:good",
            fetch_format="auto",
        )

    def test_connection(self) -> tuple[bool, str]:
        """Test Cloudinary credentials."""
        try:
            self._configure()
            # Ping API by fetching account usage
            result = cloudinary.api.usage()
            return True, f"Connected (plan: {result.get('plan', 'unknown')})"
        except Exception as e:
            return False, str(e)
