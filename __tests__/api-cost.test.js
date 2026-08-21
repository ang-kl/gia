// __tests__/api-cost.test.js — v0.61.307

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const apiCost = require('../api-cost.js');

function makeRedisStub() {
  const store = new Map();
  return {
    isOpen: true,
    connect: async () => {},
    hIncrBy: async (k, field, n) => {
      const h = store.get(k) || {};
      h[field] = (Number(h[field]) || 0) + Number(n);
      store.set(k, h);
      return h[field];
    },
    hGetAll: async (k) => store.get(k) || null,
    expire: async () => true,
    scanIterator: function* ({ MATCH }) {
      const re = new RegExp('^' + MATCH.replace(/\*/g, '.*') + '$');
      for (const k of store.keys()) {
        if (re.test(k)) yield k;
      }
    },
    _store: store
  };
}

describe('api-cost — exports + rate card', () => {
  it('exposes the expected functions and constants', () => {
    expect(typeof apiCost.recordGeminiUsage).toBe('function');
    expect(typeof apiCost.recordMapsCall).toBe('function');
    expect(typeof apiCost.getCostSummary).toBe('function');
    expect(typeof apiCost.formatCostSummary).toBe('function');
    expect(apiCost.PRICES).toBeTruthy();
    expect(apiCost.PRICES.gemini['gemini-2.5-flash']).toBeTruthy();
    expect(apiCost.PRICES.maps.placeAutocomplete).toBeGreaterThan(0);
  });
});

describe('api-cost — recordGeminiUsage', () => {
  it('bumps count + tokens on a real usage payload', async () => {
    const r = makeRedisStub();
    const ok = await apiCost.recordGeminiUsage(r, 'gemini-2.5-flash', {
      promptTokenCount: 100,
      candidatesTokenCount: 50,
      totalTokenCount: 150
    });
    expect(ok).toBe(true);
    const summary = await apiCost.getCostSummary(r, 1);
    expect(summary.gemini.totalCalls).toBe(1);
    expect(summary.gemini.totalInTokens).toBe(100);
    expect(summary.gemini.totalOutTokens).toBe(50);
    expect(summary.gemini.byModel['gemini-2.5-flash']).toMatchObject({
      count: 1, in_tokens: 100, out_tokens: 50
    });
  });

  it('records a call even when usageMetadata is missing (count only)', async () => {
    const r = makeRedisStub();
    const ok = await apiCost.recordGeminiUsage(r, 'gemini-2.5-flash-lite', null);
    expect(ok).toBe(true);
    const summary = await apiCost.getCostSummary(r, 1);
    expect(summary.gemini.totalCalls).toBe(1);
    expect(summary.gemini.totalInTokens).toBe(0);
    expect(summary.gemini.totalOutTokens).toBe(0);
  });

  it('returns false when redis is null', async () => {
    expect(await apiCost.recordGeminiUsage(null, 'gemini-2.5-flash', {})).toBe(false);
  });

  it('aggregates multiple calls to the same model', async () => {
    const r = makeRedisStub();
    await apiCost.recordGeminiUsage(r, 'gemini-2.5-flash', { promptTokenCount: 10, candidatesTokenCount: 5 });
    await apiCost.recordGeminiUsage(r, 'gemini-2.5-flash', { promptTokenCount: 20, candidatesTokenCount: 8 });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.gemini.byModel['gemini-2.5-flash'].count).toBe(2);
    expect(s.gemini.byModel['gemini-2.5-flash'].in_tokens).toBe(30);
    expect(s.gemini.byModel['gemini-2.5-flash'].out_tokens).toBe(13);
  });

  it('computes USD from the rate card', async () => {
    const r = makeRedisStub();
    // 1M input tokens of gemini-2.5-flash at $0.30/M → $0.30
    await apiCost.recordGeminiUsage(r, 'gemini-2.5-flash', {
      promptTokenCount: 1_000_000,
      candidatesTokenCount: 0
    });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.gemini.totalUsd).toBeCloseTo(0.30, 4);
  });
});

