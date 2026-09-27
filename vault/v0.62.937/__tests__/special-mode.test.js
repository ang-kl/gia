// __tests__/special-mode.test.js — v0.61.126
//
// Unit tests for the Fruits / Durian special-mode helpers. Integration
// against the live Places API is out of scope (covered by the PR test
// report's documented zone runs); this file pins the deterministic
// behaviour callers rely on.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sm = require('../special-mode.js');

describe('special-mode — mode constants + guard', () => {
  it('exposes the three canonical mode ids', () => {
    // v0.61.141 — DURIAN_PASTRY added; DURIAN narrowed to fruit-only.
    expect(sm.SPECIAL_MODES.FRUITS).toBe('fruits');
    expect(sm.SPECIAL_MODES.DURIAN).toBe('durian');
    expect(sm.SPECIAL_MODES.DURIAN_PASTRY).toBe('durian-pastry');
  });

  it('isSpecialMode accepts only the three canonical strings', () => {
    expect(sm.isSpecialMode('fruits')).toBe(true);
    expect(sm.isSpecialMode('durian')).toBe(true);
    expect(sm.isSpecialMode('durian-pastry')).toBe(true);
    expect(sm.isSpecialMode('Fruits')).toBe(false);    // case-sensitive
    expect(sm.isSpecialMode('')).toBe(false);
    expect(sm.isSpecialMode(null)).toBe(false);
    expect(sm.isSpecialMode(undefined)).toBe(false);
    expect(sm.isSpecialMode('michelin')).toBe(false);
    expect(sm.isSpecialMode(42)).toBe(false);
    // 'durianpastry' (no hyphen) is NOT accepted — slug must match
    // cuisines-vault.js slugify() output exactly.
    expect(sm.isSpecialMode('durianpastry')).toBe(false);
  });
});

describe('special-mode — specialModeAllowed (v0.61.397 durian-belt gate)', () => {
  // v0.61.397 — operator: block durian / fruits / durian-pastry outside the
  // SE-Asian durian belt. The belt is exactly SG, MY, ID, TH, PH, BN (Brunei
  // explicitly unblocked on the operator's word).
  // v0.61.413 — operator: added Vietnam (VN) → seven belt countries.
  it('allows every belt country, case-insensitively', () => {
    for (const cc of ['SG', 'MY', 'ID', 'TH', 'PH', 'BN', 'VN']) {
      expect(sm.specialModeAllowed(cc)).toBe(true);
      expect(sm.specialModeAllowed(cc.toLowerCase())).toBe(true);
    }
  });

  it('blocks countries outside the belt (the wrong-answer cases)', () => {
    // HK / JP / KR / CN / TW were the live failures (generic desserts
    // mislabelled as durian) — all must be blocked. (VN moved INTO the belt
    // in v0.61.413, so it is no longer here.)
    for (const cc of ['HK', 'JP', 'KR', 'CN', 'TW', 'US', 'GB', 'IN', 'AU']) {
      expect(sm.specialModeAllowed(cc)).toBe(false);
    }
  });

  it('blocks empty / nullish country (no country resolved → not the belt)', () => {
    expect(sm.specialModeAllowed(null)).toBe(false);
    expect(sm.specialModeAllowed(undefined)).toBe(false);
    expect(sm.specialModeAllowed('')).toBe(false);
  });

  it('exposes the belt as a frozen 7-country set', () => {
    expect(sm.SPECIAL_MODE_COUNTRIES).toBeInstanceOf(Set);
    expect(sm.SPECIAL_MODE_COUNTRIES.size).toBe(7);
    expect(Object.isFrozen(sm.SPECIAL_MODE_COUNTRIES)).toBe(true);
    expect([...sm.SPECIAL_MODE_COUNTRIES].sort()).toEqual(['BN', 'ID', 'MY', 'PH', 'SG', 'TH', 'VN']);
  });

  // v0.61.402 — operator: UNLOCK fruits everywhere; keep durian + durian-pastry
  // belt-gated. The gate is now mode-aware.
  it('allows FRUITS in any country (unlocked globally)', () => {
    for (const cc of ['JP', 'KR', 'HK', 'US', 'GB', 'SG', null, '']) {
      expect(sm.specialModeAllowed(cc, 'fruits')).toBe(true);
    }
  });

  it('still belt-gates durian + durian-pastry by mode', () => {
    for (const mode of ['durian', 'durian-pastry']) {
      expect(sm.specialModeAllowed('SG', mode)).toBe(true);
      expect(sm.specialModeAllowed('MY', mode)).toBe(true);
      expect(sm.specialModeAllowed('JP', mode)).toBe(false);
      expect(sm.specialModeAllowed('HK', mode)).toBe(false);
      expect(sm.specialModeAllowed(null, mode)).toBe(false);
    }
  });

  it('with mode omitted, falls back to the conservative belt check', () => {
    expect(sm.specialModeAllowed('SG')).toBe(true);
    expect(sm.specialModeAllowed('JP')).toBe(false);
  });
});

