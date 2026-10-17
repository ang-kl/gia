import { describe, it, expect } from 'vitest';
import psv from '../place-search-variance.js';
const { CITY_CENTROIDS } = require('../city-centroids.js');

describe('city-centroids table', () => {
  it('holds the full geocoded centroid set (152 cities)', () => {
    expect(Object.keys(CITY_CENTROIDS).length).toBe(152);
  });
  it('every centroid has finite lat/lng + the rich schema', () => {
    for (const [city, c] of Object.entries(CITY_CENTROIDS)) {
      expect(Number.isFinite(c.lat), city).toBe(true);
      expect(Number.isFinite(c.lng), city).toBe(true);
      expect(typeof c.country).toBe('string');
      expect(typeof c.label).toBe('string');
      expect(Number.isFinite(c.radiusM)).toBe(true);
      // v0.62.x — allow hand-curated grounded centroids ('manual') alongside the
      // geocoded set (e.g. Sunshine Coast added from known Maroochydore coords).
      expect(['geocode:places-api', 'manual', 'manual:city-centre']).toContain(c.source);
    }
  });
  it('includes LA/KH/MM in the table (centroid layer, not the picker)', () => {
    expect(CITY_CENTROIDS['Vientiane']?.country).toBe('LA');
    expect(CITY_CENTROIDS['Phnom Penh']?.country).toBe('KH');
    expect(CITY_CENTROIDS['Yangon']?.country).toBe('MM');
  });
  it('carries local-script labels for CJK cities', () => {
    expect(CITY_CENTROIDS['Seoul'].labelLocal).toBe('서울역');
    expect(CITY_CENTROIDS['Kyoto'].labelLocal).toBe('京都駅');
  });
});

describe('nearestCityForAnchor with the new table', () => {
  it('resolves a Seoul anchor to Seoul', () => {
    const n = psv.nearestCityForAnchor(37.5559, 126.9723);
    expect(n.city).toBe('Seoul'); expect(n.distanceKm).toBeLessThan(1);
  });
  it('resolves a Kyoto anchor to Kyoto (newly covered)', () => {
    const n = psv.nearestCityForAnchor(34.9858, 135.7588);
    expect(n.city).toBe('Kyoto'); expect(n.distanceKm).toBeLessThan(2);
  });
});

describe('density-tiered radiusM (v0.61.441)', () => {
  it('Tight satellites cap at 15 km (Putrajaya / Cyberjaya — Klang Valley south cluster)', () => {
    for (const city of ['Putrajaya', 'Cyberjaya']) {
      expect(CITY_CENTROIDS[city].radiusM, city).toBe(15000);
    }
  });
  it('Dense cores cap at 30 km (SG / JB / Iskandar / Batam)', () => {
    for (const city of ['Singapore', 'Johor Bahru', 'Iskandar Puteri', 'Batam']) {
      expect(CITY_CENTROIDS[city].radiusM, city).toBe(30000);
    }
  });
  it('Sparse / island / resort towns cap at 60 km', () => {
    for (const city of ['Kuching', 'Kota Kinabalu', 'Labuan', 'Koh Samui', 'Phu Quoc', 'Jeju', 'Queenstown']) {
      expect(CITY_CENTROIDS[city].radiusM, city).toBe(60000);
    }
  });
  it('Major metros default to 45 km', () => {
    for (const city of ['Kuala Lumpur', 'Bangkok', 'Jakarta', 'Seoul', 'Tokyo', 'Taipei', 'George Town']) {
      expect(CITY_CENTROIDS[city].radiusM, city).toBe(45000);
    }
  });
  it('no city keeps the old flat 40 km', () => {
    for (const c of Object.values(CITY_CENTROIDS)) {
      expect([15000, 30000, 45000, 60000]).toContain(c.radiusM);
    }
  });
});

describe('nearestCityRadiusM', () => {
  it('returns the nearest curated city\'s density-tuned ceiling', () => {
    expect(psv.nearestCityRadiusM(1.293, 103.852)).toBe(30000);   // Singapore → Dense
    expect(psv.nearestCityRadiusM(3.134, 101.686)).toBe(45000);   // KL → Major
    expect(psv.nearestCityRadiusM(1.4817, 110.3323)).toBe(60000); // Kuching → Sparse
  });
  it('caps the logged Putrajaya drift pin at 15 km, not the KL 45 km (12-06 regression)', () => {
    // The exact set-location from log/logs.1781315803421.json (chat 100000001):
    // a Putrajaya pin that previously fell back to the 45 km city-default and
    // spilled venues toward central KL / Petaling Jaya.
    expect(psv.nearestCityRadiusM(2.96957, 101.71218)).toBe(15000);
  });
  it('returns null for invalid coords', () => {
    expect(psv.nearestCityRadiusM(NaN, NaN)).toBe(null);
  });
});
