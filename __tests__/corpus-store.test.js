// v0.62.8 — corpus-store.queryCorpus serve-path logic (stub Redis; no disk/network).
import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const store = require('../corpus-store.js');

// Minimal Redis stub: GEOSEARCH returns the seeded hits; hGetAll/get from maps.
function makeRedis({ loaded = true, hits = [], hashes = {} } = {}) {
  return {
    isOpen: true,
    async get(k) { return k.startsWith(store.LOADED_PREFIX) ? (loaded ? '100' : null) : null; },
    async hGetAll(k) { return hashes[k.replace(store.PLACE_PREFIX, '')] || {}; },
    async sendCommand(args) { return args[0] === 'GEOSEARCH' ? hits : null; },
  };
}

// GEOSEARCH WITHCOORD WITHDIST row: [id, distance, [lng, lat]]
const hit = (id, dist, lng, lat) => [id, String(dist), [String(lng), String(lat)]];

describe('queryCorpus', () => {
  let redis;
  const hits = [hit('fsq:a', 120, 100.50, 13.74), hit('fsq:b', 300, 100.51, 13.75), hit('fsq:c', 800, 100.52, 13.76)];
  const hashes = {
    'fsq:a': { name: 'Sushi A', locality: 'Bang Rak', slugs: 'japanese', address: '1 Rd' },
    'fsq:b': { name: 'Som Tum B', locality: 'Phaya Thai', slugs: 'thai' },
    'fsq:c': { name: 'Ramen C', locality: 'Sathon', slugs: 'japanese' },
  };
  beforeEach(() => { redis = makeRedis({ loaded: true, hits, hashes }); });

  it('filters to the requested cuisine slug, nearest-first, with distanceM', async () => {
    const r = await store.queryCorpus(redis, { city: 'Bangkok', lat: 13.74, lng: 100.50, radiusM: 5000, slugs: ['japanese'] });
    expect(r.map((v) => v.id)).toEqual(['fsq:a', 'fsq:c']);   // thai 'b' excluded; order preserved
    expect(r[0]).toMatchObject({ name: 'Sushi A', area: 'Bang Rak', distanceM: 120, source: 'corpus', placeId: null, rating: null });
  });

  it('no-slug query returns all (browse), capped by limit', async () => {
    const r = await store.queryCorpus(redis, { city: 'Bangkok', lat: 13.74, lng: 100.5, radiusM: 5000, slugs: [], limit: 2 });
    expect(r).toHaveLength(2);
  });

  it('returns [] when the city is not loaded (caller falls back to live Places)', async () => {
    const r = await store.queryCorpus(makeRedis({ loaded: false, hits, hashes }), { city: 'Bangkok', lat: 13.74, lng: 100.5, radiusM: 5000, slugs: ['japanese'] });
    expect(r).toEqual([]);
  });

  it('returns [] on no geo hits', async () => {
    const r = await store.queryCorpus(makeRedis({ loaded: true, hits: [], hashes }), { city: 'Bangkok', lat: 13.74, lng: 100.5, radiusM: 5000, slugs: ['japanese'] });
    expect(r).toEqual([]);
  });
});

describe('corpusCityForPoint / corpusHasCity', () => {
  it('are safe with no manifest (returns null/false, never throws)', () => {
    // manifest may be absent in CI before a harvest — must degrade gracefully.
    expect(() => store.corpusCityForPoint(13.74, 100.5)).not.toThrow();
    expect(typeof store.corpusHasCity('Bangkok')).toBe('boolean');
  });
});
