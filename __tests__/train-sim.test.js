// __tests__/train-sim.test.js — v0.62.961.
//
// Spec: doc/Feature/2026-10-30-simulated-trains-train-tma.spec.md (I1-I5; C1-C7).
//
// Singapore publishes no live train positions, so the Train Mini App's "🚆 Simulated" toggle places trains from the
// operators' first/last-train timetable (data/sg_train_timings.json) and the typical headways transport.js already
// uses. These tests pin that it is built from that file alone, deterministic from the clock, never outside the
// service window or through a disruption, and always labelled as a simulation.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  headwayMinutes, trainsAt, simState, parseClock, serviceClock, lineGeometry, positionOf, ghostMarkerStyle, SIM_LINES,
  DWELL_SEC, SIM_STRINGS, simT,
} from '../web/transport/src/lib/train-sim.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const { buildTrainSim } = require('../scripts/build-train-sim.js');
const { estimateWaitMinutes } = require('../transport.js');
const TIMINGS = require('../data/sg_train_timings.json');
const SIM = JSON.parse(fs.readFileSync(path.join(ROOT, 'web/transport/src/data/train-sim.json'), 'utf8'));
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => src(p).split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

// A Tuesday and a Saturday, at SGT wall-clock times.
const tue = (hhmm) => Date.parse(`2026-11-03T${hhmm}:00+08:00`);
const sat = (hhmm) => Date.parse(`2026-11-07T${hhmm}:00+08:00`);

describe('I1 — the timetable file is built from sg_train_timings.json and nothing else', () => {
  it('a rebuild equals the committed file', () => {
    expect(buildTrainSim(TIMINGS)).toEqual(SIM);
  });
  it('the simulated lines are exactly those with per-station times', () => {
    expect(Object.keys(SIM.lines).sort()).toEqual(['BPL', 'CCL', 'DTL', 'EWL', 'NEL', 'NSL', 'TEL']);
    expect(SIM_LINES.sort()).toEqual(['BPL', 'CCL', 'DTL', 'EWL', 'NEL', 'NSL', 'TEL']);
    for (const none of ['CGL', 'SLRT', 'PLRT']) expect(SIM.lines[none]).toBeUndefined();
  });
  it('every run time is positive and there is one per segment', () => {
    for (const [line, l] of Object.entries(SIM.lines)) {
      expect(l.runSec.length, line).toBe(l.stations.length - 1);
      expect(l.src.length, line).toBe(l.runSec.length);
      for (const s of l.runSec) expect(s, line).toBeGreaterThan(0);
    }
  });
  it('DTL keeps the timetable\'s own two-minute step where it is positive', () => {
    expect(SIM.lines.DTL.stations.slice(0, 3)).toEqual(['DT1', 'DT2', 'DT3']);
    expect(SIM.lines.DTL.runSec[0]).toBe(120); // 5:30am → 5:32am
    expect(SIM.lines.DTL.src[0]).toBe('t');
  });
  it('a negative or missing step falls back to the line median, then to 2 minutes (C3)', () => {
    const fake = {
      metadata: { scraped_on: 'x' },
      lines: {
        DTL: { directions: { a: { stations: [
          { code: 'DT1', first_mon_sat: '5:30am', first_sun_ph: '6:00am', last_daily: '11:30pm' },
          { code: 'DT2', first_mon_sat: '5:33am', first_sun_ph: '6:03am', last_daily: '11:33pm' },
          { code: 'DT3', first_mon_sat: '5:31am', first_sun_ph: '6:01am', last_daily: '11:35pm' },
          { code: 'DT4', first_mon_sat: '5:35am', first_sun_ph: '6:05am', last_daily: '11:37pm' },
        ] } } },
        TEL: { directions: { a: { stations: [
          { code: 'TE1', first_weekday: '5:30am', first_weekend: '5:30am', last_weekday: '11:00pm', last_weekend: '11:00pm' },
          { code: 'TE2', first_weekday: '5:30am', first_weekend: '5:30am', last_weekday: '11:00pm', last_weekend: '11:00pm' },
        ] } } },
      },
    };
    const out = buildTrainSim(fake);
    // DT2 → DT3 is −2 min (a depot start): the median of the positive steps (3 and 4 min) is 3.5 min.
    expect(out.lines.DTL.runSec).toEqual([180, 210, 240]);
    expect(out.lines.DTL.src).toEqual(['t', 'm', 't']);
    // No positive step at all: 2 minutes.
    expect(out.lines.TEL.runSec).toEqual([120]);
    expect(out.lines.TEL.src).toEqual(['d']);
  });
  it('the builder does not write anything when it is only required', () => {
    expect(src('scripts/build-train-sim.js')).toMatch(/require\.main === module/);
  });
  it('clock parsing: after-midnight last trains count past 24:00', () => {
    expect(parseClock('5:30am')).toBe(330);
    expect(parseClock('11:35pm')).toBe(1415);
    expect(parseClock('12:01am')).toBe(1441);
    expect(parseClock('12:15pm')).toBe(735);
    expect(parseClock('nope')).toBeNull();
  });
});

