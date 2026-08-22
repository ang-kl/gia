import { describe, it, expect } from 'vitest';

const { CITY_MANIFEST, PUBLISHED_2026, KNOWN_DELTAS, assertCityManifest } =
  require('../michelin-city-manifest.js');
const md = require('../michelin-data.js');

const TIERS = ['three-star', 'two-star', 'one-star', 'bib-gourmand'];

function repoCounts(cc, city, year) {
  const out = {};
  for (const v of md.VENUES) {
    if (String(v.country).toUpperCase() !== cc || v.city !== city) continue;
    for (const a of v.awards) if (a.year === year) out[a.category] = (out[a.category] || 0) + 1;
  }
  return out;
}

describe('per-city manifest', () => {
  it('locks every city that has venues', () => {
    for (const v of md.VENUES) {
      const cc = String(v.country).toUpperCase();
      if (!CITY_MANIFEST[cc]) continue;            // country not city-locked yet
      expect(CITY_MANIFEST[cc][v.city], `${cc} ${v.city} unlocked`).toBeTruthy();
    }
  });

  it('the assertion can actually fire', () => {
    const jp = md.VENUES.filter((v) => v.country === 'JP');
    expect(() =>
      assertCityManifest('JP', jp, 'negative-control', { Tokyo: { 2026: { 'one-star': 999 } } }),
    ).toThrow(/Tokyo 2026 "one-star" — expected 999, got 121/);
  });

  it('fires when a city appears with no manifest entry', () => {
    const fake = [{ country: 'JP', city: 'Sapporo', name: 'X', awards: [{ year: 2026, category: 'one-star' }] }];
    expect(() => assertCityManifest('JP', fake, 'negative-control', { Tokyo: {} }))
      .toThrow(/Sapporo/);
  });
});

// The gap between "what we hold" and "what MICHELIN published" is the point of
// the file. This test pins that gap EXACTLY: a new disagreement cannot appear
// unnoticed, and a fixed one cannot linger as a stale excuse.
describe('published-figure deltas', () => {
  const computed = [];
  for (const [cc, cities] of Object.entries(PUBLISHED_2026)) {
    for (const [city, pub] of Object.entries(cities)) {
      const have = repoCounts(cc, city, 2026);
      for (const tier of TIERS) {
        if (pub[tier] === undefined) continue;
        if ((have[tier] || 0) !== pub[tier]) computed.push(`${cc}/${city}/${tier}`);
      }
      // a city MICHELIN published that the repo has nothing for at all
      if (!Object.keys(have).length) computed.push(`${cc}/${city}/*`);
    }
  }

  it('every disagreement is documented in KNOWN_DELTAS', () => {
    const documented = new Set(
      KNOWN_DELTAS.map((d) => `${d.cc}/${d.city}/${d.tier}`),
    );
    const undocumented = [...new Set(computed)].filter((k) => {
      const [cc, city] = k.split('/');
      return !documented.has(k) && !documented.has(`${cc}/${city}/*`);
    });
    expect(undocumented).toEqual([]);
  });

  it('every documented delta is still real — no stale excuses', () => {
    for (const d of KNOWN_DELTAS) {
      const have = repoCounts(d.cc, d.city, d.year);
      if (d.tier === '*') {
        expect(Object.keys(have).length, `${d.cc}/${d.city} is no longer empty — clear this delta`).toBe(0);
      } else {
        expect(have[d.tier] || 0, `${d.cc}/${d.city} ${d.tier} now matches — clear this delta`).toBe(d.have);
      }
    }
  });

  it('names the three known gaps', () => {
    const keys = KNOWN_DELTAS.map((d) => `${d.cc}/${d.city}`);
    expect(keys).toContain('JP/Tokyo');       // one one-star short of 122
    expect(keys).toContain('CN/Guangzhou');   // stale at the 2025 edition
    expect(keys).toContain('CN/Shenzhen');    // absent; debuted 18 Aug 2026
    for (const d of KNOWN_DELTAS) expect(d.note.length).toBeGreaterThan(40);
  });

  it('cities that DO reconcile are not listed as deltas', () => {
    // Kyoto and Osaka match their published 2026 figures exactly; if a future
    // edit broke them, the first test would catch it — this asserts they are
    // clean today so that test is not passing vacuously.
    for (const city of ['Kyoto', 'Osaka']) {
      const have = repoCounts('JP', city, 2026);
      const pub = PUBLISHED_2026.JP[city];
      for (const tier of TIERS) {
        if (pub[tier] === undefined) continue;
        expect(have[tier] || 0, `${city} ${tier}`).toBe(pub[tier]);
      }
    }
  });
});
