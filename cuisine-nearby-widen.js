// cuisine-nearby-widen.js — v0.61.161
//
// Operator (post v0.61.160 debug):
//   "the spread should priortise the location set at least 3 with
//    top rating >4, then open by enlarging the radius by 2km, then
//    by 6km, by 8km, then 12km then 15km, 20 km."
//
// Implementation note. The cuisine-search backend already fetches a
// wide pool (up to ~30 venues at the 20 km default radius) and
// computes `distanceM` per venue. Rather than make six fresh Places
// calls — 6× API cost — we run the existing fetch once and apply a
// post-filter ladder over the in-memory pool. The smallest radius
// that surfaces ≥ MIN_TOP_RATED venues with rating > TOP_RATING_GT
// wins; final fallback at the widest tier returns whatever exists.
//
// Side effect: callers who relied on "12 venues every search" may see
// fewer when the ladder cuts to a tight tier — that's the operator's
// intent (prefer nearer over further when ratings are good). The
// downstream slice (`venues.slice(0, 12)`) still caps the response.
//
// Public surface:
//   LADDER_M                — readonly [2000, 6000, 8000, 12000, 15000, 20000]
//   MIN_TOP_RATED           — 3 (operator's "at least 3")
//   TOP_RATING_GT           — 4.0 (operator's "rating > 4")
//   countTopRated(venues, ratingGt)
//   widenAndPick({ venues, ladder, cap, minTopRated, ratingGt })
//                           → { venues, radiusM, satisfied, tier }
//                             venues  = filtered subset (distance ≤ radius)
//                             radiusM = the chosen ladder tier
//                             satisfied = true when ≥ minTopRated > ratingGt
//                             tier    = ladder index used (0-based)

'use strict';

const LADDER_M = Object.freeze([2000, 6000, 8000, 12000, 15000, 20000]);
const MIN_TOP_RATED = 3;
const TOP_RATING_GT = 4.0;

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
function widenAndPick({
  venues,
  ladder = LADDER_M,
  cap = null,
  minTopRated = MIN_TOP_RATED,
  ratingGt = TOP_RATING_GT
} = {}) {
  const arr = Array.isArray(venues) ? venues : [];
  const ladderEffective = (Number.isFinite(cap) && cap > 0)
    ? ladder.filter((r) => r <= cap)
    : ladder.slice();
  // Defensive: caller passes an explicit ladder shorter than the
  // default (e.g. test). When cap drops everything (cap < 2000),
  // there's no ladder; return the input.
  if (!ladderEffective.length) {
    return { venues: arr, radiusM: 0, satisfied: false, tier: -1 };
  }
  // Walk small → wide. Stop at the first tier that satisfies.
  for (let i = 0; i < ladderEffective.length; i++) {
    const r = ladderEffective[i];
    const subset = arr.filter((v) => Number.isFinite(v?.distanceM) && v.distanceM <= r);
    if (countTopRated(subset, ratingGt) >= minTopRated) {
      return { venues: subset, radiusM: r, satisfied: true, tier: i };
    }
  }
  // No tier satisfied — return the widest tier's subset (which may
  // still be empty if the venues pool was thin). Caller's downstream
  // dedup + 12-cap slice handles the rest.
  const wide = ladderEffective[ladderEffective.length - 1];
  const subset = arr.filter((v) => Number.isFinite(v?.distanceM) && v.distanceM <= wide);
  return { venues: subset, radiusM: wide, satisfied: false, tier: ladderEffective.length - 1 };
}

module.exports = {
  LADDER_M,
  MIN_TOP_RATED,
  TOP_RATING_GT,
  countTopRated,
  widenAndPick
};
