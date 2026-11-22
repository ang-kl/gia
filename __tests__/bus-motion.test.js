// bus-motion.test.js — v0.62.990. Spec: doc/Feature/2026-11-12-remove-simulate-smooth-buses-shared-route.spec.md, J3, J4.
//
// J3: buses glide between LTA readings instead of jumping — along the route in the route view, never off its line,
// straight towards the new reading in the stop view, and a bus that has not moved stays put.
// J4: no extra LTA calls: the glide makes none, each view still reads once per 30 s, and the server keeps a reading
// longer than the 30 s refresh (B5: 20 s → 35 s), so a refresh can actually reuse it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';
import {
  GLIDE_MS, MAX_STEP_M, distM, measure, locate, pointAt, matchAlong, matchNearest, lerp, createAnimator,
} from '../web/transport/src/lib/bus-motion.js';
import * as motionShared from '../web/_shared/lib/bus-motion.js';
import * as motionTrain from '../web/transport/src/lib/bus-motion.js';
import { createBusRouteLayer, ROUTE_REFRESH_MS } from '../web/_shared/lib/bus-route-layer.js';
import { createStopBusesLayer, STOP_REFRESH_MS } from '../web/transport/src/lib/stop-buses.js';

const require = createRequire(import.meta.url);
const transport = require('../transport.js');

// An east-west road at 1.30°N, about 11 km long, drawn with a few shape points.
const LAT = 1.30;
const SHAPE = [[LAT, 103.80], [LAT, 103.83], [LAT, 103.86], [LAT, 103.90]];
const TRACK = measure(SHAPE.map(([lat, lng]) => ({ lat, lng })));

describe('the geometry', () => {
  it('measures the track and finds a point on it', () => {
    expect(TRACK.total).toBeGreaterThan(11000);
    expect(TRACK.total).toBeLessThan(11200);
    const p = pointAt(TRACK, TRACK.total / 2);
    expect(p.lat).toBeCloseTo(LAT, 6);
    expect(p.lng).toBeCloseTo(103.85, 3);
  });
  it('locates an off-line point by its distance along and its offset', () => {
    const at = locate(TRACK, { lat: LAT + 0.0002, lng: 103.82 });
    expect(at.off).toBeGreaterThan(15);
    expect(at.off).toBeLessThan(30);
    expect(Math.abs(at.d - distM({ lat: LAT, lng: 103.80 }, { lat: LAT, lng: 103.82 }))).toBeLessThan(1);
  });
  it('straight interpolation', () => {
    expect(lerp({ lat: 0, lng: 0 }, { lat: 2, lng: 4 }, 0.5)).toEqual({ lat: 1, lng: 2 });
    expect(lerp({ lat: 0, lng: 0 }, { lat: 2, lng: 4 }, 2)).toEqual({ lat: 2, lng: 4 });
  });
});

describe('matching a bus across two readings (LTA gives no vehicle id)', () => {
  it('along the route: forward only, within one reading\'s reach, each bus once', () => {
    // two buses at 1 km and 5 km; next reading at 1.4 km and 5.3 km, plus a new one at 9 km
    expect(matchAlong([1000, 5000], [1400, 5300, 9000])).toEqual([0, 1, -1]);
    // a bus can wobble a few metres back, not drive backwards
    expect(matchAlong([1000], [970])).toEqual([0]);
    expect(matchAlong([1000], [700])).toEqual([-1]);
    // too far for one reading
    expect(matchAlong([1000], [1000 + MAX_STEP_M + 1])).toEqual([-1]);
    // order kept: the bus behind never takes the leader's marker
    expect(matchAlong([1000, 1500], [1600, 2200])).toEqual([0, 1]);
  });
  it('straight: nearest first, within one reading\'s reach', () => {
    const a = { lat: 1.30, lng: 103.80 };
    const b = { lat: 1.31, lng: 103.81 };
    expect(matchNearest([a, b], [{ lat: 1.3101, lng: 103.8101 }, { lat: 1.3001, lng: 103.8001 }])).toEqual([1, 0]);
    expect(matchNearest([a], [{ lat: 1.40, lng: 103.80 }])).toEqual([-1]);
  });
});

