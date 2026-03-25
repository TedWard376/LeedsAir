import { useState, useEffect, useMemo } from "react";
import { adminGetBookings, adminGetMetrics, adminGetReports } from "../services/api";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

// ── PRD §5 Admin Portal ───────────────────────────────────
// Tabs: Bookings | Reports | Modifications
// Bookings: filter by flight, date, route, status + search
// Reports: bookings/flight, popular routes, revenue/route,
//          peak booking times, cancellation rate
// Export: real CSV download (not just alert)

const STATUS_FILTERS = ["All", "Confirmed", "Cancelled", "Pending", "CheckedIn"];

// ── CSV export helper ─────────────────────────────────────
function exportCSV(rows, filename) {
  if (!rows.length) return;
  const headers = ["Reference", "Passenger", "Route", "Date", "Class", "Status", "Price"];
  const lines = [
    headers.join(","),
    ...rows.map(b => [
      b.bookingReference || b.id,
      `"${(b.passenger?.firstName || "")} ${(b.passenger?.lastName || "")}"`,
      `"${b.flight?.from || b.from || ""} → ${b.flight?.to || b.to || ""}"`,
      b.flight?.departureDate || b.departureDate || "",
      b.travelClass || "Economy",
      b.status || "Confirmed",
      b.totalPrice || "",
    ].join(","))
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

// ── Simple bar chart ──────────────────────────────────────
function BarChart({ data, labelKey, valueKey, prefix = "", color = "var(--sky)" }) {
  if (!data?.length) return <p className="muted-text">No data available.</p>;
  const max = Math.max(...data.map(d => d[valueKey] || 0));
  return (
    <div className="bar-chart">
      {data.map((row, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label">{row[labelKey]}</span>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{ width: `${max ? (row[valueKey] / max) * 100 : 0}%`, background: color }}
            />
          </div>
          <span className="bar-value">{prefix}{(row[valueKey] ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

// ── Metric card ───────────────────────────────────────────
function MetricCard({ value, label, icon, highlight }) {
  return (
    <div className={`metric-card ${highlight ? "metric-card--highlight" : ""}`}>
      {icon && <span className="metric-icon">{icon}</span>}
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export function AdminDashboardPage({ onNavigate }) {
  const [tab,      setTab]      = useState("bookings");
  const [bookings, setBookings] = useState([]);
  const [metrics,  setMetrics]  = useState(null);
  const [reports,  setReports]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  // Booking filters — PRD: filter by flight, date, route, status
  const [statusFilter, setStatusFilter] = useState("All");
  const [search,       setSearch]       = useState("");
  const [dateFilter,   setDateFilter]   = useState("");
  const [routeFilter,  setRouteFilter]  = useState("");

  // Expanded row for booking detail
  const [expandedId, setExpandedId] = useState(null);

  // ── Guard: redirect if no admin token ─────────────────
  useEffect(() => {
    if (!localStorage.getItem("adminToken")) onNavigate("admin-login");
  }, []);

  // ── Load bookings + metrics on mount ──────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
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

  // ── Load reports lazily when Reports tab opened ───────
  useEffect(() => {
    if (tab !== "reports" || reports) return;
    let cancelled = false;
    adminGetReports()
      .then(data => { if (!cancelled) setReports(data); })
      .catch(err => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [tab]);

  function handleLogout() {
    localStorage.removeItem("adminToken");
    onNavigate("home");
  }

  // ── Filtered bookings (memo so it doesn't recalc on every render) ─
  const filtered = useMemo(() => bookings.filter(b => {
    if (statusFilter !== "All" && b.status !== statusFilter) return false;
    if (dateFilter && (b.flight?.departureDate || b.departureDate || "") !== dateFilter) return false;
    if (routeFilter) {
      const route = `${b.flight?.from || b.from || ""} ${b.flight?.to || b.to || ""}`.toLowerCase();
      if (!route.includes(routeFilter.toLowerCase())) return false;
    }
    if (search) {
      const s = search.toLowerCase();
      const ref  = (b.bookingReference || b.id || "").toLowerCase();
      const name = `${b.passenger?.firstName || ""} ${b.passenger?.lastName || ""}`.toLowerCase();
      const fn   = (b.flight?.flightNumber || "").toLowerCase();
      if (!ref.includes(s) && !name.includes(s) && !fn.includes(s)) return false;
    }
    return true;
  }), [bookings, statusFilter, dateFilter, routeFilter, search]);

  // ── Derived counts for modifications tab ──────────────
  const modifications = useMemo(() =>
    bookings.filter(b => b.modificationRequested || b.status === "Pending"),
  [bookings]);

  // ── Unique routes for route filter dropdown ───────────
  const uniqueRoutes = useMemo(() => {
    const set = new Set();
    bookings.forEach(b => {
      const r = `${b.flight?.from || b.from || ""}-${b.flight?.to || b.to || ""}`;
      if (r !== "-") set.add(r);
    });
    return ["", ...Array.from(set)];
  }, [bookings]);

  return (
    <div className="page admin-page">

      {/* ── Top bar ─────────────────────────────────────── */}
      <div className="admin-topbar">
        <div className="admin-brand">
          <span>🛡</span>
          <strong>LeedsAir Admin</strong>
        </div>
        <div className="admin-tabs">
          {[
            ["bookings",      "📋 Bookings"],
            ["reports",       "📊 Reports"],
            ["modifications", "✏️ Modifications"],
          ].map(([key, label]) => (
            <button
              key={key}
              className={`admin-tab ${tab === key ? "active" : ""}`}
              onClick={() => setTab(key)}
            >
              {label}
              {key === "modifications" && modifications.length > 0 && (
                <span className="admin-badge">{modifications.length}</span>
              )}
            </button>
          ))}
        </div>
        <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
      </div>

      <div className="admin-body">
        {loading && <LoadingSpinner message="Loading admin data..." />}
        {error   && <ErrorMessage message={error} />}

        {/* ════════════════════════════════════════════════
            TAB: BOOKINGS
            PRD §5: View all bookings, filter by flight /
            date / route / status, track availability,
            cancellations, changes
           ════════════════════════════════════════════════ */}
        {!loading && !error && tab === "bookings" && (<>

          {/* Metric strip */}
          {metrics && (
            <div className="admin-metrics">
              <MetricCard icon="🎫" value={metrics.totalBookings ?? bookings.length}        label="Total Bookings" />
              <MetricCard icon="❌" value={metrics.cancellations ?? "—"}                    label="Cancellations" />
              <MetricCard icon="💷" value={`£${(metrics.totalRevenue ?? 0).toLocaleString()}`} label="Total Revenue" highlight />
              <MetricCard icon="✈" value={metrics.popularRoute ?? "—"}                     label="Top Route" />
              <MetricCard icon="👤" value={metrics.activeUsers ?? "—"}                      label="Active Users" />
              <MetricCard icon="📉" value={`${metrics.cancellationRate ?? "—"}%`}           label="Cancellation Rate" />
            </div>
          )}

          {/* Filters — PRD: filter by flight, date, route, status */}
          <div className="admin-filters-bar">
            <input
              className="admin-search"
              placeholder="Search reference, passenger, flight no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <input
              type="date"
              className="admin-date-filter"
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              title="Filter by departure date"
            />
            <select
              className="admin-route-filter"
              value={routeFilter}
              onChange={e => setRouteFilter(e.target.value)}
            >
              <option value="">All routes</option>
              {uniqueRoutes.filter(Boolean).map(r => (
                <option key={r} value={r.replace("-", " ")}>{r}</option>
              ))}
            </select>
            <div className="status-filter-group">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  className={`filter-chip ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s}
                </button>
              ))}
            </div>
            <button
              className="admin-clear-btn"
              onClick={() => { setSearch(""); setDateFilter(""); setRouteFilter(""); setStatusFilter("All"); }}
            >
              Clear filters
            </button>
          </div>

          {/* Results count + export */}
          <div className="admin-results-bar">
            <span className="admin-results-count">
              Showing <strong>{filtered.length}</strong> of <strong>{bookings.length}</strong> bookings
            </span>
            <button
              className="export-btn"
              onClick={() => exportCSV(filtered, "leedsair-bookings.csv")}
            >
              ⬇ Export CSV
            </button>
          </div>

          {/* Bookings table */}
          <div className="admin-table-wrapper">
            <div className="admin-table-header">
              <span>Reference</span>
              <span>Passenger</span>
              <span>Route</span>
              <span>Date</span>
              <span>Class</span>
              <span>Price</span>
              <span>Status</span>
            </div>

            {filtered.length === 0 && (
              <div className="empty-state"><p>No bookings match your filters.</p></div>
            )}

            {filtered.map(b => (
              <div key={b.id || b.bookingReference}>
                <div
                  className="admin-table-row admin-table-row--clickable"
                  onClick={() => setExpandedId(expandedId === (b.id || b.bookingReference) ? null : (b.id || b.bookingReference))}
                >
                  <span className="ref-value">{b.bookingReference || b.id}</span>
                  <span>{b.passenger?.firstName} {b.passenger?.lastName}</span>
                  <span>{b.flight?.from || b.from} → {b.flight?.to || b.to}</span>
                  <span>{b.flight?.departureDate || b.departureDate || "—"}</span>
                  <span>{b.travelClass || "Economy"}</span>
                  <span>£{b.totalPrice ?? "—"}</span>
                  <span className={`status-badge status-${(b.status || "confirmed").toLowerCase()}`}>
                    {b.status || "Confirmed"}
                  </span>
                </div>

                {/* Expanded detail row */}
                {expandedId === (b.id || b.bookingReference) && (
                  <div className="admin-row-detail">
                    <div className="admin-detail-grid">
                      <div><span>Flight</span><strong>{b.flight?.flightNumber || "—"}</strong></div>
                      <div><span>Departure</span><strong>{b.flight?.departureTime || "—"}</strong></div>
                      <div><span>Arrival</span><strong>{b.flight?.arrivalTime || "—"}</strong></div>
                      <div><span>Seat</span><strong>{b.seat || "Auto-assigned"}</strong></div>
                      <div><span>Checked In</span><strong>{b.checkedIn ? "Yes ✓" : "No"}</strong></div>
                      <div><span>Email</span><strong>{b.passenger?.email || "—"}</strong></div>
                      <div><span>Passport</span><strong>{b.passenger?.passportNumber || "—"}</strong></div>
                      <div><span>Booked</span><strong>{b.createdAt ? new Date(b.createdAt).toLocaleDateString("en-GB") : "—"}</strong></div>
                    </div>
                    {b.extras?.length > 0 && (
                      <div className="admin-detail-extras">
                        Extras: {b.extras.join(", ")}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>)}

        {/* ════════════════════════════════════════════════
            TAB: REPORTS
            PRD §5: Bookings per flight, popular routes,
            revenue per route, peak booking times,
            cancellation rate — plus CSV export
           ════════════════════════════════════════════════ */}
        {!loading && !error && tab === "reports" && (
          <div className="reports-section">
            <div className="reports-header-row">
              <h2>Reports</h2>
              <button
                className="export-btn"
                onClick={() => exportCSV(bookings, "leedsair-full-report.csv")}
              >
                ⬇ Export all bookings CSV
              </button>
            </div>

            {!reports && <LoadingSpinner message="Generating reports..." />}

            {reports && (<>
              {/* Summary stats */}
              <div className="admin-metrics" style={{marginBottom:"2rem"}}>
                <MetricCard icon="📉" value={`${reports.cancellationRate ?? "—"}%`} label="Cancellation Rate" />
                <MetricCard icon="⏰" value={reports.peakBookingHour ?? "—"}         label="Peak Booking Hour" />
                <MetricCard icon="🛣" value={reports.popularRoutes?.[0]?.route ?? "—"} label="Most Popular Route" highlight />
                <MetricCard icon="💷" value={`£${(reports.revenuePerRoute?.[0]?.revenue ?? 0).toLocaleString()}`} label="Top Route Revenue" />
              </div>

              <div className="reports-grid">

                {/* Bookings per flight */}
                <div className="report-card">
                  <h3>✈ Bookings per Flight</h3>
                  <BarChart
                    data={reports.bookingsPerFlight}
                    labelKey="flightNumber"
                    valueKey="count"
                    color="var(--sky)"
                  />
                </div>

                {/* Popular routes */}
                <div className="report-card">
                  <h3>🛣 Most Popular Routes</h3>
                  <BarChart
                    data={reports.popularRoutes}
                    labelKey="route"
                    valueKey="count"
                    color="#7c3aed"
                  />
                </div>

                {/* Revenue per route */}
                <div className="report-card">
                  <h3>💷 Revenue per Route</h3>
                  <BarChart
                    data={reports.revenuePerRoute}
                    labelKey="route"
                    valueKey="revenue"
                    prefix="£"
                    color="var(--success)"
                  />
                </div>

                {/* Cancellation rate gauge */}
                <div className="report-card report-card--center">
                  <h3>📉 Cancellation Rate</h3>
                  <div className="cancellation-gauge">
                    <svg viewBox="0 0 120 70" className="gauge-svg">
                      <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="#e5e7eb" strokeWidth="12" strokeLinecap="round" />
                      <path
                        d="M10,60 A50,50 0 0,1 110,60"
                        fill="none"
                        stroke={reports.cancellationRate > 20 ? "#ef4444" : reports.cancellationRate > 10 ? "#f59e0b" : "#22c55e"}
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(reports.cancellationRate / 100) * 157} 157`}
                      />
                    </svg>
                    <div className="gauge-value">{reports.cancellationRate ?? "—"}%</div>
                    <div className="gauge-label">of all bookings cancelled</div>
                  </div>
                </div>

              </div>
            </>)}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            TAB: MODIFICATIONS
            PRD §4.11: Monitor modification requests,
            admin approval workflow
           ════════════════════════════════════════════════ */}
        {!loading && !error && tab === "modifications" && (
          <div className="modifications-section">
            <h2>Modification Requests</h2>
            <p className="section-subtitle">
              Bookings with pending change requests or awaiting admin approval.
            </p>

            {modifications.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">✓</span>
                <p>No pending modification requests.</p>
              </div>
            ) : (
              <div className="admin-table-wrapper">
                <div className="admin-table-header" style={{gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1.5fr"}}>
                  <span>Reference</span>
                  <span>Passenger</span>
                  <span>Route</span>
                  <span>Type</span>
                  <span>Requested</span>
                  <span>Actions</span>
                </div>
                {modifications.map(b => (
                  <div className="admin-table-row" key={b.id || b.bookingReference}
                    style={{gridTemplateColumns:"1fr 1fr 1fr 1fr 1fr 1.5fr"}}>
                    <span className="ref-value">{b.bookingReference || b.id}</span>
                    <span>{b.passenger?.firstName} {b.passenger?.lastName}</span>
                    <span>{b.flight?.from || b.from} → {b.flight?.to || b.to}</span>
                    <span>{b.modificationRequested || "Pending"}</span>
                    <span>{b.modificationRequestedAt ? new Date(b.modificationRequestedAt).toLocaleDateString("en-GB") : "—"}</span>
                    <span className="admin-action-btns">
                      <button className="admin-approve-btn">✓ Approve</button>
                      <button className="admin-reject-btn">✗ Reject</button>
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Track availability / cancellations / changes — PRD §5 */}
            <div style={{marginTop:"2rem"}}>
              <h3 style={{marginBottom:"1rem"}}>Change Tracking Summary</h3>
              <div className="admin-metrics">
                <MetricCard icon="✏️" value={bookings.filter(b => b.status === "Pending").length}    label="Pending Changes" />
                <MetricCard icon="❌" value={bookings.filter(b => b.status === "Cancelled").length}  label="Cancellations" />
                <MetricCard icon="✅" value={bookings.filter(b => b.checkedIn).length}               label="Checked In" />
                <MetricCard icon="🎫" value={bookings.filter(b => b.status === "Confirmed").length}  label="Confirmed" />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}