// michelin-my-2027.test.js — v0.62.982
//
// Spec: doc/Feature/2026-11-08-michelin-my-2027.spec.md (Invariants I1-I5).
// The MICHELIN Guide Kuala Lumpur & Penang 2027 (announced 04-11 '26):
// 1 two-star, 9 one-star, 60 Bib Gourmand = 70 awards; KL 1/7/26, George Town
// 0/2/34. And the one code change it needs: "dropped" is judged against the
// venue's OWN country's latest edition, because no other guide has a 2027 yet.

import { describe, it, expect } from 'vitest';

const data = require('../michelin-data.js');
const { CITY_MANIFEST } = require('../michelin-city-manifest.js');

function tiers(cc, year, city) {
  const t = {};
  for (const v of data.venuesForCountry(cc)) {
    if (city && v.city !== city) continue;
    for (const a of v.awards) if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
  }
  return t;
}

describe('I1 · Malaysia 2027 counts', () => {
  it('70 MY venues hold a 2027 award, tiers 1/9/60', () => {
    const y27 = data.venuesForYear(2027).filter((v) => v.country === 'MY');
    expect(y27.length).toBe(70);
    expect(tiers('MY', 2027)).toEqual({ 'two-star': 1, 'one-star': 9, 'bib-gourmand': 60 });
  });

  it('city split KL 1/7/26, George Town 0/2/34', () => {
    expect(tiers('MY', 2027, 'Kuala Lumpur')).toEqual({ 'two-star': 1, 'one-star': 7, 'bib-gourmand': 26 });
    expect(tiers('MY', 2027, 'George Town')).toEqual({ 'one-star': 2, 'bib-gourmand': 34 });
  });

  it('both manifests declare 2027, so a drifted row fails at load', () => {
    expect(data.COUNTRY_MANIFEST.MY[2027]).toEqual({ 'two-star': 1, 'one-star': 9, 'bib-gourmand': 60, total: 70 });
    expect(CITY_MANIFEST.MY['Kuala Lumpur'][2027]).toEqual({ 'two-star': 1, 'one-star': 7, 'bib-gourmand': 26 });
    expect(CITY_MANIFEST.MY['George Town'][2027]).toEqual({ 'one-star': 2, 'bib-gourmand': 34 });
  });

  it('2025 and 2026 are unchanged (63 and 67)', () => {
    expect(data.venuesForYear(2025).filter((v) => v.country === 'MY').length).toBe(63);
    expect(data.venuesForYear(2026).filter((v) => v.country === 'MY').length).toBe(67);
  });

  it('the four new rows debut in 2027 at the right tier', () => {
    const want = {
      'my-kul-potager': ['Kuala Lumpur', 'one-star'],
      'my-kul-7-chai-ipoh-hor-fun': ['Kuala Lumpur', 'bib-gourmand'],
      'my-kul-minji-bak-kut-teh': ['Kuala Lumpur', 'bib-gourmand'],
      'my-pen-lemon-koay-teow-soup': ['George Town', 'bib-gourmand'],
    };
    for (const [id, [city, cat]] of Object.entries(want)) {
      const v = data.venueById(id);
      expect(v, id).not.toBeNull();
      expect(v.city).toBe(city);
      expect(v.awards).toEqual([{ year: 2027, category: cat }]);
      expect(v.status).toBe('open');
    }
  });

  it('Dewakan keeps two stars in 2027', () => {
    expect(data.categoryForYear(data.venueById('my-kul-dewakan'), 2027)).toBe('two-star');
  });
});

describe('I3 · lapsed awards stay as history', () => {
  it('Heun Kee and Ah Boy keep 2025 + 2026, have no 2027', () => {
    for (const id of ['my-kul-heun-kee-claypot-chicken-rice-pudu', 'my-pen-ah-boy-koay-teow-th-ng']) {
      const v = data.venueById(id);
      expect(v.awards.map((a) => a.year)).toEqual([2025, 2026]);
    }
  });

  it('Serabai Istimewa holds 2025 and 2027 but not 2026', () => {
    const v = data.venueById('my-pen-serabai-istimewa');
    expect(v.awards.map((a) => a.year)).toEqual([2025, 2027]);
    expect(data.retainedAwardYears(v)).toEqual(["'27", "'25"]);
  });
});

describe('I2 · dropped is judged per country', () => {
  it('latest edition: MY 2027, other guides 2026', () => {
    expect(data.latestEditionYear('MY')).toBe(2027);
    for (const cc of ['TH', 'TW', 'JP', 'VN', 'PH']) expect(data.latestEditionYear(cc)).toBe(2026);
  });

  it('Ah Boy and Heun Kee are droppedAfter 2026', () => {
    expect(data.awardsDiff(data.venueById('my-pen-ah-boy-koay-teow-th-ng')).droppedAfter).toBe(2026);
    expect(data.awardsDiff(data.venueById('my-kul-heun-kee-claypot-chicken-rice-pudu')).droppedAfter).toBe(2026);
  });

  it('a continuing MY venue is not dropped', () => {
    expect(data.awardsDiff(data.venueById('my-kul-dewakan')).droppedAfter).toBeUndefined();
  });

  it('no TH, TW or JP venue current in 2026 reads as dropped', () => {
    for (const cc of ['TH', 'TW', 'JP']) {
      const current = data.venuesForCountry(cc).filter(
        (v) => v.status === 'open' && v.awards.some((a) => a.year === 2026)
      );
      expect(current.length).toBeGreaterThan(0);
      const dropped = current.filter((v) => data.awardsDiff(v).droppedAfter !== undefined);
      expect(dropped.map((v) => v.id)).toEqual([]);
    }
  });

  it('an explicit latestEdition overrides the country lookup', () => {
    const v = data.venueById('my-pen-ah-boy-koay-teow-th-ng');
    expect(data.awardsDiff(v, 2026).droppedAfter).toBeUndefined();
  });
});

describe('I4 · 2027 is a valid year; the message is built from VALID_YEARS', () => {
  const base = {
    id: 'my-kul-test-x', name: 'Test X', address: '', city: 'Kuala Lumpur', country: 'MY',
    status: 'open', vegetarian: false, halal: false,
  };
  it('accepts 2027, rejects 2028 naming 2025, 2026 and 2027', () => {
    expect(data.VALID_YEARS.has(2027)).toBe(true);
    expect(() => data.validateVenue({ ...base, awards: [{ year: 2027, category: 'one-star' }] })).not.toThrow();
    expect(() => data.validateVenue({ ...base, awards: [{ year: 2028, category: 'one-star' }] }))
      .toThrow(/2025, 2026 or 2027/);
  });
});

describe('I5 · the 2027 tick is live for Malaysia only', () => {
  function yearsFor(cc) {
    const ys = new Set();
    for (const v of data.visitableVenues().filter((x) => x.country === cc)) {
      for (const y of data.retainedAwardYears(v) || []) ys.add(y);
    }
    return ys;
  }
  it("MY offers '27; TH, TW and JP do not", () => {
    expect(yearsFor('MY').has("'27")).toBe(true);
    for (const cc of ['TH', 'TW', 'JP']) expect(yearsFor(cc).has("'27")).toBe(false);
  });
});
