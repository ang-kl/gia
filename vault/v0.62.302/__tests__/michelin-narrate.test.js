// __tests__/michelin-narrate.test.js — v0.60.147
//
// Smoke + merge tests for pipeline.narrateMichelinVenues — the
// narrate-only LLM helper added for Michelin full-narrate parity.
// Stubs llm.isReady/llm.generate so we can exercise the parse + merge
// path without an actual Gemini call.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function loadPipelineWithLLMStub(stub) {
  // Reset module cache then patch llm-client + gemini-retry deps.
  for (const k of Object.keys(require.cache)) delete require.cache[k];
  const llm = require('../llm-client.js');
  // Patch the surface narrateMichelinVenues touches.
  llm.isReady = () => stub.isReady !== false;
  llm.generate = stub.generate || (async () => ({ response: { text: () => stub.rawText || '[]' } }));
  // gemini-retry's withRetry just runs the fn — stub it to a no-op wrapper.
  const retry = require('../gemini-retry.js');
  retry.withRetry = async (fn) => fn();
  return require('../pipeline.js');
}

const SAMPLE = [
  { placeId: 'p-1', name: 'Burnt Ends', area: 'Dempsey, Singapore', michelinCategory: 'STAR_ONE', michelinCuisineLabel: 'Modern Australian' },
  { placeId: 'p-2', name: 'Hill Street Tai Hwa Pork Noodle', area: 'Crawford Lane', michelinCategory: 'BIB_GOURMAND', michelinCuisineLabel: 'Hawker' },
];

describe('narrateMichelinVenues', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('returns a placeId-keyed map of {vibe, signatureDish, dishes} on a good response', async () => {
    const pipeline = loadPipelineWithLLMStub({
      rawText: JSON.stringify([
        { placeId: 'p-1', vibe: 'Chef-driven wood-fire counter', signature_dish: 'Beef marmalade brioche', dishes: ['Beef marmalade brioche', 'Skewers'] },
        { placeId: 'p-2', vibe: 'Bib Gourmand pork noodle stall', signature_dish: 'Bak chor mee', dishes: ['Bak chor mee'] },
      ])
    });
    const out = await pipeline.narrateMichelinVenues({ candidates: SAMPLE, lang: 'en' });
    expect(Object.keys(out).sort()).toEqual(['p-1', 'p-2']);
    expect(out['p-1'].vibe).toMatch(/wood-fire|counter/i);
    expect(out['p-1'].signatureDish).toBeTruthy();
    expect(out['p-1'].dishes).toContain('Beef marmalade brioche');
    expect(out['p-2'].dishes).toEqual(['Bak chor mee']);
  });

  it('drops hallucinated placeIds (defensive against the LLM inventing IDs)', async () => {
    const pipeline = loadPipelineWithLLMStub({
      rawText: JSON.stringify([
        { placeId: 'p-1', vibe: 'OK', signature_dish: 'Dish A', dishes: ['A'] },
        { placeId: 'INVENTED', vibe: 'BAD', signature_dish: 'X', dishes: ['X'] },
      ])
    });
    const out = await pipeline.narrateMichelinVenues({ candidates: SAMPLE, lang: 'en' });
    expect(Object.keys(out)).toEqual(['p-1']);
  });

  it('returns {} when the LLM is not ready (graceful no-op)', async () => {
    const pipeline = loadPipelineWithLLMStub({ isReady: false });
    const out = await pipeline.narrateMichelinVenues({ candidates: SAMPLE, lang: 'en' });
    expect(out).toEqual({});
  });

  it('returns {} on a parse-fail (does not throw)', async () => {
    const pipeline = loadPipelineWithLLMStub({ rawText: 'not json at all' });
    const out = await pipeline.narrateMichelinVenues({ candidates: SAMPLE, lang: 'en' });
    expect(out).toEqual({});
  });

  it('returns {} when given an empty candidate list', async () => {
    const pipeline = loadPipelineWithLLMStub({ rawText: '[]' });
    const out = await pipeline.narrateMichelinVenues({ candidates: [], lang: 'en' });
    expect(out).toEqual({});
  });

  it('truncates dishes to 3 even when the LLM returns more', async () => {
    const pipeline = loadPipelineWithLLMStub({
      rawText: JSON.stringify([{ placeId: 'p-1', vibe: 'v', signature_dish: 's', dishes: ['a', 'b', 'c', 'd', 'e'] }])
    });
    const out = await pipeline.narrateMichelinVenues({ candidates: SAMPLE.slice(0, 1), lang: 'en' });
    expect(out['p-1'].dishes).toEqual(['a', 'b', 'c']);
  });
});
