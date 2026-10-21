// __tests__/location-boundary.test.js — v0.61.157
//
// Tests for the v0.61.157 boundary primitives: deriveMatchKey
// (mode + admin → stable string), computeBoundary (locale →
// matchKey + radius + anchor), isInsideBoundary (candidate +
// boundary → boolean).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  DEFAULT_RADIUS_M,
  deriveMatchKey,
  computeBoundary,
  isInsideBoundary
} = require('../location-boundary');

describe('DEFAULT_RADIUS_M', () => {
  it('SG = 60 km, JB = 30 km, OTHER = 15 km', () => {
    expect(DEFAULT_RADIUS_M.SG).toBe(60000);
    expect(DEFAULT_RADIUS_M.JB).toBe(30000);
    expect(DEFAULT_RADIUS_M.OTHER).toBe(15000);
  });
});

describe('deriveMatchKey', () => {
  it('SG mode collapses to a single key regardless of admin', () => {
    expect(deriveMatchKey({ mode: 'SG', adminAreaLevel1: 'Central Region' })).toBe('SG');
    expect(deriveMatchKey({ mode: 'SG', adminAreaLevel1: 'North East Region' })).toBe('SG');
    expect(deriveMatchKey({ mode: 'SG' })).toBe('SG');
  });
  it('JB mode collapses to JB|johor', () => {
    expect(deriveMatchKey({ mode: 'JB', adminAreaLevel1: 'Johor' })).toBe('JB|johor');
    expect(deriveMatchKey({ mode: 'JB', adminAreaLevel1: "Johor Darul Ta'zim" })).toBe('JB|johor');
  });
  it('OTHER mode encodes the specific admin (case-folded + trimmed)', () => {
    expect(deriveMatchKey({ mode: 'OTHER', adminAreaLevel1: 'Selangor' })).toBe('OTHER|selangor');
    expect(deriveMatchKey({ mode: 'OTHER', adminAreaLevel1: 'WILAYAH PERSEKUTUAN PUTRAJAYA' }))
      .toBe('OTHER|wilayah persekutuan putrajaya');
    expect(deriveMatchKey({ mode: 'OTHER', adminAreaLevel1: '  Selangor  ' })).toBe('OTHER|selangor');
  });
  it('OTHER with no admin → OTHER|', () => {
    expect(deriveMatchKey({ mode: 'OTHER' })).toBe('OTHER|');
  });
  it('unknown mode falls through OTHER|<admin>', () => {
    expect(deriveMatchKey({ mode: 'WAKANDA', adminAreaLevel1: 'X' })).toBe('OTHER|x');
  });
});

describe('computeBoundary', () => {
  it('SG default radius', () => {
    expect(computeBoundary({ mode: 'SG', adminAreaLevel1: 'Central Region', lat: 1.28, lng: 103.85 }))
      .toMatchObject({ matchKey: 'SG', radiusM: 60000, anchorLat: 1.28, anchorLng: 103.85 });
  });
  it('JB default radius', () => {
    expect(computeBoundary({ mode: 'JB', adminAreaLevel1: 'Johor', lat: 1.49, lng: 103.74 }))
      .toMatchObject({ matchKey: 'JB|johor', radiusM: 30000 });
  });
  it('OTHER default radius', () => {
    expect(computeBoundary({ mode: 'OTHER', adminAreaLevel1: 'Selangor', lat: 3.07, lng: 101.5 }))
      .toMatchObject({ matchKey: 'OTHER|selangor', radiusM: 15000 });
  });
  it('explicit radiusM overrides the default', () => {
    expect(computeBoundary({ mode: 'OTHER', adminAreaLevel1: 'X', lat: 0, lng: 0, radiusM: 50000 }).radiusM).toBe(50000);
  });
  it('non-finite lat/lng → null anchor coords (matchKey-only boundary)', () => {
    const b = computeBoundary({ mode: 'SG', adminAreaLevel1: null, lat: NaN, lng: undefined });
    expect(b.anchorLat).toBeNull();
    expect(b.anchorLng).toBeNull();
    expect(b.matchKey).toBe('SG');
  });
});

describe('isInsideBoundary', () => {
  const sgBoundary = {
    matchKey: 'SG', radiusM: 60000, anchorLat: 1.2843, anchorLng: 103.8519
  };
  const jbBoundary = {
    matchKey: 'JB|johor', radiusM: 30000, anchorLat: 1.4927, anchorLng: 103.7414
  };
  const putrajayaBoundary = {
    matchKey: 'OTHER|wilayah persekutuan putrajaya', radiusM: 15000, anchorLat: 2.9742, anchorLng: 101.7060
  };

  it('same SG matchKey + within radius → inside', () => {
    expect(isInsideBoundary(
      { mode: 'SG', adminAreaLevel1: 'North Region', lat: 1.4304, lng: 103.8354 },
      sgBoundary
    )).toBe(true);
  });

  it('SG → JB (different matchKey) → outside even when geographically close', () => {
    expect(isInsideBoundary(
      { mode: 'JB', adminAreaLevel1: 'Johor', lat: 1.4927, lng: 103.7414 },
      sgBoundary
    )).toBe(false);
  });

  it('JB → JB within radius (Pasir Gudang ~21 km) → inside', () => {
    expect(isInsideBoundary(
      { mode: 'JB', adminAreaLevel1: 'Johor', lat: 1.4790, lng: 103.9180 },
      jbBoundary
    )).toBe(true);
  });

  it('JB → JB beyond radius (Kluang ~75 km from JB CBD) → outside', () => {
    expect(isInsideBoundary(
      { mode: 'JB', adminAreaLevel1: 'Johor', lat: 2.0300, lng: 103.3192 },
      jbBoundary
    )).toBe(false);
  });

  it('OTHER different admin → outside', () => {
    expect(isInsideBoundary(
      { mode: 'OTHER', adminAreaLevel1: 'Selangor', lat: 3.07, lng: 101.5 },
      putrajayaBoundary
    )).toBe(false);
  });

  it('null boundary inputs → false (defensive)', () => {
    expect(isInsideBoundary(null, sgBoundary)).toBe(false);
    expect(isInsideBoundary({ mode: 'SG' }, null)).toBe(false);
  });

  it('boundary without anchor coords (legacy synthesized) → matchKey check only', () => {
    const b = { matchKey: 'SG', radiusM: 60000, anchorLat: null, anchorLng: null };
    expect(isInsideBoundary({ mode: 'SG', lat: 1.30, lng: 103.85 }, b)).toBe(true);
    expect(isInsideBoundary({ mode: 'JB' }, b)).toBe(false);
  });

  it('candidate without lat/lng + matching matchKey → inside (trust the key)', () => {
    expect(isInsideBoundary(
      { mode: 'SG', adminAreaLevel1: 'Central Region' },
      sgBoundary
    )).toBe(true);
  });
});
