// __tests__/currency-format.test.js — v0.60.183
// Coverage for the new currency-format module that drives the venue-
// card price-range line ("S$25–40" / "M$50–80 (S$14.50–23.20)" / …).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  prefixForCountry,
  prefixForCurrency,
  currencyForCountry,
  fetchFxRate,
  formatPriceRangeForVenue
} from '../currency-format.js';

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

describe('currency-format — fetchFxRate', () => {
  let mockRedis;
  beforeEach(() => {
    mockRedis = {
      get: vi.fn().mockResolvedValue(null),
      setex: vi.fn().mockResolvedValue('OK')
    };
    globalThis.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('short-circuits identical currencies to 1.0', async () => {
    const r = await fetchFxRate('SGD', 'SGD', mockRedis);
    expect(r).toBe(1.0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns Frankfurter rate on success and writes cache', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { USD: 0.74 } })
    });
    const r = await fetchFxRate('SGD', 'USD', mockRedis);
    expect(r).toBe(0.74);
    expect(globalThis.fetch).toHaveBeenCalledOnce();
    expect(mockRedis.setex).toHaveBeenCalledWith('fx:SGD:USD', 12 * 3600, '0.74');
  });

  it('returns cached rate without hitting network', async () => {
    mockRedis.get.mockResolvedValue('0.74');
    const r = await fetchFxRate('SGD', 'USD', mockRedis);
    expect(r).toBe(0.74);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('returns null when network fails (graceful degradation)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('econnrefused'));
    const r = await fetchFxRate('SGD', 'USD', mockRedis);
    expect(r).toBeNull();
  });

  it('returns null on non-OK response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const r = await fetchFxRate('SGD', 'USD', mockRedis);
    expect(r).toBeNull();
  });

  it('returns null when rate is missing in response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: {} })
    });
    const r = await fetchFxRate('SGD', 'USD', mockRedis);
    expect(r).toBeNull();
  });
});

describe('currency-format — formatPriceRangeForVenue', () => {
  let mockRedis;
  beforeEach(() => {
    mockRedis = { get: vi.fn().mockResolvedValue(null), setex: vi.fn() };
    globalThis.fetch = vi.fn();
  });
  afterEach(() => { vi.restoreAllMocks(); });

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

  it('SG user + MY venue → "M$50–80 (S$14.50–23.20)" (FX in parens)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { SGD: 0.29 } })
    });
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'MYR', start: 50, end: 80 }, 'MY', 'SG', mockRedis
    );
    expect(r).toBe('M$50–80 (S$14.50–23.20)');
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

  it('renders integer bounds without decimals natively, 2 dp in parens', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ rates: { USD: 0.74 } })
    });
    const r = await formatPriceRangeForVenue(
      { currencyCode: 'SGD', start: 25, end: 40 }, 'SG', 'US', mockRedis
    );
    expect(r).toBe('S$25–40 (US$18.50–29.60)');
  });
});
