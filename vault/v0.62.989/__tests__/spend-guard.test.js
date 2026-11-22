// __tests__/spend-guard.test.js — v0.62.715
//
// Phase C of the cost-audit plan: the daily-spend circuit breaker. Phase A
// made the spend figure trustworthy; this module is the first thing to act
// on it. The properties that matter most here are the FAIL directions —
// a monitoring outage must not degrade the product (readSpend fails OPEN),
// and a Redis hiccup must not produce an alert loop (shouldAlert fails
// CLOSED). Both are pinned below.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const guard = require('../spend-guard.js');

const ENV_KEYS = ['SPEND_SOFT_USD', 'SPEND_HARD_USD'];
const saved = {};

beforeEach(() => {
  for (const k of ENV_KEYS) { saved[k] = process.env[k]; delete process.env[k]; }
  guard._resetCacheForTests();
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  guard._resetCacheForTests();
});

// Minimal stand-in for the api-cost Redis surface getCostSummary uses.
function makeRedis({ geminiUsd = 0, mapsUsd = 0, fail = false, setResult = 'OK' } = {}) {
  return {
    isOpen: true,
    connect: async () => {},
    _sets: [],
    set: async function (key, val, opts) {
      if (fail) throw new Error('redis down');
      this._sets.push({ key, val, opts });
      return setResult;
    },
    // getCostSummary scans + hGetAlls; emulate one gemini + one maps key.
    scanIterator: function* ({ MATCH }) {
      if (fail) throw new Error('redis down');
      if (MATCH.includes(':gemini:')) yield MATCH.replace('*', 'gemini-2.5-flash');
      else yield MATCH.replace('*', 'searchText');
    },
    hGetAll: async (key) => {
      if (fail) throw new Error('redis down');
      if (key.includes(':gemini:')) {
        // 1M input tokens of gemini-2.5-flash @ $0.30/M == $0.30 per unit.
        return { count: '1', in_tokens: String(Math.round((geminiUsd / 0.30) * 1_000_000)), out_tokens: '0' };
      }
      // searchText is $0.032/req on the rate card.
      return { count: String(Math.round(mapsUsd / 0.032)) };
    }
  };
}

describe('spend-guard — thresholds()', () => {
  it('defaults to $10 soft / $25 hard', () => {
    expect(guard.thresholds()).toEqual({ soft: 10, hard: 25 });
  });
  it('reads both from env', () => {
    process.env.SPEND_SOFT_USD = '3';
    process.env.SPEND_HARD_USD = '7';
    expect(guard.thresholds()).toEqual({ soft: 3, hard: 7 });
  });
  it('falls back to defaults on garbage or negative values', () => {
    process.env.SPEND_SOFT_USD = 'abc';
    process.env.SPEND_HARD_USD = '-5';
    expect(guard.thresholds()).toEqual({ soft: 10, hard: 25 });
  });
  it('accepts 0 as a real value (disables that level)', () => {
    process.env.SPEND_HARD_USD = '0';
    expect(guard.thresholds().hard).toBe(0);
  });
});

describe('spend-guard — levelFor()', () => {
  const t = { soft: 10, hard: 25 };
  it('classifies the three bands, inclusive at each boundary', () => {
    expect(guard.levelFor(0, t)).toBe('ok');
    expect(guard.levelFor(9.99, t)).toBe('ok');
    expect(guard.levelFor(10, t)).toBe('soft');
    expect(guard.levelFor(24.99, t)).toBe('soft');
    expect(guard.levelFor(25, t)).toBe('hard');
    expect(guard.levelFor(1000, t)).toBe('hard');
  });
  it('treats a 0 threshold as "level disabled"', () => {
    expect(guard.levelFor(1000, { soft: 10, hard: 0 })).toBe('soft');   // hard off
    expect(guard.levelFor(1000, { soft: 0, hard: 0 })).toBe('ok');      // both off
  });
  it('ignores a misconfigured hard < soft rather than shedding early', () => {
    // hard(5) < soft(10): the hard band must not fire below soft.
    expect(guard.levelFor(7, { soft: 10, hard: 5 })).toBe('ok');
    expect(guard.levelFor(12, { soft: 10, hard: 5 })).toBe('soft');
  });
  it('returns ok for non-finite / negative input', () => {
    expect(guard.levelFor(NaN, t)).toBe('ok');
    expect(guard.levelFor(-1, t)).toBe('ok');
    expect(guard.levelFor(undefined, t)).toBe('ok');
  });
});

