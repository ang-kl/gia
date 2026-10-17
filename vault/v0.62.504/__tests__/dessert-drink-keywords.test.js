// __tests__/dessert-drink-keywords.test.js — v0.60.131

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const dd = require('../dessert-drink-keywords.js');

describe('looksLikeDessertOrDrink — matches', () => {
  it('curated dessert names', () => {
    for (const t of ['chiffon cake', 'pandan chiffon cake', 'ondeh ondeh', 'ang ku kueh', 'kueh salat',
                     'swiss roll', 'egg tart', 'tau huay', 'chendol', 'ice kacang', 'mango sago',
                     'kaya toast', 'durian puff', 'bingsu', 'macaron']) {
      const r = dd.looksLikeDessertOrDrink(t);
      expect(r, `"${t}" should match`).not.toBeNull();
      expect(r.kind).toBe('dessert');
    }
  });

  it('curated drink names', () => {
    for (const t of ['kopi', 'kopi o', 'teh tarik', 'milo dinosaur', 'bubble tea', 'matcha latte',
                     'iced lemon tea', 'sugar cane juice', 'flat white', 'mango lassi']) {
      const r = dd.looksLikeDessertOrDrink(t);
      expect(r, `"${t}" should match`).not.toBeNull();
      expect(r.kind).toBe('drink');
    }
  });

  it('suffix heuristic for cake/tart/waffle/… and latte/frappe/…', () => {
    expect(dd.looksLikeDessertOrDrink('ube cake')?.kind).toBe('dessert');
    expect(dd.looksLikeDessertOrDrink('apple tart')?.kind).toBe('dessert');
    expect(dd.looksLikeDessertOrDrink('strawberry waffle')?.kind).toBe('dessert');
    expect(dd.looksLikeDessertOrDrink('hojicha latte')?.kind).toBe('drink');
    expect(dd.looksLikeDessertOrDrink('mango smoothie')?.kind).toBe('drink');
  });

  it('returns venueKeywords + primaryTypes for ranking', () => {
    const r = dd.looksLikeDessertOrDrink('chiffon cake');
    expect(Array.isArray(r.venueKeywords)).toBe(true);
    expect(r.venueKeywords).toContain('bakery');
    expect(Array.isArray(r.primaryTypes)).toBe(true);
    expect(r.primaryTypes).toContain('bakery');
  });
});

describe('looksLikeDessertOrDrink — does NOT match savoury dishes / nonsense / over-long', () => {
  it('savoury dishes return null', () => {
    for (const t of ['ramen', 'pizza', 'laksa', 'nasi lemak', 'char kway teow', 'fish and chips',
                     'hainanese chicken rice', 'beef wellington', 'tom yum']) {
      expect(dd.looksLikeDessertOrDrink(t), `"${t}" should be null`).toBeNull();
    }
  });

  it('blank / over-long input', () => {
    expect(dd.looksLikeDessertOrDrink('')).toBeNull();
    expect(dd.looksLikeDessertOrDrink('   ')).toBeNull();
    expect(dd.looksLikeDessertOrDrink('a really long sentence that is definitely not a dessert name at all')).toBeNull();
  });
});

describe('dessertDrinkQuery', () => {
  it('bare term → "<term> bakery cafe Singapore" (dessert) / "<term> cafe Singapore" (drink)', () => {
    expect(dd.dessertDrinkQuery(dd.looksLikeDessertOrDrink('chiffon cake'), '')).toBe('chiffon cake bakery cafe Singapore');
    expect(dd.dessertDrinkQuery(dd.looksLikeDessertOrDrink('kopi'), '')).toBe('kopi cafe Singapore');
  });

  it('prepends a cuisine label when given', () => {
    expect(dd.dessertDrinkQuery(dd.looksLikeDessertOrDrink('matcha cake'), 'Japanese')).toBe('Japanese matcha cake bakery cafe Singapore');
  });

  it('null hit → null', () => {
    expect(dd.dessertDrinkQuery(null, 'Japanese')).toBeNull();
  });

  it('caps the query at 80 chars', () => {
    const r = dd.dessertDrinkQuery(dd.looksLikeDessertOrDrink('chiffon cake'), 'A'.repeat(120));
    expect(r.length).toBeLessThanOrEqual(80);
  });
});
