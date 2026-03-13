import { SearchForm } from "../components/SearchForm";

export function HomePage({ onSearch, confirmedBooking, onDismissConfirmation }) {
  return (
    <div className="page home-page">
      <div className="hero">
        <h1 className="hero-title">Where will you fly next?</h1>
        <p className="hero-subtitle">Search hundreds of routes. Book in minutes.</p>
        <SearchForm onSearch={onSearch} />
      </div>

      {/* Popular destinations teaser */}
      <div className="home-destinations">
        <h2 className="home-section-title">Popular destinations</h2>
        <div className="dest-grid">
          {[
            { city: "Barcelona", code: "BCN", price: 89,  flag: "🇪🇸" },
            { city: "Amsterdam", code: "AMS", price: 65,  flag: "🇳🇱" },
            { city: "Dubai",     code: "DXB", price: 299, flag: "🇦🇪" },
            { city: "Paris",     code: "CDG", price: 74,  flag: "🇫🇷" },
          ].map(d => (
            <div key={d.code} className="dest-card">
              <span className="dest-flag">{d.flag}</span>
              <div className="dest-info">
                <span className="dest-city">{d.city}</span>
                <span className="dest-code">{d.code}</span>
              </div>
              <span className="dest-price">from £{d.price}</span>
            </div>
          ))}
        </div>
      </div>

      {confirmedBooking && (
        <div className="confirmation-banner" style={{ maxWidth: 900, margin: "2rem auto", marginLeft: "1.5rem", marginRight: "1.5rem" }}>
          <span className="confirm-icon">✓</span>
          <div>
            <strong>Booking confirmed!</strong>
            <p>Reference: <code>{confirmedBooking.bookingReference || confirmedBooking.id}</code></p>
            <p>Confirmation email sent to {confirmedBooking.passenger?.email}.</p>
          </div>
          <button className="dismiss-btn" onClick={onDismissConfirmation}>×</button>
        </div>
      )}
    </div>
  );
}