describe('the animator', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('steps from 0 to exactly 1 over the duration, then stops scheduling', async () => {
    const ts = [];
    const a = createAnimator({ now: () => Date.now(), schedule: (f) => setTimeout(f, 100), cancel: clearTimeout });
    a.run('x', 1000, (t) => ts.push(t));
    await vi.advanceTimersByTimeAsync(1500);
    expect(ts[0]).toBeLessThan(0.2);
    expect(ts.at(-1)).toBe(1);
    expect(ts.every((t, i) => i === 0 || t >= ts[i - 1])).toBe(true);
    expect(a.active()).toBe(0);
    const n = ts.length;
    await vi.advanceTimersByTimeAsync(1000);
    expect(ts.length).toBe(n);
  });
});

it('the shared file is the Train one', () => {
  for (const k of Object.keys(motionTrain)) expect(motionShared[k], k).toBe(motionTrain[k]);
  expect(GLIDE_MS).toBe(30000);
});

// ── a fake Google map that records where every marker is put ────────────────────────────────────────────────────
function fakeGmaps() {
  const made = [];
  class Marker {
    constructor(o) { Object.assign(this, o || {}); this.moves = [this.position]; made.push(this); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; this.moves.push(p); } setIcon(i) { this.icon = i; }
    addListener() { return { remove() {} }; }
  }
  class Obj { constructor(o) { Object.assign(this, o || {}); } setMap(m) { this.map = m; } close() {} open() {} setContent() {} setPosition() {} addListener() { return { remove() {} }; } }
  return { made, gmaps: { Polyline: Obj, Marker, InfoWindow: Obj, SymbolPath: { CIRCLE: 0 }, marker: null } };
}
const live = (made) => made.filter((m) => m.map && Array.isArray(m.moves) && m.zIndex === 6);

