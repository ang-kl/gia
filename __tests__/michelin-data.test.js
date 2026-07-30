// __tests__/michelin-data.test.js — v0.61.333
//
// Validates the venue-centric Michelin loader (venue-award-schema.v0_1).
//
// As of v0.61.333 the loader is VENUE-CENTRIC ONLY and no longer ingests
// the Singapore flat dataset (SG lives standalone in SG-michelin.js on its
// own fast path). This suite therefore covers:
//   - the real MY-michelin.js load (63@2025 / 67@2026 / awards-sum 130),
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

describe('michelin-data — Japan (JP-michelin.js) load', () => {
  const JP_CITIES = ['Tokyo', 'Kyoto', 'Osaka', 'Nara'];

  it('loads 589 venues with sum(awards) === 673', () => {
    const jp = data.venuesForCountry('JP');
    expect(jp.length).toBe(589);
    const sum = jp.reduce((n, v) => n + v.awards.length, 0);
    expect(sum).toBe(673);
  });

  it('85 venues hold a 2025 award, 588 hold a 2026 award (2025 is partial)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'JP');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'JP');
    expect(y25.length).toBe(85);
    expect(y26.length).toBe(588);
  });

  it('matches the per-tier manifest for both editions (2025 has no Bib Gourmand)', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('JP')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'three-star': 20, 'two-star': 57, 'one-star': 8 });
    expect(tiers(2026)).toEqual({ 'three-star': 21, 'two-star': 61, 'one-star': 278, 'bib-gourmand': 228 });
  });

  it('every JP venue has a unique id, a curated city, and the full venue shape', () => {
    const jp = data.venuesForCountry('JP');
    const ids = new Set(jp.map((v) => v.id));
    expect(ids.size).toBe(jp.length);          // no dup ids
    for (const v of jp) {
      expect(v.id.startsWith('jp-')).toBe(true);
      expect(JP_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('JP');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries Gion Sasaki as a 3-star both editions; SÉZANNE keeps its diacritic + closed status', () => {
    const sasaki = data.venueById('jp-uky-gion-sasaki');
    expect(sasaki).not.toBeNull();
    expect(sasaki.name).toBe('Gion Sasaki');
    expect(data.categoryForYear(sasaki, 2025)).toBe('three-star');
    expect(data.categoryForYear(sasaki, 2026)).toBe('three-star');
    const sez = data.venueById('jp-tyo-sezanne');
    expect(sez).not.toBeNull();
    expect(sez.name).toBe('SÉZANNE');
    expect(sez.status).toBe('closed');
  });

  it('stores native Japanese name + address verbatim in the source file (kanji preserved)', () => {
    // venueToVenue projects nameJa/addressJa OUT (store-now, display-later) —
    // assert preservation against the source table, not the loaded Venue.
    const src = require('../JP-michelin.js').ENTRIES;
    expect(src.length).toBe(589);
    const sasaki = src.find((e) => e.id === 'jp-uky-gion-sasaki');
    expect(sasaki.nameJa).toBe('祇園 さゝ木');
    expect(sasaki.addressJa).toContain('京都市東山区');
    expect(src.every((e) => typeof e.nameJa === 'string' && typeof e.addressJa === 'string')).toBe(true);
  });
});

