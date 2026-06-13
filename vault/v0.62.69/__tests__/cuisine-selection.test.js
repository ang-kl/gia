// __tests__/cuisine-selection.test.js — v0.61.141
//
// Unit tests for the Cuisine TMA's chip-selection mutex helper. Pins
// the operator spec (v0.61.141): Fruits / Durian / Durian Pastry are
// regular catalogue chips inside the "Dessert, Fruits" group; they
// are mutually exclusive with each other AND with every other cuisine
// (including Dessert). Tapping a non-special chip while a special is
// selected auto-clears the special (the "switch" UX from v0.61.126).

import { describe, it, expect } from 'vitest';
import {
  SPECIAL_SLUGS,
  isSpecialSlug,
  hasSpecialSlug,
  getActiveSpecialSlug,
  applyChipToggle,
  DURIAN_BELT_COUNTRIES,
  BELT_GATED_SLUGS,
  isSlugCountryAllowed
} from '../web/cuisine/src/v2/lib/cuisine-selection.js';

describe('SPECIAL_SLUGS', () => {
  it('contains exactly the three operator-defined slugs', () => {
    expect(SPECIAL_SLUGS.has('fruits')).toBe(true);
    expect(SPECIAL_SLUGS.has('durian')).toBe(true);
    expect(SPECIAL_SLUGS.has('durian-pastry')).toBe(true);
    expect(SPECIAL_SLUGS.size).toBe(3);
  });

  it('does NOT contain Dessert or other cuisines', () => {
    expect(SPECIAL_SLUGS.has('dessert')).toBe(false);
    expect(SPECIAL_SLUGS.has('italian')).toBe(false);
    expect(SPECIAL_SLUGS.has('michelin')).toBe(false);
  });
});

describe('isSpecialSlug', () => {
  it('matches the three special slugs', () => {
    expect(isSpecialSlug('fruits')).toBe(true);
    expect(isSpecialSlug('durian')).toBe(true);
    expect(isSpecialSlug('durian-pastry')).toBe(true);
  });

  it('rejects other slugs + non-strings', () => {
    expect(isSpecialSlug('dessert')).toBe(false);
    expect(isSpecialSlug('Italian')).toBe(false);
    expect(isSpecialSlug('')).toBe(false);
    expect(isSpecialSlug(null)).toBe(false);
    expect(isSpecialSlug(undefined)).toBe(false);
    expect(isSpecialSlug(42)).toBe(false);
  });
});

describe('hasSpecialSlug + getActiveSpecialSlug', () => {
  it('detects a special in selection', () => {
    expect(hasSpecialSlug(['italian', 'fruits'])).toBe(true);
    expect(getActiveSpecialSlug(['italian', 'fruits'])).toBe('fruits');
  });

  it('returns false / null when no special present', () => {
    expect(hasSpecialSlug(['italian', 'dessert'])).toBe(false);
    expect(getActiveSpecialSlug(['italian', 'dessert'])).toBeNull();
  });

  it('returns false / null for invalid input', () => {
    expect(hasSpecialSlug(null)).toBe(false);
    expect(hasSpecialSlug('not-an-array')).toBe(false);
    expect(getActiveSpecialSlug(undefined)).toBeNull();
  });
});

describe('applyChipToggle — special slug rules', () => {
  it('tapping a special when nothing selected → [special]', () => {
    expect(applyChipToggle({ slug: 'fruits', selected: [] })).toEqual(['fruits']);
    expect(applyChipToggle({ slug: 'durian', selected: [] })).toEqual(['durian']);
    expect(applyChipToggle({ slug: 'durian-pastry', selected: [] })).toEqual(['durian-pastry']);
  });

  it('tapping a special when Dessert is selected → [special] (auto-clears Dessert)', () => {
    expect(applyChipToggle({ slug: 'fruits', selected: ['dessert'] })).toEqual(['fruits']);
    expect(applyChipToggle({ slug: 'durian-pastry', selected: ['dessert'] })).toEqual(['durian-pastry']);
  });

  it('tapping a special when other cuisines selected → [special] (auto-clears everything)', () => {
    expect(applyChipToggle({ slug: 'fruits', selected: ['italian', 'japanese', 'dessert'] })).toEqual(['fruits']);
  });

  it('tapping a different special replaces (mutex among the three)', () => {
    expect(applyChipToggle({ slug: 'durian', selected: ['fruits'] })).toEqual(['durian']);
    expect(applyChipToggle({ slug: 'durian-pastry', selected: ['durian'] })).toEqual(['durian-pastry']);
    expect(applyChipToggle({ slug: 'fruits', selected: ['durian-pastry'] })).toEqual(['fruits']);
  });

  it('tapping the active special deselects it (empty selected)', () => {
    expect(applyChipToggle({ slug: 'fruits', selected: ['fruits'] })).toEqual([]);
    expect(applyChipToggle({ slug: 'durian', selected: ['durian'] })).toEqual([]);
    expect(applyChipToggle({ slug: 'durian-pastry', selected: ['durian-pastry'] })).toEqual([]);
  });
});

