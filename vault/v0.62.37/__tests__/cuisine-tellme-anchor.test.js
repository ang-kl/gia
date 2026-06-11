// __tests__/cuisine-tellme-anchor.test.js — v0.61.131
//
// Unit tests for the Cuisine TMA Tell-me box place-anchor helper.
// Covers the split regex, the guard ladder (text length, JB skip),
// the anchor-cap clamp, and the shape of the returned object.
// Integration against the real place-detector (which calls
// mrt-coords.json + hawker-vault + Google Places) is out of scope —
// detectPlaceName is stubbed.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  detectAnchorFromFreeText,
  PLACE_SPLIT_RE
} = require('../cuisine-tellme-anchor');

const NEARBY_RADIUS_M = 1500;

// Deterministic detectPlaceName stub. Returns a fixed Tiong Bahru MRT
// anchor only when the input matches a whitelist; null otherwise.
function makeStub({ matchSet = new Set(['Tiong Bahru', 'tiong bahru']), payload } = {}) {
  let calls = [];
  const defaultPayload = {
    kind: 'mrt',
    name: 'Tiong Bahru MRT',
    lat: 1.2856,
    lng: 103.8267,
    radius: 400,
    source: 'mrt-coords'
  };
  return {
    detectPlaceName: async (text) => {
      calls.push(text);
      return matchSet.has(text) ? (payload || defaultPayload) : null;
    },
    calls: () => calls
  };
}

describe('PLACE_SPLIT_RE', () => {
  it('splits on " in " between query and place', () => {
    const m = 'ramen in Tiong Bahru'.match(PLACE_SPLIT_RE);
    expect(m).toBeTruthy();
    expect(m[1]).toBe('ramen');
    expect(m[2]).toBe('Tiong Bahru');
  });

  it('splits on near/around/at, case-insensitive', () => {
    expect('dim sum near chinatown'.match(PLACE_SPLIT_RE)?.[2]).toBe('chinatown');
    expect('coffee around Outram'.match(PLACE_SPLIT_RE)?.[2]).toBe('Outram');
    expect('Beef noodles AT Bedok'.match(PLACE_SPLIT_RE)?.[2]).toBe('Bedok');
  });

  it('splits at the FIRST connector when the place itself contains one', () => {
    // Lazy first capture: "ramen in tiong bahru near outram" → query
    // "ramen", place "tiong bahru near outram". The downstream
    // detectPlaceName then either matches the whole thing or returns
    // null; we never want to be cute and re-split the place portion.
    const m = 'ramen in tiong bahru near outram'.match(PLACE_SPLIT_RE);
    expect(m[1]).toBe('ramen');
    expect(m[2]).toBe('tiong bahru near outram');
  });

  it('does not split when there is no connector', () => {
    expect('Tiong Bahru'.match(PLACE_SPLIT_RE)).toBeNull();
    expect('laksa'.match(PLACE_SPLIT_RE)).toBeNull();
  });

  it('requires whitespace on both sides of the connector', () => {
    // "Indian" should NOT split on the embedded "in"
    expect('Indian'.match(PLACE_SPLIT_RE)).toBeNull();
    // "Italian Restaurant" should not split on the "in"
    expect('Italian Restaurant'.match(PLACE_SPLIT_RE)).toBeNull();
  });
});

describe('detectAnchorFromFreeText — guards', () => {
  const stub = makeStub();
  const base = { detectPlaceName: stub.detectPlaceName, nearbyRadiusM: NEARBY_RADIUS_M };

  it('returns null for empty / whitespace-only text', async () => {
    expect(await detectAnchorFromFreeText({ text: '', isJB: false, ...base })).toBeNull();
    expect(await detectAnchorFromFreeText({ text: '   ', isJB: false, ...base })).toBeNull();
  });

  it('returns null for non-string text', async () => {
    expect(await detectAnchorFromFreeText({ text: null, isJB: false, ...base })).toBeNull();
    expect(await detectAnchorFromFreeText({ text: undefined, isJB: false, ...base })).toBeNull();
    expect(await detectAnchorFromFreeText({ text: 42, isJB: false, ...base })).toBeNull();
  });

  it('returns null for text shorter than 3 chars', async () => {
    expect(await detectAnchorFromFreeText({ text: 'ab', isJB: false, ...base })).toBeNull();
  });

  it('returns null when isJB (place-detector data is SG-only)', async () => {
    expect(await detectAnchorFromFreeText({ text: 'Tiong Bahru', isJB: true, ...base })).toBeNull();
  });

  it('returns null when detectPlaceName returns null', async () => {
    expect(await detectAnchorFromFreeText({ text: 'an unrecognised place', isJB: false, ...base })).toBeNull();
  });

  it('returns null when anchor lat/lng are not finite', async () => {
    const bad = makeStub({ payload: { kind: 'mrt', name: 'X', lat: NaN, lng: 103.8 } });
    const r = await detectAnchorFromFreeText({
      text: 'Tiong Bahru', isJB: false,
      detectPlaceName: bad.detectPlaceName,
      nearbyRadiusM: NEARBY_RADIUS_M
    });
    expect(r).toBeNull();
  });
});