describe('michelin-data — South Korea (KR-michelin.js) load', () => {
  const KR_CITIES = ['Seoul', 'Busan'];

  it('loads 117 venues with sum(awards) === 127', () => {
    const kr = data.venuesForCountry('KR');
    expect(kr.length).toBe(117);
    expect(kr.reduce((n, v) => n + v.awards.length, 0)).toBe(127);
  });

  it('10 venues hold a 2025 award, 117 hold a 2026 award (2025 is partial)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'KR');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'KR');
    expect(y25.length).toBe(10);
    expect(y26.length).toBe(117);
  });

  it('matches the per-tier manifest for both editions (2025 has no Bib Gourmand)', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('KR')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'three-star': 1, 'two-star': 8, 'one-star': 1 });
    expect(tiers(2026)).toEqual({ 'three-star': 1, 'two-star': 10, 'one-star': 35, 'bib-gourmand': 71 });
  });

  it('every KR venue has a unique id, a curated city, and the full venue shape', () => {
    const kr = data.venuesForCountry('KR');
    expect(new Set(kr.map((v) => v.id)).size).toBe(kr.length);
    for (const v of kr) {
      expect(v.id.startsWith('kr-')).toBe(true);
      expect(KR_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('KR');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries Mingles as the 3-star both editions; Busan venues resolve', () => {
    const mingles = data.venueById('kr-sel-mingles');
    expect(mingles).not.toBeNull();
    expect(mingles.name).toBe('Mingles');
    expect(data.categoryForYear(mingles, 2025)).toBe('three-star');
    expect(data.categoryForYear(mingles, 2026)).toBe('three-star');
    const busan = data.venuesForCountry('KR').filter((v) => v.city === 'Busan');
    expect(busan.length).toBe(24);
  });

  it('stores native Korean name + address verbatim in the source file (hangul preserved)', () => {
    const src = require('../KR-michelin.js').ENTRIES;
    expect(src.length).toBe(117);
    const mingles = src.find((e) => e.id === 'kr-sel-mingles');
    expect(mingles.nameKo).toBe('밍글스');
    expect(mingles.addressKo).toContain('강남구');
    expect(src.every((e) => typeof e.nameKo === 'string' && typeof e.addressKo === 'string')).toBe(true);
  });
});

