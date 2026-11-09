// __tests__/pcn-data.test.js — v0.62.956.
//
// Spec: doc/Feature/2026-10-30-park-connector-layer.spec.md (I1, I2, I3).
//
// The Park Connector layer draws two data.gov.sg datasets, and nothing else: NParks' Park Connector Loop and URA's
// Master Plan 2025 park connector lines. NParks' own PCN site is not a source; its terms forbid copying without written
// consent. These tests pin the raw files to the 29-10 '26 downloads, prove the served file is built from them by
// RUNNING the builder rather than reading its output, and keep the 390 KB payload off the overlay route that every map
// fetches on open.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p));
const sha = (p) => crypto.createHash('sha256').update(read(p)).digest('hex');

const NPARKS = 'geoloc/NParksParkConnectorLoop.geojson';
const URA = 'geoloc/MasterPlan2025SDCPParkConnectorLine.geojson';
const OUT = 'data/geo-pcn.json';

const raw = (p) => JSON.parse(read(p).toString('utf8'));
const out = () => JSON.parse(read(OUT).toString('utf8'));
const LOOPS = ['Eastern Coastal Loop', 'Northern Explorer Loop', 'Western Adventure Loop', 'Central Urban Loop',
  'North Eastern Riverine Loop', 'Southern Ridges Loop'];

describe('I1 — the two raw files are the 29-10 downloads, unedited', () => {
  it('NParks Park Connector Loop (d_a69ef89737379f231d2ae93fd1c5707f)', () => {
    expect(sha(NPARKS)).toBe('83c1838bea9ee355d2ba52c2060eb185612dd0e2e3fdb113aff9cdd6e5c27efd');
  });
  it('URA Master Plan 2025 SDCP Park Connector Line (d_cebde179d5cd6b85be36d618c8fe3b85)', () => {
    expect(sha(URA)).toBe('a5f050e7ff2714aaf1a1531888ac549d087a8b4f7c708fda0af4f8d310292fc8');
  });
});

describe('I2 — geo-pcn.json is built from those two files and nothing else', () => {
  it('running the builder on the raw files reproduces the committed file, apart from _meta', () => {
    const { build } = require('../scripts/build-pcn.js');
    const fresh = build(raw(NPARKS), raw(URA));
    const committed = out();
    delete fresh._meta;
    delete committed._meta;
    expect(fresh).toEqual(committed);
  });

  it('6 NParks loops, then Round Island Route and Rail Corridor: 8 named routes', () => {
    const d = out();
    expect(d.routes.map((r) => r.name)).toEqual([...LOOPS, 'Round Island Route', 'Rail Corridor']);
    for (const r of d.routes.slice(0, 6)) expect(r.src).toBe('NParks');
    for (const r of d.routes.slice(6)) expect(r.src).toBe('URA');
  });

  it('C2 — the 8 "Urban Central Loop" segments are folded into Central Urban Loop, never a seventh loop', () => {
    const d = out();
    expect(d.routes.some((r) => r.name === 'Urban Central Loop')).toBe(false);
    const cul = d.routes.find((r) => r.name === 'Central Urban Loop');
    expect(cul.features).toBe(188 + 8);
    expect(cul.segs.some((s) => s.park === 'Adam PC')).toBe(true);
  });

  it('every source feature is accounted for: 878 NParks segments, 1,589 URA lines', () => {
    const d = out();
    const n = raw(NPARKS).features;
    const u = raw(URA).features;
    expect(n.length).toBe(878);
    expect(u.length).toBe(1589);
    const byRoute = Object.fromEntries(d.routes.map((r) => [r.name, r.features]));
    expect(LOOPS.reduce((s, l) => s + byRoute[l], 0)).toBe(878);
    expect(byRoute['Round Island Route']).toBe(264);
    expect(byRoute['Rail Corridor']).toBe(36);
    expect(d.otherFeatures).toBe(1289);
    expect(d._meta.sourceFeatures).toEqual({ nparks: 878, ura: 1589 });
  });

  it('every NParks segment keeps its park name; coordinates are rounded to 5 dp and lie in Singapore', () => {
    const d = out();
    const lines = [...d.routes.flatMap((r) => r.segs.map((s) => s.pts)), ...d.other];
    expect(lines.length).toBeGreaterThan(2000);
    for (const r of d.routes.slice(0, 6)) for (const s of r.segs) expect(typeof s.park).toBe('string');
    for (const pts of lines) {
      expect(pts.length).toBeGreaterThanOrEqual(2);
      for (const [lng, lat] of pts) {
        expect(lng).toBeGreaterThan(103.5); expect(lng).toBeLessThan(104.2);
        expect(lat).toBeGreaterThan(1.1); expect(lat).toBeLessThan(1.5);
        expect(Math.round(lng * 1e5) / 1e5).toBe(lng);
        expect(Math.round(lat * 1e5) / 1e5).toBe(lat);
      }
    }
  });

  it('the served file is at most 450 KB', () => {
    expect(read(OUT).length).toBeLessThanOrEqual(450 * 1024);
  });

  it('_meta names both datasets and their licence', () => {
    const m = out()._meta;
    expect(m.sources.map((s) => s.id)).toEqual(['d_a69ef89737379f231d2ae93fd1c5707f', 'd_cebde179d5cd6b85be36d618c8fe3b85']);
    expect(m.licence).toMatch(/Singapore Open Data Licence/);
  });
});

describe('I3 — the connector data has its own route and stays off /api/geo/overlays', () => {
  const src = read('index.js').toString('utf8');
  it('GET /api/geo/pcn serves data/geo-pcn.json', () => {
    const at = src.indexOf("app.get('/api/geo/pcn'");
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 900)).toMatch(/geo-pcn\.json/);
  });
  it('the overlays bundle never reads geo-pcn.json', () => {
    const start = src.indexOf('geoOverlaysCache = {');
    const end = src.indexOf('};', start);
    expect(start).toBeGreaterThan(-1);
    expect(src.slice(start, end)).not.toMatch(/pcn/i);
  });
});
