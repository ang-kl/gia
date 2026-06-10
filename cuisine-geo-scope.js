// cuisine-geo-scope.js — v0.61.442
//
// ONE geographic-scoping pass for /api/cuisine/search (gate audit P4 —
// removes the D1 duplication where the same "is this venue in the right
// place?" intent was answered five different ways inline).
//
// Before this module, the route ran four overlapping inline filters back
// to back — a 120 km hard gate, the JB-hybrid filter (+ its JB→OTHER
// graceful fallback), the OTHER country-keyword filter (+ its stale-pref
// floor), and the SG mention/proximity filter — each added for a separate
// incident, each with its own ad-hoc collapse handling. A venue had to
// survive all of them, and the branching (JB fallback flips into the
// OTHER branch; SG is the `else`) made the interactions hard to read.
//
// This is a near-exact extraction: same thresholds, same regexes, same
// centroids, same logs, same JB-fallback semantics. The OTHER stale-pref
// floor now goes through the shared pool-floor.js `demoteNeverEmpty`
// (injected) instead of an inline `if (filtered.length === 0) keep pool`.
//
// ONE intentional behaviour delta (the reason P4 is "one pass keyed off
// region" rather than a literal copy): in the old inline code the SG
// filter was the trailing `else` of the OTHER `if`, so a JB-region search
// that did NOT fall back ran the JB filter AND THEN the SG ≤30 km filter —
// silently dropping legit far-Johor venues (Pontian / Kulai / Mersing) that
// sit >30 km from the SG centroid. The merged pass dispatches to exactly
// ONE region rule (OTHER / JB / SG are mutually exclusive), so a JB search
// is scoped by the JB rule alone. SG and OTHER behaviour is unchanged.
//
// All IO is injected so the pass is unit-testable without redis / the
// country-pref store:
//   resolveCtxCountry  — async () => ISO-2 | null   (wraps getUserCountryPref)
//   countryTextMatch   — { filterVenuesByCountry, hasKeywordsFor }
//   locationMode       — { isFarFromJB, haversineMeters, JB_CBD }
//   demoteNeverEmpty   — pool-floor.js
//
// Returns { venues, jbFallbackToOther, ctxCountry } — the caller surfaces
// `jbFallbackToOther` on the payload (TMA amber banner) exactly as before.

'use strict';

const HARD_CAP_M = 120000;   // v0.60.152 — 120 km user-distance ceiling
const JB_HYBRID_M = 60000;   // v0.61.198 — JB centroid radius (Pontian/Kulai/Desaru)
const SG_PROX_M = 30000;     // SG centroid proximity fallback
// Centroids preserved verbatim from the inline filters.
const JB_CENTROID = { lat: 1.4927, lng: 103.7414 };
const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };

function haversineM(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)
      || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return NaN;
  const R = 6371000, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

