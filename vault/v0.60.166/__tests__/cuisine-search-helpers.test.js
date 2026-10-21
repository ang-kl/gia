// __tests__/cuisine-search-helpers.test.js — covers chain-filter
// (v0.30.6 defense-in-depth) and clamp.

import { describe, it, expect } from 'vitest';

const FAST_FOOD_CHAIN_PATTERNS = [
  /\bmcdonald'?s?\b/i,
  /\bkfc\b/i,
  /\bsubway\b/i,
  /\bburger king\b/i,
  /\bstarbucks\b/i,
  /\bcoffee bean(?:\s*&?\s*tea leaf)?\b/i,
  /\bdomino'?s?(?: pizza)?\b/i,
  /\bpizza hut\b/i,
  /\bjollibee\b/i,
  /\btexas chicken\b/i,
  /\bwendy'?s?\b/i,
  /\bpopeye'?s?\b/i,
  /\bshake shack\b/i,
  /\bfive guys\b/i,
  /\btaco bell\b/i,
  /\blong john silver'?s?\b/i,
  /\bcarl'?s? jr\b/i
];

function isFastFoodChain(name) {
  if (!name) return false;
  return FAST_FOOD_CHAIN_PATTERNS.some((re) => re.test(name));
}

describe('isFastFoodChain', () => {
  it('matches McDonald variants (case + apostrophe insensitive)', () => {
    expect(isFastFoodChain("McDonald's")).toBe(true);
    expect(isFastFoodChain('mcdonalds')).toBe(true);
    expect(isFastFoodChain('McDonald')).toBe(true);
    expect(isFastFoodChain('MCDONALDS @ ION')).toBe(true);
  });

  it('matches Coffee Bean & Tea Leaf and shorter variants', () => {
    expect(isFastFoodChain('The Coffee Bean & Tea Leaf')).toBe(true);
    expect(isFastFoodChain('Coffee Bean')).toBe(true);
    expect(isFastFoodChain('coffee bean & tea leaf')).toBe(true);
  });

  it('matches each chain in the list', () => {
    for (const name of ['KFC', 'Subway', 'Burger King', 'Starbucks', 'Pizza Hut', 'Jollibee', 'Texas Chicken', "Domino's Pizza", 'Five Guys', 'Taco Bell']) {
      expect(isFastFoodChain(name)).toBe(true);
    }
  });

  it('does NOT drop SG-local chains the user might want', () => {
    expect(isFastFoodChain('Toast Box')).toBe(false);
    expect(isFastFoodChain('Ya Kun')).toBe(false);
    expect(isFastFoodChain('Killiney Kopitiam')).toBe(false);
    expect(isFastFoodChain('Old Chang Kee')).toBe(false);
  });

  it('does NOT drop venues that contain a chain word as substring (regex \\b boundary)', () => {
    expect(isFastFoodChain('McDonaldsworth Bakery')).toBe(false);
    expect(isFastFoodChain('Subwayful Eats')).toBe(false);
  });

  it('returns false for empty / null', () => {
    expect(isFastFoodChain('')).toBe(false);
    expect(isFastFoodChain(null)).toBe(false);
    expect(isFastFoodChain(undefined)).toBe(false);
  });
});

function clamp(n, lo, hi) {
  const x = Number(n);
  if (!Number.isFinite(x)) return lo;
  return Math.max(lo, Math.min(hi, x));
}

describe('clamp', () => {
  it('clamps below to lo', () => { expect(clamp(50, 200, 5000)).toBe(200); });
  it('clamps above to hi', () => { expect(clamp(99999, 200, 5000)).toBe(5000); });
  it('keeps value in range', () => { expect(clamp(1000, 200, 5000)).toBe(1000); });
  it('returns lo for non-numeric', () => { expect(clamp(NaN, 200, 5000)).toBe(200); });
  it('returns lo for null/undefined', () => {
    expect(clamp(null, 200, 5000)).toBe(200);
    expect(clamp(undefined, 200, 5000)).toBe(200);
  });
});
