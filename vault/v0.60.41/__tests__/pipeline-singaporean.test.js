// __tests__/pipeline-singaporean.test.js — v0.59.19
//
// Verifies the Singaporean cuisine dish-rotation. When the user picks
// the Singaporean chip in the cuisine TMA, discover() expands the
// cuisine list to include 2 random iconic SG dishes alongside the
// original entries — diversifying the Places textQuery across calls
// so consecutive searches surface varied venues.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  SINGAPOREAN_DISHES,
  pickRandomSubset,
  expandSingaporeanCuisines
} = require('../pipeline.js');

describe('SINGAPOREAN_DISHES', () => {
  it('v0.59.27: ~180-item pan-cuisine SG catalogue (replaces the v0.59.21 47-item list)', () => {
    expect(SINGAPOREAN_DISHES.length).toBeGreaterThanOrEqual(180);
    // Spot-check key items across the user-supplied catalogue.
    expect(SINGAPOREAN_DISHES).toContain('Steamed Chicken Rice');
    expect(SINGAPOREAN_DISHES).toContain('Char Kuay Teow');
    expect(SINGAPOREAN_DISHES).toContain('Laksa');
    expect(SINGAPOREAN_DISHES).toContain('Bak Kut Teh');
    expect(SINGAPOREAN_DISHES).toContain('Hainanese Curry Rice');
    expect(SINGAPOREAN_DISHES).toContain('Beef Rendang');
    expect(SINGAPOREAN_DISHES).toContain('Tandoori Chicken');
    expect(SINGAPOREAN_DISHES).toContain('Hakka Abacus Seeds');
    expect(SINGAPOREAN_DISHES).toContain('Roti John');
    expect(SINGAPOREAN_DISHES).toContain('Mala Xiang Guo');
  });

  it('has no duplicate entries', () => {
    expect(new Set(SINGAPOREAN_DISHES).size).toBe(SINGAPOREAN_DISHES.length);
  });

  // v0.59.27: dessert items moved out of the SG dish-rotation pool
  // and into the dedicated Dessert cuisine entry's keyword list.
  // Curry Puff was dropped earlier (v0.59.21) for brand-cluster
  // reasons. None should appear in the SG list.
  it('does NOT contain dessert / removed entries', () => {
    expect(SINGAPOREAN_DISHES).not.toContain('Curry Puff');
    expect(SINGAPOREAN_DISHES).not.toContain('Ice Kacang');
    expect(SINGAPOREAN_DISHES).not.toContain('Chendol');
    expect(SINGAPOREAN_DISHES).not.toContain('Tau Huay'); // moved to Dessert
    expect(SINGAPOREAN_DISHES).not.toContain('Bubur Cha Cha'); // moved to Dessert
  });
});

describe('pickRandomSubset', () => {
  it('returns n unique items drawn from arr', () => {
    const out = pickRandomSubset(['a', 'b', 'c', 'd', 'e'], 3);
    expect(out.length).toBe(3);
    expect(new Set(out).size).toBe(3);
    out.forEach((x) => expect(['a', 'b', 'c', 'd', 'e']).toContain(x));
  });

  it('clamps n to arr.length when n > arr.length', () => {
    const out = pickRandomSubset(['a', 'b'], 5);
    expect(out.length).toBe(2);
  });

  it('handles empty / non-array inputs without throwing', () => {
    expect(pickRandomSubset([], 3)).toEqual([]);
    expect(pickRandomSubset(null, 3)).toEqual([]);
    expect(pickRandomSubset(undefined, 3)).toEqual([]);
  });

  it('returns an empty array when n=0', () => {
    expect(pickRandomSubset(['a', 'b', 'c'], 0)).toEqual([]);
  });
});

