// bus-route-cache.test.js — v0.62.968. Spec: doc/Feature/2026-11-03-bus-route-shape-and-buses-cache.spec.md.
//
// After v0.62.967 went live, service 10 direction 2 drew straight lines on every call, logged nothing, and paid for
// its Directions requests again each time (journal [AMD-297]). This file proves the fix: the road is kept for the
// chunks Directions can draw (I1), every failure is logged (I2), an account-level or transient failure waits an hour
// instead of being cached for a month or refetched on every view (I3), the strip names a part-straight route (I5),
// and one LTA reading of a route's buses is shared for 20 seconds (I6). bus-route.test.js stays unedited (I4).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createStub } from './redis-stub.js';
import { routeStripModel, BUS_STRINGS, BUS_LOCALES } from '../web/transport/src/lib/bus-route.js';

const require = createRequire(import.meta.url);
const transport = require('../transport.js');
const code = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

// Sixty points: Directions is asked in three chunks, 1..25, 25..49, 49..60.
const SIXTY = Array.from({ length: 60 }, (_, i) => ({ seq: i + 1, code: String(70000 + i), lat: 1.3 + i * 0.001, lng: 103.8 + i * 0.0005 }));
const ROAD = [[1.31, 103.855], [1.3127, 103.8554], [1.3154, 103.8558]];
const ENC = transport.encodePolyline(ROAD);

// Directions answers per call index: 'OK', a status string, or 'throw'.
function directionsHttp(plan) {
  const log = [];
  return {
    log,
    async get(url, { params } = {}) {
      if (!url.includes('maps.googleapis.com/maps/api/directions')) throw new Error('unexpected ' + url);
      const i = log.length;
      log.push({ url, params });
      const step = plan[Math.min(i, plan.length - 1)];
      if (step === 'throw') throw new Error('socket hang up');
      if (step === 'OK') return { data: { status: 'OK', routes: [{ overview_polyline: { points: ENC } }] } };
      return { data: { status: step, routes: [] } };
    },
  };
}

