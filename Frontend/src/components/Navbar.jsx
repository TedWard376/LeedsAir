import { useAuth } from "../context/AuthContext";

export function Navbar({ activePage, onNavigate }) {
  const { user, authLoading, logoutUser } = useAuth();

  function handleLogout() {
    logoutUser();
    onNavigate("home");
  }

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => onNavigate("home")}>
        <span className="brand-icon">✈</span>
        <span className="brand-name">LeedsAir</span>
      </div>

      <ul className="navbar-links">
        <li>
          <button
            className={activePage === "home" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("home")}
          >
            Flights
          </button>
        </li>
        <li>
          <button
            className={activePage === "manage" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("manage")}
          >
            Manage Booking
          </button>
        </li>
        <li>
          <button
            className={activePage === "checkin" ? "nav-link active" : "nav-link"}
            onClick={() => onNavigate("checkin")}
          >
            Check In
          </button>
        </li>
        {user && (
          <>
            <li>
              <button
                className={activePage === "bookings" ? "nav-link active" : "nav-link"}
                onClick={() => onNavigate("bookings")}
              >
                My Bookings
              </button>
            </li>
            <li>
              <button
                className={activePage === "rewards" ? "nav-link active" : "nav-link"}
                onClick={() => onNavigate("rewards")}
              >
                Rewards
              </button>
            </li>
          </>
        )}
      </ul>

      <div className="navbar-auth">
        {authLoading ? (
          <div className="navbar-user">
            <span className="nav-link">Restoring session...</span>
          </div>
        ) : user ? (
          <div className="navbar-user">
            <button
              className={activePage === "account" ? "nav-link active" : "nav-link"}
              onClick={() => onNavigate("account")}
            >
              👤 {user.firstName}
            </button>
            <button className="nav-btn-logout" onClick={handleLogout}>Sign Out</button>
          </div>
        ) : (
          <div className="navbar-user">
            <button className="nav-link" onClick={() => onNavigate("login")}>Login</button>
            <button className="nav-btn-login" onClick={() => onNavigate("register")}>Register</button>
          </div>
        )}
      </div>
    </nav>
  );
}
