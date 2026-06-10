// __tests__/cuisine-nearby-refetch.test.js — v0.61.441
//
// Unit tests for the thin-pool OUTER-RING re-fetch (normal cuisine-search
// path). Sibling of the special-mode widen test: all IO is injected, so
// we assert on the discover-call shape, the anchorCap ceiling, the
// dedup, the ≤2-fetch bound, and the early target exit — without Google
// Places.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { refetchOuterRings, DEFAULT_TARGET } = require('../cuisine-nearby-refetch');

const CENTER = { lat: 1.3, lng: 103.8 };

function makeVenues(n, prefix = 'r') {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ placeId: `${prefix}-${i}`, name: `${prefix} ${i}`, primaryType: 'restaurant', lat: 1.31, lng: 103.81 });
  }
  return out;
}

function makeDeps({ discoverReturns = [[]], filterPasses = () => true } = {}) {
  let callIdx = 0;
  const calls = [];
  return {
    discoverFn: async (args) => {
      calls.push(args);
      const r = discoverReturns[callIdx % discoverReturns.length];
      callIdx++;
      return r;
    },
    calls: () => calls,
    passesVenueFilter: filterPasses
  };
}

const SILENT = { log: () => {}, warn: () => {} };

const base = {
  seeds: ['ramen'],
  searchCenter: CENTER,
  searchRegionCode: 'JP',
  lang: 'en',
  logger: SILENT
};

describe('refetchOuterRings — fires on the outer tiers', () => {
  it('fetches the next ladder tiers and returns fresh deduped venues', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(3, 'a'), makeVenues(4, 'b')] });
    const r = await refetchOuterRings({
      ...base, startRadius: 20000, anchorCap: 45000, ...deps
    });
    // 25 km tier → 3 fresh; 45 km tier → +2 to hit target 5.
    expect(r.venues.length).toBe(DEFAULT_TARGET);
    expect(r.fetches).toBe(2);
    expect(deps.calls()[0].radius).toBe(25000);
    expect(deps.calls()[1].radius).toBe(45000);
  });

  it('stops after the first tier when it already meets target (≤1 fetch)', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(6, 'a')] });
    const r = await refetchOuterRings({
      ...base, startRadius: 20000, anchorCap: 60000, ...deps
    });
    expect(r.venues.length).toBe(DEFAULT_TARGET);
    expect(deps.calls().length).toBe(1);
    expect(deps.calls()[0].radius).toBe(25000);
  });
});

describe('refetchOuterRings — bounds', () => {
  it('never exceeds maxFetches (2) extra Places passes', async () => {
    const deps = makeDeps({ discoverReturns: [[], [], []] });   // always empty → never hits target
    await refetchOuterRings({ ...base, startRadius: 5000, anchorCap: 60000, ...deps });
    expect(deps.calls().length).toBeLessThanOrEqual(2);
  });

  it('respects anchorCap — never fetches a tier beyond the per-city ceiling', async () => {
    const deps = makeDeps({ discoverReturns: [[]] });
    await refetchOuterRings({ ...base, startRadius: 5000, anchorCap: 12000, ...deps });
    // Only the 10 km tier is > 5 km and <= 12 km.
    expect(deps.calls().length).toBe(1);
    expect(deps.calls()[0].radius).toBe(10000);
  });

  it('makes ZERO discover calls when no tier sits beyond startRadius within the cap', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(5)] });
    const r = await refetchOuterRings({ ...base, startRadius: 60000, anchorCap: 60000, ...deps });
    expect(deps.calls().length).toBe(0);
    expect(r.venues).toEqual([]);
  });
});

describe('refetchOuterRings — dedup + distance', () => {
  it('drops venues whose placeId is already in the pool', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(4, 'ramen')] });   // ramen-0..3
    const r = await refetchOuterRings({
      ...base, startRadius: 20000, anchorCap: 25000,
      existingPlaceIds: ['ramen-0', 'ramen-1'], ...deps
    });
    const ids = r.venues.map((v) => v.placeId);
    expect(ids).not.toContain('ramen-0');
    expect(ids).not.toContain('ramen-1');
    expect(ids).toEqual(['ramen-2', 'ramen-3']);
  });

  it('attaches distanceM (haversine) when discover did not', async () => {
    const deps = makeDeps({ discoverReturns: [[{ placeId: 'x', name: 'x', lat: 1.31, lng: 103.81 }]] });
    const r = await refetchOuterRings({ ...base, startRadius: 20000, anchorCap: 25000, ...deps });
    expect(Number.isFinite(r.venues[0].distanceM)).toBe(true);
    expect(r.venues[0].distanceM).toBeGreaterThan(0);
  });

  it('runs passesVenueFilter and drops rejects', async () => {
    const deps = makeDeps({
      discoverReturns: [[...makeVenues(2, 'keep'), ...makeVenues(2, 'drop')]],
      filterPasses: (v) => v.name.startsWith('keep')
    });
    const r = await refetchOuterRings({ ...base, startRadius: 20000, anchorCap: 25000, ...deps });
    expect(r.venues.every((v) => v.name.startsWith('keep'))).toBe(true);
  });
});

describe('refetchOuterRings — defensive no-ops', () => {
  it('returns empty when discoverFn is missing', async () => {
    const r = await refetchOuterRings({ ...base, startRadius: 20000, anchorCap: 45000 });
    expect(r.venues).toEqual([]);
    expect(r.fetches).toBe(0);
  });

  it('does not throw when a discover call rejects', async () => {
    const failing = { discoverFn: async () => { throw new Error('Places quota'); }, passesVenueFilter: () => true };
    const r = await refetchOuterRings({ ...base, startRadius: 20000, anchorCap: 45000, ...failing });
    expect(r.venues).toEqual([]);
  });

  it('returns empty for an invalid searchCenter', async () => {
    const deps = makeDeps({ discoverReturns: [makeVenues(5)] });
    const r = await refetchOuterRings({ ...base, searchCenter: { lat: NaN, lng: NaN }, startRadius: 20000, anchorCap: 45000, ...deps });
    expect(r.venues).toEqual([]);
    expect(deps.calls().length).toBe(0);
  });
});
