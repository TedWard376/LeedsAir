import { useBookings } from "../hooks/useBookings";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

function BookingRow({ booking }) {
  const statusClass = `status-badge status-${booking.status?.toLowerCase() || "confirmed"}`;
  return (
    <div className="booking-row">
      <div className="booking-ref">
        <span className="ref-label">Ref</span>
        <span className="ref-value">{booking.bookingReference || booking.id}</span>
      </div>
      <div className="booking-route">
        <strong>{booking.flight?.from || booking.from}</strong>
        <span className="arrow">→</span>
        <strong>{booking.flight?.to || booking.to}</strong>
      </div>
      <div className="booking-date">
        {booking.flight?.departureDate || booking.departureDate || "—"}
      </div>
      <div className="booking-passenger">
        {booking.passenger?.firstName} {booking.passenger?.lastName}
      </div>
      <div className={statusClass}>
        {booking.status || "Confirmed"}
      </div>
    </div>
  );
}

export function BookingsPage() {
  const { bookings, loading, error } = useBookings();

  return (
    <div className="page bookings-page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>View and manage all your reservations.</p>
      </div>

      {loading && <LoadingSpinner message="Loading your bookings..." />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && bookings.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🗂</span>
          <p>No bookings found. Search for flights to get started.</p>
        </div>
      )}

      {!loading && !error && bookings.length > 0 && (
        <div className="bookings-list">
          <div className="bookings-header-row">
            <span>Reference</span>
            <span>Route</span>
            <span>Date</span>
            <span>Passenger</span>
            <span>Status</span>
          </div>
          {bookings.map((b) => (
            <BookingRow key={b.id || b.bookingReference} booking={b} />
          ))}
        </div>
      )}
    </div>
  );
}