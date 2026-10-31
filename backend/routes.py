
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.database import get_db
from backend import crud
from backend.schemas import SightingCreate, SightingResponse

from datetime import datetime, timezone

router = APIRouter(prefix="/api/reports", tags=["User Reports"])



def serialize_sighting(sighting):
    """Convert a database sighting into an API response."""
    return {
        "id": sighting.id,
        "date": sighting.date,
        "location": sighting.location,
        "species": sighting.species,
        "latinName": sighting.latin_name,
        "created_at": sighting.created_at,
    }



@router.post("", status_code=201, response_model=SightingResponse)
def create_report(
    report: SightingCreate,
    db: Session = Depends(get_db)
):
    sighting = crud.create_sighting(db, report)
    db.commit()
    db.refresh(sighting)
    return serialize_sighting(sighting)



@router.get("")
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    location: str | None = None,
    species: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    db: Session = Depends(get_db)
):
    if start_date and start_date.tzinfo is None:
        start_date = start_date.replace(tzinfo=timezone.utc)

    if end_date and end_date.tzinfo is None:
        end_date = end_date.replace(tzinfo=timezone.utc)

    if start_date:
        start_date = start_date.astimezone(timezone.utc)

    if end_date:
        end_date = end_date.astimezone(timezone.utc)

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=422,
            detail="start_date must be before end_date"
        )

    sightings = crud.get_sightings(
        db,
        skip=skip,
        limit=limit,
        location=location,
        species=species,
        start_date=start_date,
        end_date=end_date
    )

  
    return {
        "total": crud.count_sightings(
            db,
            location=location,
            species=species,
            start_date=start_date,
            end_date=end_date
        ),
        "skip": skip,
        "limit": limit,
        "data": [serialize_sighting(s) for s in sightings]
    }




@router.get("/{report_id}", response_model=SightingResponse)
def get_report(
    report_id: str,
    db: Session = Depends(get_db)
):
    sighting = crud.get_sighting(db, report_id)

    if sighting is None:
        raise HTTPException(404, "Report not found")

    return serialize_sighting(sighting)



@router.put("/{report_id}", response_model=SightingResponse)
def update_report(
    report_id: str,
    report: SightingCreate,
    db: Session = Depends(get_db)
):
    sighting = crud.update_sighting(
        db,
        report_id,
        {
            "date": report.date,
            "location": report.location,
            "species": report.species,
            "latin_name": report.latinName,
        }
    )

    if sighting is None:
        raise HTTPException(404, "Report not found")

    db.commit()
    db.refresh(sighting)
    return serialize_sighting(sighting)



@router.delete("/{report_id}", status_code=204)
def delete_report(
    report_id: str,
    db: Session = Depends(get_db)
):
    deleted = crud.delete_sighting(db, report_id)

    if not deleted:
        raise HTTPException(404, "Report not found")

    db.commit()
