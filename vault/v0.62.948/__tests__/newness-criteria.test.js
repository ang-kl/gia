// __tests__/newness-criteria.test.js — v0.62.x
//
// The ONE shared "is this venue newly opened?" rule, used identically by the
// cuisine New pill, the /hidden refute, and the curated new-openings cards:
//   • ≤109 d = strict 'new'; 110..183 d = 'fill' band; >183 d = too old.
//   • null oldestReviewDays (no parseable reviews) → strict-eligible.
//   • rated venues must be > 3.0; unrated always pass.
//   • review count is NEVER consulted.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const N = require('../newness-criteria.js');

describe('newness-criteria — constants', () => {
  it('exposes the locked thresholds', () => {
    expect(N.NEW_STRICT_DAYS).toBe(109);
    expect(N.NEW_FILL_DAYS).toBe(183);
    expect(N.NEW_RATING_FLOOR).toBe(3.0);
  });
});

describe('newness-criteria — recencyBand', () => {
  it('null (no parseable reviews) is strict-eligible — absence cannot refute', () => {
    expect(N.recencyBand(null)).toBe('strict');
    expect(N.recencyBand(undefined)).toBe('strict');
  });
  it('≤109 d is strict (boundary inclusive)', () => {
    expect(N.recencyBand(0)).toBe('strict');
    expect(N.recencyBand(90)).toBe('strict');
    expect(N.recencyBand(109)).toBe('strict');
  });
  it('110..183 d is the fill band (boundaries inclusive)', () => {
    expect(N.recencyBand(110)).toBe('fill');
    expect(N.recencyBand(150)).toBe('fill');
    expect(N.recencyBand(183)).toBe('fill');
  });
  it('>183 d is proven too old (null band)', () => {
    expect(N.recencyBand(184)).toBeNull();
    expect(N.recencyBand(800)).toBeNull();
  });
});

describe('newness-criteria — passesRating', () => {
  it('unrated (null) always passes', () => {
    expect(N.passesRating(null)).toBe(true);
    expect(N.passesRating(undefined)).toBe(true);
  });
  it('rated must be strictly greater than 3.0', () => {
    expect(N.passesRating(3.0)).toBe(false);
    expect(N.passesRating(2.9)).toBe(false);
    expect(N.passesRating(3.1)).toBe(true);
    expect(N.passesRating(4.6)).toBe(true);
  });
});

describe('newness-criteria — passesNewness (count never a factor)', () => {
  it('keeps a strict-new rated venue', () => {
    expect(N.passesNewness({ oldestReviewDays: 30, rating: 4.5 })).toBe(true);
  });
  it('keeps a fill-band venue', () => {
    expect(N.passesNewness({ oldestReviewDays: 150, rating: 4.0 })).toBe(true);
  });
  it('keeps an unrated, no-review venue', () => {
    expect(N.passesNewness({ oldestReviewDays: null, rating: null })).toBe(true);
  });
  it('drops a proven-old venue', () => {
    expect(N.passesNewness({ oldestReviewDays: 800, rating: 4.9 })).toBe(false);
  });
  it('drops a rated venue below the floor even when brand new', () => {
    expect(N.passesNewness({ oldestReviewDays: 5, rating: 2.9 })).toBe(false);
  });
  it('a high reviewCount REFUTES newness (BOMUL Samgyetang 3,759-review SG leak); count can only refute', () => {
    // established by count, even though the ≤5-review date heuristic reads recent or null
    expect(N.passesNewness({ oldestReviewDays: 30, rating: 4.5, reviewCount: 99999 })).toBe(false);
    expect(N.passesNewness({ oldestReviewDays: null, rating: 4.9, reviewCount: 3759 })).toBe(false);
    // a genuinely-new place under the ceiling still passes
    expect(N.passesNewness({ oldestReviewDays: 30, rating: 4.5, reviewCount: 50 })).toBe(true);
    // unknown count proves nothing → passes
    expect(N.passesNewness({ oldestReviewDays: 30, rating: 4.5 })).toBe(true);
    // count is refute-ONLY: a low count can't rescue a date-old venue
    expect(N.passesNewness({ oldestReviewDays: 800, rating: 4.5, reviewCount: 1 })).toBe(false);
  });
  it('defaults: empty input is strict-eligible + unrated → passes', () => {
    expect(N.passesNewness()).toBe(true);
    expect(N.passesNewness({})).toBe(true);
  });
});

describe('newness-criteria — isStrictNew (gate for an "opened …" claim)', () => {
  it('true only for ≤109 d AND rating>3.0 (or unrated)', () => {
    expect(N.isStrictNew({ oldestReviewDays: 30, rating: 4.5 })).toBe(true);
    expect(N.isStrictNew({ oldestReviewDays: null, rating: null })).toBe(true);
  });
  it('false for the fill band (110..183 d) — kept, but not strictly new', () => {
    expect(N.isStrictNew({ oldestReviewDays: 150, rating: 4.5 })).toBe(false);
  });
  it('false for proven-old or sub-floor rating', () => {
    expect(N.isStrictNew({ oldestReviewDays: 800, rating: 4.5 })).toBe(false);
    expect(N.isStrictNew({ oldestReviewDays: 5, rating: 2.5 })).toBe(false);
  });
});
