// __tests__/cuisine-geo-scope.test.js — v0.61.444
//
// The geographic-scoping pass is now CONCENTRIC-DISTANCE based: keep venues
// within `anchorCap` (per-city radius) of the set location, with a light
// SG↔JB cross-border text exclusion and a JB "Johor"-text rescue to 120 km.
// Venues carry `distanceM` (the set-location distance) as the scope input.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  scopeVenuesByRegion, HARD_CAP_M, JB_NEAR_M, SG_DEFAULT_CAP_M, OTHER_DEFAULT_CAP_M
} = require('../cuisine-geo-scope');
const { demoteNeverEmpty } = require('../pool-floor');

function v(distanceM, props = {}) {
  return { name: 'x', area: '', distanceM, ...props };
}

function deps(over = {}) {
  return {
    demoteNeverEmpty,
    locationMode: { isFarFromJB: () => false, haversineMeters: () => 100000, JB_CBD: { lat: 1.46, lng: 103.76 } },
    logger: { log: () => {}, warn: () => {} },
    ...over
  };
}

describe('constants', () => {
  it('JB near-cap 60 km, hard cap 120 km, SG 30 km, OTHER 40 km', () => {
    expect(JB_NEAR_M).toBe(60000);
    expect(HARD_CAP_M).toBe(120000);
    expect(SG_DEFAULT_CAP_M).toBe(30000);
    expect(OTHER_DEFAULT_CAP_M).toBe(40000);
  });
});

describe('SG region — concentric distance, no Johor bleed', () => {
  it('keeps within anchorCap, drops beyond', async () => {
    const venues = [v(10000, { name: 'near' }), v(25000, { name: 'mid' }), v(40000, { name: 'far' })];
    const r = await scopeVenuesByRegion({ venues, anchorCap: 30000, lat: 1.3, lng: 103.8, ...deps() });
    expect(r.venues.map((x) => x.name).sort()).toEqual(['mid', 'near']);
  });

  it('drops a Johor-tagged venue even within cap (cross-border)', async () => {
    const venues = [v(10000, { name: 'sgVenue' }), v(8000, { name: 'jbVenue', area: 'Johor Bahru' })];
    const r = await scopeVenuesByRegion({ venues, anchorCap: 30000, lat: 1.3, lng: 103.8, ...deps() });
    expect(r.venues.map((x) => x.name)).toEqual(['sgVenue']);
  });

  it('cap precedence: anchorCap → searchRadius → SG default', async () => {
    const mk = () => [v(15000, { name: 'a' }), v(25000, { name: 'b' })];
    // searchRadius used when no anchorCap (20km → drops the 25km venue)
    let r = await scopeVenuesByRegion({ venues: mk(), searchRadius: 20000, lat: 1.3, lng: 103.8, ...deps() });
    expect(r.venues.map((x) => x.name)).toEqual(['a']);
    // SG default 30km when neither set (keeps both)
    r = await scopeVenuesByRegion({ venues: mk(), lat: 1.3, lng: 103.8, ...deps() });
    expect(r.venues.map((x) => x.name).sort()).toEqual(['a', 'b']);
  });
});

