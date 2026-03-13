import { useAuth } from "../context/AuthContext";
import { useBookings } from "../hooks/useBookings";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

export function AccountPage({ onNavigate }) {
  const { user, logoutUser } = useAuth();
  const { bookings, loading, error } = useBookings();

  function handleLogout() {
    logoutUser();
    onNavigate("home");
  }

  const upcoming = bookings.filter((b) => b.status !== "Cancelled");
  const past = bookings.filter((b) => b.status === "Completed" || b.status === "Cancelled");

  return (
    <div className="page account-page">
      <div className="page-header">
        <div className="account-hero">
          <div className="account-avatar">
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div>
            <h1>{user?.firstName} {user?.lastName}</h1>
            <p>{user?.email}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
        </div>
      </div>

      <div className="account-body">
        <div className="account-cards">
          <div className="account-stat-card" onClick={() => onNavigate("rewards")} style={{ cursor: "pointer" }}>
            <span className="stat-icon">⭐</span>
            <div>
              <span className="stat-value">{user?.loyaltyPoints ?? 0}</span>
              <span className="stat-label">Loyalty Points</span>
            </div>
          </div>
          <div className="account-stat-card">
            <span className="stat-icon">🎫</span>
            <div>
              <span className="stat-value">{upcoming.length}</span>
              <span className="stat-label">Upcoming Flights</span>
            </div>
          </div>
          <div className="account-stat-card">
            <span className="stat-icon">📋</span>
            <div>
              <span className="stat-value">{bookings.length}</span>
              <span className="stat-label">Total Bookings</span>
            </div>
          </div>
        </div>

        <div className="account-section">
          <div className="account-section-header">
            <h2>Booking History</h2>
            <button className="link-btn" onClick={() => onNavigate("bookings")}>View all</button>
          </div>

          {loading && <LoadingSpinner message="Loading bookings..." />}
          {error && <ErrorMessage message={error} />}

          {!loading && !error && bookings.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">✈</span>
              <p>No bookings yet. Ready to fly?</p>
              <button className="search-btn" onClick={() => onNavigate("home")}>Search Flights</button>
            </div>
          )}

          {!loading && !error && bookings.slice(0, 5).map((b) => (
            <div className="booking-row" key={b.id || b.bookingReference}>
              <div className="booking-ref">
                <span className="ref-label">Ref</span>
                <span className="ref-value">{b.bookingReference || b.id}</span>
              </div>
              <div className="booking-route">
                <strong>{b.flight?.from || b.from}</strong>
                <span className="arrow">→</span>
                <strong>{b.flight?.to || b.to}</strong>
              </div>
              <div className="booking-date">{b.flight?.departureDate || b.departureDate || "—"}</div>
              <div className={`status-badge status-${(b.status || "confirmed").toLowerCase()}`}>
                {b.status || "Confirmed"}
              </div>
            </div>
          ))}
        </div>

        <div className="account-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <button className="quick-action-btn" onClick={() => onNavigate("manage")}>
              <span>✏️</span> Manage Booking
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate("rewards")}>
              <span>⭐</span> Rewards
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate("complaint")}>
              <span>📝</span> Submit Complaint
            </button>
            <button className="quick-action-btn" onClick={() => onNavigate("home")}>
              <span>✈</span> Book a Flight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}