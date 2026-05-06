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

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/profile

GET  /api/bookings?userId=1
GET  /api/bookings/lookup?ref=LEEDS1A&lastName=Smith
POST /api/bookings
PUT  /api/bookings/{id}
POST /api/bookings/{id}/cancel
POST /api/bookings/{id}/checkin

GET  /api/loyalty
POST /api/loyalty/redeem

POST /api/complaints

POST /api/admin/auth/login
GET  /api/admin/bookings
GET  /api/admin/metrics
GET  /api/admin/reports
```

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

Current backend tests cover:

- CSV flight schedule loading
- admin login token generation and validation
- a small set of routing and auth rejection cases

Dedicated security testing notes and follow-up checklist live in [SECURITY_TESTING.md](SECURITY_TESTING.md).

## Data And Database

- Flyway migrations live in `backend/src/main/resources/db/migration/`
- Seed CSV files live in `backend/src/main/resources/data/`
- Startup seeding runs when `seed.runOnStartup=true` or `RUN_CSV_SEED=true`
- Flight schedule data is loaded from `FlightSchedule.csv`

## Admin Access

The admin API uses a lightweight token-based login for now.

- Default username: `admin`
- Default password: `admin12345`
- Override with `ADMIN_USERNAME` and `ADMIN_PASSWORD`

## Backend Notes

- Auth currently uses lightweight bearer tokens and SHA-256 password hashing for this project
- Loyalty and complaints support the existing frontend pages
- Admin metrics and reports are derived from booking data already stored in the database
- The next improvements would be deeper integration tests and stronger production-grade auth
