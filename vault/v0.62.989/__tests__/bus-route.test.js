// __tests__/bus-route.test.js — v0.62.967.
//
// Spec: doc/Feature/2026-11-02-bus-route-and-live-buses-train-tma.spec.md, C1-C9 and invariants I1-I8.
//
// Tap a service number in a bus stop's bubble: the route (road shape from Google Directions, cached 30 days, with a
// stop-to-stop fallback) and the buses on it now, from LTA's arrival feed sampled along the route. The pure parts are
// called directly from web/transport/src/lib/bus-route.js; the server parts are called through transport.js with a
// fake HTTP client and the fake Redis location-cache.test.js uses; the Mini App's wiring is pinned by source.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createStub } from './redis-stub.js';
import {
  BUS_COLOUR, SAMPLE_EVERY, DEDUPE_M, sampleStops, dedupeBuses, pickDirection, routeStripModel,
  BUS_STRINGS, BUS_LOCALES, bt,
} from '../web/transport/src/lib/bus-route.js';
import { createBusRouteLayer } from '../web/transport/src/lib/mapOverlays.js';

const require = createRequire(import.meta.url);
const transport = require('../transport.js');

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// A 12-stop route along Serangoon Road, 300 m apart, direction 1 south-east to north-west and direction 2 back.
const STOPS = Array.from({ length: 12 }, (_, i) => ({ code: String(60000 + i), lat: 1.3100 + i * 0.0027, lng: 103.8550 + i * 0.0004, name: `Stop ${i}` }));
const seq = (list) => list.map((s, i) => ({ seq: i + 1, code: s.code, distance: i * 0.3 }));

describe('I2 — the sampler and the dedupe', () => {
  it('samples every fifth stop and always the last, never twice', () => {
    expect(SAMPLE_EVERY).toBe(5);
    const picked = sampleStops(STOPS);
    expect(picked.map((s) => s.code)).toEqual(['60000', '60005', '60010', '60011']);
    const sixty = Array.from({ length: 60 }, (_, i) => ({ code: String(i) }));
    expect(sampleStops(sixty)).toHaveLength(13);
    expect(sampleStops(sixty).at(-1).code).toBe('59');
    expect(sampleStops([{ code: 'a' }])).toHaveLength(1);
    expect(sampleStops([])).toEqual([]);
  });
  it('dedupes buses within 30 m, keeping the earlier arrival', () => {
    expect(DEDUPE_M).toBe(30);
    const a = { lat: 1.3100, lng: 103.8550, minutes: 4, nextStopCode: '60000' };
    const b = { lat: 1.3101, lng: 103.8550, minutes: 2, nextStopCode: '60005' };   // ~11 m from a
    const c = { lat: 1.3200, lng: 103.8550, minutes: 9, nextStopCode: '60010' };   // ~1.1 km away
    const out = dedupeBuses([a, b, c]);
    expect(out).toHaveLength(2);
    expect(out[0].minutes).toBe(2);
    expect(out[1]).toBe(c);
  });
});

describe('I4 — the first direction is the one serving the tapped stop; direction 1 when both do', () => {
  const byDir = { 1: seq(STOPS), 2: seq([...STOPS].reverse().slice(0, 6)) };
  it('a stop on both → 1; only on 2 → 2; on neither → null', () => {
    expect(pickDirection(byDir, '60008')).toBe(1);      // on both
    expect(pickDirection({ 1: seq(STOPS.slice(0, 3)), 2: seq(STOPS.slice(5)) }, '60008')).toBe(2);
    expect(pickDirection(byDir, '99999')).toBeNull();
    expect(pickDirection({ 1: seq(STOPS) }, '60008')).toBe(1);
    expect(pickDirection({}, '60008')).toBeNull();
  });
});