describe('api-cost — recordMapsCall', () => {
  it('bumps count per endpoint', async () => {
    const r = makeRedisStub();
    await apiCost.recordMapsCall(r, 'placeAutocomplete');
    await apiCost.recordMapsCall(r, 'placeAutocomplete');
    await apiCost.recordMapsCall(r, 'placeResolve');
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.totalCalls).toBe(3);
    expect(s.maps.byEndpoint.placeAutocomplete.count).toBe(2);
    expect(s.maps.byEndpoint.placeResolve.count).toBe(1);
  });

  it('rejects unset endpoint name', async () => {
    const r = makeRedisStub();
    expect(await apiCost.recordMapsCall(r, '')).toBe(false);
    expect(await apiCost.recordMapsCall(r, null)).toBe(false);
  });

  it('computes Maps USD from the rate card', async () => {
    const r = makeRedisStub();
    // placeResolve costs $0.017/req per the rate card
    await apiCost.recordMapsCall(r, 'placeResolve');
    await apiCost.recordMapsCall(r, 'placeResolve');
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.totalUsd).toBeCloseTo(0.034, 4);
  });

  // v0.62.71x — Routes API bills per ELEMENT (origins × destinations), not
  // per request. travel-times.js passes candidates.length as the 3rd arg
  // so one computeRouteMatrix call can bump the counter by N in one shot.
  it('bumps count by the given element count, not always 1', async () => {
    const r = makeRedisStub();
    await apiCost.recordMapsCall(r, 'routes', 12);
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.byEndpoint.routes.count).toBe(12);
  });

  it('defaults to 1 when count is omitted (back-compat)', async () => {
    const r = makeRedisStub();
    await apiCost.recordMapsCall(r, 'routes');
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.byEndpoint.routes.count).toBe(1);
  });

  it('treats a non-finite or non-positive count as 1', async () => {
    const r = makeRedisStub();
    await apiCost.recordMapsCall(r, 'routes', NaN);
    await apiCost.recordMapsCall(r, 'routes', -5);
    await apiCost.recordMapsCall(r, 'routes', 0);
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.byEndpoint.routes.count).toBe(3);
  });

  it('exposes a routes rate-card entry so Routes spend can be priced', () => {
    expect(apiCost.PRICES.maps.routes).toBeGreaterThan(0);
  });
});

describe('api-cost — formatCostSummary', () => {
  it('returns the no-data message when nothing tracked', () => {
    const empty = {
      days: 1, since: '2026-05-31', until: '2026-05-31',
      gemini: { totalCalls: 0, totalInTokens: 0, totalOutTokens: 0, totalUsd: 0, byModel: {} },
      maps:   { totalCalls: 0, totalUsd: 0, byEndpoint: {} }
    };
    const out = apiCost.formatCostSummary(empty);
    expect(out).toContain('No tracked calls');
  });

  it('includes both providers and the rate-card footer', () => {
    const summary = {
      days: 3, since: '2026-05-29', until: '2026-05-31',
      gemini: {
        totalCalls: 5, totalInTokens: 1000, totalOutTokens: 500, totalUsd: 0.0015,
        byModel: { 'gemini-2.5-flash': { count: 5, in_tokens: 1000, out_tokens: 500, usd: 0.0015 } }
      },
      maps: {
        totalCalls: 2, totalUsd: 0.034,
        byEndpoint: { placeResolve: { count: 2, usd: 0.034 } }
      }
    };
    const out = apiCost.formatCostSummary(summary);
    expect(out).toContain('API spend');
    expect(out).toContain('Gemini');
    expect(out).toContain('Maps');
    expect(out).toContain('gemini-2.5-flash');
    expect(out).toContain('placeResolve');
    expect(out).toContain('Static rate card');
  });

  it('handles redis-offline (null summary)', () => {
    expect(apiCost.formatCostSummary(null)).toContain('redis offline');
  });
});