describe('I1 — a route-specific failure keeps the road elsewhere, draws that chunk stop to stop, and is cached', () => {
  let redis; let warn;
  beforeEach(() => { redis = createStub(); warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warn.mockRestore(); });

  it('ZERO_RESULTS on chunk 2 of 3: road, then the 25 stops of chunk 2 straight, then road; marked partial', async () => {
    const http = directionsHttp(['OK', 'ZERO_RESULTS', 'OK']);
    const pts = await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' });
    expect(http.log).toHaveLength(3);
    expect(pts.partial).toBe(true);
    // chunk 1: the three road points; chunk 2: stops 25..49 with its first (= chunk 1's last) dropped; chunk 3: road
    // with its first dropped.
    const chunk2 = SIXTY.slice(24, 49).map((s) => [s.lat, s.lng]);
    expect(pts.slice(0, 3)).toEqual(ROAD);
    expect(pts.slice(3, 3 + 24)).toEqual(chunk2.slice(1));
    expect(pts.slice(27)).toEqual(ROAD.slice(1));
    expect(pts).toHaveLength(3 + 24 + 2);
  });
  it('the mixed shape is cached for 30 days: a second call asks Directions nothing and is still partial', async () => {
    const http = directionsHttp(['OK', 'ZERO_RESULTS', 'OK']);
    const first = await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' });
    const second = await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' });
    expect(http.log).toHaveLength(3);
    expect(Array.from(second)).toEqual(Array.from(first));
    expect(second.partial).toBe(true);
    expect(redis.store.get('lta:busroute:shape:10:2').expiresAt).toBeGreaterThan(Date.now() + 30 * 86400 * 1000 - 60000);
  });
  it('every chunk route-specific: null (drawn straight), and that too is cached, so it is paid for once', async () => {
    const http = directionsHttp(['NOT_FOUND', 'ZERO_RESULTS', 'ZERO_RESULTS']);
    expect(await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' })).toBeNull();
    expect(await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' })).toBeNull();
    expect(http.log).toHaveLength(3);
  });
  it('a fully road route is not marked partial', async () => {
    const pts = await transport.routeShape(redis, '10', 1, SIXTY, { http: directionsHttp(['OK']), key: 'g-key' });
    expect(pts.partial).toBeFalsy();
  });
});

describe('I2 — every non-OK status is logged with service, direction, chunk and status, never the key', () => {
  let redis; let warn;
  beforeEach(() => { redis = createStub(); warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warn.mockRestore(); });

  it('ZERO_RESULTS on chunk 2 of 3 is logged once, in those words', async () => {
    await transport.routeShape(redis, '10', 2, SIXTY, { http: directionsHttp(['OK', 'ZERO_RESULTS', 'OK']), key: 'g-key' });
    const lines = warn.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('bus route shape'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain('10/2');
    expect(lines[0]).toContain('chunk 2 of 3');
    expect(lines[0]).toContain('ZERO_RESULTS');
    expect(lines.join(' ')).not.toContain('g-key');
  });
  it('an account-level status is logged too', async () => {
    await transport.routeShape(redis, '10', 2, SIXTY, { http: directionsHttp(['REQUEST_DENIED']), key: 'g-key' });
    const lines = warn.mock.calls.map((c) => c.join(' ')).filter((l) => l.includes('bus route shape'));
    expect(lines.join(' ')).toContain('REQUEST_DENIED');
    expect(lines.join(' ')).not.toContain('g-key');
  });
});

describe('I3 — an account-level or transient failure: null, not cached for a month, and not retried for an hour', () => {
  let redis; let warn;
  beforeEach(() => { redis = createStub(); warn = vi.spyOn(console, 'warn').mockImplementation(() => {}); });
  afterEach(() => { warn.mockRestore(); vi.useRealTimers(); });

  for (const failure of ['REQUEST_DENIED', 'OVER_QUERY_LIMIT', 'UNKNOWN_ERROR', 'throw']) {
    it(`${failure}: null; no 30-day shape; a one-hour wait marker; the second call asks Directions nothing`, async () => {
      const http = directionsHttp([failure]);
      expect(await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' })).toBeNull();
      expect(redis.store.has('lta:busroute:shape:10:2')).toBe(false);
      const wait = redis.store.get('lta:busroute:shapewait:10:2');
      expect(wait).toBeTruthy();
      expect(wait.expiresAt).toBeLessThanOrEqual(Date.now() + 3600 * 1000 + 1000);
      expect(wait.expiresAt).toBeGreaterThan(Date.now() + 3600 * 1000 - 60000);
      expect(await transport.routeShape(redis, '10', 2, SIXTY, { http, key: 'g-key' })).toBeNull();
      expect(http.log).toHaveLength(1);
    });
  }
  it('after the hour it is tried again, and a now-working key gets the road', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T00:00:00Z'));
    const bad = directionsHttp(['REQUEST_DENIED']);
    expect(await transport.routeShape(redis, '10', 2, SIXTY, { http: bad, key: 'g-key' })).toBeNull();
    vi.setSystemTime(new Date('2026-11-03T01:00:05Z'));
    const good = directionsHttp(['OK']);
    const pts = await transport.routeShape(redis, '10', 2, SIXTY, { http: good, key: 'g-key' });
    expect(good.log).toHaveLength(3);
    expect(pts.length).toBeGreaterThan(0);
  });
  it('the wait is per direction: direction 1 is not held back by direction 2', async () => {
    await transport.routeShape(redis, '10', 2, SIXTY, { http: directionsHttp(['REQUEST_DENIED']), key: 'g-key' });
    const http = directionsHttp(['OK']);
    expect((await transport.routeShape(redis, '10', 1, SIXTY, { http, key: 'g-key' })).length).toBeGreaterThan(0);
    expect(http.log).toHaveLength(3);
  });
});

describe('I5 — the strip names a part-straight route, in nine locales; the server reports it', () => {
  it('routeStripModel: partial → "· partly straight lines"; road → nothing; straight unchanged', () => {
    const base = { service: '10', lastStop: 'X', count: 2, readAt: 0, lang: 'en' };
    expect(routeStripModel({ ...base, shapeSource: 'partial' }).sub).toMatch(/· partly straight lines$/);
    expect(routeStripModel({ ...base, shapeSource: 'road' }).sub).not.toMatch(/straight/);
    expect(routeStripModel({ ...base, shapeSource: 'straight' }).sub).toMatch(/· straight lines$/);
  });
  it('route.partial in all nine locales, translated, distinct from route.straight', () => {
    const row = BUS_STRINGS['route.partial'];
    expect(row).toBeTruthy();
    for (const l of BUS_LOCALES) expect(typeof row[l] === 'string' && row[l].trim().length > 0, l).toBe(true);
    for (const l of ['zh', 'ja', 'ko', 'ru']) expect(row[l], l).not.toBe(row.en);
    for (const l of BUS_LOCALES) expect(row[l], l).not.toBe(BUS_STRINGS['route.straight'][l]);
    expect(routeStripModel({ service: '10', lastStop: 'X', count: 2, readAt: 0, shapeSource: 'partial', lang: 'ko' }).sub).toContain(row.ko);
  });
  it('index.js keeps its routeShape call and reports partial, road or straight', () => {
    const src = code('index.js');
    expect(src).toMatch(/transport\.routeShape\(redis, service, direction, stops\)/);
    expect(src).toMatch(/shapeSource: shape \? \(shape\.partial \? 'partial' : 'road'\) : 'straight'/);
  });
});

describe('I6 — one LTA reading of a route\'s buses is shared for 20 seconds', () => {
  const STOPS = Array.from({ length: 12 }, (_, i) => ({ code: String(60000 + i), lat: 1.31 + i * 0.0027, lng: 103.855 + i * 0.0004, name: `Stop ${i}` }));
  const bus = (lat, lng, minutes) => ({ EstimatedArrival: new Date(Date.now() + minutes * 60000).toISOString(), Load: 'SEA', Type: 'DD', Feature: 'WAB', Latitude: String(lat), Longitude: String(lng), VisitNumber: '1' });
  function ltaHttp() {
    const log = [];
    return {
      log,
      async get(url, { params } = {}) {
        log.push({ url, params });
        if (url.endsWith('/BusRoutes')) {
          const rows = STOPS.map((s, i) => ({ ServiceNo: '10', Operator: 'SBST', Direction: 1, StopSequence: i + 1, BusStopCode: s.code, Distance: i * 0.3 }));
          return { data: { value: Number(params?.$skip || 0) ? [] : rows } };
        }
        if (url.endsWith('/BusArrival')) {
          const s = STOPS.find((x) => x.code === params.BusStopCode);
          return { data: { Services: [{ ServiceNo: '10', NextBus: bus(s.lat - 0.002, s.lng, 2), NextBus2: {}, NextBus3: {} }] } };
        }
        throw new Error('unexpected ' + url);
      },
    };
  }
  let redis;
  beforeEach(async () => {
    redis = createStub();
    process.env.LTA_ACCOUNT_KEY = 'test-key';
    for (const s of STOPS) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: s.name, roadName: 'R', lat: String(s.lat), lng: String(s.lng) });
    await transport.refreshRoutes(redis, { http: ltaHttp() });
  });
  afterEach(() => { vi.useRealTimers(); });
  const arrivalCalls = (http) => http.log.filter((l) => l.url.endsWith('/BusArrival')).length;

  it('a second call inside 20 s reads nothing from LTA and returns the same buses and the same readAt', async () => {
    const http = ltaHttp();
    const a = await transport.busRouteBuses(redis, '10', 1, { http, now: () => 1234 });
    const n = arrivalCalls(http);
    expect(n).toBe(4);   // stops 1, 6, 11 and the last
    const b = await transport.busRouteBuses(redis, '10', 1, { http, now: () => 9999 });
    expect(arrivalCalls(http)).toBe(n);
    expect(b.readAt).toBe(1234);   // when LTA was read, not when the cache was hit
    expect(b.buses).toEqual(a.buses);
    const e = redis.store.get('lta:busroute:buses:10:1');
    expect(e.expiresAt).toBeLessThanOrEqual(Date.now() + 20 * 1000 + 50);
    expect(e.expiresAt).toBeGreaterThan(Date.now() + 20 * 1000 - 2000);
  });
  it('after 20 s LTA is read again', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-03T00:00:00Z'));
    const http = ltaHttp();
    await transport.busRouteBuses(redis, '10', 1, { http, now: () => 1 });
    vi.setSystemTime(new Date('2026-11-03T00:00:21Z'));
    const c = await transport.busRouteBuses(redis, '10', 1, { http, now: () => 2 });
    expect(arrivalCalls(http)).toBe(8);
    expect(c.readAt).toBe(2);
  });
  it('the cache is per service and direction', async () => {
    const http = ltaHttp();
    await transport.busRouteBuses(redis, '10', 1, { http });
    await transport.busRouteBuses(redis, '10', 2, { http });   // no direction-2 route: nothing to read
    expect(redis.store.has('lta:busroute:buses:10:2')).toBe(false);
    expect(arrivalCalls(http)).toBe(4);
  });
});
