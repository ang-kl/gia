// cuisine-venue-counts.test.js — v0.61.173
//
// Coverage targets:
//   - SCOPE_SLUGS frozen + correct cardinality + all slugs present
//     in the live cuisines-vault.
//   - buildTextQuery prefers vault.searchQuery, falls back to
//     "<name> restaurant Singapore" when missing.
//   - countOne: paginates, dedups across pages, returns capped=true
//     at the 60-ceiling, isolates errors, null on missing API key.
//   - countAll: aggregates total, propagates per-slug errors,
//     surfaces capped slugs.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cuisinesVault = require('../cuisines-vault');
const {
  SCOPE_SLUGS,
  buildTextQuery,
  countOne,
  countOneTiled,
  countAll,
  PAGE_SIZE,
  MAX_PAGES,
  SG_TILES,
  JB_TILES,
  TILES,
  SATURATING_SLUGS
} = require('../cuisine-venue-counts');

describe('SCOPE_SLUGS', () => {
  it('contains exactly 47 slugs (operator-confirmed subset, v0.61.234 dropped Australasia catch-all)', () => {
    expect(SCOPE_SLUGS.length).toBe(47);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(SCOPE_SLUGS)).toBe(true);
  });

  it('has no duplicates', () => {
    const seen = new Set(SCOPE_SLUGS);
    expect(seen.size).toBe(SCOPE_SLUGS.length);
  });

  it('every slug exists in cuisines-vault.getAllCuisines()', () => {
    const have = new Set(cuisinesVault.getAllCuisines().map((c) => c.slug));
    const missing = SCOPE_SLUGS.filter((s) => !have.has(s));
    expect(missing).toEqual([]);
  });

  it('excludes the 19 slugs the operator chose to drop', () => {
    const excluded = [
      'singaporean', 'south-indian', 'malaysian', 'indonesian', 'chinese',
      'sichuan', 'cantonese', 'hunan', 'hokkien', 'teochew', 'hainanese',
      'hakka', 'hong-kong', 'macau', 'european', 'mediterranean', 'turkish',
      'dessert', 'fusion'
    ];
    const set = new Set(SCOPE_SLUGS);
    for (const slug of excluded) {
      expect(set.has(slug)).toBe(false);
    }
  });
});

describe('buildTextQuery', () => {
  it('uses vault.searchQuery when present', () => {
    const q = buildTextQuery(cuisinesVault, 'italian');
    expect(q.toLowerCase()).toContain('italian');
    expect(q.toLowerCase()).toContain('singapore');
  });

  it('falls back to "<name> restaurant Singapore" when vault has no searchQuery', () => {
    const fakeVault = {
      getAllCuisines: () => [{ slug: 'fake', name: 'Fake' }]
    };
    expect(buildTextQuery(fakeVault, 'fake')).toBe('Fake restaurant Singapore');
  });

  it('falls back to slug when neither name nor searchQuery is present', () => {
    const fakeVault = {
      getAllCuisines: () => [{ slug: 'orphan' }]
    };
    expect(buildTextQuery(fakeVault, 'orphan')).toBe('orphan restaurant Singapore');
  });
});

describe('countOne', () => {
  it('returns n=null + error when GOOGLE_MAPS_API_KEY is missing', async () => {
    const out = await countOne('italian', { apiKey: '' });
    expect(out.n).toBeNull();
    expect(out.error).toMatch(/API_KEY/i);
  });

  it('counts unique placeIds across one page', async () => {
    const fetchFn = async () => ({
      places: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      nextPageToken: null
    });
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBe(3);
    expect(out.pages).toBe(1);
    expect(out.capped).toBe(false);
  });

  it('paginates up to 3 pages and dedups overlapping placeIds', async () => {
    let call = 0;
    const fetchFn = async () => {
      call += 1;
      if (call === 1) {
        return { places: [{ id: 'a' }, { id: 'b' }], nextPageToken: 'tok1' };
      }
      if (call === 2) {
        // overlap: 'b' returned again
        return { places: [{ id: 'b' }, { id: 'c' }, { id: 'd' }], nextPageToken: 'tok2' };
      }
      return { places: [{ id: 'e' }], nextPageToken: null };
    };
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBe(5);     // a, b, c, d, e (b deduped)
    expect(out.pages).toBe(3);
    expect(call).toBe(3);
  });

  it('caps pagination at MAX_PAGES even if nextPageToken keeps coming', async () => {
    let call = 0;
    const fetchFn = async () => {
      call += 1;
      const ids = Array.from({ length: PAGE_SIZE }, (_, i) => `p${call}-${i}`);
      return { places: ids.map((id) => ({ id })), nextPageToken: 'more' };
    };
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.pages).toBe(MAX_PAGES);
    expect(out.n).toBe(PAGE_SIZE * MAX_PAGES);    // 60
    expect(out.capped).toBe(true);
    expect(call).toBe(MAX_PAGES);
  });

  it('surfaces the network error message + bails further pagination', async () => {
    const fetchFn = async () => { throw new Error('ECONNRESET'); };
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBeNull();
    expect(out.error).toMatch(/ECONNRESET/);
    expect(out.pages).toBe(0);
  });

  it('returns n=0 (not null) when the first page is empty', async () => {
    const fetchFn = async () => ({ places: [], nextPageToken: null });
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBe(0);
    expect(out.error).toBeNull();
  });
});