// v0.62.719 — regression tests for the silent-zero defect found by the first
// real production /cost reading (2026-08-19): GEMINI_MODEL was deployed as
// gemini-3.1-flash-lite, which is not in PRICES, so 2,519 input tokens costed
// out at exactly $0.0000. spend-guard.js sums gemini.totalUsd, so the circuit
// breaker could never see Gemini spend at all.
//
// v0.62.722 — gemini-3.1-flash-lite is now IN PRICES (rate verified against
// Google's published pricing page), so it can no longer stand in for "a model
// the table has not heard of". The unpriced property is exercised with a
// deliberately fictional name instead, and the operator's real receipt now
// asserts the OPPOSITE: that it prices exactly, with no estimate flag. Using a
// real model name as the permanent stand-in for "unknown" was always going to
// expire the moment the table caught up with reality.
describe('api-cost — unpriced models and endpoints must not read as free', () => {
  const day = new Date().toISOString().slice(0, 10);

  function replay(entries) {
    return {
      isOpen: true,
      async *scanIterator({ MATCH }) {
        const re = new RegExp('^' + MATCH.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*') + '$');
        for (const k of Object.keys(entries)) if (re.test(k)) yield k;
      },
      async hGetAll(k) { return entries[k]; }
    };
  }

  const UNKNOWN = 'gemini-0.0-does-not-exist';   // not a real model, and must never become one

  it('prices an unknown Gemini model above zero and flags it', async () => {
    const r = replay({ [`api-cost:${day}:gemini:${UNKNOWN}`]: { count: '1', in_tokens: '2519', out_tokens: '172' } });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.gemini.totalUsd).toBeGreaterThan(0);
    expect(s.gemini.byModel[UNKNOWN].estimated).toBe(true);
    expect(s.gemini.unpricedModels).toContain(UNKNOWN);
  });

  it('prices the once-unknown gemini-3.1-flash-lite exactly, now that it is in the table', async () => {
    const r = replay({ [`api-cost:${day}:gemini:gemini-3.1-flash-lite`]: { count: '1', in_tokens: '1000000', out_tokens: '0' } });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.gemini.totalUsd).toBeCloseTo(0.25, 6);      // $0.25 per 1M in
    expect(s.gemini.byModel['gemini-3.1-flash-lite'].estimated).toBe(false);
  });

  it('prices every model the code can actually select — no chain entry is an estimate', async () => {
    const { MODEL_CHAIN, FLASH, LITE } = require('../gemini-models');
    for (const m of new Set([...MODEL_CHAIN, FLASH, LITE])) {
      expect(apiCost.PRICES.gemini[m], `${m} missing from PRICES`).toBeTruthy();
    }
  });

  it('still prices a KNOWN model exactly, with no estimate flag', async () => {
    const r = replay({ [`api-cost:${day}:gemini:gemini-2.5-flash-lite`]: { count: '1', in_tokens: '1000000', out_tokens: '0' } });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.gemini.totalUsd).toBeCloseTo(0.10, 6);      // $0.10 per 1M in
    expect(s.gemini.byModel['gemini-2.5-flash-lite'].estimated).toBe(false);
    expect(s.gemini.unpricedModels).toHaveLength(0);
  });

  it('prices an unknown Maps endpoint above zero and flags it', async () => {
    const r = replay({ [`api-cost:${day}:maps:someNewSku`]: { count: '10' } });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.totalUsd).toBeGreaterThan(0);
    expect(s.maps.unpricedEndpoints).toContain('someNewSku');
  });

  it('reproduces the operator reading: Maps unchanged, Gemini no longer zero', async () => {
    const r = replay({
      [`api-cost:${day}:gemini:${UNKNOWN}`]: { count: '1', in_tokens: '2519', out_tokens: '172' },
      [`api-cost:${day}:maps:routes`]: { count: '24' },
      [`api-cost:${day}:maps:searchText`]: { count: '6' }
    });
    const s = await apiCost.getCostSummary(r, 1);
    expect(s.maps.totalUsd).toBeCloseTo(0.312, 4);   // matches the live /cost exactly
    expect(s.gemini.totalUsd).toBeGreaterThan(0);    // the defect: this was 0
  });

  it('surfaces the unpriced name in the rendered /cost text', async () => {
    const r = replay({ [`api-cost:${day}:gemini:${UNKNOWN}`]: { count: '1', in_tokens: '2519', out_tokens: '172' } });
    const text = apiCost.formatCostSummary(await apiCost.getCostSummary(r, 1));
    expect(text).toContain('Not in the rate card');
    expect(text).toContain(UNKNOWN);
    expect(text).toContain('⚠️ est.');
  });

  it('serialises — unpriced lists survive JSON, so callers can read them', async () => {
    const r = replay({ [`api-cost:${day}:gemini:${UNKNOWN}`]: { count: '1', in_tokens: '10', out_tokens: '1' } });
    const s = JSON.parse(JSON.stringify(await apiCost.getCostSummary(r, 1)));
    expect(s.gemini.unpricedModels).toEqual([UNKNOWN]);
  });
});
