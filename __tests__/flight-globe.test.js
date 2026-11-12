// flight-globe.test.js — v0.62.985. Spec: doc/Feature/2026-11-11-fr24-globe-arrival-tz.spec.md, I5, I6, I9.
//
// While a flight is selected, a 🌐 Globe chip beside 🍚 Hawker opens a small globe card of it: origin → destination on
// a great circle, flown part solid up to the plane, the rest dashed; tap it and it fills the screen, drag to turn.
// The geometry is pure (flight-globe.js), ported from hongjia's opener globe; the land is Natural Earth 1:110m.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import {
  globeAvailable, greatCircle, arcDeg, midpoint, flightPaths, project, pathD, decodeLand, globeScene, initialView, GLOBE_C, GLOBE_R,
} from '../web/transport/src/lib/flight-globe.js';
import { createFr24Layer } from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const ROOT = path.join(__dirname, '..');
const land = require('../web/transport/src/data/globe-land.json');
const fr24 = require('../fr24.js');

const SIN = fr24.airportPos('WSSS');
const PER = fr24.airportPos('YPPH');
const DXB = fr24.airportPos('OMDB');
const LHR = fr24.airportPos('EGLL');

describe('I5 — the great circle', () => {
  it('starts at the origin and ends at the destination', () => {
    const g = greatCircle(SIN, PER, 32);
    expect(g).toHaveLength(33);
    expect(g[0].lat).toBeCloseTo(SIN.lat, 6);
    expect(g[0].lng).toBeCloseTo(SIN.lng, 6);
    expect(g.at(-1).lat).toBeCloseTo(PER.lat, 6);
    expect(g.at(-1).lng).toBeCloseTo(PER.lng, 6);
  });
  it('Singapore-Perth: the midpoint is south-south-east, about 3,900 km along', () => {
    const m = midpoint(SIN, PER);
    // Worked independently in Python (the mean of the two unit vectors, renormalised): -15.374, 109.489; 3,911 km.
    expect(m.lat).toBeCloseTo(-15.374, 2);
    expect(m.lng).toBeCloseTo(109.489, 2);
    expect(arcDeg(SIN, PER) * 111.195).toBeGreaterThan(3850);
    expect(arcDeg(SIN, PER) * 111.195).toBeLessThan(3950);
  });
  it('Singapore-Dubai: the midpoint bows north of the straight lat/lng line, as a great circle does', () => {
    const m = midpoint(SIN, DXB);
    // Worked independently in Python, as above: 14.538, 80.977 (the plain average latitude is 13.3).
    expect(m.lat).toBeCloseTo(14.538, 2);
    expect(m.lng).toBeCloseTo(80.977, 2);
    expect(m.lat).toBeGreaterThan((SIN.lat + DXB.lat) / 2);
  });
  it('every point of the circle is equally far along from both ends in turn (no bend)', () => {
    const g = greatCircle(SIN, LHR, 20);
    const total = arcDeg(SIN, LHR);
    for (const p of g) expect(arcDeg(SIN, p) + arcDeg(p, LHR)).toBeCloseTo(total, 6);
  });
});

describe('I5 — flown and ahead split at the plane', () => {
  const plane = greatCircle(SIN, DXB, 10)[4];
  it('with the plane: flown ends there, ahead starts there', () => {
    const { flown, ahead } = flightPaths({ orig: SIN, dest: DXB, plane });
    expect(flown[0].lat).toBeCloseTo(SIN.lat, 6);
    expect(flown.at(-1).lat).toBeCloseTo(plane.lat, 6);
    expect(flown.at(-1).lng).toBeCloseTo(plane.lng, 6);
    expect(ahead[0].lat).toBeCloseTo(plane.lat, 6);
    expect(ahead.at(-1).lat).toBeCloseTo(DXB.lat, 6);
    expect(flown.length).toBeLessThan(ahead.length); // 4 of 10 flown
  });
  it('without the plane: landed is all flown, otherwise all ahead', () => {
    expect(flightPaths({ orig: SIN, dest: DXB, landed: true }).ahead).toEqual([]);
    expect(flightPaths({ orig: SIN, dest: DXB, landed: false }).flown).toEqual([]);
    expect(flightPaths({ orig: SIN, dest: null })).toEqual({ flown: [], ahead: [] });
  });
});

