// __tests__/clip-store.test.js — v0.62.328
//
// Per-chatId clip history. Cards are now per-card HASHes with TTLs
// computed by recomputeCardTtl (favourite → PERSIST, placed → 1y,
// catch-all → 30d). Old-shape entries (full JSON in the list) migrate
// lazily on first read. Tests assert behavioural contract on top of a
// fake Redis that implements LIST + HASH + SET + ZSET + TTL ops.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  pushClip, listClips, getClip, clearClips, removeClip, renameClip,
  getCardById, recomputeCardTtl, softDeleteCard,
  KEY_PREFIX, CARD_PREFIX, LOCS_PREFIX, MAX_CLIPS,
  TTL_S, TTL_CATCHALL_S, TTL_PLACED_S, cardKey, locsKey
} = require('../clip-store.js');

const NO_TTL = -1;
const NO_KEY = -2;

function makeFakeRedis() {
  const lists = new Map();          // key → string[]
  const hashes = new Map();         // key → Map<string,string>
  const sets = new Map();           // key → Set<string>
  const zsets = new Map();          // key → Map<value,score>
  const strings = new Map();        // key → string (for plain set/get; used by share.js)
  const ttls = new Map();           // key → seconds OR null for PERSIST

  function exists(key) {
    return lists.has(key) || hashes.has(key) || sets.has(key) || zsets.has(key) || strings.has(key);
  }

  return {
    isOpen: true,
    async connect() {},

    // ── LIST ──────────────────────────────────────────────────────
    async lPush(key, val) {
      const arr = lists.get(key) || [];
      arr.unshift(String(val));
      lists.set(key, arr);
      return arr.length;
    },
    async rPush(key, val) {
      const arr = lists.get(key) || [];
      if (Array.isArray(val)) for (const v of val) arr.push(String(v));
      else arr.push(String(val));
      lists.set(key, arr);
      return arr.length;
    },
    async lTrim(key, start, end) {
      const arr = lists.get(key) || [];
      lists.set(key, arr.slice(start, end + 1));
    },
    async lRange(key, start, end) {
      const arr = lists.get(key) || [];
      const realEnd = end === -1 ? arr.length : end + 1;
      return arr.slice(start, realEnd);
    },
    async lIndex(key, index) {
      const arr = lists.get(key) || [];
      return arr[index] != null ? arr[index] : null;
    },
    async lLen(key) {
      return (lists.get(key) || []).length;
    },
    async lSet(key, index, value) {
      const arr = lists.get(key);
      if (!arr || index < 0 || index >= arr.length) throw new Error('ERR no such key or index out of range');
      arr[index] = String(value);
      return 'OK';
    },
    async lRem(key, count, value) {
      const arr = lists.get(key);
      if (!arr) return 0;
      const target = String(value);
      let removed = 0;
      const next = [];
      let budget = count;
      for (const v of arr) {
        if (v === target && (count === 0 || budget > 0)) {
          removed++; if (count > 0) budget--;
        } else { next.push(v); }
      }
      lists.set(key, next);
      return removed;
    },

    // ── HASH ──────────────────────────────────────────────────────
    async hSet(key, fieldsOrField, value) {
      let h = hashes.get(key);
      if (!h) { h = new Map(); hashes.set(key, h); }
      if (typeof fieldsOrField === 'object' && fieldsOrField !== null) {
        for (const [k, v] of Object.entries(fieldsOrField)) h.set(k, String(v));
      } else {
        h.set(String(fieldsOrField), String(value));
      }
      return 1;
    },
    async hGet(key, field) {
      const h = hashes.get(key);
      if (!h) return null;
      return h.has(field) ? h.get(field) : null;
    },
    async hGetAll(key) {
      const h = hashes.get(key);
      if (!h) return {};
      return Object.fromEntries(h.entries());
    },

    // ── SET ───────────────────────────────────────────────────────
    async sAdd(key, ...members) {
      let s = sets.get(key);
      if (!s) { s = new Set(); sets.set(key, s); }
      let added = 0;
      for (const m of members.flat()) {
        if (!s.has(String(m))) { s.add(String(m)); added++; }
      }
      return added;
    },
    async sRem(key, ...members) {
      const s = sets.get(key);
      if (!s) return 0;
      let removed = 0;
      for (const m of members.flat()) {
        if (s.delete(String(m))) removed++;
      }
      if (s.size === 0) sets.delete(key);  // Redis auto-deletes empty sets
      return removed;
    },
    async sCard(key) {
      const s = sets.get(key);
      return s ? s.size : 0;
    },
    async sMembers(key) {
      const s = sets.get(key);
      return s ? [...s] : [];
    },

    // ── ZSET ──────────────────────────────────────────────────────
    async zAdd(key, entry) {
      let z = zsets.get(key);
      if (!z) { z = new Map(); zsets.set(key, z); }
      z.set(String(entry.value), entry.score);
      return 1;
    },
    async zCard(key) {
      const z = zsets.get(key);
      return z ? z.size : 0;
    },
    async zRange(key, start, end, opts = {}) {
      const z = zsets.get(key);
      if (!z) return [];
      const entries = [...z.entries()].sort((a, b) => a[1] - b[1]);
      const ordered = opts && opts.REV ? entries.slice().reverse() : entries;
      const realEnd = end === -1 ? ordered.length : end + 1;
      return ordered.slice(start, realEnd).map(([v]) => v);
    },
    async zRem(key, value) {
      const z = zsets.get(key);
      if (!z) return 0;
      return z.delete(String(value)) ? 1 : 0;
    },

    // ── STRING (plain key/value, used by share.js) ────────────────
    async set(key, value, opts = {}) {
      strings.set(key, String(value));
      if (opts && Number.isFinite(opts.EX)) ttls.set(key, opts.EX);
      return 'OK';
    },
    async get(key) {
      return strings.has(key) ? strings.get(key) : null;
    },

    // ── Key ops ───────────────────────────────────────────────────
    async exists(key) { return exists(key) ? 1 : 0; },
    async del(...keys) {
      let removed = 0;
      for (const key of keys.flat()) {
        if (lists.delete(key)) removed++;
        if (hashes.delete(key)) removed++;
        if (sets.delete(key)) removed++;
        if (zsets.delete(key)) removed++;
        if (strings.delete(key)) removed++;
        ttls.delete(key);
      }
      return removed;
    },
    async expire(key, seconds) {
      if (exists(key)) { ttls.set(key, seconds); return 1; }
      return 0;
    },
    async persist(key) {
      if (exists(key) && ttls.has(key)) { ttls.set(key, null); return 1; }
      if (exists(key)) { ttls.set(key, null); return 1; }
      return 0;
    },
    async ttl(key) {
      if (!exists(key)) return NO_KEY;
      const t = ttls.get(key);
      if (t === null || t === undefined) return NO_TTL;
      return t;
    },

    // Test introspection
    _lists: lists, _hashes: hashes, _sets: sets, _zsets: zsets, _ttls: ttls,
    _store: lists   // legacy alias for back-compat with older fixtures
  };
}

