// stop-buses.test.js — v0.62.969. Spec: doc/Feature/2026-11-03-station-and-stop-tap-animations-train-tma.spec.md.
//
// A bus stop tap shows every service at the stop (A2): per service the 2 buses coming, from the stop's own feed, and
// the 2 that most recently left, from the route sampler in the direction serving the stop (C5). One server call per
// refresh (C6); at most 12 LTA requests in flight, and each refresh's call count logged (C7, I4). The phone layer
// refreshes every 30 s, hides a service on ✕, and stops on "Stop all", a new stop or unmount (I5). Footer model and
// strings in nine locales (I6).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createStub } from './redis-stub.js';
import {
  stopSeqOf, pickComing, pickGoing, bearingDeg, stopFooterModel, createStopBusesLayer,
} from '../web/transport/src/lib/stop-buses.js';
import { BUS_STRINGS, BUS_LOCALES } from '../web/transport/src/lib/bus-route.js';

const require = createRequire(import.meta.url);
const transport = require('../transport.js');
const code = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// ── pure picking ──────────────────────────────────────────────────────────────────────────────────────────────────
describe('I3 — the pure picking', () => {
  const route = Array.from({ length: 12 }, (_, i) => ({ seq: i + 1, code: String(60000 + i) }));
  it('stopSeqOf finds the stop\'s sequence (first visit), null when absent', () => {
    expect(stopSeqOf(route, '60005')).toBe(6);
    expect(stopSeqOf(route, 60000)).toBe(1);
    expect(stopSeqOf(route, '99999')).toBeNull();
    expect(stopSeqOf(null, '60000')).toBeNull();
  });
  it('pickComing: the first 2 of the stop\'s next 3 that have a position', () => {
    const b = (m, pos = true) => ({ minutes: m, lat: pos ? 1.3 : null, lng: pos ? 103.8 : null });
    expect(pickComing({ next: b(2), next2: b(9), next3: b(15) }).map((x) => x.minutes)).toEqual([2, 9]);
    expect(pickComing({ next: b(2, false), next2: b(9), next3: b(15) }).map((x) => x.minutes)).toEqual([9, 15]);
    expect(pickComing({ next: null, next2: null, next3: null })).toEqual([]);
  });
  it('pickGoing: only buses after the stop; the nearest 2; at the same next stop the one further from it first', () => {
    const buses = [
      { nextStopSeq: 1, minutes: 3 },   // before the stop
      { nextStopSeq: 6, minutes: 1 },   // coming to the stop itself
      { nextStopSeq: 11, minutes: 2 },
      { nextStopSeq: 11, minutes: 6 },  // same next stop, further back: closer to our stop
      { nextStopSeq: 12, minutes: 1 },
    ];
    expect(pickGoing(buses, 6)).toEqual([{ nextStopSeq: 11, minutes: 6 }, { nextStopSeq: 11, minutes: 2 }]);
    expect(pickGoing(buses, 12)).toEqual([]);
    expect(pickGoing([], 6)).toEqual([]);
  });
  it('bearingDeg: north 0, east 90', () => {
    expect(bearingDeg({ lat: 1.30, lng: 103.80 }, { lat: 1.31, lng: 103.80 })).toBeCloseTo(0, 0);
    expect(bearingDeg({ lat: 1.30, lng: 103.80 }, { lat: 1.30, lng: 103.81 })).toBeCloseTo(90, 0);
  });
});

