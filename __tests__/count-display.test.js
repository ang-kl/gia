// __tests__/count-display.test.js — v0.61.169

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  FALLBACK,
  getDisplayCount,
  getDisplayCounts,
  formatCountPlus,
  formatAllCountsPlus,
  substituteCounts
} = require('../count-display');
const { recordCount } = require('../count-history');

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
    async zRemRangeByRank() { return 0; }
  };
}

describe('FALLBACK constants', () => {
  it('mirrors the prior marketing baselines', () => {
    expect(FALLBACK.cuisines).toBe(55);
    expect(FALLBACK.hawker).toBe(100);
    expect(FALLBACK.michelin).toBe(170);
  });

  it('is frozen', () => {
    expect(() => { FALLBACK.cuisines = 999; }).toThrow();
  });
});

describe('getDisplayCount', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('returns FALLBACK when no history entry exists', async () => {
    expect(await getDisplayCount(redis, 'cuisines')).toBe(55);
  });

  it('returns the live count when an entry exists', async () => {
    await recordCount(redis, 'cuisines', 72);
    expect(await getDisplayCount(redis, 'cuisines')).toBe(72);
  });

  it('returns 0 for unknown items with no FALLBACK', async () => {
    expect(await getDisplayCount(redis, 'unknown-item')).toBe(0);
  });

  it('falls back when stored count is 0 / non-positive', async () => {
    // recordCount rejects n<0; n=0 records the entry. n=0 should
    // fall through to FALLBACK (an item recorded as 'unavailable'
    // shouldn't trash the marketing string).
    await recordCount(redis, 'cuisines', 0, 'unavailable');
    expect(await getDisplayCount(redis, 'cuisines')).toBe(55);
  });
});

describe('getDisplayCounts', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('returns a complete map of all 14 items', async () => {
    const counts = await getDisplayCounts(redis);
    expect(Object.keys(counts).length).toBe(14);
    expect(counts.cuisines).toBe(55);
    expect(counts.hawker).toBe(100);
  });

  it('mixes live + fallback for partially-seeded redis', async () => {
    await recordCount(redis, 'cuisines', 80);
    const counts = await getDisplayCounts(redis);
    expect(counts.cuisines).toBe(80);
    expect(counts.hawker).toBe(100);     // fallback
  });
});

describe('formatCountPlus', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('rounds DOWN to the nearest 5', async () => {
    await recordCount(redis, 'cuisines', 73);
    expect(await formatCountPlus(redis, 'cuisines')).toBe('70+');

    await recordCount(redis, 'hawker', 117);
    expect(await formatCountPlus(redis, 'hawker')).toBe('115+');
  });

  it('returns the raw value for counts < 10 (no rounding)', async () => {
    await recordCount(redis, 'train-lines', 7);
    expect(await formatCountPlus(redis, 'train-lines')).toBe('7+');
  });

  it('uses FALLBACK when no history exists', async () => {
    expect(await formatCountPlus(redis, 'cuisines')).toBe('55+');
    expect(await formatCountPlus(redis, 'michelin')).toBe('170+');
  });
});

describe('formatAllCountsPlus', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('returns "N+" strings for all 14 items', async () => {
    const out = await formatAllCountsPlus(redis);
    expect(out.cuisines).toBe('55+');
    expect(out.hawker).toBe('100+');
    expect(Object.keys(out).length).toBe(14);
  });
});

describe('substituteCounts', () => {
  it('replaces {item} placeholders with the corresponding value', () => {
    const counts = { cuisines: '55+', hawker: '100+' };
    const out = substituteCounts('Explore {cuisines} and {hawker}', counts);
    expect(out).toBe('Explore 55+ and 100+');
  });

  it('leaves unknown placeholders intact', () => {
    const counts = { cuisines: '70+' };
    const out = substituteCounts('Try {cuisines} or {unknown}', counts);
    expect(out).toBe('Try 70+ or {unknown}');
  });

  it('handles non-string template / non-object counts gracefully', () => {
    expect(substituteCounts(null, { x: 1 })).toBe(null);
    expect(substituteCounts('hi {x}', null)).toBe('hi {x}');
    expect(substituteCounts('hi {x}', 'not-obj')).toBe('hi {x}');
  });

  it('handles hyphenated item keys', () => {
    const counts = { 'bus-stops': '5500+', 'train-lines': '6+' };
    const out = substituteCounts('{bus-stops} stops, {train-lines} lines', counts);
    expect(out).toBe('5500+ stops, 6+ lines');
  });
});
