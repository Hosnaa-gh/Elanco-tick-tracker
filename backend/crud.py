
"""Database CRUD operations for user-submitted tick sightings."""

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from backend.models import Sighting
from backend.schemas import SightingCreate

from datetime import datetime


def create_sighting(
    db: Session,
    sighting: SightingCreate
) -> Sighting:
    """Validate and save a new sighting."""

    db_sighting = Sighting(
        date=sighting.date,
        location=sighting.location,
        species=sighting.species,
        latin_name=sighting.latinName
    )

    try:
        db.add(db_sighting)
        db.commit()
        db.refresh(db_sighting)
        return db_sighting

    except Exception:
        db.rollback()
        raise


def get_sighting(
    db: Session,
    sighting_id: str
) -> Sighting | None:
    """Retrieve a sighting by its unique ID."""

    return db.get(Sighting, sighting_id)




def get_sightings(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    location: str | None = None,
    species: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None
) -> list[Sighting]:
    """Retrieve filtered sightings with pagination."""

    statement = select(Sighting)

    if location:
        statement = statement.where(
            Sighting.location.ilike(f"%{location}%")
        )

    if species:
        statement = statement.where(
            Sighting.species.ilike(f"%{species}%")
        )

    if start_date is not None:
        statement = statement.where(
            Sighting.date >= start_date
        )

    if end_date is not None:
        statement = statement.where(
            Sighting.date <= end_date
        )

    statement = (
        statement
        .order_by(Sighting.date.desc(), Sighting.id)
        .offset(skip)
        .limit(limit)
    )

    return list(db.scalars(statement).all())




def count_sightings(
    db: Session,
    location: str | None = None,
    species: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None
) -> int:
    """Count sightings matching the supplied filters."""

    statement = select(func.count(Sighting.id))

    if location:
        statement = statement.where(
            Sighting.location.ilike(f"%{location}%")
        )

    if species:
        statement = statement.where(
            Sighting.species.ilike(f"%{species}%")
        )

    if start_date is not None:
        statement = statement.where(
            Sighting.date >= start_date
        )

    if end_date is not None:
        statement = statement.where(
            Sighting.date <= end_date
        )

    return db.scalar(statement) or 0



    statement = select(func.count(Sighting.id))

    if location:
        statement = statement.where(
            Sighting.location.ilike(f"%{location}%")
        )

    if species:
        statement = statement.where(
            Sighting.species.ilike(f"%{species}%")
        )

    if start_date is not None:
        statement = statement.where(
            Sighting.date >= start_date
        )

    if end_date is not None:
        statement = statement.where(
            Sighting.date <= end_date
        )

    return db.scalar(statement) or 0

    """Count all user-submitted sightings."""

    statement = select(func.count(Sighting.id))

    return db.scalar(statement) or 0


def update_sighting(
    db: Session,
    sighting_id: str,
    updates: dict
) -> Sighting | None:
    """Update an existing sighting."""

    db_sighting = db.get(Sighting, sighting_id)

    if db_sighting is None:
        return None

    allowed_fields = {
        "date",
        "location",
        "species",
        "latin_name"
    }

    if not set(updates).issubset(allowed_fields):
        raise ValueError("Unsupported sighting update field")

    try:
        for field, value in updates.items():
            setattr(db_sighting, field, value)

        db.commit()
        db.refresh(db_sighting)

        return db_sighting

    except Exception:
        db.rollback()
        raise


def delete_sighting(
    db: Session,
    sighting_id: str
) -> bool:
    """Delete a sighting by ID."""

    db_sighting = db.get(Sighting, sighting_id)

    if db_sighting is None:
        return False

    try:
        db.delete(db_sighting)
        db.commit()
        return True

    except Exception:
        db.rollback()
        raise



def get_sightings_by_region(db: Session) -> list[dict]:
    """Count submitted sightings grouped by location."""
    statement = (
        select(
            Sighting.location,
            func.count(Sighting.id).label("count")
        )
        .group_by(Sighting.location)
        .order_by(func.count(Sighting.id).desc(), Sighting.location)
    )

    return [
        {"region": location, "count": count}
        for location, count in db.execute(statement).all()
    ]


def get_sighting_trends(
    db: Session,
    period: str = "month"
) -> list[dict]:
    """Group sightings by week or month using their sighting dates."""
    sightings = db.scalars(
        select(Sighting).order_by(Sighting.date)
    ).all()

    counts = {}

    for sighting in sightings:
        date = sighting.date

        if period == "week":
            year, week, _ = date.isocalendar()
            key = f"{year}-W{week:02d}"
        elif period == "month":
            key = date.strftime("%Y-%m")
        else:
            raise ValueError("Unsupported period")

        counts[key] = counts.get(key, 0) + 1

    return [
        {"period": key, "count": counts[key]}
        for key in sorted(counts)
    ]
