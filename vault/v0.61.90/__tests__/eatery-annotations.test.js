// __tests__/eatery-annotations.test.js — v0.62.0
//
// Tests for the v0.62.0 eatery-result annotations:
//   - healthier-eateries.js — HPB Healthier Choice name+proximity match.
//   - buildings.js          — "inside a building complex" point-in-polygon.
// Both load the committed data/*.json built by build-geo-overlays.js.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const healthier = require('../healthier-eateries.js');
const buildings = require('../buildings.js');

const HPB = JSON.parse(readFileSync(new URL('../data/healthier-eateries.json', import.meta.url)));
const BLD = JSON.parse(readFileSync(new URL('../data/buildings.json', import.meta.url)));

describe('healthier-eateries — Healthier Choice matching', () => {
  it('matches a listed HPB partner at its own coordinates', () => {
    const e = HPB.features[0];
    expect(healthier.isHealthierChoice({ name: e.name, lat: e.lat, lng: e.lng })).toBe(true);
  });

  it('rejects the same name when it is far from any HPB entry (proximity gate)', () => {
    const e = HPB.features[0];
    // ~1.1 km north — outside the ~150 m proximity window.
    expect(healthier.isHealthierChoice({ name: e.name, lat: e.lat + 0.01, lng: e.lng })).toBe(false);
  });

  it('rejects an unknown eatery name', () => {
    expect(healthier.isHealthierChoice({ name: 'Totally Made Up Eatery XYZ', lat: 1.3, lng: 103.8 })).toBe(false);
  });

  it('annotateVenueObject sets venue.healthierChoice', () => {
    const e = HPB.features[0];
    const v = { name: e.name, lat: e.lat, lng: e.lng };
    healthier.annotateVenueObject(v);
    expect(v.healthierChoice).toBe(true);
  });
});

describe('buildings — inside-a-building detection', () => {
  it('detects a point inside a building footprint', () => {
    let hit = false;
    for (const b of BLD.features) {
      const ring = b.rings[0];
      let sx = 0, sy = 0;
      for (const [x, y] of ring) { sx += x; sy += y; }
      const lng = sx / ring.length, lat = sy / ring.length;
      if (buildings.buildingAt(lat, lng)) { hit = true; break; }
    }
    expect(hit).toBe(true);
  });

  it('returns null well outside any footprint', () => {
    expect(buildings.buildingAt(0, 0)).toBeNull();
  });

  it('annotateVenueObject sets venue.insideBuilding to a boolean', () => {
    const v = { name: 'x', lat: 0, lng: 0 };
    buildings.annotateVenueObject(v);
    expect(v.insideBuilding).toBe(false);
  });
});