// ── the server ────────────────────────────────────────────────────────────────────────────────────────────────────
const STOPS = Array.from({ length: 12 }, (_, i) => ({ code: String(60000 + i), lat: 1.31 + i * 0.0027, lng: 103.855 + i * 0.0004, name: `Stop ${i}` }));
const bus = (lat, lng, minutes) => ({ EstimatedArrival: new Date(Date.now() + minutes * 60000).toISOString(), Load: 'SEA', Type: 'DD', Feature: 'WAB', Latitude: String(lat), Longitude: String(lng), VisitNumber: '1' });
function routeRows() {
  const rows = [];
  STOPS.forEach((s, i) => rows.push({ ServiceNo: '10', Direction: 1, StopSequence: i + 1, BusStopCode: s.code }));
  // service 14: direction 1 does not reach 60005; direction 2 does (third stop)
  ['60000', '60001'].forEach((c, i) => rows.push({ ServiceNo: '14', Direction: 1, StopSequence: i + 1, BusStopCode: c }));
  ['60011', '60008', '60005', '60002'].forEach((c, i) => rows.push({ ServiceNo: '14', Direction: 2, StopSequence: i + 1, BusStopCode: c }));
  return rows;
}
function ltaHttp(arrivals) {
  const log = [];
  return {
    log,
    async get(url, { params } = {}) {
      log.push({ url, params });
      if (url.endsWith('/BusRoutes')) return { data: { value: Number(params?.$skip || 0) ? [] : routeRows() } };
      if (url.endsWith('/BusArrival')) return { data: { Services: arrivals[params.BusStopCode] || [] } };
      throw new Error('unexpected ' + url);
    },
  };
}
const S = (i) => STOPS[i];
const ARRIVALS = {
  60005: [
    { ServiceNo: '10', NextBus: bus(S(4).lat, S(4).lng, 2), NextBus2: bus(S(2).lat, S(2).lng, 9), NextBus3: bus(S(0).lat, S(0).lng, 15) },
    { ServiceNo: '14', NextBus: { EstimatedArrival: new Date(Date.now() + 60000).toISOString() }, NextBus2: bus(S(7).lat, S(7).lng, 4), NextBus3: {} },
    { ServiceNo: '99', NextBus: bus(1.35, 103.9, 3), NextBus2: {}, NextBus3: {} },
  ],
  60000: [{ ServiceNo: '10', NextBus: bus(S(0).lat - 0.002, S(0).lng, 3), NextBus2: {}, NextBus3: {} }],
  60010: [{ ServiceNo: '10', NextBus: bus(S(9).lat, S(9).lng, 2), NextBus2: bus(S(7).lat, S(7).lng, 6), NextBus3: {} }],
  60011: [{ ServiceNo: '10', NextBus: bus(S(10).lat + 0.001, S(10).lng, 1), NextBus2: {}, NextBus3: {} }],
  60002: [{ ServiceNo: '14', NextBus: bus(S(3).lat, S(3).lng, 2), NextBus2: {}, NextBus3: {} }],
};

describe('I3 — the server: every service at the stop, ≤2 coming and ≤2 going each', () => {
  let redis; let logSpy;
  beforeEach(async () => {
    redis = createStub();
    process.env.LTA_ACCOUNT_KEY = 'test-key';
    for (const s of STOPS) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: s.name, roadName: 'R', lat: String(s.lat), lng: String(s.lng) });
    await transport.refreshRoutes(redis, { http: ltaHttp({}) });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => { logSpy.mockRestore(); });

  it('service 10: the 2 coming from the stop\'s own feed, the 2 that left most recently', async () => {
    const r = await transport.stopBuses(redis, '60005', { http: ltaHttp(ARRIVALS), now: () => 777 });
    expect(r.code).toBe('60005');
    expect(r.readAt).toBe(777);
    const s10 = r.services.find((s) => s.service === '10');
    expect(s10.direction).toBe(1);
    expect(s10.coming.map((b) => b.minutes)).toEqual([2, 9]);
    expect(s10.going.map((b) => [b.nextStopCode, b.minutes])).toEqual([['60010', 6], ['60010', 2]]);
    for (const b of [...s10.coming, ...s10.going]) { expect(Number.isFinite(b.lat)).toBe(true); expect(Number.isFinite(b.lng)).toBe(true); }
  });
  it('service 14 runs the stop in direction 2; its position-less next bus is skipped', async () => {
    const r = await transport.stopBuses(redis, '60005', { http: ltaHttp(ARRIVALS) });
    const s14 = r.services.find((s) => s.service === '14');
    expect(s14.direction).toBe(2);
    expect(s14.coming.map((b) => b.minutes)).toEqual([4]);
    expect(s14.going.map((b) => b.nextStopCode)).toEqual(['60002']);
  });
  it('a service with no cached route still shows its coming buses, and no going ones', async () => {
    const r = await transport.stopBuses(redis, '60005', { http: ltaHttp(ARRIVALS) });
    const s99 = r.services.find((s) => s.service === '99');
    expect(s99.direction).toBeNull();
    expect(s99.coming).toHaveLength(1);
    expect(s99.going).toEqual([]);
  });
  it('never more than 2 and 2; never another service\'s bus', async () => {
    const r = await transport.stopBuses(redis, '60005', { http: ltaHttp(ARRIVALS) });
    expect(r.services.map((s) => s.service).sort()).toEqual(['10', '14', '99']);
    for (const s of r.services) { expect(s.coming.length).toBeLessThanOrEqual(2); expect(s.going.length).toBeLessThanOrEqual(2); }
  });
  it('logs the refresh\'s LTA call count', async () => {
    const http = ltaHttp(ARRIVALS);
    await transport.stopBuses(redis, '60005', { http });
    const calls = http.log.filter((l) => l.url.endsWith('/BusArrival')).length;
    const lines = logSpy.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('stop-buses 60005'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain(`${calls} LTA calls`);
    expect(lines[0]).toContain('3 services');
  });
  it('an empty stop returns no services and makes one call', async () => {
    const http = ltaHttp({});
    const r = await transport.stopBuses(redis, '60009', { http });
    expect(r.services).toEqual([]);
    expect(http.log.filter((l) => l.url.endsWith('/BusArrival'))).toHaveLength(1);
  });
});

