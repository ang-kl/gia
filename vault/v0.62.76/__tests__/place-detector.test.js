// __tests__/place-detector.test.js — v0.61.119
//
// Unit tests for the deterministic branches of place-detector.js
// (hawker centre + MRT/LRT station). The geocode fallback is NOT
// covered here because it hits the live Google Places API; integration
// coverage is in the chat handler smoke runs.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pd = require('../place-detector.js');

describe('place-detector — MRT/LRT detection (deterministic, no API)', () => {
  it('exact station name → MRT match', () => {
    const r = pd.findMrt('Orchard');
    expect(r).toBeTruthy();
    expect(r.kind).toBe('mrt');
    expect(r.name).toBe('Orchard MRT');
    expect(r.radius).toBe(pd.MRT_RADIUS_M);
    expect(typeof r.lat).toBe('number');
    expect(typeof r.lng).toBe('number');
  });

  it('strips "MRT" / "station" / "stn" / "lrt" / "interchange" suffix', () => {
    expect(pd.findMrt('Tanjong Pagar MRT')?.name).toBe('Tanjong Pagar MRT');
    expect(pd.findMrt('Bishan Station')?.name).toBe('Bishan MRT');
    expect(pd.findMrt('Tampines stn')?.name).toBe('Tampines MRT');
    expect(pd.findMrt('Bishan Interchange')?.name).toBe('Bishan MRT');
  });

  it('case-insensitive + punctuation-tolerant', () => {
    expect(pd.findMrt('ORCHARD')?.name).toBe('Orchard MRT');
    expect(pd.findMrt('orchard mrt!')?.name).toBe('Orchard MRT');
    expect(pd.findMrt('tampines  mrt')?.name).toBe('Tampines MRT');
  });

  it('returns null for non-stations', () => {
    expect(pd.findMrt('italian')).toBeNull();
    expect(pd.findMrt('western cuisine nearby')).toBeNull();
    expect(pd.findMrt('chiffon cake')).toBeNull();
    expect(pd.findMrt('laksa')).toBeNull();
    expect(pd.findMrt('a')).toBeNull();
    expect(pd.findMrt('')).toBeNull();
  });
});

describe('place-detector — hawker centre detection (fuzzy via hawker-vault)', () => {
  it('exact full name', () => {
    const r = pd.findHawker('Maxwell Food Centre');
    expect(r).toBeTruthy();
    expect(r.kind).toBe('hawker');
    expect(r.name).toBe('Maxwell Food Centre');
    expect(r.radius).toBe(pd.HAWKER_RADIUS_M);
  });

  it('partial / shorthand → fuzzy match', () => {
    expect(pd.findHawker('chinatown complex')?.name).toMatch(/Chinatown Complex/i);
  });

  it('returns null for dishes / cuisines', () => {
    expect(pd.findHawker('laksa')).toBeNull();
    expect(pd.findHawker('chiffon cake')).toBeNull();
    expect(pd.findHawker('italian')).toBeNull();
  });
});

describe('place-detector — detectPlaceName ladder (MRT → hawker → geocode)', () => {
  it('MRT wins over hawker when both could match (Tanjong Pagar)', async () => {
    // "Tanjong Pagar" matches both Tanjong Pagar MRT and "Blk 6 Tanjong
    // Pagar Plaza" (a hawker block). MRT-first ordering is intentional —
    // the 400m MRT radius covers the plaza anyway, and the station is
    // what almost everyone means when they type "Tanjong Pagar".
    const r = await pd.detectPlaceName('Tanjong Pagar');
    expect(r.kind).toBe('mrt');
    expect(r.name).toBe('Tanjong Pagar MRT');
  });

  it('"Newton" → Newton MRT (radius covers Newton Food Centre)', async () => {
    const r = await pd.detectPlaceName('Newton');
    expect(r.kind).toBe('mrt');
    expect(r.name).toBe('Newton MRT');
  });

  it('hawker name with "Food Centre" suffix → hawker (MRT match fails)', async () => {
    const r = await pd.detectPlaceName('Maxwell Food Centre');
    expect(r.kind).toBe('hawker');
    expect(r.name).toBe('Maxwell Food Centre');
  });

  it('returns null for cuisine / dish / off-topic text (must NOT mis-match)', async () => {
    // Geocode fallback IS attempted for these in production; in the test
    // env there's no GEMINI / GOOGLE key so it returns null. Either way
    // the bare-word inputs below must NOT trip the deterministic branches.
    expect(pd.findMrt('italian')).toBeNull();
    expect(pd.findHawker('italian')).toBeNull();
    expect(pd.findMrt('western cuisine nearby')).toBeNull();
    expect(pd.findHawker('western cuisine nearby')).toBeNull();
    expect(pd.findMrt('chiffon cake')).toBeNull();
    expect(pd.findHawker('chiffon cake')).toBeNull();
    expect(pd.findMrt('goulash')).toBeNull();
    expect(pd.findHawker('goulash')).toBeNull();
  });

  it('blanks / nonsense', async () => {
    expect(await pd.detectPlaceName('')).toBeNull();
    expect(await pd.detectPlaceName('   ')).toBeNull();
    expect(await pd.detectPlaceName(null)).toBeNull();
    expect(await pd.detectPlaceName('a')).toBeNull();
  });
});

describe('place-detector — helpers', () => {
  it('_stripMrtSuffix trims known MRT noise tokens', () => {
    expect(pd._stripMrtSuffix('Orchard MRT')).toBe('orchard');
    expect(pd._stripMrtSuffix('Bishan station')).toBe('bishan');
    expect(pd._stripMrtSuffix('Tampines LRT')).toBe('tampines');
    expect(pd._stripMrtSuffix('Tampines')).toBe('tampines');
  });

  it('_normalise drops case / punctuation / extra whitespace', () => {
    expect(pd._normalise('  Orchard! ')).toBe('orchard');
    expect(pd._normalise('Tanjong-Pagar')).toBe('tanjong pagar');
  });

  it('exported radius constants are reasonable', () => {
    expect(pd.HAWKER_RADIUS_M).toBeGreaterThan(0);
    expect(pd.MRT_RADIUS_M).toBeGreaterThan(pd.HAWKER_RADIUS_M);
    expect(pd.NEARBY_RADIUS_M).toBeGreaterThan(pd.MRT_RADIUS_M);
  });
});
