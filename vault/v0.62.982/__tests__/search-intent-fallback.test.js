// __tests__/search-intent-fallback.test.js — v0.59.56
//
// Robustness fixes for /search command intent classification.
// Bug 2026-05-07: "Goulash with dumplings" and "Beef bourguignon" hit
// the catch path because Gemini's RECITATION filter blocked the
// response. New behaviour:
//   1. Wrap response.text() in try/catch — RECITATION/SAFETY no longer
//      bubbles up.
//   2. Walk a model fallback chain (gemini-flash-latest → 2.0-flash →
//      2.5-flash-lite).
//   3. Final fallback: built-in DISH_FALLBACK dictionary for the
//      well-known European/Asian dishes Gemini sometimes blocks.
//   4. NEVER throw — always return a valid intent object.

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const gc = require('../gemini-client.js');

describe('dishFallback', () => {
  it('matches "beef bourguignon" → French', () => {
    const hit = gc.dishFallback('Beef bourguignon');
    expect(hit).not.toBeNull();
    expect(hit.cuisine).toBe('French');
  });
  it('matches "boeuf bourguignon" alias → French', () => {
    expect(gc.dishFallback('boeuf bourguignon').cuisine).toBe('French');
  });
  it('matches "goulash with dumplings" → European', () => {
    const hit = gc.dishFallback('Goulash with dumplings');
    expect(hit.cuisine).toBe('European');
  });
  it('matches "pad thai" → Thai', () => {
    expect(gc.dishFallback('pad thai').cuisine).toBe('Thai');
  });
  it('matches "carbonara" → Italian', () => {
    expect(gc.dishFallback('carbonara with mushrooms').cuisine).toBe('Italian');
  });
  it('matches "pho" → Vietnamese (case-insensitive)', () => {
    expect(gc.dishFallback('PHO').cuisine).toBe('Vietnamese');
  });
  it('matches "shepherd\'s pie" → British', () => {
    expect(gc.dishFallback("shepherd's pie").cuisine).toBe('British');
  });
  it('returns null for unknown dishes', () => {
    expect(gc.dishFallback('something random and made up')).toBeNull();
    expect(gc.dishFallback('')).toBeNull();
  });
});

describe('classifySearchIntent — robust to model failure', () => {
  it('walks the fallback chain when first model throws', async () => {
    let calls = 0;
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => {
          calls++;
          if (calls === 1) throw new Error('model 404');
          if (calls === 2) throw new Error('quota exceeded');
          return { response: { text: () => '{"intent":"dish","cuisine":"Thai","searchTerm":"pad thai restaurant Singapore","why":"Pad Thai is iconic.","clarify":""}' } };
        }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'pad thai', _genAIFactory: factory });
    expect(calls).toBeGreaterThanOrEqual(3);
    expect(out.intent).toBe('dish');
    expect(out.cuisine).toBe('Thai');
  });

  it('falls back to dish dictionary when every model errors out', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('all models down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'Beef bourguignon', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.cuisine).toBe('French');
    // v0.59.56 / codex P2 regression: searchTerm must contain the
    // canonical dish phrase, not just the first user token. The bug
    // fix uses match[0] ("beef bourguignon") so multi-word dishes
    // route to the correct Places query.
    expect(out.searchTerm.toLowerCase()).toContain('beef bourguignon');
    expect(out.why).toMatch(/burgundian|wine/i);
  });

  it('canonicalises French alias to English for searchTerm (codex P2)', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'Boeuf bourguignon s\'il vous plaît', _genAIFactory: factory });
    expect(out.cuisine).toBe('French');
    // match[0] is "beef bourguignon" (canonical English) — preferred
    // for SG Places search ranking even if the user typed the French
    // alias.
    expect(out.searchTerm.toLowerCase()).toContain('beef bourguignon');
  });

  it('keeps multi-word dish phrase for "pad thai" (codex P2)', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('down'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'pad thai with shrimp', _genAIFactory: factory });
    expect(out.cuisine).toBe('Thai');
    expect(out.searchTerm.toLowerCase()).toContain('pad thai');
  });

  it('falls back to dish dictionary on Goulash + RECITATION block', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: {
            candidates: [{ finishReason: 'RECITATION' }],
            text: () => { throw new Error('Cannot get text from response (RECITATION)'); }
          }
        })
      })
    });
    const out = await gc.classifySearchIntent({ text: 'Goulash with dumplings', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.cuisine).toBe('European');
  });

  // v0.62.x — FAIL OPEN (was 'ambiguous'/decline): a total classifier outage
  // must not block real searches, so it returns a dish search on the raw text.
  it('fails open to a dish search when models fail AND dictionary misses', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('total failure'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'asdfgh qwerty', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.searchTerm).toContain('asdfgh qwerty');
  });

  it('fails open (dish on raw text) regardless of lang when dictionary misses', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('fail'); }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'qwertyuiop', lang: 'fr', _genAIFactory: factory });
    expect(out.intent).toBe('dish');
    expect(out.searchTerm).toContain('qwertyuiop');
  });

  it('handles empty-text response by trying next model', async () => {
    let calls = 0;
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => {
          calls++;
          if (calls === 1) return { response: { text: () => '' } };
          return { response: { text: () => '{"intent":"dish","cuisine":"Italian","searchTerm":"carbonara","why":"Roman pasta.","clarify":""}' } };
        }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'carbonara', _genAIFactory: factory });
    expect(calls).toBe(2);
    expect(out.cuisine).toBe('Italian');
  });

  it('handles non-JSON response by trying next model', async () => {
    let calls = 0;
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => {
          calls++;
          if (calls === 1) return { response: { text: () => 'Sorry, I cannot help with that.' } };
          return { response: { text: () => '{"intent":"dish","cuisine":"French","searchTerm":"x","why":"y","clarify":""}' } };
        }
      })
    });
    const out = await gc.classifySearchIntent({ text: 'beef wellington', _genAIFactory: factory });
    expect(calls).toBe(2);
    expect(out.cuisine).toBe('French');
  });

  it('strips ```json fences from successful response', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: { text: () => '```json\n{"intent":"dish","cuisine":"Thai","searchTerm":"x","why":"y","clarify":""}\n```' }
        })
      })
    });
    const out = await gc.classifySearchIntent({ text: 'pad thai', _genAIFactory: factory });
    expect(out.cuisine).toBe('Thai');
  });
});
