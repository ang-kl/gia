// free-text-search.js — v0.57.27
//
// Pure helpers for the LLM-free chat-text search path. The user's
// verbatim text goes to Google Places searchText (via
// pipeline.discover); the candidates this returns are then filtered
// in-memory to Singapore venues within 120 km of the user, sorted by
// haversine distance, and capped at 5.
//
// Extracted from index.js so the filter is unit-testable without
// spinning up the bot or mocking Telegram + Redis. The handler in
// index.js (runFreeTextSearch) imports `filterFreeTextResults`
// after calling pipeline.discover.
//
// v0.60.152 — MAX_DISTANCE_M bumped 80 → 120 km to match the same-
// session bump on /api/cuisine/search (PR #125's original 80 km gate;
// see index.js's "120 km hard gate from user location" comment).

const SG_CENTRE = { lat: 1.3521, lng: 103.8198 };
const MAX_DISTANCE_M = 120000;
const SG_PROXIMITY_M = 30000;
const DEFAULT_LIMIT = 5;

function haversineM(a, b) {
  if (!Number.isFinite(a?.lat) || !Number.isFinite(a?.lng)) return null;
  if (!Number.isFinite(b?.lat) || !Number.isFinite(b?.lng)) return null;
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

// filterFreeTextResults — distance enrichment + SG-only gate +
// distance-sort + cap. Mirrors the post-discover filter in
// /api/cuisine/search so chat results match TMA results in scope.
//
// v0.58.31: also applies passesVenueFilter (shared with the cuisine
// flows) so chat-text search no longer surfaces Lau Pa Sat / SAFRA /
// hotels / malls. The gate is opt-in via a function parameter so
// existing tests don't need to mock the venue-filters module.
function filterFreeTextResults(candidates, userLoc, opts = {}) {
  const limit = Number.isFinite(opts.limit) ? opts.limit : DEFAULT_LIMIT;
  if (!Array.isArray(candidates) || !candidates.length) return [];
  if (!Number.isFinite(userLoc?.lat) || !Number.isFinite(userLoc?.lng)) return [];
  const venueFilters = (() => {
    try { return require('./venue-filters'); } catch { return null; }
  })();
  return candidates
    .filter((v) => venueFilters ? venueFilters.passesVenueFilter(v) : true)
    .map((v) => {
      const d = haversineM(userLoc, v);
      if (d == null) return v;
      return { ...v, distanceM: d, walkMinutes: Math.round(d / 80) };
    })
    .filter((v) => v.distanceM == null || v.distanceM <= MAX_DISTANCE_M)
    .filter((v) => {
      const text = `${v.area || ''} ${v.name || ''}`;
      if (/singapore/i.test(text)) return true;
      const distFromSG = haversineM(SG_CENTRE, v);
      return distFromSG != null && distFromSG <= SG_PROXIMITY_M;
    })
    .sort((a, b) => (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity))
    .slice(0, limit);
}

module.exports = {
  filterFreeTextResults,
  haversineM,
  SG_CENTRE,
  MAX_DISTANCE_M,
  SG_PROXIMITY_M,
  DEFAULT_LIMIT
};
