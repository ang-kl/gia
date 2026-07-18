// __tests__/nearest-hawker.test.js — v0.62.598
//
// transport.nearestHawkerCentre(coords, lat, lng) — the pure helper behind the
// Transport station card's "🍜 nearest hawker" hyperlink. Given the vault's
// name→{lat,lng} coord map, it returns the single nearest centre by
// straight-line (haversine) distance, or null on bad input.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const transport = require('../transport.js');

// A few real-ish SG coordinates (Maxwell / Chinatown / Amoy Street area).
const COORDS = {
  'Maxwell Food Centre': { lat: 1.2802, lng: 103.8442 },
  'Amoy Street Food Centre': { lat: 1.2796, lng: 103.8467 },
  'Chinatown Complex': { lat: 1.2823, lng: 103.8435 },
  'Old Airport Road Food Centre': { lat: 1.3082, lng: 103.8853 }
};

describe('transport.nearestHawkerCentre', () => {
  it('returns the nearest centre with a rounded metre distance', () => {
    // A point sitting almost on top of Maxwell.
    const r = transport.nearestHawkerCentre(COORDS, 1.2803, 103.8443);
    expect(r).toBeTruthy();
    expect(r.name).toBe('Maxwell Food Centre');
    expect(r.lat).toBe(1.2802);
    expect(r.lng).toBe(103.8442);
    expect(Number.isInteger(r.distanceM)).toBe(true);
    expect(r.distanceM).toBeLessThan(60);
  });

  it('picks the truly closest when several are near', () => {
    // Nearer to Amoy Street than Maxwell/Chinatown.
    const r = transport.nearestHawkerCentre(COORDS, 1.2797, 103.8466);
    expect(r.name).toBe('Amoy Street Food Centre');
  });

  it('resolves a far point to the correct distant centre', () => {
    // Out east near Old Airport Road.
    const r = transport.nearestHawkerCentre(COORDS, 1.3080, 103.8855);
    expect(r.name).toBe('Old Airport Road Food Centre');
    expect(r.distanceM).toBeGreaterThan(0);
  });

  it('skips entries with non-finite coordinates', () => {
    const withBad = { Bad: { lat: NaN, lng: 103.8 }, Good: { lat: 1.30, lng: 103.85 } };
    const r = transport.nearestHawkerCentre(withBad, 1.30, 103.85);
    expect(r.name).toBe('Good');
  });

  it('returns null on empty / bad input', () => {
    expect(transport.nearestHawkerCentre({}, 1.3, 103.8)).toBe(null);
    expect(transport.nearestHawkerCentre(null, 1.3, 103.8)).toBe(null);
    expect(transport.nearestHawkerCentre(COORDS, NaN, 103.8)).toBe(null);
    expect(transport.nearestHawkerCentre(COORDS, 1.3, undefined)).toBe(null);
  });
});
