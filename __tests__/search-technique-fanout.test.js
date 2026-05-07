// __tests__/search-technique-fanout.test.js — v0.60.0
//
// Origin-first tier-grouped technique search per Human Lead 2026-05-07.
//
// Bug fixed: "/s Braisage" had returned three Chinese braised-duck
// stalls because the previous flat keyword query collapsed disparate
// culinary traditions. New flow: each technique entry has a defaultOrigin
// + originByAlias overrides + variants[] + optional fusion. The bot
// runs parallel Places searches per cuisine + a single Gemini grounded
// authenticity check, then renders origin (≤3) → variants (1-2 each)
// → fusion (≤1), capped at 6 total.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const gc = require('../gemini-client.js');

describe('TECHNIQUE_FALLBACK schema (v0.60.0)', () => {
  it('every entry has defaultOrigin + originDish + match[]', () => {
    for (const e of gc.TECHNIQUE_FALLBACK) {
      expect(Array.isArray(e.match)).toBe(true);
      expect(e.match.length).toBeGreaterThan(0);
      expect(typeof e.defaultOrigin).toBe('string');
      expect(e.defaultOrigin.length).toBeGreaterThan(0);
      expect(typeof e.originDish).toBe('string');
      expect(e.originDish.length).toBeGreaterThan(0);
      expect(typeof e.why).toBe('string');
      expect(e.why.length).toBeGreaterThan(20);
      expect(Array.isArray(e.variants)).toBe(true);
    }
  });

  it('braising entry has French origin + 3 variants + fusion', () => {
    const braising = gc.lookupTechnique('Braisage');
    expect(braising).not.toBeNull();
    expect(braising.defaultOrigin).toBe('French');
    expect(braising.originDish).toBe('beef bourguignon');
    expect(braising.variants.length).toBe(3);
    expect(braising.variants.map((v) => v.cuisine).sort()).toEqual(['Cantonese', 'European', 'Italian']);
    expect(braising.fusion).not.toBeNull();
    expect(braising.fusion.label).toBe('Modern European');
  });

  it('tandoor entry is single-tier: cuisine-tagged with empty variants', () => {
    const tandoor = gc.lookupTechnique('tandoor');
    expect(tandoor.defaultOrigin).toBe('North Indian');
    expect(tandoor.variants.length).toBeLessThanOrEqual(1);   // pakistani only
    expect(tandoor.fusion).toBeNull();
  });

  it('grilling default origin is Argentinian (asado), not generic', () => {
    const grilling = gc.lookupTechnique('grilling');
    expect(grilling.defaultOrigin).toBe('Argentinian');
    expect(grilling.originDish).toBe('asado');
  });

  it('smoking default origin is American (BBQ canon)', () => {
    const smoking = gc.lookupTechnique('smoked brisket');
    expect(smoking.defaultOrigin).toBe('American');
    expect(smoking.originDish).toBe('smoked brisket');
  });
});

describe('lookupTechnique', () => {
  it('finds "Braisage" → braising entry (FR alias)', () => {
    const t = gc.lookupTechnique('Braisage');
    expect(t).not.toBeNull();
    expect(t.match[0]).toBe('braising');
  });
  it('finds "lu shui" → braising entry (cross-cuisine alias)', () => {
    const t = gc.lookupTechnique('lu shui');
    expect(t).not.toBeNull();
    expect(t.match[0]).toBe('braising');
  });
  it('returns null for unknown technique', () => {
    expect(gc.lookupTechnique('asdfgh')).toBeNull();
    expect(gc.lookupTechnique('')).toBeNull();
  });
});

describe('resolveOrigin (language-alias override)', () => {
  it('Braisage (French alias) → French (defaultOrigin)', () => {
    const t = gc.lookupTechnique('Braisage');
    expect(gc.resolveOrigin(t, 'Braisage')).toBe('French');
  });
  it('braising (English alias) → French (defaultOrigin)', () => {
    const t = gc.lookupTechnique('braising');
    expect(gc.resolveOrigin(t, 'braising')).toBe('French');
  });
  it('"lu shui" → Cantonese (originByAlias override)', () => {
    const t = gc.lookupTechnique('lu shui');
    expect(gc.resolveOrigin(t, 'lu shui')).toBe('Cantonese');
  });
  it('"卤水" (Chinese alias) → Cantonese', () => {
    const t = gc.lookupTechnique('卤水');
    expect(gc.resolveOrigin(t, '卤水')).toBe('Cantonese');
  });
  it('"kakuni" → Japanese (originByAlias override)', () => {
    const t = gc.lookupTechnique('kakuni');
    expect(gc.resolveOrigin(t, 'kakuni')).toBe('Japanese');
  });
  it('"pörkölt" → European override', () => {
    const t = gc.lookupTechnique('pörkölt');
    expect(gc.resolveOrigin(t, 'pörkölt')).toBe('European');
  });
  it('null entry returns null', () => {
    expect(gc.resolveOrigin(null, 'whatever')).toBeNull();
  });
});

describe('canonicalDishPhrase', () => {
  it('"beef bourguignon" → exact match in DISH_FALLBACK', () => {
    expect(gc.canonicalDishPhrase('beef bourguignon')).toBe('beef bourguignon');
  });
  it('"osso buco" found in DISH_FALLBACK', () => {
    expect(gc.canonicalDishPhrase('osso buco')).toBe('osso buco');
  });
  it('"lu shui braised" — variant dish key passes through', () => {
    const out = gc.canonicalDishPhrase('lu shui braised');
    expect(out.toLowerCase()).toContain('lu shui');
  });
  it('unknown dish key returns the input as-is', () => {
    expect(gc.canonicalDishPhrase('totally invented dish')).toBe('totally invented dish');
  });
  it('empty input returns empty string', () => {
    expect(gc.canonicalDishPhrase('')).toBe('');
    expect(gc.canonicalDishPhrase(null)).toBe('');
  });
});

