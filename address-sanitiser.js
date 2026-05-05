// address-sanitiser.js — v0.58.38
//
// Privacy hardening: strip Singapore floor-unit identifiers
// ("#XX-XXX", "XX-XX") from reverse-geocoded address strings before
// they are displayed in chat or stored in the user-location label.
//
// Reported by Human Lead: the bot showed "31-02 Marina Blvd, Singapore"
// as the user's current location. In Singapore addressing, "31-02" is
// the standard unit notation (floor 31, unit 02). Apartment-level
// granularity is a privacy concern — it pinpoints a single dwelling
// or office unit, and could be doxxing if relayed via buddy-match or
// /share.
//
// Strategy: deterministic regex applied to every reverse-geocoded
// label before display. Two functions consume Google Geocoding output
// (reverseGeocodeAddress + /api/reverse-geocode endpoint) — sanitising
// at those exit points covers all chat-facing surfaces.
//
// Patterns covered:
//   "#08-123, 1 Marina Boulevard, Singapore"   → "1 Marina Boulevard, Singapore"
//   "08-123, 1 Marina Boulevard"               → "1 Marina Boulevard"
//   "31-02 Marina Blvd, Singapore"             → "Marina Blvd, Singapore"
//   "1 Marina Blvd, #08-123, Singapore 048542" → "1 Marina Blvd, Singapore 048542"
//   "Block 123 #08-456, Bedok North Road"      → "Block 123, Bedok North Road"
//
// Left untouched:
//   "Marina Boulevard"   (no unit)
//   "Choa Chu Kang Loop" (road name with no digits)
//   null / "" / undefined / non-string inputs (returned as-is)

function stripAddressUnitNumber(addr) {
  if (!addr || typeof addr !== 'string') return addr;
  let out = addr;
  // 1. Leading "#XX-XXX[,\s]" / "XX-XXX[,\s]" — definite unit.
  //    Both digit groups must be 2-3 digits to dodge shophouse ranges
  //    like "1-3 Smith Street" (the "1" is single-digit, no match).
  out = out.replace(/^\s*#?\s*\d{2,3}-\d{2,4}\s*[,\s]+/, '');
  // 2. Mid-address "[, ]#XX-XXX" — hash required here so we don't
  //    eat road names or building numbers that happen to contain a
  //    hyphenated number elsewhere.
  out = out.replace(/[,\s]+#\s*\d{1,3}-\d{1,4}\s*(?=,|$)/g, '');
  // 3. "Block X #YY-ZZZ" → drop the # part, keep "Block X".
  out = out.replace(/(\bBlock\s+\d+[A-Z]?)\s+#\s*\d{1,3}-\d{1,4}/gi, '$1');
  // Tidy doubled commas / leading or trailing comma + whitespace from
  // the strip leaving artifacts.
  out = out.replace(/,\s*,/g, ',').replace(/^\s*,\s*|\s*,\s*$/g, '').trim();
  return out;
}

module.exports = { stripAddressUnitNumber };
