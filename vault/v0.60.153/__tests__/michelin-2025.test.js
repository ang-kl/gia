// __tests__/michelin-2025.test.js — v0.60.14
//
// Validates the Singapore Michelin Guide 2025 dataset shape +
// helper functions.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const m = require('../michelin-2025.js');

describe('Michelin Singapore 2025 — shape', () => {
  it('has 2 three-star entries', () => {
    expect(m.STARS_THREE.length).toBe(2);
    expect(m.STARS_THREE.every((e) => e.category === 'three-star')).toBe(true);
  });

  it('has 7 two-star entries', () => {
    expect(m.STARS_TWO.length).toBe(7);
    expect(m.STARS_TWO.every((e) => e.category === 'two-star')).toBe(true);
  });

  it('has 32 one-star entries', () => {
    expect(m.STARS_ONE.length).toBe(32);
    expect(m.STARS_ONE.every((e) => e.category === 'one-star')).toBe(true);
  });

  it('has 89 Bib Gourmand entries', () => {
    expect(m.BIB_GOURMAND.length).toBe(89);
    expect(m.BIB_GOURMAND.every((e) => e.category === 'bib-gourmand')).toBe(true);
  });

  it('total of 130 venues across all categories', () => {
    expect(m.ALL.length).toBe(2 + 7 + 32 + 89);
  });

  it('every starred entry has name + address + postal', () => {
    const stars = m.getStars();
    for (const e of stars) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.address).toBe('string');
      expect(e.address.length).toBeGreaterThan(0);
      expect(typeof e.postal).toBe('string');
      expect(/^\d{6}$/.test(e.postal)).toBe(true);
    }
  });

  it('every bib gourmand entry has name (address optional)', () => {
    for (const e of m.BIB_GOURMAND) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.address).toBe('string');                  // possibly empty string
    }
  });

  it('no duplicate names within stars', () => {
    const stars = m.getStars();
    const set = new Set(stars.map((e) => e.name.toLowerCase()));
    expect(set.size).toBe(stars.length);
  });
});

describe('Michelin helpers', () => {
  it('getStars() returns 41 starred venues', () => {
    expect(m.getStars().length).toBe(41);
  });

  it('getBibGourmand() returns 89 entries', () => {
    expect(m.getBibGourmand().length).toBe(89);
  });

  it('getByCategory("three-star") returns 2', () => {
    expect(m.getByCategory('three-star').length).toBe(2);
  });

  it('getByCategory("bib-gourmand") returns 89', () => {
    expect(m.getByCategory('bib-gourmand').length).toBe(89);
  });

  it('findByName("Les Amis") finds the three-star entry', () => {
    const e = m.findByName('Les Amis');
    expect(e).toBeTruthy();
    expect(e.category).toBe('three-star');
    expect(e.postal).toBe('228208');
  });

  it('findByName is case-insensitive', () => {
    expect(m.findByName('odette')).toBeTruthy();
    expect(m.findByName('BURNT ENDS')).toBeTruthy();
  });

  it('findByName returns null for unknown', () => {
    expect(m.findByName('not a real venue')).toBeNull();
  });

  it('buildPlacesQuery uses postal when present', () => {
    const e = m.findByName('Les Amis');
    expect(m.buildPlacesQuery(e)).toBe('Les Amis Singapore 228208');
  });

  it('buildPlacesQuery falls back to address when no postal', () => {
    const e = m.findByName('Song Fa Bak Kut Teh');
    expect(m.buildPlacesQuery(e)).toContain('Song Fa Bak Kut Teh');
    expect(m.buildPlacesQuery(e)).toContain('New Bridge Road');
  });

  it('buildPlacesQuery falls back to bare name + Singapore when neither postal nor address', () => {
    const e = m.findByName('Kok Sen');
    expect(m.buildPlacesQuery(e)).toBe('Kok Sen Singapore');
  });
});

