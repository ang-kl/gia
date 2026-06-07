// __tests__/currency-format.test.js — v0.61.360
// Coverage for the currency-format module that drives the venue-card
// price-range line ("S$25–40" / "M$50–80 (≈S$14.91–23.85)" / …).
// v0.61.360: FX rewritten to a USD-pivot table (Alpha Vantage primary,
// Frankfurter fallback, 15-day cache) + 2.8% markup, round-up, "≈".

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prefixForCountry,
  prefixForCurrency,
  currencyForCountry,
  usdRate,
  fetchFxRate,
  formatPriceRangeForVenue
} from '../currency-format.js';

// URL-aware fetch mock for the Frankfurter fallback leg. `usdRates` maps
// an ISO-4217 code → USD per 1 unit; the mock reads the `from=` query
// param and answers in Frankfurter's { rates: { USD: <n> } } shape.
function mockFrankfurter(usdRates) {
  return vi.fn((url) => {
    const m = /[?&]from=([A-Za-z]{3})/.exec(url);
    const cur = m && m[1].toUpperCase();
    if (cur && usdRates[cur] != null) {
      return Promise.resolve({ ok: true, json: async () => ({ rates: { USD: usdRates[cur] } }) });
    }
    return Promise.resolve({ ok: true, json: async () => ({ rates: {} }) });
  });
}

describe('currency-format — prefix lookups', () => {
  it('maps operator-specified country prefixes (SG → S$, MY → M$)', () => {
    expect(prefixForCountry('SG')).toBe('S$');
    expect(prefixForCountry('MY')).toBe('M$');
    expect(prefixForCountry('US')).toBe('US$');
    expect(prefixForCountry('JP')).toBe('¥');
    expect(prefixForCountry('FR')).toBe('€');
  });

  it('returns null for unknown country codes', () => {
    expect(prefixForCountry('XX')).toBeNull();
    expect(prefixForCountry('')).toBeNull();
    expect(prefixForCountry(null)).toBeNull();
  });

  it('lowercases country codes safely', () => {
    expect(prefixForCountry('sg')).toBe('S$');
    expect(prefixForCountry('My')).toBe('M$');
  });

  it('maps ISO-4217 currency codes', () => {
    expect(prefixForCurrency('SGD')).toBe('S$');
    expect(prefixForCurrency('MYR')).toBe('M$');
    expect(prefixForCurrency('USD')).toBe('US$');
    expect(prefixForCurrency('EUR')).toBe('€');
  });

  it('falls back to "CODE " for unknown currencies', () => {
    expect(prefixForCurrency('XYZ')).toBe('XYZ ');
  });

  it('maps country → currency for FX lookup', () => {
    expect(currencyForCountry('SG')).toBe('SGD');
    expect(currencyForCountry('MY')).toBe('MYR');
    expect(currencyForCountry('FR')).toBe('EUR');
    expect(currencyForCountry('XX')).toBeNull();
  });
});

describe('currency-format — usdRate (Alpha Vantage primary)', () => {
  let mockRedis;
  beforeEach(() => {
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK')
    };
    globalThis.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.ALPHAVANTAGE_API_KEY; });

  it('short-circuits USD to 1.0 without a network call', async () => {
    const r = await usdRate('USD', mockRedis);
    expect(r).toBe(1.0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('reads Alpha Vantage CURRENCY_EXCHANGE_RATE and caches 15 days', async () => {
    process.env.ALPHAVANTAGE_API_KEY = 'TESTKEY';
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ 'Realtime Currency Exchange Rate': { '5. Exchange Rate': '0.74000000' } })
    });
    const r = await usdRate('SGD', mockRedis);
    expect(r).toBe(0.74);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect(globalThis.fetch.mock.calls[0][0]).toContain('alphavantage.co');
    expect(mockRedis.setex).toHaveBeenCalledWith('fx:usd:SGD', 15 * 24 * 3600, '0.74');
  });

  it('falls back to Frankfurter when Alpha Vantage is rate-limited (Information envelope)', async () => {
    process.env.ALPHAVANTAGE_API_KEY = 'TESTKEY';
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ Information: 'rate limit' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ rates: { USD: 0.21 } }) });
    const r = await usdRate('MYR', mockRedis);
    expect(r).toBe(0.21);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    expect(globalThis.fetch.mock.calls[1][0]).toContain('frankfurter.app');
  });

  it('uses Frankfurter directly when no Alpha Vantage key is set', async () => {
    globalThis.fetch = mockFrankfurter({ SGD: 0.74 });
    const r = await usdRate('SGD', mockRedis);
    expect(r).toBe(0.74);
    expect(globalThis.fetch.mock.calls[0][0]).toContain('frankfurter.app');
  });

  it('returns a cached value without hitting the network', async () => {
    mockRedis.get.mockResolvedValue('0.74');
    const r = await usdRate('SGD', mockRedis);
    expect(r).toBe(0.74);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns null when both sources fail', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('econnrefused'));
    const r = await usdRate('SGD', mockRedis);
    expect(r).toBeNull();
  });
});

