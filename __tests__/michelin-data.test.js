// __tests__/michelin-data.test.js — v0.61.331
//
// Validates the unified Michelin loader: SG migration count + tags,
// empty per-city tables, hasMichelinData gate, city/country filters,
// and schema validation (rejects bad category / missing field).
//
// v0.61.331 — venue-award-schema.v0_1: appended SYNTHETIC-fixture suites
// for the venue-centric layer (dup id throws, year views + categoryForYear,
// closed-venue exclusion, awardsDiff promotion/debut/dropped, manifest
// gating on a fake country, flat SG → venue normalisation). All fixtures
// use made-up names ('Test Cafe A', 'Test Stall B', …) — NO real venue.

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

  it('michelin/my.js is venue-centric + EMPTY (no real data fabricated)', () => {
    const my = require('../michelin/my.js');
    expect(my.COUNTRY).toBe('MY');
    expect(my.ENTRIES).toEqual([]);   // operator pastes the curated 130 rows later
  });
});

// ──────────────────────────────────────────────────────────────
// venue-award-schema.v0_1 — SYNTHETIC fixtures only (made-up names).
// No real Michelin venue appears below; these exercise the venue-centric
// loader logic (dup id, year views, categoryForYear, status exclusion,
// awardsDiff, manifest gating, flat→venue normalisation) in isolation.
// ──────────────────────────────────────────────────────────────

// A made-up open KL one-star (2025) → two-star (2026): a promotion + debut.
const FX_PROMOTED = {
  id: 'my-kul-test-cafe-a', city: 'Kuala Lumpur', country: 'MY',
  name: 'Test Cafe A', address: '1 Test Road', cuisine: 'malaysian',
  vegetarian: false, halal: true, status: 'open',
  awards: [
    { year: 2025, category: 'one-star' },
    { year: 2026, category: 'two-star' },
  ],
};
// A made-up George Town Bib that debuts only in 2026 (absent 2025).
const FX_DEBUT_2026 = {
  id: 'my-pen-test-stall-b', city: 'George Town', country: 'MY',
  name: 'Test Stall B', address: '2 Test Lane',
  vegetarian: true, halal: false, status: 'open',
  awards: [{ year: 2026, category: 'bib-gourmand' }],
};
// A made-up CLOSED Ipoh one-star (2025 only) — dropped after 2025.
const FX_CLOSED = {
  id: 'my-iph-test-kopitiam-c', city: 'Ipoh', country: 'MY',
  name: 'Test Kopitiam C', address: '3 Test Street',
  vegetarian: false, halal: false, status: 'closed',
  awards: [{ year: 2025, category: 'one-star' }],
};

function normFixtures(arr) {
  // Run through the public venue normaliser so status/flags are defaulted
  // exactly as the loader would, then validate the shape.
  return arr.map((e) => {
    const v = data.venueToVenue(e);
    data.validateVenue(v, 'fixture', false);   // skip curated-city check for synthetic
    return v;
  });
}

describe('venue-award-schema — dup id is a hard error', () => {
  it('a duplicate venue id throws (names of BOTH in the message), never a silent skip', () => {
    const dupe = { ...FX_DEBUT_2026, id: FX_PROMOTED.id, name: 'Test Clash D' };
    const pool = normFixtures([FX_PROMOTED, dupe]);
    expect(() => data.dedupById(pool, [], new Map(), 'fixture'))
      .toThrow(/DUPLICATE venue id .*Test Cafe A.*Test Clash D|DUPLICATE venue id .*Test Clash D.*Test Cafe A/);
  });

  it('distinct ids merge cleanly', () => {
    const pool = normFixtures([FX_PROMOTED, FX_DEBUT_2026, FX_CLOSED]);
    const target = [];
    data.dedupById(pool, target, new Map(), 'fixture');
    expect(target.length).toBe(3);
  });
});

describe('venue-award-schema — year views + categoryForYear', () => {
  const pool = normFixtures([FX_PROMOTED, FX_DEBUT_2026, FX_CLOSED]);
  const [promoted, debut, closed] = pool;

  it('venuesForYear partitions 2025 vs 2026 correctly', () => {
    const y25 = pool.filter((v) => v.awards.some((a) => a.year === 2025));
    const y26 = pool.filter((v) => v.awards.some((a) => a.year === 2026));
    // 2025: promoted + closed (debut is 2026-only). 2026: promoted + debut.
    expect(y25.map((v) => v.id).sort()).toEqual(['my-iph-test-kopitiam-c', 'my-kul-test-cafe-a']);
    expect(y26.map((v) => v.id).sort()).toEqual(['my-kul-test-cafe-a', 'my-pen-test-stall-b']);
  });

  it('categoryForYear returns the right tier, including across a promotion', () => {
    expect(data.categoryForYear(promoted, 2025)).toBe('one-star');
    expect(data.categoryForYear(promoted, 2026)).toBe('two-star');
    // a debut: absent in 2025, present (bib) in 2026
    expect(data.categoryForYear(debut, 2025)).toBe(null);
    expect(data.categoryForYear(debut, 2026)).toBe('bib-gourmand');
    expect(data.categoryForYear(closed, 2026)).toBe(null);
  });
});

