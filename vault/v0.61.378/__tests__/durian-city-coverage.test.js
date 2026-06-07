// __tests__/durian-city-coverage.test.js — v0.61.378
// Drives the per-city coverage orchestration with a MOCK _searchTextFn
// (no live Places API), proving the scan → confirm → zero-flag logic.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cov = require('../scripts/durian-city-coverage.js');

// Mock Places: JP cities return nothing (→ zero); everywhere else returns a
// mode-appropriate relevant durian venue. Signature mirrors _searchText.
function mockSearch(q, region) {
  if (region.cc === 'JP') return Promise.resolve([]); // Tokyo has no durian (in this mock)
  const isPastryQuery = /dessert|cake|puff|甜品|蛋糕|スイーツ|디저트|ขนม|pastri|bánh/i.test(q);
  const place = isPastryQuery
    ? { id: 'pp', displayName: { text: 'Durian Puff Bakery' }, primaryType: 'bakery', formattedAddress: 'SG', reviews: [] }
    : { id: 'pf', displayName: { text: '99 Old Trees Durian' }, primaryType: 'food_store', formattedAddress: 'SG', reviews: [] };
  return Promise.resolve([place]);
}

const CITIES = [
  { cc: 'SG', name: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { cc: 'JP', name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
];

describe('durian-city-coverage — scan → confirm → zero flag', () => {
  it('flags a city with NO venues as zero (both modes), confirmed 3×', async () => {
    const results = await cov.runCoverage({ cities: CITIES, apiKey: 'TEST', _searchTextFn: mockSearch });
    const jpDurian = results.find((r) => r.cc === 'JP' && r.mode === 'durian');
    const jpPastry = results.find((r) => r.cc === 'JP' && r.mode === 'durian-pastry');
    expect(jpDurian.zero).toBe(true);
    expect(jpDurian.confirmFires).toEqual([0, 0, 0]); // 3 fires, all empty
    expect(jpPastry.zero).toBe(true);
  });

  it('does NOT flag a city that has venues (both modes)', async () => {
    const results = await cov.runCoverage({ cities: CITIES, apiKey: 'TEST', _searchTextFn: mockSearch });
    const sgDurian = results.find((r) => r.cc === 'SG' && r.mode === 'durian');
    const sgPastry = results.find((r) => r.cc === 'SG' && r.mode === 'durian-pastry');
    expect(sgDurian.zero).toBe(false);
    expect(sgDurian.scanKept).toBeGreaterThan(0);
    expect(sgDurian.confirmFires).toBeNull(); // never reached the confirm pass
    expect(sgPastry.zero).toBe(false);
  });

  it('uses the LOCAL languages for each country', () => {
    expect(cov.localLangsFor('JP')).toEqual(['ja', 'en']);
    expect(cov.localLangsFor('TW')).toEqual(['zh-TW', 'en']);
    expect(cov.localLangsFor('TH')).toEqual(['th', 'en']);
    expect(cov.localLangsFor('XX')).toEqual(['en']); // unknown → English
  });

  it('cost estimate is positive + scan is cheaper than the confirm ceiling', () => {
    const { scanCalls, confirmCeilingCalls } = cov.estimateCost(CITIES);
    expect(scanCalls).toBeGreaterThan(0);
    expect(confirmCeilingCalls).toBeGreaterThan(scanCalls);
  });
});
