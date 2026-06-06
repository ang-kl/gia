// __tests__/michelin-data.test.js — v0.61.330
//
// Validates the unified Michelin loader: SG migration count + tags,
// empty per-city tables, hasMichelinData gate, city/country filters,
// and schema validation (rejects bad category / missing field).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const data = require('../michelin-data.js');
const sg = require('../michelin-2025.js');

describe('michelin-data — merged pool', () => {
  it('contains exactly the 130 curated SG entries (per-city tables empty)', () => {
    expect(data.getAll().length).toBe(130);
    expect(sg.ALL.length).toBe(130);
  });

  it('every merged entry has the full unified shape', () => {
    for (const e of data.getAll()) {
      expect(typeof e.city).toBe('string');
      expect(e.city.length).toBeGreaterThan(0);
      expect(/^[A-Z]{2}$/.test(e.country)).toBe(true);
      expect(typeof e.name).toBe('string');
      expect(typeof e.address).toBe('string');
      expect(data.CATEGORIES.has(e.category)).toBe(true);
      expect([2025, 2026]).toContain(e.year);
      expect(typeof e.vegetarian).toBe('boolean');
      expect(typeof e.halal).toBe('boolean');
    }
  });

  it('boolean flags default to false when the source omits them', () => {
    const lesAmis = data.michelinForCity('Singapore').find((e) => e.name === 'Les Amis');
    expect(lesAmis.vegetarian).toBe(false);
    expect(lesAmis.halal).toBe(false);
    const thevar = data.getAll().find((e) => e.name === 'Thevar');
    expect(thevar.vegetarian).toBe(true);   // source-set true preserved
  });
});

describe('michelin-data — hasMichelinData gate', () => {
  it('is true for Singapore / SG (curated)', () => {
    expect(data.hasMichelinData('Singapore')).toBe(true);
    expect(data.hasMichelinData('singapore')).toBe(true);
    expect(data.hasMichelinData('SG')).toBe(true);
    expect(data.hasMichelinData('sg')).toBe(true);
  });

  it('is false for the empty guide cities/countries', () => {
    expect(data.hasMichelinData('Tokyo')).toBe(false);
    expect(data.hasMichelinData('JP')).toBe(false);
    expect(data.hasMichelinData('Kuala Lumpur')).toBe(false);
    expect(data.hasMichelinData('MY')).toBe(false);
    expect(data.hasMichelinData('Hong Kong')).toBe(false);
  });

  it('is false for empty / nullish input', () => {
    expect(data.hasMichelinData('')).toBe(false);
    expect(data.hasMichelinData(null)).toBe(false);
    expect(data.hasMichelinData(undefined)).toBe(false);
  });
});

describe('michelin-data — city/country filters', () => {
  it('michelinForCity("Singapore") returns all 130 SG entries', () => {
    expect(data.michelinForCity('Singapore').length).toBe(130);
  });

  it('michelinForCountry("SG") returns all 130 SG entries', () => {
    expect(data.michelinForCountry('SG').length).toBe(130);
    expect(data.michelinForCountry('sg').length).toBe(130);
  });

  it('empty result for an unpopulated city/country', () => {
    expect(data.michelinForCity('Tokyo')).toEqual([]);
    expect(data.michelinForCountry('JP')).toEqual([]);
  });
});

describe('michelin-data — schema validation rejects bad rows', () => {
  it('rejects an invalid category', () => {
    expect(() => data.validateEntry({
      city: 'Tokyo', country: 'JP', name: 'Bad Venue', address: '1 Foo St',
      category: 'four-star', year: 2025,
    }, 'test')).toThrow(/invalid category/);
  });

  it('rejects a missing required field', () => {
    expect(() => data.validateEntry({
      city: 'Tokyo', country: 'JP', name: 'No Category', address: '1 Foo St',
      year: 2025,
    }, 'test')).toThrow(/missing required field "category"/);
  });

  it('rejects a non-ISO-2 country', () => {
    expect(() => data.validateEntry({
      city: 'Tokyo', country: 'Japan', name: 'Bad CC', address: '1 Foo St',
      category: 'one-star', year: 2025,
    }, 'test')).toThrow(/ISO-2/);
  });

  it('rejects a bad year', () => {
    expect(() => data.validateEntry({
      city: 'Tokyo', country: 'JP', name: 'Bad Year', address: '1 Foo St',
      category: 'one-star', year: 2099,
    }, 'test')).toThrow(/year/);
  });

  it('accepts a well-formed unified row', () => {
    expect(data.validateEntry({
      city: 'Tokyo', country: 'JP', name: 'Good Venue', address: '1 Foo St',
      postal: '1000001', category: 'one-star', year: 2026,
      cuisine: 'japanese', vegetarian: false, halal: false,
    }, 'test')).toBe(true);
  });
});

describe('michelin-data — per-country tables are EMPTY', () => {
  it('every guide country table ships zero rows (curator fills by hand)', () => {
    for (const cc of ['my', 'th', 'vn', 'jp', 'kr', 'cn', 'hk', 'tw']) {
      const tbl = require(`../michelin/${cc}.js`);
      expect(Array.isArray(tbl.ENTRIES)).toBe(true);
      expect(tbl.ENTRIES.length).toBe(0);
      expect(/^[A-Z]{2}$/.test(tbl.COUNTRY)).toBe(true);
    }
  });
});
