import { useState } from "react";
import { cancelBooking, checkIn, getBookingByRef, modifyBooking } from "../services/api";
import { LoadingSpinner, ErrorMessage } from "../components/StatusMessages";

function formatRequestType(type) {
  if (!type) return "General request";
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatRequestStatus(status) {
  if (!status) return "Pending";
  return status.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ManageBookingPage() {
  const [ref, setRef] = useState("");
  const [lastName, setLastName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [booking, setBooking] = useState(null);
  const [activeAction, setActiveAction] = useState(null);
  const [requestText, setRequestText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [boardingPass, setBoardingPass] = useState(null);

  const bookingStatus = booking?.status || "Confirmed";
  const requestHistory = booking?.requestHistory || [];
  const hasPendingDateChange = requestHistory.some(
    (entry) => entry.requestType === "date_change" && entry.status?.toLowerCase() === "pending"
  );
  const hasPendingExtras = requestHistory.some(
    (entry) => entry.requestType === "extra_request" && entry.status?.toLowerCase() === "pending"
  );
  const isCancelled = bookingStatus === "Cancelled";
  const isCheckedIn = bookingStatus === "CheckedIn";
  const actionDisabledState = {
    "modify-date": !booking || isCancelled || hasPendingDateChange,
    "add-extras": !booking || isCancelled || hasPendingExtras,
    checkin: !booking || isCancelled || isCheckedIn,
    cancel: !booking || isCancelled || isCheckedIn,
  };
  const actionDisabledReason = {
    "modify-date": isCancelled
      ? "This booking has already been cancelled."
      : hasPendingDateChange
        ? "A date change request is already pending review."
        : "",
    "add-extras": isCancelled
      ? "This booking has already been cancelled."
      : hasPendingExtras
        ? "An extras request is already pending review."
        : "",
    checkin: isCancelled
      ? "Cancelled bookings cannot be checked in."
      : isCheckedIn
        ? "This booking has already been checked in."
        : "",
    cancel: isCancelled
      ? "This booking has already been cancelled."
      : isCheckedIn
        ? "Checked-in bookings can no longer be cancelled online."
        : "",
  };

  async function handleLookup(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setBooking(null);
    setActionMessage(null);
    setBoardingPass(null);

    try {
      const data = await getBookingByRef(ref, lastName);
      setBooking(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function refreshBooking() {
    if (!ref.trim() || !lastName.trim()) return;
    const data = await getBookingByRef(ref, lastName);
    setBooking(data);
  }

  async function handleSubmitAction() {
    if (!booking) return;

    setActionLoading(true);
    setError(null);
    setActionMessage(null);
    setBoardingPass(null);

    try {
      if (activeAction === "modify-date") {
        await modifyBooking(booking.id, {
          requestType: "date_change",
          description: requestText.trim() || "Requested a new travel date.",
        });
        await refreshBooking();
        setActionMessage("Date change request submitted.");
      } else if (activeAction === "add-extras") {
        await modifyBooking(booking.id, {
          requestType: "extra_request",
          description: requestText.trim() || "Requested additional extras.",
        });
        await refreshBooking();
        setActionMessage("Extras request submitted.");
      } else if (activeAction === "cancel") {
        if (!requestText.trim()) {
          throw new Error("Please provide a cancellation reason.");
        }
        const updatedBooking = await cancelBooking(booking.id, { reason: requestText.trim() });
        setBooking(updatedBooking);
        setActionMessage("Booking cancelled.");
      } else if (activeAction === "checkin") {
        const pass = await checkIn(booking.id);
        await refreshBooking();
        setBoardingPass(pass);
        setActionMessage("Check-in completed.");
      }

      if (activeAction !== "checkin") {
        setRequestText("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  function openAction(action) {
    if (actionDisabledState[action]) {
      setError(actionDisabledReason[action] || "This action is not available right now.");
      setActionMessage(null);
      return;
    }

    setActiveAction(action);
    setRequestText("");
    setActionMessage(null);
    setBoardingPass(null);
    setError(null);
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
            <div><span>Departure</span><strong>{booking.flight?.departureDate} · {booking.flight?.departureTime}</strong></div>
            {booking.cancellationReason && (
              <div><span>Cancellation Reason</span><strong>{booking.cancellationReason}</strong></div>
            )}
          </div>
          {(isCancelled || isCheckedIn || hasPendingDateChange || hasPendingExtras) && (
            <div className="manage-status-banner">
              <strong>Action availability updated</strong>
              <p>
                {isCancelled && "This booking is cancelled, so online changes are now locked."}
                {!isCancelled && isCheckedIn && "This booking is already checked in, so cancellation is locked."}
                {!isCancelled && !isCheckedIn && (hasPendingDateChange || hasPendingExtras) &&
                  "You already have a pending request, so duplicate requests are disabled until it is reviewed."}
              </p>
            </div>
          )}
          <div className="manage-actions">
            <button className={`action-btn ${activeAction === "modify-date" ? "action-btn--active" : ""}`} type="button" onClick={() => openAction("modify-date")} disabled={actionDisabledState["modify-date"]}>Modify Date</button>
            <button className={`action-btn ${activeAction === "add-extras" ? "action-btn--active" : ""}`} type="button" onClick={() => openAction("add-extras")} disabled={actionDisabledState["add-extras"]}>Add Extras</button>
            <button className={`action-btn checkin-btn ${activeAction === "checkin" ? "action-btn--active" : ""}`} type="button" onClick={() => openAction("checkin")} disabled={actionDisabledState.checkin}>Check In</button>
            <button className={`action-btn cancel-action-btn ${activeAction === "cancel" ? "action-btn--active" : ""}`} type="button" onClick={() => openAction("cancel")} disabled={actionDisabledState.cancel}>Cancel Flight</button>
          </div>

          <div className="manage-action-help-grid">
            <p className="manage-action-help">{actionDisabledReason["modify-date"] || "Submit a request to move this trip to a different date."}</p>
            <p className="manage-action-help">{actionDisabledReason["add-extras"] || "Request baggage, seats, or other extras for this booking."}</p>
            <p className="manage-action-help">{actionDisabledReason.checkin || "Generate your boarding pass once you're ready to travel."}</p>
            <p className="manage-action-help">{actionDisabledReason.cancel || "Cancel this booking and record the reason for your report history."}</p>
          </div>

          {activeAction && activeAction !== "checkin" && (
            <div className="manage-action-panel">
              <h4>
                {activeAction === "modify-date" && "Request a date change"}
                {activeAction === "add-extras" && "Request extras"}
                {activeAction === "cancel" && "Cancel this booking"}
              </h4>
              <textarea
                className="manage-action-textarea"
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                autoFocus
                rows={5}
                placeholder={
                  activeAction === "cancel"
                    ? "Tell us why you are cancelling this booking"
                    : "Add a short note for your request"
                }
              />
              <div className="manage-action-buttons">
                <button type="button" className="flow-back-btn" onClick={() => setActiveAction(null)}>Close</button>
                <button type="button" className="flow-next-btn" onClick={handleSubmitAction} disabled={actionLoading}>
                  {actionLoading ? "Submitting..." : activeAction === "cancel" ? "Confirm cancellation" : "Submit request"}
                </button>
              </div>
            </div>
          )}

          {activeAction === "checkin" && (
            <div className="manage-action-panel">
              <h4>Check in for your flight</h4>
              <p>You can generate your boarding pass now.</p>
              <div className="manage-action-buttons">
                <button type="button" className="flow-back-btn" onClick={() => setActiveAction(null)}>Close</button>
                <button type="button" className="flow-next-btn" onClick={handleSubmitAction} disabled={actionLoading}>
                  {actionLoading ? "Checking in..." : "Generate boarding pass"}
                </button>
              </div>
            </div>
          )}

          {actionMessage && <div className="confirmation-banner" style={{ marginTop: "1rem" }}><p>{actionMessage}</p></div>}

          <div className="manage-history-card">
            <div className="manage-history-header">
              <h3>Request History</h3>
              <p>Track every cancellation and change request for this booking.</p>
            </div>
            {requestHistory.length === 0 ? (
              <p className="manage-history-empty">No changes have been requested for this booking yet.</p>
            ) : (
              <div className="manage-history-list">
                {requestHistory.map((entry) => (
                  <div key={entry.id} className="manage-history-item">
                    <div className="manage-history-item-top">
                      <strong>{formatRequestType(entry.requestType)}</strong>
                      <span className={`status-badge status-${entry.status?.toLowerCase() || "pending"}`}>
                        {formatRequestStatus(entry.status)}
                      </span>
                    </div>
                    <p>{entry.description || "No extra notes were provided for this request."}</p>
                    <span className="manage-history-date">
                      {new Date(entry.createdAt).toLocaleString("en-GB")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {boardingPass && (
            <div className="booking-detail-card" style={{ marginTop: "1rem" }}>
              <h3>Boarding Pass</h3>
              <div className="detail-grid">
                <div><span>Reference</span><strong>{boardingPass.bookingReference}</strong></div>
                <div><span>Seat</span><strong>{boardingPass.seat}</strong></div>
                <div><span>Gate</span><strong>{boardingPass.gate}</strong></div>
                <div><span>Boarding Time</span><strong>{boardingPass.boardingTime}</strong></div>
                <div><span>Status</span><strong>{boardingPass.status}</strong></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