describe('I5 — the projection hides the far side', () => {
  const view = { lat: 0, lng: 100 };
  it('the view centre is the middle of the disc; a point 90° away is on the rim; beyond is hidden', () => {
    expect(project({ lat: 0, lng: 100 }, view)).toEqual([GLOBE_C, GLOBE_C]);
    const rim = project({ lat: 0, lng: 190 }, view);
    expect(rim[0]).toBeCloseTo(GLOBE_C + GLOBE_R, 6);
    expect(project({ lat: 0, lng: -80 }, view)).toBeNull();
    expect(project({ lat: 10, lng: -60 }, view)).toBeNull();
  });
  it('the path lifts the pen across the far side, so nothing is drawn through the Earth', () => {
    // All on the near side: one stroke.
    const d = pathD([{ lat: 0, lng: 100 }, { lat: 0, lng: 150 }, { lat: 0, lng: 170 }], view);
    expect((d.match(/M/g) || []).length).toBe(1);
    // Near, far, near: the pen lifts, so two strokes and no segment across the hidden point.
    const d2 = pathD([{ lat: 0, lng: 100 }, { lat: 0, lng: -80 }, { lat: 0, lng: 110 }], view);
    expect((d2.match(/M/g) || []).length).toBe(2);
    expect(d2).not.toMatch(/NaN/);
  });
  it('a flight opens facing its middle, so both airports are on the visible side', () => {
    const sel = { orig: { ...SIN, label: 'SIN' }, dest: { ...LHR, label: 'LHR' } };
    const v = initialView(sel);
    expect(project(SIN, v)).not.toBeNull();
    expect(project(LHR, v)).not.toBeNull();
    const scene = globeScene(decodeLand(land), sel, v);
    expect(scene.pins.map((p) => p.kind)).toEqual(['orig', 'dest']);
    expect(scene.ahead).toMatch(/^M/);
    expect(scene.coast.length).toBeGreaterThan(1000);
    expect(scene.dots.length).toBeGreaterThan(1000);
  });
});

describe('I9 — the land is Natural Earth, with its notice', () => {
  it('the licence travels with the data, and the built file names its source', () => {
    const lic = fs.readFileSync(path.join(ROOT, 'data/land-110m.LICENSE.txt'), 'utf8');
    expect(lic).toMatch(/world-atlas 2\.0\.2/);
    expect(lic).toMatch(/public domain/);
    expect(lic).toMatch(/ISC/);
    expect(land._meta.source).toMatch(/Natural Earth/);
    const src = fs.readFileSync(path.join(ROOT, 'scripts/build-globe-land.mjs'), 'utf8');
    expect(src).toMatch(/land-110m\.LICENSE\.txt/);
  });
  it('the decoded land is in range', () => {
    const L = decodeLand(land);
    expect(L.coast.length).toBe(land.c.length);
    expect(L.dots.length).toBe(land.d.length / 2);
    for (const s of L.coast) for (const p of s) { expect(Math.abs(p.lat)).toBeLessThanOrEqual(90); expect(Math.abs(p.lng)).toBeLessThanOrEqual(180.1); }
  });
  it('the built file is what the builder makes from the committed source', async () => {
    const { buildGlobeLand } = await import('../scripts/build-globe-land.mjs');
    const out = buildGlobeLand(JSON.parse(fs.readFileSync(path.join(ROOT, 'data/land-110m.json'), 'utf8')));
    expect(out.c).toEqual(land.c);
    expect(out.d).toEqual(land.d);
  });
});