describe('findMichelinMatch — venue cross-reference', () => {
  it('exact name match', () => {
    const r = m.findMichelinMatch('Les Amis');
    expect(r).toBeTruthy();
    expect(r.category).toBe('three-star');
  });

  it('case-insensitive exact match', () => {
    expect(m.findMichelinMatch('odette')?.category).toBe('three-star');
    expect(m.findMichelinMatch('BURNT ENDS')?.category).toBe('one-star');
  });

  it('suffix-tolerant token match ("Burnt Ends Restaurant")', () => {
    const r = m.findMichelinMatch('Burnt Ends Restaurant');
    expect(r).toBeTruthy();
    expect(r.name).toBe('Burnt Ends');
  });

  it('postal-augmented chain match — Imperial Treasure ION wins', () => {
    const r = m.findMichelinMatch(
      'Imperial Treasure Fine Teochew Cuisine',
      '2 Orchard Turn, ION Orchard, Singapore 238801'
    );
    expect(r).toBeTruthy();
    expect(r.name).toContain('Orchard');
  });

  it('chain name without matching postal returns null', () => {
    expect(m.findMichelinMatch('Imperial Treasure', '99 Random Road 100000')).toBeNull();
  });

  it('Codex review fix — branch-qualifier guard rejects non-Orchard Imperial Treasure', () => {
    // Pre-fix bug: "Imperial Treasure Fine Teochew Cuisine" (5 tokens)
    // matched "(Orchard)" entry (6 tokens) at 0.83 fraction even when
    // candidate address didn't contain postal 238801. Now requires
    // the qualifier text OR postal to be present.
    expect(m.findMichelinMatch(
      'Imperial Treasure Fine Teochew Cuisine',
      '99 Marina Bay 018960'
    )).toBeNull();
  });

  it('Codex review fix — short-entry guard rejects "Ma Cuisine" lookalike', () => {
    // Pre-fix bug: "Ma Cuisine" (1 distinguishing token "cuisine") fuzzy-
    // matched any candidate with "cuisine" in the name. Now short
    // entries (≤2 tokens) require the entry name as a substring.
    expect(m.findMichelinMatch(
      'Imperial Treasure Fine Teochew Cuisine',
      '10 Random Road'
    )).toBeNull();
  });

  it('short-entry guard still allows "Ma Cuisine Singapore" suffix-tolerant match', () => {
    const r = m.findMichelinMatch('Ma Cuisine Singapore', '38 Craig Road');
    expect(r?.name).toBe('Ma Cuisine');
  });

  it('curly-quote tolerance (Iggy\'s vs Iggy’s)', () => {
    const r = m.findMichelinMatch("Iggy's Restaurant", '581 Orchard Road');
    expect(r).toBeTruthy();
    expect(r.name).toContain('Iggy');
  });

  it('Bib Gourmand entry matches', () => {
    expect(m.findMichelinMatch('Tian Tian Hainanese Chicken Rice')?.category)
      .toBe('bib-gourmand');
  });

  it('unrelated venue returns null', () => {
    expect(m.findMichelinMatch('Random Cafe That Does Not Exist', '')).toBeNull();
    expect(m.findMichelinMatch('', '')).toBeNull();
    expect(m.findMichelinMatch(null)).toBeNull();
  });
});

describe('formatMichelinLine — rendered annotation', () => {
  it('three-star → ⭐⭐⭐', () => {
    expect(m.formatMichelinLine({ category: 'three-star' })).toBe('✳️ Michelin · ⭐⭐⭐ · 2025');
  });

  it('two-star → ⭐⭐', () => {
    expect(m.formatMichelinLine({ category: 'two-star' })).toBe('✳️ Michelin · ⭐⭐ · 2025');
  });

  it('one-star → ⭐', () => {
    expect(m.formatMichelinLine({ category: 'one-star' })).toBe('✳️ Michelin · ⭐ · 2025');
  });

  it('bib-gourmand → ✳️ Bib Gourmand', () => {
    expect(m.formatMichelinLine({ category: 'bib-gourmand' })).toBe('✳️ Bib Gourmand · 2025');
  });

  it('custom year', () => {
    expect(m.formatMichelinLine({ category: 'one-star' }, 2024)).toBe('✳️ Michelin · ⭐ · 2024');
  });

  it('null entry returns empty string', () => {
    expect(m.formatMichelinLine(null)).toBe('');
    expect(m.formatMichelinLine({})).toBe('');
  });
});

describe('Michelin signature venues sanity', () => {
  it('includes both three-star icons (Les Amis, Odette)', () => {
    const names = m.STARS_THREE.map((e) => e.name);
    expect(names).toContain('Les Amis');
    expect(names).toContain('Odette');
  });

  it('includes Hill Street Tai Hwa Pork Noodle (one-star hawker icon)', () => {
    expect(m.findByName('Hill Street Tai Hwa Pork Noodle')).toBeTruthy();
  });

  it('includes Tian Tian Hainanese Chicken Rice (Bib Gourmand hawker)', () => {
    expect(m.findByName('Tian Tian Hainanese Chicken Rice')).toBeTruthy();
  });
});
