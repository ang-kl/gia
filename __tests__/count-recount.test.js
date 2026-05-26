// __tests__/count-recount.test.js — v0.61.164
//
// Per-item recount tests. These verify:
//   1. The dispatch table has exactly the 14 operator-confirmed items.
//   2. Each recount fn records a history entry (or 'unavailable' on
//      data-source miss) and returns the {item, n, source} shape.
//   3. recountAll fans out to all 14 in parallel.
//
// The recount fns read real `data/*.json` / `data/geo-*.json` files
// when they exist (this repo ships them); when a file is missing /
// unparseable the fn still records a defensive 'unavailable' entry
// without throwing.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  RECOUNTERS,
  recountOne,
  recountAll
} = require('../count-recount');
const { getHistory, ITEMS } = require('../count-history');

function makeFakeRedis() {
  const sets = new Map();
  return {
    isOpen: true,
    sets,
    async zAdd(k, m) {
      if (!sets.has(k)) sets.set(k, []);
      sets.get(k).push({ score: m.score, value: m.value });
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
    async del(k) { sets.delete(k); return 1; },
    async zCard() { return 0; }  // forces bus-stops fallback path
  };
}

describe('RECOUNTERS dispatch table', () => {
  it('has exactly 14 items (operator Q1)', () => {
    expect(Object.keys(RECOUNTERS).length).toBe(14);
  });

  it('covers every item in count-history.ITEMS', () => {
    for (const item of ITEMS) {
      expect(typeof RECOUNTERS[item]).toBe('function');
    }
  });

  it('every recounter is an async function', () => {
    for (const fn of Object.values(RECOUNTERS)) {
      expect(typeof fn).toBe('function');
      expect(fn.constructor.name).toBe('AsyncFunction');
    }
  });
});

describe('recountOne — known + unknown items', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('returns null for unknown item id', async () => {
    expect(await recountOne(redis, 'unknown-item')).toBeNull();
    expect(await recountOne(redis, '')).toBeNull();
  });

  it('recounts cuisines and records a history entry', async () => {
    const out = await recountOne(redis, 'cuisines');
    expect(out).toBeTruthy();
    expect(out.item).toBe('cuisines');
    expect(Number.isFinite(out.n)).toBe(true);
    expect(out.n).toBeGreaterThan(0);
    const h = await getHistory(redis, 'cuisines');
    expect(h.length).toBe(1);
    expect(h[0].n).toBe(out.n);
  });

  it('returns { item, n, source } shape for every item', async () => {
    for (const item of Object.keys(RECOUNTERS)) {
      const out = await recountOne(redis, item);
      expect(out).toMatchObject({ item, source: expect.any(String) });
      // `n` may be null when the underlying data source is missing
      // in this test environment; the entry is still recorded as
      // `source='unavailable'`.
      expect(out.n === null || Number.isFinite(out.n)).toBe(true);
    }
  });

  it('records a history entry for every item (even on unavailable source)', async () => {
    for (const item of Object.keys(RECOUNTERS)) {
      await recountOne(redis, item);
      const h = await getHistory(redis, item);
      expect(h.length).toBeGreaterThanOrEqual(1);
      // First entry's source is either 'manual' (file/api worked)
      // or 'unavailable' (file missing).
      expect(['manual', 'unavailable']).toContain(h[0].source);
    }
  });
});

describe('recountAll', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('runs all 14 fns and returns an array of results', async () => {
    const results = await recountAll(redis);
    expect(results).toHaveLength(14);
    for (const r of results) {
      expect(r).toMatchObject({ item: expect.any(String), source: expect.any(String) });
    }
  });

  it('records one history entry per item', async () => {
    await recountAll(redis);
    for (const item of Object.keys(RECOUNTERS)) {
      const h = await getHistory(redis, item);
      expect(h.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('propagates opts.source / opts.notes into history entries', async () => {
    await recountAll(redis, { source: '4-monthly', notes: 'auto-tick' });
    // Pick one known-good item to spot-check the propagation.
    const h = await getHistory(redis, 'cuisines');
    // Source is the opts.source ('4-monthly') for available data;
    // when the data file is missing the fn records 'unavailable'
    // INSTEAD of the opts.source. Both paths are valid.
    expect(['4-monthly', 'unavailable']).toContain(h[0].source);
    if (h[0].source === '4-monthly') {
      expect(h[0].notes).toBe('auto-tick');
    }
  });
});

describe('recount fns — defensive behaviour', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('cuisines recount returns a finite n on the real cuisines-vault', async () => {
    // Sanity: with the real cuisines-vault.js + cuisines_js.MD file,
    // the count is the operator's "~70" baseline.
    const out = await recountOne(redis, 'cuisines');
    expect(out.n).toBeGreaterThan(50);
    expect(out.n).toBeLessThan(200);
  });

  it('train-lines recount derives a small integer from station codes', async () => {
    const out = await recountOne(redis, 'train-lines');
    // SG has 6 operational MRT lines as of 2026; LRT prefixes may
    // bring the total higher. JB RTS Link (Dec 2026 / Jun 2027)
    // adds another prefix once exposed.
    if (Number.isFinite(out.n)) {
      expect(out.n).toBeGreaterThan(3);
      expect(out.n).toBeLessThan(20);
    }
  });
});