describe('michelin-data — Taiwan (TW-michelin.js) load', () => {
  const TW_CITIES = ['Taipei', 'New Taipei', 'Taichung', 'Tainan', 'Kaohsiung', 'Hsinchu City', 'Hsinchu County'];

  it('loads 219 venues with sum(awards) === 403 (196 in 2025 + 207 in 2026)', () => {
    const tw = data.venuesForCountry('TW');
    expect(tw.length).toBe(219);
    expect(tw.reduce((n, v) => n + v.awards.length, 0)).toBe(403);
  });

  it('196 venues hold a 2025 award, 207 hold a 2026 award', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'TW');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'TW');
    expect(y25.length).toBe(196);
    expect(y26.length).toBe(207);
  });

  it('matches the per-tier 2025 manifest', () => {
    const t = {};
    for (const v of data.venuesForCountry('TW')) {
      for (const a of v.awards) {
        if (a.year === 2025) t[a.category] = (t[a.category] || 0) + 1;
      }
    }
    expect(t).toEqual({ 'three-star': 3, 'two-star': 7, 'one-star': 43, 'bib-gourmand': 143 });
  });

  it('matches the per-tier 2026 manifest', () => {
    const t = {};
    for (const v of data.venuesForCountry('TW')) {
      for (const a of v.awards) {
        if (a.year === 2026) t[a.category] = (t[a.category] || 0) + 1;
      }
    }
    expect(t).toEqual({ 'three-star': 3, 'two-star': 9, 'one-star': 49, 'bib-gourmand': 146 });
  });

  it('every TW venue has a unique id, a curated city, and the full venue shape', () => {
    const tw = data.venuesForCountry('TW');
    expect(new Set(tw.map((v) => v.id)).size).toBe(tw.length);
    for (const v of tw) {
      expect(v.id.startsWith('tw-')).toBe(true);
      // city must resolve in CITY_IATA — incl. the 3 freshly-added keys
      // (New Taipei, Hsinchu City, Hsinchu County).
      expect(TW_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('TW');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries JL STUDIO as a three-star retained across 2025+2026 and resolves the freshly-added cities', () => {
    const jl = data.venueById('tw-txg-jl-studio');
    expect(jl).not.toBeNull();
    expect(jl.name).toBe('JL STUDIO');
    expect(data.categoryForYear(jl, 2025)).toBe('three-star');
    expect(data.categoryForYear(jl, 2026)).toBe('three-star');
    // venues in the 3 newly-mapped cities load (would throw pre-fix).
    expect(data.venuesForCountry('TW').some((v) => v.city === 'New Taipei')).toBe(true);
    expect(data.venuesForCountry('TW').some((v) => v.city === 'Hsinchu County')).toBe(true);
  });

  it('NOBUO is promoted one-star (2025) → two-star (2026)', () => {
    const nobuo = data.venueById('tw-tpe-nobuo');
    expect(nobuo).not.toBeNull();
    expect(data.categoryForYear(nobuo, 2025)).toBe('one-star');
    expect(data.categoryForYear(nobuo, 2026)).toBe('two-star');
    expect(data.retainedAwardYears(nobuo)).toEqual(["'26"]);
  });

  it('Fleur de Sel and Paris 1930 de Hideki Takayama are 2025-only (dropped in 2026)', () => {
    const fleurDeSel = data.venueById('tw-txg-fleur-de-sel');
    const paris1930 = data.venueById('tw-tpe-paris-1930-de-hideki-takayama');
    for (const v of [fleurDeSel, paris1930]) {
      expect(v).not.toBeNull();
      expect(v.awards.map((a) => a.year)).toEqual([2025]);
      expect(data.awardsDiff(v).droppedAfter).toBe(2025);
    }
  });

  it('Mizue debuts directly at two-star; YuDao and Sushi An debut at one-star (2026-only)', () => {
    const mizue = data.venueById('tw-tpe-mizue');
    const yudao = data.venueById('tw-tnn-yudao');
    const sushiAn = data.venueById('tw-hsinchu-county-sushi-an');
    expect(mizue).not.toBeNull();
    expect(mizue.awards).toEqual([{ year: 2026, category: 'two-star' }]);
    expect(yudao).not.toBeNull();
    expect(yudao.awards).toEqual([{ year: 2026, category: 'one-star' }]);
    expect(sushiAn).not.toBeNull();
    expect(sushiAn.awards).toEqual([{ year: 2026, category: 'one-star' }]);
  });

  it('10 identified Bib Gourmand venues are 2025-only (dropped in 2026)', () => {
    const droppedIds = [
      'tw-tpe-good-friend-cold-noodles', 'tw-tpe-mao-yuan',
      'tw-tpe-shin-yeh-taiwanese-delight-nangang', 'tw-tpe-xiao-ping-kitchen',
      'tw-tnn-bue-mi-lab', 'tw-tnn-dong-shang-taiwanese-seafood', 'tw-tnn-zhu-xin-ju',
      'tw-khh-cheng-tsung-duck-rice', 'tw-khh-mai-yen-shun', 'tw-khh-pale-jade-pavilion',
    ];
    for (const id of droppedIds) {
      const v = data.venueById(id);
      expect(v).not.toBeNull();
      expect(v.awards.map((a) => a.year)).toEqual([2025]);
      expect(data.categoryForYear(v, 2025)).toBe('bib-gourmand');
    }
  });

  it('13 new Bib Gourmand debuts are 2026-only, one per confirmed city', () => {
    const newIds = [
      'tw-tpe-ching-jiao', 'tw-tpe-open-smile', 'tw-tpe-toriaezu-curry', 'tw-tpe-yu-yu-1969',
      'tw-txg-don-moo', 'tw-hsinchu-county-ji-feng', 'tw-hsinchu-county-yi-ge-chui-fen',
      'tw-tnn-baa-wanli-goat', 'tw-tnn-chan-chi', 'tw-tnn-zhu-ji-dong-tsai-ya',
      'tw-new-taipei-abba-hakka', 'tw-new-taipei-bei-ya-duck-thick-soup',
      'tw-new-taipei-bitan-chiao-tou-goose',
    ];
    expect(newIds.length).toBe(13);
    for (const id of newIds) {
      const v = data.venueById(id);
      expect(v).not.toBeNull();
      expect(v.awards).toEqual([{ year: 2026, category: 'bib-gourmand' }]);
    }
  });

  it('2026 Bib Gourmand per-city totals match the official announcement exactly', () => {
    const byCity = {};
    for (const v of data.venuesForCountry('TW')) {
      if (data.categoryForYear(v, 2026) === 'bib-gourmand') byCity[v.city] = (byCity[v.city] || 0) + 1;
    }
    expect(byCity).toEqual({
      Taipei: 37, Tainan: 30, Taichung: 23, Kaohsiung: 21,
      'New Taipei': 18, 'Hsinchu County': 10, 'Hsinchu City': 7,
    });
  });
});