describe('I5 — the strip: service, direction, bus count, reading time, in 9 locales; the fallback named', () => {
  it('the nine locales, translated rather than copied, with the placeholders kept', () => {
    expect(BUS_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    for (const k of Object.keys(BUS_STRINGS)) {
      const row = BUS_STRINGS[k];
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
      for (const l of BUS_LOCALES) {
        expect(typeof row[l] === 'string' && row[l].trim().length > 0, `${k}.${l}`).toBe(true);
        expect(ph(row[l]), `${k}.${l}`).toEqual(ph(row.en));
      }
      // route.title is '🚌 {svc} → {dest}' and route.read is the proper noun 'LTA DataMall {time}': neither
      // holds a translatable word, so they are the same in every locale by design.
      if (!['route.title', 'route.read'].includes(k)) {
        for (const l of ['zh', 'ja', 'ko', 'ru']) expect(row[l], `${k}.${l}`).not.toBe(row.en);
      }
    }
    expect(bt('route.swap', 'xx')).toBe(BUS_STRINGS['route.swap'].en);
  });
  it('the model: title with the service and the last stop, the count and the LTA reading time', () => {
    const m = routeStripModel({ service: '10', lastStop: 'Kent Ridge Ter', count: 12, readAt: Date.UTC(2026, 10, 2, 11, 4), shapeSource: 'road', lang: 'en' });
    expect(m.title).toBe('🚌 10 → Kent Ridge Ter');
    expect(m.sub).toBe('12 buses · LTA DataMall 19:04');
    expect(m.swap).toBe('↔ Other direction');
    expect(m['data-bus-route']).toBe('10');
    expect(m.style.background).toBe('#e3f0fb');
    expect(m.style.color).toBe('#1f6fb8');
    expect(BUS_COLOUR).toBe('#1f6fb8');
  });
  it('one bus, no buses, straight lines, and an error', () => {
    expect(routeStripModel({ service: '10', lastStop: 'X', count: 1, readAt: 0, shapeSource: 'road', lang: 'en' }).sub).toMatch(/^1 bus · /);
    expect(routeStripModel({ service: '10', lastStop: 'X', count: 0, readAt: 0, shapeSource: 'road', lang: 'en' }).sub).toMatch(/^No buses now · /);
    expect(routeStripModel({ service: '10', lastStop: 'X', count: 3, readAt: 0, shapeSource: 'straight', lang: 'en' }).sub).toMatch(/· straight lines$/);
    expect(routeStripModel({ service: '10', error: true, lang: 'en' }).title).toBe('🚌 10 · Route unavailable');
    expect(routeStripModel({ service: '10', lastStop: 'X', count: 2, readAt: 0, shapeSource: 'road', lang: 'ko' }).sub).toContain('LTA DataMall');
  });
});

// ── The server, called through transport.js with a fake HTTP client ──────────────────────────────────────────────
const PAGE = (rows) => ({ data: { value: rows } });
function routeRows() {
  const rows = [];
  for (let i = 0; i < STOPS.length; i++) rows.push({ ServiceNo: '10', Operator: 'SBST', Direction: 1, StopSequence: i + 1, BusStopCode: STOPS[i].code, Distance: i * 0.3, WD_FirstBus: '0500', WD_LastBus: '2300' });
  for (let i = 0; i < 6; i++) rows.push({ ServiceNo: '10', Operator: 'SBST', Direction: 2, StopSequence: i + 1, BusStopCode: STOPS[11 - i].code, Distance: i * 0.3 });
  rows.push({ ServiceNo: '14', Operator: 'SBST', Direction: 1, StopSequence: 1, BusStopCode: '60000', Distance: 0 });
  return rows;
}
function fakeHttp({ arrivals = {}, directions = null, log = [] } = {}) {
  return {
    log,
    async get(url, { params } = {}) {
      log.push({ url, params });
      if (url.endsWith('/BusRoutes')) {
        const rows = routeRows();
        const skip = Number(params?.$skip || 0);
        return PAGE(rows.slice(skip, skip + 500));
      }
      if (url.endsWith('/BusArrival')) return { data: { BusStopCode: params.BusStopCode, Services: arrivals[params.BusStopCode] || [] } };
      if (url.includes('maps.googleapis.com/maps/api/directions')) {
        if (directions === 'fail') throw new Error('directions down');
        return { data: { status: 'OK', routes: [{ overview_polyline: { points: directions } }] } };
      }
      throw new Error('unexpected ' + url);
    },
  };
}
async function seedStops(redis) {
  for (const s of STOPS) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: s.name, roadName: 'Serangoon Rd', lat: String(s.lat), lng: String(s.lng) });
}
const bus = (lat, lng, minutes, visit = 1) => ({ EstimatedArrival: new Date(Date.now() + minutes * 60000).toISOString(), Load: 'SEA', Type: 'DD', Feature: 'WAB', Latitude: String(lat), Longitude: String(lng), VisitNumber: String(visit) });

