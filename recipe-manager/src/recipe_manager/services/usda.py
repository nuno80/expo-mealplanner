"""
USDA FoodData Central API Client.
Docs: https://fdc.nal.usda.gov/api-guide.html
"""
import httpx
from decimal import Decimal
from typing import Optional

from ..config.settings import Config
from ..models import NutrientData, USDAFood


# USDA Nutrient IDs
NUTRIENT_IDS = {
    "energy": 1008,      # kcal
    "protein": 1003,     # g
    "carbs": 1005,       # g (total carbohydrate)
    "fat": 1004,         # g (total lipid)
    "fiber": 1079,       # g (dietary fiber)
}


class USDAClient:
    """Client for USDA FoodData Central API."""

    def __init__(self):
        self.api_key = Config.USDA_KEY
        self.base_url = Config.USDA_BASE_URL

    async def search_food(self, query: str, page_size: int = 10) -> list[USDAFood]:
        """
        Search for foods by name.
        Returns parsed list of USDAFood objects.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/foods/search",
                params={
                    "query": query,
                    "api_key": self.api_key,
                    "pageSize": page_size,
                    "dataType": ["Foundation", "SR Legacy", "Survey (FNDDS)"],
                }
            )
            response.raise_for_status()
            data = response.json()

        foods = []
        for item in data.get("foods", []):
            nutrients = self._parse_nutrients(item.get("foodNutrients", []))
            foods.append(USDAFood(
                fdc_id=str(item["fdcId"]),
                description=item.get("description", "Unknown"),
                brand_owner=item.get("brandOwner"),
                nutrients=nutrients,
            ))
        return foods

    async def get_food_details(self, fdc_id: str) -> Optional[USDAFood]:
        """
        Fetch detailed info for a specific food by FDC ID.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/food/{fdc_id}",
                params={"api_key": self.api_key}
            )
            if response.status_code == 404:
                return None
            response.raise_for_status()
            data = response.json()

        nutrients = self._parse_nutrients(data.get("foodNutrients", []))
        return USDAFood(
            fdc_id=str(data["fdcId"]),
            description=data.get("description", "Unknown"),
            brand_owner=data.get("brandOwner"),
            nutrients=nutrients,
        )

    def _parse_nutrients(self, nutrients_list: list) -> NutrientData:
        """
        Extract key nutrients from USDA response.
        Returns NutrientData with kcal, protein, carbs, fat, fiber.
        """
        result = {
            "kcal": 0,
            "protein": Decimal("0"),
            "carbs": Decimal("0"),
            "fat": Decimal("0"),
            "fiber": None,
        }

        for nutrient in nutrients_list:
            # Handle both search response format and detail format
            nutrient_id = nutrient.get("nutrientId") or nutrient.get("nutrient", {}).get("id")
            amount = nutrient.get("value") or nutrient.get("amount", 0)

            if nutrient_id == NUTRIENT_IDS["energy"]:
                result["kcal"] = int(amount) if amount else 0
            elif nutrient_id == NUTRIENT_IDS["protein"]:
                result["protein"] = Decimal(str(round(amount, 2))) if amount else Decimal("0")
            elif nutrient_id == NUTRIENT_IDS["carbs"]:
                result["carbs"] = Decimal(str(round(amount, 2))) if amount else Decimal("0")
            elif nutrient_id == NUTRIENT_IDS["fat"]:
                result["fat"] = Decimal(str(round(amount, 2))) if amount else Decimal("0")
            elif nutrient_id == NUTRIENT_IDS["fiber"]:
                result["fiber"] = Decimal(str(round(amount, 2))) if amount else None

        return NutrientData(**result)

    async def test_connection(self) -> tuple[bool, str]:
        """Test API connectivity with a simple search."""
        try:
            foods = await self.search_food("apple", page_size=1)
            if foods:
                return True, f"Connected (found: {foods[0].description})"
            return True, "Connected (no results)"
        except Exception as e:
            return False, str(e)
