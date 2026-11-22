// __tests__/cuisine-special-mode-widen.test.js — v0.61.131
//
// Unit tests for the Fruits / Durian progressive radius widening helper.
// Covers the cap clamping (anchorCap vs hard cap), target-hit early exit,
// dedup against already-accumulated placeIds, mode-filter pass, and the
// no-op short-circuits (no specialMode, already at target, missing
// injected fns).
//
// All IO is injected — pipeline.discover, venue-filters.passesVenueFilter,
// and special-mode.filterByMode are stubs.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  widenSpecialMode,
  DEFAULT_TARGET,
  DEFAULT_HARD_CAP_M
} = require('../cuisine-special-mode-widen');

// Build N synthetic venues with sequential placeIds. The fake "mode
// keyword" is just "fruit" / "durian" in the name so the test filter
// can pick by substring.
function makeVenues(n, prefix = 'fruit') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ placeId: `${prefix}-${i}`, name: `${prefix} shop ${i}`, primaryType: 'restaurant' });
  }
  return out;
}

// Stub factories. discoverFn returns a fixed list (or per-call lists);
// passesVenueFilter trivially passes; filterByMode matches by substring.
function makeDeps({
  discoverReturns = [makeVenues(5)],
  filterPasses = () => true,
  modeKeyword = 'fruit'
} = {}) {
  let callIdx = 0;
  const discoverCalls = [];
  return {
    discoverFn: async (args) => {
      discoverCalls.push(args);
      const r = discoverReturns[callIdx % discoverReturns.length];
      callIdx++;
      return r;
    },
    discoverCalls: () => discoverCalls,
    passesVenueFilter: filterPasses,
    filterByMode: (vs, mode) => {
      const kw = mode === 'durian' ? 'durian' : modeKeyword;
      return vs.filter((v) => (v.name || '').toLowerCase().includes(kw));
    }
  };
}

const SILENT_LOGGER = { log: () => {}, warn: () => {} };

describe('widenSpecialMode — no-op short-circuits', () => {
  const baseArgs = {
    venues: [],
    seeds: ['fruit shop', 'fruit market'],
    searchCenter: { lat: 1.3, lng: 103.8 },
    searchRegionCode: 'SG',
    lang: 'en',
    startRadius: 5000,
    logger: SILENT_LOGGER
  };

  it('returns unchanged when specialMode is null', async () => {
    const deps = makeDeps();
    const r = await widenSpecialMode({ ...baseArgs, specialMode: null, ...deps });
    expect(r.widened).toBe(false);
    expect(r.venues).toEqual([]);
    expect(deps.discoverCalls().length).toBe(0);
  });

  it('returns unchanged when venues.length >= target', async () => {
    const deps = makeDeps();
    const r = await widenSpecialMode({
      ...baseArgs, specialMode: 'fruits',
      venues: makeVenues(DEFAULT_TARGET),
      ...deps
    });
    expect(r.widened).toBe(false);
    expect(r.venues.length).toBe(DEFAULT_TARGET);
    expect(deps.discoverCalls().length).toBe(0);
  });

  it('returns unchanged when startRadius is not finite or non-positive', async () => {
    const deps = makeDeps();
    for (const bad of [0, -1, NaN, undefined, null, 'abc']) {
      const r = await widenSpecialMode({
        ...baseArgs, specialMode: 'fruits', startRadius: bad, ...deps
      });
      expect(r.widened).toBe(false);
    }
    expect(deps.discoverCalls().length).toBe(0);
  });

  it('returns unchanged when discoverFn is missing', async () => {
    const r = await widenSpecialMode({
      ...baseArgs, specialMode: 'fruits',
      passesVenueFilter: () => true,
      filterByMode: (vs) => vs
    });
    expect(r.widened).toBe(false);
  });
});

