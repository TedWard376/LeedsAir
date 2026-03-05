import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createBooking, login, register } from "../services/api";

// KEY ARCHITECTURE: ALL step content rendered as direct JSX inside one
// component body. Never define step sub-components (StepPassenger etc.)
// as inner functions — React treats them as new types each render,
// unmounts+remounts them, and destroys input focus after every keystroke.

const FLOW_STEPS = ["Flight summary", "Passenger details", "Seats", "Extras", "Review & Pay"];

function FlowStepper({ step }) {
  return (
    <div className="flow-stepper">
      {FLOW_STEPS.map((label, i) => (
        <div key={label} className={`flow-step ${i === step ? "active" : ""} ${i < step ? "done" : ""}`}>
          <div className="flow-circle">{i < step ? "✓" : i + 1}</div>
          <span className="flow-label">{label}</span>
          {i < FLOW_STEPS.length - 1 && <div className="flow-line" />}
        </div>
      ))}
    </div>
  );
}

function getSeatPrice(row, col, isBiz) {
  if (isBiz) {
    if (row === 1) return col === "A" || col === "F" ? 55 : 45;
    if (row === 2) return col === "A" || col === "F" ? 45 : 35;
    return 30;
  }
  if (row <= 6)  return col === "A" || col === "F" ? 25 : 18;
  if (row <= 10) return col === "A" || col === "F" ? 20 : 15;
  if (col === "A" || col === "F") return 15;
  if (col === "C" || col === "D") return 8;
  return 6;
}

const TAKEN_SEATS = new Set([
  "4A","4B","5C","6D","7A","7F","8B","8E","9C","10A",
  "11D","12B","13E","14A","15C","16F","17B","18A","19D","20C","1B","2D","3A"
]);
const ROWS_BIZ = [1, 2, 3];
const ROWS_ECO = Array.from({ length: 27 }, (_, i) => i + 4);
const COLS = ["A", "B", "C", "", "D", "E", "F"];

// SeatMap defined at module level — stable identity, never remounted
function SeatMap({ selected, onSelect, travelClass }) {
  const isBizBooking = travelClass === "business";
  function renderSeat(row, col) {
    if (!col) return <div key={`aisle-${row}`} className="seat-aisle" />;
    const id = `${row}${col}`;
    const isBiz = row <= 3;
    const isTaken = TAKEN_SEATS.has(id);
    const isLocked = isBizBooking ? !isBiz : isBiz;
    const price = getSeatPrice(row, col, isBiz);
    const isSel = selected === id;
    let tier = "";
    if (!isBiz) {
      if (row <= 6) tier = "seat-front";
      else if (col === "A" || col === "F") tier = "seat-window";
      else if (col === "C" || col === "D") tier = "seat-aisle-seat";
    }
    return (
      <button key={id} type="button" disabled={isTaken || isLocked}
        className={["seat", isBiz ? "seat-biz" : "seat-eco",
          isTaken ? "seat-taken" : isLocked ? "seat-locked" : "seat-free",
          tier, isSel ? "seat-sel" : ""].filter(Boolean).join(" ")}
        title={isLocked ? "Not available for your ticket class" : isTaken ? "Already taken" : `${id} — +£${price}`}
        onClick={() => !isTaken && !isLocked && onSelect(isSel ? null : id)}>
        {isSel ? "✓" : col}
      </button>
    );
  }
  return (
    <div className="seat-map-wrap">
      <div className="seat-legend seat-legend--top">
        {isBizBooking ? (<>
          <span className="legend-item"><span className="seat seat-free seat-biz legend-demo" />Row 1 window £55</span>
          <span className="legend-item"><span className="seat seat-free seat-biz legend-demo" />Row 2 £35–45</span>
          <span className="legend-item"><span className="seat seat-free seat-biz legend-demo" />Row 3 £30</span>
        </>) : (<>
          <span className="legend-item"><span className="seat seat-free seat-front legend-demo" />Front £18–25</span>
          <span className="legend-item"><span className="seat seat-free seat-window legend-demo" />Window £15</span>
          <span className="legend-item"><span className="seat seat-free seat-aisle-seat legend-demo" />Aisle £8</span>
          <span className="legend-item"><span className="seat seat-free seat-eco legend-demo" />Middle £6</span>
        </>)}
        <span className="legend-item"><span className="seat seat-taken legend-demo" />Taken</span>
        <span className="legend-item"><span className="seat seat-locked legend-demo" />Not your class</span>
      </div>
      <div className="seat-map">
        <div className="seat-col-headers">
          <span className="seat-row-num" />
          {COLS.map((col, i) => col ? <span key={i} className="seat-col-hdr">{col}</span> : <span key={i} className="seat-aisle" />)}
        </div>
        <div className={`cabin-label cabin-biz-label ${!isBizBooking ? "cabin-locked-label" : ""}`}>
          ✦ Business Class {!isBizBooking && "— Economy ticket only"}
        </div>
        {ROWS_BIZ.map(row => (
          <div key={row} className="seat-row">
            <span className="seat-row-num">{row}</span>
            {COLS.map((col, ci) => renderSeat(row, col))}
          </div>
        ))}
        <div className="cabin-divider"><span>Economy Class {isBizBooking && "— Business ticket only"}</span></div>
        {ROWS_ECO.map(row => (
          <div key={row} className="seat-row">
            <span className="seat-row-num">{row}</span>
            {COLS.map((col, ci) => renderSeat(row, col))}
          </div>
        ))}
      </div>
    </div>
  );
}

