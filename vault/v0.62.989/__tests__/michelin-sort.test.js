// v0.62.680 — michelin-sort.js unit tests (O-91 SORT half).
//
// Covers instr/GIA_Michelin_Footer_Pagination_AI_Prompt.md §2's three-key
// comparator: newest applicable SELECTED award year, then Michelin category
// rank (3★→2★→1★→Bib), then alphabetical fallback.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { sortMichelinPool, effectiveYearRank, yearRank } = require('../michelin-sort.js');

const threeStar26 = { name: 'Zenith', category: 'three-star', awardYears: ["'26"] };
const threeStar25 = { name: 'Aria', category: 'three-star', awardYears: ["'25"] };
const oneStar26 = { name: 'Nori', category: 'one-star', awardYears: ["'26"] };
const bib26and25 = { name: 'Kopi Corner', category: 'bib-gourmand', awardYears: ["'26", "'25"] };
const bib25only = { name: 'Laksa House', category: 'bib-gourmand', awardYears: ["'25"] };

describe('sortMichelinPool', () => {
  it('ranks newest SELECTED award year ahead of category', () => {
    // Per spec, year outranks category: a '26 Bib beats a '25 three-star.
    const out = sortMichelinPool([threeStar25, bib26and25], ["'26", "'25"]);
    expect(out.map((e) => e.name)).toEqual(['Kopi Corner', 'Aria']);
  });

  it('falls back to category rank when years tie', () => {
    const out = sortMichelinPool([oneStar26, threeStar26], ["'26", "'25"]);
    expect(out.map((e) => e.name)).toEqual(['Zenith', 'Nori']);
  });

  it('falls back to alphabetical when year and category both tie', () => {
    const a = { name: 'Zulu Bistro', category: 'one-star', awardYears: ["'26"] };
    const b = { name: 'Amber Bistro', category: 'one-star', awardYears: ["'26"] };
    const out = sortMichelinPool([a, b], ["'26", "'25"]);
    expect(out.map((e) => e.name)).toEqual(['Amber Bistro', 'Zulu Bistro']);
  });

  it('only considers SELECTED years when computing "newest"', () => {
    // bib26and25 has both years, but only '25 is selected — should rank
    // by '25, not '26, so it ties with bib25only on year and falls to
    // category (tie) then alphabetical.
    const out = sortMichelinPool([bib26and25, bib25only], ["'25"]);
    expect(out.map((e) => e.name)).toEqual(['Kopi Corner', 'Laksa House']);
  });

  it('treats an empty selectedYears as "all years count" (fail-open)', () => {
    const out = sortMichelinPool([threeStar25, bib26and25], []);
    expect(out.map((e) => e.name)).toEqual(['Kopi Corner', 'Aria']);
  });

  it('does not mutate the input array', () => {
    const input = [threeStar25, threeStar26];
    const copy = [...input];
    sortMichelinPool(input, ["'26", "'25"]);
    expect(input).toEqual(copy);
  });

  it('handles a missing/non-array entries argument gracefully', () => {
    expect(sortMichelinPool(undefined, ["'26"])).toEqual([]);
    expect(sortMichelinPool(null, ["'26"])).toEqual([]);
  });
});

describe('effectiveYearRank', () => {
  it('returns 0 for an entry with no awardYears', () => {
    expect(effectiveYearRank({ name: 'No Years' }, ["'26"])).toBe(0);
  });

  it('returns 0 when the entry\'s years are all excluded by selectedYears', () => {
    expect(effectiveYearRank(bib25only, ["'26"])).toBe(0);
  });
});

// v0.62.700 (Register O-124) — the year rank used to be a two-entry lookup
// table, so any edition outside it scored 0 and sorted BELOW '25. Nothing
// would have errored; the order would simply have been wrong, newest last.
describe('yearRank — data-driven editions (O-124)', () => {
  it('is the year itself, so newer always outranks older', () => {
    expect(yearRank("'27")).toBeGreaterThan(yearRank("'26"));
    expect(yearRank("'26")).toBeGreaterThan(yearRank("'25"));
  });

  it('accepts an edition no lookup table ever listed', () => {
    expect(yearRank("'31")).toBe(2031);
  });

  it('scores an unparseable token 0 rather than NaN (which would break sorting)', () => {
    for (const bad of ['', null, undefined, 'nope']) expect(yearRank(bad)).toBe(0);
  });

  it("sorts a '27 entry ahead of '26 and '25", () => {
    const pool = [
      { name: 'Old', category: 'one-star', awardYears: ["'25"] },
      { name: 'New', category: 'one-star', awardYears: ["'27"] },
      { name: 'Mid', category: 'one-star', awardYears: ["'26"] }
    ];
    expect(sortMichelinPool(pool, []).map((e) => e.name)).toEqual(['New', 'Mid', 'Old']);
  });

  it("keeps a three-star '25 below a one-star '27 — year outranks category, as before", () => {
    const pool = [
      { name: 'Three25', category: 'three-star', awardYears: ["'25"] },
      { name: 'One27', category: 'one-star', awardYears: ["'27"] }
    ];
    expect(sortMichelinPool(pool, []).map((e) => e.name)).toEqual(['One27', 'Three25']);
  });
});
