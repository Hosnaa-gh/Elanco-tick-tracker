"""Main FastAPI application for the Elanco Tick Tracker."""

import logging
from datetime import datetime
import httpx
from fastapi import FastAPI, HTTPException

from backend.data_processing import process_sightings
from backend.elanco_client import fetch_tick_sightings
from backend.routes import router as reports_router, insights_router

from backend.combined_sightings import get_combined_sightings
from backend.database import get_db
from fastapi import Depends, Query
from sqlalchemy.orm import Session


logger = logging.getLogger(__name__)

app = FastAPI(
    title="Elanco Tick Tracker API",
    description="Backend API for the UK Tick Sighting Tracker",
    version="1.0.0",
)

app.include_router(reports_router)
app.include_router(insights_router)


@app.get("/")
def home():
    return {
        "message": "Welcome to the Elanco Tick Tracker API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
    }


@app.get("/api/sightings")
async def get_sightings():
    """Retrieve and process tick sightings from Elanco."""

    try:
        raw_sightings = await fetch_tick_sightings()

        cleaned_sightings = process_sightings(raw_sightings)

        return {
            "total": len(cleaned_sightings),
            "data": cleaned_sightings,
        }

    except (httpx.HTTPError, ValueError) as exc:
        logger.error(
            "Failed to retrieve Elanco tick sightings: %s",
            exc,
        )

        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve tick sightings from Elanco API",
        ) from exc


@app.get("/api/sightings/combined")
async def combined_sightings_endpoint(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    location: str | None = None,
    species: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db),
):
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date must be before end_date",
        )

    return await get_combined_sightings(
        db=db,
        skip=skip,
        limit=limit,
        location=location,
        species=species,
        start_date=start_date,
        end_date=end_date,
    )

