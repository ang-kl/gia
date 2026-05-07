// __tests__/search-technique-fallback.test.js — v0.59.57
//
// Bug from Human Lead 2026-05-07: typing "/s Braisage" (FR for
// braising) didn't get an explainer of what the technique is. We
// added a curated TECHNIQUE_FALLBACK dictionary covering EN + FR
// cooking-technique terms; it's used both as a Gemini-failure
// fallback and as a deterministic explainer source.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const gc = require('../gemini-client.js');

describe('techniqueFallback', () => {
  it('matches "Braisage" (FR) → braising explainer', () => {
    const hit = gc.techniqueFallback('Braisage');
    expect(hit).not.toBeNull();
    expect(hit.why).toMatch(/braising|tougher cuts|liquid/i);
    expect(hit.searchPhrase).toContain('braised');
  });
  it('matches "braising" (EN) → same explainer', () => {
    const hit = gc.techniqueFallback('I want braising');
    expect(hit).not.toBeNull();
    expect(hit.why).toMatch(/braising|liquid/i);
  });
  it('matches "rôtisserie" (FR with diacritic)', () => {
    const hit = gc.techniqueFallback('Rôtisserie');
    expect(hit.why).toMatch(/rotating spit|baste/i);
  });
  it('matches "sous vide"', () => {
    const hit = gc.techniqueFallback('what is sous vide');
    expect(hit.why).toMatch(/water bath|temperature/i);
  });
  it('matches "tandoor" with cuisine="North Indian"', () => {
    const hit = gc.techniqueFallback('tandoor');
    expect(hit.cuisine).toBe('North Indian');
    expect(hit.why).toMatch(/clay oven|charcoal/i);
  });
  it('matches "robata" with cuisine="Japanese"', () => {
    const hit = gc.techniqueFallback('robata');
    expect(hit.cuisine).toBe('Japanese');
  });
  it('matches "wok hei"', () => {
    const hit = gc.techniqueFallback('wok hei');
    expect(hit.why).toMatch(/wok|breath|smoky char/i);
    expect(hit.cuisine).toBe('Cantonese');
  });
  it('matches "omakase"', () => {
    expect(gc.techniqueFallback('omakase').cuisine).toBe('Japanese');
  });
  it('matches "flambé"', () => {
    expect(gc.techniqueFallback('flambé').why).toMatch(/alcohol|igniting/i);
  });
  it('matches "smoking" / "smokehouse"', () => {
    expect(gc.techniqueFallback('smoked brisket').why).toMatch(/wood smoke|hours/i);
    expect(gc.techniqueFallback('smokehouse').why).toMatch(/wood smoke/i);
  });
  it('matches "confit"', () => {
    expect(gc.techniqueFallback('confit').cuisine).toBe('French');
  });
  it('matches "binchotan"', () => {
    expect(gc.techniqueFallback('binchotan').cuisine).toBe('Japanese');
  });
  it('returns null for unknown techniques', () => {
    expect(gc.techniqueFallback('something random')).toBeNull();
    expect(gc.techniqueFallback('')).toBeNull();
  });
  it('is case-insensitive', () => {
    expect(gc.techniqueFallback('BRAISAGE')).not.toBeNull();
    expect(gc.techniqueFallback('TaNdOoR')).not.toBeNull();
  });
});

describe('classifySearchIntent — technique-dictionary fallback', () => {
  it('returns intent="tool" with explainer when Gemini fails on Braisage', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('all models down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'Braisage', _genAIFactory: factory });
    expect(out.intent).toBe('tool');
    expect(out.why).toMatch(/braising|liquid/i);
    expect(out.searchTerm.toLowerCase()).toContain('braised');
  });

  it('technique dictionary takes precedence over dish dictionary for "tandoor"', async () => {
    // "Tandoori chicken" is in DISH_FALLBACK; "tandoor" alone is in
    // TECHNIQUE_FALLBACK. Single "tandoor" must hit the technique entry.
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'tandoor', _genAIFactory: factory });
    expect(out.intent).toBe('tool');
    expect(out.why).toMatch(/clay oven/i);
  });

  it('respects Gemini when it succeeds (technique dictionary is fallback only)', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: { text: () => '{"intent":"tool","cuisine":null,"searchTerm":"sous vide restaurant Singapore","why":"Sous vide preserves moisture.","clarify":""}' }
        })
      })
    });
    const out = await gc.classifySearchIntent({ text: 'sous vide', _genAIFactory: factory });
    expect(out.intent).toBe('tool');
    expect(out.why).toBe('Sous vide preserves moisture.');
  });
});

describe('TECHNIQUE_FALLBACK shape', () => {
  it('every entry has match[], why, searchPhrase', () => {
    for (const e of gc.TECHNIQUE_FALLBACK) {
      expect(Array.isArray(e.match)).toBe(true);
      expect(e.match.length).toBeGreaterThan(0);
      expect(typeof e.why).toBe('string');
      expect(e.why.length).toBeGreaterThan(20);
      expect(typeof e.searchPhrase).toBe('string');
      expect(e.searchPhrase.toLowerCase()).toContain('singapore');
    }
  });
});
