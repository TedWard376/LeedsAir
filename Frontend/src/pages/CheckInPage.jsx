import { useEffect, useState } from "react";
import { getBookingByRef, checkIn } from "../services/api";
import { LoadingSpinner } from "../components/StatusMessages";

export function CheckInPage({ initialLookup, onLookupConsumed }) {
  const [step, setStep] = useState("lookup"); // lookup | confirm | boarding
  const [ref, setRef] = useState("");
  const [lastName, setLastName] = useState("");
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [boardingPass, setBoardingPass] = useState(null);

  useEffect(() => {
    if (!initialLookup?.ref || !initialLookup?.lastName) return;

    setRef(initialLookup.ref);
    setLastName(initialLookup.lastName);
    setLoading(true);
    setError(null);

    getBookingByRef(initialLookup.ref, initialLookup.lastName)
      .then((data) => {
        setBooking(data);
        setStep("confirm");
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        setLoading(false);
        onLookupConsumed?.();
      });
  }, [initialLookup, onLookupConsumed]);

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await getBookingByRef(ref, lastName);
      setBooking(data);
      setStep("confirm");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckIn() {
    setLoading(true);
    setError(null);
    try {
      const bp = await checkIn(booking.id);
      setBoardingPass(bp);
      setStep("boarding");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (step === "boarding") {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Check-In Complete</h1>
        </div>
        <div className="boarding-pass">
          <div className="bp-header">
            <span className="bp-airline">✈ LeedsAir</span>
            <span className="bp-label">BOARDING PASS</span>
          </div>
          <div className="bp-route">
            <div className="bp-airport">
              <span className="bp-code">{booking.flight?.from || booking.from}</span>
              <span className="bp-city">Departure</span>
            </div>
            <div className="bp-arrow">→</div>
            <div className="bp-airport">
              <span className="bp-code">{booking.flight?.to || booking.to}</span>
              <span className="bp-city">Arrival</span>
            </div>
          </div>
          <div className="bp-details">
            <div className="bp-detail">
              <span>Passenger</span>
              <strong>{booking.passenger?.firstName} {booking.passenger?.lastName}</strong>
            </div>
            <div className="bp-detail">
              <span>Flight</span>
              <strong>{booking.flight?.flightNumber || "—"}</strong>
            </div>
            <div className="bp-detail">
              <span>Departure</span>
              <strong>{booking.flight?.departureTime || "—"}</strong>
            </div>
            <div className="bp-detail">
              <span>Seat</span>
              <strong>{boardingPass?.seat || booking.seat || "—"}</strong>
            </div>
            <div className="bp-detail">
              <span>Gate</span>
              <strong>{boardingPass?.gate || "—"}</strong>
            </div>
            <div className="bp-detail">
              <span>Boarding</span>
              <strong>{boardingPass?.boardingTime || "—"}</strong>
            </div>
          </div>
          <div className="bp-barcode">
            <div className="barcode-mock">
              {Array.from({ length: 40 }).map((_, i) => (
                <div
                  key={i}
                  className="barcode-bar"
                  style={{ height: `${30 + Math.random() * 30}px` }}
                />
              ))}
            </div>
            <span className="bp-ref">{booking.bookingReference || booking.id}</span>
          </div>
          <div className="bp-actions">
            <button className="confirm-btn" onClick={() => window.print()}>
              🖨 Print Boarding Pass
            </button>
            <button className="action-btn" onClick={() => alert("Email sent!")}>
              📧 Email to me
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Online Check-In</h1>
        <p>Check in between 24 and 48 hours before your departure.</p>
      </div>

      <div className="form-page-body">
        {step === "lookup" && (
          <form className="manage-lookup-form" onSubmit={handleLookup}>
            <div className="form-group">
              <label htmlFor="checkin-booking-reference">Booking Reference</label>
              <input
                id="checkin-booking-reference"
                placeholder="e.g. ABC123"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="checkin-last-name">Last Name</label>
              <input
                id="checkin-last-name"
                placeholder="Passenger surname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
            {error && <div className="form-error">⚠ {error}</div>}
            <button type="submit" className="search-btn" disabled={loading}>
              {loading ? "Finding booking..." : "Find My Booking"}
            </button>
          </form>
        )}

        {loading && step === "confirm" && <LoadingSpinner />}

        {step === "confirm" && booking && (
          <div className="checkin-confirm">
            <h2>Please confirm your details</h2>
            <div className="detail-grid">
              <div><span>Passenger</span><strong>{booking.passenger?.firstName} {booking.passenger?.lastName}</strong></div>
              <div><span>Route</span><strong>{booking.flight?.from || booking.from} → {booking.flight?.to || booking.to}</strong></div>
              <div><span>Flight</span><strong>{booking.flight?.flightNumber || "—"}</strong></div>
              <div><span>Departure</span><strong>{booking.flight?.departureTime || "—"}</strong></div>
              <div><span>Seat</span><strong>{booking.seat || "Auto-assigned"}</strong></div>
              <div><span>Class</span><strong>{booking.travelClass || "Economy"}</strong></div>
            </div>
            {error && <div className="form-error">⚠ {error}</div>}
            <div className="form-actions">
              <button className="cancel-btn" onClick={() => setStep("lookup")}>Back</button>
              <button className="confirm-btn" onClick={handleCheckIn} disabled={loading}>
                {loading ? "Checking in..." : "Confirm Check-In"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
