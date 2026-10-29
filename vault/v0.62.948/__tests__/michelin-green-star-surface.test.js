// __tests__/michelin-green-star-surface.test.js — v0.62.766
//
// The Green Star reaches the flat + search surface.
//
// BEFORE THIS, THE FAILURE WAS SILENT. A Green-Star-only venue loaded, passed
// every assertion, and rendered nowhere: `_venueToFlatRows` emitted no row for
// it (the flat contract is one row per award), and on the live search path
// `latestMichCat` returned null while `retainedAwardYears` returned [], so the
// year matcher dropped it. Nothing threw. Nothing logged. The venue was in the
// dataset and invisible — which is the shape of bug this suite exists to keep
// out, not merely the one it happens to cover.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const md = require('../michelin-data.js');
const { makeMichelinYearMatcher } = require('../michelin-year-filter.js');
const { sortMichelinPool, MICHELIN_RANK } = require('../michelin-sort.js');

const GS_ONLY = ['vn-dad-nen-danang', 'vn-han-lamai-garden', 'vn-sgn-tales-by-chapter'];

describe('flat rows carry the Green Star', () => {
  it('a Green-Star-only venue produces one row per Green Star year', () => {
    const rows = md.michelinForCity('Da Nang').filter((r) => r.name === 'Nén Danang');
    expect(rows.length).toBe(1);
    expect(rows[0].category).toBe('green-star');
    expect(rows[0].year).toBe(2026);
    expect(rows[0].greenStar).toBe(true);
    expect(rows[0].address).toBeTruthy();      // a visible row needs an address
  });

  it('a venue holding BOTH is not double-listed — the original objection', () => {
    // The schema note rejected 'green-star' as an awards[] category because a
    // starred holder would then emit two rows and appear twice in every flat
    // view. That objection still stands, so this asserts it directly: Amber is
    // three-star in '25 and '26 and holds a '26 Green Star — two rows, one per
    // award year, with the flag set on the year the Green Star covers.
    const amber = md.michelinForCity('Hong Kong').filter((r) => r.name === 'Amber');
    expect(amber.length).toBe(2);
    expect(amber.every((r) => r.category === 'three-star')).toBe(true);
    expect(amber.filter((r) => r.greenStar).map((r) => r.year)).toEqual([2026]);
  });

  it('every flat row carries a boolean greenStar, never undefined', () => {
    // A consumer must be able to test the flag without knowing which branch of
    // _venueToFlatRows produced the row.
    const sample = [
      ...md.michelinForCountry('VN'),
      ...md.michelinForCountry('HK'),
      ...md.michelinForCountry('MY'),
    ];
    expect(sample.length).toBeGreaterThan(0);
    expect(sample.every((r) => typeof r.greenStar === 'boolean')).toBe(true);
  });

  it('flat-row count grows by exactly the Green-Star-only venues', () => {
    // Not by the number of Green Stars — the starred holders must contribute
    // no extra row. VN: 92 award rows + 3 green-star-only rows.
    const vn = md.michelinForCountry('VN');
    const awardRows = vn.filter((r) => r.category !== 'green-star').length;
    const gsRows = vn.filter((r) => r.category === 'green-star').length;
    expect(awardRows).toBe(92);
    expect(gsRows).toBe(3);
    expect(vn.length).toBe(95);
  });
});

describe('the live search path surfaces it', () => {
  // Mirrors the mapping in index.js handleMichelinSearch. Kept in step by the
  // assertions below rather than by hope: if the handler's fallback is removed,
  // 'null category' goes non-zero here.
  const latestMichCat = (v) => {
    let best = null;
    for (const a of v.awards) { if (!best || a.year > best.year) best = a; }
    if (best) return best.category;
    return md.retainedGreenStarYears(v).length ? 'green-star' : null;
  };
  const michAwardYears = (v) => {
    const y = md.retainedAwardYears(v);
    return y.length ? y : md.retainedGreenStarYears(v);
  };
  const entriesFor = (cc) => md.visitableVenues()
    .filter((v) => v.country === cc)
    .map((v) => ({
      name: v.name,
      category: latestMichCat(v),
      awardYears: michAwardYears(v),
      greenStar: md.retainedGreenStarYears(v).length > 0,
    }));

  it('no VN entry has a null category — the state that made them vanish', () => {
    expect(entriesFor('VN').filter((e) => e.category === null)).toEqual([]);
  });

  it('all three survive the year matcher with no ticks off', () => {
    const vn = entriesFor('VN');
    const kept = vn.filter(makeMichelinYearMatcher({}, vn));
    expect(kept.filter((e) => e.category === 'green-star').length).toBe(3);
  });

  it("and disappear when '26 is switched off — they are year-gated like any award", () => {
    const vn = entriesFor('VN');
    const kept = vn.filter(makeMichelinYearMatcher({ year2026: false }, vn));
    expect(kept.filter((e) => e.category === 'green-star').length).toBe(0);
  });

  it('a starred Green Star holder keeps its tier and gains the flag', () => {
    const amber = entriesFor('HK').find((e) => e.name === 'Amber');
    expect(amber.category).toBe('three-star');   // tier NOT displaced
    expect(amber.greenStar).toBe(true);
  });

  it('sorts below Bib Gourmand, deterministically, not by accident', () => {
    expect(MICHELIN_RANK['green-star']).toBe(0);
    const pool = [
      { name: 'Z green', category: 'green-star', awardYears: ["'26"] },
      { name: 'A bib', category: 'bib-gourmand', awardYears: ["'26"] },
      { name: 'M star', category: 'one-star', awardYears: ["'26"] },
    ];
    expect(sortMichelinPool(pool, ["'26"]).map((e) => e.category))
      .toEqual(['one-star', 'bib-gourmand', 'green-star']);
  });
});

describe('retainedGreenStarYears', () => {
  it('returns compact newest-first tokens, matching retainedAwardYears', () => {
    expect(md.retainedGreenStarYears(md.venueById('vn-dad-nen-danang'))).toEqual(["'26"]);
  });

  it('returns [] for a venue with no Green Star, and for junk input', () => {
    expect(md.retainedGreenStarYears(md.venueById('vn-dad-la-maison-1888'))).toEqual([]);
    expect(md.retainedGreenStarYears(null)).toEqual([]);
    expect(md.retainedGreenStarYears({})).toEqual([]);
  });

  it('the 3 pinned Green-Star-only ids are exactly the award-less venues', () => {
    const awardless = md.VENUES.filter((v) => !v.awards.length).map((v) => v.id).sort();
    expect(awardless).toEqual([...GS_ONLY].sort());
  });
});