describe('pushClip (HASH schema, v0.62.328)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('writes a HASH at card:<chatId>:<cardId> and a cardId in clip:<chatId>', async () => {
    await pushClip(redis, '12345', {
      ts: 1000, type: 'all',
      cuisines: ['Italian'],
      filters: { halal: true },
      region: 'SG',
      venueCount: 3,
      preview: 'Atlas · Cugini',
      body: 'BODY',
      lang: 'en'
    });
    const list = redis._lists.get('clip:12345');
    expect(list).toHaveLength(1);
    const cardId = list[0];
    expect(cardId).toMatch(/^[A-Za-z0-9_-]+$/);
    const card = redis._hashes.get(`card:12345:${cardId}`);
    expect(card).toBeDefined();
    expect(card.get('body')).toBe('BODY');
    expect(card.get('region')).toBe('SG');
    expect(card.get('cuisines')).toBe(JSON.stringify(['Italian']));
    expect(card.get('favourite')).toBe('0');
  });

  it('coerces invalid type to "all"', async () => {
    await pushClip(redis, 'c', { type: 'syntax', body: 'X' });
    const cardId = redis._lists.get('clip:c')[0];
    expect(redis._hashes.get(`card:c:${cardId}`).get('type')).toBe('all');
  });

  it('clamps cuisines to 5', async () => {
    await pushClip(redis, 'c', { body: 'X', cuisines: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    const cardId = redis._lists.get('clip:c')[0];
    const cuisines = JSON.parse(redis._hashes.get(`card:c:${cardId}`).get('cuisines'));
    expect(cuisines).toHaveLength(5);
  });

  it('truncates body at 4096 chars', async () => {
    const big = 'a'.repeat(5000);
    await pushClip(redis, 'c', { body: big });
    const cardId = redis._lists.get('clip:c')[0];
    expect(redis._hashes.get(`card:c:${cardId}`).get('body')).toHaveLength(4096);
  });

  it('caps the list at 50 via LTRIM', async () => {
    for (let i = 0; i < 55; i++) {
      await pushClip(redis, 'c', { body: `clip-${i}`, cuisines: [`x${i}`] });
    }
    const list = redis._lists.get('clip:c');
    expect(list).toHaveLength(MAX_CLIPS);
    // newest at head
    const newestCardId = list[0];
    expect(redis._hashes.get(`card:c:${newestCardId}`).get('body')).toBe('clip-54');
  });

  it('no-ops on missing redis / chatId / record / body', async () => {
    await expect(pushClip(null, 'c', { body: 'X' })).resolves.toBeUndefined();
    await expect(pushClip(redis, null, { body: 'X' })).resolves.toBeUndefined();
    await expect(pushClip(redis, 'c', null)).resolves.toBeUndefined();
    await expect(pushClip(redis, 'c', {})).resolves.toBeUndefined();
    expect(redis._lists.size).toBe(0);
    expect(redis._hashes.size).toBe(0);
  });

  it('exports TTL_S = 30 days (back-compat alias)', () => {
    expect(TTL_S).toBe(30 * 24 * 60 * 60);
    expect(TTL_CATCHALL_S).toBe(TTL_S);
    expect(TTL_PLACED_S).toBe(365 * 24 * 60 * 60);
  });

  it('sets the card TTL to 30 days for fresh catch-all pushes', async () => {
    await pushClip(redis, 'c', { body: 'X' });
    const cardId = redis._lists.get('clip:c')[0];
    expect(await redis.ttl(`card:c:${cardId}`)).toBe(TTL_CATCHALL_S);
    expect(await redis.ttl('clip:c')).toBe(NO_TTL);   // list itself is PERSIST
  });
});

