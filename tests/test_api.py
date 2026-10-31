
import pytest
import httpx
from fastapi.testclient import TestClient

from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.database import Base, get_db
from backend.models import Sighting

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


@pytest.fixture
def report_client():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    Base.metadata.create_all(bind=engine)

    TestingSession = sessionmaker(
        bind=engine,
        autoflush=False,
        expire_on_commit=False,
    )

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.pop(get_db, None)
        engine.dispose()


@pytest.fixture
def sample_report():
    return {
        "date": "2026-10-20T14:30:00Z",
        "location": "London",
        "species": "Marsh tick",
        "latinName": "Ixodes ricinus",
    }


def test_create_report(report_client, sample_report):
    response = report_client.post(
        "/api/reports",
        json=sample_report,
    )

    assert response.status_code == 201

    data = response.json()

    assert data["location"] == "London"
    assert data["species"] == "Marsh tick"
    assert "id" in data
    assert "created_at" in data


def test_list_reports(report_client, sample_report):
    report_client.post(
        "/api/reports",
        json=sample_report,
    )

    response = report_client.get("/api/reports")

    assert response.status_code == 200
    assert response.json()["total"] == 1
    assert len(response.json()["data"]) == 1


def test_get_report(report_client, sample_report):
    created = report_client.post(
        "/api/reports",
        json=sample_report,
    ).json()

    response = report_client.get(
        f"/api/reports/{created['id']}"
    )

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_report(report_client, sample_report):
    created = report_client.post(
        "/api/reports",
        json=sample_report,
    ).json()

    updated_report = {
        **sample_report,
        "location": "Manchester",
    }

    response = report_client.put(
        f"/api/reports/{created['id']}",
        json=updated_report,
    )

    assert response.status_code == 200
    assert response.json()["location"] == "Manchester"
    assert response.json()["id"] == created["id"]
    assert response.json()["created_at"] == created["created_at"]


def test_delete_report(report_client, sample_report):
    created = report_client.post(
        "/api/reports",
        json=sample_report,
    ).json()

    response = report_client.delete(
        f"/api/reports/{created['id']}"
    )

    assert response.status_code == 204

    get_response = report_client.get(
        f"/api/reports/{created['id']}"
    )

    assert get_response.status_code == 404


def test_get_nonexistent_report(report_client):
    response = report_client.get(
        "/api/reports/nonexistent-id"
    )

    assert response.status_code == 404


def test_invalid_report_date(report_client, sample_report):
    invalid_report = {
        **sample_report,
        "date": "2099-01-01T10:00:00Z",
    }

    response = report_client.post(
        "/api/reports",
        json=invalid_report,
    )

    assert response.status_code == 422


def test_missing_report_location(report_client, sample_report):
    invalid_report = sample_report.copy()
    del invalid_report["location"]

    response = report_client.post(
        "/api/reports",
        json=invalid_report,
    )

    assert response.status_code == 422


def test_filter_reports_by_location(report_client, sample_report):
    report_client.post("/api/reports", json=sample_report)
    report_client.post(
        "/api/reports",
        json={**sample_report, "location": "Manchester"},
    )

    response = report_client.get(
        "/api/reports",
        params={"location": "manchester"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["location"] == "Manchester"


def test_filter_reports_by_species(report_client, sample_report):
    report_client.post("/api/reports", json=sample_report)
    report_client.post(
        "/api/reports",
        json={**sample_report, "species": "Wood tick"},
    )

    response = report_client.get(
        "/api/reports",
        params={"species": "wood"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["species"] == "Wood tick"


def test_filter_reports_by_date(report_client, sample_report):
    report_client.post("/api/reports", json=sample_report)
    report_client.post(
        "/api/reports",
        json={**sample_report, "date": "2026-09-10T10:00:00Z"},
    )

    response = report_client.get(
        "/api/reports",
        params={
            "start_date": "2026-10-01T00:00:00Z",
            "end_date": "2026-10-31T23:59:59Z",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert len(data) == 1
    assert data[0]["location"] == "London"


def test_combined_report_filters(report_client, sample_report):
    report_client.post("/api/reports", json=sample_report)
    report_client.post(
        "/api/reports",
        json={**sample_report, "location": "Manchester"},
    )

    response = report_client.get(
        "/api/reports",
        params={
            "location": "London",
            "species": "Marsh",
            "start_date": "2026-10-01T00:00:00Z",
        },
    )

    assert response.status_code == 200
    assert len(response.json()["data"]) == 1
    assert response.json()["data"][0]["location"] == "London"


def test_invalid_date_range(report_client):
    response = report_client.get(
        "/api/reports",
        params={
            "start_date": "2026-10-31T00:00:00Z",
            "end_date": "2026-10-01T00:00:00Z",
        },
    )

    assert response.status_code == 422


def test_invalid_date_format(report_client):
    response = report_client.get(
        "/api/reports",
        params={"start_date": "invalid-date"},
    )

    assert response.status_code == 422


def test_filtered_pagination(report_client, sample_report):
    for location in ["London", "London", "London", "Manchester"]:
        response = report_client.post(
            "/api/reports",
            json={**sample_report, "location": location},
        )
        assert response.status_code == 201

    response = report_client.get(
        "/api/reports",
        params={
            "location": "London",
            "skip": 1,
            "limit": 1,
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["skip"] == 1
    assert result["limit"] == 1
    assert len(result["data"]) == 1
    assert result["data"][0]["location"] == "London"
    assert result["total"] == 3



def test_insights_by_region(report_client, sample_report):
    for location in ["London", "London", "Manchester"]:
        response = report_client.post(
            "/api/reports",
            json={**sample_report, "location": location}
        )
        assert response.status_code == 201

    response = report_client.get("/api/insights/by-region")

    assert response.status_code == 200

    data = response.json()["data"]
    counts = {item["region"]: item["count"] for item in data}

    assert counts == {"London": 2, "Manchester": 1}


@pytest.mark.parametrize("period,expected", [
    ("month", "2026-10"),
    ("week", "2026-W43"),
])
def test_insights_trends(report_client, sample_report, period, expected):
    response = report_client.post(
        "/api/reports",
        json=sample_report
    )
    assert response.status_code == 201

    response = report_client.get(
        "/api/insights/trends",
        params={"period": period}
    )

    assert response.status_code == 200
    assert response.json()["period"] == period
    assert response.json()["data"] == [
        {"period": expected, "count": 1}
    ]


def test_insights_invalid_period(report_client):
    response = report_client.get(
        "/api/insights/trends",
        params={"period": "year"}
    )

    assert response.status_code == 422


def test_insights_empty_database(report_client):
    region_response = report_client.get("/api/insights/by-region")
    trends_response = report_client.get("/api/insights/trends")

    assert region_response.status_code == 200
    assert region_response.json()["data"] == []

    assert trends_response.status_code == 200
    assert trends_response.json()["data"] == []
