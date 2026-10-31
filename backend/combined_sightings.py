
"""Combine external Elanco sightings with locally submitted reports."""

import asyncio
import logging
import time
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from backend import crud
from backend.data_processing import process_sightings
from backend.elanco_client import fetch_tick_sightings

logger = logging.getLogger(__name__)

CACHE_TTL_SECONDS = 300

_cache: list[dict] = []
_cache_expires_at = 0.0
_cache_lock = asyncio.Lock()


async def get_external_sightings() -> list[dict]:
    """Fetch external data with a five-minute in-memory cache."""
    global _cache, _cache_expires_at

    now = time.monotonic()

    if now < _cache_expires_at:
        return list(_cache)

    async with _cache_lock:
        now = time.monotonic()

        if now < _cache_expires_at:
            return list(_cache)

        try:
            raw = await fetch_tick_sightings()
            cleaned = process_sightings(raw)

            _cache = cleaned
            _cache_expires_at = (
                time.monotonic() + CACHE_TTL_SECONDS
            )

            return list(_cache)

        except (httpx.HTTPError, ValueError) as exc:
            logger.warning(
                "External Elanco API unavailable: %s",
                exc,
            )

            # Use previously cached data if available.
            return list(_cache)


def normalize_local_sighting(sighting) -> dict:
    """Convert a database record into the shared response format."""
    return {
        "id": sighting.id,
        "date": sighting.date.isoformat(),
        "location": sighting.location,
        "species": sighting.species,
        "latinName": sighting.latin_name or "",
        "source": "user",
    }


async def get_combined_sightings(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    location: str | None = None,
    species: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
) -> dict:
    """Combine, filter and paginate sightings from both sources."""

    external = await get_external_sightings()

    # Read all local records in batches.
    local = []
    offset = 0
    batch_size = 100

    while True:
        batch = crud.get_sightings(
            db,
            skip=offset,
            limit=batch_size,
        )

        if not batch:
            break

        local.extend(
            normalize_local_sighting(item)
            for item in batch
        )

        offset += len(batch)

        if len(batch) < batch_size:
            break

    # Prefix IDs to avoid collisions across data sources.
    combined = [
        {**item, "id": f"elanco:{item['id']}", "source": "elanco"}
        for item in external
    ]

    combined.extend(
        {**item, "id": f"user:{item['id']}"}
        for item in local
    )

    # Deduplicate by source and original ID.
    unique = {
        item["id"]: item
        for item in combined
    }

    records = list(unique.values())

    if location:
        records = [
            item for item in records
            if location.casefold() in item["location"].casefold()
        ]

    if species:
        records = [
            item for item in records
            if species.casefold() in item["species"].casefold()
        ]

    def parse_date(item: dict) -> datetime:
        parsed = datetime.fromisoformat(
            item["date"].replace("Z", "+00:00")
        )

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)

        return parsed.astimezone(timezone.utc)

    if start_date:
        if start_date.tzinfo is None:
            start_date = start_date.replace(tzinfo=timezone.utc)

        start_date = start_date.astimezone(timezone.utc)
        records = [
            item for item in records
            if parse_date(item) >= start_date
        ]

    if end_date:
        if end_date.tzinfo is None:
            end_date = end_date.replace(tzinfo=timezone.utc)

        end_date = end_date.astimezone(timezone.utc)
        records = [
            item for item in records
            if parse_date(item) <= end_date
        ]

    records.sort(
        key=lambda item: (parse_date(item), item["id"]),
        reverse=True,
    )

    return {
        "total": len(records),
        "skip": skip,
        "limit": limit,
        "data": records[skip:skip + limit],
    }