describe('expandSingaporeanCuisines', () => {
  it('appends 3 dishes when "Singaporean" is selected (v0.59.21: 2 → 3)', () => {
    const out = expandSingaporeanCuisines(['Singaporean']);
    expect(out.length).toBe(6);
    expect(out[0]).toBe('Singaporean');
    // The 3 appended items must come from the dish list.
    expect(SINGAPOREAN_DISHES).toContain(out[1]);
    expect(SINGAPOREAN_DISHES).toContain(out[2]);
    expect(SINGAPOREAN_DISHES).toContain(out[3]);
    // They must all be distinct.
    expect(new Set([out[1], out[2], out[3]]).size).toBe(3);
  });

  it('matches case-insensitively (lowercase singaporean)', () => {
    const out = expandSingaporeanCuisines(['singaporean']);
    expect(out.length).toBe(6);
  });

  it('matches case-insensitively (UPPERCASE)', () => {
    const out = expandSingaporeanCuisines(['SINGAPOREAN']);
    expect(out.length).toBe(6);
  });

  it('passes through non-SG cuisines unchanged', () => {
    expect(expandSingaporeanCuisines(['Korean', 'Italian'])).toEqual(['Korean', 'Italian']);
    expect(expandSingaporeanCuisines(['Japanese'])).toEqual(['Japanese']);
  });

  it('preserves other cuisines when Singaporean is mixed in', () => {
    const out = expandSingaporeanCuisines(['Singaporean', 'Korean']);
    expect(out.length).toBe(7);
    expect(out).toContain('Singaporean');
    expect(out).toContain('Korean');
    // Last 3 entries are dishes.
    expect(SINGAPOREAN_DISHES).toContain(out[2]);
    expect(SINGAPOREAN_DISHES).toContain(out[3]);
    expect(SINGAPOREAN_DISHES).toContain(out[4]);
  });

  it('handles non-array inputs without throwing (passes through)', () => {
    expect(expandSingaporeanCuisines(null)).toBe(null);
    expect(expandSingaporeanCuisines(undefined)).toBe(undefined);
    expect(expandSingaporeanCuisines('Singaporean')).toBe('Singaporean');
  });

  // Codex review #224 — index.js routes filter-prefixed cuisines like
  // "halal Singaporean", "vegetarian Singaporean", "private dining
  // home-cooked Singaporean" into discover(). Word-token match must
  // catch them while respecting hyphenated boundaries.
  it('expands when Singaporean appears with a halal modifier prefix', () => {
    const out = expandSingaporeanCuisines(['halal Singaporean']);
    expect(out.length).toBe(6);
    expect(out[0]).toBe('halal Singaporean');
  });

  it('expands when Singaporean appears with a home-cooked modifier prefix', () => {
    const out = expandSingaporeanCuisines(['home-cooked Singaporean']);
    expect(out.length).toBe(6);
  });

  it('expands when Singaporean appears with a private-dining stack', () => {
    const out = expandSingaporeanCuisines(['Singaporean private dining']);
    expect(out.length).toBe(6);
  });

  it('does NOT expand "Singaporean-style" (one hyphenated token, not the cuisine pick)', () => {
    expect(expandSingaporeanCuisines(['Singaporean-style fusion'])).toEqual(['Singaporean-style fusion']);
  });

  it('handles empty array (passes through)', () => {
    expect(expandSingaporeanCuisines([])).toEqual([]);
  });

  it('rotates dish picks across calls (statistical: 5 calls → ≥ 2 distinct dish sets)', () => {
    // Random.Math is not seeded; over 5 calls we expect to see at least
    // 2 different (dish1+dish2) combinations from the 49-item pool.
    // With 49C2 = 1176 possible pairs, 5 trials almost-certainly yield
    // ≥2 distinct sets. This guards against accidentally caching the
    // first pick.
    const sets = new Set();
    for (let i = 0; i < 5; i++) {
      const out = expandSingaporeanCuisines(['Singaporean']);
      sets.add([out[1], out[2], out[3]].sort().join('|'));
    }
    expect(sets.size).toBeGreaterThanOrEqual(2);
  });
});