describe('currency-format — fetchFxRate (USD cross-rate)', () => {
  let mockRedis;
  beforeEach(() => {
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK')
    };
    globalThis.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.ALPHAVANTAGE_API_KEY; });

  it('short-circuits identical currencies to 1.0', async () => {
    const r = await fetchFxRate('SGD', 'SGD', mockRedis);
    expect(r).toBe(1.0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('SGD→USD uses only the SGD leg (USD pivot is 1.0)', async () => {
    globalThis.fetch = mockFrankfurter({ SGD: 0.74 });
    const r = await fetchFxRate('SGD', 'USD', mockRedis);
    expect(r).toBe(0.74);
    expect(globalThis.fetch).toHaveBeenCalledOnce(); // USD leg short-circuits
  });

  it('computes a cross-rate via the USD pivot: SGD→MYR = usd(SGD)/usd(MYR)', async () => {
    globalThis.fetch = mockFrankfurter({ SGD: 0.74, MYR: 0.2146 });
    const r = await fetchFxRate('SGD', 'MYR', mockRedis);
    // 0.74 / 0.2146 ≈ 3.448 MYR per 1 SGD
    expect(r).toBeCloseTo(0.74 / 0.2146, 6);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('covers a "rigid" currency Frankfurter omits, via Alpha Vantage (TWD)', async () => {
    process.env.ALPHAVANTAGE_API_KEY = 'TESTKEY';
    globalThis.fetch = vi.fn((url) => {
      if (url.includes('from_currency=TWD')) {
        return Promise.resolve({ ok: true, json: async () => ({ 'Realtime Currency Exchange Rate': { '5. Exchange Rate': '0.031' } }) });
      }
      // USD pivot short-circuits, so this branch is for SGD only.
      return Promise.resolve({ ok: true, json: async () => ({ 'Realtime Currency Exchange Rate': { '5. Exchange Rate': '0.74' } }) });
    });
    const r = await fetchFxRate('TWD', 'SGD', mockRedis);
    expect(r).toBeCloseTo(0.031 / 0.74, 6);
  });

  it('returns null when a leg fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const r = await fetchFxRate('SGD', 'MYR', mockRedis);
    expect(r).toBeNull();
  });
});

describe('currency-format — formatPriceRangeForVenue', () => {
  let mockRedis;
  beforeEach(() => {
    mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };
    globalThis.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); delete process.env.ALPHAVANTAGE_API_KEY; });

  it('returns null when priceRange is missing', async () => {
    const r = await formatPriceRangeForVenue(null, 'SG', 'SG', mockRedis);
    expect(r).toBeNull();
  });

  it('same-country SG user + SG venue → "S$25–40" (no parens)', async () => {
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 25, end: 40 }, 'SG', 'SG', mockRedis
    );
    expect(r).toBe('S$25–40');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('SG user + MY venue → marked-up "≈" parens via USD pivot', async () => {
    // usd(MYR)=0.232, usd(SGD)=0.8 → SGD per MYR = 0.29.
    // 50*0.29=14.50 *1.028 → 14.91 ; 80*0.29=23.20 *1.028 → 23.85
    globalThis.fetch = mockFrankfurter({ MYR: 0.232, SGD: 0.8 });
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'MYR', start: 50, end: 80 }, 'MY', 'SG', mockRedis
    );
    expect(r).toBe('M$50–80 (≈S$14.91–23.85)');
  });

  it('rounds the marked-up conversion UP to 2 dp (cents currency)', async () => {
    // usd(SGD)=0.74, USD pivot 1.0 → SGD per USD... here SG venue, US user.
    // 25*0.74=18.50 *1.028=19.018 → 19.02 ; 40*0.74=29.60 *1.028=30.4288 → 30.43
    globalThis.fetch = mockFrankfurter({ SGD: 0.74 });
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 25, end: 40 }, 'SG', 'US', mockRedis
    );
    expect(r).toBe('S$25–40 (≈US$19.02–30.43)');
  });

  it('rounds no-cents user currency (JPY) to whole numbers, marked up', async () => {
    // usd(SGD)=0.74, usd(JPY)=0.0067 → JPY per SGD ≈ 110.4478
    // 25*110.4478=2761.19 *1.028 → 2839 ; 40*…=4417.91 *1.028 → 4542
    globalThis.fetch = mockFrankfurter({ SGD: 0.74, JPY: 0.0067 });
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 25, end: 40 }, 'SG', 'JP', mockRedis
    );
    expect(r).toBe('S$25–40 (≈¥2839–4542)');
  });

  it('falls back to no-parens when FX fetch fails', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('timeout'));
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'MYR', start: 50, end: 80 }, 'MY', 'SG', mockRedis
    );
    expect(r).toBe('M$50–80');
  });

  it('omits parens when user country is unknown (null)', async () => {
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 25, end: 40 }, 'SG', null, mockRedis
    );
    expect(r).toBe('S$25–40');
  });

  it('omits parens when venue country is unknown (null)', async () => {
    // Falls back to currency-code prefix (S$ via SGD).
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 25, end: 40 }, null, 'US', mockRedis
    );
    expect(r).toBe('S$25–40');
  });

  it('handles single-point ranges (start only)', async () => {
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 30, end: null }, 'SG', 'SG', mockRedis
    );
    expect(r).toBe('S$30');
  });

  it('handles single-point ranges (end only)', async () => {
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: null, end: 30 }, 'SG', 'SG', mockRedis
    );
    expect(r).toBe('S$30');
  });
});
