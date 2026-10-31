
import pytest
import httpx
from fastapi.testclient import TestClient

from backend.main import app

client = TestClient(app)


def test_home():
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["status"] == "running"


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_sightings_success(monkeypatch):
    async def mock_fetch():
        return [{
            "id": "123",
            "date": "2024-01-15T10:30:00",
            "location": "London",
            "species": "Marsh tick",
            "latinName": "Ixodes"
        }]

    monkeypatch.setattr(
        "backend.main.fetch_tick_sightings",
        mock_fetch
    )

    response = client.get("/api/sightings")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert response.json()["data"][0]["location"] == "London"


def test_sightings_api_failure(monkeypatch):
    async def mock_fetch():
        raise httpx.ConnectError("Connection failed")

    monkeypatch.setattr(
        "backend.main.fetch_tick_sightings",
        mock_fetch
    )

    response = client.get("/api/sightings")

    assert response.status_code == 502
    assert response.json()["detail"] == (
        "Unable to retrieve tick sightings from Elanco API"
    )
