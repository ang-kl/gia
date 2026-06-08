// __tests__/social-profiles.test.js — v0.61.389
// Scrape-first / Custom-Search-fallback social lookup (no Gemini). The HTTP
// getter is mocked via `_getFn`, so no live network.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const social = require('../social-profiles.js');
const {
  getSocialProfiles,
  fetchSocialProfilesForVenues,
  pickTopProfiles,
  _internal: { URL_PATTERNS, validateProfiles, socialsFromHtml, scrapeSocials, customSearchSocials, PRIORITY }
} = social;

function makeFakeRedis() {
  const store = new Map();
  return {
    store,
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async setEx(key, ttl, val) { store.set(key, val); this._lastTtl = ttl; },
    async set(key, val) { store.set(key, val); }
  };
}

// Mock the axios-style getter: a website fetch returns { data: html }; a
// customsearch URL returns { data: { items:[{link}] } }. Counts both.
function makeGet({ html = '', cseLinks = [] } = {}) {
  const calls = { scrape: 0, cse: 0 };
  const fn = async (url) => {
    if (String(url).includes('customsearch')) {
      calls.cse++;
      return { data: { items: cseLinks.map((l) => ({ link: l })) } };
    }
    calls.scrape++;
    return { data: html };
  };
  fn.calls = calls;
  return fn;
}

afterEach(() => { vi.unstubAllEnvs(); });

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
  it('accepts X.com / twitter.com, YouTube, Threads aliases', () => {
    expect(validateProfiles({ x: 'https://x.com/handle' }).x).toBe('https://x.com/handle');
    expect(validateProfiles({ x: 'https://twitter.com/handle' }).x).toBe('https://twitter.com/handle');
    expect(validateProfiles({ youtube: 'https://www.youtube.com/@handle' }).youtube).toBeTruthy();
    expect(validateProfiles({ threads: 'https://threads.com/@handle' }).threads).toBeTruthy();
  });
  it('drops hallucinated / off-domain / wrong-shape URLs', () => {
    const out = validateProfiles({
      instagram: 'https://instagra.com/handle',
      tiktok:    'https://tiktok.com/handle',          // missing @
      facebook:  'https://fb.evil.com/handle',
      x:         'https://x.com/handle/extra/path',
      youtube:   'https://www.youtube.com/watch?v=abc',
      threads:   'https://threads.net/handle'          // missing @
    });
    expect(out).toEqual({});
  });
  it('returns {} for null / non-object input', () => {
    expect(validateProfiles(null)).toEqual({});
    expect(validateProfiles({ instagram: null, tiktok: 42 })).toEqual({});
  });
});

describe('social-profiles — socialsFromHtml (website scrape extraction)', () => {
  it('extracts the first VALID profile per platform and skips share/post links', () => {
    const html = `
      <a href="https://www.facebook.com/sharer.php?u=https://x.com">share</a>
      <a href="https://www.instagram.com/yummybros/?hl=en">IG</a>
      <a href="https://instagram.com/p/ABC123">a post</a>
      <a href="https://www.facebook.com/yummybrossg">FB</a>
      <a href="https://www.tiktok.com/@yummybros">TT</a>
      <a href="https://x.com/intent/tweet">tweet</a>
    `;
    const out = socialsFromHtml(html);
    expect(out.instagram).toBe('https://www.instagram.com/yummybros');
    expect(out.facebook).toBe('https://www.facebook.com/yummybrossg');
    expect(out.tiktok).toBe('https://www.tiktok.com/@yummybros');
    expect(out.x).toBeUndefined();        // only an intent/share link
    expect(out.youtube).toBeUndefined();
  });
  it('returns {} when the HTML has no social links', () => {
    expect(socialsFromHtml('<html><body>no socials here</body></html>')).toEqual({});
    expect(socialsFromHtml('')).toEqual({});
  });
});

describe('social-profiles — scrapeSocials (website, mocked fetch)', () => {
  it('reads the venue website and returns its socials', async () => {
    const get = makeGet({ html: '<a href="https://www.instagram.com/proudpotato">x</a>' });
    const out = await scrapeSocials('https://proudpotato.sg', get);
    expect(out.instagram).toBe('https://www.instagram.com/proudpotato');
    expect(get.calls.scrape).toBe(1);
  });
  it('returns {} for no website or on fetch error', async () => {
    expect(await scrapeSocials('', makeGet())).toEqual({});
    const boom = async () => { throw new Error('ENOTFOUND'); };
    expect(await scrapeSocials('https://x.test', boom)).toEqual({});
  });
});

describe('social-profiles — customSearchSocials (mocked, env-gated)', () => {
  it('is a no-op (returns {}) when GOOGLE_CSE_ID is not set', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'KEY');
    vi.stubEnv('GOOGLE_CSE_ID', '');
    const get = makeGet({ cseLinks: ['https://www.instagram.com/x'] });
    expect(await customSearchSocials('Some Place', get)).toEqual({});
    expect(get.calls.cse).toBe(0);
  });
  it('scans result links for socials when configured', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'KEY');
    vi.stubEnv('GOOGLE_CSE_ID', 'CX');
    const get = makeGet({ cseLinks: [
      'https://example.com/about',
      'https://www.instagram.com/proudpotato',
      'https://www.facebook.com/proudpotato'
    ] });
    const out = await customSearchSocials('Proud Potato', get);
    expect(out.instagram).toBe('https://www.instagram.com/proudpotato');
    expect(out.facebook).toBe('https://www.facebook.com/proudpotato');
    expect(get.calls.cse).toBe(1);
  });
});

