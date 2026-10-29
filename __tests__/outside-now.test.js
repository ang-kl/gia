// __tests__/outside-now.test.js — v0.62.952.
//
// Spec: doc/Feature/2026-10-29-outside-now-alerts.spec.md (I1-I4, C1-C6).
//
// The "Outside now" route reads five NEA / PUB real-time feeds (WBGT, lightning, flood alerts, PSI + PM2.5, UV) and
// turns them into one level per row, a dot colour and a list of warnings. Fixtures below copy the shapes measured live
// on 29-10 '26; each threshold is tested on both sides. Flood alerts had zero readings when measured, so both the
// with-location and the without-location shapes are fixtures (spec A2: the operator chose an island-wide fallback).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const on = require('../outside-now.js');

// Raffles City, and a clock fixed at 13:30 SGT so UV's 11:00-15:00 window is open.
const HERE = { lat: 1.2937, lng: 103.8531 };
const NOW = Date.parse('2026-10-29T13:30:00+08:00');
const at = (hhmm) => `2026-10-29T${hhmm}:00+08:00`;
// A point `km` due north of HERE (1 degree of latitude is 111.195 km).
const north = (km) => ({ latitude: String(HERE.lat + km / 111.195), longitude: String(HERE.lng) });

const wbgt = (readings, dt = at('13:00')) => ({ code: 0, data: { records: [{ datetime: dt, item: { type: 'observation', isStationData: true, readings } }] } });
const station = (name, km, heatStress, value = '30.0') => ({ station: { id: name, name }, location: north(km), wbgt: value, heatStress });
const lightning = (readings) => ({ code: 0, data: { records: [{ datetime: at('13:30'), item: { type: 'observation', isStationData: false, readings } }] } });
const strike = (km, hhmm) => ({ location: north(km), type: 'G', text: 'Cloud to Ground', datetime: at(hhmm) });
const flood = (readings) => ({ code: 0, data: { records: [{ datetime: at('13:29'), item: { type: 'observation', readings, isStationData: false } }] } });
const REGIONS = [
  { name: 'north', labelLocation: { latitude: 1.41803, longitude: 103.82 } },
  { name: 'south', labelLocation: { latitude: 1.29587, longitude: 103.82 } },
  { name: 'east', labelLocation: { latitude: 1.35735, longitude: 103.94 } },
  { name: 'west', labelLocation: { latitude: 1.35735, longitude: 103.7 } },
  { name: 'central', labelLocation: { latitude: 1.35735, longitude: 103.82 } },
];
const all = (v) => ({ north: v, south: v, east: v, west: v, central: v });
const psi = (byRegion) => ({ code: 0, data: { regionMetadata: REGIONS, items: [{ timestamp: at('13:00'), readings: { psi_twenty_four_hourly: byRegion } }] } });
const pm25 = (byRegion) => ({ code: 0, data: { regionMetadata: REGIONS, items: [{ timestamp: at('13:00'), readings: { pm25_one_hourly: byRegion } }] } });
const uv = (index, ts = at('13:00')) => ({ code: 0, data: { records: [{ date: '2026-10-29', timestamp: ts, index }] } });

// A calm afternoon: every row present, nothing near a threshold.
const calm = () => ({
  wbgt: wbgt([station('Cathay Green', 0.8, 'Low', '26.2')]),
  lightning: lightning([]),
  flood: flood([]),
  psi: psi(all(40)),
  pm25: pm25(all(11)),
  uv: uv([{ hour: at('13:00'), value: 2 }]),
});
const run = (over = {}, opts = {}) => on.compute({ ...calm(), ...over }, { ...HERE, now: NOW, ...opts });

