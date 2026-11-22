// __tests__/newness-filter.test.js — v0.62.941.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md, invariant I2.
//
// "When it infers 'new', apply the same newness rule as the New filter" (operator,
// 25-10 '26). The rule lived inline in /api/cuisine/search. It now lives in
// newness-filter.js and BOTH routes call it, so there is one copy to drift instead
// of two. The guard has two halves:
//   1. the extracted function produces exactly what the inline block produced, on
//      fixtures that exercise every branch (strict, fill, too old, review-count
//      refute, unrated, no placeId, fetch failure, the never-empty floor);
//   2. both routes call it, and the inline copy is gone.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const nf = require('../newness-filter.js');
const newness = require('../newness-criteria.js');
const { oldestReviewDays } = require('../hidden-verify.js');

const DAY = 86400000;
const NOW = Date.now();
const reviewsAged = (...days) => days.map((d) => ({ publishTime: new Date(NOW - d * DAY).toISOString() }));

// The /api/cuisine/search block as it stood in v0.62.940 (index.js ~17389-17447),
// copied verbatim except that the Places call is the injected `fetchReviews` and the
// log line is dropped. This is the reference the extraction must reproduce.
async function referenceBlock(venues, { apiKey, fetchReviews }) {
  let noProvenNew = false;
  if (apiKey) {
    await Promise.all(venues.map(async (v) => {
      if (!v.placeId) { v._oldestReviewDays = null; return; }
      try {
        const data = await fetchReviews(v.placeId);
        v._oldestReviewDays = oldestReviewDays(data?.reviews);
      } catch { v._oldestReviewDays = null; }
    }));
  }
  const preRefute = venues;
  const refuted = venues.filter((v) => {
    v._recencyBand = newness.recencyBand(v._oldestReviewDays);
    return newness.passesNewness({ oldestReviewDays: v._oldestReviewDays, rating: v.rating, reviewCount: v.userRatingCount });
  });
  const flooredToBias = refuted.length === 0 && preRefute.length > 0;
  noProvenNew = flooredToBias;
  venues = require('../pool-floor.js').demoteNeverEmpty(refuted, preRefute);
  for (const v of venues) {
    delete v._oldestReviewDays;
    if (!v._recencyBand) v._recencyBand = 'strict';
  }
  return { venues, noProvenNew };
}

const REVIEWS = {
  strict: reviewsAged(30, 40, 60),            // oldest 60 d → strict
  fill: reviewsAged(20, 150),                 // oldest 150 d → fill band
  old: reviewsAged(10, 400),                  // oldest 400 d → too old
  none: [],                                   // no reviews → not refuted
};
const fetcherFor = (map) => async (placeId) => {
  if (map[placeId] === 'THROW') throw new Error('places 500');
  return { reviews: map[placeId] };
};

function fixture() {
  return [
    { placeId: 'a', name: 'Strict new', rating: 4.5, userRatingCount: 40 },
    { placeId: 'b', name: 'Fill band', rating: 4.1, userRatingCount: 90 },
    { placeId: 'c', name: 'Too old', rating: 4.8, userRatingCount: 300 },
    { placeId: 'd', name: 'Recent reviews, 3,759 of them', rating: 4.9, userRatingCount: 3759 },
    { placeId: 'e', name: 'Unrated, no reviews' },
    { placeId: 'f', name: 'Low rated new', rating: 2.6, userRatingCount: 12 },
    { name: 'No placeId', rating: 4.0 },
    { placeId: 'g', name: 'Fetch fails', rating: 4.2, userRatingCount: 20 },
  ];
}
const MAP = { a: REVIEWS.strict, b: REVIEWS.fill, c: REVIEWS.old, d: REVIEWS.strict, e: REVIEWS.none, f: REVIEWS.strict, g: 'THROW' };