describe('countAll', () => {
  it('aggregates per-slug counts into a total + isolates per-slug errors', async () => {
    // v0.61.181 — fetchFn returns a stable id per cuisine so dedup
    // keeps each at exactly 1 regardless of whether the cuisine is
    // single-queried or tile-searched (saturating slugs fire 15 tile
    // calls × ~1 page each, but they all return the same id and
    // dedup to 1).
    const fetchFn = async ({ textQuery }) => {
      if (textQuery.toLowerCase().startsWith('japanese')) throw new Error('quota');
      const seed = String(textQuery).toLowerCase().split(/\s+/)[0];
      return { places: [{ id: `id-${seed}` }], nextPageToken: null };
    };
    const out = await countAll({ apiKey: 'x', fetchFn });
    expect(Object.keys(out.perSlug).length).toBe(SCOPE_SLUGS.length);
    expect(out.errors.japanese).toMatch(/quota/);
    expect(out.perSlug.japanese).toBeNull();
    // 47 cuisines × 1 unique placeId (deduped across single + tile
    // calls) = 47
    expect(out.total).toBe(SCOPE_SLUGS.length - 1);
  });

  it('surfaces capped slugs (non-saturating only — tiled slugs never report capped)', async () => {
    const fetchFn = async () => ({
      places: Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `pid-${i}-${Math.random()}` })),
      nextPageToken: 'more'
    });
    const out = await countAll({ apiKey: 'x', fetchFn });
    // v0.61.181 — only non-saturating cuisines go through countOne
    // (which sets capped=true at the 60-ceiling). Saturating slugs
    // route through countOneTiled which never sets capped (no
    // single API ceiling to hit across 15 different tile circles).
    const expectedCapped = SCOPE_SLUGS.filter((s) => !SATURATING_SLUGS.has(s));
    expect(out.capped.length).toBe(expectedCapped.length);
    expect(out.tiledSlugs.sort()).toEqual([...SATURATING_SLUGS].sort());
  });

  it('records elapsedMs as a finite number', async () => {
    const fetchFn = async () => ({ places: [], nextPageToken: null });
    const out = await countAll({ apiKey: 'x', fetchFn });
    expect(Number.isFinite(out.elapsedMs)).toBe(true);
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('writes an ISO 8601 timestamp', async () => {
    const fetchFn = async () => ({ places: [], nextPageToken: null });
    const out = await countAll({ apiKey: 'x', fetchFn });
    expect(new Date(out.ts).toString()).not.toBe('Invalid Date');
  });
});

// v0.61.177 — Redis persistence layer.
const { persistToRedis, loadFromRedis, REDIS_KEY, REDIS_TTL_S } = require('../cuisine-venue-counts');

function makeFakeRedis() {
  const store = new Map();
  const ttls = new Map();
  return {
    isOpen: true,
    async set(key, value, opts) {
      store.set(key, value);
      if (opts && opts.EX) ttls.set(key, opts.EX);
      return 'OK';
    },
    async get(key) {
      return store.has(key) ? store.get(key) : null;
    },
    _ttl(key) { return ttls.get(key); }
  };
}

