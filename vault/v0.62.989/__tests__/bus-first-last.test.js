// bus-first-last.test.js — v0.62.984
// Spec doc/Feature/2026-11-09-bus-first-last-in-route-strip.spec.md (I1-I5).
//
// Tapping a service in a stop's bubble draws its route and a strip. The strip now also says when that service's first
// and last bus call at the tapped stop TODAY: "🚌 10 → Kent Ridge Terminal · 05:30-00:12 at this stop". The times are
// LTA's own per-stop BusRoutes fields, cached since v0.62.971 as fb / lb = [weekday, Saturday, Sunday] minutes, null
// when the service does not run that day. Today's day type is a server fact (holidays live there), returned with the
// route as `dayIndex`, from the same `busDayIndex` that `busHours` uses.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createStub } from './redis-stub.js';
import { createBusRouteLayer } from '../web/transport/src/lib/mapOverlays.js';
import { routeStripModel, BUS_STRINGS, BUS_LOCALES } from '../web/transport/src/lib/bus-route.js';
import { busDayIndex, busHours } from '../web/transport/src/lib/run-state.js';

const require = createRequire(import.meta.url);
const transport = require('../transport.js');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Singapore noon on a date, as an epoch.
const sgNoon = (iso) => Date.parse(iso + 'T04:00:00Z');

describe('I2 — today\'s day type, holidays as Sunday, shared with busHours', () => {
  it('weekday 0, Saturday 1, Sunday 2', () => {
    expect(busDayIndex(sgNoon('2026-11-09'))).toBe(0); // Monday
    expect(busDayIndex(sgNoon('2026-11-13'))).toBe(0); // Friday
    expect(busDayIndex(sgNoon('2026-11-14'))).toBe(1); // Saturday
    expect(busDayIndex(sgNoon('2026-11-15'))).toBe(2); // Sunday
  });
  it('a public holiday is Sunday, on a weekday and on a Saturday', () => {
    expect(busDayIndex(sgNoon('2026-12-25'), ['2026-12-25'])).toBe(2);           // Friday
    expect(busDayIndex(sgNoon('2026-11-14'), (iso) => iso === '2026-11-14')).toBe(2); // Saturday
  });
  it('the Singapore calendar day, not UTC: 00:30 SGT Saturday is Saturday', () => {
    expect(busDayIndex(Date.parse('2026-11-13T16:30:00Z'))).toBe(1);
  });
  it('busHours keeps its behaviour: Sunday times on a holiday', () => {
    const fb = [300, 360, 420];
    const lb = [1380, 1380, 1380];
    // 06:30 SGT on a holiday Friday: Sunday's first bus is 07:00, so not in hours yet.
    expect(busHours(fb, lb, Date.parse('2026-12-24T22:30:00Z'), ['2026-12-25']).inHours).toBe(false);
    expect(busHours(fb, lb, Date.parse('2026-12-24T22:30:00Z'), []).inHours).toBe(true);
  });
  it('the server answers with the same function and the holiday table', async () => {
    expect(await transport.busDayToday({ now: () => sgNoon('2026-11-14'), isHoliday: () => false })).toBe(1);
    expect(await transport.busDayToday({ now: () => sgNoon('2026-11-14'), isHoliday: () => true })).toBe(2);
    expect(await transport.busDayToday({ now: () => sgNoon('2026-11-09'), isHoliday: () => false })).toBe(0);
  });
  it('/api/transport/bus-route returns dayIndex', () => {
    const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
    const start = src.indexOf("app.get('/api/transport/bus-route'");
    // Up to the next route: the first `});` belongs to the 400 reply, above the code this looks for.
    const end = src.indexOf("app.get('/api/transport/bus-route-buses'", start);
    const route = src.slice(start, end);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(route).toMatch(/dayIndex: await transport\.busDayToday\(\)/);
  });
});

describe('I1 — the route carries each stop\'s own first and last bus', () => {
  it('busRoute passes fb and lb through, per stop', async () => {
    const redis = createStub();
    await redis.connect?.();
    const list = [
      { seq: 1, code: '60000', distance: 0, fb: [330, 360, 390], lb: [1430, 1430, 1430], op: 'SBST' },
      { seq: 2, code: '60011', distance: 1.2, fb: [335, null, 395], lb: [12, null, 15], op: 'SBST' },
    ];
    await redis.set('lta:busroute:10:1', JSON.stringify(list));
    for (const s of list) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: 'Stop ' + s.code, roadName: 'Rd', lat: '1.3', lng: '103.8' });
    const r = await transport.busRoute(redis, '10', 1);
    expect(r.map((s) => [s.code, s.fb, s.lb])).toEqual([
      ['60000', [330, 360, 390], [1430, 1430, 1430]],
      ['60011', [335, null, 395], [12, null, 15]],
    ]);
  });
});

