// v0.62.997 — invariants I3 to I6 of doc/Feature/2026-11-28-cuisine-saved-place-near-first.spec.md.
//
// The operator's search at 18:29:26 SGT on 28-11 '26 was centred on Pasir Panjang MRT with radius=20000 (the
// Singapore default) and showed the first 6 of 60 candidates in Google's order, 4 of them 6 to 9 km away. A
// search from a set place now starts at 2 km, keeps only places inside the radius it reports, and widens to 5,
// 10 and 20 km only while fewer than 6 places come back, never past the area it used before.
//
// The helper is CALLED here with a fake discover, so the widening is measured, not read; the last block checks
// that the search route wires it in, which only a source read can see.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const nf = require('../cuisine-near-first.js');

const CENTRE = { lat: 1.2761, lng: 103.7919 };          // Pasir Panjang MRT Station
// A point `km` kilometres due north of the centre (1 degree of latitude is about 111.2 km).
const north = (km, id) => ({ placeId: id, name: id, lat: CENTRE.lat + km / 111.2, lng: CENTRE.lng, rating: 4.5 });

// A fake discover: answers each radius with the places it is given, and records every call.
function fakeDiscover(byRadius) {
  const calls = [];
  const fn = async (opts) => { calls.push(opts); return (byRadius[opts.radius] || []).map((v) => ({ ...v })); };
  fn.calls = calls;
  return fn;
}

describe('constants and the start radius', () => {
  it('starts at 2 km and widens in the steps 5, 10, 20 km while fewer than 6 come back', () => {
    expect(nf.NEAR_START_M).toBe(2000);
    expect([...nf.NEAR_STEPS_M]).toEqual([5000, 10000, 20000]);
    expect(nf.NEAR_MIN).toBe(6);
    expect(nf.NEAR_MAX_FETCHES).toBe(3);
  });
  it('the start never exceeds the area the search used before', () => {
    expect(nf.nearStartRadius(20000)).toBe(2000);
    expect(nf.nearStartRadius(1500)).toBe(1500);
    expect(nf.nearStartRadius(undefined)).toBe(2000);
  });
});

describe('which searches start near', () => {
  it('an ordinary search from the set place does', () => {
    expect(nf.nearFirstApplies({})).toBe(true);
    expect(nf.nearFirstApplies({ clientRadius: undefined, placeAnchor: false, specialMode: null, widen: false, michelin: false })).toBe(true);
  });
  it('a radius sent by the client, a free-text place, a special mode, a widen tap and the Michelin list keep their own', () => {
    expect(nf.nearFirstApplies({ clientRadius: 5000 })).toBe(false);
    expect(nf.nearFirstApplies({ placeAnchor: true })).toBe(false);
    expect(nf.nearFirstApplies({ specialMode: 'durian' })).toBe(false);
    expect(nf.nearFirstApplies({ widen: true })).toBe(false);
    expect(nf.nearFirstApplies({ michelin: true })).toBe(false);
  });
  it('an out-of-range client radius is ignored by the server, so it does not opt out either', () => {
    expect(nf.nearFirstApplies({ clientRadius: 50 })).toBe(true);
  });
});

describe('withinRadius keeps only places inside the radius', () => {
  it('drops a place 2.5 km away from a 2 km circle and keeps one 1.5 km away, measuring distance when missing', () => {
    const kept = nf.withinRadius([north(1.5, 'near'), north(2.5, 'far')], CENTRE, 2000);
    expect(kept.map((v) => v.placeId)).toEqual(['near']);
    expect(kept[0].distanceM).toBeGreaterThan(1400);
    expect(kept[0].distanceM).toBeLessThan(1600);
  });
  it('trusts a distance the pipeline already measured', () => {
    const v = { placeId: 'x', lat: CENTRE.lat, lng: CENTRE.lng, distanceM: 9000 };
    expect(nf.withinRadius([v], CENTRE, 2000)).toEqual([]);
  });
  it('drops a place with no coordinates, which cannot be shown to be inside', () => {
    expect(nf.withinRadius([{ placeId: 'nowhere' }], CENTRE, 2000)).toEqual([]);
  });
});

