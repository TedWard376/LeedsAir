ALTER TABLE booking_flights
ADD COLUMN IF NOT EXISTS scheduled_flight_id INT;

UPDATE booking_flights bf
SET scheduled_flight_id = bf.flight_id
WHERE EXISTS (
    SELECT 1
    FROM scheduled_flights sf
    WHERE sf.id = bf.flight_id
);

DELETE FROM booking_flights
WHERE scheduled_flight_id IS NULL;

ALTER TABLE booking_flights
DROP CONSTRAINT IF EXISTS booking_flights_flight_id_fkey;

ALTER TABLE booking_flights
DROP CONSTRAINT IF EXISTS booking_flights_booking_id_flight_id_key;

ALTER TABLE booking_flights
DROP COLUMN IF EXISTS flight_id;

ALTER TABLE booking_flights
RENAME COLUMN scheduled_flight_id TO flight_id;

ALTER TABLE booking_flights
ALTER COLUMN flight_id SET NOT NULL;

ALTER TABLE booking_flights
ADD CONSTRAINT booking_flights_flight_id_fkey
FOREIGN KEY (flight_id) REFERENCES scheduled_flights(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS booking_flights_booking_id_flight_id_idx
ON booking_flights(booking_id, flight_id);

ALTER TABLE seat_assignments
ADD COLUMN IF NOT EXISTS scheduled_flight_id INT;

UPDATE seat_assignments sa
SET scheduled_flight_id = sa.flight_id
WHERE EXISTS (
    SELECT 1
    FROM scheduled_flights sf
    WHERE sf.id = sa.flight_id
);

DELETE FROM seat_assignments
WHERE scheduled_flight_id IS NULL;

ALTER TABLE seat_assignments
DROP CONSTRAINT IF EXISTS seat_assignments_flight_id_fkey;

ALTER TABLE seat_assignments
DROP CONSTRAINT IF EXISTS seat_assignments_passenger_id_flight_id_key;

ALTER TABLE seat_assignments
DROP COLUMN IF EXISTS flight_id;

ALTER TABLE seat_assignments
RENAME COLUMN scheduled_flight_id TO flight_id;

ALTER TABLE seat_assignments
ALTER COLUMN flight_id SET NOT NULL;

ALTER TABLE seat_assignments
ADD CONSTRAINT seat_assignments_flight_id_fkey
FOREIGN KEY (flight_id) REFERENCES scheduled_flights(id) ON DELETE RESTRICT;

CREATE UNIQUE INDEX IF NOT EXISTS seat_assignments_passenger_id_flight_id_idx
ON seat_assignments(passenger_id, flight_id);