describe('listClips (HASH schema)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'a', cuisines: ['Italian'], ts: 100 });
    await pushClip(redis, 'c', { body: 'b', cuisines: ['Japanese'], ts: 200 });
    await pushClip(redis, 'c', { body: 'd', cuisines: ['italian (modern)'], ts: 300 });
    await pushClip(redis, 'c', { body: 'e', cuisines: ['Korean'], ts: 400 });
  });

  it('returns all 4 newest-first when no filter', async () => {
    const { items, total } = await listClips(redis, 'c');
    expect(total).toBe(4);
    expect(items.map((c) => c.body)).toEqual(['e', 'd', 'b', 'a']);
  });

  it('filters case-insensitively by cuisine substring', async () => {
    const { items, total } = await listClips(redis, 'c', { cuisine: 'italian' });
    expect(total).toBe(2);
    expect(items.map((c) => c.body)).toEqual(['d', 'a']);
  });

  it('honours offset + limit', async () => {
    const { items, total } = await listClips(redis, 'c', { limit: 2, offset: 2 });
    expect(total).toBe(4);
    expect(items.map((c) => c.body)).toEqual(['b', 'a']);
  });

  it('returns empty when chatId has no clips', async () => {
    const { items, total } = await listClips(redis, 'never-clipped');
    expect(items).toEqual([]);
    expect(total).toBe(0);
  });

  it('attaches the original Redis index AND the cardId on each item', async () => {
    const { items } = await listClips(redis, 'c');
    expect(items[0].index).toBe(0);
    expect(items[1].index).toBe(1);
    expect(items[0].cardId).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});

