// __tests__/translate-review-timeout.test.js — v0.62.946.
//
// Operator, 26-10 '26: "fix the 62 second review translation slowness", then
// "APPROVE QUICK cap review translation at 5 s per call and 6 s per search so a slow Gemini call
// cannot hold the cards". Railway logged reviewLocalise=62028 ms with no failure line: one Gemini
// call hung, translateReview had no timeout, and Promise.all waited on it.
import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tr = require('../translate-review.js');
const ce = require('../cuisine-enrich.js');

// A fake Gemini whose generateContent answers after `delayMs` (Infinity = never).
function fakeGenAI(delayMs, answer = 'translated text', calls = []) {
  return () => ({
    getGenerativeModel: ({ model }) => ({
      generateContent: () => {
        calls.push(model);
        return new Promise((res) => {
          if (delayMs === Infinity) return;
          setTimeout(() => res({ response: { text: () => answer } }), delayMs);
        });
      },
    }),
  });
}
function fakeRedis() {
  const store = new Map();
  return { isOpen: true, store, get: async (k) => store.get(k) ?? null, set: async (k, v) => { store.set(k, v); } };
}
const base = { text: '静かで美味しい', sourceLang: 'ja', targetLang: 'en', placeId: 'P1' };

describe('translateReview — a per-call deadline', () => {
  it('the defaults are 5 s per call and 6 s per search', () => {
    expect(tr.TRANSLATE_TIMEOUT_MS).toBe(5000);
    expect(ce.REVIEW_LOCALISE_BUDGET_MS).toBe(6000);
  });

  it('a fast answer is returned and cached', async () => {
    const redis = fakeRedis();
    const out = await tr.translateReview({ ...base, redis, timeoutMs: 200, _genAIFactory: fakeGenAI(5) });
    expect(out).toBe('translated text');
    expect(redis.store.get('translate-review:v1:P1:0:ja:en')).toBe('translated text');
  });

  it('a hung call returns the original at the deadline and does not try the rest of the chain', async () => {
    const calls = [];
    const t0 = Date.now();
    const out = await tr.translateReview({ ...base, timeoutMs: 100, _genAIFactory: fakeGenAI(Infinity, 'x', calls) });
    const took = Date.now() - t0;
    expect(out).toBe('静かで美味しい');
    expect(took).toBeGreaterThanOrEqual(90);
    expect(took).toBeLessThan(400);
    expect(calls.length).toBe(1);
  });

  it('a late answer still writes the cache, so the next search is instant', async () => {
    const redis = fakeRedis();
    const out = await tr.translateReview({ ...base, redis, timeoutMs: 50, _genAIFactory: fakeGenAI(120, 'late translation') });
    expect(out).toBe('静かで美味しい');
    expect(redis.store.size).toBe(0);
    await new Promise((r) => setTimeout(r, 150));
    expect(redis.store.get('translate-review:v1:P1:0:ja:en')).toBe('late translation');
    const again = await tr.translateReview({ ...base, redis, timeoutMs: 50, _genAIFactory: fakeGenAI(Infinity) });
    expect(again).toBe('late translation');
  });
});

describe('enrichSlow — the review step is capped for the whole search', () => {
  const modPath = require.resolve('../translate-review.js');
  const real = require.cache[modPath].exports.translateReview;
  afterEach(() => { require.cache[modPath].exports.translateReview = real; });

  const venue = (id) => ({
    placeId: id, name: id, recentReview: '静かで美味しい',
    reviews: [{ text: { text: '静かで美味しい', languageCode: 'ja' }, rating: 5 }],
  });
  const ctx = (budget) => ({
    redis: { isOpen: false }, csLang: 'en', cuisines: [], cuisineQueries: [],
    searchCenter: { lat: 1.3521, lng: 103.8198 }, isSG: true, reviewLocaliseBudgetMs: budget,
    enrichSanctuaryRead: async () => {},
  });

  it('a hung translation does not hold the cards past the budget; the original is kept', async () => {
    require.cache[modPath].exports.translateReview = () => new Promise(() => {});
    const top = [venue('A')];
    const t0 = Date.now();
    await ce.enrichSlow(top, ctx(150));
    const took = Date.now() - t0;
    expect(took).toBeLessThan(1500);
    expect(top[0].recentReview).toBe('静かで美味しい');
    expect(top[0].recentReviewSourceLang).toBeUndefined();
  });

  it('a translation that lands after the budget is never written onto a card already sent', async () => {
    let finish;
    require.cache[modPath].exports.translateReview = () => new Promise((res) => { finish = res; });
    const top = [venue('B')];
    await ce.enrichSlow(top, ctx(100));
    finish('late translation');
    await new Promise((r) => setTimeout(r, 20));
    expect(top[0].recentReview).toBe('静かで美味しい');
  });

  it('a translation inside the budget is used as before', async () => {
    require.cache[modPath].exports.translateReview = async () => 'quiet and tasty';
    const top = [venue('C')];
    await ce.enrichSlow(top, ctx(1000));
    expect(top[0].recentReview).toBe('quiet and tasty');
    expect(top[0].recentReviewSourceLang).toBe('ja');
  });
});
