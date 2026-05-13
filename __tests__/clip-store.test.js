// __tests__/clip-store.test.js — v0.59.44
//
// Per-chatId clip history with cuisine-filterable list. Mock Redis
// list operations (LPUSH, LTRIM, EXPIRE, LRANGE, LINDEX, DEL).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { pushClip, listClips, getClip, clearClips, removeClip, renameClip, KEY_PREFIX, MAX_CLIPS, TTL_S } = require('../clip-store.js');

function makeFakeRedis() {
  const store = new Map();
  return {
    isOpen: true,
    async connect() {},
    async lPush(key, val) {
      const arr = store.get(key) || [];
      arr.unshift(val);
      store.set(key, arr);
      return arr.length;
    },
    async lTrim(key, start, end) {
      const arr = store.get(key) || [];
      store.set(key, arr.slice(start, end + 1));
    },
    async expire(_key, _seconds) {
      // no-op for tests; we verify it was called via spy if needed
    },
    async lRange(key, start, end) {
      const arr = store.get(key) || [];
      return arr.slice(start, end + 1);
    },
    async lIndex(key, index) {
      const arr = store.get(key) || [];
      return arr[index] || null;
    },
    // v0.60.151 — list-mutation ops used by removeClip / renameClip.
    async lSet(key, index, value) {
      const arr = store.get(key);
      if (!arr || index < 0 || index >= arr.length) throw new Error('ERR no such key or index out of range');
      arr[index] = String(value);
      return 'OK';
    },
    async lRem(key, count, value) {
      const arr = store.get(key);
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
      store.set(key, next);
      return removed;
    },
    async del(key) {
      store.delete(key);
    },
    _store: store
  };
}

describe('pushClip', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('writes a record under clip:<chatId>', async () => {
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
    const list = redis._store.get('clip:12345');
    expect(list).toHaveLength(1);
    const parsed = JSON.parse(list[0]);
    expect(parsed.cuisines).toEqual(['Italian']);
    expect(parsed.body).toBe('BODY');
    expect(parsed.region).toBe('SG');
  });

  it('coerces invalid type to "all"', async () => {
    await pushClip(redis, 'c', { type: 'syntax', body: 'X' });
    const parsed = JSON.parse(redis._store.get('clip:c')[0]);
    expect(parsed.type).toBe('all');
  });

  it('clamps cuisines to 5', async () => {
    await pushClip(redis, 'c', { body: 'X', cuisines: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    const parsed = JSON.parse(redis._store.get('clip:c')[0]);
    expect(parsed.cuisines).toHaveLength(5);
  });

  it('truncates body at 4096 chars', async () => {
    const big = 'a'.repeat(5000);
    await pushClip(redis, 'c', { body: big });
    const parsed = JSON.parse(redis._store.get('clip:c')[0]);
    expect(parsed.body).toHaveLength(4096);
  });

  it('caps the list at 50 via LTRIM', async () => {
    for (let i = 0; i < 55; i++) {
      await pushClip(redis, 'c', { body: `clip-${i}`, cuisines: [`x${i}`] });
    }
    const list = redis._store.get('clip:c');
    expect(list).toHaveLength(MAX_CLIPS);
    // newest at head
    expect(JSON.parse(list[0]).body).toBe('clip-54');
  });

  it('no-ops on missing redis / chatId / record', async () => {
    await expect(pushClip(null, 'c', { body: 'X' })).resolves.toBeUndefined();
    await expect(pushClip(redis, null, { body: 'X' })).resolves.toBeUndefined();
    await expect(pushClip(redis, 'c', null)).resolves.toBeUndefined();
    await expect(pushClip(redis, 'c', {})).resolves.toBeUndefined(); // no body
    expect(redis._store.size).toBe(0);
  });

  it('exports TTL_S = 30 days', () => {
    expect(TTL_S).toBe(30 * 24 * 60 * 60);
  });
});

describe('listClips', () => {
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

  it('attaches the original Redis index for resend lookup', async () => {
    const { items } = await listClips(redis, 'c');
    expect(items[0].index).toBe(0);
    expect(items[1].index).toBe(1);
  });
});

describe('getClip', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'first', cuisines: ['A'] });
    await pushClip(redis, 'c', { body: 'second', cuisines: ['B'] });
  });

  it('returns the clip at the given index', async () => {
    const c0 = await getClip(redis, 'c', 0);
    expect(c0.body).toBe('second'); // newest
    const c1 = await getClip(redis, 'c', 1);
    expect(c1.body).toBe('first');
  });

  it('returns null for out-of-range or invalid index', async () => {
    expect(await getClip(redis, 'c', 99)).toBeNull();
    expect(await getClip(redis, 'c', -1)).toBeNull();
    expect(await getClip(redis, 'c', NaN)).toBeNull();
  });
});

describe('clearClips', () => {
  it('deletes the per-chatId list', async () => {
    const redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'X' });
    expect(redis._store.has('clip:c')).toBe(true);
    const ok = await clearClips(redis, 'c');
    expect(ok).toBe(true);
    expect(redis._store.has('clip:c')).toBe(false);
  });
});

describe('removeClip (v0.60.151)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'a', cuisines: ['A'] });
    await pushClip(redis, 'c', { body: 'b', cuisines: ['B'] });
    await pushClip(redis, 'c', { body: 'c-body', cuisines: ['C'] });
  });

  it('removes the clip at the given index and compacts the list', async () => {
    expect(redis._store.get('clip:c')).toHaveLength(3);
    const ok = await removeClip(redis, 'c', 1);   // remove "b" (index 1 in LPUSH order = middle)
    expect(ok).toBe(true);
    const left = redis._store.get('clip:c');
    expect(left).toHaveLength(2);
    expect(left.map((r) => JSON.parse(r).body)).toEqual(['c-body', 'a']);
  });

  it('returns false on out-of-range / invalid index', async () => {
    expect(await removeClip(redis, 'c', 99)).toBe(false);
    expect(await removeClip(redis, 'c', -1)).toBe(false);
    expect(await removeClip(redis, 'c', NaN)).toBe(false);
    expect(redis._store.get('clip:c')).toHaveLength(3);   // unchanged
  });

  it('returns false on missing redis / chatId', async () => {
    expect(await removeClip(null, 'c', 0)).toBe(false);
    expect(await removeClip(redis, null, 0)).toBe(false);
  });
});

describe('renameClip (v0.60.151)', () => {
  let redis;
  beforeEach(async () => {
    redis = makeFakeRedis();
    await pushClip(redis, 'c', { body: 'a', cuisines: ['Italian'] });
    await pushClip(redis, 'c', { body: 'b', cuisines: ['Japanese'] });
  });

  it('stamps a name onto the record at the given index', async () => {
    const saved = await renameClip(redis, 'c', 0, 'Saturday lunch');
    expect(saved).toBe('Saturday lunch');
    const updated = JSON.parse(redis._store.get('clip:c')[0]);
    expect(updated.name).toBe('Saturday lunch');
    expect(updated.body).toBe('b');   // body untouched
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

describe('module surface', () => {
  it('exports KEY_PREFIX = "clip:"', () => {
    expect(KEY_PREFIX).toBe('clip:');
  });
  it('exports MAX_CLIPS = 50', () => {
    expect(MAX_CLIPS).toBe(50);
  });
  it('exports removeClip + renameClip (v0.60.151)', () => {
    expect(typeof removeClip).toBe('function');
    expect(typeof renameClip).toBe('function');
  });
});
