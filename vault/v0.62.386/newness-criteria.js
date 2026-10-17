// newness-criteria.js — ONE shared "is this venue newly opened?" rule.
//
// Operator (2026-06): the three "new" surfaces — the cuisine "New" pill, the
// /hidden refute, and the curated new-openings card list — must judge newness
// IDENTICALLY. This module is the single source of truth; no surface
// re-implements the rule.
//
// The rule (locked via AskUserQuestion):
//   • Recency is the MANDATORY first filter. The oldest visible Google review:
//       ≤ NEW_STRICT_DAYS (109 d)        → strict "new"        (band 'strict')
//       NEW_STRICT_DAYS+1 .. NEW_FILL_DAYS (110..183 d, ≤6 mo) → fill band only
//       > NEW_FILL_DAYS                  → proven too old       (band null)
//     `oldestReviewDays == null` (no parseable reviews) does NOT refute newness
//     — Places returns ≤5 reviews, so absence proves nothing → treat as
//     strict-eligible.
//   • Unrated venues are ALLOWED.
//   • Rated venues are kept only if rating > NEW_RATING_FLOOR (3.0). This
//     OVERRIDES the stricter global 3.7 cuisine floor on the newness surfaces.
//   • Review COUNT is a REFUTE-ONLY factor (it can exclude, never include).
//     AU-7 amendment (v0.62.160) — supersedes the prior locked rule "Review
//     COUNT is never a factor": operator reported BOMUL Samgyetang (3,759
//     reviews, 4.9★) leaking as "new" in SG. Root cause: `oldestReviewDays`
//     comes from the ≤5 reviews Places returns, which for an ESTABLISHED venue
//     are all recent → it parses ≤183 d (or null) and the date heuristic calls
//     it new. A venue with thousands of reviews cannot be ≤6 months old, so a
//     review count above NEW_REVIEW_COUNT_CEIL refutes newness regardless of
//     the date band. (Never-empty floors downstream keep the page from
//     collapsing if this refutes everything.)
//
// The 110..183 d "fill" band exists ONLY to top a short page up toward 12 and
// must be rendered VISUALLY SEPARATED from the strict band. 183 d (≈6 months)
// is the absolute ceiling — nothing older is ever shown.
//
// `oldestReviewDays(reviews)` (the days-precise age helper) lives in
// hidden-verify.js and is reused — this module does no date math itself.

const NEW_STRICT_DAYS = 109;   // strict "new" band: ≤ this many days
const NEW_FILL_DAYS = 183;     // fill-band ceiling (≈6 months); absolute max
const NEW_RATING_FLOOR = 3.0;  // rated venues must be STRICTLY greater than this
// v0.62.160 — a venue with MORE than this many Google reviews cannot plausibly
// be ≤6 months old; treat the high count as proof it's established (refute-only).
// A genuinely-new viral SG eatery rarely exceeds this in ≤6 months.
const NEW_REVIEW_COUNT_CEIL = 400;

// Which recency band a venue falls in, from the oldest review's age in days.
//   'strict' — ≤109 d, OR null (unrefuted: no parseable reviews)
//   'fill'   — 110..183 d (only used to fill a short page, shown separated)
//   null     — > 183 d: proven too old, never shown
function recencyBand(oldestReviewDays) {
  if (oldestReviewDays == null) return 'strict';
  if (oldestReviewDays > NEW_FILL_DAYS) return null;
  if (oldestReviewDays <= NEW_STRICT_DAYS) return 'strict';
  return 'fill';
}

// Rated venues must beat the 3.0 floor; unrated (null) always pass.
function passesRating(rating) {
  return rating == null || rating > NEW_RATING_FLOOR;
}

// Refute-only review-count gate: a count above the ceiling proves the venue is
// established. Unknown count (null) passes (proves nothing).
function passesReviewCount(reviewCount) {
  return !(Number.isFinite(reviewCount) && reviewCount > NEW_REVIEW_COUNT_CEIL);
}

// Full newness gate (recency within the 6-month ceiling AND the rating floor AND
// the review-count ceiling — the count can only REFUTE, never confirm).
function passesNewness({ oldestReviewDays = null, rating = null, reviewCount = null } = {}) {
  return recencyBand(oldestReviewDays) !== null && passesRating(rating) && passesReviewCount(reviewCount);
}

// Strict "new" (≤109 d) AND rating floor AND review-count ceiling — the bar for
// an "opened …" claim.
function isStrictNew({ oldestReviewDays = null, rating = null, reviewCount = null } = {}) {
  return recencyBand(oldestReviewDays) === 'strict' && passesRating(rating) && passesReviewCount(reviewCount);
}

module.exports = {
  NEW_STRICT_DAYS,
  NEW_FILL_DAYS,
  NEW_RATING_FLOOR,
  NEW_REVIEW_COUNT_CEIL,
  recencyBand,
  passesRating,
  passesReviewCount,
  passesNewness,
  isStrictNew,
};
