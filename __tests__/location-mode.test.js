// __tests__/location-mode.test.js — v0.61.155
//
// Unit tests for the location-mode classifier (PR 1 of 5 in the
// 10-rule location-classification phased build). Covers the
// coarse-gate haversine, the country/admin-area mapping, and the
// orchestrator's gate-fail / geocode-fail / SG / JB / OTHER paths.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  SG_CENTROID,
  COARSE_GATE_M,
  haversineMeters,
  coarseGate,
  classifyByCountry,
  classifyLocation
} = require('../location-mode');

// Well-known anchors used across the cases. Coordinates are the
// standard "city centre" pins; small drift (a block or two) doesn't
// change the classification.
const ANCHORS = {
  sgCentroid:     SG_CENTROID,
  sgRafflesPlace: { lat: 1.2843, lng: 103.8519 },
  sgChangi:       { lat: 1.3644, lng: 103.9915 },
  jbCBD:          { lat: 1.4927, lng: 103.7414 },
  batam:          { lat: 1.0810, lng: 104.0305 },     // Indonesia, ~30 km SE of SG
  bintan:         { lat: 1.1542, lng: 104.4170 },     // Indonesia, ~80 km E of SG
  ioiPutrajaya:   { lat: 2.9742, lng: 101.7060 },     // Malaysia, ~330 km N of SG
  kualaLumpur:    { lat: 3.1390, lng: 101.6869 },     // Malaysia, ~330 km N of SG
  bangkok:        { lat: 13.7563, lng: 100.5018 },    // Thailand, ~1400 km N
  hongKong:       { lat: 22.3193, lng: 114.1694 }     // ~2570 km N
};

describe('haversineMeters', () => {
  it('returns 0 for identical points', () => {
    expect(haversineMeters(ANCHORS.sgCentroid, ANCHORS.sgCentroid)).toBe(0);
  });
  it('matches the SG→JB CBD known distance (≈ 18 km — SG centroid is Bishan, not Raffles)', () => {
    const d = haversineMeters(ANCHORS.sgCentroid, ANCHORS.jbCBD);
    expect(d).toBeGreaterThan(15000);
    expect(d).toBeLessThan(25000);
  });
  it('matches the SG→Putrajaya known distance (≈ 290-330 km)', () => {
    const d = haversineMeters(ANCHORS.sgCentroid, ANCHORS.ioiPutrajaya);
    expect(d).toBeGreaterThan(280000);
    expect(d).toBeLessThan(350000);
  });
  it('returns +Infinity for malformed input', () => {
    expect(haversineMeters(null, ANCHORS.sgCentroid)).toBe(Number.POSITIVE_INFINITY);
    expect(haversineMeters({ lat: 'x', lng: 0 }, ANCHORS.sgCentroid)).toBe(Number.POSITIVE_INFINITY);
    expect(haversineMeters(ANCHORS.sgCentroid, { lat: 0 })).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('coarseGate (120 km from SG centroid)', () => {
  it('passes SG centroid + Raffles Place + Changi', () => {
    expect(coarseGate(ANCHORS.sgCentroid)).toBe(true);
    expect(coarseGate(ANCHORS.sgRafflesPlace)).toBe(true);
    expect(coarseGate(ANCHORS.sgChangi)).toBe(true);
  });
  it('passes JB CBD (≈ 26 km)', () => {
    expect(coarseGate(ANCHORS.jbCBD)).toBe(true);
  });
  it('passes Batam + Bintan (Indonesian islands inside the gate)', () => {
    expect(coarseGate(ANCHORS.batam)).toBe(true);
    expect(coarseGate(ANCHORS.bintan)).toBe(true);
  });
  it('fails Putrajaya / KL (≈ 330 km)', () => {
    expect(coarseGate(ANCHORS.ioiPutrajaya)).toBe(false);
    expect(coarseGate(ANCHORS.kualaLumpur)).toBe(false);
  });
  it('fails Bangkok / Hong Kong (≈ 1400 / 2570 km)', () => {
    expect(coarseGate(ANCHORS.bangkok)).toBe(false);
    expect(coarseGate(ANCHORS.hongKong)).toBe(false);
  });
  it('returns false for non-finite input', () => {
    expect(coarseGate({ lat: NaN, lng: 103 })).toBe(false);
    expect(coarseGate({})).toBe(false);
    expect(coarseGate(null)).toBe(false);
  });
  it('respects an explicit radiusM override (JB CBD ≈ 18 km from SG centroid)', () => {
    expect(coarseGate({ ...ANCHORS.jbCBD, radiusM: 25000 })).toBe(true);
    expect(coarseGate({ ...ANCHORS.jbCBD, radiusM: 15000 })).toBe(false);
  });
});

describe('classifyByCountry (pure mapping)', () => {
  it('Singapore → SG', () => {
    expect(classifyByCountry({ country: 'Singapore' })).toBe('SG');
    expect(classifyByCountry({ country: 'singapore' })).toBe('SG');
    expect(classifyByCountry({ country: '  Singapore  ' })).toBe('SG');
  });
  it('Malaysia + Johor admin → JB', () => {
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: 'Johor' })).toBe('JB');
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: 'johor' })).toBe('JB');
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: "Johor Darul Ta'zim" })).toBe('JB');
  });
  it('Malaysia + non-Johor admin → OTHER (Selangor / Putrajaya / KL)', () => {
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: 'Selangor' })).toBe('OTHER');
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: 'Wilayah Persekutuan Putrajaya' })).toBe('OTHER');
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: 'Kuala Lumpur' })).toBe('OTHER');
  });
  it('Malaysia + no adminAreaLevel1 → OTHER (conservative)', () => {
    expect(classifyByCountry({ country: 'Malaysia' })).toBe('OTHER');
    expect(classifyByCountry({ country: 'Malaysia', adminAreaLevel1: '' })).toBe('OTHER');
  });
  it('Indonesia / Thailand / HK / unknown → OTHER', () => {
    expect(classifyByCountry({ country: 'Indonesia' })).toBe('OTHER');
    expect(classifyByCountry({ country: 'Thailand' })).toBe('OTHER');
    expect(classifyByCountry({ country: 'Hong Kong' })).toBe('OTHER');
    expect(classifyByCountry({ country: 'Atlantis' })).toBe('OTHER');
  });
  it('missing / empty country → OTHER', () => {
    expect(classifyByCountry({})).toBe('OTHER');
    expect(classifyByCountry({ country: '' })).toBe('OTHER');
    expect(classifyByCountry({ country: '   ' })).toBe('OTHER');
    expect(classifyByCountry({ country: null })).toBe('OTHER');
    expect(classifyByCountry({ country: 42 })).toBe('OTHER');
    expect(classifyByCountry()).toBe('OTHER');
  });
});

