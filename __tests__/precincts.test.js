// __tests__/precincts.test.js — v0.61.122

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const p = require('../precincts.js');

describe('precincts — STB loader', () => {
  it('loads 10 STB precincts from the geojson', () => {
    const stb = p.getStbPrecincts();
    expect(stb.length).toBe(10);
    for (const pr of stb) {
      expect(pr.id).toMatch(/^[a-z][a-z0-9-]*$/);
      expect(pr.region).toBe('SG');
      expect(pr.country).toBe('Singapore');
      expect(pr.source).toBe('STB');
      expect(typeof pr.lat).toBe('number');
      expect(typeof pr.lng).toBe('number');
      // SG bbox sanity
      expect(pr.lat).toBeGreaterThanOrEqual(1.15);
      expect(pr.lat).toBeLessThanOrEqual(1.50);
      expect(pr.lng).toBeGreaterThanOrEqual(103.6);
      expect(pr.lng).toBeLessThanOrEqual(104.1);
      // Polygon must be a non-empty ring
      expect(Array.isArray(pr.polygon)).toBe(true);
      expect(pr.polygon.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('includes the operator-curated precinct names', () => {
    const names = p.getStbPrecincts().map((x) => x.label);
    expect(names).toContain('Civic District');
    expect(names).toContain('Marina Bay');
    expect(names).toContain('Chinatown');
    expect(names).toContain('Orchard Road');
    expect(names).toContain('Sentosa Island');
    expect(names).toContain('Mandai and Kranji');
  });
});

describe('precincts — Malaysia anchors', () => {
  it('exposes JB + IOI Resort City Putrajaya with radius caps', () => {
    const my = p.getMalaysiaAnchors();
    expect(my.length).toBe(2);
    const jb = my.find((x) => x.id === 'jb');
    expect(jb).toBeTruthy();
    expect(jb.region).toBe('JB');
    expect(jb.radiusCapM).toBe(30000);
    expect(jb.country).toBe('Malaysia');
    const ioi = my.find((x) => x.id === 'ioi-resort-putrajaya');
    expect(ioi).toBeTruthy();
    expect(ioi.region).toBe('OTHER');         // v0.61.185 — was 'MY-PUT'
    expect(ioi.radiusCapM).toBe(20000);        // v0.61.185 — was 15000
    expect(ioi.country).toBe('Malaysia');
    // Putrajaya coordinate sanity (well outside SG bbox)
    expect(ioi.lat).toBeGreaterThan(2.5);
  });
});

describe('precincts — getAll + getById', () => {
  it('getAll returns 12 entries in display order (SG first, then MY)', () => {
    const all = p.getAll();
    expect(all.length).toBe(12);
    // First 10 SG, last 2 MY
    for (let i = 0; i < 10; i++) expect(all[i].region).toBe('SG');
    expect(all[10].region).toBe('JB');
    expect(all[11].region).toBe('OTHER');      // v0.61.185 — was 'MY-PUT'
  });

  it('getById finds existing ids and rejects unknowns', () => {
    expect(p.getById('marina-bay')?.label).toBe('Marina Bay');
    expect(p.getById('jb')?.region).toBe('JB');
    expect(p.getById('ioi-resort-putrajaya')?.radiusCapM).toBe(20000);   // v0.61.185 — was 15000
    expect(p.getById('not-a-real-precinct')).toBeNull();
    expect(p.getById('')).toBeNull();
    expect(p.getById(null)).toBeNull();
  });

  it('id is case-insensitive', () => {
    expect(p.getById('MARINA-BAY')?.label).toBe('Marina Bay');
  });
});

describe('precincts — pointInPolygon + containingPrecinct', () => {
  it('reports a centroid as inside its own polygon', () => {
    const civic = p.getById('civic-district');
    expect(p.pointInPolygon(civic.lat, civic.lng, civic.polygon)).toBe(true);
  });

  it('does NOT report a Marina Bay point as inside Civic District', () => {
    const civic = p.getById('civic-district');
    expect(p.pointInPolygon(1.279, 103.86, civic.polygon)).toBe(false);
  });

  it('containingPrecinct returns null for coords outside all STB polygons', () => {
    expect(p.containingPrecinct(1.0, 100.0)).toBeNull();
    expect(p.containingPrecinct(1.4927, 103.7414)).toBeNull(); // JB
  });

  it('containingPrecinct returns the STB precinct for an inside-point', () => {
    const m = p.containingPrecinct(1.279, 103.86);
    expect(m?.label).toBe('Marina Bay');
  });
});

describe('precincts — effectiveRadius', () => {
  it('returns requested when no cap', () => {
    expect(p.effectiveRadius({}, 50000)).toBe(50000);
    expect(p.effectiveRadius({ region: 'SG' }, 5000)).toBe(5000);
    expect(p.effectiveRadius(null, 50000)).toBe(50000);
  });

  it('clamps to the cap when smaller', () => {
    expect(p.effectiveRadius({ radiusCapM: 30000 }, 50000)).toBe(30000);
    expect(p.effectiveRadius({ radiusCapM: 15000 }, 50000)).toBe(15000);
  });

  it('returns the smaller of requested vs cap', () => {
    expect(p.effectiveRadius({ radiusCapM: 30000 }, 10000)).toBe(10000);
    expect(p.effectiveRadius({ radiusCapM: 15000 }, 12000)).toBe(12000);
  });
});