describe('I4 — at most 12 LTA requests in flight at once', () => {
  it('eight 60-stop services (about 105 arrival calls) never exceed 12 concurrent requests', async () => {
    const redis = createStub();
    process.env.LTA_ACCOUNT_KEY = 'test-key';
    const stops = Array.from({ length: 60 }, (_, i) => ({ code: String(70000 + i), lat: 1.3 + i * 0.001, lng: 103.8 }));
    for (const s of stops) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: 'x', roadName: 'R', lat: String(s.lat), lng: String(s.lng) });
    const svcs = ['1', '2', '3', '4', '5', '6', '7', '8'];
    const rows = [];
    for (const v of svcs) stops.forEach((s, i) => rows.push({ ServiceNo: v, Direction: 1, StopSequence: i + 1, BusStopCode: s.code }));
    await transport.refreshRoutes(redis, { http: { async get(url, { params } = {}) { const k = Number(params?.$skip || 0); return { data: { value: rows.slice(k, k + 500) } }; } } });
    let inFlight = 0; let max = 0; let n = 0;
    const http = {
      async get(url) {
        n++; inFlight++; max = Math.max(max, inFlight);
        await new Promise((r) => setTimeout(r, 3));
        inFlight--;
        if (url.endsWith('/BusArrival')) return { data: { Services: svcs.map((v) => ({ ServiceNo: v, NextBus: {}, NextBus2: {}, NextBus3: {} })) } };
        throw new Error('unexpected ' + url);
      },
    };
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const r = await transport.stopBuses(redis, '70030', { http });
    log.mockRestore();
    expect(r.services).toHaveLength(8);
    expect(n).toBeGreaterThan(90);
    expect(max).toBeLessThanOrEqual(12);
    expect(max).toBeGreaterThan(1);
  });
});

