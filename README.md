# LeedsAir Flight Booking System

LeedsAir is a full-stack flight booking project with a React + Vite frontend and a Kotlin + Ktor backend.

## Project Structure

```text
.
|-- Frontend/              # React + Vite UI
|   |-- src/
|   |   |-- components/
|   |   |-- context/
|   |   |-- hooks/
|   |   |-- pages/
|   |   `-- services/
|   `-- package.json
|-- backend/               # Ktor API + Flyway + PostgreSQL
|   |-- src/main/kotlin/flightbooking/
|   |   |-- Application.kt
|   |   |-- Routing.kt
|   |   |-- db/
|   |   `-- service/
|   |-- src/main/resources/
|   |   |-- application.yaml
|   |   |-- data/
|   |   `-- db/migration/
|   `-- build.gradle.kts
`-- README.md
```

## Current Backend Endpoints

The backend currently exposes these routes:

```text
GET  /api/home
GET  /api/flights?from=LBA&to=DUB&departureDate=2026-04-15
GET  /api/bookings?userId=1
GET  /api/bookings/lookup?ref=LEEDS1A&lastName=Smith
POST /api/bookings
```

The frontend already references additional routes for auth, admin, loyalty, complaints, check-in, cancellation, and booking updates. Those are still to be implemented.

## Running The App

### Frontend

```bash
cd Frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
./gradlew build
./gradlew bootRun
```

The Ktor API runs on `http://localhost:8080`.

## Backend Tests

```bash
cd backend
./gradlew test
```

## Data And Database

- Flyway migrations live in `backend/src/main/resources/db/migration/`
- Seed CSV files live in `backend/src/main/resources/data/`
- Startup seeding runs when `seed.runOnStartup=true` or `RUN_CSV_SEED=true`
- Flight schedule data is loaded from `FlightSchedule.csv`

## Current Backend Priorities

1. Complete booking lifecycle routes for modify, cancel, and check-in
2. Add auth endpoints for register, login, and profile
3. Add complaints, loyalty, and admin APIs
4. Expand automated backend tests around the main flows
