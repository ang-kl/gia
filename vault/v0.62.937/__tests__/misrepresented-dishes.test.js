// __tests__/misrepresented-dishes.test.js — v0.60.128

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const md = require('../misrepresented-dishes.js');

describe('misrepresented-dishes — parsing', () => {
  it('parses the full curated table', () => {
    expect(md.getMisrepresentedDishCount()).toBeGreaterThan(700);
  });

  it('does not leak the file header or stray lines as entries', () => {
    const names = md.getMisrepresentedTable().map((e) => e.name.toLowerCase());
    expect(names.some((n) => n.includes('whenever'))).toBe(false);
    expect(names.some((n) => n.includes('tabulate'))).toBe(false);
    expect(names.includes('i')).toBe(false);
  });

  it('every entry has a non-trivial name and note', () => {
    for (const e of md.getMisrepresentedTable()) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(1);
      expect(typeof e.note).toBe('string');
      expect(e.note.length).toBeGreaterThan(10);
    }
  });
});

describe('misrepresented-dishes — lookup', () => {
  it('matches an exact single-word dish name (case-insensitive)', () => {
    const r = md.lookupMisrepresentedDish('ramen');
    expect(r).not.toBeNull();
    expect(r.name).toBe('Ramen');
    expect(r.note.toLowerCase()).toContain('chinese');
    expect(md.lookupMisrepresentedDish('RAMEN').name).toBe('Ramen');
  });

  it('matches across a plural/singular form', () => {
    expect(md.lookupMisrepresentedDish('goulash dumplings').name).toBe('Goulash dumpling');
    expect(md.lookupMisrepresentedDish('fortune cookie').name).toBe('Fortune cookies');
  });

  it('resolves a bare single word to the unique entry that starts with it', () => {
    expect(md.lookupMisrepresentedDish('goulash').name).toBe('Goulash dumpling');
  });

  it('matches multi-word and accented / punctuated names', () => {
    expect(md.lookupMisrepresentedDish('Hainanese chicken rice').name).toBe('Hainanese chicken rice');
    expect(md.lookupMisrepresentedDish('char kway teow').name).toBe('Char kway teow');
    expect(md.lookupMisrepresentedDish("General Tso's chicken").name.toLowerCase()).toContain('general tso');
  });

  it('carries the "actually it is X" note verbatim', () => {
    expect(md.lookupMisrepresentedDish('carbonara').note.toLowerCase()).toContain('cream');
    expect(md.lookupMisrepresentedDish('Butterbeer').note.toLowerCase()).toContain('harry potter');
    expect(md.lookupMisrepresentedDish('nachos').note.toLowerCase()).toContain('tex-mex');
  });

  it('returns null for non-dish text, blanks, and over-long input', () => {
    expect(md.lookupMisrepresentedDish('')).toBeNull();
    expect(md.lookupMisrepresentedDish('   ')).toBeNull();
    expect(md.lookupMisrepresentedDish('xyzzy not a dish')).toBeNull();
    expect(md.lookupMisrepresentedDish('this is clearly a whole sentence and not a dish name at all')).toBeNull();
    // a real food word that isn't in the misrepresented table
    expect(md.lookupMisrepresentedDish('sandwich')).toBeNull();
  });
});

describe('misrepresented-dishes — helpers', () => {
  it('normalises diacritics, apostrophes and punctuation', () => {
    expect(md._norm("  Pad   Thai  ")).toBe('pad thai');
    expect(md._norm("General Tso’s chicken")).toBe('general tsos chicken');
    expect(md._norm('Açaí bowl')).toBe('acai bowl');
  });

  it('singularises only the last word, leaving non-plurals alone', () => {
    expect(md._singularizeLastWord('goulash dumplings')).toBe('goulash dumpling');
    expect(md._singularizeLastWord('fortune cookies')).toBe('fortune cookie');
    expect(md._singularizeLastWord('ramen')).toBeNull();
    expect(md._singularizeLastWord('hummus')).toBeNull();
  });
});
