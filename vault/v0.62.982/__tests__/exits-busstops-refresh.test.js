// __tests__/exits-busstops-refresh.test.js — v0.62.950.
//
// Spec: doc/Feature/2026-10-29-exits-and-bus-stops-refresh.spec.md (I1-I4).
//
// LTA's MRT Station Exit (d_b39d3a0871985372d7e1637193335da5, updated 18-10 '26) and Bus Stop
// (d_3f172c6feb3f4f92a2f47d93eed2908a, updated 06-10 '26) datasets, downloaded 29-10 '26. Measured before the
// refresh: no exit moved, but Hume's two exits sat under a junk station key `Dt4`; 206 bus stops were added and
// 149 removed, and 23 stops this app named as a station's nearest no longer exist upstream.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { createHash } from 'crypto';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p));
const json = (p) => JSON.parse(read(p).toString('utf8'));
const sha = (p) => createHash('sha256').update(read(p)).digest('hex');

describe('I1 — the geoloc files are the 29-10 downloads, unedited', () => {
  it('station exits', () => {
    expect(sha('geoloc/LTAMRTStationExitGEOJSON.geojson')).toBe('7a57cb14cf7c621203938e944f99b41891284e5e67876c43d9f8f3ee3aa88ee6');
  });
  it('bus stops', () => {
    expect(sha('geoloc/LTABusStop.geojson')).toBe('ea16db2e53038b2b3352b57cb008e484c253091367b45bc3564b6cc3fe8d491b');
  });
});

describe('I2 — the unrelated overlays keep what other scripts added to them', () => {
  it('clinics keep their opening hours (a full overlay rebuild drops them)', () => {
    const clinics = json('data/geo-clinics.json').features;
    expect(clinics.filter((f) => f.hours).length).toBeGreaterThanOrEqual(1000);
  });
});

describe('I3 — exits', () => {
  const stations = json('data/station-exits.json').stations;
  it('Hume has its two exits, and the junk key is gone', () => {
    expect(stations.Hume.map((e) => e.exit).sort()).toEqual(['Exit 1', 'Exit 2']);
    expect(stations.Dt4).toBeUndefined();
  });
  it('the relabelled stations read "Exit …"', () => {
    for (const s of ['Buangkok', 'Bugis', 'Cantonment', 'Keppel', 'Paya Lebar', 'Prince Edward Road', 'Punggol Coast', 'Tai Seng', 'Telok Ayer']) {
      for (const e of stations[s]) expect(e.exit, `${s} ${e.exit}`).toMatch(/^Exit /);
    }
  });
  // ⚠ Spec choice C2: Hume has no coordinate in data/mrt-coords.json, so the overlay builder tags each exit with the
  // NEAREST known station, which for Hume's two exits is Hillview (DT3). That was already so on main, under the junk
  // name "Dt4 · 1". The refresh fixes the NAME; the station tag stays wrong until Hume gets a coordinate (Register
  // R-9). Deliberately not pinned here: a test that pins a known defect hides it.
  it('the map overlay names Hume\'s two exits', () => {
    const names = json('data/geo-exits.json').features.map((f) => f.name);
    expect(names.filter((n) => /^Hume · /.test(n)).sort()).toEqual(['Hume · Exit 1', 'Hume · Exit 2']);
    expect(names.filter((n) => /^Dt4 /.test(n))).toEqual([]);
  });
});

describe('I4 — bus stops', () => {
  const codes = new Set(json('geoloc/LTABusStop.geojson').features.map((f) => f.properties.BUS_STOP_NUM));
  const near = json('data/stations_with_nearest_bus_stops.json');
  const list = Object.values(near.stations);
  it('the universe is the new file: 5,205 stops, no junk codes', () => {
    expect(codes.size).toBe(5205);
    expect([...codes].filter((c) => !/^\d{5}$/.test(c))).toEqual([]);
    expect(near._meta.busStopUniverse).toBe(5205);
    expect(json('data/bus-services-by-stop.json')._meta.stopCount).toBe(5205);
  });
  it('every nearest stop a station names exists in the new file', () => {
    const named = list.flatMap((s) => s.nearest_bus_stops.map((b) => b.bus_stop_code));
    expect(named.length).toBeGreaterThan(800);
    expect(named.filter((c) => !codes.has(c))).toEqual([]);
  });
  it('a stop LTA removed is no longer named; one it added is in the universe', () => {
    const named = new Set(list.flatMap((s) => s.nearest_bus_stops.map((b) => b.bus_stop_code)));
    expect(codes.has('02031')).toBe(false);
    expect(named.has('02031')).toBe(false);
    expect(codes.has('03361')).toBe(true);
  });
});
