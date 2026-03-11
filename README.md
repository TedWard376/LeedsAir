# LeedsAir Flight Booking System

A full-stack flight booking application built with **React + Vite** (Frontend) and **Kotlin + Spring Boot** (Backend).

## Project Structure

```
.
├── Frontend/              # React + Vite UI (port 3000/3001)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page containers (HomePage, FlightResultsPage, BookingFlowPage)
│   │   ├── hooks/         # Custom hooks (useFlights)
│   │   ├── services/      # API client (src/services/api.js)
│   │   └── main.jsx
│   ├── vite.config.js     # Proxy route /api → http://localhost:8080
│   └── package.json
├── backend/               # Kotlin + Spring Boot API (port 8080)
│   ├── src/main/kotlin/flightbooking/
│   │   ├── Application.kt
│   │   ├── Routing.kt
│   │   └── db/
│   ├── build.gradle.kts
│   └── src/main/resources/db/migration/
└── README.md
```

## API Endpoints

All requests go through frontend proxy: `http://localhost:3000 → http://localhost:8080`

### Flights Search
```
GET /api/flights?from=LBA&to=LHR&departureDate=2026-04-15
```
**Response**: Array of flight objects
```json
[
  {
    "id": "FL001",
    "flightNumber": "LS101",
    "airline": "LeedsAir",
    "from": "LBA",
    "to": "LHR",
    "departureTime": "07:30",
    "arrivalTime": "08:45",
    "departureDate": "2026-04-15",
    "duration": "1h 15m",
    "stops": 0,
    "price": 89,
    "availableSeats": 45
  }
]
```

**Frontend call** (`src/services/api.js`):
```javascript
export async function getFlights(params = {}) {
  return request(`/flights?${new URLSearchParams(params).toString()}`);
}
```

### Authentication
```
POST /api/auth/login        { email, password }
POST /api/auth/register     { firstName, lastName, email, password, phone }
GET  /api/auth/profile      (requires Bearer token in Authorization header)
```

### Bookings
```
GET  /api/bookings          (returns user's bookings)
GET  /api/bookings/lookup   ?ref=LEEDS1A&lastName=Smith
POST /api/bookings          { userId, flightId, passengers, travelClass, totalPrice }
```

## Running the Application

### Frontend
```bash
cd Frontend
npm install
npm run dev
```
→ Opens on `http://localhost:3000` (or 3001 if taken)

### Backend (Production with Kotlin)
```bash
cd backend
./gradlew build
./gradlew bootRun
```
→ Connects to real database via Flyway migrations

## Frontend Data Flow

1. **HomePage** → User enters `from`, `to`, `departureDate`, passengers
2. **FlightResultsPage** → 
   - Calls `GET /api/flights` with search params
   - User picks a date → re-fetches flights for that date
   - Date price bar fetches prices for ±3 days ahead/behind
   - User selects fare tier (Economy/Business)
3. **FareTierModal** → Shows price breakdown by class and features
4. **BookingFlowPage** → Collects passenger details
5. **POST /api/bookings** → Confirm booking

## Important Implementation Notes

- **Date Format**: All dates are **ISO strings** (`YYYY-MM-DD`)
- **Local Dates**: Frontend uses local-date helpers to avoid timezone bugs (see helpers at top of `FlightResultsPage.jsx`)
- **Fare Multipliers**: Business class is typically 2.8× economy price (see `FARE_TIERS` constant)
- **Round-trip**: Frontend collects outbound + return flights separately, then combines into one object for booking
- **Price Bar**: Shows lowest price per day for the selected route (real backend may need price caching)

## Authentication

- Login returns a **Bearer token**
- Token stored in `localStorage`
- Every API call includes: `Authorization: Bearer <token>` (auto-added in `src/services/api.js`)

## Key Files for Backend Team

| File | Purpose |
|------|---------|
| `Frontend/src/services/api.js` | All API calls; shows expected request/response format |
| `Frontend/src/hooks/useFlights.js` | How flights are fetched & cached |
| `backend/src/main/resources/db/migration/V1__init_schema.sql` | Database schema |