describe('I1 — routes cached daily from BusRoutes, read back in sequence with names and coordinates', () => {
  let redis;
  beforeEach(async () => { redis = createStub(); process.env.LTA_ACCOUNT_KEY = 'test-key'; await seedStops(redis); });

  it('refreshRoutes pages through BusRoutes and stores one list per service and direction', async () => {
    const http = fakeHttp();
    const r = await transport.refreshRoutes(redis, { http });
    expect(r.imported).toBe(3);
    expect(http.log.filter((l) => l.url.endsWith('/BusRoutes'))).toHaveLength(1);
    const again = await transport.refreshRoutes(redis, { http });
    expect(again.skipped).toBe('fresh');
  });
  it('without a key nothing is fetched', async () => {
    delete process.env.LTA_ACCOUNT_KEY;
    const http = fakeHttp();
    expect((await transport.refreshRoutes(redis, { http })).skipped).toBe('no-key');
    expect(http.log).toHaveLength(0);
  });
  it('busRoute returns the stops in sequence, named, with coordinates; an unknown route is null', async () => {
    await transport.refreshRoutes(redis, { http: fakeHttp() });
    const r = await transport.busRoute(redis, '10', 1);
    expect(r.map((s) => s.code)).toEqual(STOPS.map((s) => s.code));
    expect(r[0]).toMatchObject({ seq: 1, code: '60000', name: 'Stop 0', lat: STOPS[0].lat, lng: STOPS[0].lng });
    expect(r[11].distance).toBeCloseTo(3.3, 5);
    expect(await transport.busRoute(redis, '10', 2)).toHaveLength(6);
    expect(await transport.busRoute(redis, '999', 1)).toBeNull();
  });
});