describe('michelin-data — Vietnam (VN-michelin.js) load', () => {
  const VN_CITIES = ['Ho Chi Minh City', 'Hanoi', 'Da Nang'];

  it('loads 83 venues with sum(awards) === 92', () => {
    const vn = data.venuesForCountry('VN');
    expect(vn.length).toBe(83);
    expect(vn.reduce((n, v) => n + v.awards.length, 0)).toBe(92);
  });

  it('9 venues hold a 2025 award, 83 hold a 2026 award (2025 is partial)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'VN');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'VN');
    expect(y25.length).toBe(9);
    expect(y26.length).toBe(83);
  });

  it('matches the per-tier manifest for both editions (one-star + Bib only)', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('VN')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'one-star': 9 });
    expect(tiers(2026)).toEqual({ 'one-star': 11, 'bib-gourmand': 72 });
  });

  it('every VN venue has a unique id, a curated city, and the full venue shape', () => {
    const vn = data.venuesForCountry('VN');
    expect(new Set(vn.map((v) => v.id)).size).toBe(vn.length);
    for (const v of vn) {
      expect(v.id.startsWith('vn-')).toBe(true);
      expect(VN_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('VN');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries La Maison 1888 as a one-star both editions; Da Nang resolves', () => {
    const lm = data.venueById('vn-dad-la-maison-1888');
    expect(lm).not.toBeNull();
    expect(lm.name).toBe('La Maison 1888');
    expect(data.categoryForYear(lm, 2025)).toBe('one-star');
    expect(data.categoryForYear(lm, 2026)).toBe('one-star');
    expect(data.venuesForCountry('VN').filter((v) => v.city === 'Da Nang').length).toBe(24);
  });
});

describe('michelin-data — Hong Kong (HK-michelin.js) load', () => {
  it('loads 147 venues with sum(awards) === 166', () => {
    const hk = data.venuesForCountry('HK');
    expect(hk.length).toBe(147);
    expect(hk.reduce((n, v) => n + v.awards.length, 0)).toBe(166);
  });

  it('19 venues hold a 2025 award, 147 hold a 2026 award (2025 is partial)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'HK');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'HK');
    expect(y25.length).toBe(19);
    expect(y26.length).toBe(147);
  });

  it('matches the per-tier manifest for both editions (2025 has no Bib Gourmand)', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('HK')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'three-star': 7, 'two-star': 11, 'one-star': 1 });
    expect(tiers(2026)).toEqual({ 'three-star': 7, 'two-star': 13, 'one-star': 57, 'bib-gourmand': 70 });
  });

  it('every HK venue has a unique id, the curated city, and the full venue shape', () => {
    const hk = data.venuesForCountry('HK');
    expect(new Set(hk.map((v) => v.id)).size).toBe(hk.length);
    for (const v of hk) {
      expect(v.id.startsWith('hk-')).toBe(true);
      expect(v.city).toBe('Hong Kong');
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBe('HKG');
      expect(v.country).toBe('HK');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries 8 1/2 Otto e Mezzo - Bombana as a 3-star both editions', () => {
    const b = data.venueById('hk-hkg-8-1-2-otto-e-mezzo-bombana');
    expect(b).not.toBeNull();
    expect(b.name).toBe('8 1/2 Otto e Mezzo - Bombana');
    expect(data.categoryForYear(b, 2025)).toBe('three-star');
    expect(data.categoryForYear(b, 2026)).toBe('three-star');
  });

  it('is Hong Kong only — Macau is a separate MO table, not in HK', () => {
    expect(data.venuesForCountry('HK').every((v) => v.country === 'HK' && v.city === 'Hong Kong')).toBe(true);
    // Macau lives in its own MO table now (loaded separately), never under HK.
    expect(data.venuesForCountry('HK').some((v) => v.city === 'Macau')).toBe(false);
  });
});

