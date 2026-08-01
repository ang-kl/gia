// __tests__/temp-pin.test.js — v0.62.689
//
// The pure half of the station-pick inspection overlay: nearest-N ranking and
// the distance formatter. The DOM node builders are not covered — no render
// harness exists (O-93) — so these tests pin the logic that decides WHICH
// centres are shown and HOW their distance reads.

import { describe, it, expect } from 'vitest';
import { nearestByDistance, shortDist } from '../web/_shared/lib/temp-pin.js';

// Singapore-ish coordinates: Raffles Place as the pin, three centres at
// increasing distance, plus one with broken coords that must be skipped.
const PIN = { lat: 1.2830, lng: 103.8513 };
const CENTRES = [
  { name: 'Far',      lat: 1.3521, lng: 103.8198 },  // ~8 km N
  { name: 'Near',     lat: 1.2810, lng: 103.8500 },  // ~250 m
  { name: 'Mid',      lat: 1.2966, lng: 103.8520 },  // ~1.5 km N
  { name: 'Broken',   lat: null,   lng: 103.85 },
  { name: 'Furthest', lat: 1.4360, lng: 103.7860 },  // ~18 km
];

describe('nearestByDistance', () => {
  it('returns the N nearest in ascending distance order', () => {
    const out = nearestByDistance(PIN.lat, PIN.lng, CENTRES, 3);
    expect(out.map((c) => c.name)).toEqual(['Near', 'Mid', 'Far']);
  });

  it('attaches a numeric distM to each result', () => {
    const out = nearestByDistance(PIN.lat, PIN.lng, CENTRES, 3);
    for (const c of out) expect(Number.isFinite(c.distM)).toBe(true);
    expect(out[0].distM).toBeLessThan(out[1].distM);
  });

  it('skips entries with non-finite coordinates rather than ranking them first', () => {
    const out = nearestByDistance(PIN.lat, PIN.lng, CENTRES, 5);
    expect(out.map((c) => c.name)).not.toContain('Broken');
  });

  it('returns fewer than N when there are fewer valid items', () => {
    expect(nearestByDistance(PIN.lat, PIN.lng, [CENTRES[1]], 3)).toHaveLength(1);
  });

  it('returns [] for bad input rather than throwing', () => {
    expect(nearestByDistance(NaN, 103.8, CENTRES, 3)).toEqual([]);
    expect(nearestByDistance(1.28, 103.85, null, 3)).toEqual([]);
    expect(nearestByDistance(1.28, 103.85, CENTRES, 0)).toEqual([]);
  });

  it('does not mutate the source array', () => {
    const copy = JSON.parse(JSON.stringify(CENTRES));
    nearestByDistance(PIN.lat, PIN.lng, CENTRES, 3);
    expect(CENTRES).toEqual(copy);
  });
});

describe('shortDist', () => {
  it('uses metres below 1 km', () => {
    expect(shortDist(250)).toBe('250 m');
    expect(shortDist(999)).toBe('999 m');
  });

  it('switches to km at 1 km, one decimal', () => {
    expect(shortDist(1000)).toBe('1.0 km');
    expect(shortDist(8200)).toBe('8.2 km');
  });

  it('returns empty for non-finite input', () => {
    expect(shortDist(NaN)).toBe('');
    expect(shortDist(undefined)).toBe('');
  });
});
