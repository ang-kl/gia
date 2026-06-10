// __tests__/michelin-distinction-rank.test.js — v0.62.x
//
// distinctionRank orders Michelin categories 3★ → 2★ → 1★ → Bib (then
// unknown last). It leads the NATIONAL fallback when the set city has no
// curated Michelin (operator: a Fukuoka search shows Japan's 3★ awardees
// first, with the batch still grouped by awardCity downstream).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { distinctionRank } = require('../michelin-data.js');

describe('distinctionRank', () => {
  it('orders the four distinctions 3★ < 2★ < 1★ < Bib', () => {
    expect(distinctionRank('three-star')).toBe(0);
    expect(distinctionRank('two-star')).toBe(1);
    expect(distinctionRank('one-star')).toBe(2);
    expect(distinctionRank('bib-gourmand')).toBe(3);
  });
  it('is case/space tolerant', () => {
    expect(distinctionRank('  Three-Star ')).toBe(0);
  });
  it('sorts unknown / missing last (9)', () => {
    expect(distinctionRank('selected-plate')).toBe(9);
    expect(distinctionRank(null)).toBe(9);
    expect(distinctionRank(undefined)).toBe(9);
    expect(distinctionRank('')).toBe(9);
  });
});

describe('stars-first sort (national fallback shape)', () => {
  it('a stable sort by distinctionRank leads with stars, keeps ties in order', () => {
    const pool = [
      { name: 'BibA', category: 'bib-gourmand', city: 'Osaka' },
      { name: 'OneA', category: 'one-star', city: 'Kyoto' },
      { name: 'ThreeA', category: 'three-star', city: 'Tokyo' },
      { name: 'OneB', category: 'one-star', city: 'Tokyo' },
      { name: 'TwoA', category: 'two-star', city: 'Osaka' },
      { name: 'ThreeB', category: 'three-star', city: 'Kyoto' },
    ];
    const sorted = [...pool].sort((a, b) => distinctionRank(a.category) - distinctionRank(b.category));
    expect(sorted.map((v) => v.name)).toEqual(['ThreeA', 'ThreeB', 'TwoA', 'OneA', 'OneB', 'BibA']);
    // ties preserved (ThreeA before ThreeB; OneA before OneB)
    expect(sorted[0].city).toBe('Tokyo'); // the 3★ leader's city heads the grouped batch
  });
});
