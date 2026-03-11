import { useState } from "react";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

export function ManageBookingPage() {
  const [ref, setRef] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBooking(null);
    try {
      const res = await fetch(
        `http://localhost:8080/api/bookings?ref=${encodeURIComponent(ref)}&lastName=${encodeURIComponent(lastName)}`
      );
      if (!res.ok) throw new Error("Booking not found. Please check your reference and surname.");
      const data = await res.json();
      // Backend may return array or single object
      const found = Array.isArray(data) ? data[0] : data;
      if (!found) throw new Error("Booking not found.");
      setBooking(found);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page manage-page">
      <div className="page-header">
        <h1>Manage Booking</h1>
        <p>Enter your booking reference and last name to access your reservation.</p>
      </div>

      <form className="manage-lookup-form" onSubmit={handleLookup}>
        <div className="form-group">
          <label>Booking Reference</label>
          <input
            placeholder="e.g. ABC123"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Last Name</label>
          <input
            placeholder="Passenger surname"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? "Searching..." : "Find Booking"}
        </button>
      </form>

      {loading && <LoadingSpinner message="Looking up booking..." />}
      {error && <ErrorMessage message={error} />}

      {booking && (
        <div className="booking-detail-card">
          <h3>Booking Found</h3>
          <div className="detail-grid">
            <div><span>Reference</span><strong>{booking.bookingReference || booking.id}</strong></div>
            <div><span>Status</span><strong>{booking.status || "Confirmed"}</strong></div>
            <div><span>Passenger</span><strong>{booking.passenger?.firstName} {booking.passenger?.lastName}</strong></div>
            <div><span>Email</span><strong>{booking.passenger?.email}</strong></div>
            <div><span>Route</span><strong>{booking.flight?.from || booking.from} → {booking.flight?.to || booking.to}</strong></div>
            <div><span>Departure</span><strong>{booking.flight?.departureTime || booking.departureDate}</strong></div>
          </div>
          <div className="manage-actions">
            <button className="action-btn">Modify Date</button>
            <button className="action-btn">Add Extras</button>
            <button className="action-btn checkin-btn">Check In</button>
            <button className="action-btn cancel-action-btn">Cancel Flight</button>
          </div>
        </div>
      )}
    </div>
  );
}