describe('J3, J4 — the route view: buses glide along the line and stay on it; one read per 30 s', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  function harness(readings) {
    const calls = [];
    let n = 0;
    const fetchJson = async (u) => {
      calls.push(u);
      if (u.includes('/bus-route?')) {
        if (u.endsWith('direction=2')) return null;
        return { stops: [{ code: '1', name: 'West', lat: LAT, lng: 103.80, seq: 1 }, { code: '2', name: 'East', lat: LAT, lng: 103.90, seq: 2 }], shape: SHAPE, shapeSource: 'directions' };
      }
      const r = readings[Math.min(n, readings.length - 1)];
      n++;
      return { buses: r.map(([lat, lng]) => ({ lat, lng, minutes: 3, nextStop: 'East', nextStopCode: '2' })), readAt: Date.now() };
    };
    const { made, gmaps } = fakeGmaps();
    const layer = createBusRouteLayer({}, gmaps, { fetchJson, now: () => Date.now(), schedule: (f) => setTimeout(f, 100), cancel: clearTimeout, lang: 'en' });
    return { calls, made, layer };
  }
  it('the first reading is drawn ON the line, even when LTA puts the bus 20 m off it', async () => {
    const { made, layer } = harness([[[LAT + 0.0002, 103.82]]]);
    await layer.show('10', '1');
    const [m] = live(made);
    expect(locate(TRACK, m.position).off).toBeLessThan(1);
    layer.stop();
  });
  it('the next reading glides along the line over one refresh, never off it, never in a jump', async () => {
    const r1 = [[LAT + 0.0002, 103.82]];
    const r2 = [[LAT - 0.0001, 103.83]];
    const { made, layer } = harness([r1, r2, r2, r2]);
    await layer.show('10', '1');
    const [m] = live(made);
    const d1 = locate(TRACK, m.position).d;
    await vi.advanceTimersByTimeAsync(ROUTE_REFRESH_MS);           // reading 2 arrives
    await vi.advanceTimersByTimeAsync(GLIDE_MS / 2);
    const mid = locate(TRACK, m.position);
    const d2 = locate(TRACK, { lat: LAT, lng: 103.83 }).d;
    expect(mid.off).toBeLessThan(1);
    expect(mid.d).toBeGreaterThan(d1 + (d2 - d1) * 0.4);
    expect(mid.d).toBeLessThan(d1 + (d2 - d1) * 0.6);
    await vi.advanceTimersByTimeAsync(GLIDE_MS / 2 + 200);
    expect(locate(TRACK, m.position).d).toBeCloseTo(d2, 0);
    // every position it was ever given is on the line, and no single step is more than a few metres
    for (const p of m.moves) expect(locate(TRACK, p).off).toBeLessThan(1);
    let biggest = 0;
    for (let i = 1; i < m.moves.length; i++) biggest = Math.max(biggest, distM(m.moves[i - 1], m.moves[i]));
    expect(biggest).toBeLessThan(50);
    expect(live(made)).toHaveLength(1);                           // the same marker moved; none was redrawn
    layer.stop();
  });
  it('on a bend the bus follows the road round the corner, never the shortcut across it', async () => {
    // The straight road above cannot tell "along the route" from "in a straight line"; a corner can. East 2.2 km, then
    // north: 500 m before the corner to 550 m after it. The chord between them passes about 270 m off the road.
    const BEND = [[LAT, 103.80], [LAT, 103.82], [LAT + 0.02, 103.82]];
    const track = measure(BEND.map(([lat, lng]) => ({ lat, lng })));
    const r1 = [[LAT, 103.8155]];
    const r2 = [[LAT + 0.005, 103.82]];
    const calls = [];
    let n = 0;
    const fetchJson = async (u) => {
      calls.push(u);
      if (u.includes('/bus-route?')) return u.endsWith('direction=2') ? null : { stops: [{ code: '1', name: 'W', lat: LAT, lng: 103.80, seq: 1 }, { code: '2', name: 'N', lat: LAT + 0.02, lng: 103.82, seq: 2 }], shape: BEND, shapeSource: 'directions' };
      const r = n++ === 0 ? r1 : r2;
      return { buses: r.map(([lat, lng]) => ({ lat, lng, minutes: 3, nextStop: 'N', nextStopCode: '2' })), readAt: Date.now() };
    };
    const { made, gmaps } = fakeGmaps();
    const layer = createBusRouteLayer({}, gmaps, { fetchJson, now: () => Date.now(), schedule: (f) => setTimeout(f, 100), cancel: clearTimeout, lang: 'en' });
    await layer.show('10', '1');
    const [m] = live(made);
    await vi.advanceTimersByTimeAsync(ROUTE_REFRESH_MS + GLIDE_MS / 2);
    const mid = locate(track, m.position);
    expect(mid.off).toBeLessThan(1);
    await vi.advanceTimersByTimeAsync(GLIDE_MS / 2 + 200);
    for (const p of m.moves) expect(locate(track, p).off, JSON.stringify(p)).toBeLessThan(1);
    // it went along the east leg, then up the north leg: round the corner, not across it
    const east = m.moves.findIndex((p) => Math.abs(p.lat - LAT) < 1e-9 && p.lng > 103.818);
    const north = m.moves.findIndex((p) => Math.abs(p.lng - 103.82) < 1e-9 && p.lat > LAT + 0.001);
    expect(east).toBeGreaterThanOrEqual(0);
    expect(north).toBeGreaterThan(east);
    layer.stop();
  });
  // Codex review of #1933 (P2): on a service that goes out and comes back along the same road, the nearest point of
  // the line is ambiguous; a returning bus projected onto the outbound stretch seems to drive backwards, the matcher
  // refuses it, and its marker is replaced, which is the jump this release removes. The bus's next stop settles it.
  it('a loop that retraces its road: a returning bus is placed on the return stretch and glides there', async () => {
    const LOOP = [[LAT, 103.80], [LAT, 103.82], [LAT, 103.80]];     // out east 2.2 km, back west on the same road
    const loop = measure(LOOP.map(([lat, lng]) => ({ lat, lng })));
    const stops = [
      { code: 'A', name: 'West', lat: LAT, lng: 103.80, seq: 1 },
      { code: 'B', name: 'Mid out', lat: LAT, lng: 103.81, seq: 2 },
      { code: 'C', name: 'East end', lat: LAT, lng: 103.82, seq: 3 },
      { code: 'D', name: 'Mid back', lat: LAT, lng: 103.81, seq: 4 },
      { code: 'E', name: 'West', lat: LAT, lng: 103.80, seq: 5 },
    ];
    // on the way back: 103.8150, then 103.8120 (330 m further west), both before stop D (seq 4)
    const reads = [[LAT, 103.8150], [LAT, 103.8120]];
    let n = 0;
    const fetchJson = async (u) => {
      if (u.includes('/bus-route?')) return u.endsWith('direction=2') ? null : { stops, shape: LOOP, shapeSource: 'directions' };
      const [lat, lng] = reads[Math.min(n++, reads.length - 1)];
      return { buses: [{ lat, lng, minutes: 2, nextStop: 'Mid back', nextStopCode: 'D', nextStopSeq: 4 }], readAt: Date.now() };
    };
    const { made, gmaps } = fakeGmaps();
    const layer = createBusRouteLayer({}, gmaps, { fetchJson, now: () => Date.now(), schedule: (f) => setTimeout(f, 100), cancel: clearTimeout, lang: 'en' });
    await layer.show('10', 'A');
    const [m] = live(made);
    const outEnd = loop.cum[1];                                     // the turn at the east end
    // where it is drawn is on the line; the record of HOW FAR it has come is what must be past the turn
    await vi.advanceTimersByTimeAsync(ROUTE_REFRESH_MS + GLIDE_MS + 200);
    expect(live(made)).toHaveLength(1);
    expect(made.filter((x) => x.zIndex === 6)).toHaveLength(1);    // never replaced: the same marker glided
    expect(m.position.lng).toBeCloseTo(103.8120, 6);
    // it moved west by small steps, never jumping east to the outbound reading
    for (let i = 1; i < m.moves.length; i++) expect(m.moves[i].lng).toBeLessThanOrEqual(m.moves[i - 1].lng + 1e-9);
    expect(outEnd).toBeGreaterThan(2000);
    layer.stop();
  });
  it('a bus that has not moved stays put', async () => {
    const r = [[LAT, 103.83]];
    const { made, layer } = harness([r, r, r, r]);
    await layer.show('10', '1');
    const [m] = live(made);
    const before = m.moves.length;
    await vi.advanceTimersByTimeAsync(ROUTE_REFRESH_MS * 2 + 1000);
    const after = m.moves.slice(before);
    for (const p of after) expect(distM(p, m.moves[0])).toBeLessThan(1);
    layer.stop();
  });
  it('J4: over 90 s the route is read once and the buses four times; the glide reads nothing', async () => {
    const { calls, layer } = harness([[[LAT, 103.81]], [[LAT, 103.815]], [[LAT, 103.82]], [[LAT, 103.825]]]);
    await layer.show('10', '1');
    await vi.advanceTimersByTimeAsync(90000);
    expect(calls.filter((u) => u.includes('/bus-route?'))).toHaveLength(2);       // both directions, once
    expect(calls.filter((u) => u.includes('bus-route-buses'))).toHaveLength(4);   // 0, 30, 60, 90 s
    layer.stop();
    await vi.advanceTimersByTimeAsync(90000);
    expect(calls.filter((u) => u.includes('bus-route-buses'))).toHaveLength(4);
  });
});

