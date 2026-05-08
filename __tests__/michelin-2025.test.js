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
