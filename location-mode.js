// location-mode.js — v0.61.155
//
// Three-mode location classifier (rules §2.2-§2.3 of the location-
// classification spec). Takes a user-coordinate fix, returns one of
// SG | JB | OTHER, with the country + admin-area metadata that
// drives the per-locale feature gate (§2.5) and the boundary
// "stay in Selangor" check (§2.7).
//
// Two stages:
//
//   1. Coarse radius gate (rule §2.2). Great-circle distance from a
//      fixed Singapore centroid. If beyond R (default 120 km — the
//      v0.60.152 SG + adjacent-JB ceiling already used in
//      /api/cuisine/search), classify as OTHER and skip the geocode
//      call. Saves the Google Geocode API hit for far-away fixes
//      like KL, Bangkok, Hong Kong.
//
//   2. Country / admin-area classification (rule §2.3). Within the
//      gate, reverse-geocode the coordinate to obtain country +
//      admin_area_level_1. Map:
//        - country = "Singapore"                      → 'SG'
//        - country = "Malaysia" AND admin contains    → 'JB'
//          "Johor"
//        - anything else (Batam / Bintan / Selangor / → 'OTHER'
//          Wilayah Persekutuan Putrajaya / …)
//
// Pure module: the actual reverse-geocode call is injected via
// `reverseGeocodeFn` so this file has no Google API dependency and
// can be unit-tested without network. PR 2 of the phased build will
// wire the injection at the call site (set_location handler).
//
// Public surface:
//   SG_CENTROID                 — {lat, lng} of SG centroid (1.3521 / 103.8198)
//   COARSE_GATE_M               — 120 000 m (v0.60.152)
//   haversineMeters(a, b)       — m between two {lat,lng} points
//   coarseGate({ lat, lng, radiusM = COARSE_GATE_M }) → boolean
//                                  true  ⇒ within the gate, geocode
//                                  false ⇒ skip the geocode, OTHER
//   classifyByCountry({ country, adminAreaLevel1 }) → 'SG' | 'JB' | 'OTHER'
//                                  pure mapping, no IO. Defensive
//                                  against missing inputs (→ 'OTHER').
//   classifyLocation({ lat, lng, reverseGeocodeFn,
//                      radiusM = COARSE_GATE_M })
//                                → { mode, country, adminAreaLevel1,
//                                    placeName, distanceM, gated, geocoded }
//                                  Orchestrates rule 1 → rule 2.
//                                  `reverseGeocodeFn` is async, called
//                                  only when the gate passes.

'use strict';

// v0.55+ — SG centroid the cuisine-search filter has used since the
// v0.57.16 distance-from-SG check.
const SG_CENTROID = Object.freeze({ lat: 1.3521, lng: 103.8198 });

// v0.60.152 — the SG + adjacent-JB hard ceiling already filtering
// venues in /api/cuisine/search (index.js:11708-ish). Reused here
// so a fix beyond this is unambiguously OTHER.
const COARSE_GATE_M = 120000;

// Substring match (case-insensitive). The Malaysian state name comes
// back as "Johor" from the Google Geocode `administrative_area_level_1`
// component; using `includes` survives stray punctuation / suffixes
// (e.g. "Johor Darul Ta'zim") without needing a regex.
const JB_ADMIN_KEYWORDS = Object.freeze(['johor']);

// Great-circle distance in metres between two {lat,lng} points.
// Standard haversine; SG-scale (~30 km) is well inside the haversine
// accuracy band, no need for Vincenty.
function haversineMeters(a, b) {
  if (!a || !b
      || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)
      || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return Number.POSITIVE_INFINITY;
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

// Rule §2.2 — coarse radius gate. true ⇒ within SG_CENTROID +/- R.
function coarseGate(input) {
  if (input == null) return false;
  const { lat, lng, radiusM = COARSE_GATE_M } = input;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const d = haversineMeters(SG_CENTROID, { lat, lng });
  return d <= radiusM;
}

// Rule §2.3 — country / admin-area → mode. Pure mapping. Defensive
// for absent / unexpected inputs (returns 'OTHER' rather than
// throwing — the caller's request must always classify).
function classifyByCountry({ country, adminAreaLevel1 } = {}) {
  if (typeof country !== 'string' || !country.trim()) return 'OTHER';
  const c = country.trim().toLowerCase();
  if (c === 'singapore') return 'SG';
  if (c === 'malaysia') {
    const a = (typeof adminAreaLevel1 === 'string' ? adminAreaLevel1 : '').toLowerCase();
    if (JB_ADMIN_KEYWORDS.some((kw) => a.includes(kw))) return 'JB';
    return 'OTHER';
  }
  return 'OTHER';
}

// Rule §2.2 → §2.3 orchestrator. Returns a structured result so the
// downstream feature-gate and persistence layers (PRs 2-3) can read
// every signal without re-geocoding.
//
// Result shape:
//   {
//     mode:            'SG' | 'JB' | 'OTHER',
//     country:         string | null,       // null when gate-skipped or geocode missing
//     adminAreaLevel1: string | null,       // 'Johor' | 'Selangor' | …
//     placeName:       string | null,       // friendly label from the geocode (§2.4)
//     distanceM:       number,              // metres from SG centroid
//     gated:           boolean,             // true ⇒ rule 1 short-circuited to OTHER
//     geocoded:        boolean              // true ⇒ rule 2 ran
//   }
async function classifyLocation({
  lat,
  lng,
  reverseGeocodeFn,
  radiusM = COARSE_GATE_M
} = {}) {
  const baseResult = {
    mode: 'OTHER',
    country: null,
    adminAreaLevel1: null,
    placeName: null,
    distanceM: Number.POSITIVE_INFINITY,
    gated: false,
    geocoded: false
  };
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { ...baseResult, gated: true };
  }
  const distanceM = haversineMeters(SG_CENTROID, { lat, lng });
  // Rule 1: coarse gate.
  if (distanceM > radiusM) {
    return { ...baseResult, distanceM, gated: true };
  }
  // Rule 2: reverse-geocode + country mapping.
  if (typeof reverseGeocodeFn !== 'function') {
    // Within the gate but no geocoder available — conservative
    // 'OTHER' so the feature gate falls open (rather than
    // false-positive-ing as SG). The caller logs the geocoder
    // miss; we don't decide policy here.
    return { ...baseResult, distanceM };
  }
  let geo = null;
  try {
    geo = await reverseGeocodeFn({ lat, lng });
  } catch {
    // Network / quota failure — same conservative OTHER. The
    // caller MAY retry or trip a circuit breaker upstream.
    return { ...baseResult, distanceM };
  }
  const country = typeof geo?.country === 'string' ? geo.country : null;
  const adminAreaLevel1 = typeof geo?.adminAreaLevel1 === 'string' ? geo.adminAreaLevel1 : null;
  const placeName = typeof geo?.placeName === 'string' ? geo.placeName : null;
  const mode = classifyByCountry({ country, adminAreaLevel1 });
  return {
    mode,
    country,
    adminAreaLevel1,
    placeName,
    distanceM,
    gated: false,
    geocoded: true
  };
}

module.exports = {
  SG_CENTROID,
  COARSE_GATE_M,
  JB_ADMIN_KEYWORDS,
  haversineMeters,
  coarseGate,
  classifyByCountry,
  classifyLocation
};