describe('J3, J4 — the stop view: buses glide straight to the new reading; one read per 30 s', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); delete globalThis.document; });
  const STOP = { lat: 1.3050, lng: 103.8500 };
  function harness(readings) {
    const calls = [];
    let n = 0;
    const fetchJson = async (u) => {
      calls.push(u);
      if (u.includes('stop-resume')) return { operators: [] };
      const r = readings[Math.min(n, readings.length - 1)];
      n++;
      return { code: '60000', ...STOP, readAt: Date.now(), services: [{ service: '10', coming: r.map(([lat, lng], i) => ({ lat, lng, minutes: 2 + i })), going: [] }] };
    };
    const { made, gmaps } = fakeGmaps();
    const layer = createStopBusesLayer({}, gmaps, { fetchJson, schedule: (f) => setTimeout(f, 100), cancel: clearTimeout, now: () => Date.now(), lang: 'en' });
    return { calls, made, layer };
  }
  const buses = (made) => made.filter((m) => m.map && Array.isArray(m.moves));
  it('the bus slides on the straight line between its two readings, then stops there', async () => {
    const a = [1.3000, 103.8500];
    const b = [1.3030, 103.8500];
    const { made, layer } = harness([[a], [b], [b], [b]]);
    await layer.show('60000', 'Stop');
    const [m] = buses(made);
    expect(m.position).toEqual({ lat: a[0], lng: a[1] });
    await vi.advanceTimersByTimeAsync(STOP_REFRESH_MS + GLIDE_MS / 2);
    expect(m.position.lng).toBeCloseTo(103.85, 9);
    expect(m.position.lat).toBeGreaterThan(1.3012);
    expect(m.position.lat).toBeLessThan(1.3018);
    await vi.advanceTimersByTimeAsync(GLIDE_MS / 2 + 200);
    expect(m.position.lat).toBeCloseTo(b[0], 9);
    expect(buses(made)).toHaveLength(1);
    layer.stopAll();
  });
  it('a bus that has not moved stays put', async () => {
    const a = [1.3000, 103.8500];
    const { made, layer } = harness([[a], [a], [a]]);
    await layer.show('60000', 'Stop');
    const [m] = buses(made);
    await vi.advanceTimersByTimeAsync(STOP_REFRESH_MS * 2 + 500);
    for (const p of m.moves) expect(distM(p, { lat: a[0], lng: a[1] })).toBeLessThan(1);
    layer.stopAll();
  });
  it('J4: over 90 s the stop is read four times; the glide reads nothing', async () => {
    const { calls, layer } = harness([[[1.300, 103.85]], [[1.301, 103.85]], [[1.302, 103.85]], [[1.303, 103.85]]]);
    await layer.show('60000', 'Stop');
    await vi.advanceTimersByTimeAsync(90000);
    expect(calls.filter((u) => u.includes('/stop-buses?'))).toHaveLength(4);
    layer.stopAll();
    await vi.advanceTimersByTimeAsync(90000);
    expect(calls.filter((u) => u.includes('/stop-buses?'))).toHaveLength(4);
  });
});

