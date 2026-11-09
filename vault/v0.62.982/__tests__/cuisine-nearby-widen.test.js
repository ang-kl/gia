// __tests__/cuisine-nearby-widen.test.js — v0.61.441
//
// Tests for the in-memory concentric-ring preference pass. v0.61.441
// reworked the ladder to the operator's 5/10/15/25/45/60 km rings, sorts
// each tier's subset nearest-first inside the function, and adds a
// `minServed` (default 2) gate so a lone top-rated venue can't "satisfy"
// a tier on its own.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  LADDER_M,
  MIN_TOP_RATED,
  TOP_RATING_GT,
  MIN_SERVED,
  countTopRated,
  widenAndPick
} = require('../cuisine-nearby-widen');

// Helper: build a venue with synthetic distance + rating.
function v(distanceM, rating) {
  return { name: `r${distanceM}`, distanceM, rating };
}

describe('constants', () => {
  it('LADDER_M is the concentric [5,10,15,25,45,60] km in metres', () => {
    expect([...LADDER_M]).toEqual([5000, 10000, 15000, 25000, 45000, 60000]);
  });
  it('MIN_TOP_RATED = 3', () => { expect(MIN_TOP_RATED).toBe(3); });
  it('TOP_RATING_GT = 4.0', () => { expect(TOP_RATING_GT).toBe(4.0); });
  it('MIN_SERVED = 2', () => { expect(MIN_SERVED).toBe(2); });
});

