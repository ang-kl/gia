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

// v0.61.276 — JB CBD centroid. The cuisine-search JB-hybrid filter
// (index.js D703b) uses this as the JB anchor, and the v0.61.276
// region-coords sanity guards (search graceful exit + set-location
// downgrade) measure distance against it.
const JB_CBD = Object.freeze({ lat: 1.4927, lng: 103.7414 });

// v0.61.276 — JB-fallback threshold. When a user picks region='JB'
// but the request coordinates are >150 km from JB_CBD, both:
//   • POST /api/cuisine/set-location downgrades region to OTHER
//   • POST /api/cuisine/search (after the JB-hybrid filter wipes
//     the pool) falls through to OTHER country-text-filter treatment
// 150 km is slightly larger than the JB extent (~120 km from CBD)
// so Pontian / Mersing / Desaru / Iskandar Puteri stay JB; only
// mainland-MY (Putrajaya / KL / Ipoh) and SG-far-north hit the
// fallback. v0.61.279 extracted from two inline copies (Register O-26).
const JB_FALLBACK_THRESHOLD_M = 150000;

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

// v0.61.279 — Register O-26. true ⇒ the request coordinates are far
// enough from JB_CBD that a region='JB' pick is almost certainly
// stale (the user expressed regional intent for JB but the coords
// say they're not there). Used by the set-location sanity guard
// and the cuisine-search graceful-exit guard.
function isFarFromJB(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  const distM = haversineMeters(JB_CBD, { lat, lng });
  return Number.isFinite(distM) && distM > JB_FALLBACK_THRESHOLD_M;
}

// v0.61.329 — coordinate-only Johor (state) bbox test. true ⇒ the
// point falls inside the Johor administrative extent (lat 1.20–2.55,
// lng 102.50–104.50). Used by /api/menu/set-location's text path to
// re-derive region from the RESOLVED geocode coords (not the
// request/cached region), so a "legoland" hit in Johor stores
// region='JB' instead of inheriting an SG anchor's region. This is a
// pure coordinate gate (no geocode), complementing classifyByCountry
// (which needs the admin-area string). The caller checks coarseGate
// (SG) first; isJbCoords resolves the remaining MY/Johor case.
function isJbCoords(input) {
  if (input == null) return false;
  const { lat, lng } = input;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 1.20 && lat <= 2.55 && lng >= 102.50 && lng <= 104.50;
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

// v0.61.156 — rule §2.5 feature gate. SG-only features that require
// SG-specific feeds (LTA DataMall, NEA, HPB, etc.) are listed here.
// The gate is a positive list (allowed-in-non-SG), not a deny-list —
// keeps the spec readable: "what's still alive outside Singapore".
//
// Outside SG, ONLY these surfaces are kept:
//   - cuisine search / free-text search / Michelin (Places-driven,
//     no SG-specific data source)
//   - carpark search (Places-driven outside SG per rule §2.8)
//   - transport "Drive" mode (Routes API, no LTA)
//   - the location-handler itself (must always work)
//
// Everything else (hawker / weather / recognised / TMA toggles for
// bus stop, taxi stand, train line, parks, attractions) requires
// SG.
//
// Operator: "When mode is not SG, disable: Hawker TMA; Transport -
// all except Drive and Carpark; Weather; TMA toggles (bus stop,
// taxi stand, train line, parks, attractions); and SG-specific
// commands such as /recognised."
const FEATURE_KIND = Object.freeze({
  // Always allowed (any mode):
  CUISINE_SEARCH:   'cuisine-search',
  FREETEXT_SEARCH:  'freetext-search',
  MICHELIN_SEARCH:  'michelin-search',
  CARPARK:          'carpark',
  TRANSPORT_DRIVE:  'transport-drive',
  LOCATION:         'location',
  // SG-only (gated below):
  HAWKER:           'hawker',
  WEATHER:          'weather',
  RECOGNISED:       'recognised',
  TRANSPORT_TRAIN:  'transport-train',
  TRANSPORT_BUS:    'transport-bus',
  TRANSPORT_TAXI:   'transport-taxi',
  TMA_BUSSTOP:      'tma-busstop',
  TMA_TAXISTAND:    'tma-taxistand',
  TMA_TRAINLINE:    'tma-trainline',
  TMA_PARKS:        'tma-parks',
  TMA_ATTRACTIONS:  'tma-attractions'
});

const ALWAYS_ALLOWED = Object.freeze(new Set([
  FEATURE_KIND.CUISINE_SEARCH,
  FEATURE_KIND.FREETEXT_SEARCH,
  FEATURE_KIND.MICHELIN_SEARCH,
  FEATURE_KIND.CARPARK,
  FEATURE_KIND.TRANSPORT_DRIVE,
  FEATURE_KIND.LOCATION
]));

const SG_ONLY = Object.freeze(new Set([
  FEATURE_KIND.HAWKER,
  FEATURE_KIND.WEATHER,
  FEATURE_KIND.RECOGNISED,
  FEATURE_KIND.TRANSPORT_TRAIN,
  FEATURE_KIND.TRANSPORT_BUS,
  FEATURE_KIND.TRANSPORT_TAXI,
  FEATURE_KIND.TMA_BUSSTOP,
  FEATURE_KIND.TMA_TAXISTAND,
  FEATURE_KIND.TMA_TRAINLINE,
  FEATURE_KIND.TMA_PARKS,
  FEATURE_KIND.TMA_ATTRACTIONS
]));

// Returns true when `feature` may run for the given `mode`.
//   - any mode → ALWAYS_ALLOWED features run.
//   - mode === 'SG' AND feature in SG_ONLY → runs.
//   - anything else → false (including unknown features — defensive
//     deny so a caller that types a typo'd feature name doesn't
//     accidentally bypass the gate).
function isFeatureAllowed(mode, feature) {
  if (typeof feature !== 'string') return false;
  if (ALWAYS_ALLOWED.has(feature)) return true;
  if (mode === 'SG' && SG_ONLY.has(feature)) return true;
  return false;
}

module.exports = {
  SG_CENTROID,
  COARSE_GATE_M,
  JB_CBD,
  JB_FALLBACK_THRESHOLD_M,
  JB_ADMIN_KEYWORDS,
  FEATURE_KIND,
  ALWAYS_ALLOWED,
  SG_ONLY,
  haversineMeters,
  isFarFromJB,
  isJbCoords,
  coarseGate,
  classifyByCountry,
  classifyLocation,
  isFeatureAllowed
};
