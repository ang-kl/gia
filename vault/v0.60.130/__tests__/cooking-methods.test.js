// __tests__/cooking-methods.test.js — v0.60.129
//
// Validates the COOKING_METHODS dictionary + findCookingMethod /
// findCookingMethodMatches matcher.
//
// v0.60.129 — the dict is now a union of the hand-curated chef-English
// baseline (70 cuisines × 30 methods) AND the operator-authored verbatim
// vocabulary parsed from `data/cooking method reference by cuisine.md`
// (~24 additional cuisine slugs + traditional terms like tadka, agemono,
// wok hei merged into existing entries). Shape assertions are accordingly
// relaxed to floors instead of exact counts.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cm = require('../cooking-methods.js');

const BASELINE_CUISINE_COUNT = 70;       // chef-English baseline (pre-merge)
const BASELINE_METHODS_PER_CUISINE = 30; // chef-English baseline (pre-merge)

describe('COOKING_METHODS — shape', () => {
  it(`covers at least ${BASELINE_CUISINE_COUNT} cuisines (baseline + .md additions)`, () => {
    expect(cm.getCuisineSlugs().length).toBeGreaterThanOrEqual(BASELINE_CUISINE_COUNT);
  });

  it('every cuisine has a meaningful method list (≥ 20) after the .md merge', () => {
    // Floor is 20 (not 30) because new cuisines coming only from the .md
    // — e.g. European, Dessert, Taiwanese — lose a handful of entries to
    // the bare-common-verb stoplist (steaming, smoking, …) at merge time.
    const offenders = [];
    for (const slug of cm.getCuisineSlugs()) {
      const methods = cm.getMethodsForCuisine(slug);
      if (!Array.isArray(methods) || methods.length < 20) {
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

  it(`total entries ≥ baseline 70 × 30 = 2100 (more after .md merge)`, () => {
    let total = 0;
    for (const slug of cm.getCuisineSlugs()) {
      total += cm.getMethodsForCuisine(slug).length;
    }
    expect(total).toBeGreaterThanOrEqual(BASELINE_CUISINE_COUNT * BASELINE_METHODS_PER_CUISINE);
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

// ─────────────────────────────────────────────────────────────────────
// v0.60.129 — operator-authored .md merge
// ─────────────────────────────────────────────────────────────────────

describe('COOKING_METHODS — .md merge', () => {
  it('parses the .md and exposes the label→slug map', () => {
    expect(cm._MD_LABEL_TO_SLUG).toBeTruthy();
    expect(cm._MD_LABEL_TO_SLUG['Sichuan']).toBe('sichuanese');
    expect(cm._MD_LABEL_TO_SLUG['Hong Kong']).toBe('hong-kong');
    expect(cm._MD_LABEL_TO_SLUG['Northeastern Chinese']).toBe('northeastern-chinese');
    const parsed = cm._parseCookingMethodsMd();
    expect(Object.keys(parsed).length).toBeGreaterThan(60);
    expect(parsed.Japanese).toContain('agemono');
    expect(parsed.Singaporean.some((m) => /wok hei/i.test(m))).toBe(true);
  });

  it('adds the new .md-only cuisines to the dict', () => {
    for (const slug of ['hokkien', 'teochew', 'hainanese', 'hakka', 'shanghainese',
                        'hunan', 'northeastern-chinese', 'northwestern-chinese',
                        'hong-kong', 'macau', 'taiwanese', 'bengali', 'gujarati',
                        'jordanian', 'uzbek', 'eurasian', 'dessert', 'fusion',
                        'european', 'mediterranean', 'australasia']) {
      const methods = cm.getMethodsForCuisine(slug);
      expect(Array.isArray(methods), `expected slug "${slug}" to be present`).toBe(true);
      expect(methods.length, `"${slug}" should have a non-trivial method list`).toBeGreaterThanOrEqual(15);
    }
  });

  it('preserves the baseline chef-English vocabulary alongside the .md additions', () => {
    // French baseline included 'flambage' — still findable.
    expect(cm.getMethodsForCuisine('french')).toContain('flambage');
    // Japanese baseline 'agemono' — still findable.
    expect(cm.getMethodsForCuisine('japanese')).toContain('agemono');
    // Caribbean (.md doesn't have it) still intact.
    expect(cm.getMethodsForCuisine('caribbean').length).toBeGreaterThanOrEqual(30);
  });

  it('drops bare common-verb single-token tokens during the merge (no false-match regression)', () => {
    // The .md ships bare "steaming" / "smoking" / "pickling" entries on
    // many cuisines. As single-token entries they'd false-match anything
    // (the matcher does userText.includes(token)). The merge stoplist
    // filters them so the existing matcher behaviour is preserved.
    // "steaming" alone stays null (existing baseline test).
    expect(cm.findCookingMethod('steaming')).toBeNull();
    // "jerk smoking" still resolves to Caribbean (multi-token "jerk
    // smoking" wins), not to a cuisine whose .md added bare "smoking".
    const jerk = cm.findCookingMethod('jerk smoking');
    expect(jerk?.slug).toBe('caribbean');
  });
});

describe('findCookingMethodMatches — multi-cuisine pivot', () => {
  it('returns an array', () => {
    expect(Array.isArray(cm.findCookingMethodMatches('tadka'))).toBe(true);
    expect(Array.isArray(cm.findCookingMethodMatches('xyzzy'))).toBe(true);
  });

  it('surfaces multiple cuisines for a shared traditional term', () => {
    // tadka appears in South / North Indian / Pakistani.
    const tadka = cm.findCookingMethodMatches('tadka').map((m) => m.slug);
    expect(tadka.length).toBeGreaterThanOrEqual(2);
    expect(tadka).toContain('south-indian');
    expect(tadka).toContain('north-indian');
  });

  it('surfaces multiple cuisines for a shared umbrella term', () => {
    // wok hei is shared across Singaporean / Cantonese / Sichuanese / HK / etc.
    const wokHei = cm.findCookingMethodMatches('wok hei').map((m) => m.slug);
    expect(wokHei.length).toBeGreaterThanOrEqual(3);
    expect(wokHei).toContain('singaporean');
    expect(wokHei).toContain('cantonese');
  });

  it('returns a single match for cuisine-unique terms', () => {
    const agemono = cm.findCookingMethodMatches('agemono');
    expect(agemono).toHaveLength(1);
    expect(agemono[0].slug).toBe('japanese');
    const flambage = cm.findCookingMethodMatches('flambage').map((m) => m.slug);
    expect(flambage).toContain('french');
  });

  it('returns an empty array on no match / short / blank input', () => {
    expect(cm.findCookingMethodMatches('xyzzy')).toEqual([]);
    expect(cm.findCookingMethodMatches('')).toEqual([]);
    expect(cm.findCookingMethodMatches('  ')).toEqual([]);
    expect(cm.findCookingMethodMatches('ab')).toEqual([]);
  });

  it('dedupes by slug (one entry per cuisine even when many methods match)', () => {
    const r = cm.findCookingMethodMatches('grilling charcoal');
    const slugs = r.map((m) => m.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('findCookingMethod remains the first hit (backward-compat)', () => {
    const matches = cm.findCookingMethodMatches('tadka');
    const single = cm.findCookingMethod('tadka');
    expect(single?.slug).toBe(matches[0]?.slug);
  });
});