describe('persistToRedis / loadFromRedis', () => {
  it('REDIS_KEY + REDIS_TTL_S are sane', () => {
    expect(REDIS_KEY).toBe('cuisine-venue-counts:latest');
    expect(REDIS_TTL_S).toBeGreaterThan(7 * 24 * 60 * 60);   // > 1 week
    expect(REDIS_TTL_S).toBeLessThanOrEqual(365 * 24 * 60 * 60);  // <= 1 year
  });

  it('persists + loads a result object round-trip', async () => {
    const redis = makeFakeRedis();
    const result = { ts: '2026-05-27T00:00:00Z', total: 612, perSlug: { italian: 60, czech: 5 }, capped: ['italian'], errors: {}, pages: 78, elapsedMs: 14823 };
    expect(await persistToRedis(redis, result)).toBe(true);
    const loaded = await loadFromRedis(redis);
    expect(loaded).toEqual(result);
  });

  it('persist sets the configured TTL', async () => {
    const redis = makeFakeRedis();
    await persistToRedis(redis, { total: 100, perSlug: {}, capped: [], errors: {} });
    expect(redis._ttl(REDIS_KEY)).toBe(REDIS_TTL_S);
  });

  it('persist returns false when redis is null', async () => {
    expect(await persistToRedis(null, { total: 0 })).toBe(false);
  });

  it('persist returns false when redis is closed', async () => {
    const closed = { isOpen: false };
    expect(await persistToRedis(closed, { total: 0 })).toBe(false);
  });

  it('persist returns false when result is not an object', async () => {
    const redis = makeFakeRedis();
    expect(await persistToRedis(redis, null)).toBe(false);
    expect(await persistToRedis(redis, 'not-an-object')).toBe(false);
  });

  it('load returns null when redis is null', async () => {
    expect(await loadFromRedis(null)).toBeNull();
  });

  it('load returns null when redis is closed', async () => {
    expect(await loadFromRedis({ isOpen: false })).toBeNull();
  });

  it('load returns null when key is empty', async () => {
    const redis = makeFakeRedis();
    expect(await loadFromRedis(redis)).toBeNull();
  });

  it('load returns null when stored JSON is corrupt', async () => {
    const redis = makeFakeRedis();
    await redis.set(REDIS_KEY, '{not-valid-json');
    expect(await loadFromRedis(redis)).toBeNull();
  });
});

// v0.61.179 — 60-second debounce on the chat-side Recount button.
const { claimDebounceSlot, DEBOUNCE_KEY, DEBOUNCE_TTL_S } = require('../cuisine-venue-counts');

function makeFakeRedisWithSetNX() {
  const store = new Map();
  const ttls = new Map();
  return {
    isOpen: true,
    async set(key, value, opts) {
      if (opts && opts.NX && store.has(key)) return null;   // NX fails when key exists
      store.set(key, value);
      if (opts && opts.EX) ttls.set(key, opts.EX);
      return 'OK';
    },
    async get(key) { return store.has(key) ? store.get(key) : null; },
    async ttl(key) { return ttls.has(key) ? ttls.get(key) : -2; }
  };
}

describe('claimDebounceSlot (v0.61.179)', () => {
  it('exports the key + TTL constants', () => {
    expect(DEBOUNCE_KEY).toBe('cuisine-venue-counts:debounce');
    expect(DEBOUNCE_TTL_S).toBe(60);
  });

  it('first caller wins the slot', async () => {
    const redis = makeFakeRedisWithSetNX();
    const result = await claimDebounceSlot(redis);
    expect(result.won).toBe(true);
    expect(result.remainingSec).toBe(0);
  });

  it('second concurrent caller loses + gets the remaining TTL', async () => {
    const redis = makeFakeRedisWithSetNX();
    const first = await claimDebounceSlot(redis);
    const second = await claimDebounceSlot(redis);
    expect(first.won).toBe(true);
    expect(second.won).toBe(false);
    expect(second.remainingSec).toBe(DEBOUNCE_TTL_S);
  });

  it('returns won=true when redis is null (no Redis = no debounce, fail-open)', async () => {
    const result = await claimDebounceSlot(null);
    expect(result.won).toBe(true);
  });

  it('returns won=true when redis is closed (fail-open)', async () => {
    const result = await claimDebounceSlot({ isOpen: false });
    expect(result.won).toBe(true);
  });

  it('returns won=true when SET throws (fail-open — debounce is best-effort, not a security gate)', async () => {
    const redis = makeFakeRedisWithSetNX();
    redis.set = async () => { throw new Error('redis-down'); };
    const result = await claimDebounceSlot(redis);
    expect(result.won).toBe(true);
  });
});

