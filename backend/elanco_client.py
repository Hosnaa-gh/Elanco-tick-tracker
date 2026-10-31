
"""Client for retrieving tick sightings from the Elanco API."""

import httpx

ELANCO_API_URL = "https://dev-task.elancoapps.com/data/tick-sightings"

REQUEST_TIMEOUT = 20.0


async def fetch_tick_sightings():
    """Fetch and validate tick sightings from the Elanco API."""

    try:
        async with httpx.AsyncClient(
            timeout=REQUEST_TIMEOUT,
            follow_redirects=True
        ) as client:

            response = await client.get(ELANCO_API_URL)
            response.raise_for_status()

            try:
                data = response.json()
            except ValueError as exc:
                raise ValueError(
                    "Invalid JSON response from Elanco API"
                ) from exc

            if not isinstance(data, list):
                raise ValueError(
                    "Unexpected response format from Elanco API"
                )

            return data

    except httpx.TimeoutException:
        raise

    except httpx.HTTPStatusError:
        raise

    except httpx.RequestError:
        raise