describe('I3 — headway bands match transport.js estimateWaitMinutes', () => {
  const mid = (d) => { const b = estimateWaitMinutes(new Date(d)); return (b.min + b.max) / 2; };
  for (const [name, t] of [['weekday peak', tue('08:00')], ['weekday evening peak', tue('18:30')], ['off-peak', tue('12:00')],
    ['late', tue('23:00')], ['before 6', tue('05:30')], ['Saturday morning', sat('08:00')]]) {
    it(name, () => {
      expect(headwayMinutes(t)).toBe(mid(t));
    });
  }
  it('the three midpoints are 2.5, 5 and 6.5 minutes', () => {
    expect(headwayMinutes(tue('08:00'))).toBe(2.5);
    expect(headwayMinutes(tue('12:00'))).toBe(5);
    expect(headwayMinutes(tue('23:00'))).toBe(6.5);
  });
});

describe('I2 — positions are deterministic from the clock, inside the service window only', () => {
  const dtl = SIM.lines.DTL;
  it('no trains at 03:00', () => {
    expect(trainsAt(dtl, tue('03:00'))).toEqual([]);
  });
  it('none just before the first train, some just after', () => {
    const first = dtl.window.weekday[0];
    const at = (m) => Date.parse('2026-11-03T00:00:00+08:00') + m * 60000;
    expect(trainsAt(dtl, at(first) - 60000)).toEqual([]);
    const t = trainsAt(dtl, at(first) + 30000);
    expect(t.length).toBe(2); // one from each end
    expect(new Set(t.map((x) => x.dir))).toEqual(new Set([0, 1]));
  });
  it('none after the last train has finished', () => {
    const last = dtl.window.weekday[1];
    const at = (m) => Date.parse('2026-11-03T00:00:00+08:00') + m * 60000;
    expect(trainsAt(dtl, at(last) + 60000)).toEqual([]);
  });
  it('at noon a line has trains in both directions, about trip ÷ headway each way', () => {
    const t = trainsAt(dtl, tue('12:00'));
    const trip = dtl.runSec.reduce((a, b) => a + b, 0) + DWELL_SEC * (dtl.stations.length - 2);
    const expectEach = trip / 300;
    for (const d of [0, 1]) {
      const n = t.filter((x) => x.dir === d).length;
      expect(n).toBeGreaterThanOrEqual(Math.floor(expectEach) - 1);
      expect(n).toBeLessThanOrEqual(Math.ceil(expectEach) + 1);
    }
  });
  it('deterministic, unique ids, and no two trains in one spot', () => {
    const a = trainsAt(dtl, tue('12:00'));
    expect(trainsAt(dtl, tue('12:00'))).toEqual(a);
    expect(new Set(a.map((x) => x.id)).size).toBe(a.length);
    const spot = (x) => `${x.dir}:${x.from}:${x.to}:${x.f.toFixed(3)}`;
    expect(new Set(a.map(spot)).size).toBe(a.length);
  });
  it('a moving train moves forward from one second to the next', () => {
    const a = trainsAt(dtl, tue('12:00'));
    const b = trainsAt(dtl, tue('12:00') + 1000);
    const moving = a.find((x) => !x.dwelling);
    const same = b.find((x) => x.id === moving.id);
    expect(same).toBeTruthy();
    expect(same.progressSec).toBe(moving.progressSec + 1);
  });
  it('after-midnight running belongs to the previous service day', () => {
    expect(serviceClock(Date.parse('2026-11-04T00:30:00+08:00'))).toEqual({ minute: 1470, weekday: true });
    expect(serviceClock(Date.parse('2026-11-08T00:30:00+08:00'))).toEqual({ minute: 1470, weekday: false });
  });
});

describe('I5 — disrupted, out-of-hours or untimetabled lines draw no trains, and say why', () => {
  it('states', () => {
    expect(simState({ lineCode: null, status: null, sim: SIM, nowMs: tue('12:00') })).toBe('noLine');
    for (const l of ['CGL', 'SLRT', 'PLRT']) expect(simState({ lineCode: l, status: null, sim: SIM, nowMs: tue('12:00') })).toBe('noData');
    expect(simState({ lineCode: 'EWL', status: 'disrupted', sim: SIM, nowMs: tue('12:00') })).toBe('disrupted');
    expect(simState({ lineCode: 'EWL', status: 'closure', sim: SIM, nowMs: tue('12:00') })).toBe('disrupted');
    expect(simState({ lineCode: 'EWL', status: 'normal', sim: SIM, nowMs: tue('03:00') })).toBe('outOfHours');
    expect(simState({ lineCode: 'EWL', status: 'normal', sim: SIM, nowMs: tue('12:00') })).toBe('running');
    expect(simState({ lineCode: 'EWL', status: 'delay', sim: SIM, nowMs: tue('12:00') })).toBe('running');
  });
  it('the panel draws markers only while running', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(c).toMatch(/simState\(/);
    expect(c).toMatch(/state === 'running'/);
  });
});

