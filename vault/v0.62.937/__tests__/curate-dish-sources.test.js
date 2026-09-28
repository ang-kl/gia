// __tests__/curate-dish-sources.test.js — v0.62.446
//
// Unit tests for scripts/curate-dish-sources.mjs. The Gemini fetch is
// mocked via the `_fetchFn` test seam — no network, no GEMINI_API_KEY
// needed at test time.

import { describe, it, expect } from 'vitest';
import {
  classifySource,
  buildWorkList,
  curateBatch,
  serialize,
} from '../scripts/curate-dish-sources.mjs';

describe('classifySource — source-quality classifier', () => {
  it('flags expiring vertexaisearch grounding-redirect URLs as broken', () => {
    expect(classifySource('https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQGrIiJgMwfa==')).toBe('broken');
  });
  it('flags banned by NAME (Grokipedia / blog / social)', () => {
    expect(classifySource('Grokipedia')).toBe('banned');
    expect(classifySource('Some food blog')).toBe('banned');
    expect(classifySource('YouTube clip')).toBe('banned');
  });
  it('flags banned by HOST (youtube / facebook / reddit / etc.)', () => {
    expect(classifySource('https://www.youtube.com/watch?v=abc')).toBe('banned');
    expect(classifySource('https://www.facebook.com/somepage')).toBe('banned');
    expect(classifySource('https://www.reddit.com/r/food/comments/xyz')).toBe('banned');
    expect(classifySource('https://www.pinterest.com/pin/123')).toBe('banned');
    expect(classifySource('https://www.tiktok.com/@x/video/1')).toBe('banned');
  });
  it('flags weak: empty, bare labels, no URL', () => {
    expect(classifySource('')).toBe('weak');
    expect(classifySource('   ')).toBe('weak');
    expect(classifySource('Wikipedia')).toBe('weak');
    expect(classifySource('TasteAtlas')).toBe('weak');
    expect(classifySource('NLB')).toBe('weak');
    expect(classifySource('Britannica')).toBe('weak');
  });
  it('recognises TIER-1 tourism-board URLs as ok-tier1', () => {
    expect(classifySource('https://www.visitsingapore.com/dining-drinks-singapore/local-dishes/hainanese-chicken-rice/')).toBe('ok-tier1');
    expect(classifySource('https://www.jnto.go.jp/eat-and-drink/en/cuisine/sushi/')).toBe('ok-tier1');
    expect(classifySource('https://www.tourismthailand.org/Articles/pad-thai')).toBe('ok-tier1');
    expect(classifySource('https://www.discoverhongkong.com/eng/explore/dining/dim-sum.html')).toBe('ok-tier1');
    expect(classifySource('https://www.macaotourism.gov.mo/en/macau-food/pork-chop-bun')).toBe('ok-tier1');
  });
  it('recognises TIER-2 authorised food articles as ok-tier2', () => {
    expect(classifySource('https://guide.michelin.com/sg/en/article/dining-out/hainanese-chicken-rice')).toBe('ok-tier2');
    expect(classifySource('https://www.tasteatlas.com/laksa')).toBe('ok-tier2');
    expect(classifySource('https://www.bbcgoodfood.com/recipes/pho-bo')).toBe('ok-tier2');
    expect(classifySource('https://www.britannica.com/topic/sushi')).toBe('ok-tier2');
    expect(classifySource('https://eresources.nlb.gov.sg/infopedia/articles/SIP_15_2005-01-19.html')).toBe('ok-tier2');
  });
  it('recognises Wikipedia URLs as ok-wiki (tier-3 fallback, CI may re-verify)', () => {
    expect(classifySource('https://en.wikipedia.org/wiki/Bobotie')).toBe('ok-wiki');
    expect(classifySource('https://en.wikipedia.org/wiki/Hainanese_chicken_rice')).toBe('ok-wiki');
  });
  it('flags an unknown food-blog URL as unknown (will be re-curated)', () => {
    expect(classifySource('https://www.somerandomblog.com/dish-recipe')).toBe('unknown');
    expect(classifySource('https://eatsajoy.com/teochew-meat-puff/')).toBe('unknown');
  });
});

