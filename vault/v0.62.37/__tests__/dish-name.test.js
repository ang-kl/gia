// __tests__/dish-name.test.js — v0.60.209
//
// The shared dish-name guard behind every "Try" line. The operator
// flagged "Try: dishes" — a bare category word leaking onto a card.

import { describe, it, expect } from 'vitest';
import { isDishName, filterDishNames, CATEGORY_RE } from '../dish-name.js';

describe('isDishName — accepts genuine dish/dessert names', () => {
  for (const name of [
    'Beef Wellington', 'Truffle Risotto', 'Carbonara', 'Tiramisu',
    'Char Kway Teow', 'Bak Chor Mee', 'Hainanese Chicken Rice',
    'Tandoori Chicken', 'Laksa', 'Dessert Platter', 'Combo Set',
    'Fish Head Curry', 'Special Fried Rice'
  ]) {
    it(`accepts "${name}"`, () => expect(isDishName(name)).toBe(true));
  }
});

describe('isDishName — rejects bare category words', () => {
  for (const word of [
    'dish', 'dishes', 'Dishes', 'DISHES', 'food', 'foods', 'desserts',
    'dessert', 'mains', 'sides', 'meat', 'gravy', 'chocolates',
    'drinks', 'restaurant', 'menu', 'specials', 'starters', 'cuisine'
  ]) {
    it(`rejects "${word}"`, () => expect(isDishName(word)).toBe(false));
  }
});

describe('isDishName — rejects fragments and bad input', () => {
  it('rejects a trailing-stop-word fragment', () => {
    expect(isDishName('desserts which')).toBe(false);
    expect(isDishName('the chicken was')).toBe(false);
    // v0.60.222 — interrogatives: a review-regex capture leaked
    // "<venue name> and what" onto a Try line.
    expect(isDishName('Restaurant Fiz and what')).toBe(false);
    expect(isDishName('the noodles how')).toBe(false);
  });
  it('rejects too-short / too-long strings', () => {
    expect(isDishName('ab')).toBe(false);
    expect(isDishName('x'.repeat(41))).toBe(false);
  });
  it('rejects non-strings and blanks', () => {
    expect(isDishName(null)).toBe(false);
    expect(isDishName(undefined)).toBe(false);
    expect(isDishName(42)).toBe(false);
    expect(isDishName('   ')).toBe(false);
  });
});

describe('filterDishNames', () => {
  it('keeps only genuine names, preserving order', () => {
    expect(filterDishNames(['Carbonara', 'dishes', 'Tiramisu', 'food']))
      .toEqual(['Carbonara', 'Tiramisu']);
  });
  it('returns [] for non-arrays', () => {
    expect(filterDishNames(null)).toEqual([]);
    expect(filterDishNames('Carbonara')).toEqual([]);
  });
});

describe('CATEGORY_RE', () => {
  it('matches the operator-reported word "dishes"', () => {
    expect(CATEGORY_RE.test('dishes')).toBe(true);
  });
  it('does not match a dish name that merely contains a category word', () => {
    expect(CATEGORY_RE.test('Dessert Platter')).toBe(false);
  });
});
