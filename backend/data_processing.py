
from datetime import datetime


def process_sightings(records):
    """Validate, normalize and deduplicate tick sighting records."""

    cleaned = []
    seen_ids = set()

    for record in records:
        if not isinstance(record, dict):
            continue

        sighting_id = record.get("id")
        date = record.get("date")
        location = record.get("location")
        species = record.get("species")
        latin_name = record.get("latinName")

        # Skip records missing essential information
        if not all([
            isinstance(value, str) and value.strip()
            for value in [sighting_id, date, location, species]
        ]):
            continue

        sighting_id = sighting_id.strip()

        # Remove duplicate records using their unique IDs
        if sighting_id in seen_ids:
            continue

        # Validate and standardize the date
        try:
            parsed_date = datetime.fromisoformat(
                date.strip().replace("Z", "+00:00")
            )
        except ValueError:
            continue

        cleaned_record = {
            "id": sighting_id,
            "date": parsed_date.isoformat(),
            "location": location.strip(),
            "species": species.strip(),
            "latinName": (
                latin_name.strip()
                if isinstance(latin_name, str)
                else ""
            )
        }

        cleaned.append(cleaned_record)
        seen_ids.add(sighting_id)

    return cleaned
