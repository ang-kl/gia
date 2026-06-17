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
