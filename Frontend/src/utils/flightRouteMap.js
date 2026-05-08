import { airportCoordinates } from "../data/airportCoordinates";
import { getAirports } from "../services/api";

export async function loadAirportLookup() {
  const staticLookup = airportCoordinates.reduce((lookup, airport) => {
    lookup[airport.iata] = airport;
    return lookup;
  }, {});

  try {
    const apiAirports = await getAirports();
    if (!Array.isArray(apiAirports)) return staticLookup;

    return apiAirports.reduce((lookup, airport) => {
      const code = String(airport.code || airport.iata || "").trim().toUpperCase();
      const latitude = Number(airport.latitude);
      const longitude = Number(airport.longitude);

      if (!code || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return lookup;
      }

      lookup[code] = {
        ...lookup[code],
        ...airport,
        iata: code,
        latitude,
        longitude,
        city: airport.city || lookup[code]?.city || "",
        name: airport.name || lookup[code]?.name || "",
      };
      return lookup;
    }, { ...staticLookup });
  } catch {
    return staticLookup;
  }
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
      positions: buildGreatCirclePath(
        fromAirport.latitude,
        fromAirport.longitude,
        toAirport.latitude,
        toAirport.longitude,
      ),
    };
  });
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function toDegrees(value) {
  return (value * 180) / Math.PI;
}

function normalizeLongitude(longitude) {
  if (longitude > 180) return longitude - 360;
  if (longitude < -180) return longitude + 360;
  return longitude;
}

export function buildGreatCirclePath(startLat, startLon, endLat, endLon, steps = 48) {
  const lat1 = toRadians(startLat);
  const lon1 = toRadians(startLon);
  const lat2 = toRadians(endLat);
  const lon2 = toRadians(endLon);

  const delta =
    2 * Math.asin(Math.sqrt(
      (Math.sin((lat2 - lat1) / 2) ** 2) +
      (Math.cos(lat1) * Math.cos(lat2) * (Math.sin((lon2 - lon1) / 2) ** 2)),
    ));

  if (!Number.isFinite(delta) || delta === 0) {
    return [
      [startLat, startLon],
      [endLat, endLon],
    ];
  }

  const path = [];

  for (let index = 0; index <= steps; index += 1) {
    const fraction = index / steps;
    const sinDelta = Math.sin(delta);
    const a = Math.sin((1 - fraction) * delta) / sinDelta;
    const b = Math.sin(fraction * delta) / sinDelta;

    const x =
      (a * Math.cos(lat1) * Math.cos(lon1)) +
      (b * Math.cos(lat2) * Math.cos(lon2));
    const y =
      (a * Math.cos(lat1) * Math.sin(lon1)) +
      (b * Math.cos(lat2) * Math.sin(lon2));
    const z = (a * Math.sin(lat1)) + (b * Math.sin(lat2));

    const latitude = toDegrees(Math.atan2(z, Math.sqrt((x * x) + (y * y))));
    const longitude = normalizeLongitude(toDegrees(Math.atan2(y, x)));

    path.push([latitude, longitude]);
  }

  return path;
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
