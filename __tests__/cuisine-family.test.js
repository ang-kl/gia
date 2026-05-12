// __tests__/cuisine-family.test.js — v0.60.135

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cf = require('../cuisine-family.js');

describe('restaurantFamily', () => {
  it('maps cuisine-specific Google types to coarse families', () => {
    expect(cf.restaurantFamily('chinese_restaurant')).toBe('east-asian');
    expect(cf.restaurantFamily('japanese_restaurant')).toBe('east-asian');
    expect(cf.restaurantFamily('korean_restaurant')).toBe('east-asian');
    expect(cf.restaurantFamily('thai_restaurant')).toBe('southeast-asian');
    expect(cf.restaurantFamily('indian_restaurant')).toBe('south-asian');
    expect(cf.restaurantFamily('german_restaurant')).toBe('european');
    expect(cf.restaurantFamily('italian_restaurant')).toBe('european');
    expect(cf.restaurantFamily('mexican_restaurant')).toBe('latin');
    expect(cf.restaurantFamily('turkish_restaurant')).toBe('middle-eastern');
    expect(cf.restaurantFamily('african_restaurant')).toBe('african');
  });
  it('returns null for non-cuisine / unknown types', () => {
    for (const t of ['restaurant', 'cafe', 'bar', 'bakery', 'pizza_restaurant', 'hamburger_restaurant', 'seafood_restaurant', 'fine_dining_restaurant', 'meal_takeaway', '', null, undefined, 'made_up_restaurant']) {
      expect(cf.restaurantFamily(t)).toBeNull();
    }
  });
});

describe('cuisineFamily', () => {
  it('classifies catalogue / R.E.D cuisine labels', () => {
    expect(cf.cuisineFamily('European')).toBe('european');
    expect(cf.cuisineFamily('Czech')).toBe('european');
    expect(cf.cuisineFamily('Hungarian')).toBe('european');
    expect(cf.cuisineFamily('Slavic')).toBe('european');
    expect(cf.cuisineFamily('Cantonese')).toBe('east-asian');
    expect(cf.cuisineFamily('Sichuanese')).toBe('east-asian');
    expect(cf.cuisineFamily('Japanese')).toBe('east-asian');
    expect(cf.cuisineFamily('Thai')).toBe('southeast-asian');
    expect(cf.cuisineFamily('Peranakan')).toBe('southeast-asian');
    expect(cf.cuisineFamily('Persian')).toBe('middle-eastern');
    expect(cf.cuisineFamily('Mexican')).toBe('latin');
    expect(cf.cuisineFamily('Argentinian')).toBe('latin');
    expect(cf.cuisineFamily('Ethiopian')).toBe('african');
  });
  it('returns null for broad umbrellas and unknowns', () => {
    for (const c of ['Fusion', 'Modern', 'International', 'Western', 'Asian', 'Continental', 'Halal', '', null, 'Zogzog']) {
      expect(cf.cuisineFamily(c)).toBeNull();
    }
  });
});

describe('isLikelyMismatch', () => {
  it('flags a confident cuisine-family contradiction', () => {
    // the operator's screenshot: a Chinese dumpling house surfaced for
    // "Czech guláš with bread dumplings" (cuisine "European").
    expect(cf.isLikelyMismatch('chinese_restaurant', 'European')).toBe(true);
    expect(cf.isLikelyMismatch('japanese_restaurant', 'European')).toBe(true);
    expect(cf.isLikelyMismatch('mexican_restaurant', 'European')).toBe(true);
    expect(cf.isLikelyMismatch('italian_restaurant', 'Mexican')).toBe(true);
    expect(cf.isLikelyMismatch('chinese_restaurant', 'Thai')).toBe(true);
  });
  it('does NOT flag same-family or within-coarse-family pairs', () => {
    expect(cf.isLikelyMismatch('german_restaurant', 'European')).toBe(false);   // German ⊂ European
    expect(cf.isLikelyMismatch('italian_restaurant', 'Italian')).toBe(false);
    expect(cf.isLikelyMismatch('korean_restaurant', 'Japanese')).toBe(false);   // both east-asian (coarse on purpose)
    expect(cf.isLikelyMismatch('chinese_restaurant', 'Cantonese')).toBe(false);
    expect(cf.isLikelyMismatch('thai_restaurant', 'Vietnamese')).toBe(false);
  });
  it('never flags when either side has no known family (conservative default)', () => {
    expect(cf.isLikelyMismatch('restaurant', 'European')).toBe(false);          // generic type
    expect(cf.isLikelyMismatch('cafe', 'Japanese')).toBe(false);
    expect(cf.isLikelyMismatch('chinese_restaurant', 'Fusion')).toBe(false);    // umbrella cuisine
    expect(cf.isLikelyMismatch('chinese_restaurant', null)).toBe(false);
    expect(cf.isLikelyMismatch('', 'European')).toBe(false);
    expect(cf.isLikelyMismatch(null, 'European')).toBe(false);
  });
});

