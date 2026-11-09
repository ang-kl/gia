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
  it('caps a Putrajaya-catchment pin at 15 km, not the KL 45 km (12-06 regression)', () => {
    // ⚠ THIS COORDINATE IS SYNTHETIC, AND THAT IS THE POINT.
    //
    // It used to be the exact `[set-location]` pin copied out of
    // log/logs.1781315803421.json — a real person's position, at 4 decimal
    // places (~11 m), in a PUBLIC repository. R-4 scrubbed those coordinates
    // from log/, and this file was a SECOND, HAND-KEPT COPY of the same datum:
    // deleting the assertion would have dropped a real regression guard, and
    // leaving it would have republished the pin the scrub had just removed.
    // Same shape as the duplicate locale table and the Michelin cache key —
    // one datum, several call sites, only some of them asked.
    //
    // So the pin is replaced by a point DERIVED FROM THIS REPO'S OWN TABLE:
    // CITY_CENTROIDS['Putrajaya'] (2.931557, 101.670541 — "Putrajaya Sentral",
    // a public transport hub) offset ~4 km. The offset matters: the centroid
    // itself resolves to Putrajaya trivially, while a point 4.0 km from it and
    // 20.4 km from Kuala Lumpur actually exercises the nearest-city fallback
    // that the 12-06 regression broke. Both distances measured, not assumed.
    //
    // ⚠ IT IS COMPUTED HERE, NOT TYPED — AND THAT STILL DOES NOT CATCH EVERYTHING.
    // Measured, not assumed: a mutation restoring the logged pin SURVIVES both this
    // test and the tree-wide location scan in repo-security-posture.test.js. The
    // scan is keyed on a `[set-location]` marker and this file no longer carries
    // one; and no assertion here can separate the two points, because BOTH are
    // geometrically valid Putrajaya-catchment pins — ~3.5 km and ~4.0 km from the
    // centroid, both ~20 km from KL, both resolving to 15000. The difference is
    // PROVENANCE, and provenance is not in the numbers.
    //
    // So this is a limit, stated rather than papered over: deriving the point means
    // no real pin is NEEDED here and the intent is on the record, but a person who
    // types one back in is caught by review, not by a test. Inventing a check that
    // appeared to cover it would be worse than naming the gap.
    const pj = CITY_CENTROIDS['Putrajaya'];
    const lat = +(pj.lat + 0.02).toFixed(4);
    const lng = +(pj.lng + 0.03).toFixed(4);
    expect(psv.nearestCityRadiusM(lat, lng)).toBe(15000);
    // the offset is real distance, not decoration: far enough to exercise the
    // fallback, near enough to stay in Putrajaya's catchment rather than KL's.
    const km = (a, b, c, d) => {
      const R = 6371, r = (x) => (x * Math.PI) / 180;
      const s1 = Math.sin(r(c - a) / 2) ** 2
        + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(s1));
    };
    expect(km(lat, lng, pj.lat, pj.lng)).toBeGreaterThan(2);
    expect(km(lat, lng, CITY_CENTROIDS['Kuala Lumpur'].lat, CITY_CENTROIDS['Kuala Lumpur'].lng))
      .toBeGreaterThan(15);
  });
  it('returns null for invalid coords', () => {
    expect(psv.nearestCityRadiusM(NaN, NaN)).toBe(null);
  });
});
