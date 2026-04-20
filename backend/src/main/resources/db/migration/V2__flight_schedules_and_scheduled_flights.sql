CREATE TABLE IF NOT EXISTS flight_schedules (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(32) NOT NULL UNIQUE,
    airline VARCHAR(255) NOT NULL,
    departure_airport_id INT NOT NULL REFERENCES airports(id),
    arrival_airport_id INT NOT NULL REFERENCES airports(id),
    departure_time TIME NOT NULL,
    arrival_time TIME NOT NULL,
    operate_days VARCHAR(7) NOT NULL,
    duration_minutes INT NOT NULL,
    stops INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scheduled_flights (
    id SERIAL PRIMARY KEY,
    schedule_id INT NOT NULL REFERENCES flight_schedules(id),
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    aircraft_id INT NOT NULL REFERENCES aircraft(id),
    base_price NUMERIC(12,2) NOT NULL,
    available_seats INT,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled',
    UNIQUE (schedule_id, departure_time)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_flights_departure
ON scheduled_flights(departure_time);

CREATE INDEX IF NOT EXISTS idx_flight_schedules_route
ON flight_schedules(departure_airport_id, arrival_airport_id);
