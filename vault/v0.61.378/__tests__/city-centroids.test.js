import { describe, it, expect } from 'vitest';
import psv from '../place-search-variance.js';
const { CITY_CENTROIDS } = require('../city-centroids.js');

describe('city-centroids table', () => {
  it('holds the full geocoded centroid set (139 cities)', () => {
    expect(Object.keys(CITY_CENTROIDS).length).toBe(139);
  });
  it('every centroid has finite lat/lng + the rich schema', () => {
    for (const [city, c] of Object.entries(CITY_CENTROIDS)) {
      expect(Number.isFinite(c.lat), city).toBe(true);
      expect(Number.isFinite(c.lng), city).toBe(true);
      expect(typeof c.country).toBe('string');
      expect(typeof c.label).toBe('string');
      expect(Number.isFinite(c.radiusM)).toBe(true);
      expect(c.source).toBe('geocode:places-api');
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
