// rarity-score.js — v0.57.17
//
// Neighbourhood-relative rarity ranking for /hidden (formerly /surprise).
//
// Why this exists: the previous static gate ("rating ≥ 4.3 AND
// userRatingCount < 50") returns 0 results in dense neighbourhoods
// (every place has ≥50 reviews) and pads with generic high-rated
// chains in sparse ones. Rarity score is computed RELATIVE to the
// candidate pool returned for THIS query, so it adapts:
//
//   * In Holland Village, "<50 reviews" excludes everyone — but a
//     place with 70 reviews when the median is 400 is still locally
//     lesser-known. Percentile-based ranking catches that.
//   * In a sparse area, the same logic still surfaces the top
//     candidates by rating × low-volume × recency.
//
// Reuses the median-on-sorted-sample pattern from
// pipeline.js:computeCrowdSignal (sort, find rank, derive ratio).
//
// API:
//   applyRarityRanking(candidates, target = 5) -> ranked array
//   - candidates: [{ rating, userRatingCount, recencyScore? }]
//   - target: max returned (default 5)
//   - returns the candidates sorted by rarityScore desc, sliced to target

// rarityScore weights — sum to 1.0.
//   0.4  ratingPercentile      — higher rating in the pool
//   0.4  (1 - reviewCountPct)  — fewer reviews vs the pool
//   0.2  recencyScore          — alive, not abandoned
const W_RATING = 0.4;
const W_LOW_VOLUME = 0.4;
const W_RECENCY = 0.2;

// Default recency when we can't determine review age (no inline
// reviews available without a Place Details call). Conservative
// midpoint — doesn't penalise unknowns to zero.
const DEFAULT_RECENCY = 0.3;

// percentileRank — fraction of pool with value ≤ target value.
// Returns 0..1. Empty pool → 0. Single-element pool → 1.0 (everyone
// is at the top of their own pool).
function percentileRank(sortedAsc, value) {
  if (!sortedAsc.length) return 0;
  if (sortedAsc.length === 1) return 1;
  if (!Number.isFinite(value)) return 0;
  // Count of pool members ≤ value.
  // Linear scan is fine — pool is typically 15-20 candidates.
  let count = 0;
  for (const v of sortedAsc) {
    if (v <= value) count += 1;
    else break;
  }
  return count / sortedAsc.length;
}

// computeRecency — derive 0..1 score from review age signals.
// Inputs (all optional, take the strongest available):
//   - lastReviewDaysAgo: number of days since the most recent review
//   - hasRecentReviews:  boolean — passed the legacy ≤ 45-day signal
//   - userRatingCount:   used as fallback "alive enough" signal
function computeRecency(c) {
  if (typeof c.recencyScore === 'number') return c.recencyScore;
  if (typeof c.lastReviewDaysAgo === 'number') {
    if (c.lastReviewDaysAgo <= 30) return 1.0;
    if (c.lastReviewDaysAgo <= 90) return 0.5;
    return 0.0;
  }
  if (c.hasRecentReviews === true) return 1.0;
  if (c.hasRecentReviews === false) return 0.0;
  return DEFAULT_RECENCY;
}

function scoreCandidate(c, sortedRatings, sortedReviewCounts) {
  const ratingPct = percentileRank(sortedRatings, Number(c.rating ?? 0));
  const reviewPct = percentileRank(sortedReviewCounts, Number(c.userRatingCount ?? 0));
  const recency = computeRecency(c);
  return W_RATING * ratingPct
       + W_LOW_VOLUME * (1 - reviewPct)
       + W_RECENCY * recency;
}

function applyRarityRanking(candidates, target = 5) {
  if (!Array.isArray(candidates) || !candidates.length) return [];
  const sortedRatings = candidates
    .map((c) => Number(c.rating))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const sortedReviewCounts = candidates
    .map((c) => Number(c.userRatingCount))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  const scored = candidates.map((c) => ({
    ...c,
    rarityScore: scoreCandidate(c, sortedRatings, sortedReviewCounts)
  }));
  scored.sort((a, b) => b.rarityScore - a.rarityScore);
  return scored.slice(0, target);
}

module.exports = {
  applyRarityRanking,
  // exposed for tests
  percentileRank,
  computeRecency,
  scoreCandidate,
  W_RATING, W_LOW_VOLUME, W_RECENCY, DEFAULT_RECENCY
};
