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
  it('contains the 50 iconic SG dishes from the Human Lead spec', () => {
    expect(SINGAPOREAN_DISHES.length).toBe(50);
    expect(SINGAPOREAN_DISHES).toContain('Hainanese Chicken Rice');
    expect(SINGAPOREAN_DISHES).toContain('Laksa');
    expect(SINGAPOREAN_DISHES).toContain('Char Kway Teow');
    expect(SINGAPOREAN_DISHES).toContain('Roti Prata');
    expect(SINGAPOREAN_DISHES).toContain('Bak Kut Teh');
    expect(SINGAPOREAN_DISHES).toContain('Chilli Crab');
    expect(SINGAPOREAN_DISHES).toContain('Putu Mayam');
  });

  it('has no duplicate entries', () => {
    expect(new Set(SINGAPOREAN_DISHES).size).toBe(SINGAPOREAN_DISHES.length);
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
  it('appends 2 dishes when "Singaporean" is selected (case canonical)', () => {
    const out = expandSingaporeanCuisines(['Singaporean']);
    expect(out.length).toBe(3);
    expect(out[0]).toBe('Singaporean');
    // The 2 appended items must come from the dish list.
    expect(SINGAPOREAN_DISHES).toContain(out[1]);
    expect(SINGAPOREAN_DISHES).toContain(out[2]);
    // They must be distinct.
    expect(out[1]).not.toBe(out[2]);
  });

  it('matches case-insensitively (lowercase singaporean)', () => {
    const out = expandSingaporeanCuisines(['singaporean']);
    expect(out.length).toBe(3);
  });

  it('matches case-insensitively (UPPERCASE)', () => {
    const out = expandSingaporeanCuisines(['SINGAPOREAN']);
    expect(out.length).toBe(3);
  });

  it('passes through non-SG cuisines unchanged', () => {
    expect(expandSingaporeanCuisines(['Korean', 'Italian'])).toEqual(['Korean', 'Italian']);
    expect(expandSingaporeanCuisines(['Japanese'])).toEqual(['Japanese']);
  });

  it('preserves other cuisines when Singaporean is mixed in', () => {
    const out = expandSingaporeanCuisines(['Singaporean', 'Korean']);
    expect(out.length).toBe(4);
    expect(out).toContain('Singaporean');
    expect(out).toContain('Korean');
    // Last 2 entries are dishes.
    expect(SINGAPOREAN_DISHES).toContain(out[2]);
    expect(SINGAPOREAN_DISHES).toContain(out[3]);
  });

  it('handles non-array inputs without throwing (passes through)', () => {
    expect(expandSingaporeanCuisines(null)).toBe(null);
    expect(expandSingaporeanCuisines(undefined)).toBe(undefined);
    expect(expandSingaporeanCuisines('Singaporean')).toBe('Singaporean');
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
      sets.add([out[1], out[2]].sort().join('|'));
    }
    expect(sets.size).toBeGreaterThanOrEqual(2);
  });
});