describe('I2, I3 — the buses on the route now: the asked service only, each once, with a position and a next stop', () => {
  let redis;
  beforeEach(async () => { redis = createStub(); process.env.LTA_ACCOUNT_KEY = 'test-key'; await seedStops(redis); await transport.refreshRoutes(redis, { http: fakeHttp() }); });

  it('arrivalToObject keeps everything it returned before, plus lat, lng and visit', () => {
    const o = transport.arrivalToObject(bus(1.31, 103.855, 3), Date.now());
    expect(o).toMatchObject({ minutes: 3, load: 'SEA', loadLabel: '', type: 'DD', feature: 'WAB', lat: 1.31, lng: 103.855, visit: 1 });
    const bare = transport.arrivalToObject({ EstimatedArrival: new Date(Date.now() + 60000).toISOString() }, Date.now());
    expect(bare.lat).toBeNull(); expect(bare.lng).toBeNull(); expect(bare.visit).toBeNull();
  });
  it('samples every fifth stop and the last, keeps service 10 visit 1 with a position, dedupes, orders by next stop', async () => {
    const arrivals = {
      60000: [{ ServiceNo: '10', NextBus: bus(STOPS[0].lat - 0.001, STOPS[0].lng, 2), NextBus2: bus(STOPS[0].lat - 0.004, STOPS[0].lng, 8), NextBus3: {} },
              { ServiceNo: '14', NextBus: bus(1.30, 103.85, 1) }],
      60005: [{ ServiceNo: '10', NextBus: bus(STOPS[0].lat - 0.001, STOPS[0].lng, 11), NextBus2: bus(STOPS[4].lat, STOPS[4].lng, 1, 2), NextBus3: {} }],
      60010: [{ ServiceNo: '10', NextBus: { EstimatedArrival: new Date(Date.now() + 120000).toISOString() }, NextBus2: {}, NextBus3: {} }],
      60011: [{ ServiceNo: '10', NextBus: bus(STOPS[10].lat, STOPS[10].lng, 1), NextBus2: {}, NextBus3: {} }],
    };
    const http = fakeHttp({ arrivals });
    const r = await transport.busRouteBuses(redis, '10', 1, { http, now: () => 1234 });
    expect(http.log.filter((l) => l.url.endsWith('/BusArrival')).map((l) => l.params.BusStopCode)).toEqual(['60000', '60005', '60010', '60011']);
    expect(r.readAt).toBe(1234);
    // Three buses: the 2-min one before stop 0 (its 11-min duplicate at stop 5 is the same bus, deduped), the 8-min one,
    // and the one before the last stop. Service 14's bus and the visit-2 bus and the position-less bus are out.
    expect(r.buses).toHaveLength(3);
    expect(r.buses.map((b) => b.nextStopCode)).toEqual(['60000', '60000', '60011']);
    expect(r.buses[0]).toMatchObject({ minutes: 2, nextStopSeq: 1, load: 'SEA', type: 'DD' });
    for (const b of r.buses) { expect(Number.isFinite(b.lat)).toBe(true); expect(Number.isFinite(b.lng)).toBe(true); }
  });
  it('an unknown route gives no buses and makes no arrival call', async () => {
    const http = fakeHttp();
    const r = await transport.busRouteBuses(redis, '999', 1, { http });
    expect(r.buses).toEqual([]);
    expect(http.log).toHaveLength(0);
  });
});

describe('I8 — the road shape: fetched once per service and direction per 30 days, capped daily, never without a key', () => {
  let redis;
  const stops = STOPS.map((s, i) => ({ seq: i + 1, code: s.code, lat: s.lat, lng: s.lng }));
  // Google's encoded polyline for the three points (1.31,103.855) (1.3127,103.8554) (1.3154,103.8558).
  const ENC = transport.encodePolyline([[1.31, 103.855], [1.3127, 103.8554], [1.3154, 103.8558]]);
  beforeEach(() => { redis = createStub(); });

  it('decodes what it encodes', () => {
    expect(transport.decodePolyline(ENC)).toEqual([[1.31, 103.855], [1.3127, 103.8554], [1.3154, 103.8558]]);
  });
  it('fetches with via waypoints in chunks of at most 25 points, caches for 30 days, and does not fetch again', async () => {
    const http = fakeHttp({ directions: ENC });
    const forty = Array.from({ length: 40 }, (_, i) => ({ seq: i + 1, code: String(i), lat: 1.3 + i * 0.001, lng: 103.8 }));
    const first = await transport.routeShape(redis, '10', 1, forty, { http, key: 'g-key' });
    expect(first.length).toBeGreaterThan(0);
    const calls = http.log.filter((l) => l.url.includes('directions'));
    expect(calls).toHaveLength(2);   // 40 points: 1..25, then 25..40
    expect(calls[0].params.key).toBe('g-key');
    expect(calls[0].params.waypoints.split('|')).toHaveLength(23);
    expect(calls[0].params.waypoints).toMatch(/^via:/);
    const second = await transport.routeShape(redis, '10', 1, forty, { http, key: 'g-key' });
    expect(second).toEqual(first);
    expect(http.log.filter((l) => l.url.includes('directions'))).toHaveLength(2);
    // The stub keeps expiresAt on each entry (no TTL command); 30 days less a minute of slack.
    expect(redis.store.get('lta:busroute:shape:10:1').expiresAt).toBeGreaterThan(Date.now() + 30 * 86400 * 1000 - 60000);
  });
  it('a changed stop list invalidates the cached shape', async () => {
    const http = fakeHttp({ directions: ENC });
    await transport.routeShape(redis, '10', 1, stops, { http, key: 'g-key' });
    await transport.routeShape(redis, '10', 1, stops.slice(0, 11), { http, key: 'g-key' });
    expect(http.log.filter((l) => l.url.includes('directions'))).toHaveLength(2);
  });
  it('no key → null and no call; a Directions error → null; the daily cap → null after 200', async () => {
    const http = fakeHttp({ directions: ENC });
    expect(await transport.routeShape(redis, '10', 1, stops, { http, key: '' })).toBeNull();
    expect(http.log).toHaveLength(0);
    expect(await transport.routeShape(redis, '10', 2, stops, { http: fakeHttp({ directions: 'fail' }), key: 'g-key' })).toBeNull();
    const day = transport.shapeCapKey(new Date(Date.UTC(2026, 10, 2, 11, 0)));
    expect(day).toBe('lta:busroute:shapecap:20261102');
    await redis.set(day, '200');
    expect(await transport.routeShape(redis, '10', 1, stops, { http, key: 'g-key', now: () => Date.UTC(2026, 10, 2, 11, 0) })).toBeNull();
    expect(http.log.filter((l) => l.url.includes('directions'))).toHaveLength(0);
  });
});