// ── the server: a reading outlives the 30 s refresh (B5) ─────────────────────────────────────────────────────────
describe('J4 — the server keeps a route\'s bus reading longer than one refresh, so a refresh can reuse it', () => {
  const STOPS = Array.from({ length: 6 }, (_, i) => ({ code: String(70000 + i), lat: 1.30 + i * 0.002, lng: 103.85, name: `S${i}` }));
  const http = {
    async get(url, { params } = {}) {
      if (url.endsWith('/BusRoutes')) return { data: { value: Number(params?.$skip || 0) ? [] : STOPS.map((s, i) => ({ ServiceNo: '10', Operator: 'SBST', Direction: 1, StopSequence: i + 1, BusStopCode: s.code, Distance: i })) } };
      if (url.endsWith('/BusArrival')) return { data: { Services: [] } };
      throw new Error('unexpected ' + url);
    },
  };
  it('the cache window is longer than both views\' refresh', async () => {
    process.env.LTA_ACCOUNT_KEY = 'test-key';
    const redis = createStub();
    for (const s of STOPS) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: s.name, roadName: 'Rd', lat: String(s.lat), lng: String(s.lng) });
    await transport.refreshRoutes(redis, { http });
    const sets = [];
    const set = redis.set.bind(redis);
    redis.set = async (k, v, o) => { sets.push({ k, o }); return set(k, v, o); };
    await transport.busRouteBuses(redis, '10', 1, { http });
    const mine = sets.find((s) => s.k.startsWith('lta:busroute:buses:'));
    expect(mine, 'a reading was cached').toBeTruthy();
    expect(mine.o.EX).toBe(35);
    expect(mine.o.EX * 1000).toBeGreaterThan(ROUTE_REFRESH_MS);
    expect(mine.o.EX * 1000).toBeGreaterThan(STOP_REFRESH_MS);
  });
});
