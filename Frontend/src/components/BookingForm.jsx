import { useState } from "react";

export function BookingForm({ flight, onSubmit, submitting, submitError, onCancel }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    passportNumber: "",
    email: "",
    phone: "",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit({
      flightId: String(flight.id),
      passenger: form,
    });
  }

  return (
    <div className="booking-form-wrapper">
      <div className="booking-summary">
        <h3>Booking Summary</h3>
        <p>
          <strong>{flight.airline}</strong> — {flight.flightNumber}
        </p>
        <p>
          {flight.from} → {flight.to}
        </p>
        <p>
          {flight.departureTime} — {flight.arrivalTime}
        </p>
        <p className="booking-price">Total: £{flight.price}</p>
      </div>

      <form className="booking-form" onSubmit={handleSubmit}>
        <h3>Passenger Details</h3>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="booking-first-name">First Name</label>
            <input
              id="booking-first-name"
              name="firstName"
              placeholder="First name"
              value={form.firstName}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="booking-last-name">Last Name</label>
            <input
              id="booking-last-name"
              name="lastName"
              placeholder="Last name"
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="booking-date-of-birth">Date of Birth</label>
            <input
              id="booking-date-of-birth"
              type="date"
              name="dateOfBirth"
              value={form.dateOfBirth}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="booking-passport-number">Passport Number</label>
            <input
              id="booking-passport-number"
              name="passportNumber"
              placeholder="e.g. 123456789"
              value={form.passportNumber}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="booking-email">Email</label>
            <input
              id="booking-email"
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="booking-phone">Phone</label>
            <input
              id="booking-phone"
              type="tel"
              name="phone"
              placeholder="+44 7700 000000"
              value={form.phone}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {submitError && (
          <div className="form-error">⚠ {submitError}</div>
        )}

        <div className="form-actions">
          <button type="button" className="cancel-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="confirm-btn" disabled={submitting}>
            {submitting ? "Booking..." : "Confirm Booking"}
          </button>
        </div>
      </form>
    </div>
  );
}