describe('venue-award-schema — closed-venue exclusion', () => {
  const pool = normFixtures([FX_PROMOTED, FX_DEBUT_2026, FX_CLOSED]);

  it("visitableVenues EXCLUDES status:'closed'", () => {
    const ids = data.visitableVenues(pool).map((v) => v.id);
    expect(ids).toContain('my-kul-test-cafe-a');
    expect(ids).toContain('my-pen-test-stall-b');
    expect(ids).not.toContain('my-iph-test-kopitiam-c');   // closed
  });

  it('a year/edition view INCLUDES closed venues (historical snapshot)', () => {
    // The 2025 edition includes the closed Ipoh one-star.
    const edition2025 = pool.filter((v) => v.awards.some((a) => a.year === 2025));
    expect(edition2025.map((v) => v.id)).toContain('my-iph-test-kopitiam-c');
  });
});

describe('venue-award-schema — awardsDiff', () => {
  const [promoted, debut, closed] = normFixtures([FX_PROMOTED, FX_DEBUT_2026, FX_CLOSED]);

  it('flags a promotion + records debut/latest', () => {
    const diff = data.awardsDiff(promoted);
    expect(diff.debutYear).toBe(2025);
    expect(diff.latestYear).toBe(2026);
    expect(diff.latestCategory).toBe('two-star');
    expect(diff.promotions).toEqual([{ from: 'one-star', to: 'two-star', year: 2026 }]);
    expect(diff.demotions).toEqual([]);
    expect(diff.droppedAfter).toBeUndefined();   // still current in 2026
  });

  it('flags a pure debut (single award, no promo/demo)', () => {
    const diff = data.awardsDiff(debut);
    expect(diff.debutYear).toBe(2026);
    expect(diff.promotions).toEqual([]);
    expect(diff.demotions).toEqual([]);
  });

  it('flags a closed venue as droppedAfter its last award year', () => {
    const diff = data.awardsDiff(closed);
    expect(diff.droppedAfter).toBe(2025);
  });
});

describe('venue-award-schema — manifest gating (synthetic country)', () => {
  it('a fixture violating the manifest throws (when non-empty)', () => {
    // Synthetic manifest: this fake "country" must have 2 one-stars in 2025.
    const manifest = { 2025: { 'one-star': 2, total: 2 } };
    const pool = normFixtures([FX_PROMOTED]);   // only ONE one-star in 2025
    expect(() => data.assertManifest('ZZ', pool, 'fixture', manifest))
      .toThrow(/manifest mismatch|TOTAL mismatch/);
  });

  it('an EMPTY table never trips the manifest (gated on non-empty → boots fine)', () => {
    const manifest = { 2025: { 'one-star': 2, total: 2 } };
    expect(() => data.assertManifest('ZZ', [], 'fixture', manifest)).not.toThrow();
  });

  it('a matching fixture passes the manifest', () => {
    const manifest = { 2025: { 'one-star': 1, total: 1 }, 2026: { 'two-star': 1, total: 1 } };
    const pool = normFixtures([FX_PROMOTED]);   // 1×one-star 2025 + 1×two-star 2026
    expect(() => data.assertManifest('ZZ', pool, 'fixture', manifest)).not.toThrow();
  });
});

describe('venue-award-schema — flat SG normalisation', () => {
  it('a flat SG row becomes a venue with one award + a synthesised id', () => {
    const flat = {
      city: 'Singapore', country: 'SG', name: 'Les Amis',
      address: '1 Scotts Road', postal: '228208',
      category: 'three-star', year: 2025, cuisine: 'french',
      vegetarian: false, halal: false,
    };
    const v = data.flatToVenue(flat);
    expect(v.id).toBe('sg-sg-les-amis');         // sg-<iata|sg>-<kebab(name)>
    expect(v.awards).toEqual([{ year: 2025, category: 'three-star' }]);
    expect(v.status).toBe('open');               // defaulted
    expect(v.city).toBe('Singapore');
  });

  it('the loaded SG pool is venue-centric: 130 venues, each ≥1 award, unique ids', () => {
    const venues = data.getAllVenues().filter((v) => v.country === 'SG');
    expect(venues.length).toBe(130);
    const ids = new Set(venues.map((v) => v.id));
    expect(ids.size).toBe(130);                  // all unique
    for (const v of venues) {
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
      expect(v.id.startsWith('sg-')).toBe(true);
    }
  });
});
