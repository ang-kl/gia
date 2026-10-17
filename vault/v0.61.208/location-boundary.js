// location-boundary.js — v0.61.157
//
// Rule §2.7 — boundary drift detection.
//
// Each registered locale (persisted by location-locale.js) carries
// a BOUNDARY = `{ matchKey, radiusM, anchorLat, anchorLng }`. A new
// fix is "inside the boundary" when:
//
//   1. Its `matchKey` equals the registered boundary's `matchKey`
//      (admin-area name AND mode — see deriveMatchKey below), AND
//   2. The haversine distance from the new fix to the boundary
//      anchor is ≤ `radiusM`.
//
// Match key contract:
//   - SG mode: the country alone defines the match. SG sub-regions
//     ("Central Region", "North East Region", …) are statistical
//     admin units that the user doesn't perceive as different
//     locales, so crossing them must NOT trigger a drift prompt.
//     matchKey = 'SG'.
//   - JB mode: the state "Johor" is the match. Any fix in Johor
//     (Johor Bahru / Pasir Gudang / Skudai / Kulai) stays inside.
//     matchKey = 'JB|johor'.
//   - OTHER mode: the specific admin-area-level-1 is the match.
//     Putrajaya / Selangor / Kepulauan Riau each get their own
//     matchKey, so a hop Putrajaya → Selangor triggers a prompt.
//     matchKey = `OTHER|<lowercased adminAreaLevel1>`.
//
// Radius defaults (operator's "Answer 3" + the existing precinct
// caps):
//   - SG    → 60 km (full SG bbox + a buffer for Sentosa, JB
//             checkpoints' SG-side queue, etc.)
//   - JB    → 30 km (the existing precincts.js JB cap)
//   - OTHER → 15 km (the operator's Putrajaya cap; "extend to 30 km
//             when no results" is a SEARCH-radius concern, not a
//             boundary concern, and lives in PR 4)
//
// Outputs of the §2.7 check:
//   inside       — silent reuse (delegated to PR 2's isSameLocale
//                  in `location-locale.js`, which now agrees via
//                  the shared deriveMatchKey).
//   outside      — caller surfaces a single re-prompt; the user
//                  decides accept (swap locale) or decline (add
//                  destination matchKey to drift-suppress set).
//   suppressed   — the user already declined for THIS destination
//                  matchKey during the current excursion; stay
//                  silent and keep the original anchor.

'use strict';

const { haversineMeters } = require('./location-mode');

const DEFAULT_RADIUS_M = Object.freeze({
  SG:    60000,
  JB:    30000,
  OTHER: 15000
});

// Returns a stable string identifying "the same locale for boundary
// purposes". Two records that produce the same matchKey are inside
// each other's boundary (subject to the radius check).
function deriveMatchKey({ mode, adminAreaLevel1 } = {}) {
  if (mode === 'SG') return 'SG';
  if (mode === 'JB') {
    // Honour the country split: anything tagged JB by the v0.61.155
    // classifier already passed the "Johor" check, so the matchKey
    // can be a constant.
    return 'JB|johor';
  }
  const admin = (typeof adminAreaLevel1 === 'string' ? adminAreaLevel1 : '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  return `OTHER|${admin}`;
}

// Builds the BOUNDARY record that the locale persistence stores.
// Inputs come from the classifyLocation result; outputs are the
// shape `userlocale.boundary` expects.
//
// `lat` / `lng` are required for the anchor; null/undefined → null
// boundary (caller will skip the radius check and rely on matchKey
// alone). This happens for fixes that were gated (rule §2.2 short-
// circuit, no geocode → no admin / no coords … wait, coords ARE
// present even when gated; only the geocode is skipped). The
// gated-but-coordinated case keeps the anchor — distance check
// stays useful.
function computeBoundary({ mode, adminAreaLevel1, lat, lng, radiusM } = {}) {
  const matchKey = deriveMatchKey({ mode, adminAreaLevel1 });
  const r = Number.isFinite(radiusM) && radiusM > 0
    ? radiusM
    : (DEFAULT_RADIUS_M[mode] || DEFAULT_RADIUS_M.OTHER);
  return {
    matchKey,
    radiusM: r,
    anchorLat: Number.isFinite(lat) ? lat : null,
    anchorLng: Number.isFinite(lng) ? lng : null
  };
}

// Predicate: does `candidate` fall inside `boundary`?
//   candidate — `{ mode, adminAreaLevel1, lat, lng }` (from a fresh
//                classifyLocation result)
//   boundary  — the value stored at prev.boundary.
function isInsideBoundary(candidate, boundary) {
  if (!candidate || !boundary || typeof boundary !== 'object') return false;
  const candKey = deriveMatchKey(candidate);
  if (candKey !== boundary.matchKey) return false;
  // matchKey alone is enough when the boundary lacks anchor coords
  // (defensive — shouldn't normally happen for v0.61.157+ records).
  if (!Number.isFinite(boundary.anchorLat) || !Number.isFinite(boundary.anchorLng)) {
    return true;
  }
  if (!Number.isFinite(candidate.lat) || !Number.isFinite(candidate.lng)) {
    // Caller passed a candidate with no coords — the matchKey
    // alone says they're the same locale; trust it.
    return true;
  }
  const d = haversineMeters(
    { lat: boundary.anchorLat, lng: boundary.anchorLng },
    { lat: candidate.lat, lng: candidate.lng }
  );
  return d <= boundary.radiusM;
}

module.exports = {
  DEFAULT_RADIUS_M,
  deriveMatchKey,
  computeBoundary,
  isInsideBoundary
};
