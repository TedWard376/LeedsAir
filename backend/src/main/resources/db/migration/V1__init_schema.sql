-- this is the initialisation of the tables using sql and then will link this with
-- expose the api to the frontend and then we will be able to do the crud operations on the database using the api

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS airports (
    id SERIAL PRIMARY KEY,
    code VARCHAR(8) NOT NULL UNIQUE,
    name VARCHAR(255),
    city VARCHAR(255),
    country VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS aircraft (
    id SERIAL PRIMARY KEY,
    model VARCHAR(255),
    total_seats INT NOT NULL
);

CREATE TABLE IF NOT EXISTS flights (
    id SERIAL PRIMARY KEY,
    flight_number VARCHAR(32) NOT NULL,
    departure_airport_id INT NOT NULL REFERENCES airports(id),
    arrival_airport_id INT NOT NULL REFERENCES airports(id),
    departure_time TIMESTAMP NOT NULL,
    arrival_time TIMESTAMP NOT NULL,
    aircraft_id INT NOT NULL REFERENCES aircraft(id),
    base_price NUMERIC(12,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE IF NOT EXISTS seats (
    id SERIAL PRIMARY KEY,
    aircraft_id INT NOT NULL REFERENCES aircraft(id),
    seat_number VARCHAR(16) NOT NULL,
    seat_class VARCHAR(32) NOT NULL,
    UNIQUE (aircraft_id, seat_number)
);

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    booking_reference VARCHAR(64) NOT NULL UNIQUE,
    total_price NUMERIC(12,2) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS passengers (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    email VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS booking_flights (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id),
    flight_id INT NOT NULL REFERENCES flights(id),
    UNIQUE (booking_id, flight_id)
);

CREATE TABLE IF NOT EXISTS seat_assignments (
    id SERIAL PRIMARY KEY,
    passenger_id INT NOT NULL REFERENCES passengers(id),
    flight_id INT NOT NULL REFERENCES flights(id),
    seat_id INT NOT NULL REFERENCES seats(id),
    UNIQUE (passenger_id, flight_id)
);

CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id),
    amount NUMERIC(12,2) NOT NULL,
    payment_method VARCHAR(64),
    payment_status VARCHAR(32) NOT NULL,
    transaction_reference VARCHAR(128),
    payment_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modification_requests (
    id SERIAL PRIMARY KEY,
    booking_id INT NOT NULL REFERENCES bookings(id),
    request_type VARCHAR(32) NOT NULL,
    description TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_by INT REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    booking_id INT REFERENCES bookings(id),
    subject VARCHAR(255),
    message TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    message TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_accounts (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id),
    points_balance INT NOT NULL DEFAULT 0,
    tier VARCHAR(32) NOT NULL DEFAULT 'silver'
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
    id SERIAL PRIMARY KEY,
    loyalty_account_id INT NOT NULL REFERENCES loyalty_accounts(id),
    booking_id INT REFERENCES bookings(id),
    points_earned INT NOT NULL DEFAULT 0,
    points_redeemed INT NOT NULL DEFAULT 0,
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flights_route_time
ON flights(departure_airport_id, arrival_airport_id, departure_time);

CREATE INDEX IF NOT EXISTS idx_bookings_user_created
ON bookings(user_id, created_at);