describe('spend-guard — readSpend()', () => {
  it('sums gemini + maps USD into a level', async () => {
    process.env.SPEND_SOFT_USD = '1';
    process.env.SPEND_HARD_USD = '2';
    const r = await guard.readSpend(makeRedis({ geminiUsd: 0.9, mapsUsd: 0.32 }));
    expect(r.usd).toBeCloseTo(1.22, 2);
    expect(r.level).toBe('soft');
    expect(r.cached).toBe(false);
  });

  // End-to-end fail-open property. Note the throw is actually absorbed one
  // layer down, inside api-cost.getCostSummary's own per-date try/catch (it
  // returns a zeroed summary rather than propagating) — readSpend's own catch
  // is a second belt for a hard failure of the require/call itself. Either
  // way the observable contract is the one asserted here: broken monitoring
  // must never shed enrichment.
  it('FAILS OPEN to level ok when the underlying cost read is broken', async () => {
    process.env.SPEND_SOFT_USD = '0.01';
    const r = await guard.readSpend(makeRedis({ fail: true }));
    expect(r.level).toBe('ok');
    expect(r.usd).toBe(0);
  });

  it('FAILS OPEN to level ok when there is no redis client at all', async () => {
    process.env.SPEND_SOFT_USD = '0.01';
    const r = await guard.readSpend(null);
    expect(r.level).toBe('ok');
    expect(r.usd).toBe(0);
  });

  // Covers readSpend's OWN catch block specifically. A mutation check proved
  // the two cases above never reach it (getCostSummary absorbs those errors
  // internally and returns a zeroed summary), so without this case the catch
  // was untested and could have been inverted to fail-closed unnoticed.
  // A throwing `isOpen` getter escapes api-cost's internal guards and
  // propagates out of getCostSummary.
  it('FAILS OPEN when getCostSummary itself throws (readSpend own catch)', async () => {
    process.env.SPEND_SOFT_USD = '0.01';
    const hostile = { get isOpen() { throw new Error('exploding client'); } };
    const r = await guard.readSpend(hostile);
    expect(r.level).toBe('ok');
    expect(r.usd).toBe(0);
  });

  it('memoises within CACHE_MS and recomputes after it expires', async () => {
    process.env.SPEND_SOFT_USD = '1';
    const redis = makeRedis({ geminiUsd: 5 });
    const t0 = 1_000_000;
    const first = await guard.readSpend(redis, t0);
    expect(first.cached).toBe(false);
    const second = await guard.readSpend(redis, t0 + 1000);
    expect(second.cached).toBe(true);
    expect(second.usd).toBe(first.usd);
    const third = await guard.readSpend(redis, t0 + guard.CACHE_MS + 1);
    expect(third.cached).toBe(false);
  });
});

describe('spend-guard — allows()', () => {
  it('permits every sheddable step below the hard cap', async () => {
    process.env.SPEND_HARD_USD = '100';
    const redis = makeRedis({ geminiUsd: 1 });
    for (const step of guard.SHEDDABLE) {
      expect(await guard.allows(redis, step)).toBe(true);
    }
  });

  it('sheds every sheddable step at the hard cap', async () => {
    process.env.SPEND_SOFT_USD = '0.5';
    process.env.SPEND_HARD_USD = '1';
    const redis = makeRedis({ geminiUsd: 3 });
    for (const step of guard.SHEDDABLE) {
      expect(await guard.allows(redis, step)).toBe(false);
    }
  });

  it('never sheds an unknown step name, even at the hard cap', async () => {
    // Both thresholds must be set: a bare SPEND_HARD_USD=1 leaves soft at its
    // default 10, and levelFor deliberately ignores a hard < soft config — so
    // the reading would be 'soft', not 'hard', and this test would pass
    // vacuously. (A mutation check caught exactly that.)
    process.env.SPEND_SOFT_USD = '0.5';
    process.env.SPEND_HARD_USD = '1';
    const redis = makeRedis({ geminiUsd: 50 });
    // Precondition: we really are at the hard cap.
    expect((await guard.readSpend(redis)).level).toBe('hard');
    // A known sheddable step IS shed here...
    expect(await guard.allows(redis, 'sanctuary')).toBe(false);
    // ...while unknown / non-sheddable names are still allowed through.
    expect(await guard.allows(redis, 'travel-times')).toBe(true);
    expect(await guard.allows(redis, 'places-search')).toBe(true);
    expect(await guard.allows(redis, '')).toBe(true);
  });
});

