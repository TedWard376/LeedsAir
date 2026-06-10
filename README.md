# LeedsAir Flight Booking System

A full-stack flight booking system developed as part of a team software engineering project at the University of Leeds.

The application enables customers to search for flights, manage bookings, complete online check-in, and submit support requests. It also provides administrative functionality for managing bookings, monitoring system activity, and generating operational reports.

The system was developed using a React frontend and a Kotlin/Ktor backend, communicating through REST APIs and backed by a PostgreSQL database.

## Technologies Used

### Frontend

* React
* Vite
* JavaScript
* REST API Integration

### Backend

* Kotlin
* Ktor
* PostgreSQL
* Flyway Database Migrations

### Development Tools

* Git and GitHub
* GitHub Actions
* REST API Design
* Unit Testing
* API Integration Testing
* Continuous Integration

---

## Key Features

### Customer Features

* User registration and authentication
* Flight search with destination, origin, and date filtering
* Booking creation and management
* Online check-in workflow
* Loyalty rewards system
* Customer complaint submission

### Administrative Features

* Administrator authentication
* Booking management dashboard
* Operational reporting
* System monitoring functionality

---

## My Contributions

My primary responsibility within the team was frontend development and frontend-backend integration.

Key contributions included:

* Developed React-based interfaces for flight search, booking, and user interactions
* Built reusable frontend components to improve maintainability and consistency across the application
* Integrated frontend services with backend REST API endpoints
* Diagnosed and resolved frontend-backend communication issues to ensure reliable API interactions
* Collaborated using Git-based workflows, including branching, pull requests, code reviews, and issue resolution
* Contributed to automated testing and build validation workflows using GitHub Actions

---

## Testing

The project incorporated automated testing and build validation throughout development.

### Frontend Unit Testing

Frontend tests covered utility functions, user interface components, and API service behaviour, including:

* Price formatting and calculation utilities
* Passenger and flight information formatting
* FlightCard component rendering and selection handling
* Navbar authentication state rendering
* Flight retrieval functionality
* Authentication request handling
* Booking creation workflows

### API Integration Testing

API integration tests validated frontend service behaviour, including:

* API URL construction
* Authentication token handling
* Administrative endpoint access
* Booking request payload generation
* Response processing and error handling

Mocked API requests were used to verify application behaviour without requiring a live backend connection.

### Backend Testing

Backend test coverage included:

* Flight schedule loading validation
* Authentication and authorisation checks
* API routing behaviour
* Error handling scenarios
* Edge case validation

### Continuous Integration

GitHub Actions workflows were used to automate:

* Unit test execution
* Integration test execution
* Build verification

These checks helped identify issues early and ensured code changes remained compatible across the application.

---

## Technical Skills Demonstrated

Through this project, I gained practical experience in:

* Full-stack web application development
* React component-based architecture
* Kotlin and Ktor backend development
* REST API design and integration
* PostgreSQL database interaction
* Automated testing practices
* Continuous integration workflows
* Collaborative software development using Git
* Frontend-backend debugging and problem solving

---

## Project Structure

Frontend/
├── src/
│ ├── components/
│ ├── context/
│ ├── hooks/
│ ├── pages/
│ └── services/

Backend/
├── src/main/kotlin/flightbooking/
├── src/main/resources/
└── build.gradle.kts

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

The backend API runs locally on:

```text
http://localhost:8080
```

---

## Notes

This project was developed as part of a university group software engineering module. The focus was on building a working full-stack system and applying collaborative development practices in a team environment.