describe('getClip (HASH schema)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'first', cuisines: ['A'] });
    await pushClip(redis, 'c', { body: 'second', cuisines: ['B'] });
  });

  it('returns the clip at the given index', async () => {
    expect((await getClip(redis, 'c', 0)).body).toBe('second');
    expect((await getClip(redis, 'c', 1)).body).toBe('first');
  });

  it('returns null for out-of-range or invalid index', async () => {
    expect(await getClip(redis, 'c', 99)).toBeNull();
    expect(await getClip(redis, 'c', -1)).toBeNull();
    expect(await getClip(redis, 'c', NaN)).toBeNull();
  });
});

describe('clearClips (HASH schema)', () => {
  it('deletes the per-chatId list AND every card HASH it points at', async () => {
    const redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'X' });
    await pushClip(redis, 'c', { body: 'Y' });
    expect(redis._lists.has('clip:c')).toBe(true);
    expect(redis._hashes.size).toBe(2);
    const ok = await clearClips(redis, 'c');
    expect(ok).toBe(true);
    expect(redis._lists.has('clip:c')).toBe(false);
    expect(redis._hashes.size).toBe(0);
  });
});

describe('removeClip (HASH schema, v0.62.328 cascade rules)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'a', cuisines: ['A'] });
    await pushClip(redis, 'c', { body: 'b', cuisines: ['B'] });
    await pushClip(redis, 'c', { body: 'c-body', cuisines: ['C'] });
  });

  it('removes the clip at the given index, drops the underlying HASH, and compacts the list', async () => {
    expect(redis._lists.get('clip:c')).toHaveLength(3);
    expect(redis._hashes.size).toBe(3);
    const ok = await removeClip(redis, 'c', 1);   // middle (body "b")
    expect(ok).toBe(true);
    expect(redis._lists.get('clip:c')).toHaveLength(2);
    expect(redis._hashes.size).toBe(2);
    const bodies = (await listClips(redis, 'c')).items.map((c) => c.body);
    expect(bodies).toEqual(['c-body', 'a']);
  });

  it('KEEPS the underlying card record when the card is favourite', async () => {
    const cardId = redis._lists.get('clip:c')[1];        // body "b"
    await redis.hSet(cardKey('c', cardId), 'favourite', '1');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);   // PERSIST

    const ok = await removeClip(redis, 'c', 1);
    expect(ok).toBe(true);
    // List entry gone, but HASH still alive AND still PERSIST.
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);
  });

  it('KEEPS the underlying card record when the card has another placement', async () => {
    const cardId = redis._lists.get('clip:c')[1];
    // Simulate an existing placement in a drawer.
    await redis.sAdd(locsKey('c', cardId), 'cab1:0');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);

    const ok = await removeClip(redis, 'c', 1);
    expect(ok).toBe(true);
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    // Still placed → still 1-year TTL.
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
  });

  it('returns false on out-of-range / invalid index', async () => {
    expect(await removeClip(redis, 'c', 99)).toBe(false);
    expect(await removeClip(redis, 'c', -1)).toBe(false);
    expect(await removeClip(redis, 'c', NaN)).toBe(false);
    expect(redis._lists.get('clip:c')).toHaveLength(3);
  });

  it('returns false on missing redis / chatId', async () => {
    expect(await removeClip(null, 'c', 0)).toBe(false);
    expect(await removeClip(redis, null, 0)).toBe(false);
  });
});