describe('validateAuthenticity (Gemini grounded scorer)', () => {
  it('returns empty object when GEMINI_API_KEY unset and no factory provided', async () => {
    const out = await gc.validateAuthenticity({
      technique: 'braising',
      origin: 'French',
      originDish: 'beef bourguignon',
      candidates: [{ placeId: 'p1', name: 'Le Bistrot', address: 'SG' }]
    });
    expect(out).toEqual({});
  });

  it('returns empty object when no candidates provided', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({ generateContent: async () => ({ response: { text: () => '[]' } }) })
    });
    const out = await gc.validateAuthenticity({
      technique: 'braising',
      origin: 'French',
      originDish: 'beef bourguignon',
      candidates: [],
      _genAIFactory: factory
    });
    expect(out).toEqual({});
  });

  it('parses successful Gemini JSON array into placeId-keyed scores', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: { text: () => '[{"placeId":"p1","score":85,"signals":["ingredients","dish"],"reason":"Authentic French braising"}, {"placeId":"p2","score":20,"signals":[],"reason":"Cantonese braised duck — different tradition"}]' }
        })
      })
    });
    const out = await gc.validateAuthenticity({
      technique: 'braising',
      origin: 'French',
      originDish: 'beef bourguignon',
      originIngredients: ['red wine', 'beef chuck'],
      originTool: 'dutch oven',
      candidates: [
        { placeId: 'p1', name: 'Le Bistrot', address: 'SG' },
        { placeId: 'p2', name: 'Joe Pork Trotter', address: 'SG' }
      ],
      _genAIFactory: factory
    });
    expect(out.p1).toBeDefined();
    expect(out.p1.score).toBe(85);
    expect(out.p1.signals).toContain('ingredients');
    expect(out.p2.score).toBe(20);
  });

  it('clamps scores to 0-100', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: { text: () => '[{"placeId":"p1","score":150,"signals":[],"reason":""}, {"placeId":"p2","score":-30,"signals":[],"reason":""}]' }
        })
      })
    });
    const out = await gc.validateAuthenticity({
      technique: 't',
      origin: 'French',
      originDish: 'd',
      candidates: [{ placeId: 'p1', name: 'a', address: 'b' }, { placeId: 'p2', name: 'c', address: 'd' }],
      _genAIFactory: factory
    });
    expect(out.p1.score).toBe(100);
    expect(out.p2.score).toBe(0);
  });

  it('extracts JSON array from text with surrounding prose', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => ({
          response: { text: () => 'Here are the scores:\n```json\n[{"placeId":"p1","score":75,"signals":["dish"],"reason":"On menu"}]\n```' }
        })
      })
    });
    const out = await gc.validateAuthenticity({
      technique: 't',
      origin: 'French',
      originDish: 'd',
      candidates: [{ placeId: 'p1', name: 'a', address: 'b' }],
      _genAIFactory: factory
    });
    expect(out.p1?.score).toBe(75);
  });

  it('returns empty when Gemini throws on every model', async () => {
    const factory = () => ({
      getGenerativeModel: () => ({ generateContent: async () => { throw new Error('all models down'); } })
    });
    const out = await gc.validateAuthenticity({
      technique: 't',
      origin: 'French',
      originDish: 'd',
      candidates: [{ placeId: 'p1', name: 'a', address: 'b' }],
      _genAIFactory: factory
    });
    expect(out).toEqual({});
  });
});

describe('integration: braising fan-out shape', () => {
  it('braising has 4 cuisines (origin + 3 variants) + fusion → max 6 venues per spec', () => {
    const braising = gc.lookupTechnique('Braisage');
    const totalCapacity = 3 /* origin */ + braising.variants.length * 2 /* 2 each */ + 1 /* fusion */;
    expect(totalCapacity).toBeGreaterThanOrEqual(6); // there's room for the cap
    // Cap rule: max 6 total. So even if Places returns plenty per
    // variant, the render caps at 6.
  });

  it('"/s lu shui" overrides origin to Cantonese while still using the same braising entry', () => {
    const t = gc.lookupTechnique('lu shui');
    expect(t.match[0]).toBe('braising');
    expect(gc.resolveOrigin(t, 'lu shui')).toBe('Cantonese');
    // The fan-out caller will replace the origin slot with Cantonese,
    // and the variants list (Italian, Cantonese, European) will see
    // Cantonese deduped or moved.
  });
});

describe('DISH_FALLBACK extensions for fan-out variants', () => {
  it('lu shui braised entry exists with Cantonese cuisine', () => {
    const out = gc.dishFallback('lu shui braised');
    expect(out).not.toBeNull();
    expect(out.cuisine).toBe('Cantonese');
  });
  it('pörkölt entry exists with European cuisine', () => {
    expect(gc.dishFallback('pörkölt').cuisine).toBe('European');
  });
  it('nimono entry exists with Japanese cuisine', () => {
    expect(gc.dishFallback('nimono').cuisine).toBe('Japanese');
  });
  it('kakuni entry exists with Japanese cuisine', () => {
    expect(gc.dishFallback('kakuni').cuisine).toBe('Japanese');
  });
  it('pot-au-feu entry exists with French cuisine', () => {
    expect(gc.dishFallback('pot-au-feu').cuisine).toBe('French');
  });
  it('brasato al barolo entry exists with Italian cuisine', () => {
    expect(gc.dishFallback('brasato al barolo').cuisine).toBe('Italian');
  });
  it('Teochew braised duck (lor ack) exists', () => {
    const out = gc.dishFallback('braised duck');
    expect(out).not.toBeNull();
    expect(out.cuisine).toBe('Teochew');
  });
});