describe('social-profiles — getSocialProfiles (scrape + cache + CSE)', () => {
  it('scrapes the website, caches under social:<placeId> with 30-day TTL', async () => {
    vi.stubEnv('GOOGLE_CSE_ID', '');
    const redis = makeFakeRedis();
    const get = makeGet({ html: '<a href="https://www.instagram.com/proudpotato">x</a>' });
    const out = await getSocialProfiles(redis, { placeId: 'A', name: 'Proud Potato', websiteUri: 'proudpotato.sg', _getFn: get });
    expect(out.instagram).toBe('https://www.instagram.com/proudpotato');
    expect(get.calls.scrape).toBe(1);
    expect(redis.store.has('social:A')).toBe(true);
    expect(redis._lastTtl).toBe(30 * 24 * 60 * 60);
  });

  it('cache hit on the second call skips the fetch', async () => {
    vi.stubEnv('GOOGLE_CSE_ID', '');
    const redis = makeFakeRedis();
    const get = makeGet({ html: '<a href="https://www.instagram.com/x">x</a>' });
    await getSocialProfiles(redis, { placeId: 'B', name: 'T', websiteUri: 'b.sg', _getFn: get });
    const second = await getSocialProfiles(redis, { placeId: 'B', name: 'T', websiteUri: 'b.sg', _getFn: get });
    expect(get.calls.scrape).toBe(1);          // still 1 — served from cache
    expect(second.instagram).toBe('https://www.instagram.com/x');
    expect(second._fetchedAt).toBeUndefined();  // meta stripped
  });

  it('scrape-only (no CSE) with no socials → {} and is NOT cached (re-tries later)', async () => {
    vi.stubEnv('GOOGLE_CSE_ID', '');
    const redis = makeFakeRedis();
    const get = makeGet({ html: '<html>nothing</html>' });
    const out = await getSocialProfiles(redis, { placeId: 'C', name: 'T', websiteUri: 'c.sg', _getFn: get });
    expect(out).toEqual({});
    expect(redis.store.has('social:C')).toBe(false);
  });

  it('falls back to Custom Search for the gaps when GOOGLE_CSE_ID is set', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'KEY');
    vi.stubEnv('GOOGLE_CSE_ID', 'CX');
    const redis = makeFakeRedis();
    // Website has only Instagram; Custom Search supplies Facebook.
    const get = makeGet({
      html: '<a href="https://www.instagram.com/proudpotato">x</a>',
      cseLinks: ['https://www.facebook.com/proudpotato']
    });
    const out = await getSocialProfiles(redis, { placeId: 'D', name: 'Proud Potato', address: 'Kreta Ayer, Singapore', websiteUri: 'd.sg', _getFn: get });
    expect(out.instagram).toBe('https://www.instagram.com/proudpotato');
    expect(out.facebook).toBe('https://www.facebook.com/proudpotato');
    expect(get.calls.scrape).toBe(1);
    expect(get.calls.cse).toBe(1);
  });

  it('returns {} when name is missing', async () => {
    expect(await getSocialProfiles(makeFakeRedis(), { placeId: 'X', name: '' })).toEqual({});
  });
});

describe('social-profiles — fan-out + pickTopProfiles', () => {
  it('fetchSocialProfilesForVenues preserves order, respects concurrency', async () => {
    vi.stubEnv('GOOGLE_CSE_ID', '');
    const redis = makeFakeRedis();
    const inFlight = { current: 0, peak: 0 };
    const get = async (url) => {
      inFlight.current++; inFlight.peak = Math.max(inFlight.peak, inFlight.current);
      await new Promise((r) => setTimeout(r, 15));
      inFlight.current--;
      return { data: '<a href="https://www.instagram.com/x">x</a>' };
    };
    const venues = Array.from({ length: 10 }, (_, i) => ({ placeId: `P${i}`, name: `Venue ${i}`, websiteUri: `p${i}.sg` }));
    const out = await fetchSocialProfilesForVenues(redis, venues, { concurrency: 4, _getFn: get });
    expect(out).toHaveLength(10);
    expect(out.every((p) => p.instagram === 'https://www.instagram.com/x')).toBe(true);
    expect(inFlight.peak).toBeLessThanOrEqual(4);
  });

  it('pickTopProfiles emits priority order and caps', () => {
    const all = {
      youtube: 'https://www.youtube.com/@a', x: 'https://x.com/a', threads: 'https://www.threads.net/@a',
      tiktok: 'https://www.tiktok.com/@a', facebook: 'https://www.facebook.com/a', instagram: 'https://www.instagram.com/a'
    };
    expect(pickTopProfiles(all).map((o) => o.network)).toEqual(PRIORITY);
    expect(pickTopProfiles(all, 3).map((o) => o.network)).toEqual(['instagram', 'tiktok', 'facebook']);
    expect(pickTopProfiles(null)).toEqual([]);
  });

  it('URL_PATTERNS covers exactly the 6 priority networks', () => {
    expect(Object.keys(URL_PATTERNS).sort()).toEqual([...PRIORITY].sort());
  });
});
