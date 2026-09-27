// __tests__/michelin-available-cuisines.test.js — v0.61.445
//
// `availableCuisines(cc, city)` powers the TMA's Michelin grey-out: cuisine
// chips with no star/bib venue for the picked country+city are disabled.
// These tests pin the data contract (the TMA fails OPEN when a country is
// absent, e.g. SG, whose curated data carries no routing-slug cuisines).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const md = require('../michelin-data');

describe('availableCuisines', () => {
  it('returns a non-empty, sorted, lowercased slug set for a covered country', () => {
    const my = md.availableCuisines('MY');
    expect(Array.isArray(my)).toBe(true);
    expect(my.length).toBeGreaterThan(0);
    expect(my).toEqual([...my].sort());                 // sorted
    expect(my.every((s) => s === s.toLowerCase())).toBe(true);
  });

  it('excludes a cuisine that has no MY Michelin venue (the "Japanese in KL" case)', () => {
    expect(md.availableCuisines('MY', 'Kuala Lumpur')).not.toContain('japanese');
    expect(md.availableCuisines('MY', 'Kuala Lumpur')).toContain('malaysian');
  });

  it('is city-specific: KL set differs from the country-wide set', () => {
    const kl = md.availableCuisines('MY', 'Kuala Lumpur');
    const all = md.availableCuisines('MY');
    // every KL cuisine is in the country set; the country set is a superset
    expect(kl.every((s) => all.includes(s))).toBe(true);
    expect(all.length).toBeGreaterThanOrEqual(kl.length);
  });

  it('returns [] for an unknown / uncovered country (TMA fails open)', () => {
    expect(md.availableCuisines('SG')).toEqual([]);     // SG Michelin lives in SG-michelin.js, no slugs here
    expect(md.availableCuisines('ZZ')).toEqual([]);
    expect(md.availableCuisines('')).toEqual([]);
    expect(md.availableCuisines(null)).toEqual([]);
  });

  it('never includes the special-mode slugs (durian/fruit/durian-pastry) for any country', () => {
    for (const cc of ['MY', 'TH', 'JP', 'KR']) {
      const set = md.availableCuisines(cc);
      for (const s of ['durian', 'fruits', 'durian-pastry']) expect(set).not.toContain(s);
    }
  });
});