describe('detectAnchorFromFreeText — successful detection', () => {
  it('detects a standalone place name', async () => {
    const stub = makeStub();
    const r = await detectAnchorFromFreeText({
      text: 'Tiong Bahru', isJB: false,
      detectPlaceName: stub.detectPlaceName,
      nearbyRadiusM: NEARBY_RADIUS_M
    });
    expect(r).toBeTruthy();
    expect(r.anchor.name).toBe('Tiong Bahru MRT');
    expect(r.anchor.kind).toBe('mrt');
    expect(r.anchor.source).toBe('mrt-coords');
    expect(r.queryRemainder).toBe('');
    expect(r.searchCenter).toEqual({ lat: 1.2856, lng: 103.8267 });
    expect(r.searchRadius).toBe(NEARBY_RADIUS_M);
    expect(stub.calls()).toEqual(['Tiong Bahru']);
  });

  it('strips the place span from the freeText and returns the query remainder', async () => {
    const stub = makeStub();
    const r = await detectAnchorFromFreeText({
      text: 'ramen in Tiong Bahru', isJB: false,
      detectPlaceName: stub.detectPlaceName,
      nearbyRadiusM: NEARBY_RADIUS_M
    });
    expect(r).toBeTruthy();
    expect(r.queryRemainder).toBe('ramen');
    expect(r.anchor.name).toBe('Tiong Bahru MRT');
    expect(stub.calls()).toEqual(['Tiong Bahru']);  // called with the place candidate, not the full text
  });

  it('clamps searchRadius to anchorCap when the cap is tighter', async () => {
    const stub = makeStub();
    const r = await detectAnchorFromFreeText({
      text: 'Tiong Bahru', isJB: false,
      detectPlaceName: stub.detectPlaceName,
      nearbyRadiusM: NEARBY_RADIUS_M,
      anchorCap: 800
    });
    expect(r.searchRadius).toBe(800);
  });

  it('uses NEARBY_RADIUS_M when anchorCap is wider', async () => {
    const stub = makeStub();
    const r = await detectAnchorFromFreeText({
      text: 'Tiong Bahru', isJB: false,
      detectPlaceName: stub.detectPlaceName,
      nearbyRadiusM: NEARBY_RADIUS_M,
      anchorCap: 50000
    });
    expect(r.searchRadius).toBe(NEARBY_RADIUS_M);
  });

  it('treats anchorCap=null / undefined / 0 as "no cap"', async () => {
    const stub = makeStub();
    for (const cap of [null, undefined, 0]) {
      const r = await detectAnchorFromFreeText({
        text: 'Tiong Bahru', isJB: false,
        detectPlaceName: stub.detectPlaceName,
        nearbyRadiusM: NEARBY_RADIUS_M,
        anchorCap: cap
      });
      expect(r.searchRadius).toBe(NEARBY_RADIUS_M);
    }
  });

  it('returns a sanitised anchor shape (only the documented keys)', async () => {
    const stubWithExtras = makeStub({
      payload: {
        kind: 'mrt', name: 'X', lat: 1.0, lng: 103.0,
        source: 'mrt-coords',
        radius: 400, codes: ['EW1'], _score: 0.9, polygon: '...'
      }
    });
    const r = await detectAnchorFromFreeText({
      text: 'Tiong Bahru', isJB: false,
      detectPlaceName: stubWithExtras.detectPlaceName,
      nearbyRadiusM: NEARBY_RADIUS_M
    });
    expect(Object.keys(r.anchor).sort()).toEqual(['kind', 'lat', 'lng', 'name', 'source']);
  });
});
