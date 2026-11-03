// hawker-cuisine-run.test.js — v0.62.970. Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-hawker-cuisine.spec.md.
//
// The Train release's station-tap trains and stop-tap buses, brought to the Hawker and Cuisine Mini Apps. I1: the
// shared files are re-exports of the Train ones, so the three apps run one simulator and one stop view. I2-I3: the
// shared controller adds a station's lines, draws each running line, re-checks every 30 s and stops cleanly. I4: both
// apps label the trains as simulated and carry the footer chips. I5: the Train app's own wiring is untouched.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as trainSimT from '../web/transport/src/lib/train-sim.js';
import * as trainSimS from '../web/_shared/lib/train-sim.js';
import * as stopBusesT from '../web/transport/src/lib/stop-buses.js';
import * as stopBusesS from '../web/_shared/lib/stop-buses.js';
import * as busRouteT from '../web/transport/src/lib/bus-route.js';
import * as busRouteS from '../web/_shared/lib/bus-route.js';
import * as linePathsT from '../web/transport/src/data/line-paths.js';
import * as linePathsS from '../web/_shared/lib/line-paths.js';
import { createStationSimController } from '../web/_shared/lib/station-sim-controller.js';

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

describe('I1 — the shared files are the Train functions themselves', () => {
  for (const [name, t, s] of [['train-sim', trainSimT, trainSimS], ['stop-buses', stopBusesT, stopBusesS], ['bus-route', busRouteT, busRouteS], ['line-paths', linePathsT, linePathsS]]) {
    it(`${name}: every export is identical (===), none missing`, () => {
      const keys = Object.keys(t);
      expect(keys.length).toBeGreaterThan(0);
      expect(Object.keys(s).sort()).toEqual(keys.sort());
      for (const k of keys) expect(s[k], `${name}.${k}`).toBe(t[k]);
    });
  }
});

// ── the controller ────────────────────────────────────────────────────────────────────────────────────────────────
const RAW = JSON.parse(read('data/mrt-coords.json'));
const STATIONS = Object.entries(RAW).filter(([n]) => !n.startsWith('_')).map(([name, v]) => ({
  name, lat: Number(v.lat), lng: Number(v.lng), codes: v.codes || [], lines: v.lines || [],
})).filter((v) => Number.isFinite(v.lat));
const ST = (n) => STATIONS.find((s) => s.name === n);
const TUE_NOON = Date.UTC(2026, 10, 3, 4, 0);   // Tuesday 12:00 SGT

// createTrainSimLayer builds a DOM element for each train even when it then uses a plain Marker; Node has no
// document, so the controller tests give it the smallest one that works.
const fakeDocument = () => ({ createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }) });
function fakeGmaps() {
  const made = [];
  class Marker { constructor(o) { Object.assign(this, o || {}); made.push(this); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } addListener() { return { remove() {} }; } }
  return { gmaps: { Marker, InfoWindow: class { setContent() {} setPosition() {} open() {} close() {} }, SymbolPath: { CIRCLE: 0 }, marker: null }, made };
}
function harness({ status = {} } = {}) {
  const calls = [];
  const fetchJson = async (u) => {
    calls.push(u);
    if (u === '/api/transport/stations') return { stations: STATIONS };
    if (u === '/api/transport/line-paths') return { paths: {} };
    if (u === '/api/transport/status') return { statusByLine: status };
    throw new Error('unexpected ' + u);
  };
  const states = [];
  const { gmaps, made } = fakeGmaps();
  const c = createStationSimController({}, gmaps, { fetchJson, onState: (s) => states.push(s), now: () => TUE_NOON, lang: 'en' });
  return { c, calls, states, made, live: () => made.filter((m) => m.map).length };
}

describe('I2 — a station tap adds that station\'s lines and draws each running one', () => {
  beforeEach(() => { vi.useFakeTimers(); globalThis.document = fakeDocument(); });
  afterEach(() => { vi.useRealTimers(); delete globalThis.document; });

  it('City Hall: NSL and EWL, both running at Tuesday noon, one layer each, trains on the map', async () => {
    const h = harness();
    await h.c.addStation(ST('City Hall'));
    expect(h.states.at(-1)).toEqual({ lines: [{ code: 'NSL', state: 'running' }, { code: 'EWL', state: 'running' }] });
    expect(h.c.layerCount()).toBe(2);
    expect(h.live()).toBeGreaterThan(10);
  });
  it('lines accumulate; a line without a timetable is skipped; data is fetched once', async () => {
    const h = harness();
    await h.c.addStation(ST('City Hall'));
    await h.c.addStation(ST('Punggol'));   // NEL and PLRT: PLRT has no simulation data
    expect(h.states.at(-1).lines.map((l) => l.code)).toEqual(['NSL', 'EWL', 'NEL']);
    expect(h.calls.filter((u) => u === '/api/transport/stations')).toHaveLength(1);
    expect(h.calls.filter((u) => u === '/api/transport/line-paths')).toHaveLength(1);
  });
  it('a disrupted line is listed with its state and not drawn', async () => {
    const h = harness({ status: { EWL: { status: 'disrupted' } } });
    await h.c.addStation(ST('City Hall'));
    expect(h.states.at(-1).lines).toEqual([{ code: 'NSL', state: 'running' }, { code: 'EWL', state: 'disrupted' }]);
    expect(h.c.layerCount()).toBe(1);
  });
  it('nothing is fetched before the first tap', () => {
    const h = harness();
    expect(h.calls).toEqual([]);
    expect(h.c.active()).toBe(false);
  });
});

