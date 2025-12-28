import libsql_client
from ..config.settings import Config

class TursoClient:
    def __init__(self):
        self.url = Config.TURSO_URL
        self.token = Config.TURSO_TOKEN
        self._client = None

    async def connect(self):
        if not self._client:
            self._client = libsql_client.create_client(
                url=self.url,
                auth_token=self.token
            )
        return self._client

    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None

    async def test_connection(self):
        client = await self.connect()
        try:
            rs = await client.execute("SELECT 1")
            return True, "Connected successfully"
        except Exception as e:
            return False, str(e)
        finally:
            await self.close()
