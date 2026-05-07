import { useMemo, useState } from "react";
import { FlightRouteMap } from "./FlightRouteMap";

function normalizeLegs({ from, to, airline, flightNumber, legs }) {
  if (Array.isArray(legs) && legs.length > 0) {
    return legs.map((leg) => ({
      from: String(leg.from || "").toUpperCase(),
      to: String(leg.to || "").toUpperCase(),
      airline: leg.airline || "",
      flightNumber: leg.flightNumber || "",
    }));
  }

  if (!from || !to) return [];

  return [{
    from: String(from).toUpperCase(),
    to: String(to).toUpperCase(),
    airline: airline || "",
    flightNumber: flightNumber || "",
  }];
}

export function RouteMap({
  from,
  to,
  stops = 0,
  departureTime,
  arrivalTime,
  compact = false,
  caption = null,
  airline,
  flightNumber,
  legs,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const normalizedLegs = useMemo(
    () => normalizeLegs({ from, to, airline, flightNumber, legs }),
    [airline, flightNumber, from, legs, to],
  );
  const stopLabel = normalizedLegs.length > 1 ? `${normalizedLegs.length - 1} stop${normalizedLegs.length > 2 ? "s" : ""}` : (stops > 0 ? `${stops} stop${stops > 1 ? "s" : ""}` : "Direct");

  return (
    <>
      <div className={`route-map route-map--mini ${compact ? "route-map--compact" : ""}`}>
        {caption && <div className="route-map-caption">{caption}</div>}

        <div className="route-map-strip">
          <div className="route-map-strip-main">
            <div className="route-map-endpoint">
              <span className="route-map-code">{from}</span>
              {departureTime && <span className="route-map-time">{departureTime}</span>}
            </div>

            <div className="route-map-strip-mid">
              <span className="route-map-summary-pill">{stopLabel}</span>
              <div className="route-map-preview-line">
                <span className="route-map-preview-dot route-map-preview-dot--origin" />
                <span className="route-map-preview-track" />
                {normalizedLegs.length > 1 && normalizedLegs.slice(0, -1).map((leg, index) => (
                  <span key={`${leg.to}-${index}`} className="route-map-preview-dot route-map-preview-dot--stop" />
                ))}
                <span className="route-map-preview-track" />
                <span className="route-map-preview-dot route-map-preview-dot--origin" />
              </div>
            </div>

            <div className="route-map-endpoint route-map-endpoint--right">
              <span className="route-map-code">{to}</span>
              {arrivalTime && <span className="route-map-time">{arrivalTime}</span>}
            </div>
          </div>

          <button type="button" className="route-map-open-btn" onClick={() => setIsOpen(true)}>
            View route map
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="route-map-modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="route-map-modal" onClick={(event) => event.stopPropagation()}>
            <div className="route-map-modal-top">
              <div>
                <span className="route-map-caption">Route map</span>
                <div className="route-map-modal-route">
                  <strong>{from}</strong>
                  <span>→</span>
                  <strong>{to}</strong>
                </div>
                <p className="route-map-modal-meta">
                  {stopLabel} • {departureTime || "Departure TBC"} • {arrivalTime || "Arrival TBC"}
                </p>
              </div>
              <button type="button" className="route-map-modal-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <FlightRouteMap
              legs={normalizedLegs}
              title={`${from} to ${to}`}
              height={420}
              emptyMessage="No route data is available for this booking."
            />
          </div>
        </div>
      )}
    </>
  );
}