describe('special-mode — buildSeeds (v0.61.271 contract — no silent SG suffix)', () => {
  // v0.61.271 — Phase 3 audit fix. Pre-v0.61.271 the default suffix
  // was ' Singapore'; that silent geofence leak made every durian/
  // fruits search outside SG land on SG venues. Default is now ''
  // and callers must opt into a suffix explicitly when they want one.
  it('Fruits seeds with no opts → bare seeds, no country suffix', () => {
    const seeds = sm.buildSeeds('fruits');
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const s of seeds) expect(s.endsWith(' Singapore')).toBe(false);
    expect(seeds.some((s) => s === 'fruit shop')).toBe(true);
    expect(seeds.some((s) => s.includes('fruit juice'))).toBe(true);
  });

  it('Durian seeds with no opts → bare seeds, no country suffix', () => {
    const seeds = sm.buildSeeds('durian');
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const s of seeds) expect(s.endsWith(' Singapore')).toBe(false);
    expect(seeds.some((s) => s === 'durian shop')).toBe(true);
    expect(seeds.some((s) => s === 'durian seller')).toBe(true);
  });

  it('Empty/whitespace regionSuffix is treated as no suffix', () => {
    const empty = sm.buildSeeds('fruits', { regionSuffix: '' });
    expect(empty.every((s) => !s.endsWith(' Singapore'))).toBe(true);
    const ws = sm.buildSeeds('fruits', { regionSuffix: '   ' });
    expect(ws.every((s) => !s.endsWith(' Singapore'))).toBe(true);
  });

  it('Explicit Singapore suffix still works for opt-in callers', () => {
    const sg = sm.buildSeeds('fruits', { regionSuffix: 'Singapore' });
    expect(sg.every((s) => s.endsWith(' Singapore'))).toBe(true);
  });

  it('regionSuffix override swaps the suffix (JB / Putrajaya)', () => {
    const jb = sm.buildSeeds('fruits', { regionSuffix: 'Johor Bahru Malaysia' });
    expect(jb.every((s) => s.endsWith(' Johor Bahru Malaysia'))).toBe(true);
    const pj = sm.buildSeeds('durian', { regionSuffix: 'Putrajaya Malaysia' });
    expect(pj.every((s) => s.endsWith(' Putrajaya Malaysia'))).toBe(true);
  });

  it('regionSuffix supports new-country callers (Bangkok / Jakarta / Tokyo)', () => {
    const bkk = sm.buildSeeds('durian', { regionSuffix: 'Bangkok Thailand' });
    expect(bkk.every((s) => s.endsWith(' Bangkok Thailand'))).toBe(true);
    const jkt = sm.buildSeeds('durian-pastry', { regionSuffix: 'Jakarta Indonesia' });
    expect(jkt.every((s) => s.endsWith(' Jakarta Indonesia'))).toBe(true);
  });

  it('returns [] for invalid modes', () => {
    expect(sm.buildSeeds(null)).toEqual([]);
    expect(sm.buildSeeds('')).toEqual([]);
    expect(sm.buildSeeds('michelin')).toEqual([]);
  });

  // v0.61.395 — Track A: local-language seed augmentation for foreign-script
  // countries (the English seeds under-recall in e.g. Tokyo).
  it('appends Japanese durian-pastry seeds for country=JP (keeps English)', () => {
    const jp = sm.buildSeeds('durian-pastry', { country: 'JP' });
    expect(jp.some((s) => s === 'durian puff')).toBe(true);       // English kept
    expect(jp.some((s) => s === 'ドリアンパフ')).toBe(true);        // JP added
    expect(jp.some((s) => s === 'ドリアンケーキ')).toBe(true);
  });

  it('appends Thai durian seeds for country=TH; Chinese for CN/TW', () => {
    expect(sm.buildSeeds('durian', { country: 'TH' }).some((s) => s === 'ร้านทุเรียน')).toBe(true);
    expect(sm.buildSeeds('durian-pastry', { country: 'CN' }).some((s) => s === '榴莲泡芙')).toBe(true);
    expect(sm.buildSeeds('durian-pastry', { country: 'TW' }).some((s) => s === '榴梿泡芙')).toBe(true);
    expect(sm.buildSeeds('durian', { country: 'KR' }).some((s) => s === '두리안 가게')).toBe(true);
  });

  it('does NOT add local seeds for SG / FR (no mapped local language)', () => {
    expect(sm.buildSeeds('durian-pastry', { country: 'SG' })).toEqual(sm.buildSeeds('durian-pastry'));
    expect(sm.buildSeeds('durian-pastry', { country: 'FR' })).toEqual(sm.buildSeeds('durian-pastry'));
  });

  // v0.62.14 — durian belt recall: Malay (MY/BN) + Indonesian (ID) durian
  // sellers under-recall on English seeds. Append local-language seeds
  // (operator: "< 5 per city in the durian belt"). English seeds kept.
  it('appends Malay durian seeds for MY/BN and Indonesian for ID (keeps English)', () => {
    const my = sm.buildSeeds('durian', { country: 'MY' });
    expect(my.some((s) => s === 'durian stall')).toBe(true);   // English kept
    expect(my.some((s) => s === 'kedai durian')).toBe(true);   // Malay added
    expect(sm.buildSeeds('durian', { country: 'BN' }).some((s) => s === 'kedai durian')).toBe(true);
    const id = sm.buildSeeds('durian', { country: 'ID' });
    expect(id.some((s) => s === 'toko durian')).toBe(true);    // Indonesian added
    expect(sm.buildSeeds('durian-pastry', { country: 'MY' }).some((s) => s === 'kek durian')).toBe(true);
    expect(sm.buildSeeds('durian-pastry', { country: 'ID' }).some((s) => s === 'kue durian')).toBe(true);
  });

  it('local seeds carry NO region suffix even when one is set', () => {
    const jp = sm.buildSeeds('durian-pastry', { country: 'JP', regionSuffix: 'Tokyo' });
    expect(jp.some((s) => s === 'durian puff Tokyo')).toBe(true);  // English gets the suffix
    expect(jp.some((s) => s === 'ドリアンパフ')).toBe(true);          // local stays bare
  });

  // v0.61.395 — Track B: local "newly opened" recall term.
  it('localNewlyOpened maps foreign-script countries, null otherwise', () => {
    expect(sm.localNewlyOpened('JP')).toBe('新しくオープン');
    expect(sm.localNewlyOpened('TH')).toBe('เปิดใหม่');
    expect(sm.localNewlyOpened('SG')).toBeNull();
    expect(sm.localNewlyOpened('US')).toBeNull();
    expect(sm.localNewlyOpened(null)).toBeNull();
  });
});

