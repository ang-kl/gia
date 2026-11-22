// bus-route-shared.test.js — v0.62.990. Spec: doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md,
// J5 and B5.
//
// J5: Hawker and Cuisine get the Train map's bus route view: a service in a stop's bubble is a tap target, the tap
// draws the route with its live buses, and the header shows the same strip (service, last stop, buses, first and last
// bus, ↔ and ✕). The layer lives once, in web/_shared/lib/bus-route-layer.js; each map's overlay copy hands it that
// copy's own card.
// B5: the stop view refreshes only while a stop's bubble is open. Operator, 22-11 '26, asked what closing the bubble
// should do: "Pause (Recommended)" — no bubble open, no refresh and no LTA call; the stops stay listed and their buses
// stay where they were; opening any stop's bubble resumes the refresh for every listed stop.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import * as shared from '../web/_shared/lib/bus-route-layer.js';
import { routeStripModel } from '../web/transport/src/lib/bus-route.js';
import { createStopBusesLayer, stopBubbleOpen, STOP_REFRESH_MS } from '../web/transport/src/lib/stop-buses.js';

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const COPIES = { transport: 'web/transport/src/lib/mapOverlays.js', hawker: 'web/hawker/src/lib/mapOverlays.js', cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js' };
const PANELS = { hawker: 'web/hawker/src/components/HawkerMapPanel.jsx', cuisine: 'web/cuisine/src/v2/components/MapPanel.jsx' };
const APPS = { hawker: 'web/hawker/src/App.jsx', cuisine: 'web/cuisine/src/v2/App.jsx' };

// One top-level function's text, from its first line to the line that closes it.
function fnText(src, name) {
  const L = src.split('\n');
  const i = L.findIndex((l) => new RegExp(`^(?:export )?function ${name}\\(`).test(l));
  if (i < 0) return null;
  let depth = 0, started = false, j = i;
  for (; j < L.length; j++) {
    for (const c of L[j]) { if (c === '{') { depth++; started = true; } else if (c === '}') depth--; }
    if (started && depth <= 0) break;
  }
  return L.slice(i, j + 1).join('\n');
}

describe('J5 — one route layer, shared', () => {
  it('the shared file holds the layer and passes on the Train strip model', () => {
    expect(typeof shared.createBusRouteLayer).toBe('function');
    expect(shared.routeStripModel).toBe(routeStripModel);
    expect(shared.ROUTE_REFRESH_MS).toBe(30000);
  });
  it('the layer is no longer written out in the Train copy', () => {
    expect(read(COPIES.transport)).not.toMatch(/function draw\(\)[\s\S]{0,400}new gmaps\.Polyline/);
  });
  it('each overlay copy wraps the shared layer with its own card, word for word the same', () => {
    const texts = Object.entries(COPIES).map(([k, p]) => {
      const src = read(p);
      expect(src, k).toMatch(/import \{ createBusRouteLayer as createSharedBusRouteLayer \} from '(?:\.\.\/)+_shared\/lib\/bus-route-layer\.js';/);
      const t = fnText(src, 'createBusRouteLayer');
      expect(t, k).toMatch(/createSharedBusRouteLayer\(map, gmaps, \{ infoCard, \.\.\.opts \}\)/);
      return t;
    });
    expect(texts[1]).toBe(texts[0]);
    expect(texts[2]).toBe(texts[0]);
  });
  it('the bubble\'s services are tap targets in all three copies, word for word the Train ones', () => {
    for (const name of ['busServiceSpans', 'busArrivalRows']) {
      const t = fnText(read(COPIES.transport), name);
      expect(t, name).toBeTruthy();
      for (const k of ['hawker', 'cuisine']) expect(fnText(read(COPIES[k]), name), `${k} ${name}`).toBe(t);
    }
    for (const k of ['hawker', 'cuisine']) expect(code(COPIES[k]), k).toMatch(/busArrivalRows\(services, b\.code\)/);
  });
  for (const [k, p] of Object.entries(PANELS)) {
    it(`${k}: the panel installs the route hook, reports upward with ↔ and ✕, and removes it on unmount`, () => {
      const src = code(p);
      expect(src).toMatch(/window\.__giaBusRoute = \(service, stopCode\) =>/);
      expect(src).toMatch(/createBusRouteLayer\(map, gmaps, \{/);
      expect(src).toMatch(/onBusRouteChangeRef\.current\?\.\(\{ \.\.\.s, swap: \(\) => busRouteRef\.current\?\.swap\(\), clear: \(\) => busRouteRef\.current\?\.stop\(\) \}\)/);
      expect(src).toMatch(/delete window\.__giaBusRoute;/);
      expect(src).toMatch(/busRouteRef\.current\?\.stop\(\);/);
    });
  }
  for (const [k, p] of Object.entries(APPS)) {
    it(`${k}: every header that shows the resume strip also shows the route strip, from the Train model`, () => {
      const src = code(p);
      expect(src).toMatch(/routeStripModel\(/);
      expect(src).toMatch(/data-bus-route=\{m\['data-bus-route'\]\}/);
      expect(src).toMatch(/state\.swap\?\.\(\)/);
      expect(src).toMatch(/state\.clear\?\.\(\)/);
      const resume = src.split('<ResumeStrip ').length - 1;
      expect(resume).toBeGreaterThan(0);
      expect(src.split('<BusRouteStrip ').length - 1).toBe(resume);
      expect(src).toMatch(/onBusRouteChange=\{setBusRoute\}/);
    });
  }
});

describe('J5 — the Hawker and Cuisine layer draws a tapped service (behaviour, through each copy)', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  function fakeGmaps() {
    class Obj { constructor(o) { Object.assign(this, o || {}); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } addListener() { return { remove() {} }; } close() {} open() {} setContent() {} }
    return { Polyline: Obj, Marker: Obj, InfoWindow: Obj, SymbolPath: { CIRCLE: 0 }, marker: null };
  }
  const fetchJson = async (u) => {
    if (u.includes('/bus-route?')) return u.endsWith('direction=2') ? null : {
      stops: [{ code: '60000', name: 'A', lat: 1.30, lng: 103.80, seq: 1, fb: [330, 360, 390], lb: [1410, 1410, 1410] }, { code: '60011', name: 'Kent Ridge Ter', lat: 1.31, lng: 103.81, seq: 2 }],
      shape: null, shapeSource: 'straight', dayIndex: 0,
    };
    return { buses: [{ lat: 1.305, lng: 103.805, minutes: 3, nextStop: 'Kent Ridge Ter', nextStopCode: '60011' }], readAt: 1234 };
  };
  for (const [k, p] of Object.entries(COPIES)) {
    it(`${k}: show() reports the route, its bus and the tapped stop's first and last bus`, async () => {
      const mod = await import('../' + p);
      const states = [];
      const layer = mod.createBusRouteLayer({}, fakeGmaps(), { fetchJson, onState: (s) => states.push(s), now: () => 5000, lang: 'en' });
      await layer.show('10', '60000');
      expect(states.at(-1)).toMatchObject({ active: true, service: '10', direction: 1, lastStop: 'Kent Ridge Ter', count: 1, hours: { first: 330, last: 1410 } });
      layer.stop();
      expect(states.at(-1)).toMatchObject({ active: false });
    });
  }
});

describe('B5 — the stop view pauses while no stop bubble is open', () => {
  let w;
  beforeEach(() => { vi.useFakeTimers(); w = {}; globalThis.window = w; });
  afterEach(() => { vi.useRealTimers(); delete globalThis.window; });
  const bubble = (html = '<div>stop</div>') => ({ isOpen: true, html, getContent() { return this.html; }, __giaStopHtml: html });
  it('stopBubbleOpen: true before any bubble exists (nothing to pause yet), then open only while the stop\'s own card shows', () => {
    expect(stopBubbleOpen({})).toBe(true);
    const iw = bubble();
    expect(stopBubbleOpen({ __giaStopBubble: iw })).toBe(true);
    iw.isOpen = false;
    expect(stopBubbleOpen({ __giaStopBubble: iw })).toBe(false);
    iw.isOpen = true;
    iw.html = '<div>a station</div>';
    expect(stopBubbleOpen({ __giaStopBubble: iw })).toBe(false);
    const old = { getMap: () => ({}), getContent: () => 'x', __giaStopHtml: 'x' };
    expect(stopBubbleOpen({ __giaStopBubble: old })).toBe(true);
    old.getMap = () => null;
    expect(stopBubbleOpen({ __giaStopBubble: old })).toBe(false);
  });
  it('closed: no read for as long as it stays closed, the stop stays listed and its bus stays drawn; a stop tap resumes', async () => {
    const calls = [];
    const fetchJson = async (u) => {
      calls.push(u);
      if (u.includes('stop-resume')) return { operators: [] };
      return { code: '60000', lat: 1.305, lng: 103.85, readAt: Date.now(), services: [{ service: '10', coming: [{ lat: 1.30, lng: 103.85, minutes: 2 }], going: [] }] };
    };
    const made = [];
    class Marker { constructor(o) { Object.assign(this, o || {}); made.push(this); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } setIcon() {} addListener() { return { remove() {} }; } }
    const gmaps = { Marker, InfoWindow: class { setContent() {} setPosition() {} open() {} close() {} }, SymbolPath: { CIRCLE: 0 }, marker: null };
    const iw = bubble();
    w.__giaStopBubble = iw;
    const layer = createStopBusesLayer({}, gmaps, { fetchJson, schedule: (f) => setTimeout(f, 100), cancel: clearTimeout, lang: 'en' });
    await layer.show('60000', 'Stop');
    const reads = () => calls.filter((u) => u.includes('/stop-buses?')).length;
    expect(reads()).toBe(1);
    await vi.advanceTimersByTimeAsync(STOP_REFRESH_MS);
    expect(reads()).toBe(2);
    iw.isOpen = false;                                            // the ✕, a map tap or another pin closes it
    await vi.advanceTimersByTimeAsync(STOP_REFRESH_MS * 4);
    expect(reads()).toBe(2);
    expect(calls.filter((u) => u.includes('stop-resume')).length).toBe(2);
    expect(layer.stops()).toEqual(['60000']);
    expect(made.filter((m) => m.map)).toHaveLength(1);
    iw.isOpen = true;                                             // a stop's bubble opens again: its tap calls show()
    await layer.show('60000', 'Stop');
    expect(reads()).toBe(3);
    await vi.advanceTimersByTimeAsync(STOP_REFRESH_MS);
    expect(reads()).toBe(4);
    layer.stopAll();
  });
  it('each overlay copy registers the stop bubble and the card it set, before the stop view starts', () => {
    for (const [k, p] of Object.entries(COPIES)) {
      const t = fnText(read(p), 'openBusInfo');
      expect(t, k).toMatch(/window\.__giaStopBubble = infoWindow/);
      expect(t, k).toMatch(/infoWindow\.__giaStopHtml = /);
      expect(t.indexOf('__giaStopBubble'), k).toBeLessThan(t.indexOf('__giaStopBuses'));
      // every card the bubble is given is recorded, the first one and the one with the live arrivals
      expect((t.match(/showStop\(busInfoHtml\(/g) || []).length, k).toBe(3);
      expect(t, k).not.toMatch(/infoWindow\.setContent\(busInfoHtml\(/);
    }
    // Not word for word: the Hawker copy also keeps the bubble on screen (ensureInfoVisible), on purpose.
  });
});
