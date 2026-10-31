from backend.data_processing import process_sightings
import httpx
from fastapi import HTTPException
from backend.elanco_client import fetch_tick_sightings
from fastapi import FastAPI


app = FastAPI(
    title="Elanco Tick Tracker API",
    description="Backend API for the UK Tick Sighting Tracker",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to the Elanco Tick Tracker API",
        "status": "running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }





@app.get("/api/sightings")
async def get_sightings():
    try:
        raw_sightings = await fetch_tick_sightings()

        cleaned_sightings = process_sightings(raw_sightings)

        return {
            "total": len(cleaned_sightings),
            "data": cleaned_sightings
        }

    except (httpx.HTTPError, ValueError):
        raise HTTPException(
            status_code=502,
            detail="Unable to retrieve tick sightings from Elanco API"
        )



