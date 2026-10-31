
import httpx

ELANCO_API_URL = "https://dev-task.elancoapps.com/data/tick-sightings"


async def fetch_tick_sightings():
    """Fetch tick sighting records from the Elanco API."""

    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.get(ELANCO_API_URL)
        response.raise_for_status()

        data = response.json()

        if not isinstance(data, list):
            raise ValueError("Unexpected response format from Elanco API")

        return data