describe('widenNear', () => {
  const base = { center: CENTRE, startM: 2000, ceilingM: 20000, seeds: [], regionCode: 'SG', lang: 'en' };

  it('six or more already found: no extra search and no widening', async () => {
    const discoverFn = fakeDiscover({});
    const r = await nf.widenNear({ ...base, have: 6, discoverFn });
    expect(discoverFn.calls.length).toBe(0);
    expect(r).toMatchObject({ venues: [], finalRadiusM: 2000, widened: false, fetches: 0 });
  });

  it('two found: searches at 5 km, stops once it has 6, and reports 5 km', async () => {
    const discoverFn = fakeDiscover({ 5000: [1, 2, 3, 4].map((i) => north(3 + i * 0.3, `p${i}`)) });
    const r = await nf.widenNear({ ...base, have: 2, discoverFn });
    expect(discoverFn.calls.map((c) => c.radius)).toEqual([5000]);
    expect(r.venues.length).toBe(4);
    expect(r).toMatchObject({ finalRadiusM: 5000, widened: true, fetches: 1 });
  });

  it('a place Google returns outside the step\'s circle is not kept at that step', async () => {
    const discoverFn = fakeDiscover({ 5000: [north(4, 'in'), north(7, 'out')], 10000: [], 20000: [] });
    const r = await nf.widenNear({ ...base, have: 0, discoverFn });
    expect(r.venues.map((v) => v.placeId)).toEqual(['in']);
  });

  it('every place it returns lies within the radius it reports', async () => {
    const discoverFn = fakeDiscover({
      5000: [north(4.9, 'a'), north(9, 'b')],
      10000: [north(9, 'b'), north(15, 'c')],
      20000: [north(15, 'c'), north(19.5, 'd'), north(25, 'e')],
    });
    const r = await nf.widenNear({ ...base, have: 0, discoverFn });
    expect(r.finalRadiusM).toBe(20000);
    for (const v of r.venues) expect(v.distanceM).toBeLessThanOrEqual(r.finalRadiusM);
    expect(r.venues.map((v) => v.placeId).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never more than three extra searches, even on an empty area', async () => {
    const discoverFn = fakeDiscover({});
    const r = await nf.widenNear({ ...base, ceilingM: 40000, have: 0, discoverFn });
    expect(discoverFn.calls.length).toBe(3);
    expect(r).toMatchObject({ finalRadiusM: 20000, fetches: 3 });
  });

  it('never past the ceiling: a 15 km city cap widens to 5, 10, then 15 km', async () => {
    const discoverFn = fakeDiscover({});
    const r = await nf.widenNear({ ...base, ceilingM: 15000, have: 0, discoverFn });
    expect(discoverFn.calls.map((c) => c.radius)).toEqual([5000, 10000, 15000]);
    expect(r.finalRadiusM).toBe(15000);
  });

  it('a ceiling at or below the start: no widening at all', async () => {
    const discoverFn = fakeDiscover({});
    const r = await nf.widenNear({ ...base, startM: 1500, ceilingM: 1500, have: 0, discoverFn });
    expect(discoverFn.calls.length).toBe(0);
    expect(r.widened).toBe(false);
  });

  it('skips places already held, and runs each step\'s new places through the caller\'s filter', async () => {
    const discoverFn = fakeDiscover({ 5000: [north(3, 'held'), north(3.5, 'low'), north(4, 'ok')] });
    const r = await nf.widenNear({
      ...base, have: 5, discoverFn,
      existingPlaceIds: ['held'],
      prepare: (list) => list.filter((v) => v.placeId !== 'low'),
    });
    expect(r.venues.map((v) => v.placeId)).toEqual(['ok']);
  });

  it('passes the seeds, region and language to every search', async () => {
    const discoverFn = fakeDiscover({});
    await nf.widenNear({ ...base, seeds: ['thai'], regionCode: 'SG', lang: 'ko', have: 0, discoverFn });
    for (const c of discoverFn.calls) {
      expect(c).toMatchObject({ lat: CENTRE.lat, lng: CENTRE.lng, cuisines: ['thai'], regionCode: 'SG', lang: 'ko' });
    }
  });
});

describe('the search route uses it', () => {
  // Comments masked, so a sentence about the code cannot satisfy an assertion about the code.
  const src = readFileSync(new URL('../index.js', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

  it('decides near-first from the client radius, the free-text place, the special mode, the widen tap and Michelin', () => {
    expect(src).toMatch(/nearFirst\.nearFirstApplies\(\{[^}]*clientRadius[^}]*placeAnchor: !!detectedPlaceAnchor[^}]*specialMode[^}]*widen: wantWiden[^}]*michelin/s);
  });
  it('starts the discovery at the near radius and keeps the old radius as the ceiling', () => {
    expect(src).toMatch(/const nearCeilingM = searchRadius;/);
    expect(src).toMatch(/if \(nearActive\) \{[^}]*searchRadius = nearFirst\.nearStartRadius\(nearCeilingM\)/s);
  });
  it('keeps only places within the start radius, then widens while the unseen pool is under the minimum', () => {
    expect(src).toMatch(/if \(nearActive\) \{[^}]*venues = nearFirst\.withinRadius\(venues, searchCenter, searchRadius\)/s);
    expect(src).toMatch(/if \(nearActive && trulyUnseen\.length < nearFirst\.NEAR_MIN/);
    expect(src).toMatch(/nearFirst\.widenNear\(\{/);
  });
  it('the old outer-ring re-fetch does not run on a near-first search, so nothing is added past the reported radius', () => {
    expect(src).toMatch(/if \(!nearActive && !skipCacheForShuffle && !specialMode && isFirstBatch && trulyUnseen\.length < FIRST_TAP_SLICE\)/);
  });
  it('tells the client the radius and whether it widened', () => {
    expect(src).toMatch(/payload\.nearRadiusM = nearRadiusM/);
    expect(src).toMatch(/if \(nearWidenedToM\) payload\.nearWidenedToM = nearWidenedToM/);
  });
});
