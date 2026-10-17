// __tests__/cuisine-nearby-widen.test.js — v0.61.161
//
// Tests for the post-fetch ladder filter that selects the smallest
// radius surfacing ≥ 3 venues with rating > 4 (operator's
// progressive widening spec).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  LADDER_M,
  MIN_TOP_RATED,
  TOP_RATING_GT,
  countTopRated,
  widenAndPick
} = require('../cuisine-nearby-widen');

// Helper: build a venues array with synthetic distance + rating.
function v(distanceM, rating) {
  return { name: `r${distanceM}`, distanceM, rating };
}

describe('constants', () => {
  it('LADDER_M is [2,6,8,12,15,20] km in metres', () => {
    expect([...LADDER_M]).toEqual([2000, 6000, 8000, 12000, 15000, 20000]);
  });
  it('MIN_TOP_RATED = 3', () => { expect(MIN_TOP_RATED).toBe(3); });
  it('TOP_RATING_GT = 4.0', () => { expect(TOP_RATING_GT).toBe(4.0); });
});

describe('countTopRated', () => {
  it('counts only venues with rating > 4 (strict)', () => {
    expect(countTopRated([v(100, 4.0), v(200, 4.1), v(300, 4.5), v(400, 3.9)])).toBe(2);
  });
  it('handles missing / non-finite rating', () => {
    // `Number('4.5')` coerces to 4.5 by design — Places returns
    // numeric ratings, but a defensive coerce is cheap. The missing
    // / NaN cases drop out.
    expect(countTopRated([{}, v(100, NaN), v(200, 4.1)])).toBe(1);
  });
  it('returns 0 for non-array / empty', () => {
    expect(countTopRated(null)).toBe(0);
    expect(countTopRated([])).toBe(0);
    expect(countTopRated('not-array')).toBe(0);
  });
  it('respects a custom threshold', () => {
    expect(countTopRated([v(0, 4.2), v(0, 4.4), v(0, 4.6)], 4.5)).toBe(1);
  });
});

