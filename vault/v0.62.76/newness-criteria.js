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
//   • Review COUNT is never a factor (neither to include nor exclude).
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

// Full newness gate (recency within the 6-month ceiling AND the rating floor).
// Review count is intentionally never consulted.
function passesNewness({ oldestReviewDays = null, rating = null } = {}) {
  return recencyBand(oldestReviewDays) !== null && passesRating(rating);
}

// Strict "new" (≤109 d) AND rating floor — the bar for an "opened …" claim.
function isStrictNew({ oldestReviewDays = null, rating = null } = {}) {
  return recencyBand(oldestReviewDays) === 'strict' && passesRating(rating);
}

module.exports = {
  NEW_STRICT_DAYS,
  NEW_FILL_DAYS,
  NEW_RATING_FLOOR,
  recencyBand,
  passesRating,
  passesNewness,
  isStrictNew,
};
