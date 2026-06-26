// insights.js — objective, per-search read-out for the Cuisine TMA.
//
// `deriveInsights(venues)` summarises the result set the TMA already holds — no
// I/O, no React, fully unit-testable. It powers the slim insight strip above the
// results and the line that rides copy-to-chat. v1 surfaces the Value map
// (count, median price, best value) + Hidden gems; newCount is omitted (no
// reliable per-venue newness signal yet). See
// docs/superpowers/specs/2026-06-25-search-insights-design.md.

// Tunable constants — pinned in planning, easy to adjust after a live look.
export const GEM_RATING = 4.3;      // "high-rated" floor for a hidden gem
export const GEM_REVIEW_CAP = 150;  // "under-reviewed" ceiling (few reviews)
export const MIN_PRICED = 4;        // need this many priced venues for a median

// Per-pax midpoint of a normalised priceRange ({currencyCode,start,end}); null
// when there's no usable money on the venue.
function priceMidpoint(priceRange) {
  if (!priceRange || typeof priceRange !== 'object') return null;
  const { start, end } = priceRange;
  const lo = Number.isFinite(start) ? start : end;
  const hi = Number.isFinite(end) ? end : start;
  if (!Number.isFinite(lo) && !Number.isFinite(hi)) return null;
  const mid = (Number.isFinite(lo) && Number.isFinite(hi)) ? (lo + hi) / 2
    : (Number.isFinite(lo) ? lo : hi);
  return Number.isFinite(mid) && mid > 0 ? mid : null;
}

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// venues → { count, medianPrice, bestValue, gemCount }
// Each sub-insight degrades to null/0 when its inputs are too thin, so the strip
// never shows a half-empty or fabricated figure.
export function deriveInsights(venues) {
  const list = Array.isArray(venues) ? venues.filter(Boolean) : [];
  const count = list.length;

  // Value map — median price (in the search's display currency; within one
  // search the currency is consistent, so the raw midpoints are comparable).
  const priced = list
    .map((v) => ({ mid: priceMidpoint(v.priceRange), cur: v.priceRange && v.priceRange.currencyCode }))
    .filter((x) => x.mid != null);
  const medianPrice = priced.length >= MIN_PRICED
    ? { value: median(priced.map((x) => x.mid)), currency: priced[0].cur || null }
    : null;

  // Best value — highest rating-per-price among venues that have BOTH a rating
  // and a price. Omitted when no venue qualifies.
  let bestValue = null;
  let bestScore = -Infinity;
  for (const v of list) {
    const rating = Number.isFinite(v.rating) ? v.rating : null;
    const mid = priceMidpoint(v.priceRange);
    if (rating == null || mid == null) continue;
    const score = rating / mid;
    if (score > bestScore) {
      bestScore = score;
      bestValue = {
        name: v.name || '',
        rating,
        price: mid,
        currency: (v.priceRange && v.priceRange.currencyCode) || null,
      };
    }
  }

  // Hidden gems — high-rated but under-reviewed.
  const gemCount = list.filter((v) => Number.isFinite(v.rating) && v.rating >= GEM_RATING
    && Number.isFinite(v.userRatingCount) && v.userRatingCount < GEM_REVIEW_CAP).length;

  return { count, medianPrice, bestValue, gemCount };
}
