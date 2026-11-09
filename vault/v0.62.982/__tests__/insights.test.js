// __tests__/insights.test.js — deriveInsights pure-fn invariants.
// v0.62.x — Search Insights PR1 (value map + hidden gems; newCount omitted).
import { describe, it, expect } from 'vitest';
import {
  deriveInsights, GEM_RATING, GEM_REVIEW_CAP, MIN_PRICED,
} from '../web/cuisine/src/v2/lib/insights.js';

const v = (o) => ({ name: 'X', ...o });
const pr = (start, end, currencyCode = 'SGD') => ({ currencyCode, start, end });

describe('deriveInsights — count', () => {
  it('counts venues and tolerates junk', () => {
    expect(deriveInsights([v({}), v({}), null, undefined]).count).toBe(2);
    expect(deriveInsights([]).count).toBe(0);
    expect(deriveInsights(null).count).toBe(0);
  });
});

describe('deriveInsights — medianPrice', () => {
  it('is null below MIN_PRICED priced venues', () => {
    const venues = Array.from({ length: MIN_PRICED - 1 }, () => v({ priceRange: pr(10, 20) }));
    expect(deriveInsights(venues).medianPrice).toBeNull();
  });
  it('odd count → middle midpoint', () => {
    // midpoints: 15, 25, 35, 45, 55 → median 35
    const venues = [pr(10, 20), pr(20, 30), pr(30, 40), pr(40, 50), pr(50, 60)].map((p) => v({ priceRange: p }));
    expect(deriveInsights(venues).medianPrice.value).toBe(35);
  });
  it('even count → mean of two middles, carries currency', () => {
    // midpoints: 15, 25, 35, 45 → median (25+35)/2 = 30
    const venues = [pr(10, 20), pr(20, 30), pr(30, 40), pr(40, 50)].map((p) => v({ priceRange: p }));
    const r = deriveInsights(venues);
    expect(r.medianPrice.value).toBe(30);
    expect(r.medianPrice.currency).toBe('SGD');
  });
  it('ignores venues with no usable price', () => {
    const venues = [
      v({ priceRange: pr(10, 20) }), v({ priceRange: pr(20, 30) }),
      v({ priceRange: pr(30, 40) }), v({ priceRange: pr(40, 50) }),
      v({}), v({ priceRange: { currencyCode: 'SGD' } }),
    ];
    expect(deriveInsights(venues).medianPrice.value).toBe(30);
  });
});

describe('deriveInsights — bestValue', () => {
  it('maximises rating per price among venues with BOTH', () => {
    const venues = [
      v({ name: 'Cheap&Good', rating: 4.5, priceRange: pr(8, 8) }),   // 0.5625
      v({ name: 'Pricey', rating: 4.8, priceRange: pr(80, 80) }),     // 0.06
      v({ name: 'NoPrice', rating: 5.0 }),                            // skipped
      v({ name: 'NoRating', priceRange: pr(5, 5) }),                  // skipped
    ];
    const r = deriveInsights(venues);
    expect(r.bestValue.name).toBe('Cheap&Good');
    expect(r.bestValue.rating).toBe(4.5);
    expect(r.bestValue.price).toBe(8);
  });
  it('is null when no venue has both rating and price', () => {
    expect(deriveInsights([v({ rating: 4.5 }), v({ priceRange: pr(10, 20) })]).bestValue).toBeNull();
  });
});

describe('deriveInsights — gemCount', () => {
  it('counts high-rated, under-reviewed venues', () => {
    const venues = [
      v({ rating: GEM_RATING, userRatingCount: GEM_REVIEW_CAP - 1 }),     // gem
      v({ rating: 4.9, userRatingCount: 10 }),                            // gem
      v({ rating: 4.9, userRatingCount: GEM_REVIEW_CAP }),               // too many reviews
      v({ rating: GEM_RATING - 0.1, userRatingCount: 5 }),               // rating too low
      v({ rating: 4.9 }),                                                // no review count
    ];
    expect(deriveInsights(venues).gemCount).toBe(2);
  });
  it('is 0 for an empty set', () => {
    expect(deriveInsights([]).gemCount).toBe(0);
  });
});

describe('deriveInsights — does not surface newCount (v1)', () => {
  it('omits newCount entirely', () => {
    expect('newCount' in deriveInsights([v({})])).toBe(false);
  });
});
