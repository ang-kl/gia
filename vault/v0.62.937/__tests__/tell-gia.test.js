// __tests__/tell-gia.test.js — v0.57.30 Claude-Haiku NL inference + guardrails.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tg = require('../tell-gia.js');

const mockVault = {
  getAllCuisines: () => [
    { slug: 'japanese', name: 'Japanese', keywords: ['japanese', 'sushi', 'ramen'] },
    { slug: 'thai',     name: 'Thai',     keywords: ['thai', 'tom yum', 'pad thai'] },
    { slug: 'italian',  name: 'Italian',  keywords: ['italian', 'pizza', 'pasta'] },
    { slug: 'sichuan',  name: 'Sichuan',  keywords: ['sichuan', 'mapo tofu', 'ma la'] }
  ]
};

describe('tryParseJson', () => {
  it('parses plain JSON object', () => {
    expect(tg.tryParseJson('{"a": 1}')).toEqual({ a: 1 });
  });
  it('strips fences', () => {
    expect(tg.tryParseJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
  it('extracts from prose', () => {
    expect(tg.tryParseJson('Here:\n{"a":1}\nDone.')).toEqual({ a: 1 });
  });
  it('returns null for invalid', () => {
    expect(tg.tryParseJson('not json')).toBe(null);
    expect(tg.tryParseJson(null)).toBe(null);
  });
});

describe('validateInferredOutput — guardrail tests', () => {
  const slugs = new Set(['japanese', 'thai', 'italian']);

  it('drops cuisines not in valid slug set', () => {
    const r = tg.validateInferredOutput({
      cuisines: ['japanese', 'martian-food', 'thai'], filters: {}
    }, slugs);
    expect(r.cuisines).toEqual(['japanese', 'thai']);
  });

  it('caps cuisines at 5', () => {
    const r = tg.validateInferredOutput({
      cuisines: ['japanese', 'thai', 'italian', 'japanese', 'thai', 'italian', 'japanese'],
      filters: {}
    }, new Set(['japanese', 'thai', 'italian']));
    expect(r.cuisines.length).toBeLessThanOrEqual(5);
  });

  it('dedupes cuisines case-insensitively', () => {
    const r = tg.validateInferredOutput({
      cuisines: ['Japanese', 'JAPANESE', 'japanese', 'thai'], filters: {}
    }, slugs);
    expect(r.cuisines).toEqual(['japanese', 'thai']);
  });

  it('only accepts known filter keys', () => {
    const r = tg.validateInferredOutput({
      cuisines: [],
      filters: { openNow: true, evilFlag: true, halal: true, randomKey: 'x' }
    }, slugs);
    expect(r.filters.openNow).toBe(true);
    expect(r.filters.halal).toBe(true);
    expect(r.filters.evilFlag).toBeUndefined();
    expect(r.filters.randomKey).toBeUndefined();
  });

  it('coerces non-boolean filter values to default false', () => {
    const r = tg.validateInferredOutput({
      cuisines: [], filters: { openNow: 'yes', halal: 1 }
    }, slugs);
    expect(r.filters.openNow).toBe(false);
    expect(r.filters.halal).toBe(false);
  });

  it('only accepts $/$$/$$$/$$$$ in prices', () => {
    const r = tg.validateInferredOutput({
      cuisines: [], filters: { prices: ['$', '$$$$', 'free', '$$', '$'] }
    }, slugs);
    // v0.62.x — 4th tier ($$$$) now valid (matches the UI's 4-tier filter);
    // 'free' rejected, duplicate '$' deduped, input order preserved.
    expect(r.filters.prices).toEqual(['$', '$$$$', '$$']);
  });

  it('returns safe default for null/undefined input', () => {
    const r = tg.validateInferredOutput(null, slugs);
    expect(r.cuisines).toEqual([]);
    expect(r.filters.openNow).toBe(false);
    expect(r.filters.prices).toEqual([]);
  });

  it('returns safe default for non-object input (anti-injection)', () => {
    const r = tg.validateInferredOutput('malicious string', slugs);
    expect(r.cuisines).toEqual([]);
  });
});

describe('keywordFallback', () => {
  it('finds cuisines via name match', () => {
    expect(tg.keywordFallback('I want japanese food', mockVault).cuisines).toContain('japanese');
  });
  it('finds via keyword match', () => {
    expect(tg.keywordFallback('craving some pad thai tonight', mockVault).cuisines).toContain('thai');
  });
  it('extracts price tier from $ count', () => {
    expect(tg.keywordFallback('$$ budget', mockVault).filters.prices).toEqual(['$', '$$']);
    expect(tg.keywordFallback('$$$', mockVault).filters.prices).toEqual(['$', '$$', '$$$']);
  });
  it('detects open-now / halal / vegetarian', () => {
    const r = tg.keywordFallback('halal vegan open now', mockVault);
    expect(r.filters.halal).toBe(true);
    expect(r.filters.vegetarian).toBe(true);
    expect(r.filters.openNow).toBe(true);
  });
  it('caps cuisines at 5', () => {
    expect(tg.keywordFallback('japanese thai italian sichuan italian thai', mockVault).cuisines.length).toBeLessThanOrEqual(5);
  });
  it('returns source label', () => {
    expect(tg.keywordFallback('sushi', mockVault).source).toBe('keyword-fallback');
  });
});

describe('buildSystemPrompt', () => {
  it('embeds the cuisine slug list', () => {
    const p = tg.buildSystemPrompt(['japanese', 'thai', 'italian']);
    expect(p).toContain('japanese');
    expect(p).toContain('thai');
    expect(p).toContain('italian');
  });
  it('contains anti-injection guard', () => {
    const p = tg.buildSystemPrompt([]);
    expect(p).toContain('ignore previous');
    expect(p).toContain('IGNORE');
  });
  it('demands strict JSON output', () => {
    const p = tg.buildSystemPrompt([]);
    expect(p).toContain('STRICT JSON');
    expect(p).toContain('no prose');
  });
  it('restricts domain to dining', () => {
    const p = tg.buildSystemPrompt([]);
    expect(p.toLowerCase()).toContain('food');
    expect(p.toLowerCase()).toContain('dining');
  });
});

describe('module exports', () => {
  it('exposes guardrail constants', () => {
    expect(tg.MAX_INPUT_CHARS).toBe(500);
    expect(tg.MAX_LOCATION_CHARS).toBe(80);
    expect(tg.CACHE_TTL_S).toBe(60);
    expect(tg.FILTER_KEYS).toEqual(['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased']);
    expect(tg.VALID_PRICES.has('$')).toBe(true);
    expect(tg.VALID_PRICES.has('$$$$')).toBe(true);
  });
});

describe('location_override (v0.57.30)', () => {
  const slugs = new Set(['japanese', 'thai', 'italian']);

  it('keeps a short SG place reference', () => {
    const r = tg.validateInferredOutput({
      cuisines: ['italian'],
      filters: {},
      location_override: 'Kallang'
    }, slugs);
    expect(r.location_override).toBe('Kallang');
  });

  it('keeps multi-word place references', () => {
    const r = tg.validateInferredOutput({
      cuisines: [],
      filters: {},
      location_override: 'Tanjong Pagar MRT'
    }, slugs);
    expect(r.location_override).toBe('Tanjong Pagar MRT');
  });

  it('drops location_override longer than 80 chars (anti-injection)', () => {
    const long = 'A'.repeat(81);
    const r = tg.validateInferredOutput({
      cuisines: [],
      filters: {},
      location_override: long
    }, slugs);
    expect(r.location_override).toBe('');
  });

  it('returns empty location_override when missing', () => {
    const r = tg.validateInferredOutput({
      cuisines: ['italian'],
      filters: {}
    }, slugs);
    expect(r.location_override).toBe('');
  });

  it('returns empty location_override when non-string', () => {
    const r = tg.validateInferredOutput({
      cuisines: [],
      filters: {},
      location_override: { sneaky: 'object' }
    }, slugs);
    expect(r.location_override).toBe('');
  });

  it('trims whitespace from location_override', () => {
    const r = tg.validateInferredOutput({
      cuisines: [],
      filters: {},
      location_override: '   Bukit Timah   '
    }, slugs);
    expect(r.location_override).toBe('Bukit Timah');
  });
});

describe('keywordFallback — location_override (v0.57.30)', () => {
  const mockVault = {
    getAllCuisines: () => [
      { slug: 'japanese', name: 'Japanese', keywords: ['japanese', 'sushi', 'ramen'] }
    ]
  };

  it('returns empty location_override (Claude path covers location extraction)', () => {
    const r = tg.keywordFallback('japanese in Kallang', mockVault);
    expect(r.location_override).toBe('');
  });

  it('keywordFallback now detects homeBased filter', () => {
    const r = tg.keywordFallback('private dining tonight', mockVault);
    expect(r.filters.homeBased).toBe(true);
  });
});

describe('buildSystemPrompt — location_override field (v0.57.30)', () => {
  it('mentions location_override in the schema', () => {
    const p = tg.buildSystemPrompt(['italian']);
    expect(p).toContain('location_override');
  });

  it('warns LLM not to set location_override to a cuisine word', () => {
    const p = tg.buildSystemPrompt(['italian']);
    expect(p.toLowerCase()).toContain('never a cuisine');
  });

  it('lists SG place examples', () => {
    const p = tg.buildSystemPrompt(['italian']);
    expect(p).toContain('Kallang');
    expect(p).toContain('MRT');
  });
});
