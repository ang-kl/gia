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

// v0.60.0: techniqueFallback retained for backward-compat (returns
// the entry, but the schema is now the tier-aware shape — fields
// `defaultOrigin`, `originDish`, `variants[]` instead of flat
// `cuisine` + `searchPhrase`).
describe('techniqueFallback', () => {
  it('matches "Braisage" (FR) → braising explainer', () => {
    const hit = gc.techniqueFallback('Braisage');
    expect(hit).not.toBeNull();
    expect(hit.why).toMatch(/braising|tougher cuts|liquid/i);
    expect(hit.originDish).toBe('beef bourguignon');
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
  it('matches "tandoor" with defaultOrigin="North Indian"', () => {
    const hit = gc.techniqueFallback('tandoor');
    expect(hit.defaultOrigin).toBe('North Indian');
    expect(hit.why).toMatch(/clay oven|charcoal/i);
  });
  it('matches "robata" with defaultOrigin="Japanese"', () => {
    const hit = gc.techniqueFallback('robata');
    expect(hit.defaultOrigin).toBe('Japanese');
  });
  it('matches "wok hei"', () => {
    const hit = gc.techniqueFallback('wok hei');
    expect(hit.why).toMatch(/wok|breath|smoky char/i);
    expect(hit.defaultOrigin).toBe('Cantonese');
  });
  it('matches "omakase"', () => {
    expect(gc.techniqueFallback('omakase').defaultOrigin).toBe('Japanese');
  });
  it('matches "flambé"', () => {
    expect(gc.techniqueFallback('flambé').why).toMatch(/alcohol|igniting/i);
  });
  it('matches "smoking" / "smokehouse"', () => {
    expect(gc.techniqueFallback('smoked brisket').why).toMatch(/wood smoke|hours/i);
    expect(gc.techniqueFallback('smokehouse').why).toMatch(/wood smoke/i);
  });
  it('matches "confit"', () => {
    expect(gc.techniqueFallback('confit').defaultOrigin).toBe('French');
  });
  it('matches "binchotan"', () => {
    expect(gc.techniqueFallback('binchotan').defaultOrigin).toBe('Japanese');
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
    // v0.60.0: technique-fallback path now returns the originDish as
    // the searchTerm seed (caller's fan-out path will replace it
    // with per-cuisine queries). For 'Braisage' that's "beef bourguignon".
    expect(out.searchTerm.toLowerCase()).toMatch(/bourguignon|braised/);
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

  // v0.59.58 (codex P2 follow-up): when a user types a SPECIFIC
  // multi-word dish that contains a technique alias as a substring
  // ("duck confit" → contains "confit"; "tandoori chicken" → contains
  // "tandoor"/"tandoori"), the dish dictionary must win — the user
  // wants the precise dish-specific Places search, not a broader
  // "french restaurant" / "indian restaurant" search.
  it('"duck confit" → dish-fallback, NOT technique (codex P2)', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'duck confit', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.cuisine).toBe('French');
    expect(out.searchTerm.toLowerCase()).toContain('duck confit');
    // Must NOT be the broad technique searchPhrase.
    expect(out.searchTerm.toLowerCase()).not.toContain('confit french restaurant');
  });

  it('"tandoori chicken" → dish-fallback, NOT technique (codex P2)', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'tandoori chicken', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.cuisine).toBe('North Indian');
    expect(out.searchTerm.toLowerCase()).toContain('tandoori chicken');
    expect(out.why).toMatch(/yogurt-marinated|clay tandoor oven/i);
  });

  it('"confit de canard" (FR alias) → dish-fallback', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'confit de canard', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.cuisine).toBe('French');
  });

  it('"braisage" alone → technique-fallback (regression guard for v0.59.57)', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'braisage', _genAIFactory: factory });
    expect(out.intent).toBe('tool');
    expect(out.why).toMatch(/braising|liquid/i);
  });

  it('"confit" alone (technique only, no dish modifier) → technique-fallback', async () => {
    // Standalone "confit" must hit the technique explainer because
    // no dish entry contains the substring "confit" by itself —
    // dish entries require "confit de canard" or "duck confit".
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'confit', _genAIFactory: factory });
    expect(out.intent).toBe('tool');
    expect(out.why).toMatch(/own fat|low temperature/i);
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
  it('every entry has match[], defaultOrigin, originDish, variants[], why', () => {
    for (const e of gc.TECHNIQUE_FALLBACK) {
      expect(Array.isArray(e.match)).toBe(true);
      expect(e.match.length).toBeGreaterThan(0);
      expect(typeof e.why).toBe('string');
      expect(e.why.length).toBeGreaterThan(20);
      expect(typeof e.defaultOrigin).toBe('string');
      expect(typeof e.originDish).toBe('string');
      expect(Array.isArray(e.variants)).toBe(true);
    }
  });
});
