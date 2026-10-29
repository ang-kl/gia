// cuisine-geo-scope.js — v0.61.444
//
// ONE geographic-scoping pass for /api/cuisine/search.
//
// Redesign (operator, v0.61.444): scope by a CONCENTRIC DISTANCE from the
// user's SET LOCATION, bounded by the per-city `anchorCap` (the density-
// tiered radiusM from v0.61.441 — Dense 30 / Major 45 / Sparse 60 km),
// rather than by fixed city centroids + country-keyword text. This replaces
// three legacy, overlapping filters:
//   - the 120 km global hard gate,
//   - the SG ≤30 km-of-fixed-centroid filter, and
//   - the OTHER country-keyword (country-text-match) filter — which was
//     "belt-and-braces" only (the Places locationBias circle is the real
//     constraint) and caused the `cc=VN 59→0 → FLOOR` churn when a venue's
//     address lacked a known keyword.
//
// `distanceM` is attached to every venue from the SET LOCATION upstream
// (index.js, haversine({lat,lng}, v)) BEFORE this pass runs, so the cap is a
// simple `v.distanceM <= cap` check — no centroids needed here.
//
// Region rules (operator decisions):
//   SG    : within cap of the set location, AND NOT "johor"-tagged
//           (light cross-border exclusion — a 30 km circle from north SG
//            reaches JB across the causeway).
//   JB    : NOT "singapore"-tagged, AND ( within JB_NEAR_M of the set
//           location OR "johor"-addressed up to the HARD_CAP_M backstop ).
//           JB-as-a-region ≠ JB-as-a-city, so JB uses its own 60 km near-cap
//           (Pontian ↔ Desaru ↔ Kulai), not the 30 km Dense city tier; any
//           "Johor"-addressed venue is rescued up to 120 km. Keeps the
//           JB→OTHER graceful fallback when the pill is stuck far from Johor.
//   OTHER : within cap of the set location. No country-keyword text gate —
//           the per-city anchorCap is the boundary.
//
// Every region's result goes through the shared pool-floor.js
// `demoteNeverEmpty` (min 1, nearest-first), so a soft-bias pool that lands
// just outside the cap keeps its nearest venues instead of returning 0 (this
// subsumes the old OTHER stale-pref floor + the SG/JB no-empty intent).
//
// IO injected (unit-testable without redis / location store):
//   locationMode      — { isFarFromJB, haversineMeters, JB_CBD }  (JB fallback)
//   demoteNeverEmpty  — pool-floor.js
//
// Returns { venues, jbFallbackToOther } — the caller surfaces
// `jbFallbackToOther` on the payload (TMA amber banner) exactly as before.

'use strict';

const HARD_CAP_M = 120000;     // absolute backstop + "Johor"-text ceiling
const JB_NEAR_M = 60000;       // JB-region near-cap (Pontian ↔ Desaru ↔ Kulai)
const SG_DEFAULT_CAP_M = 30000;
const OTHER_DEFAULT_CAP_M = 40000;

// v0.62.896 — these two regexes used to live here as /\bjohor\b/i and /singapore/i, which
// was correct for exactly as long as Places was pinned to English. Once `languageCode`
// carries the reader's locale, a Korean reader's Johor venue is addressed 말레이시아
// 조호르 and a Chinese reader's Singapore venue 新加坡 — so the cross-border refinement
// silently stopped refining, in the one direction nobody would notice: it would let
// venues THROUGH rather than drop them. The shared forms carry all nine locales and
// preserve each original's anchoring exactly. The boundary itself is still `distanceM`.
const { JOHOR_RE, SINGAPORE_RE } = require('./places-language');

const hay = (v) => `${(v && v.area) || ''} ${(v && v.name) || ''}`;
// A venue with no distanceM (no lat/lng) can't be distance-scoped; keep it
// (defensive — matches the legacy 120 km gate, which passed null distance).
const withinCap = (v, cap) => v.distanceM == null || v.distanceM <= cap;

// Resolve the concentric cap for non-JB regions: the per-city anchorCap when
// set, else the (clamped) slider radius, else the region default.
function resolveCap(anchorCap, searchRadius, regionDefault) {
  if (Number.isFinite(anchorCap) && anchorCap > 0) return anchorCap;
  if (Number.isFinite(searchRadius) && searchRadius > 0) return searchRadius;
  return regionDefault;
}

