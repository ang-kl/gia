// __tests__/crowd-signal.test.js — v0.57.31

import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const cs = require('../crowd-signal.js');
const carpark = require('../carpark.js');

// Stub carpark.nearest in place so attachCrowdSignals doesn't make
// real HTTP calls. carpark.js exports an object literal, so we can
// reassign its methods at runtime.
const originalNearest = carpark.nearest;
let nearestStub = vi.fn();
beforeEach(() => {
  nearestStub = vi.fn();
  carpark.nearest = nearestStub;
});

const cellHigh = [
  { availableLots: 5 },
  { availableLots: 8 },
  { availableLots: 12 }
]; // median 8 → high
const cellLow = [
  { availableLots: 200 },
  { availableLots: 250 },
  { availableLots: 300 }
]; // median 250 → low
const cellMed = [
  { availableLots: 50 },
  { availableLots: 80 },
  { availableLots: 100 }
]; // median 80 → medium

describe('crowdCost', () => {
  it('high → 1.0', () => expect(cs.crowdCost('high')).toBe(1.0));
  it('medium → 0.5', () => expect(cs.crowdCost('medium')).toBe(0.5));
  it('low → 0.0', () => expect(cs.crowdCost('low')).toBe(0.0));
  it('unknown → 0.5 (no boost or penalty)', () => {
    expect(cs.crowdCost(null)).toBe(0.5);
    expect(cs.crowdCost(undefined)).toBe(0.5);
  });
});

describe('crowdChip', () => {
  it('returns emoji + label for known levels', () => {
    expect(cs.crowdChip('high')).toEqual({ emoji: '🔴', label: 'busy' });
    expect(cs.crowdChip('medium')).toEqual({ emoji: '🟡', label: 'moderate' });
    expect(cs.crowdChip('low')).toEqual({ emoji: '🟢', label: 'quiet' });
  });
  it('returns null for unknown', () => {
    expect(cs.crowdChip(null)).toBe(null);
    expect(cs.crowdChip('martian')).toBe(null);
  });
});

describe('attachCrowdSignals', () => {
  it('returns [] for empty / null input', async () => {
    expect(await cs.attachCrowdSignals([])).toEqual([]);
    expect(await cs.attachCrowdSignals(null)).toEqual([]);
  });

  it('attaches crowdLevel + crowdSignal to each venue', async () => {
    nearestStub.mockResolvedValue(cellHigh);
    const venues = [
      { name: 'A', lat: 1.284, lng: 103.851 },
      { name: 'B', lat: 1.2841, lng: 103.8511 }
    ];
    const out = await cs.attachCrowdSignals(venues);
    expect(out[0].crowdLevel).toBe('high');
    expect(out[0].crowdSignal.medianLots).toBe(8);
    expect(out[1].crowdLevel).toBe('high');
  });

  it('makes ONE carpark call per cluster, not per venue', async () => {
    nearestStub.mockResolvedValue(cellLow);
    // 5 venues all within 500 m of Raffles Place — should be 1 cluster
    const venues = Array.from({ length: 5 }, (_, i) => ({
      name: `V${i}`,
      lat: 1.284 + i * 0.0001,
      lng: 103.851 + i * 0.0001
    }));
    await cs.attachCrowdSignals(venues);
    expect(nearestStub).toHaveBeenCalledTimes(1);
  });

  it('makes one call per distinct grid cell', async () => {
    nearestStub.mockResolvedValue(cellMed);
    // Two venues 5 km apart → 2 different clusters
    const venues = [
      { name: 'CBD', lat: 1.2840, lng: 103.8510 },
      { name: 'Bishan', lat: 1.3506, lng: 103.8485 }
    ];
    await cs.attachCrowdSignals(venues);
    expect(nearestStub).toHaveBeenCalledTimes(2);
  });

  it('sets crowdLevel: null when carpark.nearest fails', async () => {
    nearestStub.mockRejectedValue(new Error('LTA timeout'));
    const venues = [{ name: 'A', lat: 1.284, lng: 103.851 }];
    const out = await cs.attachCrowdSignals(venues);
    expect(out[0].crowdLevel).toBe(null);
    expect(out[0].crowdSignal).toBe(null);
  });

  it('sets crowdLevel: null when too few carparks', async () => {
    nearestStub.mockResolvedValue([{ availableLots: 50 }]); // only 1
    const venues = [{ name: 'A', lat: 1.284, lng: 103.851 }];
    const out = await cs.attachCrowdSignals(venues);
    expect(out[0].crowdLevel).toBe(null);
  });

  it('skips venues without coords (clusterByGrid drops them)', async () => {
    nearestStub.mockResolvedValue(cellMed);
    const venues = [
      { name: 'No-coords' },
      { name: 'With-coords', lat: 1.284, lng: 103.851 }
    ];
    await cs.attachCrowdSignals(venues);
    expect(venues[0].crowdLevel).toBeUndefined();
    expect(venues[1].crowdLevel).toBe('medium');
  });
});

// Restore the real nearest so any subsequent test file that requires
// carpark.js sees the original.
afterAll(() => { carpark.nearest = originalNearest; });