// ── I6 — the chip: only while a flight is selected; the globe code loads only when opened ─────────────────────
describe('I6 — the chip shows only while a flight is selected', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('globeAvailable needs both airports\' positions', () => {
    expect(globeAvailable(null)).toBe(false);
    expect(globeAvailable({ orig: SIN, dest: null })).toBe(false);
    expect(globeAvailable({ orig: SIN, dest: DXB })).toBe(true);
  });

  function harness() {
    const flights = [];
    class Obj { constructor(o) { Object.assign(this, o || {}); this.contents = []; } setMap() {} setPosition() {} addListener() { return { remove() {} }; } setContent(c) { this.contents.push(c); } open() {} close() {} setIcon() {} }
    const gmaps = { Marker: Obj, InfoWindow: Obj, Polyline: Obj, SymbolPath: { CIRCLE: 0 }, marker: null };
    const place = (c) => fr24.airportName(c);
    const fetchJson = async (u) => {
      if (u === '/api/fr24/access') return { ok: true, enabled: true };
      if (u.startsWith('/api/fr24/airport/')) return { ok: true, readAt: '2026-11-11T06:00:00Z', planes: [{ id: '3c000001', callsign: 'UAE355', lat: 5, lng: 95, track: 300, gspeed: 450, alt: 31000 }] };
      if (u.startsWith('/api/fr24/flight/')) return { ok: true, flight: { id: '3c000001', flight: 'EK355', callsign: 'UAE355', ended: false, orig: place('WSSS'), dest: place('OMDB') }, origPos: SIN, destPos: DXB };
      if (u.startsWith('/api/fr24/board/')) {
        return { ok: true, rows: [{ id: '3b000021', flight: 'QF52', callsign: 'QFA52', ended: true, landed: '2026-11-11T05:00:00Z', takeoff: '2026-11-11T01:00:00Z', orig: place('YPPH'), dest: place('WSSS') }] };
      }
      return null;
    };
    const layer = createFr24Layer({ panTo() {} }, gmaps, { fetchJson, lang: 'en', now: () => Date.parse('2026-11-11T06:00:00Z'), onFlight: (f) => flights.push(f) });
    return { layer, flights };
  }
  it('a tapped plane reports its flight; a map click clears it', async () => {
    const { layer, flights } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    await layer.openFlight('3c000001');
    const f = flights.at(-1);
    expect(globeAvailable(f)).toBe(true);
    expect(f.orig).toMatchObject({ lat: SIN.lat, lng: SIN.lng, label: 'SIN' });
    expect(f.dest).toMatchObject({ lat: DXB.lat, lng: DXB.lng, label: 'DXB' });
    expect(f.plane.lat).toBeCloseTo(5, 0);
    expect(f.title).toMatch(/EK355/);
    layer.closeInfo();
    expect(flights.at(-1)).toBeNull();
  });
  it('a board row reports its flight, an arrival included (origin → Singapore); closing the board clears it', async () => {
    const { layer, flights } = harness();
    await layer.init();
    await layer.openBoard('WSSS', 'arr');
    await layer.selectFlight('3b000021');
    const f = flights.at(-1);
    expect(f.orig.label).toBe('PER');
    expect(f.dest.label).toBe('SIN');
    expect(f.landed).toBe(true);
    expect(globeAvailable(f)).toBe(true);
    layer.closeBoard();
    expect(flights.at(-1)).toBeNull();
  });
  it('the map panel offers the chip after 🍚 Hawker only for a selected flight, and loads the globe with import()', () => {
    const src = fs.readFileSync(path.join(ROOT, 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
    expect(src).toMatch(/lazy\(\(\) => import\(['"]\.\/FlightGlobe\.jsx['"]\)\)/);
    expect(src).not.toMatch(/^import [^;]*FlightGlobe/m);
    expect(src).toMatch(/globeAvailable\(fr24Flight\)/);
    const hawker = src.indexOf("key: 'hawker'");
    const globe = src.indexOf("key: 'globe'");
    expect(hawker).toBeGreaterThan(-1);
    expect(globe).toBeGreaterThan(hawker);
  });
  // v0.62.986 — spec 2026-11-12-safe-updates-globe-chunk-docs-985 (I4): the chip's test lives in its own small file,
  // so the panel's static imports no longer pull the projection and great-circle code into the first bundle.
  it('the panel imports nothing from flight-globe.js at load; the chip test comes from globe-available.js', async () => {
    const src = fs.readFileSync(path.join(ROOT, 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
    expect(src).not.toMatch(/^import [^;]*['"][^'"]*flight-globe\.js['"]/m);
    expect(src).toMatch(/^import \{ globeAvailable \} from ['"]\.\.\/lib\/globe-available\.js['"];?$/m);
    const small = fs.readFileSync(path.join(ROOT, 'web/transport/src/lib/globe-available.js'), 'utf8');
    expect(small).not.toMatch(/^import /m);               // nothing else rides in with it
    const { globeAvailable: g2 } = await import('../web/transport/src/lib/globe-available.js');
    expect(g2).toBe(globeAvailable);                      // flight-globe.js re-exports the same function
  });
});
