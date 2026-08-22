import { describe, it, expect } from 'vitest';

const md = require('../michelin-data.js');

// The MICHELIN Green Star is a SUSTAINABILITY distinction, not a rung on the
// star ladder — a venue may hold three Stars and a Green Star in the same
// edition, or a Green Star and a Bib Gourmand and nothing else. It is
// therefore a parallel field (`greenStarYears`), not an `awards[].category`.
//
// Both failures a category would have caused are silent, which is why they are
// pinned here rather than trusted:
//   1. `_venueToFlatRows` emits one flat row PER AWARD, so a starred venue
//      that also held a Green Star would appear TWICE in every flat view.
//   2. the manifest `total` counts award rows, so it would grow by the number
//      of Green Stars without any tier changing.
describe('MICHELIN Green Star', () => {
  it('is not an award category', () => {
    expect([...md.CATEGORIES]).toEqual(
      expect.arrayContaining(['three-star', 'two-star', 'one-star', 'bib-gourmand']),
    );
    expect(md.CATEGORIES.has('green-star')).toBe(false);
  });

  it('is carried on venues that really hold one', () => {
    const gs = md.greenStarVenues(2026);
    expect(gs.length).toBeGreaterThan(0);
    for (const v of gs) expect(md.greenStarYears(v)).toContain(2026);
  });

  it('spans several award tiers — which is the whole reason it is parallel', () => {
    const tiers = new Set();
    for (const v of md.greenStarVenues(2026)) {
      for (const a of v.awards) if (a.year === 2026) tiers.add(a.category);
    }
    // If Green Star were a tier, the Bib Gourmand holder below would be listed
    // twice in the flat views. Assert the mix is real so the point cannot rot.
    expect(tiers.size).toBeGreaterThan(1);
  });

  it('does NOT double-list a Green Star venue in the flat view', () => {
    for (const v of md.greenStarVenues(2026)) {
      const rows = md.ALL.filter((r) => r.name === v.name && r.year === 2026);
      // one flat row per AWARD in that year — never an extra one for the star
      const awards2026 = v.awards.filter((a) => a.year === 2026).length;
      expect(rows.length).toBe(awards2026);
    }
  });

  it('is excluded from the manifest total', () => {
    const hk = md.COUNTRY_MANIFEST.HK && md.COUNTRY_MANIFEST.HK[2026];
    expect(hk['green-star']).toBeGreaterThan(0);
    const tierSum = Object.entries(hk)
      .filter(([k]) => k !== 'total' && k !== 'green-star')
      .reduce((n, [, v]) => n + v, 0);
    expect(tierSum).toBe(hk.total);
  });

  it('rejects a malformed greenStarYears', () => {
    const base = {
      id: 'x-y-z', name: 'X', address: '', city: 'Hong Kong', country: 'HK',
      status: 'open', vegetarian: false, halal: false,
      awards: [{ year: 2026, category: 'one-star' }],
    };
    // sanity: the fixture is valid WITHOUT the field, so each throw below is
    // caused by greenStarYears and not by something else in the venue.
    expect(md.validateVenue({ ...base }, 't')).toBe(true);
    expect(md.validateVenue({ ...base, greenStarYears: [2026] }, 't')).toBe(true);
    expect(() => md.validateVenue({ ...base, greenStarYears: 2026 }, 't')).toThrow(/must be an array/);
    expect(() => md.validateVenue({ ...base, greenStarYears: [1999] }, 't')).toThrow(/valid edition year/);
    expect(() => md.validateVenue({ ...base, greenStarYears: [2026, 2026] }, 't')).toThrow(/duplicate years/);
  });

  it('the manifest check can actually fire', () => {
    const venues = md.greenStarVenues(2026).slice(0, 1);
    expect(() =>
      md.assertManifest('HK', venues, 'negative-control', { 2026: { 'green-star': 99 } }),
    ).toThrow(/green-star/);
  });
});
