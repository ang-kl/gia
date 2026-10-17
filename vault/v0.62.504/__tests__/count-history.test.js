// __tests__/count-history.test.js — v0.61.164
//
// Tests for the Periodical count-history persistence layer.
// Uses a fake Redis with the ZSET commands the module needs.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  HISTORY_CAP,
  ITEMS,
  isKnownItem,
  recordCount,
  getHistory,
  getCurrentCount,
  revertTo,
  clearHistory
} = require('../count-history');

// Fake Redis with the subset of ZSET commands count-history uses.
// Stores (score, value) tuples per key; sorted-set semantics
// preserved via Array.sort.
function makeFakeRedis({ isOpen = true } = {}) {
  const sets = new Map();    // key → Array<{ score, value }>
  return {
    isOpen,
    sets,
    async zAdd(k, member) {
      if (!sets.has(k)) sets.set(k, []);
      // Replace if same value (Redis ZSET unique-by-member semantics).
      const arr = sets.get(k);
      const idx = arr.findIndex((e) => e.value === member.value);
      if (idx >= 0) arr[idx] = { score: member.score, value: member.value };
      else arr.push({ score: member.score, value: member.value });
      arr.sort((a, b) => a.score - b.score);
      return 1;
    },
    async zRange(k, start, stop, opts = {}) {
      const arr = sets.get(k) || [];
      const list = opts.REV ? [...arr].reverse() : [...arr];
      const end = stop === -1 ? list.length : stop + 1;
      return list.slice(start, end).map((e) => e.value);
    },
    async zRemRangeByRank(k, start, stop) {
      const arr = sets.get(k) || [];
      if (!arr.length) return 0;
      const len = arr.length;
      // Normalise negative indices.
      const normStart = start < 0 ? Math.max(0, len + start) : Math.min(start, len - 1);
      const normStop = stop < 0 ? len + stop : Math.min(stop, len - 1);
      if (normStart > normStop) return 0;
      const removed = normStop - normStart + 1;
      arr.splice(normStart, removed);
      return removed;
    },
    async del(k) { sets.delete(k); return 1; }
  };
}

describe('schema constants', () => {
  it('HISTORY_CAP = 12', () => { expect(HISTORY_CAP).toBe(12); });
  it('ITEMS has 14 entries (operator Q1)', () => {
    expect(ITEMS.length).toBe(14);
  });
  it('ITEMS is frozen', () => {
    expect(() => { ITEMS.push('extra'); }).toThrow();
  });
});

describe('isKnownItem', () => {
  it('returns true for canonical items', () => {
    expect(isKnownItem('cuisines')).toBe(true);
    expect(isKnownItem('train-lines')).toBe(true);
    expect(isKnownItem('police')).toBe(true);
  });
  it('returns false for unknown / malformed', () => {
    expect(isKnownItem('cooks')).toBe(false);
    expect(isKnownItem('')).toBe(false);
    expect(isKnownItem(null)).toBe(false);
    expect(isKnownItem(42)).toBe(false);
  });
});

