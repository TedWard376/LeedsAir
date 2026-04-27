import { useState, useEffect } from "react";
import { useFlights } from "../hooks/useFlights";
import { buildApiUrl } from "../services/api";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

// ── Progress stepper ──────────────────────────────────────
const STEPS = ["Outbound", "Return", "Flight summary", "Passenger details", "Seats", "Extras", "Review and pay"];
function ProgressBar({ currentStep = 0 }) {
  return (
    <div className="progress-bar">
      {STEPS.map((label, i) => (
        <div key={label} className={`progress-step ${i === currentStep ? "active" : ""} ${i < currentStep ? "done" : ""}`}>
          <div className="progress-circle">{i < currentStep ? "✓" : i + 1}</div>
          <span className="progress-label">{label}</span>
          {i < STEPS.length - 1 && <div className="progress-line" />}
        </div>
      ))}
    </div>
  );
}

// ── Safe local-date helpers (avoid timezone shift bugs) ───
// Always work in local time — never call .toISOString() on a Date
// constructed from a "YYYY-MM-DD" string, as that is parsed as UTC midnight
// which shifts to the previous day in timezones behind UTC (e.g. UK in winter).
function localDateFromIso(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d); // local midnight
}
function isoFromLocalDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
function addDays(iso, n) {
  const d = localDateFromIso(iso);
  d.setDate(d.getDate() + n);
  return isoFromLocalDate(d);
}
function formatDateLabel(iso) {
  const d = localDateFromIso(iso);
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// ── Dynamic Date Price Bar ────────────────────────────────
function useDatePrices(from, to, centerDate, windowDays = 3) {
  const [prices,  setPrices]  = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!from || !to || !centerDate) return;
    let cancelled = false;
    setLoading(true);

    const dates = [];
    for (let i = -windowDays; i <= windowDays; i++) {
      dates.push(addDays(centerDate, i));
    }

    Promise.all(
      dates.map(date =>
        fetch(buildApiUrl(`/flights?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&departureDate=${date}`))
          .then(r => r.ok ? r.json() : [])
          .then(flights => [date, flights?.length ? Math.min(...flights.map(f => f.price)) : null])
          .catch(() => [date, null])
      )
    ).then(results => {
      if (cancelled) return;
      const map = {};
      results.forEach(([date, price]) => { map[date] = price; });
      setPrices(map);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [from, to, centerDate]);

  return { prices, loading };
}

function DatePriceBar({ from, to, selectedDate, onDateChange, windowDays = 3 }) {
  const [centerDate, setCenterDate] = useState(selectedDate || "");
  const { prices, loading } = useDatePrices(from, to, centerDate || selectedDate, windowDays);

  // If selectedDate changes externally (e.g. user picks different date),
  // recenter the bar so the selected date is always visible
  useEffect(() => {
    if (!selectedDate) return;
    if (!centerDate) { setCenterDate(selectedDate); return; }
    // Check if selectedDate is within the current window
    const centerMs = localDateFromIso(centerDate).getTime();
    const selMs    = localDateFromIso(selectedDate).getTime();
    const dayMs    = 86400000;
    if (Math.abs(selMs - centerMs) > windowDays * dayMs) {
      setCenterDate(selectedDate);
    }
  }, [selectedDate]);

  if (!selectedDate) return null;

  const strip = [];
  for (let i = -windowDays; i <= windowDays; i++) {
    const iso = addDays(centerDate, i);
    strip.push({
      iso,
      label: formatDateLabel(iso),
      price: prices[iso] ?? null,
      selected: iso === selectedDate,
    });
  }

  const allPrices = strip.map(d => d.price).filter(p => p !== null);
  const cheapest  = allPrices.length ? Math.min(...allPrices) : null;

  return (
    <div className="date-price-bar">
      <button className="dpb-arrow" onClick={() => setCenterDate(d => addDays(d, -windowDays))}>←</button>
      <div className="dpb-track">
        {strip.map(day => (
          <button
            key={day.iso}
            className={[
              "dpb-day",
              day.selected ? "dpb-selected" : "",
              !day.selected && day.price !== null && day.price === cheapest ? "dpb-cheapest" : "",
              day.price === null ? "dpb-no-flight" : "",
            ].filter(Boolean).join(" ")}
            onClick={() => day.price !== null && onDateChange(day.iso)}
            disabled={day.price === null}
          >
            {loading
              ? <span className="dpb-loading">…</span>
              : day.price !== null
                ? <span className="dpb-price">£{day.price}</span>
                : <span className="dpb-no-price">—</span>
            }
            <span className="dpb-label">{day.label}</span>
            {day.selected && <div className="dpb-underline" />}
            {!day.selected && day.price !== null && day.price === cheapest && (
              <span className="dpb-best-tag">Best</span>
            )}
          </button>
        ))}
      </div>
      <button className="dpb-arrow" onClick={() => setCenterDate(d => addDays(d, windowDays))}>→</button>
    </div>
  );
}

// ── Fare tiers ────────────────────────────────────────────
const FARE_TIERS = {
  economy: [
    { id: "eco-basic",    label: "Basic",      multiplier: 1.0,  baggage: "1 cabin bag",          changes: "No changes",   refund: "Non-refundable" },
    { id: "eco-semiflex", label: "Semi-Flex",  multiplier: 1.35, baggage: "1 cabin + 1 hold bag", changes: "Fee applies",  refund: "Non-refundable" },
    { id: "eco-flex",     label: "Fully Flex", multiplier: 1.7,  baggage: "2 hold bags included", changes: "Free changes", refund: "Fully refundable" },
  ],
  business: [
    { id: "biz-saver",   label: "Saver",   multiplier: 2.8, baggage: "2 hold bags",          changes: "Fee applies",  refund: "Non-refundable" },
    { id: "biz-flex",    label: "Flex",    multiplier: 3.4, baggage: "3 hold bags",          changes: "Free changes", refund: "Partial refund" },
    { id: "biz-premium", label: "Premium", multiplier: 4.0, baggage: "3 hold bags + lounge", changes: "Free changes", refund: "Fully refundable" },
  ],
};

function FareTierModal({ flight, initialCabin, onSelect, onClose }) {
  const [cabinTab, setCabinTab] = useState(initialCabin || "economy");
  const tiers = FARE_TIERS[cabinTab];
  return (
    <div className="fare-modal-overlay" onClick={onClose}>
      <div className="fare-modal" onClick={e => e.stopPropagation()}>
        <div className="fare-modal-header">
          <div className="fare-modal-route">
            <span className="fmr-code">{flight.from}</span>
            <span className="fmr-arrow">→</span>
            <span className="fmr-code">{flight.to}</span>
          </div>
          <div className="fare-modal-meta">
            <span>{flight.flightNumber}</span><span>·</span>
            <span>{flight.departureTime} – {flight.arrivalTime}</span><span>·</span>
            <span>{flight.duration}</span>
          </div>
          <button className="fare-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="fare-cabin-tabs">
          <button className={`fare-cabin-tab ${cabinTab === "economy"  ? "active" : ""}`} onClick={() => setCabinTab("economy")}>Economy</button>
          <button className={`fare-cabin-tab ${cabinTab === "business" ? "active" : ""}`} onClick={() => setCabinTab("business")}>✦ Business</button>
        </div>
        <div className="fare-tiers-grid">
          {tiers.map((tier, i) => (
            <div key={tier.id} className={`fare-tier-card ${i === 1 ? "fare-popular" : ""}`}>
              {i === 1 && <div className="fare-popular-badge">Most popular</div>}
              <div className="fare-tier-name">{tier.label}</div>
              <div className="fare-tier-price">
                <span className="fare-from">from</span>
                <span className="fare-amount">£{Math.round(flight.price * tier.multiplier)}</span>
              </div>
              <ul className="fare-features">
                <li><span className="fare-icon">🧳</span> {tier.baggage}</li>
                <li><span className="fare-icon">✏️</span> {tier.changes}</li>
                <li><span className="fare-icon">💰</span> {tier.refund}</li>
                {cabinTab === "business" && <li><span className="fare-icon">💺</span> Lie-flat seat</li>}
              </ul>
              <button className="fare-select-btn"
                onClick={() => onSelect({ ...flight, selectedFare: tier, travelClass: cabinTab, totalPrice: Math.round(flight.price * tier.multiplier) })}>
                Select {tier.label}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Flight result card ────────────────────────────────────
function FlightResultCard({ flight, onSelectFare }) {
  const [expanded, setExpanded] = useState(false);
  const stopsLabel = flight.stops === 0 ? "Direct" : flight.stops === 1 ? "1 stop" : `${flight.stops} stops`;
  return (
    <div className="frc-card">
      <div className="frc-main">
        <div className="frc-route">
          <div className="frc-airport">
            <span className="frc-city">{flight.from}</span>
            <span className="frc-time">{flight.departureTime}</span>
          </div>
          <div className="frc-middle">
            <span className="frc-duration">{flight.duration}</span>
            <div className="frc-line"><div className="frc-dot"/><div className="frc-dash"/><div className="frc-dot"/></div>
            <span className="frc-stops">{stopsLabel}</span>
          </div>
          <div className="frc-airport frc-airport--right">
            <span className="frc-city">{flight.to}</span>
            <span className="frc-time">{flight.arrivalTime}</span>
          </div>
          <div className="frc-airline-name"><span>✈</span> {flight.airline} · {flight.flightNumber}</div>
        </div>
        <div className="frc-fares">
          <button className="frc-fare-btn frc-economy"  onClick={() => onSelectFare(flight, "economy")}>
            <span className="frc-fare-label">Economy</span>
            <span className="frc-fare-from">From</span>
            <span className="frc-fare-price">£{flight.price}</span>
          </button>
          <button className="frc-fare-btn frc-business" onClick={() => onSelectFare(flight, "business")}>
            <span className="frc-fare-label">Business</span>
            <span className="frc-fare-from">From</span>
            <span className="frc-fare-price">£{Math.round(flight.price * 2.8)}</span>
          </button>
        </div>
      </div>
      <button className="frc-details-toggle" onClick={() => setExpanded(e => !e)}>
        <span>{expanded ? "▲" : "▼"}</span> Flight details
      </button>
      {expanded && (
        <div className="frc-details">
          <div className="frc-detail-row"><span className="frc-detail-label">Flight number</span><span>{flight.flightNumber}</span></div>
          <div className="frc-detail-row"><span className="frc-detail-label">Aircraft</span><span>Airbus A320</span></div>
          <div className="frc-detail-row"><span className="frc-detail-label">Date</span><span>{flight.departureDate}</span></div>
          <div className="frc-detail-row"><span className="frc-detail-label">Available seats</span><span>{flight.availableSeats ?? "—"}</span></div>
          <div className="frc-detail-row"><span className="frc-detail-label">Stops</span><span>{stopsLabel}</span></div>
        </div>
      )}
    </div>
  );
}

// ── Outbound or Return flight list ────────────────────────
function FlightList({ from, to, date, searchParams, fareModal, setFareModal }) {
  const [activeDate,  setActiveDate]  = useState(date);
  const [sortBy,      setSortBy]      = useState("recommended");
  const [filterStops, setFilterStops] = useState("all");
  const [filterMax,   setFilterMax]   = useState(9999);

  const queryParams = { ...searchParams, from, to, departureDate: activeDate };
  const { flights, loading, error } = useFlights(queryParams);

  let displayed = [...flights];
  if (filterStops === "direct") displayed = displayed.filter(f => f.stops === 0);
  if (filterStops === "1stop")  displayed = displayed.filter(f => f.stops === 1);
  if (filterStops === "2plus")  displayed = displayed.filter(f => f.stops >= 2);
  displayed = displayed.filter(f => f.price <= filterMax);
  if (sortBy === "price")     displayed.sort((a, b) => a.price - b.price);
  if (sortBy === "duration")  displayed.sort((a, b) => a.duration?.localeCompare(b.duration));
  if (sortBy === "departure") displayed.sort((a, b) => a.departureTime?.localeCompare(b.departureTime));

  const directCount = flights.filter(f => f.stops === 0).length;

  return (
    <>
      <DatePriceBar from={from} to={to} selectedDate={activeDate} onDateChange={setActiveDate} />

      <div className="results-controls">
        <div className="results-filters">
          <span className="controls-label">Filter by:</span>
          <select className="results-select" value={filterStops} onChange={e => setFilterStops(e.target.value)}>
            <option value="all">All flights</option>
            <option value="direct">Direct only</option>
            <option value="1stop">1 stop</option>
            <option value="2plus">2+ stops</option>
          </select>
          <select className="results-select" onChange={e => setFilterMax(Number(e.target.value))}>
            <option value="9999">Any price</option>
            <option value="100">Up to £100</option>
            <option value="200">Up to £200</option>
            <option value="300">Up to £300</option>
            <option value="500">Up to £500</option>
          </select>
        </div>
        <div className="results-sort">
          <span className="controls-label">Sort by:</span>
          <select className="results-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="recommended">Recommended</option>
            <option value="price">Lowest price</option>
            <option value="duration">Shortest duration</option>
            <option value="departure">Earliest departure</option>
          </select>
        </div>
      </div>

      {loading && <LoadingSpinner message="Searching for flights…" />}
      {error   && <ErrorMessage message={error} />}

      {!loading && !error && (
        <>
          {displayed.length > 0 && (
            <p className="results-count">
              <strong>{displayed.length}</strong> flight{displayed.length !== 1 ? "s" : ""} found
              {directCount > 0 && <span className="direct-badge"> · {directCount} direct</span>}
            </p>
          )}
          {displayed.length === 0 && (
            <div className="no-results-card">
              <span className="no-results-icon">✈</span>
              <h3>No flights found</h3>
              <p>Try adjusting your filters or selecting a different date above.</p>
            </div>
          )}
          <div className="frc-list">
            {displayed.map(flight => (
              <FlightResultCard
                key={flight.id}
                flight={flight}
                onSelectFare={(f, cabin) => setFareModal({ flight: f, cabin })}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}

// ── Outbound selection summary banner ─────────────────────
function OutboundSummary({ flight }) {
  return (
    <div className="outbound-summary-bar">
      <div className="osb-label">✓ Outbound selected</div>
      <div className="osb-route">
        <span className="osb-code">{flight.from}</span>
        <span className="osb-arrow">→</span>
        <span className="osb-code">{flight.to}</span>
      </div>
      <div className="osb-meta">
        {flight.departureTime} · {flight.flightNumber} · {flight.travelClass === "business" ? "✦ Business" : "Economy"} · {flight.selectedFare?.label}
      </div>
      <div className="osb-price">£{flight.totalPrice}</div>
    </div>
  );
}

// ── Main FlightResultsPage ────────────────────────────────
export function FlightResultsPage({ searchParams, onNavigate, onSelectFlight }) {
  const isReturn     = searchParams?.tripType === "round-trip";
  const [phase, setPhase] = useState("outbound"); // "outbound" | "return"
  const [outboundFlight, setOutboundFlight] = useState(null);
  const [fareModal, setFareModal] = useState(null);

  const from     = searchParams?.from || "?";
  const to       = searchParams?.to   || "?";
  const paxCount = (Number(searchParams?.adults) || 1) + (Number(searchParams?.children) || 0);

  const outboundDate = searchParams?.departureDate || "";
  // If no return date was selected in the search form, default to the day after departure
  const returnDate = searchParams?.returnDate || (outboundDate ? addDays(outboundDate, 1) : "");

  const stepIndex = phase === "return" ? 1 : 0;

  function handleFareSelected(flightWithFare) {
    setFareModal(null);
    if (isReturn && phase === "outbound") {
      setOutboundFlight(flightWithFare);
      setPhase("return");
      window.scrollTo(0, 0);
    } else if (isReturn && phase === "return") {
      // Combine outbound + return into one object for the booking flow
      onSelectFlight({ ...outboundFlight, returnFlight: flightWithFare });
    } else {
      onSelectFlight(flightWithFare);
    }
  }

  const summaryDateStr = outboundDate ? formatDateLabel(outboundDate) : "";
  const returnDateStr  = returnDate   ? formatDateLabel(returnDate)   : "";

  return (
    <div className="results-page">
      <div className="results-stepper-bar">
        <ProgressBar currentStep={stepIndex} />
      </div>

      <div className="results-summary-bar">
        <div className="rsb-route">
          <span className="rsb-code">{from}</span>
          <span className="rsb-swap">⇄</span>
          <span className="rsb-code">{to}</span>
        </div>
        <div className="rsb-divider" />
        <span className="rsb-meta">
          {summaryDateStr}{isReturn && returnDateStr ? ` – ${returnDateStr}` : ""}
        </span>
        <div className="rsb-divider" />
        <span className="rsb-meta">{paxCount} passenger{paxCount !== 1 ? "s" : ""}</span>
        <button className="rsb-edit" onClick={() => onNavigate("home")}>Edit search</button>
      </div>

      <div className="results-body">
        <button className="back-link" onClick={() => {
          if (phase === "return") { setPhase("outbound"); setOutboundFlight(null); }
          else onNavigate("home");
        }}>
          ← {phase === "return" ? "Back to outbound flights" : "Back to Homepage"}
        </button>

        <h1 className="results-title">
          {phase === "return" ? "Return flight" : isReturn ? "Outbound flight" : "Available flights"}
        </h1>
        <p className="results-subtitle">Prices are per adult, including all taxes, fees and carrier charges.</p>

        {/* Show outbound summary when picking return */}
        {phase === "return" && outboundFlight && (
          <OutboundSummary flight={outboundFlight} />
        )}

        <FlightList
          key={phase} // remount when phase changes so date bar resets
          from={phase === "return" ? to   : from}
          to={phase   === "return" ? from : to}
          date={phase === "return" ? returnDate : outboundDate}
          searchParams={searchParams}
          fareModal={fareModal}
          setFareModal={setFareModal}
        />
      </div>

      {fareModal && (
        <FareTierModal
          flight={fareModal.flight}
          initialCabin={fareModal.cabin}
          onSelect={handleFareSelected}
          onClose={() => setFareModal(null)}
        />
      )}
    </div>
  );
}
