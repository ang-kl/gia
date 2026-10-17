// __tests__/translate-review.test.js — v0.61.152
//
// Unit tests for the translate-review helper. Covers the
// source==target short-circuit, Redis cache hit/miss, prompt
// construction (via the injected factory's recorded call), and
// graceful API-failure fallback to the original text.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { translateReview, primaryTag, langName } from '../translate-review.js';

function makeFakeRedis({ initial = {}, isOpen = true } = {}) {
  const store = { ...initial };
  return {
    isOpen,
    store,
    async get(k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; },
    async set(k, v) { store[k] = v; return 'OK'; }
  };
}

function makeFakeGenAI({ output = 'translated text', throwsOn = [], emptyOn = [] } = {}) {
  const calls = [];
  const getGenerativeModel = ({ model }) => ({
    generateContent: async (prompt) => {
      calls.push({ model, prompt });
      if (throwsOn.includes(model)) throw new Error(`mock fail ${model}`);
      if (emptyOn.includes(model)) {
        return { response: { text: () => '' } };
      }
      return { response: { text: () => output } };
    }
  });
  return { calls, getGenerativeModel };
}

describe('primaryTag', () => {
  it('normalises BCP-47 subtags', () => {
    expect(primaryTag('zh-Hans')).toBe('zh');
    expect(primaryTag('zh-CN')).toBe('zh');
    expect(primaryTag('en-US')).toBe('en');
    expect(primaryTag('FR')).toBe('fr');
  });
  it('returns empty for non-strings / empties', () => {
    expect(primaryTag(null)).toBe('');
    expect(primaryTag(undefined)).toBe('');
    expect(primaryTag('')).toBe('');
    expect(primaryTag(42)).toBe('');
  });
});

describe('langName', () => {
  it('maps primary tags to English names', () => {
    expect(langName('it')).toBe('Italian');
    expect(langName('ja')).toBe('Japanese');
    expect(langName('zh-Hant')).toBe('Chinese');
  });
  it('upper-cases unknown tags as a fallback', () => {
    expect(langName('xyz')).toBe('XYZ');
  });
  it('returns empty for empties', () => {
    expect(langName(null)).toBe('');
    expect(langName('')).toBe('');
  });
});

describe('translateReview — short-circuits', () => {
  it('returns original when src === tgt', async () => {
    const fake = makeFakeGenAI();
    const out = await translateReview({
      text: 'Hello',
      sourceLang: 'en',
      targetLang: 'en',
      _genAIFactory: () => fake
    });
    expect(out).toBe('Hello');
    expect(fake.calls.length).toBe(0);
  });
  it('returns original when targetLang missing', async () => {
    const fake = makeFakeGenAI();
    const out = await translateReview({
      text: 'Ciao',
      sourceLang: 'it',
      targetLang: '',
      _genAIFactory: () => fake
    });
    expect(out).toBe('Ciao');
    expect(fake.calls.length).toBe(0);
  });
  it('returns empty for empty input', async () => {
    const fake = makeFakeGenAI();
    const out = await translateReview({
      text: '   ',
      sourceLang: 'it',
      targetLang: 'en',
      _genAIFactory: () => fake
    });
    expect(out).toBe('');
    expect(fake.calls.length).toBe(0);
  });
});

describe('translateReview — Gemini path', () => {
  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });
  it('translates via the injected factory and returns the cleaned text', async () => {
    const fake = makeFakeGenAI({ output: 'Fresh pasta made in-house' });
    const out = await translateReview({
      text: 'Pasta fresca fatta in casa',
      sourceLang: 'it',
      targetLang: 'en',
      _genAIFactory: () => fake
    });
    expect(out).toBe('Fresh pasta made in-house');
    expect(fake.calls.length).toBeGreaterThan(0);
    expect(fake.calls[0].prompt).toContain('Italian');
    expect(fake.calls[0].prompt).toContain('English');
    expect(fake.calls[0].prompt).toContain('Pasta fresca fatta in casa');
  });
  it('strips ```fences and surrounding "" from the model output', async () => {
    const fake = makeFakeGenAI({ output: '```\n"Fresh pasta"\n```' });
    const out = await translateReview({
      text: 'Pasta fresca',
      sourceLang: 'it',
      targetLang: 'en',
      _genAIFactory: () => fake
    });
    expect(out).toBe('Fresh pasta');
  });
  it('falls back to original on all-model failure', async () => {
    const fake = makeFakeGenAI({ throwsOn: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'] });
    const out = await translateReview({
      text: 'Pasta fresca',
      sourceLang: 'it',
      targetLang: 'en',
      _genAIFactory: () => fake
    });
    expect(out).toBe('Pasta fresca');
  });
  it('falls back to original on empty Gemini response', async () => {
    const fake = makeFakeGenAI({ emptyOn: ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'] });
    const out = await translateReview({
      text: 'Pasta fresca',
      sourceLang: 'it',
      targetLang: 'en',
      _genAIFactory: () => fake
    });
    expect(out).toBe('Pasta fresca');
  });
});

describe('translateReview — Redis cache', () => {
  it('returns cached translation without calling Gemini', async () => {
    const redis = makeFakeRedis({
      initial: { 'translate-review:v1:abc:0:it:en': 'cached EN text' }
    });
    const fake = makeFakeGenAI();
    const out = await translateReview({
      text: 'Pasta fresca',
      sourceLang: 'it',
      targetLang: 'en',
      placeId: 'abc',
      reviewIdx: 0,
      redis,
      _genAIFactory: () => fake
    });
    expect(out).toBe('cached EN text');
    expect(fake.calls.length).toBe(0);
  });
  it('writes to Redis on a fresh translation', async () => {
    const redis = makeFakeRedis();
    const fake = makeFakeGenAI({ output: 'Fresh pasta made in-house' });
    await translateReview({
      text: 'Pasta fresca',
      sourceLang: 'it',
      targetLang: 'en',
      placeId: 'xyz',
      reviewIdx: 1,
      redis,
      _genAIFactory: () => fake
    });
    expect(redis.store['translate-review:v1:xyz:1:it:en']).toBe('Fresh pasta made in-house');
  });
  it('skips cache when redis is closed', async () => {
    const redis = makeFakeRedis({ isOpen: false });
    const fake = makeFakeGenAI({ output: 'Fresh pasta' });
    const out = await translateReview({
      text: 'Pasta fresca',
      sourceLang: 'it',
      targetLang: 'en',
      placeId: 'q',
      redis,
      _genAIFactory: () => fake
    });
    expect(out).toBe('Fresh pasta');
    expect(redis.store).toEqual({});
  });
});
