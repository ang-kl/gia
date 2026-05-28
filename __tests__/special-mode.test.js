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

describe('special-mode — buildSeeds', () => {
  it('Fruits seeds default to " Singapore" suffix', () => {
    const seeds = sm.buildSeeds('fruits');
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const s of seeds) expect(s.endsWith(' Singapore')).toBe(true);
    expect(seeds.some((s) => s.includes('fruit shop'))).toBe(true);
    expect(seeds.some((s) => s.includes('fruit juice'))).toBe(true);
  });

  it('Durian seeds default to " Singapore" suffix', () => {
    const seeds = sm.buildSeeds('durian');
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const s of seeds) expect(s.endsWith(' Singapore')).toBe(true);
    expect(seeds.some((s) => s.includes('durian shop'))).toBe(true);
    expect(seeds.some((s) => s.includes('durian seller'))).toBe(true);
  });

  it('regionSuffix override swaps the suffix (JB / Putrajaya)', () => {
    const jb = sm.buildSeeds('fruits', { regionSuffix: 'Johor Bahru Malaysia' });
    expect(jb.every((s) => s.endsWith(' Johor Bahru Malaysia'))).toBe(true);
    const pj = sm.buildSeeds('durian', { regionSuffix: 'Putrajaya Malaysia' });
    expect(pj.every((s) => s.endsWith(' Putrajaya Malaysia'))).toBe(true);
  });

  it('returns [] for invalid modes', () => {
    expect(sm.buildSeeds(null)).toEqual([]);
    expect(sm.buildSeeds('')).toEqual([]);
    expect(sm.buildSeeds('michelin')).toEqual([]);
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
    // Rejected — variety in name but no "durian" word (v0.61.229).
    { name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway', expect: false },
    { name: 'Black Thorn King', primaryType: 'meal_takeaway', expect: false },
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

  it('Durian REJECTS variety-only name (no "durian" word) — extraction-only role', () => {
    // v0.61.229 — variety names like "Mao Shan Wang", "Black Thorn"
    // moved OUT of KEYWORDS[DURIAN] into DURIAN_VARIETY_TERMS for
    // review-snippet extraction. A venue named only after a variety
    // (with no "durian" word) no longer satisfies the filter.
    expect(sm.isRelevant({ name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway' }, 'durian')).toBe(false);
    expect(sm.isRelevant({ name: 'Black Thorn King', primaryType: 'meal_takeaway' }, 'durian')).toBe(false);
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

  // v0.61.229 — variety-only names no longer pass DURIAN (they're
  // extraction-only signals now). See the v0.61.229 regression
  // tests in the "type rejection invariants" block above.
  it('REJECTS variety-only names (v0.61.229 update of v0.61.141 test)', () => {
    expect(sm.isRelevant({ name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway' }, 'durian')).toBe(false);
    expect(sm.isRelevant({ name: 'Black Thorn King', primaryType: 'meal_takeaway' }, 'durian')).toBe(false);
  });
});

describe('special-mode — DURIAN_PASTRY (v0.61.141)', () => {
  it('buildSeeds emits pastry-focused queries with default suffix', () => {
    const seeds = sm.buildSeeds('durian-pastry');
    expect(seeds.length).toBeGreaterThanOrEqual(3);
    for (const s of seeds) expect(s.endsWith(' Singapore')).toBe(true);
    expect(seeds.some((s) => s.includes('durian puff'))).toBe(true);
    expect(seeds.some((s) => s.includes('durian pastry'))).toBe(true);
    expect(seeds.some((s) => s.includes('durian cake'))).toBe(true);
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