describe('I1 — levels and thresholds (C2, C4)', () => {
  it('a calm afternoon is green, with no warnings', () => {
    const r = run();
    expect(r.inSg).toBe(true);
    expect(r.dot).toBe('green');
    expect(r.warnings).toEqual([]);
    expect(r.rows.heat).toMatchObject({ status: 'ok', level: 'low', station: 'Cathay Green', at: at('13:00') });
  });

  it('heat reads NEA\'s heatStress at the NEAREST station: Moderate is amber, High is a warning', () => {
    const near = (lvl) => run({ wbgt: wbgt([station('Far', 9, 'Low'), station('Near', 0.5, lvl)]) });
    expect(near('Moderate')).toMatchObject({ dot: 'amber', warnings: [] });
    expect(near('High').dot).toBe('red');
    expect(near('High').warnings).toEqual(['heat']);
    expect(near('High').rows.heat.station).toBe('Near');
  });

  it('lightning warns only for a strike within 5 km in the last 15 minutes', () => {
    expect(run({ lightning: lightning([strike(4.9, '13:20')]) }).warnings).toEqual(['lightning']);
    expect(run({ lightning: lightning([strike(5.1, '13:20')]) }).warnings).toEqual([]);
    expect(run({ lightning: lightning([strike(4.9, '13:14')]) }).warnings).toEqual([]);
    const r = run({ lightning: lightning([strike(4.9, '13:20'), strike(2.1, '13:25'), strike(30, '13:29')]) });
    expect(r.rows.lightning).toMatchObject({ level: 'warn', count: 2 });
    expect(r.rows.lightning.nearestKm).toBeCloseTo(2.1, 1);
  });

  it('flood warns within 3 km when the alert has a location', () => {
    const r = run({ flood: flood([{ location: north(2.9), text: 'Orchard Rd / Scotts Rd' }]) });
    expect(r.warnings).toEqual(['flood']);
    expect(r.rows.flood.alerts[0]).toMatchObject({ text: 'Orchard Rd / Scotts Rd' });
    expect(r.rows.flood.alerts[0].km).toBeCloseTo(2.9, 1);
    expect(run({ flood: flood([{ location: north(3.1), text: 'Far away' }]) }).warnings).toEqual([]);
  });

  it('A2: a flood alert with no location is island-wide, keeps PUB\'s text, and has no distance', () => {
    const r = run({ flood: flood([{ text: 'Flash flood at Upper Bukit Timah Rd' }]) });
    expect(r.warnings).toEqual(['flood']);
    expect(r.rows.flood.alerts).toEqual([{ text: 'Flash flood at Upper Bukit Timah Rd', km: null }]);
  });

  it('air uses the nearest region: PSI 100 is amber, 101 is a warning, 50 is green', () => {
    const one = (v) => run({ psi: psi({ ...all(40), south: v }) });
    expect(one(50).dot).toBe('green');
    expect(one(100)).toMatchObject({ dot: 'amber', warnings: [] });
    expect(one(101).warnings).toEqual(['haze']);
    expect(one(101).rows.air).toMatchObject({ region: 'south', psi: 101, pm25: 11, level: 'unhealthy' });
  });

  it('UV warns at 8+ only between 11:00 and 15:00 SGT; 6-7 is amber at any hour', () => {
    expect(run({ uv: uv([{ hour: at('13:00'), value: 8 }]) }).warnings).toEqual(['uv']);
    expect(run({ uv: uv([{ hour: at('13:00'), value: 7 }]) })).toMatchObject({ dot: 'amber', warnings: [] });
    const late = on.compute({ ...calm(), uv: uv([{ hour: at('16:00'), value: 8 }], at('16:00')) }, { ...HERE, now: Date.parse(at('16:10')) });
    expect(late.warnings).toEqual([]);
    expect(late.rows.uv).toMatchObject({ index: 8, level: 'veryHigh' });
  });

  it('UV reads the latest hour at or before now, not the first entry', () => {
    const r = run({ uv: uv([{ hour: at('14:00'), value: 11 }, { hour: at('13:00'), value: 9 }, { hour: at('12:00'), value: 4 }]) });
    expect(r.rows.uv).toMatchObject({ index: 9, at: at('13:00') });
  });

  it('warnings come in the default priority order: lightning, flood, haze, heat, uv', () => {
    const r = run({
      uv: uv([{ hour: at('13:00'), value: 9 }]),
      wbgt: wbgt([station('Near', 0.5, 'High')]),
      psi: psi(all(150)),
      flood: flood([{ text: 'Somewhere' }]),
      lightning: lightning([strike(1, '13:25')]),
    });
    expect(r.warnings).toEqual(['lightning', 'flood', 'haze', 'heat', 'uv']);
  });
});