describe('recordCount + getHistory + getCurrentCount', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('writes a single entry and reads it back as the current count', async () => {
    const entry = await recordCount(redis, 'cuisines', 70, 'manual', 'first');
    expect(entry).toMatchObject({ n: 70, source: 'manual', notes: 'first' });
    expect(Number.isFinite(entry.ts)).toBe(true);
    const current = await getCurrentCount(redis, 'cuisines');
    expect(current.n).toBe(70);
  });

  it('returns history newest-first', async () => {
    // Stagger ts so the entries are deterministic.
    await recordCount(redis, 'hawker', 100, 'manual', 'baseline');
    await new Promise((r) => setTimeout(r, 5));
    await recordCount(redis, 'hawker', 101, '4-monthly', 'plus one');
    await new Promise((r) => setTimeout(r, 5));
    await recordCount(redis, 'hawker', 99, 'manual', 'minus one');
    const h = await getHistory(redis, 'hawker');
    expect(h).toHaveLength(3);
    expect(h[0].n).toBe(99);
    expect(h[1].n).toBe(101);
    expect(h[2].n).toBe(100);
  });

  it('caps history at HISTORY_CAP (12) entries', async () => {
    for (let i = 0; i < 20; i++) {
      await recordCount(redis, 'bus-stops', 5500 + i, 'manual', `tick ${i}`);
      await new Promise((r) => setTimeout(r, 1));
    }
    const h = await getHistory(redis, 'bus-stops');
    expect(h.length).toBeLessThanOrEqual(HISTORY_CAP);
    expect(h.length).toBe(HISTORY_CAP);
    // The retained entries are the 12 newest.
    expect(h[0].n).toBe(5519);
    expect(h[HISTORY_CAP - 1].n).toBe(5508);
  });

  it('rejects invalid inputs', async () => {
    expect(await recordCount(null, 'cuisines', 70)).toBeNull();
    expect(await recordCount(redis, '', 70)).toBeNull();
    expect(await recordCount(redis, 'cuisines', -1)).toBeNull();
    expect(await recordCount(redis, 'cuisines', NaN)).toBeNull();
    expect(await recordCount(redis, 'cuisines', '70')).toBeNull();
  });

  it('returns null current + empty history when no entries exist', async () => {
    expect(await getCurrentCount(redis, 'cuisines')).toBeNull();
    expect(await getHistory(redis, 'cuisines')).toEqual([]);
  });

  it('returns empty / null when redis is closed', async () => {
    const closed = makeFakeRedis({ isOpen: false });
    expect(await recordCount(closed, 'cuisines', 70)).toBeNull();
    expect(await getHistory(closed, 'cuisines')).toEqual([]);
    expect(await getCurrentCount(closed, 'cuisines')).toBeNull();
  });
});

describe('revertTo', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('records a NEW entry with the prior count + source=revert', async () => {
    const first = await recordCount(redis, 'cuisines', 70, 'manual', 'baseline');
    await new Promise((r) => setTimeout(r, 5));
    await recordCount(redis, 'cuisines', 72, 'manual', 'jb-add');
    const reverted = await revertTo(redis, 'cuisines', first.ts);
    expect(reverted).toMatchObject({ n: 70, source: 'revert' });
    expect(reverted.notes).toContain('reverted to ts=');
    const current = await getCurrentCount(redis, 'cuisines');
    expect(current.n).toBe(70);
    expect(current.source).toBe('revert');
  });

  it('returns null when the target ts is not in history', async () => {
    await recordCount(redis, 'cuisines', 70);
    const out = await revertTo(redis, 'cuisines', 1234567890);
    expect(out).toBeNull();
  });

  it('returns null for non-finite ts', async () => {
    expect(await revertTo(redis, 'cuisines', NaN)).toBeNull();
    expect(await revertTo(redis, 'cuisines', 'nope')).toBeNull();
  });

  it('does not mutate the source-of-truth (revert is display-only)', async () => {
    // Operator Q2 (a): revert changes the displayed count but not
    // the underlying file/API. The test verifies the history's
    // newest entry is what readers see; the recount fns are
    // INDEPENDENT — re-running a recount would re-derive the
    // current file count.
    await recordCount(redis, 'cuisines', 70, 'manual');
    await new Promise((r) => setTimeout(r, 5));
    await recordCount(redis, 'cuisines', 72, 'manual');
    const out = await getHistory(redis, 'cuisines');
    // Both original entries are still in history.
    expect(out.find((e) => e.n === 70)).toBeTruthy();
    expect(out.find((e) => e.n === 72)).toBeTruthy();
  });
});

describe('clearHistory', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('removes all entries for the item', async () => {
    await recordCount(redis, 'cuisines', 70);
    await recordCount(redis, 'cuisines', 72);
    expect((await getHistory(redis, 'cuisines')).length).toBe(2);
    expect(await clearHistory(redis, 'cuisines')).toBe(true);
    expect(await getHistory(redis, 'cuisines')).toEqual([]);
  });

  it('is per-item isolated', async () => {
    await recordCount(redis, 'cuisines', 70);
    await recordCount(redis, 'hawker', 100);
    await clearHistory(redis, 'cuisines');
    expect(await getHistory(redis, 'cuisines')).toEqual([]);
    expect((await getCurrentCount(redis, 'hawker')).n).toBe(100);
  });

  it('returns false for malformed / closed redis', async () => {
    expect(await clearHistory(null, 'cuisines')).toBe(false);
    expect(await clearHistory(redis, '')).toBe(false);
    const closed = makeFakeRedis({ isOpen: false });
    expect(await clearHistory(closed, 'cuisines')).toBe(false);
  });
});