describe('michelin-data — Macau (MO-michelin.js) load', () => {
  it('loads 34 venues with sum(awards) === 42', () => {
    const mo = data.venuesForCountry('MO');
    expect(mo.length).toBe(34);
    expect(mo.reduce((n, v) => n + v.awards.length, 0)).toBe(42);
  });

  it('8 venues hold a 2025 award, 34 hold a 2026 award (2025 is partial)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'MO');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'MO');
    expect(y25.length).toBe(8);
    expect(y26.length).toBe(34);
  });

  it('matches the per-tier manifest for both editions (2025 = stars only)', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('MO')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'three-star': 2, 'two-star': 6 });
    expect(tiers(2026)).toEqual({ 'three-star': 2, 'two-star': 6, 'one-star': 13, 'bib-gourmand': 13 });
  });

  it('every MO venue has a unique id, the curated city, and the full venue shape', () => {
    const mo = data.venuesForCountry('MO');
    expect(new Set(mo.map((v) => v.id)).size).toBe(mo.length);
    for (const v of mo) {
      expect(v.id.startsWith('mo-')).toBe(true);
      expect(v.city).toBe('Macau');
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBe('MFM');
      expect(v.country).toBe('MO');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries Jade Dragon as a 3-star both editions', () => {
    const jd = data.venueById('mo-mfm-jade-dragon');
    expect(jd).not.toBeNull();
    expect(jd.name).toBe('Jade Dragon');
    expect(data.categoryForYear(jd, 2025)).toBe('three-star');
    expect(data.categoryForYear(jd, 2026)).toBe('three-star');
  });
});

