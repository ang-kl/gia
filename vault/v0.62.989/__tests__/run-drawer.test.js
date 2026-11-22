// run-drawer.test.js — v0.62.971. Spec: doc/Feature/2026-11-04-run-drawer-and-operating-hours.spec.md.
//
// I1 five of each, oldest out; I2 the trains follow the listed stations; I3 nothing moves out of hours and the header
// says when it resumes; I4 first and last bus kept per route stop, the right day type, holidays as Sunday; I5 the
// newest stop costs its sampling, older stops 1 call each; I6 the footer keeps its height (source pins; the renders
// measure it); I8 no footer tag says Singapore.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createStub } from './redis-stub.js';
import {
  RUN_MAX, RUN_STRINGS, RUN_LOCALES, addRunItem, removeRunItem, stationsToLines, trainResumeAt, formatResume,
  trainResumeText, busResumeText, OPERATOR_NAMES, runButtonsModel,
} from '../web/transport/src/lib/run-state.js';
import * as runStateShared from '../web/_shared/lib/run-state.js';
import * as runStateTrain from '../web/transport/src/lib/run-state.js';
import { createStopBusesLayer } from '../web/transport/src/lib/stop-buses.js';

const require = createRequire(import.meta.url);
const transport = require('../transport.js');
const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const SGT = (iso) => Date.parse(iso + '+08:00');

