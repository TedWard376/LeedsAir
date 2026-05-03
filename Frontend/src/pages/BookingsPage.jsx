import { useMemo } from "react";
import { useBookings } from "../hooks/useBookings";
import { useAuth } from "../context/AuthContext";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

function parseDepartureDate(booking) {
  const dateValue = booking.flight?.departureDate || booking.departureDate;
  if (!dateValue) return null;
  const parsed = new Date(`${dateValue}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatRequestType(type) {
  if (!type) return "General request";
  return type.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getTripGroup(booking) {
  const status = booking.status || "Confirmed";
  if (status === "Cancelled") return "Cancelled Trips";

  const departureDate = parseDepartureDate(booking);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (departureDate && departureDate >= today) return "Upcoming Trips";
  return "Past Trips";
}

function BookingCard({ booking, onNavigate }) {
  const statusClass = `status-badge status-${booking.status?.toLowerCase() || "confirmed"}`;
  const latestRequest = booking.requestHistory?.[0];
  const departureDate = booking.flight?.departureDate || booking.departureDate || "TBC";
  const departureTime = booking.flight?.departureTime || "TBC";
  const routeFrom = booking.flight?.from || booking.from;
  const routeTo = booking.flight?.to || booking.to;

  return (
    <div className="booking-card-v2">
      <div className="booking-card-v2-top">
        <div>
          <span className="booking-card-eyebrow">Reference</span>
          <strong className="ref-value">{booking.bookingReference || booking.id}</strong>
        </div>
        <span className={statusClass}>{booking.status || "Confirmed"}</span>
      </div>

      <div className="booking-card-route">
        <div>
          <span className="booking-card-eyebrow">Route</span>
          <h3>{routeFrom} <span className="arrow">→</span> {routeTo}</h3>
        </div>
        <div className="booking-card-price">£{(booking.totalPrice ?? 0).toLocaleString()}</div>
      </div>

      <div className="booking-card-grid">
        <div>
          <span className="booking-card-eyebrow">Departure</span>
          <strong>{departureDate}</strong>
          <p>{departureTime}</p>
        </div>
        <div>
          <span className="booking-card-eyebrow">Passenger</span>
          <strong>{booking.passenger?.firstName} {booking.passenger?.lastName}</strong>
          <p>{booking.passenger?.email || "No email saved"}</p>
        </div>
        <div>
          <span className="booking-card-eyebrow">Travel Class</span>
          <strong>{booking.travelClass || "Economy"}</strong>
          <p>{booking.seat || "Auto-assigned seat"}</p>
        </div>
      </div>

      {(latestRequest || booking.cancellationReason) && (
        <div className="booking-card-note">
          <span className="booking-card-eyebrow">Latest update</span>
          <p>
            {booking.cancellationReason
              ? `Cancellation reason: ${booking.cancellationReason}`
              : `${formatRequestType(latestRequest?.requestType)} is ${latestRequest?.status || "pending"}.`}
          </p>
        </div>
      )}

      <div className="booking-card-actions">
        <button className="quick-action-btn" onClick={() => onNavigate("manage-booking")}>
          Manage booking
        </button>
        <button className="quick-action-btn" onClick={() => onNavigate("booking")}>
          Rebook route
        </button>
        {booking.checkedIn && (
          <button className="quick-action-btn" onClick={() => onNavigate("checkin")}>
            View check-in
          </button>
        )}
      </div>
    </div>
  );
}

export function BookingsPage({ onNavigate }) {
  const { user, authLoading } = useAuth();
  const { bookings, loading, error } = useBookings(user?.id);

  const groupedBookings = useMemo(() => {
    return bookings.reduce((groups, booking) => {
      const group = getTripGroup(booking);
      groups[group] = groups[group] || [];
      groups[group].push(booking);
      return groups;
    }, {});
  }, [bookings]);

  const upcomingCount = groupedBookings["Upcoming Trips"]?.length || 0;
  const pastCount = groupedBookings["Past Trips"]?.length || 0;
  const cancelledCount = groupedBookings["Cancelled Trips"]?.length || 0;

  if (authLoading) {
    return <LoadingSpinner message="Restoring your bookings..." />;
  }

  if (!user) {
    return (
      <div className="page bookings-page">
        <div className="page-header">
          <h1>My Bookings</h1>
          <p>Sign in to view and manage your reservations.</p>
        </div>

        <div className="empty-state">
          <span className="empty-icon">🗂</span>
          <p>You need to be signed in to see your bookings.</p>
          <button className="search-btn" onClick={() => onNavigate("login")}>Sign In</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page bookings-page">
      <div className="page-header">
        <h1>My Bookings</h1>
        <p>View your upcoming trips, past travel, and the latest booking updates.</p>
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
        <div className="bookings-hub">
          <div className="bookings-summary-grid">
            <div className="booking-summary-card">
              <span className="booking-card-eyebrow">Upcoming</span>
              <strong>{upcomingCount}</strong>
              <p>Trips still ahead of you</p>
            </div>
            <div className="booking-summary-card">
              <span className="booking-card-eyebrow">Past</span>
              <strong>{pastCount}</strong>
              <p>Completed travel history</p>
            </div>
            <div className="booking-summary-card">
              <span className="booking-card-eyebrow">Cancelled</span>
              <strong>{cancelledCount}</strong>
              <p>Bookings that were cancelled</p>
            </div>
          </div>

          {["Upcoming Trips", "Past Trips", "Cancelled Trips"].map((section) => {
            const sectionBookings = groupedBookings[section] || [];
            if (sectionBookings.length === 0) return null;

            return (
              <section key={section} className="booking-section">
                <div className="booking-section-header">
                  <div>
                    <h2>{section}</h2>
                    <p>{sectionBookings.length} booking{sectionBookings.length === 1 ? "" : "s"} in this section</p>
                  </div>
                </div>
                <div className="booking-card-list">
                  {sectionBookings.map((booking) => (
                    <BookingCard
                      key={booking.id || booking.bookingReference}
                      booking={booking}
                      onNavigate={onNavigate}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
