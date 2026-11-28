'use strict';

// cuisine-near-first.js - v0.62.997
//
// Spec doc/Feature/2026-11-28-cuisine-saved-place-near-first.spec.md. A search from the set place starts 2 km
// around it, keeps only places inside the radius it reports, and widens to 5, 10 and 20 km only while fewer than 6
// places come back, never past the area the search used before this release (the region default or the place's
// own radius cap).
//
// Why: the operator's search from Pasir Panjang MRT at 18:29:26 SGT on 28-11 '26 ran at the 20 km Singapore default
// and showed the first 6 of 60 candidates in Google's order, 4 of them 6 to 9 km away. Operator: "Near first, then
// widen" and, for which searches, "Everywhere".
//
// Each widening step is ONE call to the caller's discover function, at most NEAR_MAX_FETCHES of them. A discover
// call may itself spend more than one Google Places request (more pages, or several picked cuisines); that cost is
// the pipeline's, as it is for the first search.

const NEAR_START_M = 2000;
const NEAR_STEPS_M = Object.freeze([5000, 10000, 20000]);
const NEAR_MIN = 6;
const NEAR_MAX_FETCHES = 3;

// The server reads a client radius only inside 1 to 100 km (index.js, v0.58.8); anything else is ignored there, so
// it does not opt a search out of near-first here either.
function clientRadiusHonoured(r) {
  return Number.isFinite(r) && r >= 1000 && r <= 100000;
}

// Near-first applies to an ordinary search from the set place. A radius the client chose, a place named in the
// typed text (it has its own tight radius), the special modes (their own widening), an explicit widen tap and the
// curated Michelin list keep what they did before.
function nearFirstApplies({ clientRadius, placeAnchor, specialMode, widen, michelin } = {}) {
  if (clientRadiusHonoured(clientRadius)) return false;
  return !placeAnchor && !specialMode && !widen && !michelin;
}

function nearStartRadius(ceilingM) {
  return (Number.isFinite(ceilingM) && ceilingM > 0) ? Math.min(NEAR_START_M, ceilingM) : NEAR_START_M;
}

function haversineM(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)
      || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

// The places within `radiusM` of `center`. A distance the pipeline already measured is trusted; a missing one is
// measured and written onto the venue (with a walking time at 80 m a minute, as cuisine-nearby-refetch.js does). A
// place with no coordinates cannot be shown to be inside, so it is dropped.
function withinRadius(venues, center, radiusM) {
  const out = [];
  for (const v of Array.isArray(venues) ? venues : []) {
    if (!v) continue;
    let d = Number.isFinite(v.distanceM) ? v.distanceM : haversineM(center, v);
    if (!Number.isFinite(d)) continue;
    if (!Number.isFinite(v.distanceM)) {
      v.distanceM = d;
      if (!Number.isFinite(v.walkMinutes)) v.walkMinutes = Math.round(d / 80);
    }
    if (d <= radiusM) out.push(v);
  }
  return out;
}

// The widening steps above `startM`, each capped at the ceiling, without repeats: 5, 10, 20 km under a 20 km or
// wider ceiling; 5, 10, 15 km under a 15 km city cap.
function stepsFor(startM, ceilingM) {
  const ceiling = (Number.isFinite(ceilingM) && ceilingM > 0) ? ceilingM : NEAR_STEPS_M[NEAR_STEPS_M.length - 1];
  const steps = [];
  for (const s of NEAR_STEPS_M) {
    const r = Math.min(s, ceiling);
    if (r > startM && !steps.includes(r)) steps.push(r);
  }
  return steps;
}

// Widen while fewer than `min` places are held. `have` is how many the caller already holds (its unseen pool);
// `prepare(list)` is the caller's filter for new places (venue filter, rating floor, seen sets) and returns the ones
// to keep. Returns the NEW places only, the radius reached, whether it widened, and how many searches it made.
async function widenNear({
  have = 0,
  center,
  startM = NEAR_START_M,
  ceilingM,
  min = NEAR_MIN,
  seeds = [],
  regionCode,
  lang,
  existingPlaceIds = [],
  discoverFn,
  prepare = (list) => list,
  logger = console,
} = {}) {
  const result = { venues: [], finalRadiusM: startM, widened: false, fetches: 0 };
  if (typeof discoverFn !== 'function') return result;
  if (!center || !Number.isFinite(center.lat) || !Number.isFinite(center.lng)) return result;
  let held = Number.isFinite(have) ? have : 0;
  if (held >= min) return result;
  const ids = new Set((existingPlaceIds || []).filter(Boolean));
  const cuisines = Array.isArray(seeds) ? seeds.filter(Boolean) : [];
  for (const step of stepsFor(startM, ceilingM)) {
    if (held >= min || result.fetches >= NEAR_MAX_FETCHES) break;
    let raw = [];
    try {
      const r = await discoverFn({ lat: center.lat, lng: center.lng, radius: step, cuisines, regionCode, lang });
      raw = Array.isArray(r) ? r : ((r && r.venues) || []);
    } catch (err) {
      if (logger && typeof logger.warn === 'function') logger.warn(`[Cuisine-Search] D797 near-first ${step}m search failed: ${err && err.message}`);
    }
    result.fetches += 1;
    result.finalRadiusM = step;
    result.widened = true;
    // A place outside this step's circle is not kept now; it is not marked as held either, so a wider step can
    // still keep it.
    const inside = withinRadius(raw.filter((v) => v && v.placeId && !ids.has(v.placeId)), center, step);
    let fresh = prepare(inside) || [];
    for (const v of fresh) {
      if (!v || !v.placeId || ids.has(v.placeId)) continue;
      ids.add(v.placeId);
      result.venues.push(v);
      held += 1;
    }
    if (logger && typeof logger.log === 'function') {
      logger.log(`[Cuisine-Search] D797 near-first widened to ${step}m: +${result.venues.length} so far, holding ${held}/${min}`);
    }
  }
  return result;
}

module.exports = {
  NEAR_START_M, NEAR_STEPS_M, NEAR_MIN, NEAR_MAX_FETCHES,
  nearFirstApplies, nearStartRadius, withinRadius, widenNear, stepsFor, haversineM,
};
