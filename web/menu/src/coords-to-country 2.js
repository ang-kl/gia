// web/cuisine/src/v2/lib/coords-to-country.js — v0.61.274
//
// Coords-based country detector for the mount-time coherence check.
// Returns an ISO 3166-1 alpha-2 code (SG, MY) when the coordinates
// fall inside a known regional bbox; returns null otherwise so the
// caller can either skip the coherence check OR defer to iataSnap /
// reverse-geocode for the precise country.
//
// Operator (30-05 '26) — addresses the "🇦🇺 Singapore" + "OTHER · NZ
// · ZQN · SG coords" incoherent first-paint bugs. The TMA's saved
// countryPref leaks across sessions and overrides the freshly-
// resolved GPS unless we cross-validate.
//
// Decision policy: option B (Prompt the user). When the saved
// countryPref disagrees with the coords-derived country, show a
// modal: "Use {coords-country}" OR "Keep {saved-country}".
//
// JB and KL are both inside Malaysia; coordsToCountry returns 'MY'
// for both. The narrower JB-vs-other-MY discrimination is handled
// by the region pill (JB pill highlighted when coords are inside
// the JB-extent bbox).

'use strict';

// Singapore mainland + offshore islands.
// Tightened to 1.16–1.47 lat (was 1.50 in pre-v0.61.274 helpers) so
// JB CBD at lat 1.49 falls into the JB bbox below, not the SG one.
// SG's northernmost mainland points (Sembawang ~1.45, Woodlands
// ~1.44) stay well inside the 1.47 cap; Pulau Ubin and Pulau
// Tekong are at ~1.41 / 1.42 (also inside).
const SG_LAT_MIN = 1.15;
const SG_LAT_MAX = 1.47;
const SG_LNG_MIN = 103.55;
const SG_LNG_MAX = 104.10;

// Johor state extent (the chunk of Malaysia adjacent to SG). The
// southernmost MY land mass: Pontian → Kulai → Mersing → Desaru +
// JB CBD. Picked from Johor admin-area roughly.
const JB_LAT_MIN = 1.20;
const JB_LAT_MAX = 2.55;
const JB_LNG_MIN = 102.50;
const JB_LNG_MAX = 104.50;

// Peninsular MY north of Johor (Selangor / KL / Putrajaya / Negeri
// Sembilan / Pahang / Perak / Penang / Kedah / Perlis / Kelantan /
// Terengganu / Melaka). Conservative bbox.
const MY_PENI_LAT_MIN = 2.55;
const MY_PENI_LAT_MAX = 6.85;
const MY_PENI_LNG_MIN = 99.50;
const MY_PENI_LNG_MAX = 104.80;

// East Malaysia (Sabah + Sarawak + Labuan).
const MY_EAST_LAT_MIN = 0.85;
const MY_EAST_LAT_MAX = 7.50;
const MY_EAST_LNG_MIN = 109.50;
const MY_EAST_LNG_MAX = 119.30;

function _inBbox({ lat, lng }, latMin, latMax, lngMin, lngMax) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= latMin && lat <= latMax
    && lng >= lngMin && lng <= lngMax;
}

// Returns 'SG' / 'MY' / null. The caller treats null as
// "I don't know — don't prompt for coherence."
export function coordsToCountry(input) {
  if (!input || typeof input !== 'object') return null;
  const { lat, lng } = input;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  // SG checked first because the SG bbox is a subset of the JB
  // bbox (the JB extent overlaps the SG bbox by a few km of
  // straits-crossing). The order matters.
  if (_inBbox({ lat, lng }, SG_LAT_MIN, SG_LAT_MAX, SG_LNG_MIN, SG_LNG_MAX)) {
    return 'SG';
  }
  if (_inBbox({ lat, lng }, JB_LAT_MIN, JB_LAT_MAX, JB_LNG_MIN, JB_LNG_MAX)) {
    return 'MY';
  }
  if (_inBbox({ lat, lng }, MY_PENI_LAT_MIN, MY_PENI_LAT_MAX, MY_PENI_LNG_MIN, MY_PENI_LNG_MAX)) {
    return 'MY';
  }
  if (_inBbox({ lat, lng }, MY_EAST_LAT_MIN, MY_EAST_LAT_MAX, MY_EAST_LNG_MIN, MY_EAST_LNG_MAX)) {
    return 'MY';
  }
  return null;
}

// Subset detector for the JB region pill. Returns true when the
// coords are inside the JB-extent bbox AND NOT inside the SG bbox.
// Used so the auto-flip path can pick JB over OTHER when the user
// is physically in Johor.
export function isJbCoords(input) {
  if (!input || typeof input !== 'object') return false;
  const { lat, lng } = input;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (_inBbox({ lat, lng }, SG_LAT_MIN, SG_LAT_MAX, SG_LNG_MIN, SG_LNG_MAX)) return false;
  return _inBbox({ lat, lng }, JB_LAT_MIN, JB_LAT_MAX, JB_LNG_MIN, JB_LNG_MAX);
}
