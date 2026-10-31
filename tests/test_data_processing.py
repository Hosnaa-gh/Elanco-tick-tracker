
from backend.data_processing import process_sightings


def test_valid_sighting():
    records = [{
        "id": "123",
        "date": "2024-01-15T10:30:00",
        "location": "London",
        "species": "Marsh tick",
        "latinName": "Ixodes"
    }]

    result = process_sightings(records)

    assert len(result) == 1
    assert result[0]["location"] == "London"


def test_duplicate_sightings():
    record = {
        "id": "123",
        "date": "2024-01-15T10:30:00",
        "location": "London",
        "species": "Marsh tick"
    }

    result = process_sightings([record, record])

    assert len(result) == 1


def test_invalid_date():
    records = [{
        "id": "123",
        "date": "invalid-date",
        "location": "London",
        "species": "Marsh tick"
    }]

    result = process_sightings(records)

    assert result == []


def test_missing_required_field():
    records = [{
        "id": "123",
        "date": "2024-01-15T10:30:00",
        "species": "Marsh tick"
    }]

    result = process_sightings(records)

    assert result == []