describe('buildWorkList', () => {
  const overlay = {
    'singaporean::laksa':        { en: 'A coconut-curry noodle soup.', source: 'Wikipedia' },                                  // weak
    'singaporean::chicken rice': { en: 'Poached chicken with rice cooked in stock.', source: 'https://www.visitsingapore.com/dining-drinks-singapore/local-dishes/hainanese-chicken-rice/' }, // ok-tier1 → kept
    'japanese::sushi':           { en: 'Vinegared rice with seafood.', source: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZ==' }, // broken
    'korean::bibimbap':          { en: 'Mixed rice with vegetables.', source: 'Grokipedia' },                                  // banned
    'thai::pad-thai':            { en: 'Stir-fried rice noodles with peanuts.', source: 'https://www.tasteatlas.com/pad-thai' }, // ok-tier2 → kept
    'malaysian::nasi-lemak':     { en: 'Coconut-milk rice with sambal.', source: '' },                                         // weak
    'vietnamese::pho':           { en: 'Beef-broth rice-noodle soup.', source: 'https://en.wikipedia.org/wiki/Pho' },          // ok-wiki → kept (tier-3 fallback)
    'filipino::adobo':           { en: 'Braised meat in vinegar and soy.', source: 'https://www.somefoodblog.com/adobo' },     // unknown → re-curate
    'broken-entry-no-note':      { en: '', source: 'Wikipedia' },                                                              // skipped — empty note
  };

  it('picks up broken/weak/banned/unknown and skips ok-tier1/2/wiki', () => {
    const todo = buildWorkList(overlay);
    const keys = todo.map((t) => t.key).sort();
    expect(keys).toEqual([
      'filipino::adobo',         // unknown
      'japanese::sushi',          // broken
      'korean::bibimbap',         // banned
      'malaysian::nasi-lemak',    // weak (empty)
      'singaporean::laksa',       // weak (bare "Wikipedia")
    ]);
  });
  it('skips entries with empty notes (we never curate sources for blanks)', () => {
    const todo = buildWorkList(overlay);
    expect(todo.find((t) => t.key === 'broken-entry-no-note')).toBeUndefined();
  });
  it('filters by REGION slug prefix', () => {
    const sg = buildWorkList(overlay, { region: 'singaporean' });
    expect(sg.map((t) => t.key)).toEqual(['singaporean::laksa']);
    const jp = buildWorkList(overlay, { region: 'japanese' });
    expect(jp.map((t) => t.key)).toEqual(['japanese::sushi']);
  });
  it('region filter is case-insensitive and only prefix-matches exact slug', () => {
    const upper = buildWorkList(overlay, { region: 'SINGAPOREAN' });
    expect(upper.map((t) => t.key)).toEqual(['singaporean::laksa']);
    // 'sing' should NOT prefix-match 'singaporean::' because the filter
    // anchors at '<region>::'.
    const partial = buildWorkList(overlay, { region: 'sing' });
    expect(partial).toEqual([]);
  });
  it('attaches dish / cuisine / currentNote so the prompt can reference them', () => {
    const t = buildWorkList(overlay, { region: 'japanese' })[0];
    expect(t).toMatchObject({
      key: 'japanese::sushi',
      cuisine: 'japanese',
      dish: 'sushi',
      currentNote: 'Vinegared rice with seafood.',
      klass: 'broken',
    });
  });
});

describe('curateBatch — Gemini call with mocked fetch', () => {
  function okResponse(jsonObj) {
    return {
      ok: true,
      status: 200,
      async text() { return ''; },
      async json() {
        return { candidates: [{ content: { parts: [{ text: JSON.stringify(jsonObj) }] } }] };
      },
    };
  }
  const batch = [
    { key: 'singaporean::laksa', dish: 'Laksa', cuisine: 'singaporean', currentNote: 'A coconut-curry noodle soup.' },
    { key: 'japanese::sushi',    dish: 'Sushi', cuisine: 'japanese',    currentNote: 'Vinegared rice with seafood.' },
  ];

  it('returns {source} per key on a clean response', async () => {
    const fetchFn = async () => okResponse({
      'singaporean::laksa': { source: 'https://www.visitsingapore.com/dining-drinks-singapore/local-dishes/laksa/' },
      'japanese::sushi':    { source: 'https://www.jnto.go.jp/eat-and-drink/en/cuisine/sushi/' },
    });
    const out = await curateBatch('fake-key', batch, fetchFn);
    expect(out['singaporean::laksa'].source).toContain('visitsingapore.com');
    expect(out['japanese::sushi'].source).toContain('jnto.go.jp');
  });

  it('post-filter backstop: drops any banned URL the model returns', async () => {
    const fetchFn = async () => okResponse({
      'singaporean::laksa': { source: 'https://www.youtube.com/watch?v=abc' },        // banned host
      'japanese::sushi':    { source: 'https://www.jnto.go.jp/eat-and-drink/sushi/' },
    });
    const out = await curateBatch('fake-key', batch, fetchFn);
    expect(out['singaporean::laksa']).toBeUndefined();   // banned — dropped
    expect(out['japanese::sushi'].source).toContain('jnto.go.jp');
  });

  it('post-filter backstop: drops any vertexaisearch grounding-redirect URL', async () => {
    const fetchFn = async () => okResponse({
      'singaporean::laksa': { source: 'https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ==' },
      'japanese::sushi':    { source: 'https://www.jnto.go.jp/eat-and-drink/sushi/' },
    });
    const out = await curateBatch('fake-key', batch, fetchFn);
    expect(out['singaporean::laksa']).toBeUndefined();
    expect(out['japanese::sushi'].source).toContain('jnto.go.jp');
  });

  it('drops non-URL responses (bare labels) and empty (model declined)', async () => {
    const fetchFn = async () => okResponse({
      'singaporean::laksa': { source: 'Wikipedia' },             // not a URL → dropped
      'japanese::sushi':    { source: '' },                       // model declined → dropped
    });
    const out = await curateBatch('fake-key', batch, fetchFn);
    expect(out).toEqual({});
  });

  it('drops off-tier URLs (host not in tier-1 / tier-2 / wiki)', async () => {
    // The model occasionally grounds on a random food blog. Even though the
    // URL is live and not banned, it isn't on the authorised tier list — and
    // accepting it would make the next run re-classify it as 'unknown' and
    // try to re-curate it again forever (non-convergent loop). Gate strictly.
    const fetchFn = async () => okResponse({
      'singaporean::laksa': { source: 'https://www.somefoodblog.com/laksa-recipe' }, // unknown host → dropped
      'japanese::sushi':    { source: 'https://diversivore.com/sushi-deep-dive' },   // unknown host → dropped
    });
    const out = await curateBatch('fake-key', batch, fetchFn);
    expect(out).toEqual({});
  });

  it('accepts ok-wiki URLs (tier-3 fallback)', async () => {
    const fetchFn = async () => okResponse({
      'singaporean::laksa': { source: 'https://en.wikipedia.org/wiki/Laksa' },
    });
    const out = await curateBatch('fake-key', batch.slice(0, 1), fetchFn);
    expect(out['singaporean::laksa'].source).toContain('wikipedia.org');
  });

  it('cascades to the next model on HTTP 404 and succeeds', async () => {
    let call = 0;
    const fetchFn = async (url) => {
      call += 1;
      // first model 404s, second model returns OK
      if (call === 1) return { ok: false, status: 404, async text() { return 'not found'; }, async json() { return {}; } };
      return okResponse({ 'singaporean::laksa': { source: 'https://www.tasteatlas.com/laksa' } });
    };
    const out = await curateBatch('fake-key', batch.slice(0, 1), fetchFn);
    expect(out['singaporean::laksa'].source).toContain('tasteatlas.com');
    expect(call).toBe(2);
  });

  it('throws when the entire model chain fails', async () => {
    const fetchFn = async () => ({ ok: false, status: 500, async text() { return 'server error'; }, async json() { return {}; } });
    await expect(curateBatch('fake-key', batch.slice(0, 1), fetchFn)).rejects.toThrow(/batch failed/);
  });
});

describe('serialize — overlay file format', () => {
  it('writes a Node module with sorted keys + entries count header', () => {
    const overlay = {
      'zulu::z-dish': { en: 'Z.', source: 'https://www.jnto.go.jp/x' },
      'african::akara': { en: 'A West African fritter.', source: 'https://www.tasteatlas.com/akara' },
    };
    const out = serialize(overlay);
    expect(out).toContain("'use strict';");
    expect(out).toContain('module.exports = {');
    expect(out).toMatch(/Entries: 2/);
    // sorted: african::akara before zulu::z-dish
    const aIdx = out.indexOf('"african::akara"');
    const zIdx = out.indexOf('"zulu::z-dish"');
    expect(aIdx).toBeGreaterThan(0);
    expect(zIdx).toBeGreaterThan(aIdx);
  });
  it('round-trips an overlay through serialize + Function eval', () => {
    const overlay = {
      'sg::laksa': { en: 'Coconut noodle soup.', source: 'https://www.visitsingapore.com/x' },
    };
    const code = serialize(overlay);
    // Evaluate the emitted CJS module body in a sandbox.
    const exports = {};
    const module = { exports };
    new Function('module', 'exports', code)(module, exports);
    expect(module.exports['sg::laksa']).toEqual({ en: 'Coconut noodle soup.', source: 'https://www.visitsingapore.com/x' });
  });
});
