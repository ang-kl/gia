// __tests__/search-location.test.js — v0.61.373
// Region-aware search-centre single source of truth. Guarantees the centre
// can never silently diverge from the region (the "Other mode, still
// searching Singapore" bug class).

import { describe, it, expect } from 'vitest';
import { resolveSearchCenter, isValidPoint, regionUsesDeviceFallback } from '../web/cuisine/src/v2/lib/search-location.js';

const SG = { lat: 1.2721, lng: 103.8116 };    // device GPS (Bukit Merah)
const WLG = { lat: -41.2865, lng: 174.7762 }; // Wellington pick
const JB = { lat: 1.4927, lng: 103.7414 };    // Johor Bahru

describe('isValidPoint', () => {
  it('accepts a real point', () => { expect(isValidPoint(SG)).toBe(true); });
  it('rejects null / 0,0 / NaN / out-of-range', () => {
    expect(isValidPoint(null)).toBe(false);
    expect(isValidPoint({ lat: 0, lng: 0 })).toBe(false);
    expect(isValidPoint({ lat: NaN, lng: 1 })).toBe(false);
    expect(isValidPoint({ lat: 91, lng: 1 })).toBe(false);
  });
});

describe('regionUsesDeviceFallback', () => {
  it('SG / unset may use the device GPS', () => {
    expect(regionUsesDeviceFallback('SG')).toBe(true);
    expect(regionUsesDeviceFallback(undefined)).toBe(true);
    expect(regionUsesDeviceFallback('__NONE__')).toBe(true);
  });
  it('OTHER / JB / MY-PUT may NOT', () => {
    expect(regionUsesDeviceFallback('OTHER')).toBe(false);
    expect(regionUsesDeviceFallback('JB')).toBe(false);
    expect(regionUsesDeviceFallback('MY-PUT')).toBe(false);
  });
});

describe('resolveSearchCenter — explicit picks win in every region', () => {
  it('a passed anchor wins', () => {
    expect(resolveSearchCenter({ region: 'SG', anchor: WLG, userLoc: SG })).toEqual({ lat: WLG.lat, lng: WLG.lng });
  });
  it('committed searchCenter beats locationAnchor + device', () => {
    expect(resolveSearchCenter({ region: 'OTHER', searchCenter: WLG, locationAnchor: JB, userLoc: SG })).toEqual({ lat: WLG.lat, lng: WLG.lng });
  });
  it('locationAnchor used when no anchor/searchCenter', () => {
    expect(resolveSearchCenter({ region: 'OTHER', locationAnchor: WLG, userLoc: SG })).toEqual({ lat: WLG.lat, lng: WLG.lng });
  });
});

describe('resolveSearchCenter — region-aware device fallback', () => {
  it('SG with no pick → device GPS', () => {
    expect(resolveSearchCenter({ region: 'SG', userLoc: SG })).toEqual({ lat: SG.lat, lng: SG.lng });
  });
  it('OTHER with no pick → null (never the device GPS) — the core fix', () => {
    expect(resolveSearchCenter({ region: 'OTHER', userLoc: SG })).toBeNull();
  });
  it('JB with no pick → null (never the device GPS)', () => {
    expect(resolveSearchCenter({ region: 'JB', userLoc: SG })).toBeNull();
  });
  it('OTHER with a device-followed anchor still centres on the anchor', () => {
    // The 20s sync sets a name-less anchor when following the device into a
    // foreign country; that is still an explicit point → used as the centre.
    expect(resolveSearchCenter({ region: 'OTHER', locationAnchor: WLG, userLoc: SG })).toEqual({ lat: WLG.lat, lng: WLG.lng });
  });
  it('nothing valid → null', () => {
    expect(resolveSearchCenter({ region: 'SG', userLoc: { lat: 0, lng: 0 } })).toBeNull();
    expect(resolveSearchCenter({})).toBeNull();
  });
});