describe('I1 — five of each; a 6th drops the oldest; a repeat moves to newest; ❌ removes one', () => {
  const k = (n) => ({ key: n, label: n });
  it('adds up to five, in the order added', () => {
    let l = [];
    for (const n of ['a', 'b', 'c', 'd', 'e']) l = addRunItem(l, k(n));
    expect(RUN_MAX).toBe(5);
    expect(l.map((x) => x.key)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
  it('a sixth drops the oldest', () => {
    let l = ['a', 'b', 'c', 'd', 'e'].reduce((acc, n) => addRunItem(acc, k(n)), []);
    l = addRunItem(l, k('f'));
    expect(l.map((x) => x.key)).toEqual(['b', 'c', 'd', 'e', 'f']);
  });
  it('a repeat moves to newest and drops nothing', () => {
    let l = ['a', 'b', 'c'].reduce((acc, n) => addRunItem(acc, k(n)), []);
    l = addRunItem(l, k('a'));
    expect(l.map((x) => x.key)).toEqual(['b', 'c', 'a']);
  });
  it('remove takes one out; an unknown key changes nothing', () => {
    const l = ['a', 'b'].reduce((acc, n) => addRunItem(acc, k(n)), []);
    expect(removeRunItem(l, 'a').map((x) => x.key)).toEqual(['b']);
    expect(removeRunItem(l, 'z').map((x) => x.key)).toEqual(['a', 'b']);
  });
});

describe('I2 — the trains follow the listed stations', () => {
  it('the union of their timetabled lines, in the order first met', () => {
    const st = [{ key: 'Bishan', lines: ['NSL', 'CCL'] }, { key: 'Punggol', lines: ['NEL', 'PLRT'] }, { key: 'City Hall', lines: ['NSL', 'EWL'] }];
    expect(stationsToLines(st)).toEqual(['NSL', 'CCL', 'NEL', 'EWL']);
  });
  it('removing a station removes only the lines no remaining station covers', () => {
    const st = [{ key: 'Bishan', lines: ['NSL', 'CCL'] }, { key: 'City Hall', lines: ['NSL', 'EWL'] }];
    expect(stationsToLines(removeRunItem(st, 'City Hall'))).toEqual(['NSL', 'CCL']);
    expect(stationsToLines(removeRunItem(st, 'Bishan'))).toEqual(['NSL', 'EWL']);
  });
});

describe('I3 — when the trains resume, in the operator\'s words', () => {
  const NSL = { weekday: [330, 1460], weekend: [345, 1460] };
  const BPL = { weekday: [330, 1439], weekend: [345, 1439] };
  it('02:00 on a Tuesday: today at 05:30, no date', () => {
    const now = SGT('2026-11-03T02:00:00');
    const at = trainResumeAt(NSL, now, []);
    expect(formatResume(at, now, 'en')).toBe('05:30');
    expect(trainResumeText({ code: 'NSL', state: 'outOfHours', resumeAt: at, nowMs: now, lang: 'en' })).toBe('NSL Normal train operations will resume at 05:30');
  });
  it('02:00 on a Saturday: the weekend first train, 05:45', () => {
    const now = SGT('2026-11-07T02:00:00');
    expect(formatResume(trainResumeAt(NSL, now, []), now, 'en')).toBe('05:45');
  });
  it('a public holiday uses the weekend time', () => {
    const now = SGT('2026-11-09T02:00:00');   // a Monday
    expect(formatResume(trainResumeAt(NSL, now, ['2026-11-09']), now, 'en')).toBe('05:45');
  });
  it('after the last train, before midnight: tomorrow, with the date', () => {
    const now = SGT('2026-11-03T23:59:30');   // BPL's last train is 23:59
    const at = trainResumeAt(BPL, now, []);
    expect(formatResume(at, now, 'en')).toBe('05:30, Wed 4 Nov');
    expect(trainResumeText({ code: 'BPL', state: 'outOfHours', resumeAt: at, nowMs: now, lang: 'en' })).toBe('BPL Normal train operations will resume at 05:30, Wed 4 Nov');
  });
  it('a disruption gives LTA\'s own text, never a made-up time; a running line gives nothing', () => {
    const now = SGT('2026-11-03T12:00:00');
    expect(trainResumeText({ code: 'EWL', state: 'disrupted', raw: 'No train service between Jurong East and Boon Lay', nowMs: now, lang: 'en' })).toBe('EWL No train service between Jurong East and Boon Lay');
    expect(trainResumeText({ code: 'EWL', state: 'disrupted', raw: '', nowMs: now, lang: 'en' })).toMatch(/^EWL \S/);
    expect(trainResumeText({ code: 'EWL', state: 'running', nowMs: now, lang: 'en' })).toBeNull();
  });
  it('the bus line, with the operator\'s name', () => {
    const now = SGT('2026-11-03T02:00:00');
    expect(OPERATOR_NAMES).toMatchObject({ SBST: 'SBS Transit', SMRT: 'SMRT Buses', TTS: 'Tower Transit Singapore', GAS: 'Go-Ahead Singapore' });
    expect(busResumeText({ operator: 'SBST', resumeAt: SGT('2026-11-03T05:45:00'), nowMs: now, lang: 'en' })).toBe('SBS Transit operations will resume at 05:45');
  });
  it('the strings are in nine locales, translated, with their placeholders', () => {
    expect(RUN_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    for (const [k, row] of Object.entries(RUN_STRINGS)) {
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
      for (const l of RUN_LOCALES) {
        expect(typeof row[l] === 'string' && row[l].trim().length > 0, `${k}.${l}`).toBe(true);
        expect(ph(row[l]), `${k}.${l}`).toEqual(ph(row.en));
      }
      for (const l of ['zh', 'ja', 'ko', 'ru']) expect(row[l], `${k}.${l}`).not.toBe(row.en);
    }
  });
  it('the shared file is the Train one', () => {
    for (const k of Object.keys(runStateTrain)) expect(runStateShared[k], k).toBe(runStateTrain[k]);
  });
});

// ── the server: first and last bus per route stop, and when an operator resumes ──────────────────────────────────
const STOPS = Array.from({ length: 6 }, (_, i) => ({ code: String(80000 + i), lat: 1.30 + i * 0.002, lng: 103.85, name: `S${i}` }));
function rows({ fb = '0530', lb = '0030', satFb = '0545', sunFb = '0600' } = {}) {
  const r = [];
  STOPS.forEach((s, i) => r.push({ ServiceNo: '10', Operator: 'SBST', Direction: 1, StopSequence: i + 1, BusStopCode: s.code, Distance: i, WD_FirstBus: fb, WD_LastBus: lb, SAT_FirstBus: satFb, SAT_LastBus: lb, SUN_FirstBus: sunFb, SUN_LastBus: lb }));
  STOPS.forEach((s, i) => r.push({ ServiceNo: '77', Operator: 'SMRT', Direction: 1, StopSequence: i + 1, BusStopCode: s.code, Distance: i, WD_FirstBus: '0600', WD_LastBus: '2330', SAT_FirstBus: '0600', SAT_LastBus: '2330', SUN_FirstBus: '0630', SUN_LastBus: '2330' }));
  return r;
}
function lta({ routes = rows(), arrivals = {} } = {}) {
  const log = [];
  return {
    log,
    async get(url, { params } = {}) {
      log.push({ url, params });
      if (url.endsWith('/BusRoutes')) return { data: { value: Number(params?.$skip || 0) ? [] : routes } };
      if (url.endsWith('/BusArrival')) return { data: { Services: arrivals[params.BusStopCode] || [] } };
      throw new Error('unexpected ' + url);
    },
  };
}
const bus = (min) => ({ EstimatedArrival: new Date(Date.now() + min * 60000).toISOString(), Latitude: '1.3', Longitude: '103.85', VisitNumber: '1' });

describe('I4 — first and last bus per route stop; the day type; holidays as Sunday', () => {
  let redis;
  beforeEach(async () => {
    redis = createStub();
    process.env.LTA_ACCOUNT_KEY = 'test-key';
    for (const s of STOPS) await redis.hSet(`lta:busstop:${s.code}`, { code: s.code, description: s.name, roadName: 'R', lat: String(s.lat), lng: String(s.lng) });
    await transport.refreshRoutes(redis, { http: lta() });
  });

  it('the route cache keeps each stop\'s first and last bus for weekday, Saturday and Sunday', async () => {
    const list = JSON.parse(await redis.get('lta:busroute:10:1'));
    expect(list[0]).toMatchObject({ code: '80000', fb: [330, 345, 360], lb: [30, 30, 30] });
  });
  it('times changing alone does not throw away a cached road shape (only the stop codes count)', async () => {
    await redis.set('lta:busroute:shape:10:1', JSON.stringify({ sig: 'x', points: [[1, 2]] }));
    await transport.refreshRoutes(redis, { http: lta({ routes: rows({ fb: '0540' }) }), force: true });
    expect(await redis.get('lta:busroute:shape:10:1')).not.toBeNull();
  });
  it('02:00 on a Tuesday, no buses: SBS Transit resumes 05:30, SMRT Buses 06:00', async () => {
    const now = SGT('2026-11-03T02:00:00');
    const r = await transport.stopResume(redis, '80002', { http: lta(), now: () => now, isHoliday: () => false });
    expect(r.operators.map((o) => [o.operator, o.name, formatResume(o.resumeAt, now, 'en')])).toEqual([['SBST', 'SBS Transit', '05:30'], ['SMRT', 'SMRT Buses', '06:00']]);
  });
  it('a Sunday uses Sunday times, and so does a public holiday', async () => {
    const sun = SGT('2026-11-08T02:00:00');
    const r1 = await transport.stopResume(redis, '80002', { http: lta(), now: () => sun, isHoliday: () => false });
    expect(r1.operators.find((o) => o.operator === 'SBST').resumeAt).toBe(SGT('2026-11-08T06:00:00'));
    const mon = SGT('2026-11-09T02:00:00');
    const r2 = await transport.stopResume(redis, '80002', { http: lta(), now: () => mon, isHoliday: (iso) => iso === '2026-11-09' });
    expect(r2.operators.find((o) => o.operator === 'SBST').resumeAt).toBe(SGT('2026-11-09T06:00:00'));
  });
  it('after the last bus but before midnight: tomorrow\'s first bus', async () => {
    const now = SGT('2026-11-03T23:45:00');   // service 77 ended at 23:30; service 10 still runs to 00:30
    const r = await transport.stopResume(redis, '80002', { http: lta(), now: () => now, isHoliday: () => false });
    expect(r.operators.map((o) => o.operator)).toEqual(['SMRT']);
    expect(r.operators[0].resumeAt).toBe(SGT('2026-11-04T06:00:00'));
  });
  it('an operator with a bus on the feed is not reported; inside hours with no bus is not reported either', async () => {
    const now = SGT('2026-11-03T02:00:00');
    const r = await transport.stopResume(redis, '80002', { http: lta({ arrivals: { 80002: [{ ServiceNo: '10', Operator: 'SBST', NextBus: bus(3), NextBus2: {}, NextBus3: {} }] } }), now: () => now, isHoliday: () => false });
    expect(r.operators.map((o) => o.operator)).toEqual(['SMRT']);
    const noon = SGT('2026-11-03T12:00:00');
    expect((await transport.stopResume(redis, '80003', { http: lta(), now: () => noon, isHoliday: () => false })).operators).toEqual([]);
  });
  it('index.js serves stop-resume and adds the public holidays to the line status', () => {
    const src = code('index.js');
    expect(src).toMatch(/app\.get\('\/api\/transport\/stop-resume', async \(req, res\)/);
    expect(src).toMatch(/transport\.stopResume\(redis, stopCode/);
    expect(src).toMatch(/publicHolidays/);
  });
});

// ── the shared controller at 02:00 (added during mutation testing: no test drove the controller out of hours) ──────
describe('I3 — the Hawker / Cuisine controller at 02:00 draws no trains and reports when they resume', () => {
  it('City Hall at 02:00 Tuesday: no layer, both lines out of hours, the two resume lines', async () => {
    const { createStationSimController } = await import('../web/_shared/lib/station-sim-controller.js');
    const RAW = JSON.parse(read('data/mrt-coords.json'));
    const STATIONS = Object.entries(RAW).filter(([n]) => !n.startsWith('_')).map(([name, v]) => ({
      name, lat: Number(v.lat), lng: Number(v.lng), codes: v.codes || [], lines: v.lines || [],
    })).filter((v) => Number.isFinite(v.lat));
    const fetchJson = async (u) => {
      if (u === '/api/transport/stations') return { stations: STATIONS };
      if (u === '/api/transport/line-paths') return { paths: {} };
      if (u === '/api/transport/status') return { statusByLine: {}, publicHolidays: [] };
      throw new Error('unexpected ' + u);
    };
    const made = [];
    class Marker { constructor(o) { Object.assign(this, o || {}); made.push(this); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } addListener() { return { remove() {} }; } }
    const gmaps = { Marker, InfoWindow: class { setContent() {} setPosition() {} open() {} close() {} }, SymbolPath: { CIRCLE: 0 }, marker: null };
    const states = [];
    vi.useFakeTimers();
    globalThis.document = { createElement: () => ({ style: {}, setAttribute() {}, addEventListener() {} }) };
    try {
      const c = createStationSimController({}, gmaps, { fetchJson, onState: (s) => states.push(s), now: () => SGT('2026-11-03T02:00:00'), lang: 'en' });
      await c.addStation(STATIONS.find((s) => s.name === 'City Hall'));
      expect(c.layerCount()).toBe(0);
      expect(made.filter((m) => m.map)).toHaveLength(0);
      expect(states.at(-1).lines).toEqual([{ code: 'NSL', state: 'outOfHours' }, { code: 'EWL', state: 'outOfHours' }]);
      expect(states.at(-1).resume).toEqual([
        'NSL Normal train operations will resume at 05:30',
        'EWL Normal train operations will resume at 05:31',
      ]);
      c.stopAll();
    } finally {
      vi.useRealTimers();
      delete globalThis.document;
    }
  });
});

// ── the footer row (added during mutation testing: the name pins could not see a row moved out of the footer) ──────
describe('I6 — the buttons sit IN the footer row, right before its back button', () => {
  it('Train, Cuisine: the next button after <FooterRunButtons is the back / end button, in the same row', () => {
    for (const [file, back] of [['web/transport/src/App.jsx', "t('fab.backAria', lang)"], ['web/cuisine/src/v2/App.jsx', "t('btn.fabBackAria', lang)"]]) {
      const src = code(file);
      const at = src.indexOf('<FooterRunButtons');
      expect(at, file).toBeGreaterThan(0);
      const after = src.slice(at);
      const next = after.indexOf('<button');
      expect(after.slice(next, next + 1200), file).toContain(back);
      // `code()` leaves `{}` where a JSX comment was; `)}` closes the Train list-only ⇡ button.
      expect(src.slice(Math.max(0, at - 120), at), file).toMatch(/<\/button>[\s(){}]*$/);
    }
  });
  it('Hawker: FooterDock renders {runButtons} once, between ⇡ top and ↩ back, and no row of its own', () => {
    const src = code('web/hawker/src/App.jsx');
    const dock = src.slice(src.indexOf('function FooterDock('), src.indexOf('\nfunction ', src.indexOf('function FooterDock(') + 10));
    expect(dock.split('{runButtons}').length - 1).toBe(1);
    const at = dock.indexOf('{runButtons}');
    expect(dock.slice(Math.max(0, at - 120), at)).toMatch(/btn\.fabDown', lang\)\}<\/button>[\s{}]*$/);
    expect(dock.slice(at, at + 200)).toMatch(/^\{runButtons\}\s*<button\s+type="button"\s+onClick=\{onBackEnd\}/);
    expect(dock).not.toMatch(/runButtons\s*&&/);
  });
});

// ── the phone layer: up to five stops, the newest in full ────────────────────────────────────────────────────────
describe('I1, I5 — the stop layer holds five stops; only the newest is sampled in full', () => {
  function fakeGmaps() {
    class Obj { constructor(o) { Object.assign(this, o || {}); } setMap(m) { this.map = m; } setPosition(p) { this.position = p; } addListener() { return { remove() {} }; } close() {} open() {} setContent() {} }
    return { Marker: Obj, InfoWindow: Obj, SymbolPath: { CIRCLE: 0 }, marker: null };
  }
  function harness() {
    const calls = [];
    const states = [];
    const fetchJson = async (u) => {
      calls.push(u);
      const c = new URL(u, 'http://x').searchParams.get('code');
      if (u.startsWith('/api/transport/stop-buses')) return { code: c, readAt: 1, services: [{ service: '7', coming: [{ lat: 1.3, lng: 103.8, minutes: 2 }], going: [{ lat: 1.31, lng: 103.8, minutes: 4 }] }] };
      if (u.startsWith('/api/transport/bus-arrival')) return { code: c, services: [{ service: '7', operator: 'SBST', next: { lat: 1.3, lng: 103.8, minutes: 3 }, next2: { lat: 1.29, lng: 103.8, minutes: 9 }, next3: { lat: 1.28, lng: 103.8, minutes: 15 } }] };
      if (u.startsWith('/api/transport/stop-resume')) return { code: c, operators: [] };
      throw new Error('unexpected ' + u);
    };
    const layer = createStopBusesLayer({}, fakeGmaps(), { fetchJson, onState: (s) => states.push(s), lang: 'en' });
    return { calls, states, layer };
  }
  const by = (calls, prefix) => calls.filter((u) => u.startsWith(prefix)).map((u) => new URL(u, 'http://x').searchParams.get('code'));
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('a second stop is added, not swapped; the newest uses stop-buses, the older bus-arrival', async () => {
    const h = harness();
    await h.layer.show('60001', 'A');
    await h.layer.show('60002', 'B');
    expect(h.states.at(-1).stops.map((s) => s.code)).toEqual(['60001', '60002']);
    h.calls.length = 0;
    await vi.advanceTimersByTimeAsync(30000);
    expect(by(h.calls, '/api/transport/stop-buses')).toEqual(['60002']);
    expect(by(h.calls, '/api/transport/bus-arrival')).toEqual(['60001']);
    expect(by(h.calls, '/api/transport/stop-resume').sort()).toEqual(['60001', '60002']);
  });
  it('an older stop draws only its 2 coming buses', async () => {
    const h = harness();
    await h.layer.show('60001', 'A');   // newest: 1 coming + 1 going
    expect(h.layer.count()).toBe(2);
    await h.layer.show('60002', 'B');   // 60001 becomes older: 2 coming; 60002 newest: 1 + 1
    expect(h.layer.count()).toBe(4);
  });
  it('a sixth stop drops the oldest', async () => {
    const h = harness();
    for (const c of ['60001', '60002', '60003', '60004', '60005', '60006']) await h.layer.show(c, c);
    expect(h.states.at(-1).stops.map((s) => s.code)).toEqual(['60002', '60003', '60004', '60005', '60006']);
  });
  it('remove() takes one stop out; removing the last ends the view and every fetch', async () => {
    const h = harness();
    await h.layer.show('60001', 'A');
    await h.layer.show('60002', 'B');
    h.layer.remove('60002');
    expect(h.states.at(-1).stops.map((s) => s.code)).toEqual(['60001']);
    h.layer.remove('60001');
    expect(h.states.at(-1)).toMatchObject({ active: false });
    const n = h.calls.length;
    await vi.advanceTimersByTimeAsync(120000);
    expect(h.calls).toHaveLength(n);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('I6 — the footer buttons, the drawer and the header strip (models and source pins)', () => {
  it('a button per kind while something is listed, with the count', () => {
    expect(runButtonsModel({ stations: [{ key: 'a' }, { key: 'b' }], stops: [] })).toEqual({ train: '🚇 2', bus: null });
    expect(runButtonsModel({ stations: [], stops: [{ code: '1' }] })).toEqual({ train: null, bus: '🚍 1' });
    expect(runButtonsModel({ stations: [], stops: [] })).toEqual({ train: null, bus: null });
  });
  it('the drawer is 70% wide (15% each side), at most 45% tall, scrolls, with a ❌ per row', () => {
    const src = code('web/_shared/components/RunDrawer.jsx');
    expect(src).toMatch(/left: '15%'/);
    expect(src).toMatch(/right: '15%'/);
    expect(src).toMatch(/maxHeight: '45vh'/);
    expect(src).toMatch(/overflowY: 'auto'/);
    expect(src).toMatch(/❌/);
    expect(src).toMatch(/createPortal\(/);
  });
  it('each app puts the buttons just before its back button, has the resume strip, and no chip row', () => {
    const t = code('web/transport/src/App.jsx');
    expect(t.indexOf('<FooterRunButtons')).toBeGreaterThan(0);
    expect(t.indexOf('<FooterRunButtons')).toBeLessThan(t.indexOf("fab.back"));
    const h = code('web/hawker/src/App.jsx');
    expect(h).toMatch(/<FooterRunButtons/);
    const c = code('web/cuisine/src/v2/App.jsx');
    expect(c).toMatch(/<FooterRunButtons/);
    for (const [name, src] of [['transport', t], ['hawker', h], ['cuisine', c]]) {
      expect(src, name).toMatch(/<ResumeStrip /);
      expect(src, name).not.toMatch(/FooterRunChips/);
    }
    expect(fs.existsSync('web/_shared/components/FooterRunChips.jsx')).toBe(false);
  });
});

describe('I8 — no footer tag says Singapore, in any locale; each still says Experimental', () => {
  const PLACE = /Singapore|Singapour|Singapur|Singapura|Сингапур|新加坡|シンガポール|싱가포르/;
  it('the Train, Hawker and Menu footer.tag and the Clipboard chrome.experimental, every value', () => {
    for (const [file, key] of [['web/transport/src/i18n.js', 'footer.tag'], ['web/hawker/src/i18n.js', 'footer.tag'], ['web/menu/src/i18n.js', 'footer.tag'], ['web/clipboard/src/lib/i18n.js', 'chrome.experimental']]) {
      const lines = read(file).split('\n').filter((l) => l.includes(`'${key}'`) || l.includes(`"${key}"`));
      expect(lines.length, file).toBeGreaterThan(0);
      for (const l of lines) expect(l, `${file}: ${l.trim()}`).not.toMatch(PLACE);
      expect(lines.join('\n'), file).toMatch(/Experimental|Expérimental|Eksperimental/);
    }
  });
  it('Cuisine\'s tag has no region part', () => {
    const c = read('web/cuisine/src/v2/App.jsx');
    const at = c.indexOf("{t('footer.experimental', lang)}");
    expect(at).toBeGreaterThan(0);
    expect(c.slice(at, at + 300)).not.toMatch(/region\.singapore|region\.johor|region\.others/);
  });
});