describe('I3 — the 30 s re-check, a ✕, Stop all', () => {
  beforeEach(() => { vi.useFakeTimers(); globalThis.document = fakeDocument(); });
  afterEach(() => { vi.useRealTimers(); delete globalThis.document; });

  it('the line status is re-read every 30 s while trains run', async () => {
    const h = harness();
    await h.c.addStation(ST('City Hall'));
    const n = h.calls.filter((u) => u === '/api/transport/status').length;
    await vi.advanceTimersByTimeAsync(30000);
    expect(h.calls.filter((u) => u === '/api/transport/status').length).toBe(n + 1);
  });
  it('remove() drops one line and its trains; removing the last ends everything', async () => {
    const h = harness();
    await h.c.addStation(ST('City Hall'));
    h.c.remove('EWL');
    expect(h.c.layerCount()).toBe(1);
    expect(h.states.at(-1).lines.map((l) => l.code)).toEqual(['NSL']);
    h.c.remove('NSL');
    expect(h.states.at(-1)).toBeNull();
    expect(h.c.active()).toBe(false);
  });
  it('stopAll() clears every train and no fetch follows', async () => {
    const h = harness();
    await h.c.addStation(ST('City Hall'));
    h.c.stopAll();
    expect(h.live()).toBe(0);
    expect(h.states.at(-1)).toBeNull();
    // Every timer is gone: the 30 s re-check and each line's 1 s train tick. A leaked re-check does nothing visible
    // once the lines are empty, so only the count shows it (it survived a mutation before this line was added).
    expect(vi.getTimerCount()).toBe(0);
    const n = h.calls.length;
    await vi.advanceTimersByTimeAsync(120000);
    expect(h.calls).toHaveLength(n);
  });
});

describe('I2-I4 — the wiring in Hawker and Cuisine (source pins)', () => {
  const COPIES = { hawker: 'web/hawker/src/lib/mapOverlays.js', cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js' };
  const PANELS = { hawker: 'web/hawker/src/components/HawkerMapPanel.jsx', cuisine: 'web/cuisine/src/v2/components/MapPanel.jsx' };
  const APPS = { hawker: 'web/hawker/src/App.jsx', cuisine: 'web/cuisine/src/v2/App.jsx' };
  for (const app of ['hawker', 'cuisine']) {
    it(`${app}: the station tap and the stop tap call the hooks`, () => {
      const src = code(COPIES[app]);
      const tap = src.slice(src.indexOf('function handleStationTap(item)'));
      expect(tap.slice(0, 600)).toMatch(/window\.__giaStationSim&&window\.__giaStationSim\(/);
      const bus = src.slice(src.indexOf('function openBusInfo(map, infoWindow, b, marker)'));
      expect(bus.slice(0, 700)).toMatch(/window\.__giaStopBuses&&window\.__giaStopBuses\(/);
    });
    it(`${app}: the panel installs both hooks, reports upward, and removes them on unmount`, () => {
      const src = code(PANELS[app]);
      expect(src).toMatch(/window\.__giaStationSim = /);
      expect(src).toMatch(/window\.__giaStopBuses = /);
      expect(src).toMatch(/delete window\.__giaStationSim/);
      expect(src).toMatch(/delete window\.__giaStopBuses/);
      expect(src).toMatch(/createStationSimController\(/);
      expect(src).toMatch(/createStopBusesLayer\(/);
      expect(src).toMatch(/onTrainsChangeRef\.current\?\.\(/);
      expect(src).toMatch(/onStopBusesChangeRef\.current\?\.\(/);
    });
    it(`${app}: the header labels the trains as simulated and the footer carries the run chips`, () => {
      const src = code(APPS[app]);
      expect(src).toMatch(/import SimCaptionStrip from '[./]*_shared\/components\/SimCaptionStrip\.jsx'/);
      expect(src).toMatch(/import FooterRunChips from '[./]*_shared\/components\/FooterRunChips\.jsx'/);
      expect(src).toMatch(/<SimCaptionStrip /);
      expect(src).toMatch(/<FooterRunChips /);
      expect(src).toMatch(/onTrainsChange=\{setTrains\}/);
      expect(src).toMatch(/onStopBusesChange=\{setStopBuses\}/);
    });
  }
  it('the shared components exist and use the shared models', () => {
    expect(code('web/_shared/components/SimCaptionStrip.jsx')).toMatch(/simStripModel\(/);
    expect(code('web/_shared/components/FooterRunChips.jsx')).toMatch(/simFooterModel\(/);
    expect(code('web/_shared/components/FooterRunChips.jsx')).toMatch(/stopFooterModel\(/);
  });
});

describe('I5 — the Train app keeps its own wiring', () => {
  it('the Train map uses neither the shared controller nor the station hook', () => {
    expect(code('web/transport/src/lib/mapOverlays.js')).not.toMatch(/__giaStationSim/);
    expect(code('web/transport/src/components/MrtMapPanel.jsx')).not.toMatch(/createStationSimController/);
  });
});
