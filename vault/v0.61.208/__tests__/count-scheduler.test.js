// __tests__/count-scheduler.test.js — v0.61.166
//
// Tests that runDueRecounts walks the cadence map + history and
// fires recountOne only for items that are actually due.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { runDueRecounts } = require('../count-scheduler');
const { setCadence, DAYS_4_MONTHLY, DAYS_YEARLY } = require('../count-cadence');
const { recordCount, getHistory, ITEMS } = require('../count-history');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function makeFakeRedis() {
  const store = new Map();
  const sets = new Map();
  return {
    isOpen: true,
    store, sets,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async set(k, v) { store.set(k, v); return 'OK'; },
    async setEx(k, ttl, v) { store.set(k, v); return 'OK'; },
    async del(k) { store.delete(k); sets.delete(k); return 1; },
    async zAdd(k, member) {
      if (!sets.has(k)) sets.set(k, []);
      sets.get(k).push({ score: member.score, value: member.value });
      sets.get(k).sort((a, b) => a.score - b.score);
      return 1;
    },
    async zRange(k, s, e, opts = {}) {
      const arr = sets.get(k) || [];
      const list = opts.REV ? [...arr].reverse() : [...arr];
      const end = e === -1 ? list.length : e + 1;
      return list.slice(s, end).map((x) => x.value);
    },
    async zRemRangeByRank() { return 0; },
    async zCard() { return 0; }   // forces bus-stops fallback path
  };
}

describe('runDueRecounts — cadence gating', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('skips items with cadence manual / off (default)', async () => {
    // All items default to 'manual' → nothing runs.
    const out = await runDueRecounts(redis);
    expect(out).toEqual([]);
  });

  it('skips items explicitly set to off', async () => {
    await setCadence(redis, 'cuisines', 'off');
    const out = await runDueRecounts(redis);
    expect(out).toEqual([]);
  });

  it('runs an item with cadence 4-monthly that has NO history (seed run)', async () => {
    await setCadence(redis, 'cuisines', '4-monthly');
    const out = await runDueRecounts(redis);
    const cuisinesRes = out.find((r) => r.item === 'cuisines');
    expect(cuisinesRes).toBeTruthy();
    expect(cuisinesRes.source).toBe('4-monthly');
  });

  it('skips a 4-monthly item whose last entry is < 120 days old', async () => {
    await setCadence(redis, 'cuisines', '4-monthly');
    // Seed a recent entry — should NOT trigger another recount.
    await recordCount(redis, 'cuisines', 70, 'manual', 'recent');
    const out = await runDueRecounts(redis);
    expect(out.find((r) => r.item === 'cuisines')).toBeFalsy();
  });

  it('runs a 4-monthly item whose last entry is ≥ 120 days old', async () => {
    await setCadence(redis, 'cuisines', '4-monthly');
    // Manually inject an old entry. Push directly to the fake ZSET.
    const oldTs = Date.now() - (DAYS_4_MONTHLY + 1) * MS_PER_DAY;
    redis.sets.set('count:history:cuisines', [{
      score: oldTs,
      value: JSON.stringify({ n: 50, source: 'manual', notes: '', ts: oldTs })
    }]);
    const out = await runDueRecounts(redis);
    expect(out.find((r) => r.item === 'cuisines')).toBeTruthy();
  });

  it('skips a yearly item < 365 days old', async () => {
    await setCadence(redis, 'cuisines', 'yearly');
    const ts = Date.now() - 200 * MS_PER_DAY;
    redis.sets.set('count:history:cuisines', [{
      score: ts,
      value: JSON.stringify({ n: 70, source: 'manual', notes: '', ts })
    }]);
    const out = await runDueRecounts(redis);
    expect(out.find((r) => r.item === 'cuisines')).toBeFalsy();
  });

  it('runs a yearly item ≥ 365 days old', async () => {
    await setCadence(redis, 'cuisines', 'yearly');
    const ts = Date.now() - (DAYS_YEARLY + 1) * MS_PER_DAY;
    redis.sets.set('count:history:cuisines', [{
      score: ts,
      value: JSON.stringify({ n: 70, source: 'manual', notes: '', ts })
    }]);
    const out = await runDueRecounts(redis);
    expect(out.find((r) => r.item === 'cuisines')).toBeTruthy();
  });

  it('records source = cadence label on the new entry', async () => {
    await setCadence(redis, 'cuisines', '4-monthly');
    await runDueRecounts(redis);
    const h = await getHistory(redis, 'cuisines');
    expect(h[0].source).toBe('4-monthly');
  });

  it('opts.now lets the scheduler use a synthetic clock', async () => {
    await setCadence(redis, 'cuisines', 'yearly');
    // Seed a "recent" entry — Date.now() check would skip; with
    // synthetic now = 2y later, the item IS due.
    const seedTs = Date.now();
    redis.sets.set('count:history:cuisines', [{
      score: seedTs,
      value: JSON.stringify({ n: 70, source: 'manual', notes: '', ts: seedTs })
    }]);
    const out = await runDueRecounts(redis, { now: seedTs + (DAYS_YEARLY + 30) * MS_PER_DAY });
    expect(out.find((r) => r.item === 'cuisines')).toBeTruthy();
  });
});

describe('runDueRecounts — multi-item walk', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('runs only the items whose cadence is set + due (others stay silent)', async () => {
    await setCadence(redis, 'cuisines', '4-monthly');
    await setCadence(redis, 'hawker', 'yearly');
    // 'cuisines' has no history → due. 'hawker' has fresh history → not due.
    await recordCount(redis, 'hawker', 100, 'manual', 'fresh');
    const out = await runDueRecounts(redis);
    expect(out.find((r) => r.item === 'cuisines')).toBeTruthy();
    expect(out.find((r) => r.item === 'hawker')).toBeFalsy();
    // No other item set → nothing else fires.
    expect(out.find((r) => r.item === 'police')).toBeFalsy();
  });
});