const EXTRAS_LIST = [
  { id: "bag20",     label: "Extra 20kg hold bag",  price: 35, icon: "🧳" },
  { id: "bag32",     label: "Extra 32kg hold bag",  price: 55, icon: "🧳" },
  { id: "priority",  label: "Priority boarding",     price: 12, icon: "⚡" },
  { id: "legroom",   label: "Extra legroom seat",   price: 25, icon: "💺" },
  { id: "insurance", label: "Travel insurance",     price: 18, icon: "🛡"  },
];

// AuthPanel at module level — stable, won't remount on parent re-render
function AuthPanel({ onAuthComplete }) {
  const { loginUser } = useAuth();
  const [mode,      setMode]      = useState("login");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setError(null);
    try { const d = await login(email, password); loginUser(d.token, d.user); onAuthComplete(d.user); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }
  async function handleRegister(e) {
    e.preventDefault(); setLoading(true); setError(null);
    try { const d = await register({ firstName, lastName, email, password }); loginUser(d.token, d.user); onAuthComplete(d.user); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  }

  return (
    <div className="auth-panel">
      <div className="auth-panel-header">
        <span className="auth-panel-icon">🎁</span>
        <div>
          <h3>Save booking &amp; earn rewards</h3>
          <p>Log in or create a free account to save this booking and earn loyalty points.</p>
        </div>
      </div>
      <div className="auth-panel-tabs">
        <button className={`auth-tab ${mode === "login"    ? "active" : ""}`} onClick={() => setMode("login")}>Log in</button>
        <button className={`auth-tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>Create account</button>
        <button className="auth-tab auth-tab-skip" onClick={() => onAuthComplete(null)}>Continue as guest</button>
      </div>
      {error && <div className="form-error" style={{margin:"0 0 .75rem"}}>⚠ {error}</div>}
      {mode === "login" ? (
        <form onSubmit={handleLogin} className="auth-mini-form">
          <div className="form-group"><label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required /></div>
          <div className="form-group"><label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
          <button className="flow-next-btn" style={{width:"100%",marginTop:".5rem"}} disabled={loading}>
            {loading ? "Logging in…" : "Log in & continue"}</button>
        </form>
      ) : (
        <form onSubmit={handleRegister} className="auth-mini-form">
          <div className="form-row">
            <div className="form-group"><label>First name</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="Jane" /></div>
            <div className="form-group"><label>Last name</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Smith" /></div>
          </div>
          <div className="form-group"><label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required /></div>
          <div className="form-group"><label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required /></div>
          <button className="flow-next-btn" style={{width:"100%",marginTop:".5rem"}} disabled={loading}>
            {loading ? "Creating account…" : "Create account & continue"}</button>
        </form>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────
export function BookingFlowPage({ flight, onNavigate, onComplete }) {
  const { user, loginUser } = useAuth();
  const [step, setStep] = useState(0);

  // Passenger fields — flat top-level state, stable setState refs
  const [pFirstName, setPFirstName] = useState(user?.firstName || "");
  const [pLastName,  setPLastName]  = useState(user?.lastName  || "");
  const [pDob,       setPDob]       = useState("");
  const [pPassport,  setPPassport]  = useState("");
  const [pEmail,     setPEmail]     = useState(user?.email     || "");
  const [pPhone,     setPPhone]     = useState(user?.phone     || "");

  // Card fields — separate to prevent cross-field re-render churn
  const [cardNum,  setCardNum]  = useState("");
  const [cardExp,  setCardExp]  = useState("");
  const [cardCvv,  setCardCvv]  = useState("");
  const [cardName, setCardName] = useState("");

  const [seat,       setSeat]       = useState(null);
  const [extras,     setExtras]     = useState([]);
  const [agreed,     setAgreed]     = useState(false);
  const [authDone,   setAuthDone]   = useState(!!user);
  const [submitting, setSubmitting] = useState(false);
  const [submitErr,  setSubmitErr]  = useState(null);

  const isBiz      = flight?.travelClass === "business";
  const basePrice  = flight?.totalPrice || flight?.price || 0;
  const seatCost   = seat ? getSeatPrice(parseInt(seat.slice(0, -1)), seat.slice(-1), isBiz) : 0;
  const extrasCost = extras.reduce((s, id) => s + (EXTRAS_LIST.find(e => e.id === id)?.price || 0), 0);
  const total      = basePrice + seatCost + extrasCost;

  function toggleExtra(id) {
    setExtras(p => p.includes(id) ? p.filter(e => e !== id) : [...p, id]);
  }

  function handleAuthComplete(u) {
    if (u) {
      if (u.firstName) setPFirstName(u.firstName);
      if (u.lastName)  setPLastName(u.lastName);
      if (u.email)     setPEmail(u.email);
      if (u.phone)     setPPhone(u.phone);
    }
    setAuthDone(true);
  }

  async function handlePay() {
    setSubmitting(true); setSubmitErr(null);
    try {
      const booking = await createBooking({
        flightId: flight.id, travelClass: flight.travelClass,
        seat, extras, totalPrice: total,
        passenger: { firstName: pFirstName, lastName: pLastName, dateOfBirth: pDob,
                     passportNumber: pPassport, email: pEmail, phone: pPhone },
      });
      onComplete(booking);
    } catch (err) { setSubmitErr(err.message); }
    finally { setSubmitting(false); }
  }

  const passengerValid = pFirstName && pLastName && pEmail && pPassport;

  // ── Step 0 ─ Flight Summary ───────────────────────────
  if (step === 0) return (
    <div className="booking-flow-page">
      <div className="booking-flow-stepper-bar"><FlowStepper step={0} /></div>
      <div className="booking-flow-body">
        <div className="flow-step-body">
          <h2 className="flow-step-title">Flight Summary</h2>
          <div className="flow-summary-card">
            <div className="fsc-header">
              <span className="fsc-type">Outbound</span>
              <span className={`fsc-class ${isBiz ? "biz" : ""}`}>{isBiz ? "✦ Business" : "Economy"} · {flight.selectedFare?.label}</span>
            </div>
            <div className="fsc-route">
              <div className="fsc-point"><span className="fsc-code">{flight.from}</span><span className="fsc-time">{flight.departureTime}</span></div>
              <div className="fsc-middle">
                <span className="fsc-dur">{flight.duration}</span>
                <div className="fsc-line-wrap"><div className="fsc-line" /></div>
                <span className="fsc-stops">{flight.stops === 0 ? "Direct" : `${flight.stops} stop`}</span>
              </div>
              <div className="fsc-point fsc-point--right"><span className="fsc-code">{flight.to}</span><span className="fsc-time">{flight.arrivalTime}</span></div>
            </div>
            <div className="fsc-meta"><span>✈ {flight.airline} · {flight.flightNumber}</span><span>{flight.departureDate}</span></div>
          </div>

          {flight.returnFlight && (
            <div className="flow-summary-card" style={{marginTop:"1rem"}}>
              <div className="fsc-header">
                <span className="fsc-type">Return</span>
                <span className={`fsc-class ${flight.returnFlight.travelClass === "business" ? "biz" : ""}`}>
                  {flight.returnFlight.travelClass === "business" ? "✦ Business" : "Economy"} · {flight.returnFlight.selectedFare?.label}
                </span>
              </div>
              <div className="fsc-route">
                <div className="fsc-point"><span className="fsc-code">{flight.returnFlight.from}</span><span className="fsc-time">{flight.returnFlight.departureTime}</span></div>
                <div className="fsc-middle">
                  <span className="fsc-dur">{flight.returnFlight.duration}</span>
                  <div className="fsc-line-wrap"><div className="fsc-line" /></div>
                  <span className="fsc-stops">{flight.returnFlight.stops === 0 ? "Direct" : `${flight.returnFlight.stops} stop`}</span>
                </div>
                <div className="fsc-point fsc-point--right"><span className="fsc-code">{flight.returnFlight.to}</span><span className="fsc-time">{flight.returnFlight.arrivalTime}</span></div>
              </div>
              <div className="fsc-meta"><span>✈ {flight.returnFlight.airline} · {flight.returnFlight.flightNumber}</span><span>{flight.returnFlight.departureDate}</span></div>
            </div>
          )}

          <div className="flow-price-box">
            <div className="fpb-row"><span>Base fare</span><span>£{basePrice}</span></div>
            <div className="fpb-row fpb-muted"><span>Taxes &amp; fees</span><span>Included</span></div>
            <div className="fpb-row fpb-total"><span>Total so far</span><span>£{total}</span></div>
          </div>
          <div className="flow-fare-features">
            <h3>What's included</h3>
            <ul>
              <li>🧳 {flight.selectedFare?.baggage}</li>
              <li>✏️ {flight.selectedFare?.changes}</li>
              <li>💰 {flight.selectedFare?.refund}</li>
            </ul>
          </div>
          <div className="flow-actions">
            <button className="flow-back-btn" onClick={() => onNavigate("results")}>← Modify selection</button>
            <button className="flow-next-btn" onClick={() => setStep(1)}>Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 1 ─ Passenger Details ────────────────────────
  if (step === 1) return (
    <div className="booking-flow-page">
      <div className="booking-flow-stepper-bar"><FlowStepper step={1} /></div>
      <div className="booking-flow-body">
        <div className="flow-step-body">
          <h2 className="flow-step-title">Passenger Details</h2>
          {user && <p className="flow-autofill-note">✓ Details auto-filled from your account</p>}
          <div className="flow-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                <input value={pFirstName} onChange={e => setPFirstName(e.target.value)} placeholder="Jane" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={pLastName} onChange={e => setPLastName(e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={pDob} onChange={e => setPDob(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Passport Number</label>
                <input value={pPassport} onChange={e => setPPassport(e.target.value)} placeholder="GB123456789" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={pEmail} onChange={e => setPEmail(e.target.value)} placeholder="your@email.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="tel" value={pPhone} onChange={e => setPPhone(e.target.value)} placeholder="+44 7700 000000" />
              </div>
            </div>
          </div>
          <div className="flow-actions">
            <button className="flow-back-btn" onClick={() => setStep(0)}>← Back</button>
            <button className="flow-next-btn" onClick={() => setStep(2)} disabled={!passengerValid}>Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 2 ─ Seat Selection ───────────────────────────
  if (step === 2) return (
    <div className="booking-flow-page">
      <div className="booking-flow-stepper-bar"><FlowStepper step={2} /></div>
      <div className="booking-flow-body">
        <div className="flow-step-body">
          <h2 className="flow-step-title">Choose Your Seat</h2>
          <p className="flow-subtitle">
            Booking <strong>{isBiz ? "✦ Business" : "Economy"}</strong> — only {isBiz ? "Business" : "Economy"} seats available. All seats carry an additional cost.
          </p>
          {seat && <p className="flow-seat-chosen">✓ Seat <strong>{seat}</strong> selected — +£{getSeatPrice(parseInt(seat.slice(0,-1)), seat.slice(-1), isBiz)}</p>}
          <SeatMap selected={seat} onSelect={setSeat} travelClass={flight.travelClass} />
          <div className="flow-actions">
            <button className="flow-back-btn" onClick={() => setStep(1)}>← Back</button>
            <button className="flow-skip-btn" onClick={() => { setSeat(null); setStep(3); }}>Skip (auto-assign at check-in)</button>
            <button className="flow-next-btn" onClick={() => setStep(3)}>Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 3 ─ Extras ───────────────────────────────────
  if (step === 3) return (
    <div className="booking-flow-page">
      <div className="booking-flow-stepper-bar"><FlowStepper step={3} /></div>
      <div className="booking-flow-body">
        <div className="flow-step-body">
          <h2 className="flow-step-title">Add Extras</h2>
          <p className="flow-subtitle">Enhance your journey with optional add-ons.</p>
          <div className="extras-grid">
            {EXTRAS_LIST.map(extra => {
              const checked = extras.includes(extra.id);
              return (
                <div key={extra.id} className={`extra-card ${checked ? "extra-card--selected" : ""}`} onClick={() => toggleExtra(extra.id)}>
                  <span className="extra-icon">{extra.icon}</span>
                  <div className="extra-info">
                    <span className="extra-label">{extra.label}</span>
                    <span className="extra-price">+£{extra.price}</span>
                  </div>
                  <div className={`extra-check ${checked ? "checked" : ""}`}>{checked ? "✓" : "+"}</div>
                </div>
              );
            })}
          </div>
          <div className="flow-running-total">Running total: <strong>£{total}</strong></div>
          <div className="flow-actions">
            <button className="flow-back-btn" onClick={() => setStep(2)}>← Back</button>
            <button className="flow-next-btn" onClick={() => setStep(4)}>Continue →</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Step 4 ─ Review & Pay ─────────────────────────────
  return (
    <div className="booking-flow-page">
      <div className="booking-flow-stepper-bar"><FlowStepper step={4} /></div>
      <div className="booking-flow-body">
        <div className="flow-step-body">
          <h2 className="flow-step-title">Review &amp; Pay</h2>

          {!authDone && <AuthPanel onAuthComplete={handleAuthComplete} />}
          {!authDone && (
            <div className="flow-actions" style={{marginTop:"1rem"}}>
              <button className="flow-back-btn" onClick={() => setStep(3)}>← Back</button>
            </div>
          )}

          {authDone && user && (
            <div className="auth-success-banner">
              🎉 Logged in as <strong>{user.firstName} {user.lastName}</strong> — booking saved &amp; you'll earn <strong>{Math.round(total)} loyalty points</strong>!
            </div>
          )}

          {authDone && (
            <>
              <div className="review-section">
                <h3>Flight</h3>
                <div className="review-row"><span>Route</span><span>{flight.from} → {flight.to}</span></div>
                <div className="review-row"><span>Flight</span><span>{flight.flightNumber}</span></div>
                <div className="review-row"><span>Departure</span><span>{flight.departureDate} · {flight.departureTime}</span></div>
                <div className="review-row"><span>Class</span><span>{isBiz ? "✦ Business" : "Economy"} · {flight.selectedFare?.label}</span></div>
                {flight.returnFlight && <>
                  <div className="review-row"><span>Return flight</span><span>{flight.returnFlight.flightNumber}</span></div>
                  <div className="review-row"><span>Return</span><span>{flight.returnFlight.departureDate} · {flight.returnFlight.departureTime}</span></div>
                </>}
              </div>

              <div className="review-section">
                <h3>Passenger</h3>
                <div className="review-row"><span>Name</span><span>{pFirstName} {pLastName}</span></div>
                <div className="review-row"><span>Email</span><span>{pEmail}</span></div>
                <div className="review-row"><span>Passport</span><span>{pPassport}</span></div>
              </div>

              {seat && (
                <div className="review-section">
                  <h3>Seat</h3>
                  <div className="review-row"><span>Seat</span><span>{seat} (+£{getSeatPrice(parseInt(seat.slice(0,-1)), seat.slice(-1), isBiz)})</span></div>
                </div>
              )}

              {extras.length > 0 && (
                <div className="review-section">
                  <h3>Extras</h3>
                  {extras.map(id => { const ex = EXTRAS_LIST.find(e => e.id === id); return ex ? <div key={id} className="review-row"><span>{ex.label}</span><span>+£{ex.price}</span></div> : null; })}
                </div>
              )}

              <div className="review-section review-total-section">
                <div className="review-row"><span>Base fare</span><span>£{basePrice}</span></div>
                {seat && <div className="review-row"><span>Seat ({seat})</span><span>+£{seatCost}</span></div>}
                {extrasCost > 0 && <div className="review-row"><span>Extras</span><span>+£{extrasCost}</span></div>}
                <div className="review-row review-row--total"><span>Total</span><span>£{total}</span></div>
              </div>

              <div className="payment-section">
                <h3>Payment</h3>
                <div className="form-row">
                  <div className="form-group" style={{flex:2}}>
                    <label>Card number</label>
                    <input value={cardNum} onChange={e => setCardNum(e.target.value)} placeholder="1234 5678 9012 3456" />
                  </div>
                  <div className="form-group">
                    <label>Expiry</label>
                    <input value={cardExp} onChange={e => setCardExp(e.target.value)} placeholder="MM / YY" />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input type="password" value={cardCvv} onChange={e => setCardCvv(e.target.value)} placeholder="123" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Name on card</label>
                  <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="As it appears on your card" />
                </div>
                <div className="payment-secure-note">🔒 Secured with 3D Secure &amp; PCI-DSS encryption</div>
              </div>

              <label className="tcs-label">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} />
                <span>I agree to the <span className="link-btn">Terms &amp; Conditions</span> and <span className="link-btn">Privacy Policy</span></span>
              </label>

              {submitErr && <div className="form-error">⚠ {submitErr}</div>}

              <div className="flow-actions">
                <button className="flow-back-btn" onClick={() => setStep(3)}>← Back</button>
                <button className="flow-pay-btn" onClick={handlePay} disabled={!agreed || submitting}>
                  {submitting ? "Processing…" : `Pay £${total}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}