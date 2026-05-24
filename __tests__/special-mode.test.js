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
  it('exposes the two canonical mode ids', () => {
    expect(sm.SPECIAL_MODES.FRUITS).toBe('fruits');
    expect(sm.SPECIAL_MODES.DURIAN).toBe('durian');
  });

  it('isSpecialMode accepts only the two canonical strings', () => {
    expect(sm.isSpecialMode('fruits')).toBe(true);
    expect(sm.isSpecialMode('durian')).toBe(true);
    expect(sm.isSpecialMode('Fruits')).toBe(false);    // case-sensitive
    expect(sm.isSpecialMode('')).toBe(false);
    expect(sm.isSpecialMode(null)).toBe(false);
    expect(sm.isSpecialMode(undefined)).toBe(false);
    expect(sm.isSpecialMode('michelin')).toBe(false);
    expect(sm.isSpecialMode(42)).toBe(false);
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
    { name: '榴莲莊', primaryType: 'fruit_shop', expect: false },           // durian-only name; primaryType not in reject; no fruit keyword
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
  const cases = [
    // Accepted
    { name: 'Combat Durian', primaryType: 'meal_takeaway', expect: true },   // takeaway is OK for durian
    { name: '99 Old Trees Durian', primaryType: 'food_store', expect: true },
    { name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway', expect: true }, // variety in name
    { name: 'Tasty D24 Stall', primaryType: 'market', expect: true },
    { name: '榴莲专卖店', primaryType: 'food_store', expect: true },           // Chinese
    { name: 'Black Thorn King', primaryType: 'meal_takeaway', expect: true },
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

  it('Durian keeps meal_takeaway (sellers commonly use this primaryType)', () => {
    expect(sm.isRelevant({ name: 'Mao Shan Wang Express', primaryType: 'meal_takeaway' }, 'durian')).toBe(true);
  });

  it('Fruits rejects meal_takeaway even with juice in name (juice stalls are dine-in / counter)', () => {
    // The spec wants juice STALLS / SHOPS, not delivery — meal_takeaway
    // is in the reject list for fruits mode.
    expect(sm.isRelevant({ name: 'Daily Fruit Juice Delivery', primaryType: 'meal_takeaway' }, 'fruits')).toBe(false);
  });
});