describe('special-mode — isRelevant (Fruits)', () => {
  const cases = [
    // Accepted — name carries strong fruit signal
    { name: 'Mr Fruit Juice', primaryType: 'juice_shop', expect: true },
    { name: 'Yong Tau Fu & Fresh Fruit Stall', primaryType: 'food_court', expect: true },
    { name: 'Pasar Buah Tampines', primaryType: 'market', expect: true },   // Malay
    // v0.61.141 — was `primaryType: 'fruit_shop'` which spuriously
    // matched the 'fruit' keyword via the haystack substring search
    // (`'fruit_shop'.includes('fruit')` is true). Pre-existing test
    // bug from v0.61.126 that only surfaces now that this PR is
    // adding adjacent durian-pastry coverage. Swapped to `food_store`.
    { name: '榴莲莊', primaryType: 'food_store', expect: false },         // durian-only name; primaryType not in reject; no fruit keyword
    { name: '水果天堂', primaryType: 'shopping_mall', expect: true },        // Chinese
    { name: 'Smoothie Factory', primaryType: 'cafe', expect: true },
    { name: 'Cold-pressed Juice Bar', primaryType: 'cafe', expect: true },
    // Rejected — name has fruit but primaryType is a hard reject (fine dining)
    { name: 'Fresh Fruit Tasting Menu', primaryType: 'fine_dining_restaurant', expect: false },
    { name: 'Italian Fruit Tart Cafe', primaryType: 'italian_restaurant', expect: false },
    // Rejected — no fruit signal at all
    { name: 'Random Coffee Shop', primaryType: 'cafe', expect: false },
    { name: 'Char Kway Teow Stall', primaryType: 'food_court', expect: false },
    { name: 'Toast Box', primaryType: 'cafe', expect: false },
    // Accepted via specific fruit variety in name
    { name: 'Mao Shan Wang Mango Centre', primaryType: 'fruit_shop', expect: true }, // both varieties + fruit
    { name: 'Watermelon House', primaryType: 'fruit_shop', expect: true },
    { name: 'Pineapple Tarts SG', primaryType: 'bakery', expect: true }   // fruit in name
  ];

  for (const c of cases) {
    it(`${c.expect ? '✓' : '✗'} "${c.name}" (${c.primaryType})`, () => {
      expect(sm.isRelevant({ name: c.name, primaryType: c.primaryType }, 'fruits')).toBe(c.expect);
    });
  }
});

