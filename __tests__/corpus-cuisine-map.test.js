// v0.62.8 — corpus-cuisine-map: FSQ category label → cuisine slug(s).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { slugsForCats, TOKEN_TO_SLUG } = require('../corpus-cuisine-map.js');
const cv = require('../cuisines-vault.js');

const VALID = new Set(cv.loadAll().map((c) => c.slug));

describe('slugsForCats', () => {
  it('maps a Japanese FSQ path to [japanese]', () => {
    expect(slugsForCats(['Dining and Drinking > Restaurant > Asian Restaurant > Japanese Restaurant'])).toEqual(['japanese']);
  });
  it('maps sushi/ramen leaves to japanese', () => {
    expect(slugsForCats(['Sushi Restaurant'])).toEqual(['japanese']);
    expect(slugsForCats(['Ramen Restaurant'])).toEqual(['japanese']);
  });
  it('South Indian → south-indian ONLY (generic "indian" is consumed)', () => {
    expect(slugsForCats(['South Indian Restaurant'])).toEqual(['south-indian']);
  });
  it('North Indian → north-indian ONLY', () => {
    expect(slugsForCats(['North Indian Restaurant'])).toEqual(['north-indian']);
  });
  it('bare Indian → north-indian (default)', () => {
    expect(slugsForCats(['Indian Restaurant'])).toEqual(['north-indian']);
  });
  it('Thai + Som Tum both → thai (deduped)', () => {
    expect(slugsForCats(['Thai Restaurant', 'Som Tum Restaurant'])).toEqual(['thai']);
  });
  it('Dim Sum → cantonese', () => {
    expect(slugsForCats(['Dim Sum Restaurant'])).toEqual(['cantonese']);
  });
  it('generic / non-cuisine leaves → [] (kept for browse, no cuisine filter)', () => {
    expect(slugsForCats(['Restaurant'])).toEqual([]);
    expect(slugsForCats(['Noodle Restaurant'])).toEqual([]);
    expect(slugsForCats(['Seafood Restaurant'])).toEqual([]);
    expect(slugsForCats(['Vegetarian / Vegan Restaurant'])).toEqual([]);
  });
  it('handles empty / junk input', () => {
    expect(slugsForCats([])).toEqual([]);
    expect(slugsForCats(null)).toEqual([]);
    expect(slugsForCats(['Dining and Drinking'])).toEqual([]);
  });
  it('every mapped slug is a real cuisines-vault slug', () => {
    for (const slug of Object.values(TOKEN_TO_SLUG)) {
      expect(VALID.has(slug), `mapped slug "${slug}" must exist in cuisines-vault`).toBe(true);
    }
  });
});