describe('I1, I3 — the layer reports the tapped stop\'s times, and only real ones', () => {
  function fakeGmaps() {
    class Obj { constructor(o) { Object.assign(this, o || {}); } setMap(m) { this.map = m; } addListener() { return { remove() {} }; } close() {} open() {} setContent() {} setPosition() {} }
    return { Polyline: Obj, Marker: Obj, InfoWindow: Obj, SymbolPath: { CIRCLE: 0 }, marker: null };
  }
  const route = (dir, dayIndex) => ({
    dayIndex,
    stops: dir === 1
      ? [{ code: '60000', name: 'A', lat: 1.3, lng: 103.8, seq: 1, fb: [330, 360, 390], lb: [12, 20, 30] },
        { code: '60005', name: 'B', lat: 1.305, lng: 103.805, seq: 2, fb: [340, null, 400], lb: [1400, null, 1410] },
        { code: '60011', name: 'Kent Ridge Terminal', lat: 1.31, lng: 103.81, seq: 3, fb: [350, 370, 410], lb: [30, 40, 50] }]
      : [{ code: '60099', name: 'Other End', lat: 1.31, lng: 103.81, seq: 1, fb: [300, 300, 300], lb: [600, 600, 600] },
        { code: '60098', name: 'Z', lat: 1.32, lng: 103.82, seq: 2, fb: [300, 300, 300], lb: [600, 600, 600] }],
    shape: null, shapeSource: 'straight',
  });
  function harness(dayIndex) {
    const fetchJson = async (u) => (u.includes('/bus-route?') ? route(u.endsWith('direction=2') ? 2 : 1, dayIndex) : { buses: [], readAt: 1 });
    const states = [];
    const layer = createBusRouteLayer({}, fakeGmaps(), { fetchJson, onState: (s) => states.push(s), now: () => 5000, lang: 'en' });
    return { states, layer };
  }
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('the tapped stop, today\'s day type', async () => {
    const { states, layer } = harness(0);
    await layer.show('10', '60000');
    expect(states.at(-1).hours).toEqual({ first: 330, last: 12 });
    layer.stop();
    const h2 = harness(2);
    await h2.layer.show('10', '60011');
    expect(h2.states.at(-1).hours).toEqual({ first: 410, last: 50 });
    h2.layer.stop();
  });
  it('none when the service does not run at that stop today', async () => {
    const { states, layer } = harness(1);
    await layer.show('10', '60005');
    expect(states.at(-1).hours).toBeNull();
    layer.stop();
  });
  it('none when the route carries no dayIndex (an older server)', async () => {
    const { states, layer } = harness(undefined);
    await layer.show('10', '60000');
    expect(states.at(-1).hours).toBeNull();
    layer.stop();
  });
  it('none after ↔ when the tapped stop is not on the other side', async () => {
    const { states, layer } = harness(0);
    await layer.show('10', '60000');
    layer.swap();
    await vi.advanceTimersByTimeAsync(0);
    expect(states.at(-1)).toMatchObject({ direction: 2 });
    expect(states.at(-1).hours).toBeNull();
    layer.stop();
  });
});

describe('I4, I5 — the strip says it, in nine locales, with times as a clock reads them', () => {
  it('route.hours exists in all nine locales with both placeholders', () => {
    const row = BUS_STRINGS['route.hours'];
    expect(row).toBeTruthy();
    for (const l of BUS_LOCALES) {
      expect(row[l], l).toBeTruthy();
      expect(row[l], l).toContain('{first}');
      expect(row[l], l).toContain('{last}');
    }
  });
  it('the title gains the times; without them it is unchanged', () => {
    const base = { service: '10', lastStop: 'Kent Ridge Terminal', count: 2, readAt: 0, lang: 'en' };
    expect(routeStripModel(base).title).toBe('🚌 10 → Kent Ridge Terminal');
    expect(routeStripModel({ ...base, hours: { first: 330, last: 12 } }).title)
      .toBe('🚌 10 → Kent Ridge Terminal · 05:30-00:12 at this stop');
    expect(routeStripModel({ ...base, hours: null }).title).toBe('🚌 10 → Kent Ridge Terminal');
    expect(routeStripModel({ ...base, hours: { first: 330, last: null } }).title).toBe('🚌 10 → Kent Ridge Terminal');
  });
  it('the error strip is unchanged', () => {
    expect(routeStripModel({ service: '10', error: true, hours: { first: 330, last: 12 }, lang: 'en' }).title).not.toMatch(/05:30/);
  });
  it('the strip in App.jsx passes the hours through', () => {
    const src = fs.readFileSync(path.join(ROOT, 'web/transport/src/App.jsx'), 'utf8');
    expect(src).toMatch(/routeStripModel\(\{[^}]*hours: state\.hours/);
  });
});