describe('classifyLocation (orchestrator)', () => {
  const sgGeo = async () => ({ country: 'Singapore', adminAreaLevel1: 'Central Region', placeName: 'Raffles Place' });
  const jbGeo = async () => ({ country: 'Malaysia',  adminAreaLevel1: 'Johor',         placeName: 'Johor Bahru' });
  const otherGeo = async () => ({ country: 'Indonesia', adminAreaLevel1: 'Kepulauan Riau', placeName: 'Batam' });

  it('gate-skips Putrajaya / KL — no geocode call, mode=OTHER, gated=true', async () => {
    let calls = 0;
    const out = await classifyLocation({
      ...ANCHORS.ioiPutrajaya,
      reverseGeocodeFn: async () => { calls++; return otherGeo(); }
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
    expect(out.geocoded).toBe(false);
    expect(out.distanceM).toBeGreaterThan(280000);
    expect(calls).toBe(0);
  });
  it('passes SG fix through geocode → SG', async () => {
    const out = await classifyLocation({
      ...ANCHORS.sgRafflesPlace,
      reverseGeocodeFn: sgGeo
    });
    expect(out.mode).toBe('SG');
    expect(out.country).toBe('Singapore');
    expect(out.placeName).toBe('Raffles Place');
    expect(out.gated).toBe(false);
    expect(out.geocoded).toBe(true);
  });
  it('passes JB fix through geocode → JB', async () => {
    const out = await classifyLocation({
      ...ANCHORS.jbCBD,
      reverseGeocodeFn: jbGeo
    });
    expect(out.mode).toBe('JB');
    expect(out.country).toBe('Malaysia');
    expect(out.adminAreaLevel1).toBe('Johor');
  });
  it('passes Batam (within gate) → OTHER via geocode', async () => {
    const out = await classifyLocation({
      ...ANCHORS.batam,
      reverseGeocodeFn: otherGeo
    });
    expect(out.mode).toBe('OTHER');
    expect(out.country).toBe('Indonesia');
    expect(out.gated).toBe(false);
    expect(out.geocoded).toBe(true);
  });
  it('geocode throws → conservative OTHER, geocoded=false', async () => {
    const out = await classifyLocation({
      ...ANCHORS.sgRafflesPlace,
      reverseGeocodeFn: async () => { throw new Error('quota'); }
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(false);
    expect(out.geocoded).toBe(false);
  });
  it('no reverseGeocodeFn supplied → OTHER (within gate, no geocode)', async () => {
    const out = await classifyLocation({ ...ANCHORS.sgRafflesPlace });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(false);
    expect(out.geocoded).toBe(false);
  });
  it('non-finite lat/lng → OTHER + gated=true (defensive)', async () => {
    const out = await classifyLocation({ lat: NaN, lng: 103, reverseGeocodeFn: sgGeo });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
  });
  it('honours an explicit radiusM (tighter 15 km gate excludes JB)', async () => {
    let calls = 0;
    const out = await classifyLocation({
      ...ANCHORS.jbCBD,
      radiusM: 15000,
      reverseGeocodeFn: async () => { calls++; return jbGeo(); }
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
    expect(calls).toBe(0);
  });
});
