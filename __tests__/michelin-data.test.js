// __tests__/michelin-data.test.js — v0.61.333
//
// Validates the venue-centric Michelin loader (venue-award-schema.v0_1).
//
// As of v0.61.333 the loader is VENUE-CENTRIC ONLY and no longer ingests
// the Singapore flat dataset (SG lives standalone in SG-michelin.js on its
// own fast path). This suite therefore covers:
//   - the real MY-michelin.js load (63@2025 / 67@2026 / awards-sum 130),
//   - the empty {CC}-michelin.js country tables (TH/VN/JP/KR/CN/HK/TW),
//   - hasMichelinData (true for MY/KL/George Town, false for SG + empties),
//   - the synthetic-fixture venue-centric suites (dup id, year views,
//     categoryForYear, closed-venue exclusion, awardsDiff, manifest gating).
// All non-MY fixtures use made-up names ('Test Cafe A', …) — NO fabricated
// real venue. The MY assertions read the operator's curated table.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const data = require('../michelin-data.js');

describe('michelin-data — Malaysia (MY-michelin.js) load', () => {
  it('loads 70 venues with sum(awards) === 130', () => {
    const my = data.venuesForCountry('MY');
    expect(my.length).toBe(70);
    const sum = my.reduce((n, v) => n + v.awards.length, 0);
    expect(sum).toBe(130);
  });

  it('63 venues hold a 2025 award, 67 hold a 2026 award', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'MY');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'MY');
    expect(y25.length).toBe(63);
    expect(y26.length).toBe(67);
  });

  it('matches the per-tier manifest for both editions', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('MY')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'two-star': 1, 'one-star': 6, 'bib-gourmand': 56 });
    expect(tiers(2026)).toEqual({ 'two-star': 1, 'one-star': 8, 'bib-gourmand': 58 });
  });

  it('every MY venue has a unique id and the full venue shape', () => {
    const my = data.venuesForCountry('MY');
    const ids = new Set(my.map((v) => v.id));
    expect(ids.size).toBe(my.length);          // no dup ids
    for (const v of my) {
      expect(v.id.startsWith('my-')).toBe(true);
      expect(['Kuala Lumpur', 'George Town']).toContain(v.city);
      expect(v.country).toBe('MY');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries the Sri Nirwana Maju → Nirwana rename as one venue', () => {
    const nirwana = data.venueById('my-kul-nirwana');
    expect(nirwana).not.toBeNull();
    expect(nirwana.name).toBe('Nirwana');
    expect(nirwana.formerNames).toEqual(['Sri Nirwana Maju']);
    expect(nirwana.awards.length).toBe(2);     // 2025 + 2026
  });

  it("marks Heun Kee Claypot Chicken Rice (Pudu) as status:'closed'", () => {
    const heun = data.venueById('my-kul-heun-kee-claypot-chicken-rice-pudu');
    expect(heun).not.toBeNull();
    expect(heun.status).toBe('closed');
    // Closed → excluded from the visitable surface, included in editions.
    expect(data.visitableVenues(data.venuesForCountry('MY')).map((v) => v.id))
      .not.toContain(heun.id);
    expect(data.editionVenues(2025).map((v) => v.id)).toContain(heun.id);
  });
});

describe('michelin-data — Thailand (TH-michelin.js) load', () => {
  const TH_CITIES = [
    'Bangkok', 'Chiang Mai', 'Chon Buri', 'Khon Kaen', 'Ko Samui',
    'Nakhon Pathom', 'Nakhon Ratchasima', 'Nonthaburi', 'Pathum Thani',
    'Phang-Nga', 'Phra Nakhon Si Ayutthaya', 'Phuket', 'Samut Sakhon',
    'Surat Thani', 'Ubon Ratchathani', 'Udon Thani',
  ];

  it('loads 180 venues with sum(awards) === 340', () => {
    const th = data.venuesForCountry('TH');
    expect(th.length).toBe(180);
    const sum = th.reduce((n, v) => n + v.awards.length, 0);
    expect(sum).toBe(340);
  });

  it('160 venues hold a 2025 award, 180 hold a 2026 award', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'TH');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'TH');
    expect(y25.length).toBe(160);
    expect(y26.length).toBe(180);
  });

  it('matches the per-tier manifest for both editions', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('TH')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'three-star': 1, 'two-star': 7, 'one-star': 28, 'bib-gourmand': 124 });
    expect(tiers(2026)).toEqual({ 'three-star': 2, 'two-star': 8, 'one-star': 33, 'bib-gourmand': 137 });
  });

  it('every TH venue has a unique id, a curated city, and the full venue shape', () => {
    const th = data.venuesForCountry('TH');
    const ids = new Set(th.map((v) => v.id));
    expect(ids.size).toBe(th.length);          // no dup ids
    for (const v of th) {
      expect(v.id.startsWith('th-')).toBe(true);
      // city must be in the curated cities table (CITY_IATA) — this is the
      // load-time gate the 13 new TH cities were added to satisfy.
      expect(TH_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('TH');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries Sorn as the 3-star both editions and resolves a newly-curated city', () => {
    const sorn = data.venueById('th-bkk-sorn');
    expect(sorn).not.toBeNull();
    expect(sorn.name).toBe('Sorn');
    expect(data.categoryForYear(sorn, 2026)).toBe('three-star');
    // a venue in one of the 13 freshly-added cities loads (would throw
    // pre-fix because its city was not in CITY_IATA).
    const akkee = data.venueById('th-nonthaburi-akkee');
    expect(akkee).not.toBeNull();
    expect(akkee.city).toBe('Nonthaburi');
  });
});

