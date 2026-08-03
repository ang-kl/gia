// cuisine-michelin-years.test.js — v0.62.700 (Register O-124)
//
// The client half of the data-driven edition ticks: which ticks the drawer
// offers, in what order, and what it falls back to before the catalogue
// answers. These used to live inside MichelinFilterDrawer.jsx as a literal
// [2026, 2025] pair, where nothing could check them — the repo has no React
// render harness (O-93), so a component-held constant is verified by reading.

import { describe, it, expect } from 'vitest';
import {
  FALLBACK_YEAR_TOKENS,
  yearOfToken,
  buildMichelinKeys,
  tickTokens,
  unionYears,
  soleCheckedKey
} from '../web/cuisine/src/v2/lib/michelin-years.js';

describe('yearOfToken', () => {
  it("expands the compact dataset token", () => {
    expect(yearOfToken("'26")).toBe(2026);
    expect(yearOfToken("'25")).toBe(2025);
  });

  it('passes a four-digit year through', () => {
    expect(yearOfToken('2027')).toBe(2027);
  });

  it('rejects junk rather than returning a NaN tick', () => {
    for (const bad of ['', null, undefined, "'", 'abc', "'123"]) {
      expect(Number.isNaN(yearOfToken(bad))).toBe(true);
    }
  });
});

describe('buildMichelinKeys', () => {
  it('orders newest first and pins Bib Gourmand last', () => {
    expect(buildMichelinKeys(["'25", "'27", "'26"])).toEqual([
      { key: 'year2027', year: 2027, token: "'27" },
      { key: 'year2026', year: 2026, token: "'26" },
      { key: 'year2025', year: 2025, token: "'25" },
      { key: 'bib', year: null, token: null }
    ]);
  });

  it('produces the wire key the server parses', () => {
    // michelin-year-filter.js reads /^year(\d{4})$/ — this is the contract
    // between the two halves, so it is asserted rather than assumed.
    for (const { key, year } of buildMichelinKeys(["'26", "'31"])) {
      if (year != null) expect(key).toBe(`year${year}`);
    }
  });

  it('de-duplicates tokens that appear in more than one country', () => {
    expect(buildMichelinKeys(["'26", "'26", "'25"]).map((k) => k.key))
      .toEqual(['year2026', 'year2025', 'bib']);
  });

  it('drops junk tokens but still offers Bib', () => {
    expect(buildMichelinKeys(['nope', null]).map((k) => k.key)).toEqual(['bib']);
  });

  it('handles an empty or absent list', () => {
    expect(buildMichelinKeys([]).map((k) => k.key)).toEqual(['bib']);
    expect(buildMichelinKeys(null).map((k) => k.key)).toEqual(['bib']);
  });
});

describe('tickTokens', () => {
  it('prefers the cross-country union', () => {
    expect(tickTokens({ allYears: ["'27"], availableYears: ["'25"] })).toEqual(["'27"]);
  });

  it('falls back to the per-country list when there is no union', () => {
    expect(tickTokens({ allYears: null, availableYears: ["'25"] })).toEqual(["'25"]);
    expect(tickTokens({ allYears: [], availableYears: ["'25"] })).toEqual(["'25"]);
  });

  it('falls back to the built-in pair before the catalogue answers', () => {
    expect(tickTokens({})).toEqual(FALLBACK_YEAR_TOKENS);
    expect(tickTokens()).toEqual(FALLBACK_YEAR_TOKENS);
  });

  it("offers an edition a country does not have yet — the SG 2026 case", () => {
    // SG's 2026 star list is unannounced, so availableYears is ["'25"] there.
    // The tick must still be BUILT (it is then greyed with a reason, D-65);
    // building the list from availableYears alone would make it vanish.
    const keys = buildMichelinKeys(tickTokens({
      allYears: ["'26", "'25"],
      availableYears: ["'25"]
    }));
    expect(keys.map((k) => k.key)).toEqual(['year2026', 'year2025', 'bib']);
  });
});

describe('unionYears', () => {
  it('unions across countries, newest first', () => {
    expect(unionYears({ SG: ["'25"], JP: ["'26", "'25"], FR: ["'26"] })).toEqual(["'26", "'25"]);
  });

  it('picks up an edition only one country has published', () => {
    expect(unionYears({ SG: ["'25"], JP: ["'27", "'26"] })).toEqual(["'27", "'26", "'25"]);
  });

  it('returns null (not []) when there is nothing, matching the fail-open convention', () => {
    expect(unionYears({})).toBeNull();
    expect(unionYears(null)).toBeNull();
    expect(unionYears({ SG: null, JP: 'nope' })).toBeNull();
  });
});

// v0.62.701 (Register O-131) — unticking the LAST live tick used to select
// nothing, which the server answers with fail-open (everything), so the tap
// appeared to do nothing (D-69). In the two single-edition countries the
// pre-v0.62.700 build returned a blank screen instead. Both are wrong answers
// to a question that should not be askable, so the state is made unreachable.
describe('soleCheckedKey — the last tick is locked (O-131)', () => {
  const KEYS = buildMichelinKeys(["'26", "'25"]);   // year2026, year2025, bib
  const allLive = () => true;

  it('locks nothing while more than one tick is checked', () => {
    expect(soleCheckedKey(KEYS, {}, allLive)).toBeNull();
    expect(soleCheckedKey(KEYS, { year2026: false }, allLive)).toBeNull();
  });

  it('locks the survivor when exactly one is left', () => {
    expect(soleCheckedKey(KEYS, { year2026: false, year2025: false }, allLive)).toBe('bib');
    expect(soleCheckedKey(KEYS, { year2026: false, bib: false }, allLive)).toBe('year2025');
    expect(soleCheckedKey(KEYS, { year2025: false, bib: false }, allLive)).toBe('year2026');
  });

  it('counts only LIVE ticks — the Singapore case that produced the blank screen', () => {
    // SG: 2026 has no holders, so it is greyed and cannot be the survivor.
    // Unticking 2025 must therefore lock Bib, not leave 2026 as a phantom
    // second option — which is exactly how the old code reached zero results.
    const sgLive = (token) => token === "'25";
    expect(soleCheckedKey(KEYS, { year2025: false }, sgLive)).toBe('bib');
    expect(soleCheckedKey(KEYS, { bib: false }, sgLive)).toBe('year2025');
    expect(soleCheckedKey(KEYS, {}, sgLive)).toBeNull();
  });

  it('locks nothing when everything is already off (a stale hash)', () => {
    // Not the UI's job to repair a hand-crafted URL — the server's fail-open
    // guard still covers that, which is what its own comment says it is for.
    expect(soleCheckedKey(KEYS, { year2026: false, year2025: false, bib: false }, allLive)).toBeNull();
  });

  it('scales to an edition that does not exist yet', () => {
    const keys = buildMichelinKeys(["'27", "'26", "'25"]);
    expect(soleCheckedKey(keys, { year2026: false, year2025: false, bib: false }, allLive)).toBe('year2027');
  });

  it('handles junk input without throwing', () => {
    expect(soleCheckedKey(null, null, null)).toBeNull();
    expect(soleCheckedKey([], {}, allLive)).toBeNull();
  });
});
