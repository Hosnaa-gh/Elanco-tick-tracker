
# Elanco Tick Tracker

## Project Overview

The Elanco Tick Tracker aims to provide an accessible platform for exploring tick sighting data across the United Kingdom.

The application retrieves records from the Elanco API and processes them through a Python backend before making them available for visualisation and analysis.

### Project Status

- [x] FastAPI backend setup
- [x] Elanco API integration
- [x] Data validation and normalisation
- [x] Duplicate record handling
- [x] Backend error handling
- [x] Automated backend tests
- [ ] Frontend implementation
- [ ] Interactive data visualisation
- [ ] Filtering and search interface

## Technology Stack

### Backend
- Python 3.10+
- FastAPI
- HTTPX
- Uvicorn

### Testing
- Pytest
- FastAPI TestClient

### Frontend
Frontend development is in progress.

## Project Structure

```text
Elanco-tick-tracker/
|
|-- backend/
|   |-- main.py
|   |-- elanco_client.py
|   |-- data_processing.py
|
|-- frontend/
|
|-- tests/
|   |-- test_api.py
|   |-- test_data_processing.py
|
|-- docs/
|-- requirements.txt
|-- README.md
|-- .gitignore
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Hosnaa-gh/Elanco-tick-tracker.git
cd Elanco-tick-tracker
```

### 2. Create a Virtual Environment

```bash
python -m venv .venv
```

Activate the environment on Windows:

```powershell
.\.venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Start the Backend

Run the following command from the project root:

```bash
python -m uvicorn backend.main:app --reload
```

The backend will be available at:

http://127.0.0.1:8000

Interactive API documentation:

http://127.0.0.1:8000/docs

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Returns API information and running status |
| GET | `/health` | Returns backend health status |
| GET | `/api/sightings` | Retrieves and processes tick sighting records |

### Example Response

`GET /api/sightings`

```json
{
  "total": 1,
  "data": [
    {
      "id": "example-001",
      "date": "2022-08-01T06:40:31",
      "location": "Manchester",
      "species": "Marsh tick",
      "latinName": "Ixodes apronophorus"
    }
  ]
}
```

This is an illustrative response containing one sighting.

## Data Processing

The backend processes tick sighting records before returning them to the client.

Processing includes:

1. Checking that each record has a valid structure.
2. Validating required fields.
3. Removing records with invalid dates.
4. Normalising date formats.
5. Removing duplicate records using unique IDs.
6. Trimming unnecessary whitespace.

Records that fail essential validation are excluded.

## Error Handling

The backend handles HTTP and data-format errors when retrieving records from the external API.

If the upstream API request fails or returns an unexpected top-level format, the sightings endpoint returns HTTP 502 with an appropriate error message.

## Automated Testing

Automated tests are implemented using Pytest.

Current tests cover:

- Home endpoint
- Health endpoint
- Successful sightings retrieval
- External API failure handling
- Valid sighting processing
- Duplicate sighting removal
- Invalid date handling
- Missing required fields

Run all tests from the project root:

```bash
python -m pytest tests/ -v
```

Latest verified result:

**8 tests passed.**

## Future Development

Planned frontend capabilities include:

- Interactive dashboard
- Tick sighting data visualisation
- Filtering by location and species
- Search functionality
- Responsive user interface

## Author

**Seyedehhosna Ghoreishiamrei**

BSc Computer Science — Brunel University London

GitHub: https://github.com/Hosnaa-gh

## Project Purpose

This project was developed for the Elanco Software Engineering Technical Assessment to demonstrate practical software engineering skills, including API integration, data processing, backend development, automated testing, and full-stack application design.
