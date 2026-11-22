// michelin-year-filter.test.js — v0.62.700 (Register O-124)
//
// The point of O-124 was that the hardcoded 2026/2025 pair would fail SILENTLY
// when a '27 edition landed: a venue awarded only in '27 would match neither
// arm and disappear, with a green suite and a normal-looking UI. So the tests
// that matter here are the ones a fixed pair would fail — a third edition, and
// an edition nobody has written a key for.

import { describe, it, expect } from 'vitest';
import {
  yearsOffFromFilter,
  yearUniverse,
  makeMichelinYearMatcher
} from '../michelin-year-filter.js';

const star = (name, ...years) => ({ name, category: 'one-star', awardYears: years });
const bib = (name, ...years) => ({ name, category: 'bib-gourmand', awardYears: years });

const POOL = [
  star('both', "'26", "'25"),
  star('only26', "'26"),
  star('only25', "'25"),
  bib('bib26', "'26")
];

const names = (entries, filter) =>
  entries.filter(makeMichelinYearMatcher(filter, entries)).map((e) => e.name);

describe('yearsOffFromFilter', () => {
  it('maps year<YYYY>:false to a compact token', () => {
    expect(yearsOffFromFilter({ year2026: false })).toEqual(new Set(["'26"]));
  });

  it('treats anything other than an explicit false as ON', () => {
    expect(yearsOffFromFilter({ year2026: true, year2025: undefined })).toEqual(new Set());
    expect(yearsOffFromFilter({})).toEqual(new Set());
    expect(yearsOffFromFilter(null)).toEqual(new Set());
  });

  it('ignores keys that are not year + four digits', () => {
    const off = yearsOffFromFilter({ bib: false, year26: false, years2026: false, year2026: false });
    expect(off).toEqual(new Set(["'26"]));
  });

  it('accepts a year no code has ever named — the whole point of O-124', () => {
    expect(yearsOffFromFilter({ year2031: false })).toEqual(new Set(["'31"]));
  });
});

describe('yearUniverse', () => {
  it('collects star years and ignores Bib Gourmand', () => {
    expect(yearUniverse(POOL)).toEqual(new Set(["'26", "'25"]));
  });

  it('is empty for a pool of only bibs', () => {
    expect(yearUniverse([bib('b', "'26")])).toEqual(new Set());
  });
});

describe('makeMichelinYearMatcher — behaviour today (must be unchanged)', () => {
  it('all ticks on returns everything', () => {
    expect(names(POOL, {})).toEqual(['both', 'only26', 'only25', 'bib26']);
  });

  it('2026 off drops the 2026-only star, keeps the dual-year one', () => {
    expect(names(POOL, { year2026: false })).toEqual(['both', 'only25', 'bib26']);
  });

  it('2025 off drops the 2025-only star', () => {
    expect(names(POOL, { year2025: false })).toEqual(['both', 'only26', 'bib26']);
  });

  it('bib off drops only the bib, never a star', () => {
    expect(names(POOL, { bib: false })).toEqual(['both', 'only26', 'only25']);
  });

  it('bib is never cross-filtered by year', () => {
    expect(names(POOL, { year2026: false, year2025: false })).toEqual(['bib26']);
  });

  it('every tick off fails OPEN rather than returning nothing', () => {
    expect(names(POOL, { year2026: false, year2025: false, bib: false }))
      .toEqual(['both', 'only26', 'only25', 'bib26']);
  });

  it('a star with no recorded year matches no year tick', () => {
    const pool = [star('yearless')];
    expect(names(pool, {})).toEqual([]);
  });
});

describe('makeMichelinYearMatcher — a third edition (what the hardcoded pair could not do)', () => {
  const POOL27 = [star('s27', "'27"), star('s26', "'26"), star('s25', "'25"), bib('b', "'27")];

  it("includes a '27 star with no client key mentioning it", () => {
    expect(names(POOL27, {})).toEqual(['s27', 's26', 's25', 'b']);
  });

  it("keeps '27 when the older editions are switched off", () => {
    expect(names(POOL27, { year2026: false, year2025: false, bib: false })).toEqual(['s27']);
  });

  it("switches '27 off on its own", () => {
    expect(names(POOL27, { year2027: false })).toEqual(['s26', 's25', 'b']);
  });

  it('fail-open is measured against the real universe, not a fixed pair', () => {
    // Under the old rule, year2026+year2025+bib off meant "all ticks off" and
    // returned everything. With a '27 in the data that is no longer all of
    // them, so the '27 star must be the honest answer instead.
    expect(names(POOL27, { year2026: false, year2025: false, bib: false })).toEqual(['s27']);
    expect(names(POOL27, { year2027: false, year2026: false, year2025: false, bib: false }))
      .toEqual(['s27', 's26', 's25', 'b']);
  });
});