// v0.61.181 — geographic tile-search for saturating cuisines.
describe('tiles (v0.61.181 geometry)', () => {
  it('exports 9 SG tiles + 6 JB tiles = 15 total', () => {
    expect(SG_TILES.length).toBe(9);
    expect(JB_TILES.length).toBe(6);
    expect(TILES.length).toBe(15);
  });

  it('all tiles are frozen', () => {
    expect(Object.isFrozen(SG_TILES)).toBe(true);
    expect(Object.isFrozen(JB_TILES)).toBe(true);
    expect(Object.isFrozen(TILES)).toBe(true);
  });

  it('every tile carries id + region + lat + lng + radiusM + label', () => {
    for (const t of TILES) {
      expect(typeof t.id).toBe('string');
      expect(['SG', 'JB']).toContain(t.region);
      expect(Number.isFinite(t.lat)).toBe(true);
      expect(Number.isFinite(t.lng)).toBe(true);
      expect(Number.isFinite(t.radiusM)).toBe(true);
      expect(t.radiusM).toBeGreaterThan(0);
      expect(typeof t.label).toBe('string');
    }
  });

  it('Legoland Malaysia (1.4248, 103.6347) is inside JB tile #1', () => {
    const t = JB_TILES[0];
    const distM = haversineMeters(1.4248, 103.6347, t.lat, t.lng);
    expect(distM).toBeLessThanOrEqual(t.radiusM);
  });

  it('Desaru (1.5400, 104.2700) is inside JB tile #6', () => {
    const t = JB_TILES[5];
    const distM = haversineMeters(1.5400, 104.2700, t.lat, t.lng);
    expect(distM).toBeLessThanOrEqual(t.radiusM);
  });

  it('SCOPE_SLUGS contains every SATURATING_SLUGS entry', () => {
    for (const slug of SATURATING_SLUGS) {
      expect(SCOPE_SLUGS).toContain(slug);
    }
  });

  it('SATURATING_SLUGS is exactly 8 slugs', () => {
    expect(SATURATING_SLUGS.size).toBe(8);
  });
});

describe('countOneTiled', () => {
  it('issues one fetch per tile (× pagination)', async () => {
    let callCount = 0;
    const tilesUsed = new Set();
    const fetchFn = async ({ locationBias }) => {
      callCount += 1;
      const c = locationBias?.circle?.center;
      if (c) tilesUsed.add(`${c.latitude},${c.longitude}`);
      return { places: [{ id: 'shared' }], nextPageToken: null };
    };
    const out = await countOneTiled('italian', { apiKey: 'x', fetchFn });
    expect(callCount).toBe(TILES.length);
    expect(tilesUsed.size).toBe(TILES.length);
    expect(out.tiles).toBe(TILES.length);
    expect(out.n).toBe(1);   // all tiles returned 'shared' → deduped
  });

  it('dedups placeIds across tiles', async () => {
    let i = 0;
    const fetchFn = async () => {
      i += 1;
      // Each tile returns 2 ids, with 1 overlap between adjacent tiles.
      return {
        places: [{ id: `p-${i}` }, { id: `p-${Math.max(1, i - 1)}` }],
        nextPageToken: null
      };
    };
    const out = await countOneTiled('italian', { apiKey: 'x', fetchFn });
    expect(out.tiles).toBe(TILES.length);
    // 15 unique fresh ids + overlap deduped = 15
    expect(out.n).toBe(TILES.length);
  });

  it('paginates per tile up to MAX_PAGES', async () => {
    let tileNo = 0;
    let pageNo = 0;
    const fetchFn = async ({ pageToken }) => {
      if (!pageToken) { tileNo += 1; pageNo = 1; } else { pageNo += 1; }
      const ids = Array.from({ length: PAGE_SIZE }, (_, k) => `t${tileNo}-p${pageNo}-${k}`);
      return { places: ids.map((id) => ({ id })), nextPageToken: 'more' };
    };
    const out = await countOneTiled('italian', { apiKey: 'x', fetchFn });
    // Each tile fires MAX_PAGES pages with PAGE_SIZE unique ids
    expect(out.pages).toBe(TILES.length * MAX_PAGES);
    expect(out.n).toBe(TILES.length * MAX_PAGES * PAGE_SIZE);
    expect(out.capped).toBe(false);   // tiled never reports capped
  });

  it('isolates per-tile errors + continues to next tile', async () => {
    let i = 0;
    const fetchFn = async () => {
      i += 1;
      if (i === 1) throw new Error('first-tile-network-error');
      return { places: [{ id: `id-${i}` }], nextPageToken: null };
    };
    const out = await countOneTiled('italian', { apiKey: 'x', fetchFn });
    expect(out.tiles).toBe(TILES.length);   // all tiles attempted
    expect(out.error).toMatch(/first-tile-network-error/);
    expect(out.n).toBe(TILES.length - 1);   // 14 tiles succeeded
  });

  it('returns n=null + error when GOOGLE_MAPS_API_KEY is missing', async () => {
    const out = await countOneTiled('italian', { apiKey: '' });
    expect(out.n).toBeNull();
    expect(out.error).toMatch(/API_KEY/i);
  });

  it('SG tiles use regionCode=SG; JB tiles use regionCode=MY', async () => {
    const regionsSeen = new Set();
    const fetchFn = async ({ regionCode }) => {
      regionsSeen.add(regionCode);
      return { places: [{ id: 'x' }], nextPageToken: null };
    };
    await countOneTiled('italian', { apiKey: 'x', fetchFn });
    expect(regionsSeen.has('SG')).toBe(true);
    expect(regionsSeen.has('MY')).toBe(true);
  });
});

// Haversine distance helper for the tile-coverage tests.
function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