describe('countTopRated', () => {
  it('counts only venues with rating > 4 (strict)', () => {
    expect(countTopRated([v(100, 4.0), v(200, 4.1), v(300, 4.5), v(400, 3.9)])).toBe(2);
  });
  it('handles missing / non-finite rating', () => {
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
  it('picks the tightest tier when ≥3 top-rated already within 5 km', () => {
    const venues = [
      v(500, 4.5), v(800, 4.3), v(1200, 4.6),         // 3 within 5 km
      v(6000, 4.7), v(10000, 4.2), v(20000, 4.1)      // beyond 5 km
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(5000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(0);
    expect(out.venues).toHaveLength(3);
  });

  it('widens to 10 km when 5 km has only 2 top-rated', () => {
    const venues = [
      v(500, 4.5), v(1000, 4.3),                       // 2 in 5 km
      v(6000, 4.7), v(8000, 4.2), v(9000, 4.1),        // 3 more in 10 km (cum 5)
      v(12000, 4.4)
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(10000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(1);
    expect(out.venues.length).toBe(5);   // venues within 10 km
  });

  it('widens through the ladder; settles at the first satisfying tier (15 km)', () => {
    const venues = [
      v(500, 4.5),                                     // 1 in 5 km
      v(8000, 4.5),                                    // 10 km tier: 2 venues, 2 top (<3)
      v(13000, 4.5),                                   // 15 km tier: 3 venues, 3 top ← satisfies
      v(20000, 3.9)                                    // not top-rated
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(15000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(2);
  });

  it('widens to 60 km when good ratings sit far out', () => {
    const venues = [
      v(500, 4.5),       // 5 km: 1
      v(40000, 4.5),     // 45 km tier: 2 venues, 2 top (<3)
      v(50000, 4.5),     // 60 km tier: 4 venues, 4 top ← satisfies
      v(55000, 4.5)
    ];
    const out = widenAndPick({ venues });
    expect(out.radiusM).toBe(60000);
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(5);
  });
});

describe('widenAndPick — nearest-first ordering', () => {
  it('sorts each tier subset ascending by distanceM regardless of input order', () => {
    // Shuffled input, all within 5 km, ≥3 top-rated → 5 km tier, sorted.
    const venues = [v(4200, 4.5), v(300, 4.6), v(2500, 4.4), v(900, 4.7)];
    const out = widenAndPick({ venues, minTopRated: 3, minServed: 2 });
    expect(out.radiusM).toBe(5000);
    expect(out.venues.map((x) => x.distanceM)).toEqual([300, 900, 2500, 4200]);
  });

  it('unsatisfied fallback is also nearest-first', () => {
    const venues = [v(9000, 3.5), v(1000, 3.6), v(5000, 3.4)];   // none top-rated
    const out = widenAndPick({ venues });
    expect(out.satisfied).toBe(false);
    expect(out.venues.map((x) => x.distanceM)).toEqual([1000, 5000, 9000]);
  });
});

describe('widenAndPick — minServed gate', () => {
  it('a lone top-rated venue does NOT satisfy a tier (minServed=2)', () => {
    // minTopRated:1 isolates the minServed gate. A single 5★ in 5 km has
    // ≥1 top-rated but only 1 venue, so it must widen.
    const venues = [v(500, 4.9), v(8000, 3.0)];
    const out = widenAndPick({ venues, minTopRated: 1 });
    expect(out.radiusM).toBe(10000);   // 10 km has 2 venues → satisfies
    expect(out.satisfied).toBe(true);
    expect(out.tier).toBe(1);
  });

  it('respects minServed override (3)', () => {
    const venues = [v(500, 4.9), v(900, 4.8)];   // 2 top-rated in 5 km
    const out = widenAndPick({ venues, minTopRated: 1, minServed: 3 });
    // Only 2 venues exist anywhere → never reaches minServed=3 → unsatisfied
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(60000);
  });
});

describe('widenAndPick — unsatisfied fallback', () => {
  it('returns widest tier with all-in-cap venues when no tier reaches 3 top-rated', () => {
    const venues = [v(1000, 3.5), v(2000, 3.8), v(5000, 3.6)];   // none > 4.0
    const out = widenAndPick({ venues });
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(60000);
    expect(out.venues.length).toBe(3);
  });

  it('returns empty when venues are empty', () => {
    const out = widenAndPick({ venues: [] });
    expect(out.venues).toEqual([]);
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(60000);
  });
});

describe('widenAndPick — per-city cap honoured', () => {
  it('Dense 30 km cap drops the 45 + 60 km tiers; a 40 km venue is excluded', () => {
    const venues = [
      v(500, 4.5), v(1000, 4.5), v(7000, 4.2),   // satisfy by 10 km
      v(40000, 4.5), v(50000, 4.5)               // beyond a 30 km cap
    ];
    const out = widenAndPick({ venues, cap: 30000 });
    expect(out.radiusM).toBe(10000);
    expect(out.satisfied).toBe(true);
    expect(out.venues.find((x) => x.distanceM === 40000)).toBeUndefined();
    expect(out.venues.find((x) => x.distanceM === 50000)).toBeUndefined();
  });

  it('Major-metro 45 km cap keeps 45 km but drops the 60 km tier', () => {
    const venues = [v(2500, 3.5), v(44000, 4.5), v(55000, 4.5)];
    const out = widenAndPick({ venues, cap: 45000 });
    // No 3-top-rated tier within cap → unsatisfied, widest in-cap tier = 45 km.
    expect(out.satisfied).toBe(false);
    expect(out.radiusM).toBe(45000);
    expect(out.venues.find((x) => x.distanceM === 44000)).toBeDefined();
    expect(out.venues.find((x) => x.distanceM === 55000)).toBeUndefined();
  });

  it('tight cap (1 km) drops the entire ladder → returns input', () => {
    const venues = [v(500, 4.5)];
    const out = widenAndPick({ venues, cap: 1000 });
    expect(out.tier).toBe(-1);
    expect(out.radiusM).toBe(0);
    expect(out.venues.length).toBe(1);
  });

  it('cap = null behaves as the full ladder', () => {
    const venues = [v(15000, 4.5), v(17000, 4.5), v(19000, 4.5)];
    const out = widenAndPick({ venues, cap: null });
    expect(out.radiusM).toBe(25000);   // 25 km is the first tier holding all 3
    expect(out.satisfied).toBe(true);
  });
});

describe('widenAndPick — custom thresholds', () => {
  it('respects a tighter ratingGt (4.5)', () => {
    const venues = [
      v(500, 4.4),                                     // 5 km: not > 4.5
      v(8000, 4.6), v(9000, 4.7), v(9500, 4.6)         // 10 km: three > 4.5
    ];
    const out = widenAndPick({ venues, ratingGt: 4.5 });
    expect(out.radiusM).toBe(10000);
  });

  it('respects a custom minTopRated (5)', () => {
    const venues = [
      v(500, 4.5), v(800, 4.5), v(1200, 4.5),          // 3 in 5 km
      v(8000, 4.5), v(9000, 4.5)                        // +2 in 10 km
    ];
    const out = widenAndPick({ venues, minTopRated: 5 });
    expect(out.radiusM).toBe(10000);   // only 10 km has the full 5
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
    expect(out.radiusM).toBe(5000);
    expect(out.venues.find((x) => x.name === 'no-distance')).toBeUndefined();
  });
});