describe('renameClip (HASH schema)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'a', cuisines: ['Italian'] });
    await pushClip(redis, 'c', { body: 'b', cuisines: ['Japanese'] });
  });

  it('stamps a name onto the HASH at the given index', async () => {
    const saved = await renameClip(redis, 'c', 0, 'Saturday lunch');
    expect(saved).toBe('Saturday lunch');
    const cardId = redis._lists.get('clip:c')[0];
    expect(redis._hashes.get(cardKey('c', cardId)).get('name')).toBe('Saturday lunch');
    expect(redis._hashes.get(cardKey('c', cardId)).get('body')).toBe('b');
  });

  it('trims + collapses newlines + caps at 60 chars', async () => {
    const long = '  Spaces\nnewlines\t\there ' + 'X'.repeat(200);
    const saved = await renameClip(redis, 'c', 0, long);
    expect(saved.length).toBeLessThanOrEqual(60);
    expect(saved).not.toMatch(/[\r\n]/);
  });

  it('rejects empty / whitespace-only names', async () => {
    expect(await renameClip(redis, 'c', 0, '')).toBeNull();
    expect(await renameClip(redis, 'c', 0, '   \n  ')).toBeNull();
    expect(await renameClip(redis, 'c', 0, null)).toBeNull();
  });

  it('returns null for out-of-range / missing clip', async () => {
    expect(await renameClip(redis, 'c', 99, 'name')).toBeNull();
    expect(await renameClip(redis, 'never-clipped', 0, 'name')).toBeNull();
  });
});

describe('recomputeCardTtl rule table (operator-locked)', () => {
  let redis, cardId;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'X' });
    cardId = redis._lists.get('clip:c')[0];
  });

  it('catch-all only, not favourite → 30-day TTL', async () => {
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_CATCHALL_S);
  });

  it('placed in any drawer (not favourite) → 1-year TTL', async () => {
    await redis.sAdd(locsKey('c', cardId), 'cab1:2');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
    expect(await redis.ttl(locsKey('c', cardId))).toBe(TTL_PLACED_S);
  });

  it('favourite → PERSIST (no TTL, lives forever)', async () => {
    await redis.hSet(cardKey('c', cardId), 'favourite', '1');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);
  });

  it('favourite AND placed → PERSIST (favourite wins over placed)', async () => {
    await redis.hSet(cardKey('c', cardId), 'favourite', '1');
    await redis.sAdd(locsKey('c', cardId), 'cab1:2');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);
    expect(await redis.ttl(locsKey('c', cardId))).toBe(NO_TTL);
  });

  it('flipping favourite off (still placed) → back to 1-year', async () => {
    await redis.hSet(cardKey('c', cardId), 'favourite', '1');
    await redis.sAdd(locsKey('c', cardId), 'cab1:2');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(NO_TTL);
    await redis.hSet(cardKey('c', cardId), 'favourite', '0');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_PLACED_S);
  });

  it('flipping favourite off (no placements) → back to 30-day', async () => {
    await redis.hSet(cardKey('c', cardId), 'favourite', '1');
    await recomputeCardTtl(redis, 'c', cardId);
    await redis.hSet(cardKey('c', cardId), 'favourite', '0');
    await recomputeCardTtl(redis, 'c', cardId);
    expect(await redis.ttl(cardKey('c', cardId))).toBe(TTL_CATCHALL_S);
  });
});