describe('michelin-data — Philippines (PH-michelin.js) load', () => {
  const PH_CITIES = ['Makati - Metro Manila', 'Taguig - Metro Manila', 'Quezon - Metro Manila', 'Parañaque - Metro Manila', 'Manila - Metro Manila', 'Cebu', 'Cavite'];

  it('loads 34 venues with sum(awards) === 34 (2026-only)', () => {
    const ph = data.venuesForCountry('PH');
    expect(ph.length).toBe(34);
    expect(ph.reduce((n, v) => n + v.awards.length, 0)).toBe(34);
  });

  it('0 venues hold a 2025 award, 34 hold a 2026 award (2026-only edition)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'PH');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'PH');
    expect(y25.length).toBe(0);
    expect(y26.length).toBe(34);
  });

  it('matches the per-tier 2026 manifest (no three-star)', () => {
    const t = {};
    for (const v of data.venuesForCountry('PH')) {
      for (const a of v.awards) {
        if (a.year === 2026) t[a.category] = (t[a.category] || 0) + 1;
      }
    }
    expect(t).toEqual({ 'two-star': 1, 'one-star': 8, 'bib-gourmand': 25 });
  });

  it('every PH venue has a unique id, a curated city, and the full venue shape', () => {
    const ph = data.venuesForCountry('PH');
    expect(new Set(ph.map((v) => v.id)).size).toBe(ph.length);
    for (const v of ph) {
      expect(v.id.startsWith('ph-')).toBe(true);
      // city must resolve in CITY_IATA — incl. the compound "- Metro Manila"
      // labels and the ñ in "Parañaque".
      expect(PH_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('PH');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('carries Helm as a 2026 two-star and resolves the ñ + compound cities', () => {
    const helm = data.venueById('ph-mnl-helm');
    expect(helm).not.toBeNull();
    expect(helm.name).toBe('Helm');
    expect(data.categoryForYear(helm, 2026)).toBe('two-star');
    expect(data.CITY_IATA['parañaque - metro manila']).toBe('MNL');
    expect(data.venuesForCountry('PH').some((v) => v.city === 'Cebu')).toBe(true);
  });
});

describe('michelin-data — Mainland China (CN-michelin.js) load', () => {
  const CN_CITIES = ['Shanghai', 'Guangzhou', 'Beijing', 'Hangzhou', 'Chengdu', 'Xiamen', 'Nanjing', 'Taizhou', 'Suzhou', 'Fuzhou', 'Wenzhou', 'Quanzhou', 'Yangzhou', 'Changzhou', 'Ningde'];

  it('loads 475 venues with sum(awards) === 475', () => {
    const cn = data.venuesForCountry('CN');
    expect(cn.length).toBe(475);
    expect(cn.reduce((n, v) => n + v.awards.length, 0)).toBe(475);
  });

  it('64 venues hold a 2025 award, 411 hold a 2026 award (2025 is partial)', () => {
    const y25 = data.venuesForYear(2025).filter((v) => v.country === 'CN');
    const y26 = data.venuesForYear(2026).filter((v) => v.country === 'CN');
    expect(y25.length).toBe(64);
    expect(y26.length).toBe(411);
  });

  it('matches the per-tier manifest for both editions (2025 has no three-star)', () => {
    function tiers(year) {
      const t = {};
      for (const v of data.venuesForCountry('CN')) {
        for (const a of v.awards) {
          if (a.year === year) t[a.category] = (t[a.category] || 0) + 1;
        }
      }
      return t;
    }
    expect(tiers(2025)).toEqual({ 'two-star': 3, 'one-star': 17, 'bib-gourmand': 44 });
    expect(tiers(2026)).toEqual({ 'three-star': 3, 'two-star': 22, 'one-star': 104, 'bib-gourmand': 282 });
  });

  it('every CN venue has a unique id, a curated city, and the full venue shape', () => {
    const cn = data.venuesForCountry('CN');
    expect(new Set(cn.map((v) => v.id)).size).toBe(cn.length);
    for (const v of cn) {
      expect(v.id.startsWith('cn-')).toBe(true);
      expect(CN_CITIES).toContain(v.city);
      expect(data.CITY_IATA[v.city.toLowerCase()]).toBeTruthy();
      expect(v.country).toBe('CN');
      expect(typeof v.name).toBe('string');
      expect(typeof v.address).toBe('string');
      expect(typeof v.vegetarian).toBe('boolean');
      expect(typeof v.halal).toBe('boolean');
      expect(['open', 'closed']).toContain(v.status);
      expect(v.awards.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('stores native Chinese name + address verbatim; resolves the freshly-added cities', () => {
    const src = require('../CN-michelin.js').ENTRIES;
    expect(src.length).toBe(475);
    const chao = src.find((e) => e.id === 'cn-bjs-chao-shang-chao-chaoyang');
    expect(chao.nameZh).toBe('潮上潮 (朝阳)');
    expect(chao.addressZh).toContain('朝阳区');
    expect(src.every((e) => typeof e.nameZh === 'string' && typeof e.addressZh === 'string')).toBe(true);
    // venues in the 9 freshly-mapped cities load (would throw pre-fix).
    expect(data.venuesForCountry('CN').some((v) => v.city === 'Xiamen')).toBe(true);
    expect(data.venuesForCountry('CN').some((v) => v.city === 'Ningde')).toBe(true);
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

  it('is true where JP venues exist (country + curated cities)', () => {
    expect(data.hasMichelinData('JP')).toBe(true);
    expect(data.hasMichelinData('jp')).toBe(true);
    expect(data.hasMichelinData('Tokyo')).toBe(true);
    expect(data.hasMichelinData('Kyoto')).toBe(true);
    expect(data.hasMichelinData('Nara')).toBe(true);
  });

  it('is true where KR venues exist (country + curated cities)', () => {
    expect(data.hasMichelinData('KR')).toBe(true);
    expect(data.hasMichelinData('kr')).toBe(true);
    expect(data.hasMichelinData('Seoul')).toBe(true);
    expect(data.hasMichelinData('Busan')).toBe(true);
  });

  it('is true where TW venues exist (country + curated cities, incl. new ones)', () => {
    expect(data.hasMichelinData('TW')).toBe(true);
    expect(data.hasMichelinData('tw')).toBe(true);
    expect(data.hasMichelinData('Taipei')).toBe(true);
    expect(data.hasMichelinData('New Taipei')).toBe(true);
    expect(data.hasMichelinData('Hsinchu City')).toBe(true);
  });

  it('is true where VN venues exist (country + curated cities)', () => {
    expect(data.hasMichelinData('VN')).toBe(true);
    expect(data.hasMichelinData('vn')).toBe(true);
    expect(data.hasMichelinData('Ho Chi Minh City')).toBe(true);
    expect(data.hasMichelinData('Hanoi')).toBe(true);
    expect(data.hasMichelinData('Da Nang')).toBe(true);
  });

  it('is true where HK venues exist (country + curated city)', () => {
    expect(data.hasMichelinData('HK')).toBe(true);
    expect(data.hasMichelinData('hk')).toBe(true);
    expect(data.hasMichelinData('Hong Kong')).toBe(true);
  });

  it('is true where MO venues exist (Macau — its own ISO-2 table)', () => {
    expect(data.hasMichelinData('MO')).toBe(true);
    expect(data.hasMichelinData('mo')).toBe(true);
    expect(data.hasMichelinData('Macau')).toBe(true);
  });

  it('is true where PH venues exist (country + curated cities)', () => {
    expect(data.hasMichelinData('PH')).toBe(true);
    expect(data.hasMichelinData('ph')).toBe(true);
    expect(data.hasMichelinData('Makati - Metro Manila')).toBe(true);
    expect(data.hasMichelinData('Cebu')).toBe(true);
    expect(data.hasMichelinData('Parañaque - Metro Manila')).toBe(true);
  });

  it('is true where CN venues exist (country + curated cities, incl. new ones)', () => {
    expect(data.hasMichelinData('CN')).toBe(true);
    expect(data.hasMichelinData('cn')).toBe(true);
    expect(data.hasMichelinData('Shanghai')).toBe(true);
    expect(data.hasMichelinData('Xiamen')).toBe(true);
    expect(data.hasMichelinData('Ningde')).toBe(true);
  });

  it('is false for Singapore (SG is decoupled — handled by SG-michelin.js)', () => {
    expect(data.hasMichelinData('Singapore')).toBe(false);
    expect(data.hasMichelinData('SG')).toBe(false);
  });

  it('is true for France (curated scaffold: Paris + Lyon stars, v0.62.470)', () => {
    expect(data.hasMichelinData('FR')).toBe(true);
    expect(data.hasMichelinData('fr')).toBe(true);
    expect(data.hasMichelinData('Paris')).toBe(true);
    expect(data.hasMichelinData('Lyon')).toBe(true);
  });

  it('is false for countries with no Michelin table (not curated)', () => {
    expect(data.hasMichelinData('India')).toBe(false);
    expect(data.hasMichelinData('IN')).toBe(false);
  });

  it('is false for empty / nullish input', () => {
    expect(data.hasMichelinData('')).toBe(false);
    expect(data.hasMichelinData(null)).toBe(false);
    expect(data.hasMichelinData(undefined)).toBe(false);
  });
});

describe('michelin-data — country tables', () => {
  it('MY-michelin.js is venue-centric with 70 curated rows', () => {
    const my = require('../MY-michelin.js');
    expect(my.COUNTRY).toBe('MY');
    expect(Array.isArray(my.ENTRIES)).toBe(true);
    expect(my.ENTRIES.length).toBe(70);
  });

  it('CN-michelin.js is venue-centric with 475 curated rows', () => {
    const cn = require('../CN-michelin.js');
    expect(cn.COUNTRY).toBe('CN');
    expect(Array.isArray(cn.ENTRIES)).toBe(true);
    expect(cn.ENTRIES.length).toBe(475);
  });

  it('PH-michelin.js is venue-centric with 34 curated rows', () => {
    const ph = require('../PH-michelin.js');
    expect(ph.COUNTRY).toBe('PH');
    expect(Array.isArray(ph.ENTRIES)).toBe(true);
    expect(ph.ENTRIES.length).toBe(34);
  });

  it('MO-michelin.js is venue-centric with 34 curated rows', () => {
    const mo = require('../MO-michelin.js');
    expect(mo.COUNTRY).toBe('MO');
    expect(Array.isArray(mo.ENTRIES)).toBe(true);
    expect(mo.ENTRIES.length).toBe(34);
  });

  it('HK-michelin.js is venue-centric with 147 curated rows', () => {
    const hk = require('../HK-michelin.js');
    expect(hk.COUNTRY).toBe('HK');
    expect(Array.isArray(hk.ENTRIES)).toBe(true);
    expect(hk.ENTRIES.length).toBe(147);
  });

  it('VN-michelin.js is venue-centric with 83 curated rows', () => {
    const vn = require('../VN-michelin.js');
    expect(vn.COUNTRY).toBe('VN');
    expect(Array.isArray(vn.ENTRIES)).toBe(true);
    expect(vn.ENTRIES.length).toBe(83);
  });

  it('TW-michelin.js is venue-centric with 219 curated rows', () => {
    const tw = require('../TW-michelin.js');
    expect(tw.COUNTRY).toBe('TW');
    expect(Array.isArray(tw.ENTRIES)).toBe(true);
    expect(tw.ENTRIES.length).toBe(219);
  });

  it('KR-michelin.js is venue-centric with 117 curated rows', () => {
    const kr = require('../KR-michelin.js');
    expect(kr.COUNTRY).toBe('KR');
    expect(Array.isArray(kr.ENTRIES)).toBe(true);
    expect(kr.ENTRIES.length).toBe(117);
  });

  it('JP-michelin.js is venue-centric with 589 curated rows', () => {
    const jp = require('../JP-michelin.js');
    expect(jp.COUNTRY).toBe('JP');
    expect(Array.isArray(jp.ENTRIES)).toBe(true);
    expect(jp.ENTRIES.length).toBe(589);
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

// v0.62.665 — the Michelin 2026 update spec's compact-year display rule
// ("a category change shows only the year(s) matching its CURRENT tier").
describe('venue-award-schema — retainedAwardYears (compact display years)', () => {
  const [promoted, debut, closed] = normFixtures([FX_PROMOTED, FX_DEBUT_2026, FX_CLOSED]);

  it('a promotion shows ONLY the new-tier year, not the old tier\'s year too', () => {
    // 2025 one-star → 2026 two-star: the venue never held two-star in 2025,
    // so '25 must not appear beside the two-star label.
    expect(data.retainedAwardYears(promoted)).toEqual(["'26"]);
  });

  it('a pure debut shows only its single year', () => {
    expect(data.retainedAwardYears(debut)).toEqual(["'26"]);
  });

  it('a venue with one award ever shows that one year', () => {
    expect(data.retainedAwardYears(closed)).toEqual(["'25"]);
  });

  it('retained across consecutive editions shows both years, newest first', () => {
    const retained = { ...FX_DEBUT_2026, awards: [
      { year: 2025, category: 'bib-gourmand' },
      { year: 2026, category: 'bib-gourmand' },
    ] };
    expect(data.retainedAwardYears(retained)).toEqual(["'26", "'25"]);
  });

  it('empty/missing awards returns an empty array, not a throw', () => {
    expect(data.retainedAwardYears({ awards: [] })).toEqual([]);
    expect(data.retainedAwardYears({})).toEqual([]);
    expect(data.retainedAwardYears(null)).toEqual([]);
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
