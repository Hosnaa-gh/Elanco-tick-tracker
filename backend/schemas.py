
"""Pydantic schemas for tick sighting validation and API responses."""

from datetime import datetime, timezone

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


class SightingBase(BaseModel):
    """Shared validation rules for tick sightings."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        populate_by_name=True,
    )

    location: str = Field(min_length=2, max_length=100)
    species: str = Field(min_length=2, max_length=100)
    latinName: str | None = Field(default=None, max_length=150)

    @field_validator("location", "species")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Field cannot be empty")
        return value


class SightingCreate(SightingBase):
    """Validate a new user-submitted tick sighting."""

    date: datetime

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: datetime) -> datetime:
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)

        value = value.astimezone(timezone.utc)

        if value > datetime.now(timezone.utc):
            raise ValueError("Sighting date cannot be in the future")

        return value


class SightingUpdate(BaseModel):
    """Validate fields provided for a partial update."""

    model_config = ConfigDict(
        str_strip_whitespace=True,
        extra="forbid",
    )

    date: datetime | None = None
    location: str | None = Field(default=None, min_length=2, max_length=100)
    species: str | None = Field(default=None, min_length=2, max_length=100)
    latinName: str | None = Field(default=None, max_length=150)

    @field_validator("date")
    @classmethod
    def validate_date(cls, value: datetime | None):
        if value is None:
            return value

        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)

        value = value.astimezone(timezone.utc)

        if value > datetime.now(timezone.utc):
            raise ValueError("Sighting date cannot be in the future")

        return value

    @model_validator(mode="after")
    def validate_update(self):
        provided = self.model_fields_set

        if not provided:
            raise ValueError("At least one field must be provided")

        for field in ("date", "location", "species"):
            if field in provided and getattr(self, field) is None:
                raise ValueError(f"{field} cannot be null")

        return self


class SightingResponse(BaseModel):
    """Serialize a stored sighting from SQLAlchemy."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    date: datetime
    location: str
    species: str
    latinName: str | None = None
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def map_orm_fields(cls, value):
        if isinstance(value, dict):
            return value

        return {
            "id": value.id,
            "date": value.date,
            "location": value.location,
            "species": value.species,
            "latinName": value.latin_name,
            "created_at": value.created_at,
        }


class SightingListResponse(BaseModel):
    """Paginated response for stored sightings."""

    total: int
    skip: int
    limit: int
    data: list[SightingResponse]
