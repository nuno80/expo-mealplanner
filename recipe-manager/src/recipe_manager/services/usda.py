import httpx
from ..config.settings import Config

class USDAClient:
    def __init__(self):
        self.api_key = Config.USDA_KEY
        self.base_url = Config.USDA_BASE_URL

    async def search_food(self, query: str):
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.base_url}/foods/search",
                params={
                    "query": query,
                    "api_key": self.api_key,
                    "pageSize": 1
                }
            )
            return response

    async def test_connection(self):
        try:
            # Simple search for "apple" to test auth
            response = await self.search_food("apple")
            if response.status_code == 200:
                return True, "Connected successfully (Found 'apple')"
            return False, f"API Error: {response.status_code} - {response.text}"
        except Exception as e:
            return False, str(e)