describe('migration — old-shape JSON entries promoted on first read', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    // Plant two old-shape entries (full JSON blobs in the list, no HASHes).
    await redis.lPush('clip:c', JSON.stringify({
      ts: 100, type: 'all', cuisines: ['Italian'], filters: {}, region: 'SG',
      venueCount: 1, preview: 'X', body: 'OLD-A', lang: 'en'
    }));
    await redis.lPush('clip:c', JSON.stringify({
      ts: 200, type: 'one', cuisines: ['Japanese'], filters: {}, region: 'SG',
      venueCount: 1, preview: 'Y', body: 'OLD-B', lang: 'fr'
    }));
  });

  it('listClips reads old-shape entries and migrates them lazily', async () => {
    expect(redis._hashes.size).toBe(0);   // no HASHes yet
    const { items, total } = await listClips(redis, 'c');
    expect(total).toBe(2);
    expect(items.map((c) => c.body)).toEqual(['OLD-B', 'OLD-A']);   // newest first
    // After migration, two HASHes now exist and the list holds cardIds.
    expect(redis._hashes.size).toBe(2);
    const list = redis._lists.get('clip:c');
    expect(list[0]).toMatch(/^[A-Za-z0-9_-]+$/);   // cardId, not JSON
    expect(list[0]).not.toMatch(/^\{/);
  });

  it('migrated entries preserve their original 30-day TTL behaviour', async () => {
    await listClips(redis, 'c');   // triggers migration
    const list = redis._lists.get('clip:c');
    expect(await redis.ttl(cardKey('c', list[0]))).toBe(TTL_CATCHALL_S);
  });

  it('mixed list (old + new entries) is handled transparently', async () => {
    await pushClip(redis, 'c', { body: 'NEW-C', cuisines: ['Korean'] });   // adds new-shape at head
    const { items, total } = await listClips(redis, 'c');
    expect(total).toBe(3);
    expect(items.map((c) => c.body)).toEqual(['NEW-C', 'OLD-B', 'OLD-A']);
  });

  it('getClip on an old-shape entry migrates it on the spot', async () => {
    const before = redis._hashes.size;
    const c = await getClip(redis, 'c', 0);   // newest
    expect(c.body).toBe('OLD-B');
    expect(redis._hashes.size).toBe(before + 1);
  });
});

describe('lazy purge — list entries whose HASH no longer exists', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'A' });
    await pushClip(redis, 'c', { body: 'B' });
    await pushClip(redis, 'c', { body: 'C' });
  });

  it('listClips skips and LREMs entries whose card HASH is missing', async () => {
    // Simulate TTL expiry on the middle card (HASH gone, list entry stays).
    const middleCardId = redis._lists.get('clip:c')[1];
    await redis.del(cardKey('c', middleCardId));
    expect(redis._lists.get('clip:c')).toHaveLength(3);   // list not yet swept

    const { items, total } = await listClips(redis, 'c');
    expect(total).toBe(2);                                 // missing card filtered
    expect(items.map((c) => c.body)).toEqual(['C', 'A']);
    expect(redis._lists.get('clip:c')).toHaveLength(2);    // lazy-purged
  });
});

describe('softDeleteCard + getCardById helpers (v0.62.328)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'X' });
  });

  it('getCardById returns the denormalised record', async () => {
    const cardId = redis._lists.get('clip:c')[0];
    const card = await getCardById(redis, 'c', cardId);
    expect(card.body).toBe('X');
    expect(card.favourite).toBe(false);
  });

  it('getCardById returns null for unknown cardId', async () => {
    expect(await getCardById(redis, 'c', 'bogus-id')).toBeNull();
  });

  it('softDeleteCard hard-drops the HASH and the locs SET', async () => {
    const cardId = redis._lists.get('clip:c')[0];
    await redis.sAdd(locsKey('c', cardId), 'cab1:0');
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(true);
    expect(redis._sets.has(locsKey('c', cardId))).toBe(true);
    await softDeleteCard(redis, 'c', cardId);
    expect(redis._hashes.has(cardKey('c', cardId))).toBe(false);
    expect(redis._sets.has(locsKey('c', cardId))).toBe(false);
  });
});

describe('module surface (v0.62.328)', () => {
  it('keeps the legacy KEY_PREFIX / MAX_CLIPS / TTL_S exports', () => {
    expect(KEY_PREFIX).toBe('clip:');
    expect(MAX_CLIPS).toBe(50);
    expect(TTL_S).toBe(30 * 24 * 60 * 60);
  });
  it('exposes the new schema prefixes', () => {
    expect(CARD_PREFIX).toBe('card:');
    expect(LOCS_PREFIX).toBe('card_locs:');
  });
  it('exposes the new helpers', () => {
    expect(typeof getCardById).toBe('function');
    expect(typeof recomputeCardTtl).toBe('function');
    expect(typeof softDeleteCard).toBe('function');
  });
});

export { makeFakeRedis };