describe('applyChipToggle — non-special slug rules', () => {
  it('tapping a non-special when nothing selected → [slug]', () => {
    expect(applyChipToggle({ slug: 'italian', selected: [] })).toEqual(['italian']);
    expect(applyChipToggle({ slug: 'dessert', selected: [] })).toEqual(['dessert']);
  });

  it('tapping a non-special adds to selection (under MAX cap)', () => {
    expect(applyChipToggle({ slug: 'japanese', selected: ['italian'] })).toEqual(['italian', 'japanese']);
    expect(applyChipToggle({ slug: 'dessert', selected: ['italian', 'japanese'] })).toEqual(['italian', 'japanese', 'dessert']);
  });

  it('tapping the active non-special deselects it', () => {
    expect(applyChipToggle({ slug: 'italian', selected: ['italian', 'japanese'] })).toEqual(['japanese']);
  });

  it('respects the MAX cap (default 5)', () => {
    const five = ['a', 'b', 'c', 'd', 'e'];
    expect(applyChipToggle({ slug: 'f', selected: five })).toEqual(five);   // no-op
    expect(applyChipToggle({ slug: 'a', selected: five })).toEqual(['b', 'c', 'd', 'e']); // deselect still works
  });

  it('respects a custom maxSelected', () => {
    expect(applyChipToggle({ slug: 'c', selected: ['a', 'b'], maxSelected: 2 })).toEqual(['a', 'b']);
    expect(applyChipToggle({ slug: 'c', selected: ['a', 'b'], maxSelected: 3 })).toEqual(['a', 'b', 'c']);
  });
});

describe('applyChipToggle — special ↔ non-special boundary', () => {
  it('tapping Dessert when Fruits is selected → [dessert] (auto-clears Fruits)', () => {
    // Operator spec: "when selecting Fruits/Durian/Durian Pastry,
    // other cuisines including dessert cannot be selected". Symmetric
    // applies here — tapping a non-special when a special is active
    // replaces the selection rather than blocking the tap.
    expect(applyChipToggle({ slug: 'dessert', selected: ['fruits'] })).toEqual(['dessert']);
  });

  it('tapping any non-special when Durian is selected → [slug]', () => {
    expect(applyChipToggle({ slug: 'italian', selected: ['durian'] })).toEqual(['italian']);
    expect(applyChipToggle({ slug: 'michelin', selected: ['durian-pastry'] })).toEqual(['michelin']);
  });

  it('tapping Dessert + Italian both work when no special active', () => {
    let sel = [];
    sel = applyChipToggle({ slug: 'dessert', selected: sel });
    sel = applyChipToggle({ slug: 'italian', selected: sel });
    expect(sel).toEqual(['dessert', 'italian']);
  });

  it('full operator scenario walkthrough', () => {
    // Start: nothing selected
    let sel = [];
    // 1. User picks Italian + Japanese
    sel = applyChipToggle({ slug: 'italian', selected: sel });
    sel = applyChipToggle({ slug: 'japanese', selected: sel });
    expect(sel).toEqual(['italian', 'japanese']);
    // 2. User taps Fruits → everything else cleared
    sel = applyChipToggle({ slug: 'fruits', selected: sel });
    expect(sel).toEqual(['fruits']);
    // 3. User taps Durian → mutex among specials → switch
    sel = applyChipToggle({ slug: 'durian', selected: sel });
    expect(sel).toEqual(['durian']);
    // 4. User taps Durian Pastry → switch again
    sel = applyChipToggle({ slug: 'durian-pastry', selected: sel });
    expect(sel).toEqual(['durian-pastry']);
    // 5. User taps Dessert → special cleared, Dessert added
    sel = applyChipToggle({ slug: 'dessert', selected: sel });
    expect(sel).toEqual(['dessert']);
    // 6. User adds Italian → Dessert + Italian co-exist
    sel = applyChipToggle({ slug: 'italian', selected: sel });
    expect(sel).toEqual(['dessert', 'italian']);
    // 7. User taps Fruits → everything cleared, [fruits]
    sel = applyChipToggle({ slug: 'fruits', selected: sel });
    expect(sel).toEqual(['fruits']);
    // 8. User taps Fruits again → deselect
    sel = applyChipToggle({ slug: 'fruits', selected: sel });
    expect(sel).toEqual([]);
  });
});

