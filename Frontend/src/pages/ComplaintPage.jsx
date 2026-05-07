import { useState } from "react";
import { submitComplaint } from "../services/api";

const CATEGORIES = [
  "Flight delay / cancellation",
  "Baggage issue",
  "Seat problem",
  "Staff conduct",
  "Booking error",
  "Refund not received",
  "Check-in issue",
  "Other",
];

export function ComplaintPage() {
  const [form, setForm] = useState({
    bookingReference: "",
    category: "",
    description: "",
  });
  const [selectedFileName, setSelectedFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // File would be sent as FormData in a real integration
      const data = await submitComplaint(form);
      setConfirmation(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (confirmation) {
    return (
      <div className="page">
        <div className="page-header">
          <h1>Complaint Submitted</h1>
        </div>
        <div className="confirmation-card">
          <div className="confirm-check">✓</div>
          <h2>We've received your complaint</h2>
          <p>Your reference number is:</p>
          <code className="confirm-ref">{confirmation.confirmationNumber || confirmation.id}</code>
          <p className="confirm-note">
            We aim to respond within 5 working days. You can track the status of your complaint
            using the reference above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Submit a Complaint</h1>
        <p>We're sorry to hear about your experience. Please fill in the form below.</p>
      </div>

      <div className="form-page-body">
        <form className="complaint-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Booking Reference</label>
            <input
              name="bookingReference"
              placeholder="e.g. ABC123"
              value={form.bookingReference}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Issue Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              placeholder="Please describe the issue in as much detail as possible..."
              value={form.description}
              onChange={handleChange}
              required
              rows={6}
            />
          </div>

          <div className="form-group">
            <label>Supporting Document (optional)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name || "")}
              className="file-input"
            />
            <span className="file-hint">PDF, JPG or PNG, max 5MB</span>
            {selectedFileName && <span className="file-hint">Selected: {selectedFileName}</span>}
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <button type="submit" className="search-btn" disabled={loading}>
            {loading ? "Submitting..." : "Submit Complaint"}
          </button>
        </form>
      </div>
    </div>
  );
}
