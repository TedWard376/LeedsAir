import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  Marker,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  buildAirportDisplayName,
  buildLegPolylines,
  buildRouteStops,
  getMissingAirportCodes,
  loadAirportLookup,
} from "../utils/flightRouteMap";

const originIcon = L.divIcon({
  className: "flight-route-map-marker-wrap",
  html: '<div class="flight-route-map-marker flight-route-map-marker--origin"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const layoverIcon = L.divIcon({
  className: "flight-route-map-marker-wrap",
  html: '<div class="flight-route-map-marker flight-route-map-marker--layover"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destinationIcon = L.divIcon({
  className: "flight-route-map-marker-wrap",
  html: '<div class="flight-route-map-marker flight-route-map-marker--destination"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function getMarkerIcon(role) {
  if (role === "origin") return originIcon;
  if (role === "destination") return destinationIcon;
  return layoverIcon;
}

function FitRouteBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (!positions.length) return;

    if (positions.length === 1) {
      map.setView(positions[0], 5, { animate: false });
      return;
    }

    map.fitBounds(positions, {
      padding: [32, 32],
      animate: false,
    });
  }, [map, positions]);

  return null;
}

export function FlightRouteMap({
  legs,
  height = 320,
  title = "Flight route",
  emptyMessage = "Route details are not available for this booking yet.",
}) {
  const [airportLookup, setAirportLookup] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLookup() {
      try {
        setError("");
        const lookup = await loadAirportLookup();
        if (active) setAirportLookup(lookup);
      } catch {
        if (active) setError("We couldn't load the airport coordinate dataset.");
      }
    }

    loadLookup();
    return () => {
      active = false;
    };
  }, []);

  const routeData = useMemo(() => {
    if (!airportLookup || !Array.isArray(legs) || legs.length === 0) return null;

    const missingCodes = getMissingAirportCodes(legs, airportLookup);
    if (missingCodes.length > 0) {
      return { missingCodes };
    }

    const stops = buildRouteStops(legs, airportLookup);
    const segments = buildLegPolylines(legs, airportLookup);
    const bounds = stops.map((stop) => [stop.latitude, stop.longitude]);

    return {
      stops,
      segments,
      bounds,
      missingCodes: [],
    };
  }, [airportLookup, legs]);

  if (!Array.isArray(legs) || legs.length === 0) {
    return <div className="flight-route-map-state">{emptyMessage}</div>;
  }

  if (!airportLookup && !error) {
    return <div className="flight-route-map-state">Loading route map...</div>;
  }

  if (error) {
    return <div className="flight-route-map-state flight-route-map-state--error">{error}</div>;
  }

  if (routeData?.missingCodes?.length) {
    return (
      <div className="flight-route-map-state flight-route-map-state--error">
        Missing airport coordinates for: {routeData.missingCodes.join(", ")}.
      </div>
    );
  }

  return (
    <div className="flight-route-map-card">
      <div className="flight-route-map-top">
        <div>
          <span className="flight-route-map-eyebrow">Booking visualisation</span>
          <h4>{title}</h4>
        </div>
        <span className="flight-route-map-badge">
          {legs.length === 1 ? "Direct route" : `${legs.length} flight legs`}
        </span>
      </div>

      <div className="flight-route-map-shell" style={{ height }}>
        <MapContainer
          className="flight-route-map-leaflet"
          center={[51.505, -0.09]}
          zoom={4}
          scrollWheelZoom={false}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />

          <FitRouteBounds positions={routeData.bounds} />

          {routeData.stops.map((stop) => (
            <Marker
              key={`${stop.code}-${stop.role}`}
              position={[stop.latitude, stop.longitude]}
              icon={getMarkerIcon(stop.role)}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                {stop.label}: {stop.code}
              </Tooltip>
              <Popup>
                <strong>{stop.code}</strong>
                <div>{buildAirportDisplayName(stop.airport)}</div>
                <div>{stop.label}</div>
              </Popup>
            </Marker>
          ))}

          {routeData.segments.map((segment, index) => (
            <Polyline
              key={segment.id}
              positions={segment.positions}
              pathOptions={{
                color: "#1f67d2",
                weight: 4,
                opacity: 0.85,
                dashArray: index % 2 === 0 ? undefined : "7 7",
              }}
            >
              <Popup>
                <strong>{segment.fromCode} → {segment.toCode}</strong>
                <div>{segment.airline || "Airline TBC"}</div>
                <div>{segment.flightNumber || "Flight number TBC"}</div>
              </Popup>
            </Polyline>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
