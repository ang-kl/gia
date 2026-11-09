// __tests__/footfall-signal.test.js — v0.59.0
//
// Tests for footfall-signal — the chip helper + cost calc. Network
// path (BestTime API) is stubbed via env-var absence: without
// BESTTIME_API_KEY, attachFootfallSignals returns the venues array
// unchanged, so tests don't need network mocking.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { attachFootfallSignals, footfallCost, footfallChip } from '../footfall-signal.js';

describe('attachFootfallSignals — without API key', () => {
  let savedKey;
  beforeEach(() => {
    savedKey = process.env.BESTTIME_API_KEY;
    delete process.env.BESTTIME_API_KEY;
  });
  afterEach(() => {
    if (savedKey) process.env.BESTTIME_API_KEY = savedKey;
  });

  it('returns venues unchanged when no API key', async () => {
    const venues = [{ placeId: 'X', name: 'V' }];
    const result = await attachFootfallSignals(null, venues);
    expect(result).toBe(venues);
    expect(venues[0].footfall).toBeUndefined();
  });

  it('handles empty / null inputs', async () => {
    expect(await attachFootfallSignals(null, [])).toEqual([]);
    expect(await attachFootfallSignals(null, null)).toEqual([]);
  });
});

describe('footfallCost — soft tiebreaker', () => {
  it('prefers liveBusyness over forecastNext', () => {
    expect(footfallCost({ liveBusyness: 80, forecastNext: 20 })).toBeCloseTo(0.8);
  });
  it('falls back to forecastNext when no live', () => {
    expect(footfallCost({ forecastNext: 30 })).toBeCloseTo(0.3);
  });
  it('returns 0.5 (medium) when no signal', () => {
    expect(footfallCost(null)).toBe(0.5);
    expect(footfallCost({})).toBe(0.5);
  });
});

describe('footfallChip — locale-aware', () => {
  it('uses "busy now" with peak in EN when liveBusyness present', () => {
    const out = footfallChip({ liveBusyness: 78, peakHour: '12:30' }, 'en');
    expect(out).toBe('🚦 78% busy now · peaks 12:30');
  });
  it('uses "occupé maintenant" with "pic" in FR when liveBusyness present', () => {
    const out = footfallChip({ liveBusyness: 78, peakHour: '12:30' }, 'fr');
    expect(out).toBe('🚦 78% occupé maintenant · pic 12:30');
  });
  it('says "forecast" when only forecastNext present', () => {
    const out = footfallChip({ forecastNext: 50 }, 'en');
    expect(out).toBe('🚦 50% forecast');
  });
  it('returns null when no value', () => {
    expect(footfallChip(null)).toBeNull();
    expect(footfallChip({})).toBeNull();
  });
});