describe('venuePlausiblyServes (v0.60.136)', () => {
  const goulash = 'Czech guláš with bread dumplings';
  it('the "/s goulash dumpling" screenshot: only the Slavic place is plausible; the dumpling shops / microbrewery are not', () => {
    const above = (name, primaryType = 'restaurant') => cf.venuePlausiblyServes({ name, primaryType }, { cuisineName: 'European', dishPhrase: goulash });
    expect(above('Kapitan Restaurant | Authentic Slavic Cuisine - Maxwell Chambers')).toBe(true);
    expect(above('Hua Jie Dumpling')).toBe(false);
    expect(above('JIA HE XING Dumplings')).toBe(false);
    expect(above('Dumpling Darlings (Circular Rd)')).toBe(false);
    expect(above('Dumpling Darlings (Limay Street)')).toBe(false);
    expect(above('Hoappoda Microbrewery', 'bar')).toBe(false);
  });
  it('a confidently off-cuisine type is not plausible even if the name is bland', () => {
    expect(cf.venuePlausiblyServes({ name: 'Golden Court', primaryType: 'chinese_restaurant' }, { cuisineName: 'European', dishPhrase: goulash })).toBe(false);
  });
  it('a same-family Google type IS plausible (no name signal needed)', () => {
    expect(cf.venuePlausiblyServes({ name: 'Ippudo', primaryType: 'japanese_restaurant' }, { cuisineName: 'Japanese', dishPhrase: 'ramen' })).toBe(true);
    expect(cf.venuePlausiblyServes({ name: 'Brotzeit Stanley', primaryType: 'german_restaurant' }, { cuisineName: 'Austrian', dishPhrase: 'schnitzel soufflé-frying' })).toBe(true);
  });
  it('a name carrying a distinctive dish word IS plausible', () => {
    expect(cf.venuePlausiblyServes({ name: 'Ramen Keisuke Lobster King', primaryType: 'restaurant' }, { cuisineName: 'Japanese', dishPhrase: 'ramen' })).toBe(true);
    expect(cf.venuePlausiblyServes({ name: 'Schnitzel Haus Wolfgang Ranner', primaryType: 'restaurant' }, { cuisineName: 'Austrian', dishPhrase: 'schnitzel soufflé-frying' })).toBe(true);
  });
  it('matching only a generic word (dumpling / bread / fried / restaurant) is NOT a signal', () => {
    expect(cf.venuePlausiblyServes({ name: 'Best Dumpling Restaurant', primaryType: 'restaurant' }, { cuisineName: 'European', dishPhrase: goulash })).toBe(false);
  });
  it('umbrella / unknown dish cuisine → never demotes (returns true)', () => {
    expect(cf.venuePlausiblyServes({ name: 'Anything', primaryType: 'chinese_restaurant' }, { cuisineName: 'Fusion', dishPhrase: 'x' })).toBe(true);
    expect(cf.venuePlausiblyServes({ name: 'Anything', primaryType: 'chinese_restaurant' }, { cuisineName: null, dishPhrase: 'x' })).toBe(true);
  });
});

describe('distinctiveDishWords / familyDemonyms', () => {
  it('strips generic food / prep / boilerplate words', () => {
    expect(cf.distinctiveDishWords('Czech guláš with bread dumplings')).toEqual(['czech', 'gulas']);
    expect(cf.distinctiveDishWords('schnitzel soufflé-frying')).toEqual(['schnitzel', 'souffle']);
    expect(cf.distinctiveDishWords('best fried rice restaurant Singapore')).toEqual([]);
  });
  it('exposes per-family demonym lists', () => {
    expect(cf.familyDemonyms('european')).toContain('slavic');
    expect(cf.familyDemonyms('european')).toContain('czech');
    expect(cf.familyDemonyms('east-asian')).toContain('japanese');
    expect(cf.familyDemonyms('made-up')).toEqual([]);
  });
});