// v0.61.411 — operator: durian + durian-pastry must DISABLE in the picker
// outside the SE-Asian durian belt (SG/MY/ID/TH/PH/BN/VN); fruits stays everywhere.
describe('durian belt gate (isSlugCountryAllowed)', () => {
  it('belt set = exactly the seven SE-Asian belt countries', () => {
    for (const cc of ['SG', 'MY', 'ID', 'TH', 'PH', 'BN', 'VN']) {
      expect(DURIAN_BELT_COUNTRIES.has(cc)).toBe(true);
    }
    expect(DURIAN_BELT_COUNTRIES.size).toBe(7);
  });

  it('belt-gated slugs = durian + durian-pastry only (NOT fruits)', () => {
    expect(BELT_GATED_SLUGS.has('durian')).toBe(true);
    expect(BELT_GATED_SLUGS.has('durian-pastry')).toBe(true);
    expect(BELT_GATED_SLUGS.has('fruits')).toBe(false);
  });

  it('durian + durian-pastry allowed INSIDE the belt', () => {
    for (const cc of ['SG', 'MY', 'ID', 'TH', 'PH', 'BN', 'VN']) {
      expect(isSlugCountryAllowed('durian', cc)).toBe(true);
      expect(isSlugCountryAllowed('durian-pastry', cc)).toBe(true);
    }
  });

  // v0.61.413 — VN moved INTO the belt; it is no longer an "outside" case.
  it('durian + durian-pastry BLOCKED outside the belt (JP, KR, US…)', () => {
    for (const cc of ['JP', 'KR', 'US', 'AU', 'CN', 'IN']) {
      expect(isSlugCountryAllowed('durian', cc)).toBe(false);
      expect(isSlugCountryAllowed('durian-pastry', cc)).toBe(false);
    }
  });

  it('fruits is allowed EVERYWHERE (never belt-gated)', () => {
    for (const cc of ['SG', 'JP', 'US', 'VN', '']) {
      expect(isSlugCountryAllowed('fruits', cc)).toBe(true);
    }
  });

  it('non-special slugs are always allowed', () => {
    expect(isSlugCountryAllowed('italian', 'JP')).toBe(true);
    expect(isSlugCountryAllowed('dessert', 'US')).toBe(true);
  });

  it('unknown / empty country does NOT block (server still guards)', () => {
    expect(isSlugCountryAllowed('durian', '')).toBe(true);
    expect(isSlugCountryAllowed('durian', null)).toBe(true);
    expect(isSlugCountryAllowed('durian', undefined)).toBe(true);
  });

  it('country is case-insensitive', () => {
    expect(isSlugCountryAllowed('durian', 'jp')).toBe(false);
    expect(isSlugCountryAllowed('durian', 'sg')).toBe(true);
  });
});

describe('applyChipToggle — defensive inputs', () => {
  it('returns a copy of selected when slug is empty / non-string', () => {
    expect(applyChipToggle({ slug: '', selected: ['italian'] })).toEqual(['italian']);
    expect(applyChipToggle({ slug: null, selected: ['italian'] })).toEqual(['italian']);
    expect(applyChipToggle({ slug: undefined, selected: ['italian'] })).toEqual(['italian']);
  });

  it('treats non-array selected as empty', () => {
    expect(applyChipToggle({ slug: 'fruits', selected: null })).toEqual(['fruits']);
    expect(applyChipToggle({ slug: 'italian', selected: 'not-an-array' })).toEqual(['italian']);
  });
});
