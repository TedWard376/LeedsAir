import { airportCoordinates } from "../data/airportCoordinates";

export async function loadAirportLookup() {
  return airportCoordinates.reduce((lookup, airport) => {
    lookup[airport.iata] = airport;
    return lookup;
  }, {});
}

export function getRouteCodes(legs) {
  if (!Array.isArray(legs) || legs.length === 0) return [];

  const codes = [String(legs[0].from || "").toUpperCase()];
  legs.forEach((leg) => {
    const destinationCode = String(leg.to || "").toUpperCase();
    if (destinationCode) codes.push(destinationCode);
  });

  return codes.filter(Boolean);
}

export function getMissingAirportCodes(legs, lookup) {
  const routeCodes = getRouteCodes(legs);
  return routeCodes.filter((code) => !lookup[code]);
}

export function buildRouteStops(legs, lookup) {
  const routeCodes = getRouteCodes(legs);

  return routeCodes.map((code, index) => {
    const airport = lookup[code];
    const isOrigin = index === 0;
    const isDestination = index === routeCodes.length - 1;

    return {
      code,
      airport,
      latitude: airport.latitude,
      longitude: airport.longitude,
      role: isOrigin ? "origin" : isDestination ? "destination" : "layover",
      label: isOrigin ? "Origin" : isDestination ? "Destination" : `Layover ${index}`,
    };
  });
}

export function buildLegPolylines(legs, lookup) {
  return legs.map((leg, index) => {
    const fromCode = String(leg.from || "").toUpperCase();
    const toCode = String(leg.to || "").toUpperCase();
    const fromAirport = lookup[fromCode];
    const toAirport = lookup[toCode];

    return {
      id: `${fromCode}-${toCode}-${index}`,
      airline: leg.airline || "",
      flightNumber: leg.flightNumber || "",
      fromCode,
      toCode,
      fromAirport,
      toAirport,
      positions: [
        [fromAirport.latitude, fromAirport.longitude],
        [toAirport.latitude, toAirport.longitude],
      ],
    };
  });
}

export function buildAirportDisplayName(airport) {
  if (!airport) return "Unknown airport";
  const city = airport.city?.trim();
  const name = airport.name?.trim();
  if (city && name) return `${city} - ${name}`;
  if (name) return name;
  if (city) return city;
  return airport.iata ? `Airport ${airport.iata}` : "Airport details unavailable";
}
