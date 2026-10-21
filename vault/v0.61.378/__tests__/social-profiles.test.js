// __tests__/social-profiles.test.js — v0.61.225

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const social = require('../social-profiles.js');
const {
  getSocialProfiles,
  fetchSocialProfilesForVenues,
  pickTopProfiles,
  _internal: { URL_PATTERNS, validateProfiles, parseJsonResponse, PRIORITY }
} = social;

// A minimal Redis stand-in. Tracks set / setEx calls so tests can
// assert TTL handling without spinning up a real client.
function makeFakeRedis() {
  const store = new Map();
  return {
    store,
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async setEx(key, ttl, val) { store.set(key, val); this._lastTtl = ttl; },
    async set(key, val) { store.set(key, val); }
  };
}

// A Gemini factory mock — returns a fake `getGenerativeModel` that
// resolves to whatever raw text the test plants. Counts invocations
// so we can verify cache hits skip the API.
function makeGeminiFactory(textOrFn) {
  const calls = { count: 0 };
  const factory = () => ({
    getGenerativeModel: () => ({
      generateContent: async (prompt) => {
        calls.count++;
        const text = typeof textOrFn === 'function' ? textOrFn(prompt) : textOrFn;
        return { response: { text: () => text } };
      }
    })
  });
  factory.calls = calls;
  return factory;
}

describe('social-profiles — URL pattern validation', () => {
  it('accepts canonical Instagram / TikTok / Facebook URLs', () => {
    const out = validateProfiles({
      instagram: 'https://www.instagram.com/proudpotatopeeler',
      tiktok:    'https://www.tiktok.com/@proudpotato',
      facebook:  'https://www.facebook.com/proudpotato'
    });
    expect(out.instagram).toBe('https://www.instagram.com/proudpotatopeeler');
    expect(out.tiktok).toBe('https://www.tiktok.com/@proudpotato');
    expect(out.facebook).toBe('https://www.facebook.com/proudpotato');
  });

  it('accepts X.com and twitter.com aliases', () => {
    expect(validateProfiles({ x: 'https://x.com/handle' }).x).toBe('https://x.com/handle');
    expect(validateProfiles({ x: 'https://twitter.com/handle' }).x).toBe('https://twitter.com/handle');
  });

  it('accepts YouTube @-handle, channel, and user URLs', () => {
    expect(validateProfiles({ youtube: 'https://www.youtube.com/@handle' }).youtube).toBeTruthy();
    expect(validateProfiles({ youtube: 'https://www.youtube.com/channel/UC1234567890ABCDEFGHIJKL' }).youtube).toBeTruthy();
    expect(validateProfiles({ youtube: 'https://www.youtube.com/user/legacyName' }).youtube).toBeTruthy();
  });

  it('accepts threads.net and threads.com', () => {
    expect(validateProfiles({ threads: 'https://www.threads.net/@handle' }).threads).toBeTruthy();
    expect(validateProfiles({ threads: 'https://threads.com/@handle' }).threads).toBeTruthy();
  });

  it('drops obviously hallucinated / off-domain URLs', () => {
    const out = validateProfiles({
      instagram: 'https://instagra.com/handle',          // typo domain
      tiktok:    'https://tiktok.com/handle',            // missing @
      facebook:  'https://fb.evil.com/handle',           // subdomain attack
      x:         'https://x.com/handle/extra/path',      // too deep
      youtube:   'https://www.youtube.com/watch?v=abc',  // video, not channel
      threads:   'https://threads.net/handle'            // missing @
    });
    expect(out).toEqual({});
  });

  it('drops non-string and null values silently', () => {
    expect(validateProfiles({ instagram: null, tiktok: 42, facebook: undefined })).toEqual({});
  });

  it('returns {} for null input', () => {
    expect(validateProfiles(null)).toEqual({});
    expect(validateProfiles(undefined)).toEqual({});
  });
});

describe('social-profiles — JSON parser', () => {
  it('parses bare JSON', () => {
    const r = parseJsonResponse('{"instagram":"https://www.instagram.com/x","tiktok":null}');
    expect(r.instagram).toBe('https://www.instagram.com/x');
  });
  it('parses fenced JSON (```json)', () => {
    const r = parseJsonResponse('```json\n{"instagram":"https://www.instagram.com/x"}\n```');
    expect(r.instagram).toBe('https://www.instagram.com/x');
  });
  it('parses with surrounding prose', () => {
    const r = parseJsonResponse('Here is the JSON: {"instagram":"https://www.instagram.com/x"} — done.');
    expect(r.instagram).toBe('https://www.instagram.com/x');
  });
  it('returns null on malformed input', () => {
    expect(parseJsonResponse('not json at all')).toBe(null);
    expect(parseJsonResponse('{ broken')).toBe(null);
    expect(parseJsonResponse('')).toBe(null);
    expect(parseJsonResponse(null)).toBe(null);
  });
});

