// search-location.js — v0.61.373
//
// SINGLE SOURCE OF TRUTH for the cuisine search CENTRE, region-aware.
//
// The recurring "over-compressed" bug class (operator, 07-06 '26): the
// search centre and the region were resolved SEPARATELY and could diverge
// — region=OTHER (a foreign city picked) while the centre silently fell
// back to the device GPS (Singapore), so an "Others" search ran at the
// user's physical SG location. Root: every centre fallback chain ended in
// `… || userLoc`, even in OTHER/JB mode.
//
// Rule: an explicit pick (passed anchor / committed searchCenter / the
// active locationAnchor) always wins. With NO explicit pick, the device
// GPS (`userLoc`) is a valid centre ONLY in SG mode. In OTHER / JB / MY-PUT
// the device location is NEVER the centre (it would leak the physical
// location into a foreign-city search) — the caller gets `null` and must
// prompt the user to pick a country + city instead of searching the wrong
// place. This makes centre ↔ region coherent by construction.

export function isValidPoint(p) {
  return !!p
    && Number.isFinite(p.lat) && Number.isFinite(p.lng)
    && !(Math.abs(p.lat) < 0.001 && Math.abs(p.lng) < 0.001)
    && p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180;
}

// regionUsesDeviceFallback(region) — only SG (and the unresolved sentinels)
// may centre on the device GPS. OTHER / JB / MY-PUT must not.
export function regionUsesDeviceFallback(region) {
  const r = String(region || '').toUpperCase();
  return r !== 'OTHER' && r !== 'JB' && r !== 'MY-PUT';
}

// resolveSearchCenter({ region, anchor, searchCenter, locationAnchor, userLoc })
//   → { lat, lng } | null
// Returns the coherent centre, or null when none is valid for the region
// (the caller then shows a visible "pick a country + city" prompt rather
// than searching the device's location).
export function resolveSearchCenter({ region, anchor, searchCenter, locationAnchor, userLoc } = {}) {
  // 1. Explicit picks, in priority order — valid in EVERY region.
  for (const p of [anchor, searchCenter, locationAnchor]) {
    if (isValidPoint(p)) return { lat: p.lat, lng: p.lng };
  }
  // 2. No explicit pick → device GPS, but only where the region allows it.
  if (regionUsesDeviceFallback(region) && isValidPoint(userLoc)) {
    return { lat: userLoc.lat, lng: userLoc.lng };
  }
  return null;
}
