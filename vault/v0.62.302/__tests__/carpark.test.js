// __tests__/carpark.test.js — v0.61.158
//
// Unit tests for the v0.61.158 carpark.nearestPlaces + nearestForMode
// dispatcher. The LTA `nearest` path is not exercised here (it
// requires LTA_ACCOUNT_KEY + network); we mock the Places HTTP call
// via axios.post override and verify the dispatch + response shape.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Mock axios.post BEFORE requiring carpark.js. carpark.js imports
// axios at the top; we replace .post per test via the captured ref.
const axios = require('axios');
const carpark = require('../carpark');

describe('carpark.nearestPlaces', () => {
  let originalPost;
  beforeEach(() => { originalPost = axios.post; process.env.GOOGLE_MAPS_API_KEY = 'test-key'; });
  afterEach(() => { axios.post = originalPost; });

  it('returns [] when GOOGLE_MAPS_API_KEY is missing', async () => {
    delete process.env.GOOGLE_MAPS_API_KEY;
    const out = await carpark.nearestPlaces(1.28, 103.85, 5, 5000);
    expect(out).toEqual([]);
  });

  it('returns [] for non-finite coords', async () => {
    expect(await carpark.nearestPlaces(NaN, 103, 5)).toEqual([]);
    expect(await carpark.nearestPlaces(1, undefined, 5)).toEqual([]);
  });

  it('maps the Places response to the {nearest}-shape', async () => {
    axios.post = async () => ({
      data: {
        places: [
          { id: 'p1', displayName: { text: 'Marina Square Carpark' }, location: { latitude: 1.2900, longitude: 103.8580 } },
          { id: 'p2', displayName: { text: 'Suntec City Carpark' }, location: { latitude: 1.2950, longitude: 103.8590 } }
        ]
      }
    });
    const out = await carpark.nearestPlaces(1.2843, 103.8519, 2, 5000);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({
      development: 'Marina Square Carpark',
      agency: 'Places',
      availableLots: null,
      lotType: ''
    });
    expect(Number.isInteger(out[0].distanceM)).toBe(true);
    expect(out[0].distanceM).toBeGreaterThan(0);
  });

  it('returns [] when Places returns 0 places', async () => {
    axios.post = async () => ({ data: { places: [] } });
    expect(await carpark.nearestPlaces(1.28, 103.85, 5, 5000)).toEqual([]);
  });

  it('returns [] when Places throws (network / quota)', async () => {
    axios.post = async () => { throw new Error('quota exhausted'); };
    expect(await carpark.nearestPlaces(1.28, 103.85, 5, 5000)).toEqual([]);
  });

  it('respects count + sorts by distance ascending', async () => {
    axios.post = async () => ({
      data: {
        places: [
          { id: 'a', displayName: { text: 'Far' }, location: { latitude: 1.40, longitude: 103.85 } },
          { id: 'b', displayName: { text: 'Near' }, location: { latitude: 1.29, longitude: 103.85 } },
          { id: 'c', displayName: { text: 'Mid' }, location: { latitude: 1.32, longitude: 103.85 } }
        ]
      }
    });
    const out = await carpark.nearestPlaces(1.2843, 103.8519, 2, 5000);
    expect(out).toHaveLength(2);
    expect(out[0].development).toBe('Near');
    expect(out[1].development).toBe('Mid');
    expect(out[0].distanceM).toBeLessThan(out[1].distanceM);
  });

  it('clamps count to [1, 20] in the request body', async () => {
    let captured = null;
    axios.post = async (url, body) => { captured = body; return { data: { places: [] } }; };
    await carpark.nearestPlaces(1.28, 103.85, 100, 5000);
    expect(captured.maxResultCount).toBe(20);
    // count=0 (or any falsy) falls back to the default of 5 per
    // `Number(count) || 5` in the body builder.
    await carpark.nearestPlaces(1.28, 103.85, 0, 5000);
    expect(captured.maxResultCount).toBe(5);
  });

  it('passes lat/lng + radius into the Places body', async () => {
    let captured = null;
    axios.post = async (url, body) => { captured = body; return { data: { places: [] } }; };
    await carpark.nearestPlaces(1.28, 103.85, 5, 5000);
    expect(captured.locationRestriction.circle.center).toMatchObject({ latitude: 1.28, longitude: 103.85 });
    expect(captured.locationRestriction.circle.radius).toBe(5000);
    expect(captured.includedTypes).toEqual(['parking']);
  });

  it('drops Places hits with non-finite location coords', async () => {
    axios.post = async () => ({
      data: {
        places: [
          { id: 'bad', displayName: { text: 'X' }, location: { latitude: null, longitude: 103 } },
          { id: 'good', displayName: { text: 'Y' }, location: { latitude: 1.29, longitude: 103.85 } }
        ]
      }
    });
    const out = await carpark.nearestPlaces(1.28, 103.85, 5, 5000);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('good');
  });
});

describe('carpark.nearestForMode (dispatcher)', () => {
  let originalPost;
  beforeEach(() => { originalPost = axios.post; process.env.GOOGLE_MAPS_API_KEY = 'test-key'; });
  afterEach(() => { axios.post = originalPost; });

  it('SG mode falls through to nearest() (LTA path)', async () => {
    let postCalled = 0;
    axios.post = async () => { postCalled++; return { data: { places: [] } }; };
    // Without LTA_ACCOUNT_KEY, nearest() throws; the dispatcher
    // surfaces the error rather than swallowing it (the existing
    // SG behaviour). Validate that the Places path was NOT chosen.
    try {
      await carpark.nearestForMode('SG', 1.28, 103.85, 5);
    } catch { /* expected */ }
    expect(postCalled).toBe(0);
  });

  it('JB mode calls Places (5 km default radius)', async () => {
    let captured = null;
    axios.post = async (url, body) => { captured = body; return { data: { places: [] } }; };
    await carpark.nearestForMode('JB', 1.49, 103.74, 5);
    expect(captured.locationRestriction.circle.radius).toBe(5000);
  });

  it('OTHER mode calls Places', async () => {
    let posted = 0;
    axios.post = async () => { posted++; return { data: { places: [{ id: 'x', displayName: { text: 'P' }, location: { latitude: 2.97, longitude: 101.7 } }] } }; };
    const out = await carpark.nearestForMode('OTHER', 2.97, 101.7, 5);
    expect(posted).toBe(1);
    expect(out).toHaveLength(1);
    expect(out[0].agency).toBe('Places');
  });

  it('null / undefined / unknown mode defaults to SG (LTA path)', async () => {
    let posted = 0;
    axios.post = async () => { posted++; return { data: { places: [] } }; };
    try { await carpark.nearestForMode(null, 1.28, 103.85, 5); } catch { /* no LTA */ }
    try { await carpark.nearestForMode('WAKANDA', 1.28, 103.85, 5); } catch { /* no LTA */ }
    expect(posted).toBe(0);
  });

  it('respects opts.radiusM override for non-SG modes', async () => {
    let captured = null;
    axios.post = async (url, body) => { captured = body; return { data: { places: [] } }; };
    await carpark.nearestForMode('JB', 1.49, 103.74, 5, { radiusM: 10000 });
    expect(captured.locationRestriction.circle.radius).toBe(10000);
  });
});
