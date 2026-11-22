// newness-filter.js — v0.62.941.
//
// The New filter's per-venue check, as ONE function both search routes call.
//
// Until this release it lived inline in /api/cuisine/search (index.js, the block
// opened by `if (filters.newlyOpened)`). The operator asked on 25-10 '26 that the
// AI route "apply the same newness rule as the New filter" when it reads "new" in a
// question, so the block moved here verbatim and both routes call it — one copy of
// the rule, not two that drift. __tests__/newness-filter.test.js holds a verbatim
// copy of the old inline block and proves this function returns the same thing.
//
// What the rule is, briefly (newness-criteria.js is the authority):
//   • one Places details call per venue for its reviews; the OLDEST visible review's
//     age decides the band — ≤109 d strict, 110..183 d fill, older is refuted;
//   • a rated venue must beat 3.0; a large review count refutes newness outright;
//   • review time can only REFUTE, never confirm, so when every venue is refuted the
//     never-empty floor keeps the "newly opened"-biased pool and raises noProvenNew
//     (the Mini App's "no new places nearby" banner).
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md (invariant I2).

'use strict';

const newness = require('./newness-criteria');
const { oldestReviewDays } = require('./hidden-verify');
const { demoteNeverEmpty } = require('./pool-floor');

function defaultFetchReviews({ apiKey, redis }) {
  const axios = require('axios');
  return async (placeId) => {
    const { data } = await axios.get(
      `https://places.googleapis.com/v1/places/${placeId}`,
      { headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'reviews' }, timeout: 4000 }
    );
    try { require('./api-cost').recordMapsCall(redis, 'placeDetails'); } catch { /* best-effort */ }
    return data;
  };
}

// Returns { venues, noProvenNew }. Mutates the venue objects exactly as the inline
// block did (_recencyBand set, _oldestReviewDays removed) because the card list
// reads _recencyBand downstream.
async function applyNewnessRule(venues, opts = {}) {
  const apiKey = opts.apiKey === undefined ? process.env.GOOGLE_MAPS_API_KEY : opts.apiKey;
  const fetchReviews = opts.fetchReviews || defaultFetchReviews({ apiKey, redis: opts.redis });
  const label = opts.logLabel || 'Cuisine-New';
  let pool = Array.isArray(venues) ? venues : [];
  if (apiKey) {
    await Promise.all(pool.map(async (v) => {
      if (!v.placeId) { v._oldestReviewDays = null; return; }
      try {
        const data = await fetchReviews(v.placeId);
        v._oldestReviewDays = oldestReviewDays(data?.reviews);
      } catch { v._oldestReviewDays = null; }
    }));
  }
  const beforeNew = pool.length;
  const preRefute = pool;
  const refuted = pool.filter((v) => {
    v._recencyBand = newness.recencyBand(v._oldestReviewDays);
    // v0.62.160 — the review COUNT refutes too (BOMUL Samgyetang, 3,759 reviews, read
    // as new because Places returns only its ≤5 most recent reviews).
    return newness.passesNewness({ oldestReviewDays: v._oldestReviewDays, rating: v.rating, reviewCount: v.userRatingCount });
  });
  const flooredToBias = refuted.length === 0 && preRefute.length > 0;
  pool = demoteNeverEmpty(refuted, preRefute);
  for (const v of pool) {
    delete v._oldestReviewDays;
    if (!v._recencyBand) v._recencyBand = 'strict';
  }
  console.log(`[${label}] newness refute: ${beforeNew} → ${pool.length} kept (≤${newness.NEW_FILL_DAYS}d, rated>${newness.NEW_RATING_FLOOR}, reviews≤${newness.NEW_REVIEW_COUNT_CEIL}${flooredToBias ? '; floor — kept biased pool, none proven-new' : ''})`);
  return { venues: pool, noProvenNew: flooredToBias };
}

// The New filter overrides the stricter global rating floor (3.7) with its own 3.0,
// so a 3.0..3.7 new venue the rule just kept is not dropped again by the floor.
function newnessFloorOpts(floorOpts, newlyOpened) {
  if (newlyOpened && floorOpts && floorOpts.mode === 'floor' && floorOpts.floor > newness.NEW_RATING_FLOOR) {
    return { ...floorOpts, floor: newness.NEW_RATING_FLOOR };
  }
  return floorOpts;
}

module.exports = { applyNewnessRule, newnessFloorOpts };