describe('social-profiles — pickTopProfiles priority + cap', () => {
  it('emits in priority order: IG → TikTok → FB → X → YouTube → Threads', () => {
    const all = {
      youtube:   'https://www.youtube.com/@a',
      x:         'https://x.com/a',
      threads:   'https://www.threads.net/@a',
      tiktok:    'https://www.tiktok.com/@a',
      facebook:  'https://www.facebook.com/a',
      instagram: 'https://www.instagram.com/a'
    };
    const out = pickTopProfiles(all);
    expect(out.map((o) => o.network)).toEqual(PRIORITY);
  });
  it('caps to 3 — top picks are IG, TikTok, Facebook', () => {
    const all = {
      youtube:   'https://www.youtube.com/@a',
      x:         'https://x.com/a',
      tiktok:    'https://www.tiktok.com/@a',
      facebook:  'https://www.facebook.com/a',
      instagram: 'https://www.instagram.com/a'
    };
    const out = pickTopProfiles(all, 3);
    expect(out.map((o) => o.network)).toEqual(['instagram', 'tiktok', 'facebook']);
  });
  it('skips missing platforms (no holes)', () => {
    const out = pickTopProfiles({
      tiktok:  'https://www.tiktok.com/@a',
      youtube: 'https://www.youtube.com/@a'
    }, 3);
    expect(out.map((o) => o.network)).toEqual(['tiktok', 'youtube']);
  });
  it('returns [] for empty / null input', () => {
    expect(pickTopProfiles({})).toEqual([]);
    expect(pickTopProfiles(null)).toEqual([]);
  });
});

describe('social-profiles — Gemini lookup with cache', () => {
  const ggJson = (text) => makeGeminiFactory(text);

  it('caches successful lookups under social:<placeId> with 30-day TTL', async () => {
    const redis = makeFakeRedis();
    const factory = ggJson('{"instagram":"https://www.instagram.com/proudpotato","tiktok":null,"facebook":null,"x":null,"youtube":null,"threads":null}');
    const out = await getSocialProfiles(redis, {
      placeId: 'PLACE_A',
      name: 'Proud Potato Peeler',
      address: '5 Kadayanallur St',
      _genAIFactory: factory
    });
    expect(out.instagram).toBe('https://www.instagram.com/proudpotato');
    expect(factory.calls.count).toBe(1);
    expect(redis.store.has('social:PLACE_A')).toBe(true);
    expect(redis._lastTtl).toBe(30 * 24 * 60 * 60);
  });

  it('cache hit on second call avoids Gemini', async () => {
    const redis = makeFakeRedis();
    const factory = ggJson('{"instagram":"https://www.instagram.com/x","tiktok":null,"facebook":null,"x":null,"youtube":null,"threads":null}');
    await getSocialProfiles(redis, { placeId: 'PLACE_B', name: 'Test', _genAIFactory: factory });
    expect(factory.calls.count).toBe(1);
    const second = await getSocialProfiles(redis, { placeId: 'PLACE_B', name: 'Test', _genAIFactory: factory });
    expect(factory.calls.count).toBe(1);                  // still 1 — served from cache
    expect(second.instagram).toBe('https://www.instagram.com/x');
    expect(second._fetchedAt).toBeUndefined();             // meta stripped
  });

  it('drops hallucinated URLs even when Gemini returns them', async () => {
    const redis = makeFakeRedis();
    const factory = ggJson('{"instagram":"https://malicious.example/handle","tiktok":"https://www.tiktok.com/@real","facebook":null,"x":null,"youtube":null,"threads":null}');
    const out = await getSocialProfiles(redis, {
      placeId: 'PLACE_C', name: 'Test', _genAIFactory: factory
    });
    expect(out.instagram).toBeUndefined();
    expect(out.tiktok).toBe('https://www.tiktok.com/@real');
  });

  it('empty result is still cached (negative caching)', async () => {
    const redis = makeFakeRedis();
    const factory = ggJson('{"instagram":null,"tiktok":null,"facebook":null,"x":null,"youtube":null,"threads":null}');
    const out = await getSocialProfiles(redis, { placeId: 'PLACE_D', name: 'Test', _genAIFactory: factory });
    expect(out).toEqual({});
    expect(redis.store.has('social:PLACE_D')).toBe(true);
  });

  it('Gemini total failure returns {} and does NOT cache', async () => {
    const redis = makeFakeRedis();
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => { throw new Error('upstream 500'); }
      })
    });
    const out = await getSocialProfiles(redis, {
      placeId: 'PLACE_E', name: 'Test', _genAIFactory: factory
    });
    expect(out).toEqual({});
    expect(redis.store.has('social:PLACE_E')).toBe(false); // no negative-cache on transient failure
  });

  it('returns {} when name is missing (guard)', async () => {
    const out = await getSocialProfiles(makeFakeRedis(), { placeId: 'X', name: '' });
    expect(out).toEqual({});
  });
});

describe('social-profiles — fan-out helper', () => {
  it('preserves venue order and respects concurrency cap', async () => {
    const redis = makeFakeRedis();
    const inFlight = { current: 0, peak: 0 };
    const factory = () => ({
      getGenerativeModel: () => ({
        generateContent: async () => {
          inFlight.current++;
          inFlight.peak = Math.max(inFlight.peak, inFlight.current);
          await new Promise((r) => setTimeout(r, 20));
          inFlight.current--;
          return { response: { text: () => '{"instagram":"https://www.instagram.com/x","tiktok":null,"facebook":null,"x":null,"youtube":null,"threads":null}' } };
        }
      })
    });
    const venues = Array.from({ length: 10 }, (_, i) => ({
      placeId: `P${i}`, name: `Venue ${i}`
    }));
    const out = await fetchSocialProfilesForVenues(redis, venues, { concurrency: 4, _genAIFactory: factory });
    expect(out).toHaveLength(10);
    expect(out.every((p) => p.instagram === 'https://www.instagram.com/x')).toBe(true);
    expect(inFlight.peak).toBeLessThanOrEqual(4);
  });

  it('returns [] for empty input', async () => {
    const out = await fetchSocialProfilesForVenues(makeFakeRedis(), []);
    expect(out).toEqual([]);
  });
});

describe('social-profiles — URL_PATTERNS shape (regression guard)', () => {
  it('covers exactly the 6 priority networks', () => {
    expect(Object.keys(URL_PATTERNS).sort()).toEqual([...PRIORITY].sort());
  });
});
