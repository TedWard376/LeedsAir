# COMP2850 Flight Booking System

Monorepo layout:
- `backend/` -> Ktor backend (runs with Gradle)
- `frontend/` -> React frontend (runs with Vite)

## Backend (Gradle)
Files are now under `backend/`:
- `backend/build.gradle.kts`
- `backend/settings.gradle.kts`
- `backend/src/main/kotlin/...`
- `backend/src/main/resources/...`

Run backend:
```powershell
cd backend
.\gradlew run
```

## Frontend (Vite)
Place your frontend app in `frontend/`.
Typical run commands (once your teammate scaffolds it):
```powershell
cd frontend
npm install
npm run dev
```

## Current status
- Backend has Supabase/Exposed wiring in place.
- Frontend folder is ready for the Vite app.
