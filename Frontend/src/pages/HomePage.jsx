import { useState, useEffect } from "react";
import { SearchForm } from "../components/SearchForm";
import { adminGetReports, getFlights } from "../services/api";

// Airport lookup — same list as SearchForm so codes resolve correctly
const AIRPORTS = {
  LBA: { city: "Leeds",       flag: "🇬🇧" },
  LHR: { city: "London",      flag: "🇬🇧" },
  LGW: { city: "London",      flag: "🇬🇧" },
  MAN: { city: "Manchester",  flag: "🇬🇧" },
  EDI: { city: "Edinburgh",   flag: "🇬🇧" },
  BHX: { city: "Birmingham",  flag: "🇬🇧" },
  BRS: { city: "Bristol",     flag: "🇬🇧" },
  NCL: { city: "Newcastle",   flag: "🇬🇧" },
  AMS: { city: "Amsterdam",   flag: "🇳🇱" },
  CDG: { city: "Paris",       flag: "🇫🇷" },
  BCN: { city: "Barcelona",   flag: "🇪🇸" },
  MAD: { city: "Madrid",      flag: "🇪🇸" },
  FCO: { city: "Rome",        flag: "🇮🇹" },
  MXP: { city: "Milan",       flag: "🇮🇹" },
  FRA: { city: "Frankfurt",   flag: "🇩🇪" },
  MUC: { city: "Munich",      flag: "🇩🇪" },
  DXB: { city: "Dubai",       flag: "🇦🇪" },
  JFK: { city: "New York",    flag: "🇺🇸" },
  LAX: { city: "Los Angeles", flag: "🇺🇸" },
  DUB: { city: "Dublin",      flag: "🇮🇪" },
  CPH: { city: "Copenhagen",  flag: "🇩🇰" },
  LIS: { city: "Lisbon",      flag: "🇵🇹" },
  ATH: { city: "Athens",      flag: "🇬🇷" },
};

// Fallback shown while loading or if API unavailable
const FALLBACK = [
  { code: "BCN", city: "Barcelona", flag: "🇪🇸", price: 89  },
  { code: "AMS", city: "Amsterdam", flag: "🇳🇱", price: 65  },
  { code: "DXB", city: "Dubai",     flag: "🇦🇪", price: 299 },
  { code: "CDG", city: "Paris",     flag: "🇫🇷", price: 74  },
];

// Parse destination code from route string e.g. "LBA → LHR" → "LHR"
function destCode(routeStr) {
  const parts = routeStr.split(/→|->/).map(s => s.trim());
  return parts[1] || null;
}

export function HomePage({ onSearch, confirmedBooking, onDismissConfirmation }) {
  const [destinations, setDestinations] = useState(FALLBACK);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPopular() {
      try {
        // Step 1: get popular routes sorted by booking count from reports API
        const reports = await adminGetReports();
        const topRoutes = (reports.popularRoutes || []).slice(0, 4);

        if (!topRoutes.length) { setLoading(false); return; }

        // Step 2: for each top route, fetch the cheapest available price
        const cards = await Promise.all(
          topRoutes.map(async ({ route }) => {
            const code = destCode(route);
            if (!code || !AIRPORTS[code]) return null;

            // Fetch flights to this destination to find the lowest price
            let price = null;
            try {
              const flights = await getFlights({ to: code });
              const prices  = flights.map(f => f.price).filter(Boolean);
              if (prices.length) price = Math.min(...prices);
            } catch {
              // Price fetch failed — show card without price
            }

            return {
              code,
              city:  AIRPORTS[code].city,
              flag:  AIRPORTS[code].flag,
              price,
            };
          })
        );

        if (!cancelled) {
          const valid = cards.filter(Boolean);
          if (valid.length) setDestinations(valid);
          setLoading(false);
        }
      } catch {
        // Reports API unavailable (e.g. not logged in as admin) — keep fallback
        if (!cancelled) setLoading(false);
      }
    }

    loadPopular();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page home-page">
      <div className="hero">
        <h1 className="hero-title">Where will you fly next?</h1>
        <p className="hero-subtitle">Search hundreds of routes. Book in minutes.</p>
        <SearchForm onSearch={onSearch} />
      </div>

      {/* Popular destinations — driven by booking data */}
      <div className="home-destinations">
        <div className="home-section-header">
          <h2 className="home-section-title">Popular destinations</h2>
          {!loading && (
            <span className="home-section-badge">Based on recent bookings</span>
          )}
        </div>

        <div className="dest-grid">
          {destinations.map((d, i) => (
            <div
              key={d.code}
              className={`dest-card ${loading ? "dest-card--loading" : ""}`}
              onClick={() => onSearch({
                tripType: "one-way",
                from: "LBA",
                to: d.code,
                departureDate: "",
                travelClass: "economy",
                adults: 1, children: 0, infants: 0,
              })}
              title={`Search flights to ${d.city}`}
            >
              <span className="dest-rank">#{i + 1}</span>
              <span className="dest-flag">{d.flag}</span>
              <div className="dest-info">
                <span className="dest-city">{d.city}</span>
                <span className="dest-code">{d.code}</span>
              </div>
              <span className="dest-price">
                {d.price ? `from £${d.price}` : "View flights"}
              </span>
            </div>
          ))}

          {/* Skeleton cards while loading */}
          {loading && destinations.length === 0 && [1,2,3,4].map(i => (
            <div key={i} className="dest-card dest-card--skeleton" />
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