describe('the server routes, the boot refresh, and the Mini App wiring (source pins)', () => {
  it('index.js serves /api/transport/bus-route and /bus-route-buses through transport, and refreshes routes at boot', () => {
    const src = code('index.js');
    expect(src).toMatch(/app\.get\('\/api\/transport\/bus-route', async \(req, res\)/);
    expect(src).toMatch(/app\.get\('\/api\/transport\/bus-route-buses', async \(req, res\)/);
    expect(src).toMatch(/transport\.busRoute\(redis, service, direction\)/);
    expect(src).toMatch(/transport\.routeShape\(redis, service, direction, stops\)/);
    expect(src).toMatch(/transport\.busRouteBuses\(redis, service, direction\)/);
    expect(src).toMatch(/transport\.refreshRoutes\(redis\)/);
  });
  it('the bubble lists each service as a tap target that calls the route hook with the service and the stop', () => {
    const src = code('web/transport/src/lib/mapOverlays.js');
    expect(src).toMatch(/window\.__giaBusRoute&&window\.__giaBusRoute\(/);
    expect(src).toMatch(/export function createBusRouteLayer\(/);
    expect(src).toMatch(/setInterval\([^)]*30000\)/);
    expect(src).toMatch(/visibilitychange/);
  });
  it('the map panel installs the hook, reports the route upward, and clears it on unmount', () => {
    const src = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(src).toMatch(/window\.__giaBusRoute = /);
    expect(src).toMatch(/onBusRouteChangeRef\.current\?\.\(/);
    expect(src).toMatch(/delete window\.__giaBusRoute/);
    expect(code('web/_shared/lib/kept-settings.js')).not.toMatch(/busRoute/);
  });
  it('the app renders the route strip after the sim caption strip, with ↔ and ✕', () => {
    const app = code('web/transport/src/App.jsx');
    const sim = app.indexOf('<SimCaptionStrip');
    const route = app.indexOf('<BusRouteStrip');
    expect(sim).toBeGreaterThan(-1);
    expect(route).toBeGreaterThan(sim);
    expect(app).toMatch(/onBusRouteChange=\{/);
    const i = app.indexOf('function BusRouteStrip');
    const body = app.slice(i, i + 2200);
    expect(body).toMatch(/onClick=\{[^}]*swap/);
    expect(body).toMatch(/aria-label=\{ot\('ui\.dismiss', lang\)\}/);
  });
  it('the Train string table is untouched', () => {
    expect(code('web/transport/src/i18n.js')).not.toMatch(/route\.(swap|buses|straight)/);
  });
});

// I6 — the layer itself, CALLED rather than scanned: a 30-second refresh while the route is shown, none after ✕.
// A source pin on `clearInterval` would be satisfied by the text; this proves the timer stops. (Added after the
// "refresh never stopping" mutation survived the source pins above.)
describe('I6 — createBusRouteLayer: refresh every 30 s while shown, nothing after stop()', () => {
  function fakeGmaps() {
    class Obj { constructor(o) { Object.assign(this, o || {}); } setMap(m) { this.map = m; } addListener() { return { remove() {} }; } close() {} open() {} setContent() {} setPosition() {} }
    return { Polyline: Obj, Marker: Obj, InfoWindow: Obj, SymbolPath: { CIRCLE: 0 }, marker: null };
  }
  const stops = (dir) => ({ stops: [{ code: '60000', name: 'A', lat: 1.3, lng: 103.8, seq: 1 }, { code: dir === 1 ? '60011' : '60099', name: dir === 1 ? 'Kent Ridge Ter' : 'Other End', lat: 1.31, lng: 103.81, seq: 2 }], shape: null, shapeSource: 'straight' });
  function harness() {
    const calls = [];
    const fetchJson = async (u) => {
      calls.push(u);
      if (u.includes('/bus-route?')) return stops(u.endsWith('direction=2') ? 2 : 1);
      return { buses: [{ lat: 1.305, lng: 103.805, minutes: 3, nextStop: 'Kent Ridge Ter', nextStopCode: '60011' }], readAt: 1234 };
    };
    const states = [];
    const layer = createBusRouteLayer({}, fakeGmaps(), { fetchJson, onState: (s) => states.push(s), now: () => 5000, lang: 'en' });
    return { calls, states, layer };
  }
  const busCalls = (calls) => calls.filter((u) => u.includes('bus-route-buses')).length;
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('show() draws, reads the buses once, then again every 30 s; stop() clears and ends the reads', async () => {
    const { calls, states, layer } = harness();
    await layer.show('10', '60000');
    expect(busCalls(calls)).toBe(1);
    expect(states.at(-1)).toMatchObject({ active: true, service: '10', direction: 1, lastStop: 'Kent Ridge Ter', count: 1, readAt: 1234 });
    await vi.advanceTimersByTimeAsync(30000);
    expect(busCalls(calls)).toBe(2);
    await vi.advanceTimersByTimeAsync(30000);
    expect(busCalls(calls)).toBe(3);
    layer.stop();
    expect(states.at(-1)).toMatchObject({ active: false });
    await vi.advanceTimersByTimeAsync(90000);
    expect(busCalls(calls)).toBe(3);
    expect(layer.active()).toBe(false);
  });
  it('swap() draws the other direction and reads its buses; show() of another service replaces the first', async () => {
    const { calls, states, layer } = harness();
    await layer.show('10', '60000');
    layer.swap();
    await vi.advanceTimersByTimeAsync(0);
    expect(states.at(-1)).toMatchObject({ active: true, direction: 2, lastStop: 'Other End' });
    expect(calls.at(-1)).toBe('/api/transport/bus-route-buses?service=10&direction=2');
    await layer.show('14', '60000');
    expect(states.at(-1)).toMatchObject({ active: true, service: '14', direction: 1 });
    await vi.advanceTimersByTimeAsync(30000);
    // one timer, not two: the first service's loop died when the second replaced it
    expect(calls.filter((u) => u.includes('bus-route-buses?service=10')).length).toBe(2);
    expect(calls.filter((u) => u.includes('bus-route-buses?service=14')).length).toBe(2);
  });
});