// ── the phone layer ───────────────────────────────────────────────────────────────────────────────────────────────
describe('I5 — the stop layer: 30-second refresh, a ❌ removes a stop, Stop all ends it, a new stop is added', () => {
  function fakeGmaps() {
    class Obj { constructor(o) { Object.assign(this, o || {}); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } addListener() { return { remove() {} }; } close() {} open() {} setContent() {} }
    return { Marker: Obj, InfoWindow: Obj, SymbolPath: { CIRCLE: 0 }, marker: null };
  }
  const payload = (code) => ({
    code, readAt: 5,
    services: [
      { service: '10', direction: 1, coming: [{ lat: 1.30, lng: 103.80, minutes: 2 }, { lat: 1.29, lng: 103.80, minutes: 9 }], going: [{ lat: 1.32, lng: 103.80, minutes: 3, nextStop: 'X' }, { lat: 1.33, lng: 103.80, minutes: 6, nextStop: 'Y' }] },
      { service: '14', direction: 2, coming: [{ lat: 1.31, lng: 103.81, minutes: 4 }], going: [] },
    ],
  });
  function harness() {
    const calls = [];
    const states = [];
    const fetchJson = async (u) => { calls.push(u); return payload(new URL(u, 'http://x').searchParams.get('code')); };
    const layer = createStopBusesLayer({}, fakeGmaps(), { fetchJson, onState: (s) => states.push(s), lang: 'en' });
    return { calls, states, layer };
  }
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // v0.62.971 (spec 2026-11-04, C2-C5, C7): the layer holds up to five STOPS; each stop also reads its resume times;
  // the drawer's ❌ removes a stop (the per-service ✕ of v0.62.969 is gone); a second stop is added, not swapped.
  it('show() draws every service\'s buses, reads the stop\'s resume times, then refreshes every 30 s', async () => {
    const { calls, states, layer } = harness();
    await layer.show('60005', 'Opp Bugis');
    expect(calls).toEqual(['/api/transport/stop-buses?code=60005', '/api/transport/stop-resume?code=60005']);
    expect(layer.count()).toBe(5);
    expect(states.at(-1)).toMatchObject({ active: true, stops: [{ code: '60005', name: 'Opp Bugis', newest: true, count: 5 }], resume: [] });
    await vi.advanceTimersByTimeAsync(30000);
    expect(calls.filter((u) => u.startsWith('/api/transport/stop-buses'))).toHaveLength(2);
  });
  it('remove(code) takes the stop out; removing the last stops all and no fetch follows', async () => {
    const { calls, states, layer } = harness();
    await layer.show('60005', 'Opp Bugis');
    layer.remove('60005');
    expect(layer.count()).toBe(0);
    expect(states.at(-1)).toMatchObject({ active: false });
    const n = calls.length;
    await vi.advanceTimersByTimeAsync(90000);
    expect(calls).toHaveLength(n);
  });
  it('stopAll() clears everything and no fetch follows', async () => {
    const { calls, states, layer } = harness();
    await layer.show('60005', 'Opp Bugis');
    layer.stopAll();
    expect(layer.count()).toBe(0);
    expect(states.at(-1)).toMatchObject({ active: false });
    expect(vi.getTimerCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(90000);
    expect(calls).toHaveLength(2);
  });
  it('a second stop is added, not swapped: one timer; the newest is sampled in full, the older by bus-arrival', async () => {
    const { calls, layer } = harness();
    await layer.show('60005', 'A');
    await layer.show('60009', 'B');
    expect(layer.stops()).toEqual(['60005', '60009']);
    expect(vi.getTimerCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(30000);
    expect(calls.filter((u) => u === '/api/transport/stop-buses?code=60005')).toHaveLength(1);
    expect(calls.filter((u) => u === '/api/transport/bus-arrival?code=60005')).toHaveLength(2);
    expect(calls.filter((u) => u === '/api/transport/stop-buses?code=60009')).toHaveLength(2);
  });
});

describe('I6 — the footer 🚌 chip and its list, in nine locales', () => {
  it('the chip names the stop and how many services are shown; each item has a ✕', () => {
    const m = stopFooterModel({ active: true, name: 'Opp Bugis', services: [{ service: '10' }, { service: '14' }, { service: '99' }], hidden: ['99'], lang: 'en' });
    expect(m.chip).toBe('🚌 Opp Bugis · 2');
    expect(m.items.map((i) => i.service)).toEqual(['10', '14']);
    expect(m.stopAll).toBe(BUS_STRINGS['stop.stopAll'].en);
    expect(stopFooterModel({ active: false, lang: 'en' })).toBeNull();
  });
  it('the new strings are present and translated in all nine locales', () => {
    for (const k of ['stop.stopAll', 'stop.coming', 'stop.going']) {
      const row = BUS_STRINGS[k];
      expect(row, k).toBeTruthy();
      for (const l of BUS_LOCALES) expect(typeof row[l] === 'string' && row[l].trim().length > 0, `${k}.${l}`).toBe(true);
      for (const l of ['zh', 'ja', 'ko', 'ru']) expect(row[l], `${k}.${l}`).not.toBe(row.en);
    }
  });
});

describe('the wiring (source pins)', () => {
  it('index.js serves /api/transport/stop-buses through transport.stopBuses', () => {
    const src = code('index.js');
    expect(src).toMatch(/app\.get\('\/api\/transport\/stop-buses', async \(req, res\)/);
    expect(src).toMatch(/transport\.stopBuses\(redis, stopCode\)/);
  });
  it('the Train bubble starts the stop view on a stop tap; Hawker and Cuisine call it too (v0.62.970)', () => {
    expect(code('web/transport/src/lib/mapOverlays.js')).toMatch(/window\.__giaStopBuses&&window\.__giaStopBuses\(/);
    expect(code('web/hawker/src/lib/mapOverlays.js')).toMatch(/window\.__giaStopBuses&&window\.__giaStopBuses\(/);
    expect(code('web/cuisine/src/v2/lib/mapOverlays.js')).toMatch(/window\.__giaStopBuses&&window\.__giaStopBuses\(/);
  });
  it('the panel installs the hook, reports upward, and clears it on unmount', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(c).toMatch(/window\.__giaStopBuses = /);
    expect(c).toMatch(/onStopBusesChangeRef\.current\?\.\(/);
    expect(c).toMatch(/delete window\.__giaStopBuses/);
  });
});
