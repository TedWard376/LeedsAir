import { useState, useEffect } from "react";
import { adminGetBookings, adminGetMetrics, adminGetReports } from "../services/api";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

const STATUS_FILTERS = ["All", "Confirmed", "Cancelled", "Pending", "Completed"];

export function AdminDashboardPage({ onNavigate }) {
  const [tab, setTab] = useState("bookings"); // bookings | reports
  const [bookings, setBookings] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ status: "All", search: "" });

  // Check admin token
  useEffect(() => {
    if (!localStorage.getItem("adminToken")) {
      onNavigate("admin-login");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [bData, mData] = await Promise.all([
          adminGetBookings(),
          adminGetMetrics(),
        ]);
        if (!cancelled) { setBookings(bData); setMetrics(mData); }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (tab !== "reports") return;
    let cancelled = false;
    async function loadReports() {
      try {
        const data = await adminGetReports();
        if (!cancelled) setReports(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }
    loadReports();
    return () => { cancelled = true; };
  }, [tab]);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    onNavigate("home");
  }

  const filtered = bookings.filter((b) => {
    const matchStatus = filters.status === "All" || b.status === filters.status;
    const matchSearch =
      !filters.search ||
      (b.bookingReference || "").toLowerCase().includes(filters.search.toLowerCase()) ||
      (b.passenger?.lastName || "").toLowerCase().includes(filters.search.toLowerCase()) ||
      (b.flight?.from || "").toLowerCase().includes(filters.search.toLowerCase()) ||
      (b.flight?.to || "").toLowerCase().includes(filters.search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="page admin-page">
      <div className="admin-topbar">
        <div className="admin-brand">
          <span>🛡</span>
          <strong>LeedsAir Admin</strong>
        </div>
        <div className="admin-tabs">
          <button
            className={tab === "bookings" ? "admin-tab active" : "admin-tab"}
            onClick={() => setTab("bookings")}
          >
            Bookings
          </button>
          <button
            className={tab === "reports" ? "admin-tab active" : "admin-tab"}
            onClick={() => setTab("reports")}
          >
            Reports
          </button>
        </div>
        <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
      </div>

      <div className="admin-body">
        {loading && <LoadingSpinner message="Loading admin data..." />}
        {error && <ErrorMessage message={error} />}

        {!loading && !error && tab === "bookings" && (
          <>
            {metrics && (
              <div className="admin-metrics">
                <div className="metric-card">
                  <span className="metric-value">{metrics.totalBookings ?? bookings.length}</span>
                  <span className="metric-label">Total Bookings</span>
                </div>
                <div className="metric-card">
                  <span className="metric-value">
                    {metrics.cancellationRate ?? `${bookings.filter(b => b.status === "Cancelled").length}`}
                  </span>
                  <span className="metric-label">Cancellations</span>
                </div>
                <div className="metric-card">
                  <span className="metric-value">
                    £{(metrics.totalRevenue ?? 0).toLocaleString()}
                  </span>
                  <span className="metric-label">Revenue</span>
                </div>
                <div className="metric-card">
                  <span className="metric-value">
                    {metrics.popularRoute ?? "—"}
                  </span>
                  <span className="metric-label">Top Route</span>
                </div>
              </div>
            )}

            <div className="admin-filters">
              <input
                className="admin-search"
                placeholder="Search by ref, name, route..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
              <div className="status-filter-group">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s}
                    className={filters.status === s ? "filter-chip active" : "filter-chip"}
                    onClick={() => setFilters({ ...filters, status: s })}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="admin-table-wrapper">
              <div className="admin-table-header">
                <span>Reference</span>
                <span>Passenger</span>
                <span>Route</span>
                <span>Date</span>
                <span>Class</span>
                <span>Status</span>
              </div>
              {filtered.length === 0 && (
                <div className="empty-state"><p>No bookings match your filters.</p></div>
              )}
              {filtered.map((b) => (
                <div className="admin-table-row" key={b.id || b.bookingReference}>
                  <span className="ref-value">{b.bookingReference || b.id}</span>
                  <span>{b.passenger?.firstName} {b.passenger?.lastName}</span>
                  <span>{b.flight?.from || b.from} → {b.flight?.to || b.to}</span>
                  <span>{b.flight?.departureDate || b.departureDate || "—"}</span>
                  <span>{b.travelClass || "Economy"}</span>
                  <span className={`status-badge status-${(b.status || "confirmed").toLowerCase()}`}>
                    {b.status || "Confirmed"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && !error && tab === "reports" && (
          <div className="reports-section">
            <h2>Reports</h2>
            {!reports && <LoadingSpinner message="Generating reports..." />}
            {reports && (
              <div className="reports-grid">
                <div className="report-card">
                  <h3>Bookings per Flight</h3>
                  {reports.bookingsPerFlight?.map((r) => (
                    <div className="report-row" key={r.flightNumber}>
                      <span>{r.flightNumber}</span>
                      <span className="report-bar-wrap">
                        <span className="report-bar" style={{ width: `${Math.min(100, r.count * 5)}%` }} />
                      </span>
                      <span>{r.count}</span>
                    </div>
                  )) ?? <p className="muted">No data available.</p>}
                </div>
                <div className="report-card">
                  <h3>Most Popular Routes</h3>
                  {reports.popularRoutes?.map((r) => (
                    <div className="report-row" key={r.route}>
                      <span>{r.route}</span>
                      <span className="report-bar-wrap">
                        <span className="report-bar" style={{ width: `${Math.min(100, r.count * 3)}%` }} />
                      </span>
                      <span>{r.count}</span>
                    </div>
                  )) ?? <p className="muted">No data available.</p>}
                </div>
                <div className="report-card">
                  <h3>Revenue per Route</h3>
                  {reports.revenuePerRoute?.map((r) => (
                    <div className="report-row" key={r.route}>
                      <span>{r.route}</span>
                      <strong>£{r.revenue?.toLocaleString()}</strong>
                    </div>
                  )) ?? <p className="muted">No data available.</p>}
                </div>
                <div className="report-card">
                  <h3>Cancellation Rate</h3>
                  <div className="big-stat">
                    {reports.cancellationRate ?? "—"}%
                  </div>
                </div>
              </div>
            )}
            <div className="export-actions">
              <button className="action-btn" onClick={() => alert("Exporting CSV...")}>⬇ Export CSV</button>
              <button className="action-btn" onClick={() => alert("Exporting PDF...")}>⬇ Export PDF</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}