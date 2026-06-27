// cuisine-nearby-widen.js — v0.61.441
//
// Operator (v0.61.441 — "concentric circles" ask):
//   "unhinge the search in concentric circles so the sort in cuisine TMA
//    is first 5km, 10km, 15km, 25km, 45km, 60km — superior UX than
//    Google Maps."
//   (Superseding the v0.61.160 ladder [2,6,8,12,15,20].)
//
// Implementation note. The cuisine-search backend computes `distanceM`
// per venue. This module is the in-memory RING-PREFERENCE pass: given a
// distance-bearing pool, it finds the smallest ladder tier that already
// surfaces a healthy set (≥ MIN_TOP_RATED with rating > TOP_RATING_GT
// AND ≥ minServed venues total), and returns that tier's subset SORTED
// nearest-first. The actual OUTER-ring fetch (45/60 km) lives in
// cuisine-nearby-refetch.js — this module only filters/orders what is
// already in memory.
//
// v0.61.441 — two correctness fixes folded in:
//   - each tier's subset is sorted ASC by distanceM INSIDE the function
//     so ordering no longer depends on the caller's upstream sort (the
//     shuffle path had none);
//   - `minServed` (default 2) stops a tier from "satisfying" with a
//     single top-rated venue + nothing else behind it.
//
// Public surface:
//   LADDER_M                — readonly [5000, 10000, 15000, 25000, 45000, 60000]
//   MIN_TOP_RATED           — 3 (operator's "at least 3")
//   TOP_RATING_GT           — 4.0 (operator's "rating > 4")
//   MIN_SERVED              — 2 (a tier must hold ≥2 venues to satisfy)
//   countTopRated(venues, ratingGt)
//   widenAndPick({ venues, ladder, cap, minTopRated, ratingGt, minServed })
//                           → { venues, radiusM, satisfied, tier }
//                             venues  = filtered subset (distance ≤ radius), nearest-first
//                             radiusM = the chosen ladder tier
//                             satisfied = ≥minTopRated rated>ratingGt AND ≥minServed total
//                             tier    = ladder index used (0-based)

'use strict';

const LADDER_M = Object.freeze([5000, 10000, 15000, 25000, 45000, 60000]);
const MIN_TOP_RATED = 3;
const TOP_RATING_GT = 4.0;
const MIN_SERVED = 2;

function countTopRated(venues, ratingGt = TOP_RATING_GT) {
  if (!Array.isArray(venues)) return 0;
  let n = 0;
  for (const v of venues) {
    if (!v) continue;
    const r = Number(v.rating);
    if (Number.isFinite(r) && r > ratingGt) n++;
  }
  return n;
}

// Returns the smallest radius in the ladder that surfaces ≥
// minTopRated venues with rating > ratingGt. Respects `cap` (e.g.
// Putrajaya 15 km, JB 30 km) — ladder tiers beyond cap are dropped.
// If no tier satisfies, returns the widest available tier with all
// in-cap venues (caller decides whether to surface the lower-rated
// fallback or show "no matches").
// Returns the subset of `arr` within radius `r`, sorted nearest-first.
function subsetWithin(arr, r) {
  return arr
    .filter((v) => Number.isFinite(v?.distanceM) && v.distanceM <= r)
    .sort((a, b) => a.distanceM - b.distanceM);
}

function widenAndPick({
  venues,
  ladder = LADDER_M,
  cap = null,
  minTopRated = MIN_TOP_RATED,
  ratingGt = TOP_RATING_GT,
  minServed = MIN_SERVED
} = {}) {
  const arr = Array.isArray(venues) ? venues : [];
  const ladderEffective = (Number.isFinite(cap) && cap > 0)
    ? ladder.filter((r) => r <= cap)
    : ladder.slice();
  // Defensive: caller passes an explicit ladder shorter than the
  // default (e.g. test). When cap drops everything (cap < smallest tier),
  // there's no ladder; return the input.
  if (!ladderEffective.length) {
    return { venues: arr, radiusM: 0, satisfied: false, tier: -1 };
  }
  // Walk small → wide. A tier satisfies only when it holds ≥ minTopRated
  // venues rated > ratingGt AND ≥ minServed venues total (so a lone
  // 5-star doesn't "satisfy" a tier that has nothing behind it).
  for (let i = 0; i < ladderEffective.length; i++) {
    const r = ladderEffective[i];
    const subset = subsetWithin(arr, r);
    if (subset.length >= minServed && countTopRated(subset, ratingGt) >= minTopRated) {
      return { venues: subset, radiusM: r, satisfied: true, tier: i };
    }
  }
  // No tier satisfied — return the widest tier's subset (nearest-first;
  // may still be empty if the pool was thin). The caller's downstream
  // dedup + slice + never-≤1 floor handles the rest.
  const wide = ladderEffective[ladderEffective.length - 1];
  const subset = subsetWithin(arr, wide);
  return { venues: subset, radiusM: wide, satisfied: false, tier: ladderEffective.length - 1 };
}

module.exports = {
  LADDER_M,
  MIN_TOP_RATED,
  TOP_RATING_GT,
  MIN_SERVED,
  countTopRated,
  widenAndPick
};
