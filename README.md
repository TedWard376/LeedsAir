# LeedsAir Flight Booking System

A full-stack flight booking platform developed as part of a university software engineering team project.

The application allows customers to search for flights, manage bookings, check in online, submit complaints, and participate in a loyalty programme. An administrative dashboard provides booking management, reporting, and operational metrics.

## Technologies

### Frontend

* React
* Vite
* JavaScript
* REST APIs

### Backend

* Kotlin
* Ktor
* PostgreSQL
* Flyway

### Development Tools

* Git & GitHub
* CI/CD Pipelines
* Integration Testing

## Features

### Customer Features

* User registration and authentication
* Flight search and filtering
* Flight booking management
* Online check-in
* Loyalty rewards system
* Complaint submission

### Administrative Features

* Admin authentication
* Booking management
* Business metrics dashboard
* Reporting functionality

## My Contributions

As part of a collaborative software engineering team, I contributed primarily to frontend development and system integration.

My work included:

* Developing responsive React user interfaces for the flight booking workflow.
* Creating reusable UI components to support maintainable and scalable development.
* Integrating frontend functionality with backend REST APIs.
* Contributing to testing activities to improve reliability and reduce defects.
* Participating in Git-based collaborative development workflows.
* Supporting CI/CD processes and code integration activities.

Through this project I gained experience in:

* Modern React development
* API integration
* Team-based software engineering
* Agile development practices
* Collaborative Git workflows
* Software testing and debugging

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

## Running The Application

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

```text
http://localhost:8080
```

## Testing

Backend tests currently cover:

* Flight schedule loading
* Authentication validation
* Route behaviour
* Error handling scenarios

Run tests using:

```bash
cd backend
./gradlew test
```

## Acknowledgement

This project was completed as part of a university software engineering module.