describe('JB region — distance OR johor-text, never Singapore', () => {
  it('keeps a venue within 60 km (no text needed)', async () => {
    const r = await scopeVenuesByRegion({ venues: [v(50000, { name: 'jb50' })], isJB: true, lat: 1.46, lng: 103.76, ...deps() });
    expect(r.venues.map((x) => x.name)).toEqual(['jb50']);
  });

  it('rescues a Johor-addressed venue at 90 km (text arm ≤120 km)', async () => {
    const venues = [v(90000, { name: 'mersing', area: 'Mersing, Johor' }), v(90000, { name: 'noText' })];
    const r = await scopeVenuesByRegion({ venues, isJB: true, lat: 1.46, lng: 103.76, ...deps() });
    expect(r.venues.map((x) => x.name)).toEqual(['mersing']);   // noText (>60km, no johor) dropped
  });

  it('drops a Singapore-tagged venue even at 5 km (cross-border)', async () => {
    const venues = [v(5000, { name: 'sgSide', area: 'Singapore' }), v(5000, { name: 'jbSide' })];
    const r = await scopeVenuesByRegion({ venues, isJB: true, lat: 1.46, lng: 103.76, ...deps() });
    expect(r.venues.map((x) => x.name)).toEqual(['jbSide']);
  });

  it('JB→OTHER fallback: wiped + isFarFromJB → restore pool, apply OTHER cap, jbFallback=true', async () => {
    // 5 venues at 90 km, no johor text → JB rule wipes to 0.
    const venues = Array.from({ length: 5 }, (_, i) => v(90000, { name: `kl${i}` }));
    const r = await scopeVenuesByRegion({
      venues, isJB: true, lat: 3.13, lng: 101.68, anchorCap: 100000,
      ...deps({ locationMode: { isFarFromJB: () => true, haversineMeters: () => 250000, JB_CBD: {} } })
    });
    expect(r.jbFallbackToOther).toBe(true);
    expect(r.venues.length).toBe(5);   // OTHER cap 100km keeps the 90km venues
  });

  it('does NOT fall back when the JB rule keeps some', async () => {
    const venues = [v(40000, { name: 'jbNear' }), ...Array.from({ length: 5 }, (_, i) => v(90000, { name: `far${i}` }))];
    const r = await scopeVenuesByRegion({
      venues, isJB: true, lat: 1.46, lng: 103.76,
      ...deps({ locationMode: { isFarFromJB: () => true, haversineMeters: () => 0, JB_CBD: {} } })
    });
    expect(r.jbFallbackToOther).toBe(false);
    expect(r.venues.map((x) => x.name)).toEqual(['jbNear']);
  });
});

describe('OTHER region — pure distance cap, no country-keyword gate', () => {
  it('keeps within anchorCap, drops beyond — regardless of address text', async () => {
    const venues = [
      v(20000, { name: 'near', area: 'somewhere unknown' }),
      v(40000, { name: 'edge' }),
      v(60000, { name: 'far' })
    ];
    const r = await scopeVenuesByRegion({ venues, isOther: true, anchorCap: 45000, lat: 3, lng: 101, ...deps() });
    expect(r.venues.map((x) => x.name).sort()).toEqual(['edge', 'near']);   // no keyword needed; 'far' beyond 45km dropped
  });

  it('demoteNeverEmpty keeps the (nearest) pool when the cap would empty it', async () => {
    const venues = [v(50000, { name: 'a' }), v(60000, { name: 'b' }), v(70000, { name: 'c' })];
    const r = await scopeVenuesByRegion({ venues, isOther: true, anchorCap: 40000, lat: 3, lng: 101, ...deps() });
    expect(r.venues.length).toBe(3);   // never empty — keeps the coord-pinned pool
  });

  it('falls back to OTHER default 40 km when no anchorCap/searchRadius', async () => {
    const venues = [v(30000, { name: 'a' }), v(50000, { name: 'b' })];
    const r = await scopeVenuesByRegion({ venues, isOther: true, lat: 3, lng: 101, ...deps() });
    expect(r.venues.map((x) => x.name)).toEqual(['a']);
  });
});

describe('defensive', () => {
  it('non-array venues → empty', async () => {
    const r = await scopeVenuesByRegion({ venues: null, isOther: true, anchorCap: 40000, lat: 3, lng: 101, ...deps() });
    expect(r.venues).toEqual([]);
  });

  it('a venue with null distanceM passes the cap (kept)', async () => {
    const venues = [v(null, { name: 'noDist' }), v(10000, { name: 'near' })];
    const r = await scopeVenuesByRegion({ venues, isOther: true, anchorCap: 40000, lat: 3, lng: 101, ...deps() });
    expect(r.venues.map((x) => x.name).sort()).toEqual(['near', 'noDist']);
  });

  it('a thrown isFarFromJB does not crash the pass (no fallback)', async () => {
    const venues = Array.from({ length: 5 }, (_, i) => v(90000, { name: `far${i}` }));   // JB rule wipes
    const r = await scopeVenuesByRegion({
      venues, isJB: true, lat: 3.13, lng: 101.68,
      ...deps({ locationMode: { isFarFromJB: () => { throw new Error('boom'); }, haversineMeters: () => 0, JB_CBD: {} } })
    });
    expect(r.jbFallbackToOther).toBe(false);          // fallback skipped, no crash
    // JB rule wiped to 0; demoteNeverEmpty floor keeps the nearest pool (never empty)
    expect(r.venues.length).toBe(5);
  });
});