describe('michelin-data — hasMichelinData gate', () => {
  it('is true where MY venues exist (country + curated cities)', () => {
    expect(data.hasMichelinData('MY')).toBe(true);
    expect(data.hasMichelinData('my')).toBe(true);
    expect(data.hasMichelinData('Kuala Lumpur')).toBe(true);
    expect(data.hasMichelinData('George Town')).toBe(true);
  });

  it('is true where TH venues exist (country + curated cities, incl. new ones)', () => {
    expect(data.hasMichelinData('TH')).toBe(true);
    expect(data.hasMichelinData('th')).toBe(true);
    expect(data.hasMichelinData('Bangkok')).toBe(true);
    expect(data.hasMichelinData('Nonthaburi')).toBe(true);
    expect(data.hasMichelinData('Udon Thani')).toBe(true);
  });

  it('is false for Singapore (SG is decoupled — handled by SG-michelin.js)', () => {
    expect(data.hasMichelinData('Singapore')).toBe(false);
    expect(data.hasMichelinData('SG')).toBe(false);
  });

  it('is false for the empty guide cities/countries', () => {
    expect(data.hasMichelinData('Tokyo')).toBe(false);
    expect(data.hasMichelinData('JP')).toBe(false);
    expect(data.hasMichelinData('Hong Kong')).toBe(false);
  });

  it('is false for empty / nullish input', () => {
    expect(data.hasMichelinData('')).toBe(false);
    expect(data.hasMichelinData(null)).toBe(false);
    expect(data.hasMichelinData(undefined)).toBe(false);
  });
});

describe('michelin-data — country tables', () => {
  it('the empty guide country tables ship zero rows (curator fills by hand)', () => {
    for (const cc of ['VN', 'JP', 'KR', 'CN', 'HK', 'TW']) {
      const tbl = require(`../${cc}-michelin.js`);
      expect(Array.isArray(tbl.ENTRIES)).toBe(true);
      expect(tbl.ENTRIES.length).toBe(0);
      expect(tbl.COUNTRY).toBe(cc);
    }
  });

  it('MY-michelin.js is venue-centric with 70 curated rows', () => {
    const my = require('../MY-michelin.js');
    expect(my.COUNTRY).toBe('MY');
    expect(Array.isArray(my.ENTRIES)).toBe(true);
    expect(my.ENTRIES.length).toBe(70);
  });

  it('TH-michelin.js is venue-centric with 180 curated rows', () => {
    const th = require('../TH-michelin.js');
    expect(th.COUNTRY).toBe('TH');
    expect(Array.isArray(th.ENTRIES)).toBe(true);
    expect(th.ENTRIES.length).toBe(180);
  });
});

describe('michelin-data — venue validation rejects bad rows', () => {
  it('rejects an invalid award category', () => {
    expect(() => data.validateVenue({
      id: 'jp-tokyo-bad', city: 'Tokyo', country: 'JP', name: 'Bad Venue',
      address: '1 Foo St', vegetarian: false, halal: false, status: 'open',
      awards: [{ year: 2025, category: 'four-star' }],
    }, 'test')).toThrow(/invalid award category/);
  });

  it('rejects a missing required field (no awards)', () => {
    expect(() => data.validateVenue({
      id: 'jp-tokyo-no-awards', city: 'Tokyo', country: 'JP', name: 'No Awards',
      address: '1 Foo St', vegetarian: false, halal: false, status: 'open',
      awards: [],
    }, 'test')).toThrow(/"awards" must be a non-empty array/);
  });

  it('rejects a non-ISO-2 country', () => {
    expect(() => data.validateVenue({
      id: 'jp-tokyo-badcc', city: 'Tokyo', country: 'Japan', name: 'Bad CC',
      address: '1 Foo St', vegetarian: false, halal: false, status: 'open',
      awards: [{ year: 2025, category: 'one-star' }],
    }, 'test')).toThrow(/ISO-2/);
  });

  it('rejects a bad award year', () => {
    expect(() => data.validateVenue({
      id: 'jp-tokyo-badyear', city: 'Tokyo', country: 'JP', name: 'Bad Year',
      address: '1 Foo St', vegetarian: false, halal: false, status: 'open',
      awards: [{ year: 2099, category: 'one-star' }],
    }, 'test')).toThrow(/year/);
  });

  it('accepts a well-formed venue (curated city)', () => {
    expect(data.validateVenue({
      id: 'jp-tokyo-good', city: 'Tokyo', country: 'JP', name: 'Good Venue',
      address: '1 Foo St', postal: '1000001', cuisine: 'japanese',
      vegetarian: false, halal: false, status: 'open',
      awards: [{ year: 2026, category: 'one-star' }],
    }, 'test')).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────
// venue-award-schema.v0_1 — SYNTHETIC fixtures only (made-up names).
// No real Michelin venue appears below; these exercise the venue-centric
// loader logic (dup id, year views, categoryForYear, status exclusion,
// awardsDiff, manifest gating) in isolation.
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
