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
    ).toThrow(/Tokyo 2026 "one-star" — expected 999, got 122/);
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

  it('KNOWN_DELTAS is EMPTY, and empty because the data reconciles', () => {
    // v0.62.771 — the last entry (JP/Tokyo one-star) closed. This test used to
    // name the gaps; naming none of them is now the assertion.
    //
    // The danger in an empty list is that it can be emptied two ways: by the
    // data reconciling, or by someone deleting rows from the list. Those look
    // identical from here, so BOTH are asserted — `computed`, built above by
    // walking every published figure against the repo, must also be empty.
    // Without that second line this test would pass on a file whose
    // KNOWN_DELTAS array had simply been truncated.
    expect(KNOWN_DELTAS).toEqual([]);
    expect([...new Set(computed)]).toEqual([]);
  });

  it('the cities that closed stay closed', () => {
    const keys = KNOWN_DELTAS.map((d) => `${d.cc}/${d.city}`);
    expect(keys).not.toContain('JP/Tokyo');
    expect(keys).not.toContain('FR/Paris');
    expect(keys).not.toContain('CN/Shenzhen');
    expect(keys).not.toContain('CN/Guangzhou');
    // Kept for the day a delta returns: any future entry still needs a note
    // that says something.
    for (const d of KNOWN_DELTAS) expect(d.note.length).toBeGreaterThan(40);
  });

  it('cities that DO reconcile are not listed as deltas', () => {
    // Kyoto and Osaka match their published 2026 figures exactly; if a future
    // edit broke them, the first test would catch it — this asserts they are
    // clean today so that test is not passing vacuously. Guangzhou joined them
    // in v0.62.757 (3 / 17 / 52) and Shenzhen in v0.62.768 (2 / 5 / 21).
    for (const [cc, city] of [['JP', 'Kyoto'], ['JP', 'Osaka'], ['CN', 'Guangzhou'], ['CN', 'Shenzhen']]) {
      const have = repoCounts(cc, city, 2026);
      const pub = PUBLISHED_2026[cc][city];
      for (const tier of TIERS) {
        if (pub[tier] === undefined) continue;
        expect(have[tier] || 0, `${city} ${tier}`).toBe(pub[tier]);
      }
    }
  });

  // ── the narrowed empty-address invariant ────────────────────────────────
  // Until v0.62.757 every one of 1,977 venues had a non-empty address, so
  // "address is never empty" held universally without anyone asserting it.
  // Adding 7 Guangzhou Bib rows with no findable address broke that. Rather
  // than lose the invariant, it is narrowed and PINNED: exactly these ids may
  // have an empty address, and an eighth address-less row anywhere fails here.
  // v0.62.768 — rebuilt, and it moved in BOTH directions, which is the whole
  // reason it is pinned by id rather than counted.
  //   OUT: cn-szx-jie-yang-lao-er-guo-tiao-tang and
  //        cn-szx-xiao-long-niu-rou-mian-futian gained real addresses from the
  //        Shenzhen Bib source. The "shrinks only downward" test below FAILED
  //        on them until they were un-pinned — the assertion doing its job, not
  //        a nuisance to route around.
  //   IN:  13 of the 15 new Shenzhen Bib rows, which have no fetchable address.
  // Net 16 → 27. Guangzhou's 7 are unchanged.
  const ADDRESS_DEBT = [
    'cn-can-baode-dunhe-road',
    'cn-can-e-qian-ya-hou',
    'cn-can-ru-yi-chuan-tong-zhu-sheng-mian',
    'cn-can-si-mao-cai-guan',
    'cn-can-tai-shan-lao-biao-xian-tang-yuan-xihua-road',
    'cn-can-wuchuan-hao-wei-lai',
    'cn-can-yu-yuen',
    'cn-szx-3-hao-ma-tou',
    'cn-szx-chao-shang-chao',
    'cn-szx-cui-hu',
    'cn-szx-da-tang-liang-tang',
    'cn-szx-fa-ji-shao-e-mei-shi',
    'cn-szx-fumee',
    'cn-szx-gao-san-jie-dou-hua-dian',
    'cn-szx-ge-ji-mei-ji-xian',
    'cn-szx-hua-zhou-b-ji-fan-dian',
    'cn-szx-hui-chao-zhou',
    'cn-szx-jiu-jiu-noodle',
    'cn-szx-lu-liang-shou',
    'cn-szx-tai-shan-lao-huang-shan-fan',
    'cn-szx-xiao-fu-rong-can-ting',
    'cn-szx-xiao-zhuo-yan',
    'cn-szx-xin-hu-cun-cu-rou-longhua-jianshe-road',
    'cn-szx-xin-ji-ke-jia-wei-dao',
    'cn-szx-xin-rong-ji',
    'cn-szx-xing-ning-ke-jia-cai-guan',
    'cn-szx-yuan-sheng-tai',
  ];

  // v0.62.770 — the FR debt is kept SEPARATE from the CN one, because the two
  // are different in kind and a single flat list of 128 ids would hide that:
  //   CN — individual venues whose street address was not findable. No postal
  //        either. Each one is a distinct piece of missing curation.
  //   FR — the whole Paris 2026 star roster, curated from a source that gives
  //        the arrondissement and nothing finer. Every row carries a 
  //        (750NN) instead, and that is ASSERTED below, so "no address" here
  //        means something different from "no address" above.
  const ADDRESS_DEBT_FR = [
    'fr-par-114-faubourg',
    'fr-par-accents-table-bourse',
    'fr-par-agape',
    'fr-par-aida',
    'fr-par-akrame',
    'fr-par-alan-geaam',
    'fr-par-aldehyde',
    'fr-par-amalia',
    'fr-par-anne',
    'fr-par-anona',
    'fr-par-apicius',
    'fr-par-armani-ristorante',
    'fr-par-astrance',
    'fr-par-at',
    'fr-par-auguste',
    'fr-par-automne',
    'fr-par-baieta',
    'fr-par-bellefeuille-saint-james-paris',
    'fr-par-chakaiseki-akiyoshi',
    'fr-par-comice',
    'fr-par-contraste',
    'fr-par-datil',
    'fr-par-divellec',
    'fr-par-don-juan-ii',
    'fr-par-episodes',
    'fr-par-es',
    'fr-par-espadon',
    'fr-par-fief',
    'fr-par-fleur-de-pave',
    'fr-par-frederic-simonin',
    'fr-par-frenchie',
    'fr-par-galanga',
    'fr-par-gaya',
    'fr-par-geoelia',
    'fr-par-geosmine',
    'fr-par-granite',
    'fr-par-hanada',
    'fr-par-heritages',
    'fr-par-il-carpaccio',
    'fr-par-imperial-treasure',
    'fr-par-irwin',
    'fr-par-jacques-faussat',
    'fr-par-jean-imbert-au-plaza-athenee',
    'fr-par-jin',
    'fr-par-l-archeste',
    'fr-par-l-arome',
    'fr-par-l-atelier-de-joel-robuchon-etoile',
    'fr-par-la-grande-cascade',
    'fr-par-la-scene-theleme',
    'fr-par-lasserre',
    'fr-par-le-baudelaire',
    'fr-par-le-faham',
    'fr-par-le-george',
    'fr-par-le-sergent-recruteur',
    'fr-par-le-tout-paris',
    'fr-par-le-violon-d-ingres',
    'fr-par-lucas-carton',
    'fr-par-maison-dubois',
    'fr-par-maison-ruggieri-palais-royal',
    'fr-par-mallory-gabsi',
    'fr-par-mavrommatis',
    'fr-par-monsieur-dior-by-yannick-alleno',
    'fr-par-mosuke',
    'fr-par-nakatani',
    'fr-par-neige-d-ete',
    'fr-par-neso',
    'fr-par-nhome',
    'fr-par-nomicos',
    'fr-par-omar-dhiab',
    'fr-par-onor',
    'fr-par-origines-restaurant',
    'fr-par-ortensia',
    'fr-par-oxte',
    'fr-par-pages',
    'fr-par-pantagruel',
    'fr-par-pavyllon',
    'fr-par-pertinence',
    'fr-par-pilgrim',
    'fr-par-prevelle',
    'fr-par-pur',
    'fr-par-qui-plume-la-lune',
    'fr-par-quinsou',
    'fr-par-relais-louis-xiii',
    'fr-par-restaurant-h',
    'fr-par-restaurant-le-meurice-alain-ducasse',
    'fr-par-septime',
    'fr-par-shabour',
    'fr-par-sola',
    'fr-par-solstice',
    'fr-par-substance',
    'fr-par-sushi-b',
    'fr-par-sushi-shunei',
    'fr-par-sushi-yoshinaga',
    'fr-par-table',
    'fr-par-tomy-co',
    'fr-par-tour-d-argent',
    'fr-par-trente-trois',
    'fr-par-vaisseau',
    'fr-par-yoshinori',
    'fr-par-ze-kitchen-galerie',
    'fr-par-zostera',
  ];

  it('every FR debt row carries a postal instead — the distinction is real', () => {
    // Without this the FR list would just be a bigger version of the CN one.
    const byId = new Map(md.VENUES.map((v) => [v.id, v]));
    for (const id of ADDRESS_DEBT_FR) {
      const v = byId.get(id);
      expect(v, `${id} is pinned but missing`).toBeTruthy();
      expect(v.country).toBe('FR');
      expect(v.postal, `${id} has neither address nor postal`).toMatch(/^750\d{2}$/);
    }
  });

  it('no CN debt row has a postal — the two lists do not blur', () => {
    const byId = new Map(md.VENUES.map((v) => [v.id, v]));
    for (const id of ADDRESS_DEBT) expect(byId.get(id).postal).toBeFalsy();
  });

  it('no venue has an empty address except the 128 pinned rows', () => {
    const empty = md.VENUES.filter((v) => !v.address || !v.address.trim()).map((v) => v.id).sort();
    expect(empty).toEqual([...ADDRESS_DEBT, ...ADDRESS_DEBT_FR].sort());
  });

  it('the debt shrinks only downward — filling an address needs this list edited', () => {
    // The pair of assertions is deliberate. The test above fails if a NEW
    // address-less row appears; this one fails if a pinned row is FILLED and
    // the list is not trimmed, so the debt cannot quietly outlive the problem.
    const byId = new Map(md.VENUES.map((v) => [v.id, v]));
    for (const id of [...ADDRESS_DEBT, ...ADDRESS_DEBT_FR]) {
      const v = byId.get(id);
      expect(v, `${id} is pinned as address-less but no longer exists`).toBeTruthy();
      expect(v.address, `${id} now HAS an address — remove it from the debt list`).toBe('');
      expect(['Guangzhou', 'Shenzhen', 'Paris']).toContain(v.city);
    }
  });
});
