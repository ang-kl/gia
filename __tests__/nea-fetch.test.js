// __tests__/nea-fetch.test.js — v0.52.0 LLM-driven NEA fetcher.
// Tests parser/normaliser only. Live LLM calls aren't tested here.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fetcher = require('../nea-fetch.js');

describe('tryParseJson', () => {
  it('parses plain JSON object', () => {
    expect(fetcher.tryParseJson('{"a": 1}')).toEqual({ a: 1 });
  });

  it('strips markdown code fences', () => {
    const r = fetcher.tryParseJson('```json\n{"a": 1}\n```');
    expect(r).toEqual({ a: 1 });
  });

  it('extracts JSON from prose-prefixed response', () => {
    const r = fetcher.tryParseJson('Here is the data:\n{"a": 1}\nHope this helps!');
    expect(r).toEqual({ a: 1 });
  });

  it('returns null for invalid JSON', () => {
    expect(fetcher.tryParseJson('not json')).toBe(null);
  });

  it('returns null for empty / null', () => {
    expect(fetcher.tryParseJson('')).toBe(null);
    expect(fetcher.tryParseJson(null)).toBe(null);
  });
});

describe('normaliseTable', () => {
  it('keeps valid headers + data', () => {
    const r = fetcher.normaliseTable({
      headers: ['Name', 'Date'],
      data: [['Maxwell', '2026-05-01']]
    });
    expect(r.headers).toEqual(['Name', 'Date']);
    expect(r.data.length).toBe(1);
  });

  it('drops empty / non-array rows', () => {
    const r = fetcher.normaliseTable({
      headers: ['x'],
      data: [['valid'], [], 'not-array', null, ['ok']]
    });
    expect(r.data.length).toBe(2);
  });

  it('returns empty for null/undefined', () => {
    expect(fetcher.normaliseTable(null)).toEqual({ headers: [], data: [] });
    expect(fetcher.normaliseTable(undefined)).toEqual({ headers: [], data: [] });
  });

  it('returns empty for non-object', () => {
    expect(fetcher.normaliseTable('string')).toEqual({ headers: [], data: [] });
  });
});

describe('exports', () => {
  it('exposes cache key + TTL', () => {
    expect(fetcher.CACHE_KEY).toBeTruthy();
    expect(typeof fetcher.CACHE_TTL_S).toBe('number');
    expect(fetcher.CACHE_TTL_S).toBeGreaterThan(60);
  });

  it('exposes a substantial PROMPT', () => {
    expect(fetcher.PROMPT.length).toBeGreaterThan(500);
    expect(fetcher.PROMPT).toContain('hawker');
    expect(fetcher.PROMPT).toContain('R&R');
  });
});
