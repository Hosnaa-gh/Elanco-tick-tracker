
from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.database import Base


class Sighting(Base):
    """A user-submitted tick sighting."""

    __tablename__ = "sightings"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid4())
    )

    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False
    )

    location: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    species: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    latin_name: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    __table_args__ = (
        Index("ix_sightings_location", "location"),
        Index("ix_sightings_date", "date"),
        Index("ix_sightings_species", "species"),
    )