describe('I2 — one failed feed never breaks the route or the other rows', () => {
  for (const feed of ['wbgt', 'lightning', 'flood', 'psi', 'uv']) {
    it(`${feed} failing`, () => {
      const r = run({ [feed]: new Error('timeout'), lightning: feed === 'lightning' ? new Error('timeout') : lightning([strike(1, '13:25')]) });
      const row = { wbgt: 'heat', lightning: 'lightning', flood: 'flood', psi: 'air', uv: 'uv' }[feed];
      expect(r.rows[row]).toEqual({ status: 'unavailable' });
      const others = Object.entries(r.rows).filter(([k, v]) => k !== row && v);
      expect(others.every(([, v]) => v.status === 'ok')).toBe(true);
      expect(r.dot).not.toBeNull();
    });
  }
  it('a malformed feed is unavailable, not a crash', () => {
    expect(run({ wbgt: { code: 0, data: null } }).rows.heat).toEqual({ status: 'unavailable' });
  });
  it('every feed failing: no dot and no warnings, but still a valid answer', () => {
    const e = new Error('down');
    const r = on.compute({ wbgt: e, lightning: e, flood: e, psi: e, pm25: e, uv: e }, { ...HERE, now: NOW });
    expect(r).toMatchObject({ ok: true, inSg: true, dot: null, warnings: [] });
  });
});

describe('I3 — Singapore only', () => {
  it('Tokyo: no dot, no warnings, no rows', () => {
    const r = on.compute(calm(), { lat: 35.68, lng: 139.76, now: NOW });
    expect(r).toEqual({ ok: true, inSg: false, dot: null, warnings: [], rows: null });
  });
  it('no coordinates: the Singapore centroid, marked as the default place', () => {
    const r = on.compute(calm(), { now: NOW });
    expect(r.inSg).toBe(true);
    expect(r.place).toMatchObject({ isDefault: true });
  });
});

describe('I4 — feeds are cached island-wide for 5 minutes', () => {
  const counting = () => {
    const calls = {};
    const fx = calm();
    return { calls, fetchJson: async (path) => { const k = on.FEED_NAMES[path]; calls[k] = (calls[k] || 0) + 1; return fx[k]; } };
  };
  it('two locations within 5 minutes cost one fetch per feed', async () => {
    const { calls, fetchJson } = counting();
    let t = NOW;
    const cache = on.createFeedCache({ fetchJson, now: () => t });
    await on.forLocation({ ...HERE, feedCache: cache, now: t });
    t += 4 * 60 * 1000;
    await on.forLocation({ lat: 1.35, lng: 103.94, feedCache: cache, now: t });
    expect(Object.values(calls)).toEqual([1, 1, 1, 1, 1, 1]);
    t += 2 * 60 * 1000;
    await on.forLocation({ ...HERE, feedCache: cache, now: t });
    expect(Object.values(calls)).toEqual([2, 2, 2, 2, 2, 2]);
  });
  it('concurrent requests share one in-flight fetch', async () => {
    const { calls, fetchJson } = counting();
    const cache = on.createFeedCache({ fetchJson, now: () => NOW });
    await Promise.all([1, 2, 3].map(() => on.forLocation({ ...HERE, feedCache: cache, now: NOW })));
    expect(Object.values(calls)).toEqual([1, 1, 1, 1, 1, 1]);
  });
  it('a failed fetch is not cached', async () => {
    let n = 0;
    const cache = on.createFeedCache({ fetchJson: async () => { n++; throw new Error('down'); }, now: () => NOW });
    await on.forLocation({ ...HERE, feedCache: cache, now: NOW });
    await on.forLocation({ ...HERE, feedCache: cache, now: NOW });
    expect(n).toBe(12);
  });
});

describe('C6 — parking (Cuisine only): two nearest car carparks within 300 m, no agency named', () => {
  const cp = (name, m, lots, lotType = 'C') => ({ name, lat: HERE.lat + m / 111195, lng: HERE.lng, availableLots: lots, lotType });
  it('nearest two car carparks within 300 m', () => {
    const r = run({}, { parking: [cp('Far', 400, 50), cp('B', 200, 96), cp('A', 80, 412), cp('A', 80, 30, 'Y'), cp('C', 250, 12)] });
    expect(r.rows.parking).toEqual({ status: 'ok', carparks: [{ name: 'A', lots: 412, m: 80 }, { name: 'B', lots: 96, m: 200 }] });
    expect(JSON.stringify(r.rows.parking)).not.toMatch(/LTA|agency/i);
  });
  it('no carpark within 300 m, or no parking asked for: no row', () => {
    expect(run({}, { parking: [cp('Far', 400, 50)] }).rows.parking).toBeNull();
    expect(run().rows.parking).toBeNull();
  });
});
