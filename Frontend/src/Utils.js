/**
 * Shared utility functions used across the frontend.
 */

/**
 * Returns the seat upgrade price in pounds.
 * @param {number} row  - Row number (1-30)
 * @param {string} col  - Column letter e.g. "A"
 * @param {boolean} isBiz - Whether this is a business class booking
 */
export function getSeatPrice(row, col, isBiz) {
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

/**
 * Formats a price as a pounds string e.g. 74 → "£74"
 * @param {number} amount
 */
export function formatPrice(amount) {
  return `£${amount}`;
}

/**
 * Returns a human-readable label for a passenger.
 * @param {{ type: string, firstName: string, lastName: string }} pax
 * @param {number} idx - zero-based index
 */
export function paxLabel(pax, idx) {
  const typeLabel = pax.type === "adult" ? "Adult" : pax.type === "child" ? "Child" : "Infant";
  const name = pax.firstName || pax.lastName
    ? `${pax.firstName} ${pax.lastName}`.trim()
    : null;
  return name ? `${typeLabel} ${idx + 1}: ${name}` : `${typeLabel} ${idx + 1}`;
}

/**
 * Returns a stops label for a flight card.
 * @param {number} stops
 */
export function stopsLabel(stops) {
  if (stops === 0) return "Direct";
  if (stops === 1) return "1 Stop";
  return `${stops} Stops`;
}