describe('Geometry — trains follow the drawn line', () => {
  it('half-way between two stations on a straight path is the midpoint', () => {
    const path = [{ lat: 1.30, lng: 103.80 }, { lat: 1.30, lng: 103.90 }];
    const coords = { A1: { lat: 1.30, lng: 103.80 }, A2: { lat: 1.30, lng: 103.90 } };
    const g = lineGeometry(['A1', 'A2'], coords, [path]);
    const p = positionOf({ from: 'A1', to: 'A2', f: 0.5 }, g);
    expect(p.lat).toBeCloseTo(1.30, 6);
    expect(p.lng).toBeCloseTo(103.85, 6);
  });
  it('follows a bend instead of cutting the corner', () => {
    const path = [{ lat: 1.30, lng: 103.80 }, { lat: 1.40, lng: 103.80 }, { lat: 1.40, lng: 103.90 }];
    const coords = { A1: path[0], A2: path[2] };
    const g = lineGeometry(['A1', 'A2'], coords, [path]);
    const p = positionOf({ from: 'A1', to: 'A2', f: 0.5 }, g);
    // Half the path length is the corner itself, not the straight-line midpoint (1.35, 103.85).
    expect(p.lat).toBeCloseTo(1.40, 3);
    expect(p.lng).toBeCloseTo(103.80, 3);
  });
  it('a station with no coordinate gives no position rather than a guess', () => {
    const g = lineGeometry(['A1', 'A2'], { A1: { lat: 1.3, lng: 103.8 } }, []);
    expect(positionOf({ from: 'A1', to: 'A2', f: 0.5 }, g)).toBeNull();
  });
});

describe('I4 — never presented as live', () => {
  // Operator, 01-11 '26, choosing between two options: the sim strings live in their OWN 9-locale table in
  // train-sim.js (as pcn-i18n.js and outside-now-i18n.js do), so the Train app's pinned i18n.js counts do not move.
  const KEYS = ['toggle', 'caption', 'paused', 'outOfHours', 'noData', 'noLine', 'towards', 'next'];
  const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
  for (const k of KEYS) {
    it(`sim string "${k}" exists in all nine locales with the same placeholders`, () => {
      const row = SIM_STRINGS[k];
      expect(row, k).toBeTruthy();
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
      for (const l of LOCALES) {
        expect(typeof row[l] === 'string' && row[l].trim().length > 0, `${k}.${l}`).toBe(true);
        expect(ph(row[l]), `${k}.${l}`).toEqual(ph(row.en));
      }
    });
  }
  it('non-Latin locales are translated, not English copied', () => {
    for (const k of KEYS) for (const l of ['zh', 'ja', 'ko', 'ru']) expect(SIM_STRINGS[k][l], `${k}.${l}`).not.toBe(SIM_STRINGS[k].en);
  });
  it('the caption says it is simulated and not live', () => {
    expect(simT('caption', 'en')).toBe('Simulated from the published timetable, not live train positions');
    expect(simT('towards', 'en', { stn: 'Expo' })).toBe('Towards Expo');
    expect(simT('caption', 'xx')).toBe(SIM_STRINGS.caption.en);
  });
  it('the shared Train string table is untouched', () => {
    expect(src('web/transport/src/i18n.js')).not.toMatch(/sim\./);
  });
  it('the caption is shown whenever the toggle is on, whatever the state', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(c).toMatch(/\{simOn && \(\s*<div[^>]*data-sim-caption/);
  });
  it('markers are ghost-style: hollow, in the line colour', () => {
    const s = ghostMarkerStyle('#009645');
    expect(s.border).toMatch(/#009645/);
    expect(s.background).toMatch(/rgba\(255, ?255, ?255, ?0\.\d+\)/);
  });
  it('the toggle lives in the Train map\'s row and is not kept across a reopen (C2)', () => {
    const c = code('web/transport/src/components/MrtMapPanel.jsx');
    expect(c).toMatch(/key: 'simTrains'/);
    expect(c).toMatch(/useState\(false\)[^\n]*simOn|const \[simOn, setSimOn\] = useState\(false\)/);
    expect(code('web/_shared/lib/kept-settings.js')).not.toMatch(/simTrains/);
  });
});
