// __tests__/pipeline-sg-dish-memory.test.js — v0.59.26
//
// Per-chatId Singaporean dish memory. Per Human Lead 2026-05-07:
// even with random rotation, the same SG dishes were repeating
// because the picker had no memory of what THIS chat had already
// seen. New helper pickSingaporeanDishesForChat({redis, chatId,
// count}) reads recent picks from Redis, excludes them from the
// next pick, then writes the new picks back (LRU 30, TTL 7d).

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { SINGAPOREAN_DISHES, pickSingaporeanDishesForChat } = require('../pipeline.js');

// Tiny in-memory Redis stand-in. Implements only the methods the
// helper uses: zRange / zAdd / zRemRangeByRank / expire, plus
// `isOpen` and `_dump()` for assertions.
function makeFakeRedis(initial = {}) {
  const data = new Map(); // key -> Map<value, score>
  for (const [k, vs] of Object.entries(initial)) {
    const m = new Map();
    vs.forEach((v, i) => m.set(v, Date.now() - (vs.length - i) * 1000));
    data.set(k, m);
  }
  return {
    isOpen: true,
    async zRange(key, start, end) {
      const m = data.get(key);
      if (!m) return [];
      const sorted = [...m.entries()].sort((a, b) => a[1] - b[1]).map(([v]) => v);
      const len = sorted.length;
      const lo = start < 0 ? Math.max(0, len + start) : start;
      const hi = end < 0 ? len + end : end;
      return sorted.slice(lo, hi + 1);
    },
    async zAdd(key, args) {
      let m = data.get(key);
      if (!m) { m = new Map(); data.set(key, m); }
      const list = Array.isArray(args) ? args : [args];
      for (const { score, value } of list) m.set(value, score);
    },
    async zRemRangeByRank(key, start, end) {
      const m = data.get(key);
      if (!m) return;
      const sorted = [...m.entries()].sort((a, b) => a[1] - b[1]);
      const len = sorted.length;
      const lo = start < 0 ? Math.max(0, len + start) : start;
      const hi = end < 0 ? len + end : end;
      for (let i = lo; i <= hi && i < len; i++) m.delete(sorted[i][0]);
    },
    async expire() { /* no-op for tests */ },
    _dump(key) { return [...(data.get(key) || new Map()).entries()]; }
  };
}

describe('pickSingaporeanDishesForChat', () => {
  it('returns 3 picks from the dish list when chat has no memory', async () => {
    const redis = makeFakeRedis();
    const picks = await pickSingaporeanDishesForChat({ redis, chatId: 'u1', count: 3 });
    expect(picks.length).toBe(3);
    picks.forEach((p) => expect(SINGAPOREAN_DISHES).toContain(p));
    expect(new Set(picks).size).toBe(3); // all distinct
  });

  it('writes picks to redis with timestamp scores', async () => {
    const redis = makeFakeRedis();
    const picks = await pickSingaporeanDishesForChat({ redis, chatId: 'u1', count: 3 });
    const stored = redis._dump('cuisine:sg-dishes:u1').map(([v]) => v);
    expect(stored.length).toBe(3);
    expect(stored.sort()).toEqual([...picks].sort());
  });

  it('excludes already-picked dishes on the next call', async () => {
    const redis = makeFakeRedis();
    const first = await pickSingaporeanDishesForChat({ redis, chatId: 'u1', count: 3 });
    const second = await pickSingaporeanDishesForChat({ redis, chatId: 'u1', count: 3 });
    // No overlap between first and second pick sets when pool >> 6.
    const overlap = first.filter((d) => second.includes(d));
    expect(overlap.length).toBe(0);
  });

  it('falls back to global pool when unseen pool < count', async () => {
    // Pre-fill chat memory with all but 2 dishes so the unseen pool
    // (=2) is smaller than count (=3); helper must fall back.
    const allButTwo = SINGAPOREAN_DISHES.slice(0, SINGAPOREAN_DISHES.length - 2);
    const redis = makeFakeRedis({ 'cuisine:sg-dishes:u1': allButTwo });
    const picks = await pickSingaporeanDishesForChat({ redis, chatId: 'u1', count: 3 });
    expect(picks.length).toBe(3);
    // Picks may include items from the recent pool because we fell back.
    picks.forEach((p) => expect(SINGAPOREAN_DISHES).toContain(p));
  });

  it('LRU-trims to 30 entries after writes', async () => {
    const redis = makeFakeRedis();
    // Pre-fill 30 entries (oldest first); next pick must drop oldest.
    const initial = SINGAPOREAN_DISHES.slice(0, 30);
    const redisWithFull = makeFakeRedis({ 'cuisine:sg-dishes:u2': initial });
    await pickSingaporeanDishesForChat({ redis: redisWithFull, chatId: 'u2', count: 3 });
    const stored = redisWithFull._dump('cuisine:sg-dishes:u2');
    expect(stored.length).toBeLessThanOrEqual(30);
  });

  it('isolates memory per chatId', async () => {
    const redis = makeFakeRedis();
    const a = await pickSingaporeanDishesForChat({ redis, chatId: 'alice', count: 3 });
    const b = await pickSingaporeanDishesForChat({ redis, chatId: 'bob', count: 3 });
    // Bob's pool is fresh — he can re-pick anything, including alice's items.
    // Statistical: 3 of 47 picked twice → expected overlap small but possible.
    // Just assert each chat got its own write.
    expect(redis._dump('cuisine:sg-dishes:alice').length).toBe(3);
    expect(redis._dump('cuisine:sg-dishes:bob').length).toBe(3);
  });

  it('falls back to stateless picker when redis is null', async () => {
    const picks = await pickSingaporeanDishesForChat({ redis: null, chatId: 'u3', count: 3 });
    expect(picks.length).toBe(3);
    picks.forEach((p) => expect(SINGAPOREAN_DISHES).toContain(p));
  });

  it('falls back when redis.isOpen is false', async () => {
    const redis = { ...makeFakeRedis(), isOpen: false };
    const picks = await pickSingaporeanDishesForChat({ redis, chatId: 'u4', count: 3 });
    expect(picks.length).toBe(3);
  });

  it('falls back when chatId is missing', async () => {
    const redis = makeFakeRedis();
    const picks = await pickSingaporeanDishesForChat({ redis, chatId: null, count: 3 });
    expect(picks.length).toBe(3);
    expect(redis._dump('cuisine:sg-dishes:null').length).toBe(0);
  });

  it('survives redis read errors (graceful degrade to stateless)', async () => {
    const redis = {
      isOpen: true,
      zRange: vi.fn().mockRejectedValue(new Error('connection lost')),
    };
    const picks = await pickSingaporeanDishesForChat({ redis, chatId: 'u5', count: 3 });
    expect(picks.length).toBe(3);
  });
});
