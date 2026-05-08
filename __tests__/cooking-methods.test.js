// __tests__/cooking-methods.test.js — v0.60.12
//
// Validates the COOKING_METHODS dictionary (70 cuisines × 30 methods)
// + findCookingMethod matcher.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cm = require('../cooking-methods.js');

const EXPECTED_CUISINE_COUNT = 70;
const EXPECTED_METHODS_PER_CUISINE = 30;

describe('COOKING_METHODS — shape', () => {
  it(`covers exactly ${EXPECTED_CUISINE_COUNT} cuisines`, () => {
    expect(cm.getCuisineSlugs().length).toBe(EXPECTED_CUISINE_COUNT);
  });

  it(`every cuisine has exactly ${EXPECTED_METHODS_PER_CUISINE} methods`, () => {
    const offenders = [];
    for (const slug of cm.getCuisineSlugs()) {
      const methods = cm.getMethodsForCuisine(slug);
      if (!Array.isArray(methods) || methods.length !== EXPECTED_METHODS_PER_CUISINE) {
        offenders.push(`${slug}: ${methods?.length ?? 'missing'}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('every method is a non-empty string', () => {
    for (const slug of cm.getCuisineSlugs()) {
      const methods = cm.getMethodsForCuisine(slug);
      for (const m of methods) {
        expect(typeof m).toBe('string');
        expect(m.length).toBeGreaterThan(0);
      }
    }
  });

  it('no per-cuisine duplicates (case-insensitive)', () => {
    const offenders = [];
    for (const slug of cm.getCuisineSlugs()) {
      const methods = cm.getMethodsForCuisine(slug);
      const set = new Set(methods.map((s) => s.toLowerCase()));
      if (set.size !== methods.length) offenders.push(slug);
    }
    expect(offenders).toEqual([]);
  });

  it('total entries = 70 × 30 = 2100', () => {
    let total = 0;
    for (const slug of cm.getCuisineSlugs()) {
      total += cm.getMethodsForCuisine(slug).length;
    }
    expect(total).toBe(EXPECTED_CUISINE_COUNT * EXPECTED_METHODS_PER_CUISINE);
  });
});

describe('findCookingMethod — single-word substring match', () => {
  it('"flambage" → French', () => {
    const r = cm.findCookingMethod('flambage');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('french');
    expect(r.term).toBe('flambage');
  });

  it('"flambage chicken" → French (substring)', () => {
    const r = cm.findCookingMethod('flambage chicken');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('french');
  });

  it('"risottare" → Italian', () => {
    const r = cm.findCookingMethod('risottare');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('italian');
  });
});

describe('findCookingMethod — multi-word all-tokens match', () => {
  it('"jerk smoking" → Caribbean', () => {
    const r = cm.findCookingMethod('jerk smoking');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('caribbean');
    expect(r.term).toBe('jerk smoking');
  });

  it('"dim sum basket-steaming" → Cantonese', () => {
    const r = cm.findCookingMethod('dim sum basket-steaming');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('cantonese');
  });

  it('order-independent: "smoking jerk" still → Caribbean', () => {
    const r = cm.findCookingMethod('smoking jerk');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('caribbean');
  });
});

describe('findCookingMethod — ordered prefix match', () => {
  it('"mohinga" → Burmese mohinga broth-building', () => {
    const r = cm.findCookingMethod('mohinga');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('burmese');
    expect(r.term).toContain('mohinga');
  });

  it('"mohinga broth" (partial) → still Burmese', () => {
    const r = cm.findCookingMethod('mohinga broth');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('burmese');
  });

  it('"tahdig" alone → Persian tahdig crusting', () => {
    const r = cm.findCookingMethod('tahdig');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('persian');
  });
});

describe('findCookingMethod — diacritic normalisation', () => {
  it('ASCII "rotissage a la broche" → French rôtissage à la broche', () => {
    const r = cm.findCookingMethod('rotissage a la broche');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('french');
    expect(r.term).toContain('rôtissage');
  });

  it('ASCII "ragu slow-simmering" → Italian ragù slow-simmering', () => {
    const r = cm.findCookingMethod('ragu slow-simmering');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('italian');
  });

  it('Accented "porkolt" → Hungarian pörkölt stewing', () => {
    const r = cm.findCookingMethod('porkolt');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('hungarian');
  });
});

describe('findCookingMethod — generic-suffix rejection', () => {
  it('"frying" alone → null (too generic; would falsely match many entries)', () => {
    expect(cm.findCookingMethod('frying')).toBeNull();
  });

  it('"simmering" alone → null', () => {
    expect(cm.findCookingMethod('simmering')).toBeNull();
  });

  it('"steaming" alone → null', () => {
    expect(cm.findCookingMethod('steaming')).toBeNull();
  });
});

describe('findCookingMethod — empty / null / unrelated', () => {
  it('empty string → null', () => {
    expect(cm.findCookingMethod('')).toBeNull();
  });

  it('null/undefined → null', () => {
    expect(cm.findCookingMethod(null)).toBeNull();
    expect(cm.findCookingMethod(undefined)).toBeNull();
  });

  it('"hello world" → null (no method match)', () => {
    expect(cm.findCookingMethod('hello world')).toBeNull();
  });
});

describe('findCookingMethod — first-cuisine-wins on collision', () => {
  it('"rendang" → Malaysian (listed first), not Indonesian', () => {
    // Both Malaysian (rendang dry-reducing) and Indonesian (rendang
    // padang reduction) curate the term. Cuisine dict insertion order
    // determines the winner.
    const r = cm.findCookingMethod('rendang');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('malaysian');
  });

  it('"rendang padang reduction" (full term) → Indonesian (specific match)', () => {
    const r = cm.findCookingMethod('rendang padang reduction');
    expect(r).toBeTruthy();
    expect(r.slug).toBe('indonesian');
  });
});

describe('slugToLabel', () => {
  it('handles simple slugs', () => {
    expect(cm.slugToLabel('french')).toBe('French');
  });

  it('handles hyphenated slugs', () => {
    expect(cm.slugToLabel('south-indian')).toBe('South Indian');
    expect(cm.slugToLabel('middle-eastern')).toBe('Middle Eastern');
    expect(cm.slugToLabel('new-zealand')).toBe('New Zealand');
    expect(cm.slugToLabel('south-african')).toBe('South African');
    expect(cm.slugToLabel('sri-lankan')).toBe('Sri Lankan');
  });
});

describe('getMethodsForCuisine', () => {
  it('returns the array for known slug', () => {
    const methods = cm.getMethodsForCuisine('japanese');
    expect(Array.isArray(methods)).toBe(true);
    expect(methods).toContain('agemono');
    expect(methods).toContain('teriyaki glazing');
  });

  it('returns null for unknown slug', () => {
    expect(cm.getMethodsForCuisine('atlantis')).toBeNull();
    expect(cm.getMethodsForCuisine('')).toBeNull();
    expect(cm.getMethodsForCuisine(null)).toBeNull();
  });

  it('is case-insensitive on the slug', () => {
    expect(cm.getMethodsForCuisine('FRENCH')).toBeTruthy();
    expect(cm.getMethodsForCuisine('Japanese')).toBeTruthy();
  });
});