describe('special-mode — isRelevant (Durian)', () => {
  // v0.61.229 — variety names ("Mao Shan Wang Express", "Black
  // Thorn King") and unrecognised primaryTypes ("market",
  // "fruit_shop" — Google Places uses "fruit_and_vegetable_store")
  // no longer slip through. The accept-list + "durian must appear
  // in name/area" combination is the gate.
  const cases = [
    // Accepted — name has 'durian' + primaryType in accept list
    { name: 'Combat Durian', primaryType: 'meal_takeaway', expect: true },
    { name: '99 Old Trees Durian', primaryType: 'food_store', expect: true },
    { name: '榴莲专卖店', primaryType: 'food_store', expect: true },           // Chinese
    // v0.61.414 — Vietnamese durian sellers ("Sầu riêng …"). Without the
    // Vietnamese term in DURIAN_CORE_TERMS these were rejected → VN returned 0.
    { name: 'Sầu Riêng Chín Cây', primaryType: 'food_store', expect: true },   // Vietnamese (diacritic)
    { name: 'Sau Rieng Cai Mon', primaryType: 'meal_takeaway', expect: true }, // Vietnamese (bare)
    // v0.62.14 — durian-EXCLUSIVE cultivar names in the name now PASS on an
    // accept-type venue (operator: variety-named stalls were being dropped).
    // Only collision-free cultivars (musang king / mao shan wang / black thorn);
    // ambiguous ones (red prawn/golden phoenix/tekka) stay extraction-only.
    { name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway', expect: true },
    { name: 'Black Thorn King', primaryType: 'meal_takeaway', expect: true },
    // Rejected — primaryType outside the accept list (v0.61.229).
    { name: 'Tasty D24 Stall', primaryType: 'market', expect: false },
    // Rejected — restaurant types
    { name: 'Durian Pasta Bistro', primaryType: 'italian_restaurant', expect: false },
    { name: 'Sushi & Durian Buffet', primaryType: 'japanese_restaurant', expect: false },
    // Rejected — no durian signal
    { name: 'Toast Box', primaryType: 'cafe', expect: false },
    { name: 'Random Fruit Stand', primaryType: 'fruit_shop', expect: false }
  ];

  for (const c of cases) {
    it(`${c.expect ? '✓' : '✗'} "${c.name}" (${c.primaryType})`, () => {
      expect(sm.isRelevant({ name: c.name, primaryType: c.primaryType }, 'durian')).toBe(c.expect);
    });
  }
});

// v0.61.416 — operator: generic-term fallback. When the strict durian search
// returns 0, the caller re-runs filterByMode(..., { relax: true }), which skips
// the accept-type + strict-name gates and matches a durian word anywhere in the
// full haystack — but STILL requires a durian word (no random food).
describe('special-mode — isRelevant relax (generic-term fallback)', () => {
  it('relax accepts a durian-named venue whose primaryType is NOT in the accept-list', () => {
    const v = { name: 'Durian Farm Brunei', primaryType: 'tourist_attraction' }; // ∉ accept-list
    expect(sm.isRelevant(v, 'durian')).toBe(false);                   // strict: accept-type reject
    expect(sm.isRelevant(v, 'durian', { relax: true })).toBe(true);   // relax: durian in name
  });
  it('relax accepts a broad-type venue with durian ONLY in the address (strict name-gate skipped)', () => {
    const v = { name: 'Kedai Buah', primaryType: 'food_store', formattedAddress: 'Lorong Durian, BSB' };
    expect(sm.isRelevant(v, 'durian')).toBe(false);                   // strict: name lacks durian
    expect(sm.isRelevant(v, 'durian', { relax: true })).toBe(true);   // relax: durian in address
  });
  it('relax STILL requires a durian word — random food is rejected', () => {
    const v = { name: 'Random Cafe', primaryType: 'cafe', formattedAddress: 'Main Street' };
    expect(sm.isRelevant(v, 'durian', { relax: true })).toBe(false);
  });
  it('filterByMode forwards the relax option', () => {
    const pool = [
      { name: 'Durian Farm Brunei', primaryType: 'tourist_attraction' },  // relax-only
      { name: 'Random Cafe', primaryType: 'cafe' }                        // never (no durian word)
    ];
    expect(sm.filterByMode(pool, 'durian')).toHaveLength(0);
    expect(sm.filterByMode(pool, 'durian', { relax: true })).toHaveLength(1);
  });
});

describe('special-mode — filterByMode preserves order, drops irrelevant', () => {
  const venues = [
    { name: 'Sushi Tei', primaryType: 'japanese_restaurant' },
    { name: 'Combat Durian', primaryType: 'meal_takeaway' },
    { name: 'Mr Fruit Juice', primaryType: 'juice_shop' },
    { name: 'Burger King', primaryType: 'hamburger_restaurant' },
    { name: '99 Old Trees', primaryType: 'food_store' }
  ];

  it('Fruits mode keeps only Mr Fruit Juice', () => {
    const out = sm.filterByMode(venues, 'fruits');
    expect(out.map((v) => v.name)).toEqual(['Mr Fruit Juice']);
  });

  it('Durian mode keeps Combat Durian + 99 Old Trees (variety implicit — keep)', () => {
    // 99 Old Trees does NOT carry the word "durian" in its name; it is
    // a famous SG durian seller. The keyword filter alone would drop
    // it. Confirm the current behaviour (strict — name must carry a
    // mode keyword) so a future relaxation is deliberate.
    const out = sm.filterByMode(venues, 'durian');
    expect(out.map((v) => v.name)).toEqual(['Combat Durian']);
  });

  it('null / invalid mode returns the input as-is', () => {
    expect(sm.filterByMode(venues, null)).toEqual(venues);
    expect(sm.filterByMode(venues, 'michelin')).toEqual(venues);
  });

  it('non-array input → [] (defensive)', () => {
    expect(sm.filterByMode(null, 'fruits')).toEqual([]);
    expect(sm.filterByMode(undefined, 'durian')).toEqual([]);
    expect(sm.filterByMode('not-an-array', 'fruits')).toEqual([]);
  });
});

describe('special-mode — multi-language signal matching', () => {
  it('matches Malay "buah" + "jus buah" in the address/area', () => {
    expect(sm.isRelevant({ name: 'Generic Stall', primaryType: 'food_court', area: 'Pasar Buah Geylang' }, 'fruits')).toBe(true);
  });

  it('matches Chinese 水果 + 果汁 in the editorial summary', () => {
    expect(sm.isRelevant({ name: '小店', primaryType: 'cafe', googleSummary: { overview: '本店专卖鲜榨果汁' } }, 'fruits')).toBe(true);
  });

  it('matches review-text signal even when name is bland', () => {
    expect(sm.isRelevant({
      name: 'XYZ Stall',
      primaryType: 'food_court',
      reviews: [{ text: 'Best fresh fruit juice in the neighbourhood.' }]
    }, 'fruits')).toBe(true);
  });

  it('matches Chinese 榴莲 in the name', () => {
    expect(sm.isRelevant({ name: '榴莲莊', primaryType: 'food_store' }, 'durian')).toBe(true);
  });
});

describe('special-mode — type rejection invariants', () => {
  it('Fruits rejects fine_dining_restaurant even with strong name signal', () => {
    expect(sm.isRelevant({ name: 'Cold-pressed Fruit Juice Tasting', primaryType: 'fine_dining_restaurant' }, 'fruits')).toBe(false);
  });

  // v0.61.229 — meal_takeaway IS in the DURIAN accept list (small
  // delivery-only specialists). Venue name must still contain the
  // CORE 'durian' word (variety names alone — like "Mao Shan Wang
  // Express" — no longer pass; they're extraction signals only).
  it('Durian keeps meal_takeaway when name has "durian"', () => {
    expect(sm.isRelevant({ name: 'Durian Express', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
  });

  it('Durian ACCEPTS durian-exclusive cultivar name on an accept-type venue (v0.62.14)', () => {
    // v0.62.14 — operator: variety-named stalls were dropped by the strict-name
    // gate. Durian-EXCLUSIVE cultivars (musang king / mao shan wang / black
    // thorn) now satisfy the name gate on an accept-type venue. Ambiguous
    // cultivars (red prawn = seafood, golden phoenix = Chinese resto, tekka =
    // sushi) stay extraction-only — see the regression tests below, which still
    // reject non-durian RESTAURANT types regardless of review text.
    expect(sm.isRelevant({ name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
    expect(sm.isRelevant({ name: 'Black Thorn King', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
  });

  it('Fruits rejects meal_takeaway even with juice in name (juice stalls are dine-in / counter)', () => {
    // The spec wants juice STALLS / SHOPS, not delivery — meal_takeaway
    // is not in the fruits accept list.
    expect(sm.isRelevant({ name: 'Daily Fruit Juice Delivery', primaryType: 'meal_takeaway' }, 'fruits')).toBe(false);
  });

  // v0.61.229 — the operator-reported bug. A French / Italian
  // restaurant whose review mentions a variety name should NOT
  // be classified as DURIAN.
  it('REGRESSION — French restaurant with "Mao Shan Wang" in review is NOT durian', () => {
    expect(sm.isRelevant({
      name: 'La Bonne Table',
      primaryType: 'french_restaurant',
      reviews: [{ text: 'we paired the foie gras with a Mao Shan Wang reduction' }]
    }, 'durian')).toBe(false);
  });

  it('REGRESSION — Italian restaurant with "durian dessert" in review is NOT durian (fruit)', () => {
    expect(sm.isRelevant({
      name: 'Pasta Bar',
      primaryType: 'italian_restaurant',
      reviews: [{ text: 'pair the durian with our tiramisu' }]
    }, 'durian')).toBe(false);
  });

  it('REGRESSION — Sushi restaurant rejected from DURIAN_PASTRY too', () => {
    expect(sm.isRelevant({
      name: 'Sushi Tei',
      primaryType: 'sushi_restaurant',
      reviews: [{ text: 'they have a durian dessert on the seasonal menu' }]
    }, 'durian-pastry')).toBe(false);
  });
});

// v0.61.257 — operator: "<20% right for each results in singapore,
// johor bahru, Kuala Lumpur, Putrajaya" on Durian + Durian Pastry.
// Two-pronged precision fix in special-mode.js: (a) DURIAN +
// DURIAN_PASTRY now use the STRONG haystack only (name + area +
// formattedAddress + primaryType), dropping reviews + googleSummary
// from the keyword match — so a single review mention of "durian"
// doesn't promote a generic cafe. (b) broad accept types (food,
// market, farm, coffee_shop, grocery_store, …) now require "durian"
// in the venue NAME, gated via STRICT_NAME_TYPES_DURIAN /
// _DURIAN_PASTRY.
describe('special-mode — v0.61.257 precision tightening (Durian + Durian Pastry)', () => {
  it('Durian: review-only mention no longer passes a generic food-type cafe', () => {
    expect(sm.isRelevant({
      name: 'Bob Café',
      primaryType: 'food',
      reviews: [{ text: 'we tried their durian latte once and loved it' }]
    }, 'durian')).toBe(false);
  });

  it('Durian: googleSummary-only mention no longer passes a generic cafe', () => {
    expect(sm.isRelevant({
      name: 'Coffee Spot',
      primaryType: 'coffee_shop',
      googleSummary: { overview: 'A cozy cafe that occasionally offers durian flavour drinks' }
    }, 'durian')).toBe(false);
  });

  it('Durian: broad type (food) + "durian" in NAME still passes', () => {
    // The v0.61.235 mistyped-venue argument — keep these in scope.
    expect(sm.isRelevant({
      name: '99 Old Trees Durian',
      primaryType: 'food'
    }, 'durian')).toBe(true);
  });

  it('Durian: broad type (general_store) + 榴莲 in NAME still passes', () => {
    expect(sm.isRelevant({
      name: 'Hey!Durian 榴莲说',
      primaryType: 'general_store'
    }, 'durian')).toBe(true);
  });

  it('Durian: canonical type (fruit_and_vegetable_store) passes without name match if area mentions durian', () => {
    expect(sm.isRelevant({
      name: 'Geylang Fruit Stand',
      primaryType: 'fruit_and_vegetable_store',
      area: 'Sims Avenue · durian wholesale district'
    }, 'durian')).toBe(true);
  });

  it('Durian Pastry: review-only mention no longer passes a generic restaurant', () => {
    expect(sm.isRelevant({
      name: 'Steakhouse Foo',
      primaryType: 'restaurant',
      reviews: [{ text: 'durian crepe was a fun seasonal item' }]
    }, 'durian-pastry')).toBe(false);
  });

  it('Durian Pastry: cake_shop (canonical) with "durian cake" in NAME passes', () => {
    expect(sm.isRelevant({
      name: 'Emicakes Durian Cake Specialist',
      primaryType: 'cake_shop'
    }, 'durian-pastry')).toBe(true);
  });

  it('Durian Pastry: meal_delivery (broad) requires "durian" + pastry keyword in NAME', () => {
    // Without "durian" in name → rejected even with primaryType=meal_delivery.
    expect(sm.isRelevant({
      name: 'GrabFood Mart',
      primaryType: 'meal_delivery',
      reviews: [{ text: 'lots of durian items here' }]
    }, 'durian-pastry')).toBe(false);
    // With "durian" in name BUT no pastry keyword in name → fails the
    // DURIAN_PASTRY keyword set (which is pastry-specific: 'durian
    // puff', 'durian cake', …, never bare 'durian'). Operator-expected
    // — this would be a DURIAN-mode candidate, not DURIAN_PASTRY.
    expect(sm.isRelevant({
      name: 'Durian Delivery KL',
      primaryType: 'meal_delivery'
    }, 'durian-pastry')).toBe(false);
    // With "durian" + an explicit pastry keyword in name → accepted.
    expect(sm.isRelevant({
      name: 'Durian Pastry Delivery KL',
      primaryType: 'meal_delivery'
    }, 'durian-pastry')).toBe(true);
  });
});

// v0.61.262 — operator (29-05 '26): the v0.61.260 /ver variance run
// showed 15 real durian sellers (restaurants / asian_restaurants /
// chinese_restaurants / diners) wrongly rejected because their
// primaryType wasn't in the DURIAN accept list. Two structural
// changes in special-mode.isRelevant:
//
//   1) Restaurant family (restaurant / asian_restaurant /
//      chinese_restaurant / diner) added to ACCEPT_PRIMARY_TYPES_DURIAN
//      AND to STRICT_NAME_TYPES_DURIAN. They pass DURIAN mode only
//      when the venue name contains "durian" / 榴莲 / 榴梿.
//      Cuisine-specific restaurants (italian/japanese/french/sushi/
//      etc.) remain OUT of the accept list → still rejected outright.
//   2) RECENCY-FILTERED REVIEW signal: if primaryType is canonical
//      for the mode (DURIAN: fruit_and_vegetable_store /
//      produce_market / wholesaler / food_store; DURIAN_PASTRY:
//      bakery / cake_shop / pastry_shop / dessert_shop /
//      dessert_restaurant / ice_cream_shop) AND reviews from the
//      last 24 months mention durian ≥ 2 times, accept.
describe('special-mode — v0.61.262 restaurant family + recency-filtered reviews', () => {
  it('Durian: restaurant-typed durian stalls now pass (operator-flagged false negatives)', () => {
    // The operator-flagged false negatives from the variance run.
    expect(sm.isRelevant({ name: '皇后镇榴莲档 Durian Stall', primaryType: 'asian_restaurant' }, 'durian')).toBe(true);
    expect(sm.isRelevant({ name: 'Durian Power Food Stall', primaryType: 'chinese_restaurant' }, 'durian')).toBe(true);
    expect(sm.isRelevant({ name: '榴心花园 DuriYen Garden - Durian Store TRX', primaryType: 'restaurant' }, 'durian')).toBe(true);
    expect(sm.isRelevant({ name: 'Gerai Durian Kubur Cina', primaryType: 'restaurant' }, 'durian')).toBe(true);
    expect(sm.isRelevant({ name: 'Mr Durian', primaryType: 'restaurant' }, 'durian')).toBe(true);
  });

  it('Durian: cuisine-specific restaurants still rejected even with durian in name', () => {
    // italian/japanese/french/sushi/etc. NOT in accept list → rejected.
    expect(sm.isRelevant({ name: 'Durian Pasta Bistro', primaryType: 'italian_restaurant' }, 'durian')).toBe(false);
    expect(sm.isRelevant({ name: 'Sushi & Durian Buffet', primaryType: 'japanese_restaurant' }, 'durian')).toBe(false);
  });

  it('Durian: restaurant-type WITHOUT durian in name is still rejected (strict-name gate)', () => {
    // restaurant is in accept list BUT also in strict-name → must have durian in name.
    expect(sm.isRelevant({ name: 'Bob Café', primaryType: 'restaurant' }, 'durian')).toBe(false);
  });

  it('Durian: pastry-reject regex still fires for restaurant-typed venues', () => {
    // 'Durian Cake Bakery' (restaurant) — accepted by type, but name has 'cake' → pastry-reject → rejected.
    expect(sm.isRelevant({ name: 'Durian Cake Bakery', primaryType: 'restaurant' }, 'durian')).toBe(false);
    expect(sm.isRelevant({ name: 'Durian Mousse Bar', primaryType: 'restaurant' }, 'durian')).toBe(false);
  });

  it('Durian: recency-filtered ≥2 mentions in canonical type passes (variety-named shop)', () => {
    const recentIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(sm.isRelevant({
      name: 'Mao Shan Wang Stall',
      primaryType: 'food_store',  // canonical
      reviews: [
        { text: 'Best durian I have had in years!', publishTime: recentIso },
        { text: 'The Mao Shan Wang durian is top notch.', publishTime: recentIso }
      ]
    }, 'durian')).toBe(true);
  });

  it('Durian: recency-filtered single mention does NOT pass (threshold is 2)', () => {
    const recentIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(sm.isRelevant({
      name: 'Generic Stall',
      primaryType: 'food_store',
      reviews: [{ text: 'They had durian once.', publishTime: recentIso }]
    }, 'durian')).toBe(false);
  });

  it('Durian: stale reviews (>24 months) do not count for the recency signal', () => {
    const oldIso = new Date(Date.now() - 3 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 3 years
    expect(sm.isRelevant({
      name: 'Old Stall',
      primaryType: 'food_store',
      reviews: [
        { text: 'Great durian.', publishTime: oldIso },
        { text: 'Best durian here.', publishTime: oldIso }
      ]
    }, 'durian')).toBe(false);
  });

  it('Durian: recency signal does NOT apply to non-canonical types (cafe / coffee_shop / restaurant) — name is required', () => {
    const recentIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(sm.isRelevant({
      name: 'Generic Café',
      primaryType: 'cafe',
      reviews: [
        { text: 'Their durian dessert is great.', publishTime: recentIso },
        { text: 'Lovely durian flavour drink.', publishTime: recentIso }
      ]
    }, 'durian')).toBe(false);  // cafe is in STRICT_NAME → rejected because name has no "durian"
  });

  it('Durian Pastry: recency-filtered ≥2 mentions in cake_shop passes', () => {
    const recentIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    expect(sm.isRelevant({
      name: 'Emicakes',
      primaryType: 'cake_shop',
      reviews: [
        { text: 'Their durian cake is legendary.', publishTime: recentIso },
        { text: 'Best durian pastry in town.', publishTime: recentIso }
      ]
    }, 'durian-pastry')).toBe(true);
  });
});

describe('special-mode — v0.61.229 DURIAN_VARIETY_TERMS + extractVarietyMentions', () => {
  it('exposes the operator catalogue as DURIAN_VARIETY_TERMS', () => {
    expect(Array.isArray(sm.DURIAN_VARIETY_TERMS)).toBe(true);
    expect(sm.DURIAN_VARIETY_TERMS).toContain('mao shan wang');
    expect(sm.DURIAN_VARIETY_TERMS).toContain('musang king');
    expect(sm.DURIAN_VARIETY_TERMS).toContain('d24');
    expect(sm.DURIAN_VARIETY_TERMS).toContain('black thorn');
    expect(sm.DURIAN_VARIETY_TERMS).toContain('猫山王');
  });

  it('extractVarietyMentions returns word-bounded matches (Latin)', () => {
    const v = {
      reviews: [{ text: 'They had Mao Shan Wang, D24, and Black Thorn Johor — top notch' }]
    };
    const hits = sm.extractVarietyMentions(v);
    expect(hits).toContain('mao shan wang');
    expect(hits).toContain('d24');
    expect(hits).toContain('black thorn');
    expect(hits).toContain('black thorn johor');
  });

  it('extractVarietyMentions does NOT match "d2" inside "d24"', () => {
    const v = { reviews: [{ text: 'D24 was fresh today' }] };
    const hits = sm.extractVarietyMentions(v);
    expect(hits).toContain('d24');
    expect(hits).not.toContain('d2');
  });

  it('extractVarietyMentions matches Chinese variety names', () => {
    const v = { reviews: [{ text: '今天买了猫山王和红虾' }] };
    const hits = sm.extractVarietyMentions(v);
    expect(hits).toContain('猫山王');
    expect(hits).toContain('红虾');
  });

  it('extractVarietyMentions returns [] for empty / null venue', () => {
    expect(sm.extractVarietyMentions(null)).toEqual([]);
    expect(sm.extractVarietyMentions({})).toEqual([]);
  });
});

describe('special-mode — DURIAN narrowed to fruit-only (v0.61.141)', () => {
  // The bare word "durian" is in DURIAN's keyword list, so a venue
  // named "Durian Puff Specialist" would match the keyword. The
  // v0.61.141 name-token reject patterns guard against this so
  // pastry shops are routed to DURIAN_PASTRY instead.
  const pastryNames = [
    'Combat Durian Puff',
    'Old Chang Kee Durian Pastry',
    'Bengawan Solo Durian Cake',
    'Durian Cake & Mochi Studio',
    'Durian Crepes & Cream',
    'Mr Durian Tart',
    'Durian Pancake House',
    'Durian Cream Puff Stand'
  ];
  for (const name of pastryNames) {
    it(`rejects "${name}" from DURIAN (pastry signal in name)`, () => {
      expect(sm.isRelevant({ name, primaryType: 'meal_takeaway' }, 'durian')).toBe(false);
    });
  }

  it('accepts plain "Combat Durian" (no pastry signal)', () => {
    expect(sm.isRelevant({ name: 'Combat Durian', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
  });

  // v0.62.14 — durian-exclusive cultivar names now PASS DURIAN on an
  // accept-type venue (operator recall fix, supersedes the v0.61.229
  // reject). Non-durian restaurant types remain rejected — see the
  // regression tests in the "type rejection invariants" block above.
  it('ACCEPTS durian-exclusive cultivar names on accept-type venues (v0.62.14)', () => {
    expect(sm.isRelevant({ name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
    expect(sm.isRelevant({ name: 'Black Thorn King', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
  });
});

describe('special-mode — DURIAN_PASTRY (v0.61.141)', () => {
  // v0.61.271 — was: "default suffix" expects ' Singapore'. Updated
  // to reflect the new no-suffix default (audit ledger C3).
  it('buildSeeds emits pastry-focused queries with no default suffix', () => {
    const seeds = sm.buildSeeds('durian-pastry');
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const s of seeds) expect(s.endsWith(' Singapore')).toBe(false);
    expect(seeds.some((s) => s === 'durian puff')).toBe(true);
    expect(seeds.some((s) => s === 'durian pastry')).toBe(true);
    expect(seeds.some((s) => s === 'durian cake')).toBe(true);
  });

  it('buildSeeds respects regionSuffix override (JB)', () => {
    const seeds = sm.buildSeeds('durian-pastry', { regionSuffix: 'Johor Bahru Malaysia' });
    expect(seeds.every((s) => s.endsWith(' Johor Bahru Malaysia'))).toBe(true);
  });

  const pastryAccepts = [
    { name: 'Old Chang Kee Durian Puff', primaryType: 'bakery', expect: true },
    { name: 'Bengawan Solo Durian Cake', primaryType: 'bakery', expect: true },
    { name: 'Durian Mochi Heaven', primaryType: 'cafe', expect: true },
    { name: 'Durian Crepes Stall', primaryType: 'food_court', expect: true },
    { name: '榴莲蛋糕屋', primaryType: 'bakery', expect: true },        // Chinese pastry
    { name: '榴莲泡芙专门店', primaryType: 'bakery', expect: true }     // durian puff specialist
  ];
  for (const c of pastryAccepts) {
    it(`✓ "${c.name}" → durian-pastry`, () => {
      expect(sm.isRelevant({ name: c.name, primaryType: c.primaryType }, 'durian-pastry')).toBe(true);
    });
  }

  const pastryRejects = [
    // fruit-only sellers should NOT match durian-pastry
    { name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway' },
    { name: '99 Old Trees', primaryType: 'food_store' },
    // unrelated cafe with no durian signal
    { name: 'Toast Box', primaryType: 'cafe' },
    // fine dining rejected even with name signal
    { name: 'Durian Tasting Menu', primaryType: 'fine_dining_restaurant' }
  ];
  for (const c of pastryRejects) {
    it(`✗ "${c.name}" not in durian-pastry`, () => {
      expect(sm.isRelevant({ name: c.name, primaryType: c.primaryType }, 'durian-pastry')).toBe(false);
    });
  }

  it('filterByMode keeps only pastry-tagged venues', () => {
    const venues = [
      { name: 'Combat Durian', primaryType: 'meal_takeaway' },         // fruit only
      { name: 'Old Chang Kee Durian Puff', primaryType: 'bakery' },    // pastry ✓
      { name: 'Sushi Tei', primaryType: 'japanese_restaurant' },       // unrelated
      { name: '榴莲蛋糕屋', primaryType: 'bakery' }                      // pastry ✓
    ];
    const out = sm.filterByMode(venues, 'durian-pastry');
    expect(out.map((v) => v.name)).toEqual(['Old Chang Kee Durian Puff', '榴莲蛋糕屋']);
  });
});

// v0.61.225 — operator-supplied full catalogues.
//   DURIAN          → 41 fruit-variety names (MSW/Musang King, Black
//                     Thorn, D24/Sultan, …)
//   DURIAN_PASTRY   → 41 dessert/drink/cake items (Durian Mousse,
//                     Bingsoo, Mille Crepe, Goreng, Frappuccino, …)
describe('special-mode — v0.61.225 fruit-variety catalogue (DURIAN)', () => {
  // A representative sample of the 41 varieties — review-text signal
  // alone (no name match) must still surface the stall.
  const fruitVarietySignals = [
    'Musang King', 'Super MSW', 'Old Tree MSW', 'Black Thorn Johor',
    'Red Prawn', 'Udang Merah', 'D198', 'Sultan',
    'XO Durian', 'D101', '101 Johor', 'D168',
    'Black Pearl', 'Green Bamboo', 'Tekka', 'Mon Thong', 'Golden Pillow',
    'Kasap', 'Butter King', 'D13', 'D1', 'D17', 'D88',
    'Ganghai', 'S17', 'Hor Lor', 'D163', 'D162', 'D175', 'Red Flesh',
    'Kampung Durian', 'Tawa', 'MDUR88', 'D78', 'D144', 'D160', 'Lohat',
    'Kanyao', 'Chanee', 'Jiang Hai', 'Lao Tai Po',
    'Tupai King', 'Squirrel King', 'D200'
  ];
  for (const variety of fruitVarietySignals) {
    it(`accepts a stall with "${variety}" in a review`, () => {
      const v = {
        name: 'Generic Durian Stall',
        primaryType: 'meal_takeaway',
        reviews: [{ text: `Their ${variety} was the best this season` }]
      };
      expect(sm.isRelevant(v, 'durian')).toBe(true);
    });
  }
});

describe('special-mode — v0.61.225 dessert catalogue (DURIAN_PASTRY)', () => {
  // Operator's 41-item dessert/drink/cake list. Name match alone — no
  // primaryType reject — must surface for the pastry mode.
  const pastryItems = [
    'Durian Mousse', 'Durian Puffs', 'Durian Crepes', 'Durian Ice Cream',
    'Durian Chendol', 'Durian Cake', 'Durian Mochi', 'Durian Pengat',
    'Durian Mooncake', 'Durian Swiss Roll', 'Durian Tart', 'Durian Pizza',
    'Durian Ice Kacang', 'Durian Milkshake', 'Durian Smoothie',
    'Durian Coffee', 'Durian Macarons', 'Durian Kueh Lapis',
    'Durian Waffles', 'Durian Strudel', 'Durian Souffle',
    'Durian Pudding', 'Durian Coconut Shake', 'Durian Egg Tart',
    'Durian Basque Burnt Cheesecake', 'Durian Choux Pastry',
    'Durian Croissant', 'Durian Kaya Toast', 'Durian Goreng',
    'Durian Bingsoo', 'Durian Soft Serve', 'Durian Mille Crepe Cake',
    'Durian Snowy Mooncake', 'Durian Milk Tea', 'Durian Sago',
    'Durian Sticky Rice', 'Durian Swiss Tart', 'Durian Eclair',
    'Durian Pancake', 'Durian Frappuccino'
  ];
  for (const item of pastryItems) {
    it(`accepts a cafe named "${item}"`, () => {
      const v = { name: `${item} House`, primaryType: 'bakery' };
      expect(sm.isRelevant(v, 'durian-pastry')).toBe(true);
    });
  }
});

describe('special-mode — v0.61.225 pastry names REJECTED from DURIAN', () => {
  // Every operator-list pastry name must drop out of the DURIAN
  // (fruit-only) mode via NAME_REJECT_PATTERNS — even if "durian" is
  // in the name and the venue is meal_takeaway.
  const pastryNames = [
    'Durian Mousse Bar',
    'Durian Bingsoo Cafe',
    'Durian Mille Crepe Heaven',
    'Durian Ice Kacang Spot',
    'Durian Chendol Stall',
    'Durian Goreng Hut',
    'Durian Croissant Bakery',
    'Durian Egg Tart Shop',
    'Durian Frappuccino Express',
    'Durian Sago Bowl',
    'Durian Macaron Lab',
    'Durian Soft Serve Truck',
    'Durian Kaya Toast Place',
    'Durian Mooncake Boutique'
  ];
  for (const name of pastryNames) {
    it(`rejects "${name}" from DURIAN`, () => {
      expect(sm.isRelevant({ name, primaryType: 'meal_takeaway' }, 'durian')).toBe(false);
    });
  }
});

// v0.61.377 — operator: include translated locale text so durian / fruit
// venues named only in Japanese / Korean / Thai / traditional-Chinese
// (JP / KR / TH / TW) aren't dropped by the relevance filter.
describe('special-mode — local-locale keyword coverage (v0.61.377)', () => {
  const durianKept = [
    { name: 'ドリアン専門店', primaryType: 'food_store', locale: 'ja' },       // Japanese
    { name: '두리안 가게', primaryType: 'food_store', locale: 'ko' },          // Korean
    { name: 'ทุเรียนหมอนทอง', primaryType: 'market', locale: 'th' },          // Thai (Monthong durian)
    { name: '榴槤大王', primaryType: 'food_store', locale: 'zh-TW (榴槤)' },    // Taiwan traditional
    { name: '榴蓮世家', primaryType: 'fruit_and_vegetable_store', locale: 'zh-TW (榴蓮)' },
  ];
  for (const c of durianKept) {
    it(`DURIAN keeps ${c.locale} "${c.name}"`, () => {
      expect(sm.isRelevant({ name: c.name, primaryType: c.primaryType }, 'durian')).toBe(true);
    });
  }

  const fruitsKept = [
    { name: 'フルーツショップ', primaryType: 'market', locale: 'ja (フルーツ)' },
    { name: '果物市場', primaryType: 'market', locale: 'ja (果物)' },
    { name: '과일 가게', primaryType: 'market', locale: 'ko (과일)' },
    { name: 'ร้านผลไม้สด', primaryType: 'market', locale: 'th (ผลไม้)' },
  ];
  for (const c of fruitsKept) {
    it(`FRUITS keeps ${c.locale} "${c.name}"`, () => {
      expect(sm.isRelevant({ name: c.name, primaryType: c.primaryType }, 'fruits')).toBe(true);
    });
  }

  it('DURIAN_PASTRY keeps a local-script durian dessert shop', () => {
    expect(sm.isRelevant({ name: 'ドリアンケーキ専門店', primaryType: 'bakery' }, 'durian-pastry')).toBe(true);
    expect(sm.isRelevant({ name: '榴槤泡芙', primaryType: 'cafe' }, 'durian-pastry')).toBe(true);
  });

  it('still drops a non-durian local venue (no over-match)', () => {
    // Japanese "fruit" word must NOT pull a generic Japanese bakery into DURIAN.
    expect(sm.isRelevant({ name: 'パン屋さん', primaryType: 'bakery' }, 'durian')).toBe(false);
    // A Thai noodle stall is not a fruit seller.
    expect(sm.isRelevant({ name: 'ก๋วยเตี๋ยว', primaryType: 'food_court' }, 'fruits')).toBe(false);
  });

  it('recency review counter recognises a Thai durian mention', () => {
    const recent = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(); // ~1 month ago
    const venue = {
      name: 'ร้านขายผลไม้',                    // generic "fruit shop" name (no durian word)
      primaryType: 'food_store',
      reviews: [
        { text: 'ทุเรียน อร่อยมาก', publishTime: recent },   // "durian very tasty"
        { text: 'ทุเรียน สดใหม่', publishTime: recent },      // "durian fresh"
      ],
    };
    // food_store is canonical-for-reviews; 2 recent Thai durian mentions → kept.
    expect(sm.isRelevant(venue, 'durian')).toBe(true);
  });
});

// v0.62.19 — "Durian Fruits" type-priority ranking (DURIAN mode only).
describe('special-mode — durianTypeTier (fruit sellers page first)', () => {
  it('fruit sellers → tier 0', () => {
    for (const t of ['fruit_and_vegetable_store', 'fruit_parlor', 'fresh_fruit_store', 'produce_market', 'greengrocer', 'market']) {
      expect(sm.durianTypeTier({ primaryType: t })).toBe(0);
    }
  });
  it('durian-themed eateries → tier 2 (ranked last)', () => {
    for (const t of ['restaurant', 'asian_restaurant', 'chinese_restaurant', 'diner', 'cafe', 'bakery']) {
      expect(sm.durianTypeTier({ primaryType: t })).toBe(2);
    }
  });
  it('neutral / generic stores → tier 1', () => {
    for (const t of ['food_store', 'store', 'meal_takeaway', 'food', 'xyz']) {
      expect(sm.durianTypeTier({ primaryType: t })).toBe(1);
    }
    expect(sm.durianTypeTier({})).toBe(1);
    expect(sm.durianTypeTier(null)).toBe(1);
  });
  it('orders a mixed pool fruit-first, eatery-last', () => {
    const pool = [
      { name: 'Durian Cafe', primaryType: 'cafe' },
      { name: 'Fresh Durian Stall', primaryType: 'fruit_and_vegetable_store' },
      { name: 'Durian Takeaway', primaryType: 'meal_takeaway' },
    ];
    const ordered = [...pool].sort((a, b) => sm.durianTypeTier(a) - sm.durianTypeTier(b));
    expect(ordered.map((v) => v.name)).toEqual(['Fresh Durian Stall', 'Durian Takeaway', 'Durian Cafe']);
  });
});