describe('spend-guard — shouldAlert() latch', () => {
  it('fires once per day per level, then suppresses', async () => {
    const redis = makeRedis();
    expect(await guard.shouldAlert(redis, 'soft', Date.parse('2026-08-10T04:00:00Z'))).toBe(true);
    redis.set = async () => null;   // NX now finds the key present
    expect(await guard.shouldAlert(redis, 'soft', Date.parse('2026-08-10T09:00:00Z'))).toBe(false);
  });

  it('keys soft and hard separately, and by UTC day', async () => {
    const redis = makeRedis();
    await guard.shouldAlert(redis, 'soft', Date.parse('2026-08-10T04:00:00Z'));
    await guard.shouldAlert(redis, 'hard', Date.parse('2026-08-10T04:00:00Z'));
    await guard.shouldAlert(redis, 'soft', Date.parse('2026-08-11T04:00:00Z'));
    expect(redis._sets.map((s) => s.key)).toEqual([
      'spend-guard:alerted:2026-08-10:soft',
      'spend-guard:alerted:2026-08-10:hard',
      'spend-guard:alerted:2026-08-11:soft'
    ]);
    expect(redis._sets[0].opts).toMatchObject({ NX: true });
  });

  it('never alerts for level ok, or without a redis client', async () => {
    expect(await guard.shouldAlert(makeRedis(), 'ok')).toBe(false);
    expect(await guard.shouldAlert(null, 'hard')).toBe(false);
  });

  it('FAILS CLOSED (no alert) when redis throws — an alert loop is worse than a missed alert', async () => {
    expect(await guard.shouldAlert(makeRedis({ fail: true }), 'hard')).toBe(false);
  });
});

describe('spend-guard — formatAlert()', () => {
  it('hard copy names the shed steps and reassures search still works', () => {
    const out = guard.formatAlert({ usd: 26.5, level: 'hard', soft: 10, hard: 25 });
    expect(out).toContain('hard cap reached');
    expect(out).toContain('$26.50');
    expect(out).toContain('/hidden');
    expect(out).toMatch(/Search itself still works/i);
  });
  it('soft copy states nothing is skipped yet', () => {
    const out = guard.formatAlert({ usd: 11, level: 'soft', soft: 10, hard: 25 });
    expect(out).toContain('soft threshold crossed');
    expect(out).toMatch(/Nothing is being skipped yet/i);
  });
});

describe('spend-guard — checkAndAlert()', () => {
  it('stays silent at level ok', async () => {
    process.env.SPEND_SOFT_USD = '100';
    let called = 0;
    const r = await guard.checkAndAlert(makeRedis({ geminiUsd: 1 }), () => { called++; });
    expect(r.level).toBe('ok');
    expect(called).toBe(0);
  });

  it('notifies once when a threshold is crossed', async () => {
    process.env.SPEND_SOFT_USD = '0.5';
    process.env.SPEND_HARD_USD = '1000';
    const msgs = [];
    const r = await guard.checkAndAlert(makeRedis({ geminiUsd: 3 }), (t) => { msgs.push(t); });
    expect(r.level).toBe('soft');
    expect(msgs.length).toBe(1);
    expect(msgs[0]).toContain('soft threshold crossed');
  });

  it('still returns the reading when the notify callback throws', async () => {
    process.env.SPEND_SOFT_USD = '0.5';
    const r = await guard.checkAndAlert(makeRedis({ geminiUsd: 3 }), () => { throw new Error('telegram down'); });
    expect(r.level).toBe('soft');
  });
});