describe('widenAndPick — happy paths', () => {
  it('picks the tightest tier when ≥3 top-rated already at 2 km', () => {
    const venues = [
      v(500, 4.5), v(800, 4.3), v(1200, 4.6),         // all within 2 km
      v(3000, 4.7), v(5000, 4.2), v(10000, 4.1)
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(2000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(0);
    expect(out.venues).toHaveLength(3);
  });

  it('widens to 6 km when 2 km has only 2 top-rated', () => {
    const venues = [
      v(500, 4.5), v(1000, 4.3),                       // 2 in 2km
      v(2500, 4.7), v(4000, 4.2), v(5500, 4.1),        // 3 in 6km (cumulative 5)
      v(7000, 4.4)
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(6000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(1);
    expect(out.venues.length).toBe(5);   // venues within 6km
  });

  it('widens through the full ladder; settles at the first satisfying tier', () => {
    const venues = [
      v(500, 4.5),                                     // 1 in 2km
      v(4000, 4.5),                                    // 1 in 6km (cum 2)
      v(7000, 4.5),                                    // 1 in 8km (cum 3) ← satisfies
      v(10000, 3.9)                                    // not top-rated
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(8000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(2);
  });

  it('widens to 20 km when ratings are thin everywhere', () => {
    const venues = [
      v(500, 4.5),
      v(15000, 4.5),
      v(19000, 4.5)
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(20000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(5);
  });
});

describe('widenAndPick — unsatisfied fallback', () => {
  it('returns widest tier with all-in-cap venues when no tier reaches 3 top-rated', () => {
    const venues = [
      v(1000, 3.5), v(2000, 3.8), v(5000, 3.6)         // none > 4.0
    ];
    const out = widenAndPick({ venues });
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(20000);
    expect(out.venues.length).toBe(3);
  });

  it('returns empty when venues are empty', () => {
    const out = widenAndPick({ venues: [] });
    expect(out.venues).toEqual([]);
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(20000);
  });
});

describe('widenAndPick — anchor cap honoured', () => {
  it('Putrajaya 15 km cap: ladder drops 20 km tier; 18 km venue excluded', () => {
    // At 6 km: only 500m + 1000m count (rating 4.5 each), 7 km venue
    // is beyond. 8 km tier picks up the 7 km venue (rating 4.2 > 4)
    // → 3 top-rated total → satisfies at 8 km.
    const venues = [
      v(500, 4.5), v(1000, 4.5),
      v(7000, 4.2),
      v(12000, 4.4),
      v(18000, 4.5)
    ];
    const out = widenAndPick({ venues, cap: 15000 });
    expect(out.radiusM).toBe(8000);
    expect(out.satisfied).toBe(true);
    // The 18 km venue is beyond cap; not in any tier's subset.
    expect(out.venues.find((x) => x.distanceM === 18000)).toBeUndefined();
  });

  it('Putrajaya cap excludes the 18 km venue at the widest tier too', () => {
    const venues = [v(2500, 3.5), v(18000, 4.5)];   // none top-rated within cap
    const out = widenAndPick({ venues, cap: 15000 });
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(15000);
    expect(out.venues.find((x) => x.distanceM === 18000)).toBeUndefined();
  });

  it('tight cap (1 km) drops the entire ladder → returns input', () => {
    const venues = [v(500, 4.5)];
    const out = widenAndPick({ venues, cap: 1000 });
    expect(out.tier).toBe(-1);
    expect(out.radiusM).toBe(0);
    expect(out.venues.length).toBe(1);
  });

  it('cap = null behaves as full ladder', () => {
    const venues = [v(15000, 4.5), v(17000, 4.5), v(19000, 4.5)];
    const out = widenAndPick({ venues, cap: null });
    expect(out.radiusM).toBe(20000);
    expect(out.satisfied).toBe(true);
  });
});

describe('widenAndPick — custom thresholds', () => {
  it('respects a tighter ratingGt (4.5)', () => {
    const venues = [
      v(500, 4.4),   // not >4.5
      v(800, 4.6),
      v(1200, 4.7),
      v(1500, 4.5),  // 4.5 is NOT > 4.5 (strict)
      v(3000, 4.6)
    ];
    // Only 4.6/4.7/4.6 count → need to widen to 6 km
    const out = widenAndPick({ venues, ratingGt: 4.5 });
    expect(out.radiusM).toBe(6000);
  });

  it('respects a custom minTopRated (5)', () => {
    const venues = [
      v(500, 4.5), v(800, 4.5), v(1200, 4.5),          // 3 in 2km
      v(4000, 4.5), v(5000, 4.5)                       // +2 in 6km
    ];
    const out = widenAndPick({ venues, minTopRated: 5 });
    expect(out.radiusM).toBe(6000);   // only 6km has the full 5
  });

  it('respects a custom ladder', () => {
    const venues = [v(2500, 4.5), v(2800, 4.5), v(2900, 4.5)];
    const out = widenAndPick({ venues, ladder: [3000, 10000] });
    expect(out.radiusM).toBe(3000);
    expect(out.satisfied).toBe(true);
  });
});

describe('widenAndPick — defensive', () => {
  it('non-array venues → empty result', () => {
    const out = widenAndPick({ venues: null });
    expect(out.venues).toEqual([]);
    expect(out.satisfied).toBe(false);
  });

  it('venue without distanceM is excluded from every tier', () => {
    const venues = [
      { name: 'no-distance', rating: 4.9 },           // no distanceM
      v(500, 4.5), v(800, 4.5), v(1200, 4.5)
    ];
    const out = widenAndPick({ venues });
    expect(out.satisfied).toBe(true);
    expect(out.radiusM).toBe(2000);
    expect(out.venues.find((x) => x.name === 'no-distance')).toBeUndefined();
  });
});