describe('applyNewnessRule reproduces the inline New-filter block exactly', () => {
  it('mixed pool: same survivors, same order, same bands, same flag', async () => {
    const want = await referenceBlock(fixture(), { apiKey: 'k', fetchReviews: fetcherFor(MAP) });
    const got = await nf.applyNewnessRule(fixture(), { apiKey: 'k', fetchReviews: fetcherFor(MAP) });
    expect(got).toEqual(want);
    // and the rule actually bites: the established and the low-rated venue are gone
    const names = got.venues.map((v) => v.name);
    expect(names).not.toContain('Too old');
    expect(names).not.toContain('Recent reviews, 3,759 of them');
    expect(names).not.toContain('Low rated new');
    expect(got.noProvenNew).toBe(false);
  });

  it('nothing provably new: the floor keeps the pool and raises noProvenNew', async () => {
    const pool = () => [
      { placeId: 'c', name: 'Too old', rating: 4.8, userRatingCount: 300 },
      { placeId: 'd', name: 'Huge count', rating: 4.9, userRatingCount: 3759 },
    ];
    const want = await referenceBlock(pool(), { apiKey: 'k', fetchReviews: fetcherFor(MAP) });
    const got = await nf.applyNewnessRule(pool(), { apiKey: 'k', fetchReviews: fetcherFor(MAP) });
    expect(got).toEqual(want);
    expect(got.noProvenNew).toBe(true);
    expect(got.venues.length).toBe(2);
  });

  it('no API key: no Places calls, same result as the inline block', async () => {
    let calls = 0;
    const counting = async () => { calls += 1; return { reviews: [] }; };
    const want = await referenceBlock(fixture(), { apiKey: '', fetchReviews: counting });
    const got = await nf.applyNewnessRule(fixture(), { apiKey: '', fetchReviews: counting });
    expect(got).toEqual(want);
    expect(calls).toBe(0);
  });

  it('empty pool stays empty with no flag', async () => {
    const got = await nf.applyNewnessRule([], { apiKey: 'k', fetchReviews: fetcherFor(MAP) });
    expect(got).toEqual({ venues: [], noProvenNew: false });
  });
});

describe('newnessFloorOpts — the New filter\'s rating floor cap', () => {
  it('caps a stricter floor at the newness floor when New is on', () => {
    const out = nf.newnessFloorOpts({ mode: 'floor', floor: 3.7 }, true);
    expect(out).toEqual({ mode: 'floor', floor: newness.NEW_RATING_FLOOR });
  });
  it('leaves the floor alone when New is off, or already lower, or not a floor', () => {
    expect(nf.newnessFloorOpts({ mode: 'floor', floor: 3.7 }, false)).toEqual({ mode: 'floor', floor: 3.7 });
    expect(nf.newnessFloorOpts({ mode: 'floor', floor: 2.5 }, true)).toEqual({ mode: 'floor', floor: 2.5 });
    expect(nf.newnessFloorOpts({ mode: 'off' }, true)).toEqual({ mode: 'off' });
  });
});

describe('one copy of the rule, called by both routes', () => {
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  const route = (marker) => {
    const at = src.indexOf(marker);
    expect(at, `route ${marker} not found`).toBeGreaterThan(-1);
    const next = src.indexOf("app.post('/api/", at + marker.length);
    return src.slice(at, next === -1 ? undefined : next);
  };
  it('/api/cuisine/search calls applyNewnessRule and no longer carries the inline copy', () => {
    const body = route("app.post('/api/cuisine/search'");
    expect(body).toMatch(/applyNewnessRule\(/);
    expect(body).not.toMatch(/newness\.passesNewness\(/);
    expect(body).toMatch(/newnessFloorOpts\(/);
  });
  it('/api/cuisine/nl-query calls applyNewnessRule when New is inferred and returns noProvenNew', () => {
    const body = route("app.post('/api/cuisine/nl-query'");
    expect(body).toMatch(/if \(merged\.newlyOpened\)[\s\S]{0,200}applyNewnessRule\(/);
    expect(body).toMatch(/noProvenNew/);
  });
  it('passesNewness is called from newness-filter.js and nowhere in index.js', () => {
    expect(src).not.toMatch(/passesNewness\(/);
    const mod = readFileSync(join(__dirname, '..', 'newness-filter.js'), 'utf8');
    expect(mod).toMatch(/passesNewness\(/);
  });
});