async function scopeVenuesByRegion({
  venues,
  isJB = false,
  isOther = false,
  lat,
  lng,
  anchorCap = null,
  searchRadius = null,
  locationMode,
  demoteNeverEmpty,
  logger = console
} = {}) {
  const log = (m) => { if (logger && typeof logger.log === 'function') logger.log(m); };
  const warn = (m) => { if (logger && typeof logger.warn === 'function') logger.warn(m); };
  const floor = (typeof demoteNeverEmpty === 'function')
    ? (kept, pool) => demoteNeverEmpty(kept, pool, { min: 1, byDistance: true })
    : (kept, pool) => (kept.length ? kept : pool);

  let out = Array.isArray(venues) ? venues.slice() : [];
  let jbFallbackToOther = false;

  // 1) JB region — distance OR johor-text, never Singapore-tagged.
  if (isJB) {
    const beforeJb = out.length;
    const preJb = out.slice();
    const kept = out.filter((v) => {
      const text = hay(v);
      if (SINGAPORE_RE.test(text)) return false;            // cross-border exclusion
      if (withinCap(v, JB_NEAR_M)) return true;             // ≤60 km of the set location
      return JOHOR_RE.test(text) && withinCap(v, HARD_CAP_M); // far-Johor rescued by text ≤120 km
    });
    out = floor(kept, preJb);
    if (out.length !== beforeJb) {
      log(`[Cuisine-Search] D703b JB-scope ${beforeJb} → ${out.length} (≤${JB_NEAR_M}m OR johor-text ≤${HARD_CAP_M}m)`);
    }
    // Graceful exit: JB pill stuck at coords far from Johor (Putrajaya / KL /
    // Ipoh) wiped the pool → restore + treat as OTHER (distance cap below).
    let far = false;
    try {
      far = !!(locationMode && typeof locationMode.isFarFromJB === 'function'
        && locationMode.isFarFromJB(lat, lng));
    } catch (err) { warn(`[Cuisine-Search] isFarFromJB threw (no JB fallback): ${err && err.message}`); }
    if (kept.length === 0 && beforeJb >= 5 && far) {
      const dM = (typeof locationMode.haversineMeters === 'function')
        ? locationMode.haversineMeters(locationMode.JB_CBD, { lat, lng })
        : NaN;
      warn(`[Cuisine-Search] D703b JB-fallback: scope wiped ${beforeJb}→0 at ${Number.isFinite(dM) ? dM.toFixed(0) : '?'}m from JB CBD. Treating as OTHER.`);
      out = preJb;
      jbFallbackToOther = true;
    }
  }

  // 2) OTHER (or JB-fallback) — pure concentric distance cap.
  if (jbFallbackToOther || isOther) {
    const cap = resolveCap(anchorCap, searchRadius, OTHER_DEFAULT_CAP_M);
    const beforeOther = out.length;
    // v0.62.x — FAIL CLOSED + NO never-empty floor for the OTHER geofence.
    // Old behaviour leaked a Singapore venue (Kapitan, Maxwell Chambers ~330 km)
    // into a Putrajaya "Russian" search two ways at once: (a) `withinCap` passed
    // venues whose `distanceM` was null (a strong far Places text-match that
    // arrived without a usable distance), and (b) when the cap cleared the pool,
    // `demoteNeverEmpty` resurfaced the whole pre-filter set. A foreign-city
    // geofence must require a FINITE, in-range distance, and an honest empty
    // (→ the caller's zeroReason "none nearby" copy) beats a cross-country
    // result. SG/JB keep the permissive `withinCap` + floor — coordless curated
    // venues there are genuinely local.
    out = out.filter((v) => Number.isFinite(v.distanceM) && v.distanceM <= cap);
    log(`[Cuisine-Search] D703d OTHER-scope ${beforeOther} → ${out.length} (≤${cap}m of set location; coordless / out-of-range excluded)`);
  } else if (!isJB) {
    // 3) SG — concentric distance cap, minus cross-border Johor bleed.
    // v0.62.121 — operator: a "Polish" search in Singapore drifted to actual
    // Warsaw, Poland restaurants. Root cause is the mirror of the OTHER-branch
    // leak above: `withinCap` keeps a venue whose `distanceM` is null (intended
    // for coordless CURATED-local venues), but a rare-cuisine Places text-match
    // can arrive coordless from far away (the Poland venues) and slip through —
    // so the SG cap logged "N → N", dropping nothing. Two guards, matching the
    // OTHER hardening but preserving genuine coordless-SG venues:
    //   • a coordless venue is kept only if it's SG-addressed (Singapore in the
    //     area/name) — coordless FOREIGN matches are dropped;
    //   • the never-empty floor draws only from FINITE-distance venues within
    //     the 120 km hard cap, so it can never resurface a cross-country result.
    const cap = resolveCap(anchorCap, searchRadius, SG_DEFAULT_CAP_M);
    const beforeSg = out.length;
    const notJohor = (v) => !JOHOR_RE.test(hay(v));
    // A coordless venue can't be distance-scoped. Keep it ONLY when it's
    // genuinely local — an empty address (a curated SG venue with no formatted
    // address) or one that names Singapore. A coordless venue with a non-empty,
    // non-Singapore address is a far FOREIGN Places text-match (the Poland leak)
    // and is dropped.
    const localCoordless = (v) => {
      const a = ((v && v.area) || '').trim();
      return a === '' || SINGAPORE_RE.test(a);
    };
    const kept = out.filter((v) => notJohor(v) && (
      Number.isFinite(v.distanceM) ? v.distanceM <= cap : localCoordless(v)
    ));
    const fallback = out.filter((v) => notJohor(v)
      && Number.isFinite(v.distanceM) && v.distanceM <= HARD_CAP_M);
    out = floor(kept, fallback);
    log(`[Cuisine-Search] D703s SG-scope ${beforeSg} → ${out.length} (≤${cap}m of set location; coordless kept only if SG-addressed, no johor; floor ≤${HARD_CAP_M}m)`);
  }

  return { venues: out, jbFallbackToOther };
}

module.exports = {
  scopeVenuesByRegion,
  HARD_CAP_M,
  JB_NEAR_M,
  SG_DEFAULT_CAP_M,
  OTHER_DEFAULT_CAP_M
};
