// cuisine-nearby-refetch.js — v0.61.441
//
// Progressive OUTER-RING re-fetch for the normal /api/cuisine/search
// path. Sibling of cuisine-special-mode-widen.js (same injected-IO
// shape) — generalised from the special-mode pattern to the everyday
// cuisine search.
//
// Why: the in-memory ladder (cuisine-nearby-widen.js) only *filters* the
// pool the base fetch already returned. The base fetch reaches
// `searchRadius` (default 20 km SG / 30 km JB / 40 km OTHER), so the
// outer rings the operator asked for (45 km / 60 km) are EMPTY unless we
// actually fetch them. When a near-pool is thin (the "compressed to 1
// result" bug), this fires up to TWO extra Places passes at the next
// ladder tiers — but ONLY up to `anchorCap` (the per-city max), never
// the slider's possibly-tighter `searchRadius` — to fuel the rings.
//
// Demand-driven by design: the caller only invokes this when the
// post-floor / post-dedup unseen count is below target, so healthy dense
// queries pay nothing. Bounded latency: at most `maxFetches` (2) extra
// fetches, bailing as soon as `target` fresh venues are found.
//
// All IO injected:
//   discoverFn         — pipeline.discover
//   passesVenueFilter  — venue-filters.passesVenueFilter
//
// Returns { venues, fetches, finalRadiusM } where `venues` are FRESH,
// deduped, venue-filtered candidates with `distanceM` attached. The
// caller applies its own rating-floor + seen/session dedup + merge.

'use strict';

const { LADDER_M } = require('./cuisine-nearby-widen');

const DEFAULT_TARGET = 5;
const DEFAULT_MAX_FETCHES = 2;

function haversineM(a, b) {
  if (!a || !b || !Number.isFinite(a.lat) || !Number.isFinite(a.lng)
      || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) return null;
  const R = 6371000, toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(x)));
}

async function refetchOuterRings({
  seeds,
  searchCenter,
  searchRegionCode,
  lang,
  startRadius,
  anchorCap = null,
  existingPlaceIds = [],
  ladder = LADDER_M,
  target = DEFAULT_TARGET,
  maxFetches = DEFAULT_MAX_FETCHES,
  expandSingaporean = false,
  discoverFn,
  passesVenueFilter,
  logger = console
} = {}) {
  const result = { venues: [], fetches: 0, finalRadiusM: startRadius };
  if (typeof discoverFn !== 'function') return result;
  if (typeof passesVenueFilter !== 'function') passesVenueFilter = () => true;
  if (!searchCenter || !Number.isFinite(searchCenter.lat) || !Number.isFinite(searchCenter.lng)) return result;
  if (!Number.isFinite(startRadius) || startRadius <= 0) return result;

  // Ceiling is the per-city anchorCap when set (NOT searchRadius — a tight
  // slider must not stop us reaching the city max on a thin pool); else
  // the widest ladder tier.
  const cap = (Number.isFinite(anchorCap) && anchorCap > 0)
    ? anchorCap
    : ladder[ladder.length - 1];

  // The next ladder tiers strictly beyond the base fetch, within the cap,
  // limited to `maxFetches` passes.
  const tiers = ladder
    .filter((r) => r > startRadius && r <= cap)
    .slice(0, Math.max(0, maxFetches));
  if (!tiers.length) return result;

  const seenIds = new Set((existingPlaceIds || []).filter(Boolean));
  const seedList = Array.isArray(seeds) ? seeds.filter(Boolean) : [];
  // No cuisine seeds (warm-start / no-cuisine search) → one generic pass
  // per tier with an empty cuisine list (discover handles the fallback).
  const effectiveSeeds = seedList.length ? seedList : [''];

  for (const wider of tiers) {
    if (result.venues.length >= target) break;
    if (logger && typeof logger.log === 'function') {
      logger.log(`[Cuisine-Search] D791 nearby-refetch ${result.finalRadiusM}m → ${wider}m (have ${result.venues.length}/${target} fresh, cap=${cap})`);
    }
    const perSeed = await Promise.all(effectiveSeeds.map((q) =>
      discoverFn({
        lat: searchCenter.lat,
        lng: searchCenter.lng,
        radius: wider,
        cuisines: q ? [q] : [],
        maxResults: 15,
        regionCode: searchRegionCode,
        lang,
        expandSingaporean
      }).catch((err) => {
        if (logger && typeof logger.warn === 'function') {
          logger.warn(`[Cuisine-Search] D791 refetch seed "${q}" failed: ${err && err.message}`);
        }
        return [];
      })
    ));
    const flat = perSeed
      .map((r) => Array.isArray(r) ? r : (r && r.venues) || [])
      .flat();
    let fresh = flat.filter((v) => v && v.placeId && !seenIds.has(v.placeId));
    fresh = fresh.filter(passesVenueFilter);
    for (const v of fresh) {
      seenIds.add(v.placeId);
      // Attach distanceM if discover didn't (parity with the main path's
      // haversine) so the caller can sort the merged pool nearest-first.
      if (!Number.isFinite(v.distanceM)) {
        const d = haversineM(searchCenter, v);
        if (Number.isFinite(d)) {
          v.distanceM = d;
          if (!Number.isFinite(v.walkMinutes)) v.walkMinutes = Math.round(d / 80);
        }
      }
      result.venues.push(v);
      if (result.venues.length >= target) break;
    }
    result.fetches++;
    result.finalRadiusM = wider;
    if (wider >= cap) break;
  }
  return result;
}

module.exports = { refetchOuterRings, DEFAULT_TARGET, DEFAULT_MAX_FETCHES };