async function scopeVenuesByRegion({
  venues,
  isJB = false,
  isOther = false,
  lat,
  lng,
  hardCapM = HARD_CAP_M,
  resolveCtxCountry,
  countryTextMatch,
  locationMode,
  demoteNeverEmpty,
  logger = console
} = {}) {
  const log = (m) => { if (logger && typeof logger.log === 'function') logger.log(m); };
  const warn = (m) => { if (logger && typeof logger.warn === 'function') logger.warn(m); };
  let out = Array.isArray(venues) ? venues.slice() : [];
  let jbFallbackToOther = false;
  let ctxCountry = null;

  // 1) Hard user-distance ceiling. Venues with no distanceM pass (defensive
  //    — they're handled by the text rules below).
  if (Number.isFinite(hardCapM) && hardCapM > 0) {
    out = out.filter((v) => v.distanceM == null || v.distanceM <= hardCapM);
  }

  // 2) JB region — keep "johor" text OR within JB_HYBRID_M of the JB
  //    centroid, but never a Singapore-tagged venue.
  if (isJB) {
    const beforeJb = out.length;
    const preJb = out.slice();
    out = out.filter((v) => {
      const text = `${v.area || ''} ${v.name || ''}`;
      if (/\bjohor\b/i.test(text)) return true;
      if (/singapore/i.test(text)) return false;
      const d = haversineM(JB_CENTROID, v);
      return Number.isFinite(d) && d <= JB_HYBRID_M;
    });
    if (out.length !== beforeJb) {
      log(`[Cuisine-Search] D703b JB-hybrid-filter ${beforeJb} → ${out.length}`);
    }
    // Graceful exit: the JB pill is sticky at coords far from Johor
    // (Putrajaya / KL / Ipoh) and wiped the pool → restore + treat as OTHER.
    if (out.length === 0 && beforeJb >= 5 && locationMode
        && typeof locationMode.isFarFromJB === 'function' && locationMode.isFarFromJB(lat, lng)) {
      const dM = (typeof locationMode.haversineMeters === 'function')
        ? locationMode.haversineMeters(locationMode.JB_CBD, { lat, lng })
        : NaN;
      warn(`[Cuisine-Search] D703b JB-fallback: filter wiped ${beforeJb}→0 at coords ${Number.isFinite(dM) ? dM.toFixed(0) : '?'}m from JB CBD. Treating request as OTHER.`);
      out = preJb;
      jbFallbackToOther = true;
    }
  }

  // 3) OTHER (or JB-fallback) — soft per-country keyword filter, fail-open,
  //    with the stale-pref floor (keep the coord-pinned pool when the
  //    keyword filter would empty it).
  if (jbFallbackToOther || isOther) {
    if (typeof resolveCtxCountry === 'function') {
      try { ctxCountry = await resolveCtxCountry(); }
      catch (err) { warn(`[Cuisine-Search] country-pref read failed (no defence filter): ${err && err.message}`); }
    }
    if (jbFallbackToOther && !ctxCountry) {
      ctxCountry = 'MY';
      log('[Cuisine-Search] D703b JB-fallback default ctxCountry=MY');
    }
    if (ctxCountry && ctxCountry !== 'SG' && countryTextMatch
        && typeof countryTextMatch.filterVenuesByCountry === 'function') {
      try {
        if (countryTextMatch.hasKeywordsFor(ctxCountry)) {
          const beforeOther = out.length;
          const filtered = countryTextMatch.filterVenuesByCountry(out, ctxCountry);
          const floored = filtered.length === 0 && beforeOther > 0;
          out = (typeof demoteNeverEmpty === 'function')
            ? demoteNeverEmpty(filtered, out)            // keep coord-pinned pool when empty
            : (filtered.length ? filtered : out);
          if (floored) {
            log(`[Cuisine-Search] D703d country-text-filter cc=${ctxCountry} ${beforeOther}→0 → FLOOR: kept coord-pinned pool (country-pref stale vs pin)`);
          } else {
            log(`[Cuisine-Search] D703d OTHER country-text-filter cc=${ctxCountry} ${beforeOther} → ${out.length}`);
          }
        } else {
          log(`[Cuisine-Search] D703c OTHER-region: no keywords for cc=${ctxCountry}; pool=${out.length}`);
        }
      } catch (err) {
        warn(`[Cuisine-Search] country-text-match failed (skip filter): ${err && err.message}`);
      }
    } else {
      log(`[Cuisine-Search] D703c OTHER-region: no country-pref; skipping country-text-filter (pool=${out.length})`);
    }
  } else if (!isJB) {
    // 4) SG — keep "singapore" text OR within SG_PROX_M of the SG centroid
    //    (some hawker centres' formattedAddress lacks the country word).
    //    `!isJB` makes the three region rules mutually exclusive: a JB
    //    search that already ran the JB filter above (and did NOT fall back)
    //    is NOT also SG-filtered — see the header note on the one delta.
    out = out.filter((v) => {
      if (/singapore/i.test(`${v.area || ''} ${v.name || ''}`)) return true;
      const d = haversineM(SG_CENTROID, v);
      return Number.isFinite(d) && d <= SG_PROX_M;
    });
  }

  return { venues: out, jbFallbackToOther, ctxCountry };
}

module.exports = {
  scopeVenuesByRegion,
  HARD_CAP_M,
  JB_HYBRID_M,
  SG_PROX_M,
  JB_CENTROID,
  SG_CENTROID
};