describe('widenSpecialMode — radius escalation', () => {
  const baseArgs = {
    specialMode: 'fruits',
    seeds: ['fruit shop'],
    searchCenter: { lat: 1.3, lng: 103.8 },
    searchRegionCode: 'SG',
    lang: 'en',
    startRadius: 5000,
    logger: SILENT_LOGGER
  };

  it('fires the widening pass when count < target', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(10)] });
    const r = await widenSpecialMode({ ...baseArgs, venues: makeVenues(3), ...deps });
    expect(r.widened).toBe(true);
    expect(r.widenedFromM).toBe(5000);
    expect(r.finalRadiusM).toBe(10000);  // 2x — first pass hit target so loop exits
    expect(r.venues.length).toBeGreaterThanOrEqual(DEFAULT_TARGET);
  });

  it('progresses 2x → 3x when 2x is insufficient', async () => {
    const deps = makeDeps({
      // 2x returns 2 fresh venues (3 + 2 = 5, < 8); 3x returns 10 (5 + 10
      // dedup-filter-merge → meets target)
      discoverReturns: [makeVenues(2, 'fruit-2x'), makeVenues(10, 'fruit-3x')]
    });
    const r = await widenSpecialMode({ ...baseArgs, venues: makeVenues(3), ...deps });
    expect(r.widened).toBe(true);
    expect(r.widenedFromM).toBe(5000);
    expect(r.finalRadiusM).toBe(15000);  // 3x
    expect(deps.discoverCalls().length).toBe(2);
    expect(deps.discoverCalls()[0].radius).toBe(10000);
    expect(deps.discoverCalls()[1].radius).toBe(15000);
  });

  it('caps escalation at anchorCap', async () => {
    const deps = makeDeps({ discoverReturns: [[]] });
    const r = await widenSpecialMode({
      ...baseArgs, venues: makeVenues(0),
      startRadius: 10000, anchorCap: 12000, ...deps
    });
    // 2x = 20000 → clipped to 12000; 3x = 30000 → also clipped to 12000 (dedup)
    expect(deps.discoverCalls().length).toBe(1);
    expect(deps.discoverCalls()[0].radius).toBe(12000);
  });

  it('caps escalation at the default 30 km hard cap when no anchorCap', async () => {
    const deps = makeDeps({ discoverReturns: [[]] });
    const r = await widenSpecialMode({
      ...baseArgs, venues: makeVenues(0),
      startRadius: 20000, ...deps
    });
    // 2x = 40000 → clipped to 30000 (DEFAULT_HARD_CAP_M); 3x = 60000 → also 30000
    expect(deps.discoverCalls().length).toBe(1);
    expect(deps.discoverCalls()[0].radius).toBe(DEFAULT_HARD_CAP_M);
  });

  it('skips widening when start >= cap', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(10)] });
    const r = await widenSpecialMode({
      ...baseArgs, venues: makeVenues(0),
      startRadius: 15000, anchorCap: 15000, ...deps
    });
    expect(r.widened).toBe(false);  // every tries entry is <= start, filtered out
    expect(deps.discoverCalls().length).toBe(0);
  });

  it('dedupes overlapping placeIds — venues already in the list are not re-added', async () => {
    const overlap = makeVenues(8);
    const deps = makeDeps({
      // Discovery returns 5 venues (placeIds 0..4) — 3 of which overlap
      // with what's already in venues. Only placeIds 3..4 are fresh.
      discoverReturns: [overlap.slice(0, 5)]
    });
    const r = await widenSpecialMode({
      ...baseArgs, venues: overlap.slice(0, 3), ...deps
    });
    expect(r.widened).toBe(true);
    // 3 existing + 2 fresh (placeIds 3..4) = 5 unique
    expect(r.venues.length).toBe(5);
    expect(new Set(r.venues.map((v) => v.placeId)).size).toBe(5);
  });

  it('returns the same count when discovery is fully overlapping (no fresh placeIds)', async () => {
    const overlap = makeVenues(3);
    const deps = makeDeps({ discoverReturns: [overlap] });
    const r = await widenSpecialMode({
      ...baseArgs, venues: overlap, ...deps
    });
    // venues.length (3) < target (8) so the widening pass fires, but
    // every placeId overlaps → 0 fresh; final count stays 3.
    expect(r.widened).toBe(true);
    expect(r.venues.length).toBe(3);
  });

  it('runs filterByMode on each pass and drops non-mode venues', async () => {
    const deps = makeDeps({
      // Mix: 4 fruit-* + 4 unrelated-*; only the fruit-* pass the mode filter
      discoverReturns: [[
        ...makeVenues(4, 'fruit'),
        ...makeVenues(4, 'unrelated')
      ]]
    });
    const r = await widenSpecialMode({ ...baseArgs, venues: makeVenues(0), ...deps });
    expect(r.venues.every((v) => v.name.includes('fruit'))).toBe(true);
  });

  it('issues one discoverFn call per seed per widening pass', async () => {
    const deps = makeDeps({ discoverReturns: [[]] });   // both passes return empty
    await widenSpecialMode({
      ...baseArgs, venues: makeVenues(0),
      seeds: ['fruit', 'durian', 'mango', 'rambutan'],  // 4 seeds
      ...deps
    });
    // No venues accumulated, no cap hit → both passes (2x then 3x)
    // fire, each with 4 seeds → 8 calls.
    expect(deps.discoverCalls().length).toBe(8);
  });

  it('mutates the returned venues array (caller can read it directly)', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(5, 'fruit-new')] });
    const r = await widenSpecialMode({ ...baseArgs, venues: makeVenues(3), ...deps });
    expect(r.venues).toBeInstanceOf(Array);
    expect(r.venues.length).toBeGreaterThanOrEqual(DEFAULT_TARGET);
    // First 3 entries are the original venues; the rest are the widened set
    expect(r.venues.slice(0, 3).every((v) => v.placeId.startsWith('fruit-'))).toBe(true);
  });

  it('does not throw when a discoverFn call rejects', async () => {
    const failing = {
      discoverFn: async () => { throw new Error('Places quota'); },
      passesVenueFilter: () => true,
      filterByMode: (vs) => vs
    };
    const r = await widenSpecialMode({
      ...baseArgs, venues: makeVenues(0), seeds: ['a', 'b'], ...failing
    });
    // The widening pass still "ran" (radius escalated) but found no fresh venues.
    expect(r.widened).toBe(true);
    expect(r.venues).toEqual([]);
  });

  it('honours a custom target', async () => {
    // Use unique placeId prefix on the discovered batch so dedup
    // doesn't accidentally swallow them.
    const deps = makeDeps({ discoverReturns: [makeVenues(2, 'fruit-2x')] });
    const r = await widenSpecialMode({
      ...baseArgs, venues: makeVenues(1), target: 3, ...deps
    });
    expect(r.widened).toBe(true);
    expect(r.venues.length).toBeGreaterThanOrEqual(3);
  });
});
