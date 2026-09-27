// __tests__/pipeline-drinks-filter.test.js — v0.59.24
//
// Verifies the drinks filter. The "🍴 Try ·" recommendation must be a
// FOOD dish, not a drink. Per Human Lead 2026-05-07: applies globally
// EXCEPT for Dessert and Fusion cuisines (those legitimately surface
// drinks: chendol drinks, bandung, signature coffees, cocktails).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { DRINK_TERMS, isDrink, filterOutDrinks, shouldFilterDrinks } = require('../pipeline.js');

describe('DRINK_TERMS', () => {
  it('contains SG-Asian drinks', () => {
    expect(DRINK_TERMS).toContain('kopi');
    expect(DRINK_TERMS).toContain('teh tarik');
    expect(DRINK_TERMS).toContain('milo');
    expect(DRINK_TERMS).toContain('bandung');
  });

  it('contains Western coffees', () => {
    expect(DRINK_TERMS).toContain('latte');
    expect(DRINK_TERMS).toContain('cappuccino');
    expect(DRINK_TERMS).toContain('cold brew');
  });

  it('contains alcohol', () => {
    expect(DRINK_TERMS).toContain('beer');
    expect(DRINK_TERMS).toContain('cocktail');
    expect(DRINK_TERMS).toContain('whisky');
  });

  it('has no duplicate entries', () => {
    expect(new Set(DRINK_TERMS).size).toBe(DRINK_TERMS.length);
  });
});

describe('isDrink', () => {
  it('flags SG kopi/teh as drinks', () => {
    expect(isDrink('kopi')).toBe(true);
    expect(isDrink('Kopi-O Kosong')).toBe(true);
    expect(isDrink('Teh Tarik')).toBe(true);
    expect(isDrink('Milo Dinosaur')).toBe(true);
  });

  it('flags Western coffees as drinks', () => {
    expect(isDrink('Cold Brew Coffee')).toBe(true);
    expect(isDrink('Iced Latte')).toBe(true);
    expect(isDrink('Flat White')).toBe(true);
  });

  it('flags alcohol as drinks', () => {
    expect(isDrink('Craft Beer')).toBe(true);
    expect(isDrink('signature cocktail')).toBe(true);
    expect(isDrink('Old Fashioned')).toBe(true);
  });

  it('flags bubble tea / juices', () => {
    expect(isDrink('Taro Milk Tea')).toBe(true);
    expect(isDrink('Sugarcane Juice')).toBe(true);
    expect(isDrink('Smoothie Bowl')).toBe(true);
  });

  it('does NOT flag iconic SG food dishes', () => {
    expect(isDrink('Hainanese Chicken Rice')).toBe(false);
    expect(isDrink('Char Kway Teow')).toBe(false);
    expect(isDrink('Laksa')).toBe(false);
    expect(isDrink('Bak Kut Teh')).toBe(false); // contains 'teh' as a separate token but 'bak kut teh' is a soup
    expect(isDrink('Roti Prata')).toBe(false);
  });

  it('does NOT flag desserts that aren\'t drinks (chendol the bowl, ice kachang the bowl)', () => {
    expect(isDrink('Chendol')).toBe(false);
    expect(isDrink('Ice Kachang')).toBe(false);
    expect(isDrink('Tau Huay')).toBe(false);
  });

  it('handles empty / null safely', () => {
    expect(isDrink('')).toBe(false);
    expect(isDrink(null)).toBe(false);
    expect(isDrink(undefined)).toBe(false);
  });
});

describe('filterOutDrinks', () => {
  it('removes drinks from a mixed dish list', () => {
    const out = filterOutDrinks(['Char Kway Teow', 'kopi', 'Laksa', 'teh tarik', 'Bak Kut Teh']);
    expect(out).toEqual(['Char Kway Teow', 'Laksa', 'Bak Kut Teh']);
  });

  it('returns empty when all entries are drinks', () => {
    expect(filterOutDrinks(['kopi', 'teh tarik', 'milo'])).toEqual([]);
  });

  it('passes through arrays with no drinks', () => {
    expect(filterOutDrinks(['Roti Prata', 'Chicken Rice'])).toEqual(['Roti Prata', 'Chicken Rice']);
  });

  it('handles non-array inputs without throwing', () => {
    expect(filterOutDrinks(null)).toBe(null);
    expect(filterOutDrinks(undefined)).toBe(undefined);
  });

  it('handles empty array', () => {
    expect(filterOutDrinks([])).toEqual([]);
  });
});

describe('shouldFilterDrinks', () => {
  it('returns true for the default case (no cuisines)', () => {
    expect(shouldFilterDrinks([])).toBe(true);
    expect(shouldFilterDrinks(null)).toBe(true);
    expect(shouldFilterDrinks(undefined)).toBe(true);
  });

  it('returns true for non-Dessert/Fusion cuisines', () => {
    expect(shouldFilterDrinks(['Singaporean'])).toBe(true);
    expect(shouldFilterDrinks(['Korean', 'Italian'])).toBe(true);
    expect(shouldFilterDrinks(['Japanese', 'Chinese'])).toBe(true);
  });

  it('returns false (skip filter) when Dessert is present', () => {
    expect(shouldFilterDrinks(['Dessert'])).toBe(false);
    expect(shouldFilterDrinks(['dessert'])).toBe(false); // case-insensitive
    expect(shouldFilterDrinks(['DESSERT'])).toBe(false);
    expect(shouldFilterDrinks(['Dessert', 'Korean'])).toBe(false); // mixed selection
  });

  it('returns false (skip filter) when Fusion is present', () => {
    expect(shouldFilterDrinks(['Fusion'])).toBe(false);
    expect(shouldFilterDrinks(['fusion'])).toBe(false);
    expect(shouldFilterDrinks(['Fusion', 'Italian'])).toBe(false);
  });

  it('handles word-token form (matches v0.59.21 expandSingaporeanCuisines logic)', () => {
    expect(shouldFilterDrinks(['halal Dessert'])).toBe(false); // tokenised match
    expect(shouldFilterDrinks(['vegetarian Fusion'])).toBe(false);
  });
});
