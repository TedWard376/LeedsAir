# LeedsAir Flight Booking System

A full-stack flight booking system developed as part of a university software engineering team project at the University of Leeds.

The system allows users to search for flights, manage bookings, complete online check-in, and submit support requests. It also includes an administrative interface for managing bookings, monitoring system activity, and generating operational reports.

The project was built as a collaborative full-stack application with a React frontend and a Kotlin/Ktor backend, communicating via REST APIs and backed by a PostgreSQL database.

---

## Tech Stack

### Frontend

* React
* Vite
* JavaScript
* REST API integration

### Backend

* Kotlin
* Ktor framework
* PostgreSQL
* Flyway database migrations

### Development & Tools

* Git & GitHub (team-based workflow)
* REST API design
* Integration testing
* CI/CD practices

---

## Key Features

### Customer-Facing Features

* User registration and authentication
* Flight search with filtering (origin, destination, date)
* Booking creation and management
* Online check-in flow
* Loyalty rewards system
* Customer complaint submission system

### Administrative Features

* Admin authentication system
* Booking management dashboard
* Reporting and operational metrics
* System monitoring endpoints

---

## My Contributions

Within the team, I focused primarily on frontend development and system integration.

My contributions included:

* Building React-based user interfaces for the flight search and booking workflow
* Developing reusable frontend components to support maintainability and scalability
* Implementing API integration between frontend services and backend endpoints
* Supporting integration testing and debugging across frontend-backend communication
* Collaborating with team members using Git-based workflows (branching, merging, code reviews)

---

## Technical Learning Outcomes

Through this project, I gained practical experience in:

* Full-stack application architecture
* REST API design and integration
* React component-based development
* Backend service structure using Kotlin and Ktor
* Working in a team-based development environment
* Debugging integration issues across a distributed system
* Version control using Git in a collaborative workflow

---

## Project Structure

```text
Frontend/
├── src/
│   ├── components/
│   ├── context/
│   ├── hooks/
│   ├── pages/
│   └── services/

backend/
├── src/main/kotlin/flightbooking/
├── src/main/resources/
└── build.gradle.kts
```

---

## Running the Project

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

The backend API runs on:

```
http://localhost:8080
```

---

## Testing

Backend tests include:

* Flight schedule loading validation
* Authentication and authorization checks
* API routing behaviour
* Error handling and edge cases

Run tests with:

```bash
cd backend
./gradlew test
```

---

## Notes

This project was developed as part of a university group software engineering module. The focus was on building a working full-stack system and applying collaborative development practices in a team environment.
