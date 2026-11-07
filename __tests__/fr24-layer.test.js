// fr24-layer.test.js — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md (amendments 1 and 2).
//
// The phone half of the Flightradar24 pilot, in the Train Mini App: two pins (Changi, Seletar) drawn only when the
// server says this reader has access; a movements board per pin with Departures and Arrivals tabs; planes only on
// "Show planes"; a flight card on a plane or row tap; positions moved by estimate for at most 2 minutes, labelled.
// Invariants: I2, I6, I7, I8, I12, I14 (client half).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import {
  FR24_LOCALES, FR24_STRINGS, FR24_AIRPORTS, DR_MAX_SEC, ft, deadReckon, etaMinutes, sgtClock, captionText,
  boardModel, flightCardHtml, flightCardLines, createFr24Layer, planeSvg, PLANE_FILL, PLANE_PICKED, FR24_PINS,
} from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const server = require('../fr24.js');

const T0 = Date.parse('2026-11-05T06:00:00Z'); // 14:00 SGT
const OUR_URLS = /^\/api\/fr24\/(access|board\/(WSSS|WSSL)\?dir=(dep|arr)|airport\/(WSSS|WSSL)|flight\/[0-9a-f]+|locate\/[A-Z0-9]{2,8}|gates\/(WSSS|WSSL)\?ids=[0-9a-f,]+|track\/[0-9a-f]+|eta\/(WSSS|WSSL)\?dir=(dep|arr)&cs=[A-Z0-9,]+)$|^\/api\/weather\/outside\?/;

function fakeGmaps() {
  const made = [];
  class Marker {
    constructor(o) { Object.assign(this, o || {}); this.listeners = {}; made.push(this); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; } getPosition() { return this.position; }
    setIcon(i) { this.icon = i; }
    addListener(ev, fn) { this.listeners[ev] = fn; return { remove() {} }; }
  }
  made.lines = [];
  class Polyline {
    constructor(o) { Object.assign(this, o || {}); made.lines.push(this); }
    setMap(m) { this.map = m; }
  }
  class InfoWindow {
    constructor(o) { Object.assign(this, o || {}); this.contents = []; this.isOpen = false; this.listeners = {}; made.iws = (made.iws || []).concat(this); }
    addListener(ev, fn) { this.listeners[ev] = fn; return { remove() {} }; }
    setContent(c) { this.contents.push(c); } setPosition(p) { this.position = p; }
    open() { this.isOpen = true; } close() { this.isOpen = false; }
  }
  return { gmaps: { Marker, InfoWindow, Polyline, SymbolPath: { CIRCLE: 0, FORWARD_CLOSED_ARROW: 1 }, marker: null }, made };
}
const planesPayload = () => ({
  ok: true, source: 'Flightradar24', readAt: new Date(T0).toISOString(),
  planes: [
    { id: '3a000001', callsign: 'SIA1', lat: 1.30, lng: 104.10, track: 270, gspeed: 180, alt: 3000 },
    { id: '3a000002', callsign: 'SIA2', lat: 1.40, lng: 103.95, track: 45, gspeed: 300, alt: 9000 },
  ],
});
const boardPayload = (dir) => ({
  ok: true, dir, source: 'Flightradar24', readAt: new Date(T0).toISOString(),
  rows: [
    { id: '3b000001', flight: 'SQ1', callsign: 'SIA1', airline: 'SIA', type: 'A359', takeoff: '2026-11-05T05:10:00Z', landed: null, ended: false,
      orig: { code: 'WSSS', iata: 'SIN', city: 'Singapore', name: 'Singapore Changi Airport' }, dest: { code: 'EGLL', iata: 'LHR', city: 'London', name: 'London Heathrow Airport' } },
    { id: '3b000002', flight: 'TR2', callsign: 'TGW2', airline: 'TGW', type: 'A320', takeoff: '2026-11-05T04:00:00Z', landed: '2026-11-05T05:30:00Z', ended: true,
      orig: { code: 'VTBS', iata: 'BKK', city: 'Bangkok', name: 'Suvarnabhumi Airport' }, dest: { code: 'ZZZZ' } },
  ],
});
function harness({ enabled = true, gates = null, track = null, flightExtra = {}, eta = null } = {}) {
  const calls = [];
  const states = [];
  const fetchJson = async (u) => {
    calls.push(u);
    if (u.startsWith('/api/fr24/gates/')) return typeof gates === 'function' ? gates(u) : (gates || { ok: true, gates: {} });
    if (u === '/api/fr24/access') return { ok: true, enabled };
    if (u.startsWith('/api/fr24/board/')) return boardPayload(new URL(u, 'http://x').searchParams.get('dir'));
    if (u.startsWith('/api/fr24/airport/')) return planesPayload();
    if (u.startsWith('/api/fr24/track/')) return typeof track === 'function' ? track(u) : track;
    if (u.startsWith('/api/fr24/eta/')) return typeof eta === 'function' ? eta(u) : eta;
    if (u.startsWith('/api/fr24/flight/')) return { ok: true, flight: boardPayload('dep').rows[0], ...flightExtra };
    if (u.startsWith('/api/fr24/locate/')) return { ok: true, callsign: u.split('/').pop(), plane: { id: '3b000001', callsign: 'SIA1', lat: 1.31, lng: 104.12, track: 300, gspeed: 250, alt: 6000 } };
    if (u.startsWith('/api/weather/outside')) return { ok: true, inSg: true, rows: { lightning: { status: 'ok', level: 'warn', count: 3, nearestKm: 2.1, at: '2026-11-05T05:58:00Z' } } };
    return null;
  };
  const { gmaps, made } = fakeGmaps();
  let t = T0;
  const boards = [];
  const pans = [];
  const map = { panTo: (p) => pans.push(p) };
  const layer = createFr24Layer(map, gmaps, { fetchJson, lang: 'en', now: () => t, onState: (s) => states.push(s), onBoard: (b) => boards.push(b) });
  return { calls, states, boards, pans, layer, made, advance: (ms) => { t += ms; } };
}

// ── I2 + I14 — nothing is fetched until a pin is tapped; no pin without access ─────────────────────────────────
describe('I2 / I14 — fetch only on a tap, and pins only for a reader with access', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('creating the layer fetches nothing and draws nothing', () => {
    const { calls, layer, made } = harness();
    expect(calls).toEqual([]);
    expect(made).toHaveLength(0);
    expect(layer.pinCount()).toBe(0);
  });
  // Amendment 5 (I20): no airport marker on the map, ever; the ⋮ menu's Airports row is the way in.
  // Amendment 9 revised (I28) replaces I20's "no airport marker ever": with access, init draws the two airport pins and
  // fetches nothing else.
  it('init asks the server once whether this reader has access, and with access draws the two airport pins only', async () => {
    const { calls, layer, made } = harness();
    expect(await layer.init()).toBe(true);
    expect(calls).toEqual(['/api/fr24/access']);
    expect(layer.pinCount()).toBe(2);
    expect(made.map((m) => m.fr24Pin).sort()).toEqual(['WSSL', 'WSSS']);
  });
  it('without access no pin, no marker, and no further request, whatever is tapped', async () => {
    const { calls, layer, made } = harness({ enabled: false });
    expect(await layer.init()).toBe(false);
    expect(layer.pinCount()).toBe(0);
    expect(made).toHaveLength(0);
    await layer.openBoard('WSSS');
    await layer.togglePlanes('WSSS');
    await layer.openFlight('3b000001');
    expect(calls).toEqual(['/api/fr24/access']);
  });
  it('a failed access check is treated as no access', async () => {
    const { gmaps, made } = fakeGmaps();
    const layer = createFr24Layer({}, gmaps, { fetchJson: async () => null, now: () => T0 });
    expect(await layer.init()).toBe(false);
    expect(made).toHaveLength(0);
  });
  it('a pin tap opens the Departures board only; Arrivals is fetched when its tab opens, once', async () => {
    const { calls, layer } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    const fr = () => calls.filter((u) => u.startsWith('/api/fr24/') && !u.startsWith('/api/fr24/gates/') && !u.startsWith('/api/fr24/eta/'));
    expect(fr()).toEqual(['/api/fr24/access', '/api/fr24/board/WSSS?dir=dep']);
    await layer.setTab('arr');
    expect(fr().at(-1)).toBe('/api/fr24/board/WSSS?dir=arr');
    await layer.setTab('dep');
    await layer.setTab('arr');
    expect(fr()).toHaveLength(3);
  });
  it('picking an airport opens that airport\'s board with exactly one board request, and draws no marker (I20)', async () => {
    const { calls, layer, made, boards } = harness();
    await layer.init();
    await layer.openBoard('WSSL');
    expect(calls.filter((u) => u.startsWith('/api/fr24/board/'))).toEqual(['/api/fr24/board/WSSL?dir=dep']);
    expect(boards.at(-1).icao).toBe('WSSL');
    expect(layer.openIcao()).toBe('WSSL');
    expect(made.filter((m) => !m.fr24Pin)).toHaveLength(0);   // I28: only the two pins; no other marker
    layer.closeBoard();
    expect(layer.openIcao()).toBeNull();
  });
  it('the ⋮ menu carries an Airports row with a Changi / Seletar list, only once access is granted (I20)', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
    expect(src).toMatch(/fr24Enabled\s*\?\s*\[\{\s*key: 'airports'/);
    const i = src.indexOf("key: 'airports'");
    expect(src.slice(i, i + 600)).toMatch(/submenu:/);
    expect(src).toMatch(/key === 'airports'/);
    expect(src).not.toMatch(/drawPins|fr24Pin/);
  });
  it('the Airports ▾ entries can be tapped while the row is unticked; Park keeps "tick the row first" (I22)', () => {
    // Amendment 7: on v0.62.975 the shared menu disabled every ▾ entry while its row was off, so Changi and Seletar
    // were grey and nothing opened (operator, 05-11 '26: "cannot click the airport for details").
    const mc = fs.readFileSync(path.join(process.cwd(), 'web/_shared/components/MapControls.jsx'), 'utf8');
    const entry = mc.slice(mc.indexOf('subRows.map('), mc.indexOf('subRows.map(') + 700);
    expect(entry).toMatch(/disabled=\{!pickable\}/);
    expect(mc).toMatch(/const pickable = on \|\| \(!!sub\?\.pickWhenOff && !it\.disabled\)/);
    expect(entry).not.toMatch(/disabled=\{!on\}/);
    const panel = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
    const i = panel.indexOf("key: 'airports'");
    expect(panel.slice(i, panel.indexOf('] : []),', i))).toMatch(/pickWhenOff: true/);
    expect(panel.match(/pickWhenOff/g)).toHaveLength(1);
    // Park's ▾ (pcnSubmenu) does not opt in, and no other app sets the flag.
    for (const f of ['web/hawker/src', 'web/cuisine/src', 'web/_shared']) {
      const files = fs.readdirSync(path.join(process.cwd(), f), { recursive: true }).filter((n) => /\.jsx?$/.test(n));
      for (const n of files) {
        const s = fs.readFileSync(path.join(process.cwd(), f, n), 'utf8');
        if (!/MapControls\.jsx$/.test(n)) expect(s, `${f}/${n}`).not.toMatch(/pickWhenOff/);
      }
    }
  });
  it('planes are fetched only on Show planes, and a second tap hides them with no fetch', async () => {
    const { calls, layer } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    expect(calls.some((u) => u.startsWith('/api/fr24/airport/'))).toBe(false);
    await layer.togglePlanes('WSSS');
    expect(calls.filter((u) => u.startsWith('/api/fr24/airport/'))).toEqual(['/api/fr24/airport/WSSS']);
    expect(layer.planeCount()).toBe(2);
    await layer.togglePlanes('WSSS');
    expect(layer.planeCount()).toBe(0);
    expect(calls.filter((u) => u.startsWith('/api/fr24/airport/'))).toHaveLength(1);
  });
  it('no polling: ten minutes with planes shown make no further request, and the animation timer ends at 2 minutes', async () => {
    const { calls, layer } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    const n = calls.length;
    expect(vi.getTimerCount()).toBe(1);               // the once-a-second move
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
    expect(calls).toHaveLength(n);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('the refresh button fetches the planes again, once', async () => {
    const { calls, layer } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    await layer.refresh();
    expect(calls.filter((u) => u.startsWith('/api/fr24/airport/'))).toHaveLength(2);
  });
  it('a plane tap fetches that flight once and opens its card', async () => {
    const { calls, layer, made } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    const plane = made.find((m) => m.fr24Plane === '3a000001');
    await plane.listeners.click();
    expect(calls).toContain('/api/fr24/flight/3a000001');
  });
  it('every URL the layer asks is one of our own routes, never FR24 itself', async () => {
    const { calls, layer, made } = harness();
    await layer.init();
    await layer.openBoard('WSSL');
    await layer.setTab('arr');
    await layer.togglePlanes('WSSL');
    await made.find((m) => m.fr24Plane).listeners.click();
    for (const u of calls) expect(u).toMatch(OUR_URLS);
  });
  it('destroy removes every marker and timer', async () => {
    const { layer } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    expect(layer.pinCount()).toBe(2);
    layer.destroy();
    expect(layer.pinCount()).toBe(0);
    expect(layer.planeCount()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});

// ── I6 — labelled honestly ──────────────────────────────────────────────────────────────────────────────────────
describe('I6 — Flightradar24 and the reading time are on screen while planes are; an ETA says estimate', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('the caption names Flightradar24 and the reading time in SGT, and says positions are moved by estimate', () => {
    const c = captionText({ readAt: new Date(T0).toISOString(), lang: 'en', moving: true });
    expect(c).toContain('Flightradar24');
    expect(c).toContain('14:00:00');
    expect(c).toContain('SGT');
    expect(c).toMatch(/estimate/);
    const still = captionText({ readAt: new Date(T0).toISOString(), lang: 'en', moving: false });
    expect(still).toContain('14:00:00');
    expect(still).not.toMatch(/moved by estimate/);
  });
  it('the layer reports the caption while planes are shown, and clears it when they are hidden', async () => {
    const { states, layer } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    expect(states.at(-1)).toMatchObject({ planes: true, icao: 'WSSS' });
    expect(states.at(-1).caption).toContain('Flightradar24');
    await vi.advanceTimersByTimeAsync(DR_MAX_SEC * 1000 + 2000);
    expect(states.at(-1).caption).not.toMatch(/moved by estimate/);
    await layer.togglePlanes('WSSS');
    expect(states.at(-1)).toMatchObject({ planes: false });
  });
  it('an inbound plane\'s card shows the landing time as an estimate, in every locale', () => {
    const flight = boardPayload('arr').rows[0];
    const plane = { id: '3a000001', lat: 1.35019, lng: 104.30, gspeed: 240, track: 270, alt: 4000 };
    for (const lang of FR24_LOCALES) {
      const html = flightCardHtml({ flight: { ...flight, dest: { code: 'WSSS', iata: 'SIN', city: 'Singapore' } }, plane, icao: 'WSSS', lang });
      expect(html).toContain(ft('card.estimate', lang));
    }
  });
  it('an outbound plane has no landing estimate', () => {
    const html = flightCardHtml({ flight: boardPayload('dep').rows[0], plane: planesPayload().planes[0], icao: 'WSSS', lang: 'en' });
    expect(html).not.toContain(ft('card.estimate', 'en'));
  });
  it('etaMinutes: distance over ground speed, none when the speed is too low to say', () => {
    // 0.3 degrees of longitude at 1.35 N is 33.35 km; 240 kt is 444.48 km/h: 4.502 min, rounded to 5.
    expect(etaMinutes({ lat: 1.35019, lng: 104.294, gspeed: 240 }, 'WSSS')).toBe(5);
    expect(etaMinutes({ lat: 1.35019, lng: 104.294, gspeed: 20 }, 'WSSS')).toBeNull();
    expect(etaMinutes({ lat: 1.35, lng: 104.29 }, 'WSSS')).toBeNull();
  });
  it('the board model carries the footer naming what Flightradar24 does not publish, and the actual-times header', () => {
    const m = boardModel({ icao: 'WSSS', dir: 'dep', data: boardPayload('dep'), lang: 'en' });
    expect(m.footer).toBe(ft('board.footer', 'en'));
    expect(m.header).toContain('actual times, not the schedule');
    expect(m.header).toContain('Flightradar24');
  });
});

// ── I7 — dead reckoning ─────────────────────────────────────────────────────────────────────────────────────────
describe('I7 — a plane moves along its heading by speed x time, and stops after 2 minutes', () => {
  it('north at 180 kt for 60 s is 5.556 km north', () => {
    const p = deadReckon({ lat: 1.0, lng: 104.0, track: 0, gspeed: 180 }, 60);
    expect(p.lat - 1.0).toBeCloseTo(5.556 / 111.195, 4);
    expect(p.lng).toBeCloseTo(104.0, 6);
  });
  it('east at 180 kt moves longitude, not latitude', () => {
    const p = deadReckon({ lat: 1.0, lng: 104.0, track: 90, gspeed: 180 }, 60);
    expect(p.lat).toBeCloseTo(1.0, 6);
    expect(p.lng).toBeGreaterThan(104.0);
  });
  it('time is clamped to 2 minutes, and never runs backwards', () => {
    const a = deadReckon({ lat: 1, lng: 104, track: 0, gspeed: 180 }, DR_MAX_SEC);
    const b = deadReckon({ lat: 1, lng: 104, track: 0, gspeed: 180 }, 3600);
    expect(b).toEqual(a);
    expect(DR_MAX_SEC).toBe(120);
    expect(deadReckon({ lat: 1, lng: 104, track: 0, gspeed: 180 }, -30)).toEqual({ lat: 1, lng: 104 });
  });
  it('a plane without speed or heading stays put', () => {
    expect(deadReckon({ lat: 1, lng: 104 }, 60)).toEqual({ lat: 1, lng: 104 });
  });
});

// ── I8 — nine locales ───────────────────────────────────────────────────────────────────────────────────────────
describe('I8 — every string exists in nine locales', () => {
  it('nine locales, the same as the rest of the app', () => {
    expect(FR24_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });
  it('every key has every locale, non-empty, with the English placeholders and no others', () => {
    for (const [key, row] of Object.entries(FR24_STRINGS)) {
      const ph = (s) => (s.match(/\{\w+\}/g) || []).sort().join(',');
      for (const l of FR24_LOCALES) {
        expect(row[l], `${key}.${l}`).toBeTruthy();
        expect(ph(row[l]), `${key}.${l} placeholders`).toBe(ph(row.en));
      }
    }
  });
  it('no non-English locale silently serves the English, bar the proper nouns', () => {
    const SAME_OK = new Set(['pin.WSSL', 'pin.WSSS', 'col.flight']);
    for (const [key, row] of Object.entries(FR24_STRINGS)) {
      if (SAME_OK.has(key)) continue;
      for (const l of FR24_LOCALES.filter((x) => x !== 'en')) expect(row[l], `${key}.${l}`).not.toBe(row.en);
    }
  });
  it('ft falls back to English and fills placeholders', () => {
    expect(ft('status.landed', 'xx', { time: '13:05' })).toBe('Landed 13:05');
    expect(ft('nope', 'en')).toBe('nope');
  });
});

// ── I12 — the board never claims what FR24 lacks ───────────────────────────────────────────────────────────────
describe('I12 — the board is not Changi\'s board', () => {
  it('Departures rows: SGT take-off time, destination name and code, flight, aircraft, status', () => {
    const m = boardModel({ icao: 'WSSS', dir: 'dep', data: boardPayload('dep'), lang: 'en' });
    expect(m.state).toBe('ok');
    expect(m.rows[0]).toMatchObject({ id: '3b000001', time: '🛫 13:10', place: 'London (LHR)', flight: 'SQ1', type: 'A359', status: '✈️ In the air', inAir: true, callsign: 'SIA1', airline: 'SIA' });
    expect(m.rows[1]).toMatchObject({ status: '🛬 Landed 13:30', inAir: false, place: 'ZZZZ' });   // unknown code as itself
    expect(m.labels).toEqual({ time: 'Took off', place: 'To', flight: 'Flight', type: 'Aircraft', status: 'Status' });
  });
  it('Arrivals rows show origins and landed times', () => {
    const m = boardModel({ icao: 'WSSS', dir: 'arr', data: boardPayload('arr'), lang: 'en' });
    expect(m.rows[1]).toMatchObject({ place: 'Bangkok (BKK)', time: '🛬 13:30' });
    expect(m.rows[0]).toMatchObject({ time: '🛫 13:10', status: '✈️ In the air' });   // still flying: its take-off from the origin
    expect(m.header).toBe(ft('board.header.arr', 'en'));
    expect(m.labels.place).toBe('From');
  });
  it('no terminal, gate or check-in label, in any locale; the model carries no such field', () => {
    for (const lang of FR24_LOCALES) {
      for (const dir of ['dep', 'arr']) {
        const m = boardModel({ icao: 'WSSS', dir, data: boardPayload(dir), lang });
        for (const v of Object.values(m.labels)) expect(v).not.toMatch(/terminal|gate|check-in|boarding/i);
        for (const r of m.rows) expect(Object.keys(r).sort()).toEqual(['airline', 'callsign', 'flight', 'gate', 'id', 'inAir', 'place', 'status', 'time', 'type']);
        expect(m.header).toBe(ft(`board.header.${dir}`, lang));
        expect(m.footer).toBe(ft('board.footer', lang));
      }
    }
  });
  it('the board component draws no image or logo, and renders the actual-times header and the footer', () => {
    // Comments masked: the file's header SAYS "no image or logo is drawn", and prose is not markup.
    const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/Fr24Board.jsx'), 'utf8')
      .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(src).not.toMatch(/<img|logo|<svg/i);
    expect(src).toMatch(/model\.header/);
    expect(src).toMatch(/model\.footer/);
  });
  it('a failure, a busy answer and an empty board each say so, in words', () => {
    expect(boardModel({ icao: 'WSSS', dir: 'dep', data: { ok: false, reason: 'nokey' }, lang: 'en' })).toMatchObject({ state: 'error', message: ft('err.unavailable', 'en') });
    expect(boardModel({ icao: 'WSSS', dir: 'dep', data: { ok: false, reason: 'busy' }, lang: 'en' }).message).toBe(ft('err.busy', 'en'));
    expect(boardModel({ icao: 'WSSS', dir: 'dep', data: { ok: false, reason: 'budget' }, lang: 'en' }).message).toBe(ft('err.budget', 'en'));
    expect(boardModel({ icao: 'WSSS', dir: 'dep', data: { ok: true, rows: [] }, lang: 'en' })).toMatchObject({ state: 'empty', message: ft('board.empty', 'en') });
    expect(boardModel({ icao: 'WSSS', dir: 'dep', loading: true, lang: 'en' }).state).toBe('loading');
  });
  it('lightning is one short line (C9 revised)', async () => {
    vi.useFakeTimers();
    const { layer, boards } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    const wx = boards.at(-1).wx;
    expect(wx).toBe(ft('wx.lightning', 'en', { time: '13:58' }));
    expect(wx.length).toBeLessThanOrEqual(30);
    for (const l of FR24_LOCALES) expect(ft('wx.lightning', l, { time: '13:58' }).length).toBeLessThanOrEqual(30);
    vi.useRealTimers();
  });
});

// ── I15 — the board is a glass overlay in the bottom dock, strip or list ───────────────────────────────────────
describe('I15 — the board in the dock: strip by default, list on request, the carousel out of the way', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('a pin tap emits the board (strip, Departures); ✕ emits null', async () => {
    const { layer, boards } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    expect(boards.at(-1)).toMatchObject({ icao: 'WSSS', dir: 'dep', view: 'strip', state: 'ok' });
    expect(boards.at(-1).rows).toHaveLength(2);
    layer.closeBoard();
    expect(boards.at(-1)).toBeNull();
  });
  it('switching Strip and List changes the view and makes no request', async () => {
    const { layer, boards, calls } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    const n = calls.length;
    layer.setView('list');
    expect(boards.at(-1)).toMatchObject({ view: 'list', rows: boards.at(-2).rows });
    layer.setView('strip');
    expect(boards.at(-1).view).toBe('strip');
    layer.setView('table');
    expect(boards.at(-1).view).toBe('strip');
    expect(calls).toHaveLength(n);
  });
  it('the model names both views and both tabs, each marked active', () => {
    const m = boardModel({ icao: 'WSSS', dir: 'arr', view: 'list', data: boardPayload('arr'), lang: 'en' });
    expect(m.tabs).toEqual([{ dir: 'dep', label: 'Departures', active: false }, { dir: 'arr', label: 'Arrivals', active: true }]);
    expect(m.views).toEqual([{ view: 'strip', label: ft('view.strip', 'en'), active: false }, { view: 'list', label: ft('view.list', 'en'), active: true }]);
  });
  it('the board no longer opens a map popup', async () => {
    const { layer, made } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    expect((made.iws || []).every((w) => w.contents.length === 0)).toBe(true);
  });
  it('App renders the board in the bottom dock instead of the station carousel while it is open', () => {
    const app = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/App.jsx'), 'utf8');
    expect(app).toMatch(/import Fr24Board from '\.\/components\/Fr24Board\.jsx'/);
    expect(app).toMatch(/onFr24BoardChange=\{setFr24Board\}/);
    const dock = app.indexOf('fixed inset-x-0 z-[38]');
    expect(dock).toBeGreaterThan(-1);
    const around = app.slice(app.lastIndexOf('{', dock - 200), dock + 900);
    expect(around).toMatch(/fr24Board\s*\?/);
    expect(around).toMatch(/<Fr24Board /);
    expect(around.indexOf('<Fr24Board ')).toBeLessThan(around.indexOf('<StationCarousel'));
  });
  it('the strip scrolls sideways with snap, the list scrolls down within about 40 % of the screen', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/Fr24Board.jsx'), 'utf8');
    expect(src).toMatch(/overflow-x-auto[^"']*snap-x/);
    expect(src).toMatch(/overflow-y-auto/);
    expect(src).toMatch(/max-h-\[40vh\]/);
    expect(src).toMatch(/liquid-glass/);
  });
});

// ── I19 — sort, three columns, emoji (amendment 4) ─────────────────────────────────────────────────────────────
describe('I19 — sort by time, flight or airline; three-column rows; emoji statuses', () => {
  const many = () => ({ ok: true, rows: [
    { id: 'a1', flight: 'TR602', callsign: 'TGW602', airline: 'TGW', type: 'A320', takeoff: '2026-11-05T05:40:00Z', landed: null, ended: false, dest: { code: 'VTBS', iata: 'BKK', city: 'Bangkok' } },
    { id: 'a2', flight: 'SQ11', callsign: 'SIA11', airline: 'SIA', type: 'B77W', takeoff: '2026-11-05T05:30:00Z', landed: null, ended: false, dest: { code: 'RJTT', iata: 'HND', city: 'Tokyo' } },
    { id: 'a3', flight: 'SQ2', callsign: 'SIA2', airline: 'SIA', type: 'A359', takeoff: '2026-11-05T05:20:00Z', landed: null, ended: false, dest: { code: 'EGLL', iata: 'LHR', city: 'London' } },
    { id: 'a4', flight: 'CX691', callsign: 'CPA691', airline: 'CPA', type: 'A333', takeoff: '2026-11-05T05:10:00Z', landed: '2026-11-05T05:50:00Z', ended: true, dest: { code: 'VHHH', iata: 'HKG', city: 'Hong Kong' } },
    { id: 'a5', flight: null, callsign: 'XYZ1', airline: null, type: 'C172', takeoff: '2026-11-05T05:00:00Z', landed: null, ended: false, dest: { code: 'WMKK' } },
  ] });
  const ids = (m) => m.rows.map((r) => r.id);
  it('Time keeps the newest-first order Flightradar24 sends', () => {
    expect(ids(boardModel({ icao: 'WSSS', dir: 'dep', data: many(), sort: 'time', lang: 'en' }))).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
    expect(ids(boardModel({ icao: 'WSSS', dir: 'dep', data: many(), lang: 'en' }))).toEqual(['a1', 'a2', 'a3', 'a4', 'a5']);
  });
  it('Flight sorts by flight number A to Z, numbers in numeric order, a missing one by its callsign', () => {
    expect(ids(boardModel({ icao: 'WSSS', dir: 'dep', data: many(), sort: 'flight', lang: 'en' }))).toEqual(['a4', 'a3', 'a2', 'a1', 'a5']);
  });
  it('Airline sorts by airline code A to Z, then newest first; no code goes last', () => {
    expect(ids(boardModel({ icao: 'WSSS', dir: 'dep', data: many(), sort: 'airline', lang: 'en' }))).toEqual(['a4', 'a2', 'a3', 'a1', 'a5']);
  });
  it('every sort keeps every row, and an unknown sort is Time', () => {
    for (const s of ['time', 'flight', 'airline', 'bogus']) {
      const m = boardModel({ icao: 'WSSS', dir: 'dep', data: many(), sort: s, lang: 'en' });
      expect(m.rows).toHaveLength(5);
      expect(new Set(ids(m)).size).toBe(5);
    }
    expect(boardModel({ icao: 'WSSS', dir: 'dep', data: many(), sort: 'bogus', lang: 'en' }).sort).toBe('time');
  });
  it('the model names the three sorts, the active one marked, in every locale', () => {
    const m = boardModel({ icao: 'WSSS', dir: 'dep', data: many(), sort: 'airline', lang: 'en' });
    expect(m.sorts).toEqual([
      { sort: 'time', label: ft('sort.time', 'en'), active: false },
      { sort: 'flight', label: ft('sort.flight', 'en'), active: false },
      { sort: 'airline', label: ft('sort.airline', 'en'), active: true },
    ]);
  });
  it('emoji: 🛫 on a take-off time, 🛬 on a landing time, ✈️ in the air, 🛬 landed', () => {
    const dep = boardModel({ icao: 'WSSS', dir: 'dep', data: many(), lang: 'en' }).rows;
    expect(dep[0].time).toBe('🛫 13:40');
    expect(dep[0].status).toBe('✈️ ' + ft('status.air', 'en'));
    expect(dep[3].status).toBe('🛬 ' + ft('status.landed', 'en', { time: '13:50' }));
    for (const lang of FR24_LOCALES) {
      const r = boardModel({ icao: 'WSSS', dir: 'dep', data: many(), lang }).rows;
      expect(r[0].status.startsWith('✈️ ')).toBe(true);
      expect(r[3].status.startsWith('🛬 ')).toBe(true);
    }
  });
  it('sorting in the layer makes no request', async () => {
    vi.useFakeTimers();
    const { layer, boards, calls } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    const n = calls.length;
    layer.setSort('flight');
    expect(boards.at(-1).sort).toBe('flight');
    layer.setSort('airline');
    expect(boards.at(-1).sort).toBe('airline');
    expect(calls).toHaveLength(n);
    vi.useRealTimers();
  });
  it('the list row has three columns: time and place, aircraft and status, flight', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/Fr24Board.jsx'), 'utf8');
    for (const c of ['left', 'centre', 'right']) expect(src).toContain(`data-fr24-col="${c}"`);
    expect(src).toMatch(/model\.sorts\.map/);
  });
});

// ── I21 — gate polling while a board is open (amendment 6) ─────────────────────────────────────────────────────
describe('I21 — gate polling: only while a board is open, every 7 minutes, until found', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const gatesCalls = (calls) => calls.filter((u) => u.startsWith('/api/fr24/gates/'));
  const ids = (u) => new URL(u, 'http://x').searchParams.get('ids').split(',');
  it('the Departures tab polls nothing; the Arrivals tab polls once, in one request, for in-air and recently landed rows', async () => {
    const { layer, calls } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    expect(gatesCalls(calls)).toEqual([]);
    await layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(0);
    expect(gatesCalls(calls)).toHaveLength(1);
    expect(ids(gatesCalls(calls)[0])).toEqual(['3b000001', '3b000002']);
  });
  it('a found gate shows on its row as "Gate G12 · T4", and is not polled again; the next poll is 7 minutes later', async () => {
    let n = 0;
    const { layer, calls, boards } = harness({ gates: () => (++n === 1 ? { ok: true, gates: { '3b000002': { gate: 'G12', terminal: 'T4' } } } : { ok: true, gates: {} }) });
    await layer.init();
    await layer.openBoard('WSSS');
    await layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(0);
    const row = boards.at(-1).rows.find((r) => r.id === '3b000002');
    expect(row.gate).toBe(ft('gate.label', 'en', { gate: 'G12' }) + ' · T4');
    await vi.advanceTimersByTimeAsync(6 * 60 * 1000);
    expect(gatesCalls(calls)).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(60 * 1000);
    expect(gatesCalls(calls)).toHaveLength(2);
    expect(ids(gatesCalls(calls)[1])).toEqual(['3b000001']);
  });
  it('a gate with no sourced letter shows the gate alone', async () => {
    const { layer, boards } = harness({ gates: { ok: true, gates: { '3b000002': { gate: 'C21', terminal: null } } } });
    await layer.init();
    await layer.openBoard('WSSS');
    await layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(0);
    expect(boards.at(-1).rows.find((r) => r.id === '3b000002').gate).toBe(ft('gate.label', 'en', { gate: 'C21' }));
  });
  it('polling stops once every flight has its gate', async () => {
    const { layer, calls } = harness({ gates: { ok: true, gates: { '3b000001': { gate: 'G1', terminal: 'T4' }, '3b000002': { gate: 'G2', terminal: 'T4' } } } });
    await layer.init();
    await layer.openBoard('WSSS');
    await layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(gatesCalls(calls)).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('closing the board stops polling', async () => {
    const { layer, calls } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    await layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(0);
    layer.closeBoard();
    expect(vi.getTimerCount(), 'the poll timer stops the moment the board closes, not at its next tick').toBe(0);
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(gatesCalls(calls)).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('an "unavailable" answer stops polling for good; a busy one does not', async () => {
    const a = harness({ gates: { ok: false, reason: 'unavailable' } });
    await a.layer.init();
    await a.layer.openBoard('WSSS');
    await a.layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000);
    expect(gatesCalls(a.calls)).toHaveLength(1);
    const b = harness({ gates: { ok: false, reason: 'busy' } });
    await b.layer.init();
    await b.layer.openBoard('WSSS');
    await b.layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);
    expect(gatesCalls(b.calls)).toHaveLength(3);
  });
  it('a flight that landed more than 60 minutes ago is not polled', async () => {
    const h = harness();
    h.advance(31 * 60 * 1000);                       // TGW2 landed at 05:30Z; now 06:31Z
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    await h.layer.setTab('arr');
    await vi.advanceTimersByTimeAsync(0);
    expect(ids(gatesCalls(h.calls)[0])).toEqual(['3b000001']);
  });
  it('no more than 15 ids in one request', async () => {
    const { gmaps } = fakeGmaps();
    const calls = [];
    const rows = Array.from({ length: 20 }, (_, i) => ({ id: `3c${String(i).padStart(6, '0')}`, flight: `SQ${i}`, callsign: `SIA${i}`, airline: 'SIA', type: 'A359', takeoff: '2026-11-05T04:00:00Z', landed: null, ended: false, orig: { code: 'EGLL' }, dest: { code: 'WSSS' } }));
    const layer = createFr24Layer({}, gmaps, {
      now: () => T0,
      fetchJson: async (u) => { calls.push(u); if (u === '/api/fr24/access') return { ok: true, enabled: true }; if (u.startsWith('/api/fr24/board/')) return { ok: true, dir: 'arr', rows }; if (u.startsWith('/api/fr24/gates/')) return { ok: true, gates: {} }; return null; },
    });
    await layer.init();
    await layer.openBoard('WSSS', 'arr');
    await vi.advanceTimersByTimeAsync(0);
    expect(ids(gatesCalls(calls)[0])).toHaveLength(15);
  });
});

// ── I17 — a flight tap: in the air, one locate and a map move; landed, nothing fetched ─────────────────────────
describe('I17 — a flight tap', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('a flight still in the air: exactly one locate by callsign, the map pans to it, and its card opens there', async () => {
    const { layer, calls, pans, boards } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    const n = calls.length;
    await layer.selectFlight('3b000001');
    // Amendment 8 (I24): still exactly one locate; then the flown path and the airports' positions, for the route.
    expect(calls.slice(n)).toEqual(['/api/fr24/locate/SIA1', '/api/fr24/track/3b000001', '/api/fr24/flight/3b000001']);
    expect(pans).toEqual([{ lat: 1.31, lng: 104.12 }]);
    expect(boards.at(-1).selectedId).toBe('3b000001');
    expect(layer.planeCount()).toBeGreaterThan(0);
  });
  it('a landed flight: its details only, no request and no map move', async () => {
    const { layer, calls, pans, boards } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    const n = calls.length;
    await layer.selectFlight('3b000002');
    expect(calls).toHaveLength(n);
    expect(pans).toEqual([]);
    expect(boards.at(-1).selectedId).toBe('3b000002');
    expect(boards.at(-1).detail.join(' ')).toContain('TGW');
  });
  it('a flight in the air with no callsign says so, with no request', async () => {
    const { gmaps } = fakeGmaps();
    const calls = [];
    const data = boardPayload('dep');
    data.rows[0].callsign = null;
    const boards = [];
    const layer = createFr24Layer({ panTo() {} }, gmaps, {
      now: () => T0, onBoard: (b) => boards.push(b),
      fetchJson: async (u) => { calls.push(u); return u === '/api/fr24/access' ? { ok: true, enabled: true } : u.startsWith('/api/fr24/board/') ? data : null; },
    });
    await layer.init();
    await layer.openBoard('WSSS');
    const n = calls.length;
    await layer.selectFlight('3b000001');
    expect(calls).toHaveLength(n);
    expect(boards.at(-1).detail).toContain(ft('locate.none', 'en'));
  });
  it('flightCardLines are what the card and the board detail both show', () => {
    const lines = flightCardLines({ flight: boardPayload('dep').rows[1], lang: 'en' });
    expect(lines).toContain('Airline TGW');
    expect(lines.join(' ')).toContain('Bangkok (BKK)');
  });
});

// ── I23 / I24 — our own plane, and the route of the flight whose card is open (amendment 8) ─────────────────────
const SG = { lat: 1.3502, lng: 103.994 };
const LHR = { lat: 51.4707, lng: -0.4599 };
const TRACK = { ok: true, id: '3b000001', points: [[1.36, 104.0], [1.33, 104.06], [1.315, 104.11]] };
const onMap = (made) => made.lines.filter((l) => l.map);
const dotted = (l) => l.strokeOpacity === 0 && Array.isArray(l.icons) && l.icons[0].icon.path === 0;
const dashed = (l) => l.strokeOpacity === 0 && Array.isArray(l.icons) && typeof l.icons[0].icon.path === 'string' && l.geodesic === true;

describe('I23 — every plane is our own yellow SVG, turned to its heading', () => {
  it('planeSvg: yellow with a dark outline; the picked flight amber with a thicker outline; no FR24 artwork', () => {
    const a = planeSvg();
    expect(a).toMatch(/^<svg /);
    expect(a).toContain(`fill="${PLANE_FILL}"`);
    expect(PLANE_FILL.toUpperCase()).toBe('#FACC15');
    expect(a).toMatch(/stroke="#1F2937"/i);
    const b = planeSvg({ picked: true });
    expect(b).toContain(`fill="${PLANE_PICKED}"`);
    expect(Number(b.match(/stroke-width="([\d.]+)"/)[1])).toBeGreaterThan(Number(a.match(/stroke-width="([\d.]+)"/)[1]));
    const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/lib/fr24-layer.js'), 'utf8');
    expect(src).not.toMatch(/flightradar24\.com\/[^'"\s]*\.(svg|png)/i);
  });
  it('with Advanced Markers: an SVG element rotated by track (no -90 offset), never the text glyph', async () => {
    const els = [];
    const prev = globalThis.document;
    globalThis.document = { createElement: () => { const e = { style: {}, attrs: {}, html: '', text: '', setAttribute(k, v) { this.attrs[k] = v; }, addEventListener() {} }; Object.defineProperty(e, 'innerHTML', { set(v) { e.html = v; }, get() { return e.html; } }); Object.defineProperty(e, 'textContent', { set(v) { e.text = v; }, get() { return e.text; } }); els.push(e); return e; } };
    try {
      const { gmaps } = fakeGmaps();
      class AME { constructor(o) { Object.assign(this, o); } }
      gmaps.marker = { AdvancedMarkerElement: AME };
      const layer = createFr24Layer({}, gmaps, { now: () => T0, fetchJson: async (u) => (u === '/api/fr24/access' ? { ok: true, enabled: true } : u.startsWith('/api/fr24/airport/') ? planesPayload() : null) });
      await layer.init();
      await layer.togglePlanes('WSSS');
      const planes = els.filter((e) => e.attrs['data-fr24-plane']);
      expect(planes).toHaveLength(2);
      for (const e of planes) {
        expect(e.html).toMatch(/^<svg /);
        expect(e.text).toBe('');
      }
      expect(planes.find((e) => e.attrs['data-fr24-plane'] === '3a000001').style.transform).toBe('rotate(270deg)');
      expect(planes.find((e) => e.attrs['data-fr24-plane'] === '3a000002').style.transform).toBe('rotate(45deg)');
      layer.destroy();
    } finally {
      globalThis.document = prev;
    }
  });
  it('with classic Markers: the plane path in yellow, rotated by track, not the arrow symbol', async () => {
    const { layer, made } = harness();
    await layer.init();
    await layer.togglePlanes('WSSS');
    const m = made.find((x) => x.fr24Plane === '3a000002');
    expect(typeof m.icon.path).toBe('string');
    expect(m.icon.rotation).toBe(45);
    expect(m.icon.fillColor.toUpperCase()).toBe(PLANE_FILL.toUpperCase());
    expect(m.icon.strokeColor).toMatch(/#1F2937/i);
  });
});

describe('I24 — a route only for the in-air flight whose card is open, removed when it closes', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const open = async (opts) => {
    const h = harness(opts);
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    return h;
  };
  it('a row in the air: a dotted flown path ending at the plane, and a dashed line on to the destination', async () => {
    const { layer, made } = await open({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR } });
    await layer.selectFlight('3b000001');
    const lines = onMap(made);
    expect(lines).toHaveLength(2);
    const d = lines.find(dotted);
    const g = lines.find(dashed);
    expect(d.path[0]).toEqual({ lat: 1.36, lng: 104.0 });
    expect(d.path.at(-1)).toEqual({ lat: 1.31, lng: 104.12 });
    expect(g.path).toEqual([{ lat: 1.31, lng: 104.12 }, LHR]);
    expect(g.icons[0].icon.strokeOpacity).toBeLessThan(d.icons[0].icon.fillOpacity);
  });
  it('the track refused (403 → unavailable): the dotted line runs from the origin airport to the plane instead', async () => {
    const { layer, made } = await open({ track: { ok: false, reason: 'unavailable' }, flightExtra: { origPos: SG, destPos: LHR } });
    await layer.selectFlight('3b000001');
    const d = onMap(made).find(dotted);
    expect(d.path).toEqual([SG, { lat: 1.31, lng: 104.12 }]);
    expect(d.geodesic).toBe(true);
  });
  it('an unknown destination: the dotted line only, no dashed one', async () => {
    const { layer, made } = await open({ track: TRACK, flightExtra: { origPos: SG, destPos: null } });
    await layer.selectFlight('3b000001');
    expect(onMap(made)).toHaveLength(1);
    expect(onMap(made).every(dotted)).toBe(true);
  });
  it('a landed flight draws no route and asks for no track', async () => {
    const { layer, made, calls } = await open({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR } });
    await layer.selectFlight('3b000002');
    expect(made.lines).toHaveLength(0);
    expect(calls.some((u) => u.startsWith('/api/fr24/track/'))).toBe(false);
  });
  it('every line goes on card close, another flight, board close and destroy', async () => {
    const h = await open({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR } });
    await h.layer.selectFlight('3b000001');
    expect(onMap(h.made)).toHaveLength(2);
    h.layer.closeInfo();
    expect(onMap(h.made)).toHaveLength(0);
    await h.layer.selectFlight('3b000001');
    expect(onMap(h.made)).toHaveLength(2);
    h.made.iws[0].listeners.closeclick();
    expect(onMap(h.made)).toHaveLength(0);
    await h.layer.selectFlight('3b000001');
    await h.layer.selectFlight('3b000002');
    expect(onMap(h.made)).toHaveLength(0);
    await h.layer.selectFlight('3b000001');
    h.layer.closeBoard();
    expect(onMap(h.made)).toHaveLength(0);
    await h.layer.openBoard('WSSS');
    await h.layer.selectFlight('3b000001');
    h.layer.destroy();
    expect(onMap(h.made)).toHaveLength(0);
  });
  it('a route that arrives after its card closed is not drawn', async () => {
    let release;
    const { layer, made } = await open({ track: () => new Promise((r) => { release = () => r(TRACK); }), flightExtra: { origPos: SG, destPos: LHR } });
    const p = layer.selectFlight('3b000001');
    await vi.advanceTimersByTimeAsync(0);
    layer.closeInfo();
    release();
    await p;
    expect(onMap(made)).toHaveLength(0);
  });
  it('a plane tap draws the route for that flight when it is in the air, and none once it has landed', async () => {
    const a = harness({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR } });
    await a.layer.init();
    await a.layer.togglePlanes('WSSS');
    await a.made.find((m) => m.fr24Plane === '3a000001').listeners.click();
    expect(a.calls).toContain('/api/fr24/track/3a000001');
    expect(onMap(a.made)).toHaveLength(2);
    const b = harness({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR, flight: boardPayload('dep').rows[1] } });
    await b.layer.init();
    await b.layer.togglePlanes('WSSS');
    await b.made.find((m) => m.fr24Plane === '3a000001').listeners.click();
    expect(b.calls.some((u) => u.startsWith('/api/fr24/track/'))).toBe(false);
    expect(b.made.lines).toHaveLength(0);
  });
});

// ── I27 / I28 / I29 / I30 — amendment 9 revised ─────────────────────────────────────────────────────────────────────
const airRow = (extra = {}) => ({ id: '3b000009', flight: 'SQ9', callsign: 'SIA9', airline: 'SIA', type: 'A359', takeoff: null, landed: null, ended: false,
  orig: { code: 'VVDN', iata: 'DAD', city: 'Da Nang' }, dest: { code: 'WSSS', iata: 'SIN', city: 'Singapore' }, firstSeen: null, ...extra });
const one = (dir, row, etas = null) => boardModel({ icao: 'WSSS', dir, data: { ok: true, rows: [row] }, lang: 'en', etas }).rows[0].time;

describe('I27 — the row time follows what exists; every estimate is marked ≈', () => {
  it('Arrivals in the air: ETA, else take-off, else first seen, else nothing (the board draws --:--)', () => {
    const eta = { '3b000009': '2026-11-05T07:40:00Z' };
    expect(one('arr', airRow({ takeoff: '2026-11-05T05:10:00Z', firstSeen: '2026-11-05T04:50:00Z' }), eta)).toBe('🛬 ≈15:40');
    expect(one('arr', airRow({ takeoff: '2026-11-05T05:10:00Z', firstSeen: '2026-11-05T04:50:00Z' }))).toBe('🛫 13:10');
    expect(one('arr', airRow({ firstSeen: '2026-11-05T04:50:00Z' }))).toBe('🛫 ≈12:50');   // amendment 10 (I33)
    expect(one('arr', airRow())).toBe('');
  });
  it('Departures in the air: take-off, else ETA at the destination, else first seen', () => {
    const eta = { '3b000009': '2026-11-05T10:05:00Z' };
    expect(one('dep', airRow({ takeoff: '2026-11-05T05:10:00Z' }), eta)).toBe('🛫 13:10');
    expect(one('dep', airRow({ firstSeen: '2026-11-05T04:50:00Z' }), eta)).toBe('🛬 ≈18:05');
    expect(one('dep', airRow({ firstSeen: '2026-11-05T04:50:00Z' }))).toBe('🛫 ≈12:50');
  });
  it('landed rows are unchanged, ETA or not', () => {
    const landed = airRow({ ended: true, landed: '2026-11-05T05:31:00Z', takeoff: '2026-11-05T03:20:00Z' });
    expect(one('arr', landed, { '3b000009': '2026-11-05T07:40:00Z' })).toBe('🛬 13:31');
    expect(one('dep', landed, { '3b000009': '2026-11-05T07:40:00Z' })).toBe('🛫 11:20');
  });
  it('"No flight details" exists in all nine locales; no "seen" wording is left (amendment 10, I33)', () => {
    for (const l of FR24_LOCALES) expect(FR24_STRINGS['card.nodetails'][l], `card.nodetails.${l}`).toBeTruthy();
    expect(FR24_STRINGS['time.seen']).toBeUndefined();
    for (const l of FR24_LOCALES) {
      const t = boardModel({ icao: 'WSSS', dir: 'arr', data: { ok: true, rows: [airRow({ firstSeen: '2026-11-05T04:50:00Z' })] }, lang: l }).rows[0].time;
      expect(t, l).toBe('🛫 ≈12:50');
    }
  });
});

describe('I28 — Changi and Seletar pins, always for a reader with access; a tap opens that board', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('classic markers: one at each airport with ✈ and the name; none without access', async () => {
    const { layer, made } = harness();
    await layer.init();
    const pins = made.filter((m) => m.fr24Pin);
    expect(pins).toHaveLength(2);
    const ch = pins.find((m) => m.fr24Pin === 'WSSS');
    expect(ch.position).toEqual(FR24_PINS.WSSS);   // amendment 11 (I34): the terminal, not the reference point
    expect(ch.label.text).toBe('✈');
    expect(ch.title).toBe('Changi');
    const off = harness({ enabled: false });
    await off.layer.init();
    expect(off.made).toHaveLength(0);
    expect(off.layer.pinCount()).toBe(0);
  });
  it('a pin tap opens that airport\'s board, and a second pin switches to the other', async () => {
    const { layer, made, calls, boards } = harness();
    await layer.init();
    await made.find((m) => m.fr24Pin === 'WSSL').listeners.click();
    expect(layer.openIcao()).toBe('WSSL');
    expect(calls).toContain('/api/fr24/board/WSSL?dir=dep');
    await made.find((m) => m.fr24Pin === 'WSSS').listeners.click();
    expect(layer.openIcao()).toBe('WSSS');
    expect(boards.at(-1).icao).toBe('WSSS');
  });
  it('closing the board keeps the pins; destroy removes both', async () => {
    const { layer, made } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    layer.closeBoard();
    expect(made.filter((m) => m.fr24Pin && m.map)).toHaveLength(2);
    layer.destroy();
    expect(made.filter((m) => m.fr24Pin && m.map)).toHaveLength(0);
  });
  it('Advanced Markers: Google\'s pin with a ✈ glyph, and the name in a label below it', async () => {
    const prev = globalThis.document;
    const mk = () => { const e = { style: {}, attrs: {}, kids: [], text: '', setAttribute(k, v) { this.attrs[k] = v; }, getAttribute(k) { return this.attrs[k]; }, appendChild(c) { this.kids.push(c); return c; }, addEventListener(ev, fn) { this.on = fn; } }; Object.defineProperty(e, 'textContent', { set(v) { e.text = v; }, get() { return e.text; } }); Object.defineProperty(e, 'innerHTML', { set(v) { e.html = v; }, get() { return e.html; } }); return e; };
    globalThis.document = { createElement: mk };
    try {
      const { gmaps } = fakeGmaps();
      const ames = [];
      class AME { constructor(o) { Object.assign(this, o); ames.push(this); } }
      const pes = [];
      class PinElement { constructor(o) { Object.assign(this, o); this.element = mk(); this.element.pe = this; pes.push(this); } }
      gmaps.marker = { AdvancedMarkerElement: AME, PinElement };
      const calls = [];
      const layer = createFr24Layer({}, gmaps, { now: () => T0, fetchJson: async (u) => { calls.push(u); return u === '/api/fr24/access' ? { ok: true, enabled: true } : u.startsWith('/api/fr24/board/') ? boardPayload('dep') : null; } });
      await layer.init();
      const pins = ames.filter((m) => m.content && m.content.attrs['data-fr24-pin']);
      expect(pins).toHaveLength(2);
      const ch = pins.find((m) => m.content.attrs['data-fr24-pin'] === 'WSSS');
      expect(ch.content.kids[0].pe.glyph).toBe('✈');
      expect(pes).toHaveLength(2);
      expect(ch.content.kids[1].text).toBe('Changi');
      await ch.content.on({ stopPropagation() {} });
      expect(calls).toContain('/api/fr24/board/WSSS?dir=dep');
      layer.destroy();
      expect(pins.every((m) => m.map === null)).toBe(true);
    } finally {
      globalThis.document = prev;
    }
  });
});

describe('I29 — the phone asks for ETAs once a tab with a flight in the air has loaded, at most every 5 minutes', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const etaCalls = (calls) => calls.filter((u) => u.startsWith('/api/fr24/eta/'));
  it('one ETA request per tab; a return to the tab inside 5 minutes asks nothing; after 5 minutes it asks again', async () => {
    const { layer, calls, boards, advance } = harness({ eta: (u) => ({ ok: true, etas: { '3b000001': '2026-11-05T07:40:00Z' } }) });
    await layer.init();
    expect(etaCalls(calls)).toHaveLength(0);
    await layer.openBoard('WSSS');
    expect(etaCalls(calls)).toEqual(['/api/fr24/eta/WSSS?dir=dep&cs=SIA1']);
    await layer.setTab('arr');
    expect(etaCalls(calls)).toEqual(['/api/fr24/eta/WSSS?dir=dep&cs=SIA1', '/api/fr24/eta/WSSS?dir=arr&cs=SIA1']);
    await layer.setTab('arr');
    expect(boards.at(-1).rows.find((r) => r.id === '3b000001').time).toBe('🛬 ≈15:40');
    await layer.setTab('dep');
    expect(etaCalls(calls)).toHaveLength(2);
    advance(5 * 60 * 1000 + 1000);
    await layer.setTab('arr');
    expect(etaCalls(calls)).toHaveLength(3);
  });
  it('no ETA request for a tab with no flight in the air', async () => {
    const { gmaps } = fakeGmaps();
    const calls = [];
    const data = boardPayload('dep');
    data.rows = data.rows.filter((r) => r.ended);
    const layer = createFr24Layer({ panTo() {} }, gmaps, { now: () => T0, fetchJson: async (u) => { calls.push(u); return u === '/api/fr24/access' ? { ok: true, enabled: true } : u.startsWith('/api/fr24/board/') ? data : null; } });
    await layer.init();
    await layer.openBoard('WSSS');
    expect(etaCalls(calls)).toHaveLength(0);
  });
  it('an "unavailable" answer stops further ETA requests', async () => {
    const { layer, calls, advance } = harness({ eta: { ok: false, reason: 'unavailable' } });
    await layer.init();
    await layer.openBoard('WSSS');
    await layer.setTab('arr');
    advance(10 * 60 * 1000);
    await layer.openBoard('WSSL');
    expect(etaCalls(calls)).toHaveLength(1);
  });
});

describe('I30 — a plane with no details gets a single-✈ card; a plane on the ground draws no route', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('the card title: callsign when that is all there is, else "No flight details"; one ✈ either way', () => {
    const a = flightCardHtml({ flight: null, plane: { callsign: null, alt: 0, gspeed: 1 }, lang: 'en' });
    expect(a).toContain('<strong>✈ No flight details</strong>');
    expect((a.match(/✈/g) || []).length).toBe(1);
    const b = flightCardHtml({ flight: null, plane: { callsign: 'RPC9968', alt: 39000, gspeed: 475 }, lang: 'en' });
    expect(b).toContain('<strong>✈ RPC9968</strong>');
  });
  it('a plane tapped on the ground: its card, but no track request and no line', async () => {
    const { layer, made, calls } = harness({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR } });
    await layer.init();
    await layer.togglePlanes('WSSS');
    const p = made.find((m) => m.fr24Plane === '3a000001');
    p.fr24Data = { ...p.fr24Data, alt: 0, gspeed: 1 };
    await layer.openFlight('3a000001', p.fr24Data);
    expect(calls.some((u) => u.startsWith('/api/fr24/track/'))).toBe(false);
    expect(made.lines).toHaveLength(0);
  });
  it('a board row located on the ground draws no route either', async () => {
    const h = harness({ track: TRACK, flightExtra: { origPos: SG, destPos: LHR } });
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    const orig = h.calls.length;
    // The fake locate answers a flying plane; make this one taxiing.
    const layer2 = createFr24Layer({ panTo() {} }, fakeGmaps().gmaps, { now: () => T0, fetchJson: async (u) => {
      h.calls.push(u);
      if (u === '/api/fr24/access') return { ok: true, enabled: true };
      if (u.startsWith('/api/fr24/board/')) return boardPayload('dep');
      if (u.startsWith('/api/fr24/locate/')) return { ok: true, plane: { id: '3b000001', callsign: 'SIA1', lat: 1.35, lng: 103.99, track: 0, gspeed: 12, alt: 0 } };
      return TRACK;
    } });
    await layer2.init();
    await layer2.openBoard('WSSS');
    await layer2.selectFlight('3b000001');
    expect(h.calls.slice(orig).some((u) => u.startsWith('/api/fr24/track/'))).toBe(false);
  });
});

// ── I31 / I32 — amendment 10 ─────────────────────────────────────────────────────────────────────────────────────
describe('I31 — one planes request at a time; a busy refresh keeps the planes', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  const planesHarness = (answers) => {
    const { gmaps, made } = fakeGmaps();
    const calls = [];
    const states = [];
    let n = 0;
    const layer = createFr24Layer({ panTo() {} }, gmaps, { now: () => T0, onState: (s) => states.push(s), fetchJson: async (u) => {
      calls.push(u);
      if (u === '/api/fr24/access') return { ok: true, enabled: true };
      if (u.startsWith('/api/fr24/airport/')) { const a = answers[Math.min(n, answers.length - 1)]; n += 1; return typeof a === 'function' ? a() : a; }
      return null;
    } });
    return { layer, calls, states, made, live: () => made.filter((m) => m.fr24Plane && m.map).length };
  };
  it('a double tap while the first request is loading makes one request, and the planes stay on', async () => {
    let release;
    const h = planesHarness([() => new Promise((r) => { release = () => r(planesPayload()); })]);
    await h.layer.init();
    const a = h.layer.togglePlanes('WSSS');
    const b = h.layer.togglePlanes('WSSS');
    release();
    await Promise.all([a, b]);
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/airport/'))).toHaveLength(1);
    expect(h.layer.planeCount()).toBe(2);
    expect(h.live()).toBe(2);
  });
  it('a busy answer to a refresh keeps the planes already drawn and says so; budget too', async () => {
    for (const reason of ['busy', 'budget']) {
      const h = planesHarness([planesPayload(), { ok: false, reason }]);
      await h.layer.init();
      await h.layer.togglePlanes('WSSS');
      expect(h.live()).toBe(2);
      await h.layer.refresh();
      expect(h.live(), reason).toBe(2);
      expect(h.states.at(-1)).toMatchObject({ planes: true, icao: 'WSSS' });
      expect(h.states.at(-1).caption).toContain(ft(`err.${reason}`, 'en'));
    }
  });
  it('a first request answered busy draws nothing and leaves the planes off (nothing to keep)', async () => {
    const h = planesHarness([{ ok: false, reason: 'busy' }]);
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    expect(h.live()).toBe(0);
    expect(h.states.at(-1)).toEqual({ planes: false });
  });
  it('after a request settles, a tap toggles off as before', async () => {
    const h = planesHarness([planesPayload()]);
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    await h.layer.togglePlanes('WSSS');
    expect(h.live()).toBe(0);
  });
});

describe('I32 — the phone asks for ETAs by the in-air rows\' callsigns, at most 15, none when there are none', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('names exactly the in-air rows with a callsign, sorted, at most 15', async () => {
    const { gmaps } = fakeGmaps();
    const calls = [];
    const rows = [
      ...Array.from({ length: 17 }, (_, i) => ({ ...boardPayload('arr').rows[0], id: `3c${String(i).padStart(6, '0')}`, callsign: `SIA${100 + i}` })),
      { ...boardPayload('arr').rows[0], id: '3d000001', callsign: null },
      { ...boardPayload('arr').rows[1] },
    ];
    const layer = createFr24Layer({ panTo() {} }, gmaps, { now: () => T0, fetchJson: async (u) => {
      calls.push(u);
      if (u === '/api/fr24/access') return { ok: true, enabled: true };
      if (u.startsWith('/api/fr24/board/')) return { ok: true, rows };
      if (u.startsWith('/api/fr24/eta/')) return { ok: true, etas: { '3c000000': '2026-11-05T07:40:00Z' } };
      return null;
    } });
    await layer.init();
    await layer.openBoard('WSSS');
    const e = calls.filter((u) => u.startsWith('/api/fr24/eta/'));
    expect(e).toHaveLength(1);
    const cs = new URL(e[0], 'http://x').searchParams.get('cs').split(',');
    expect(cs).toHaveLength(15);
    expect(cs).toEqual([...cs].sort());
    expect(cs).not.toContain('TGW2');   // the landed row
    for (const c of cs) expect(c).toMatch(/^SIA1\d\d$/);
  });
});

// ── I34 — the pins sit where people look (amendment 11) ──────────────────────────────────────────────────────
const metres = (a, b) => {
  const R = 6371000; const r = (x) => (x * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
describe('I34 — Changi pin at Terminal 1 / Jewel (LTA stop 95029); Seletar on its reference point; planes box unchanged', () => {
  it('FR24_PINS: Changi within 30 m of 1.36106, 103.99081 and at least 800 m from the reference point; Seletar on it', () => {
    expect(metres(FR24_PINS.WSSS, { lat: 1.36106, lng: 103.99081 })).toBeLessThan(30);
    expect(metres(FR24_PINS.WSSS, FR24_AIRPORTS.WSSS)).toBeGreaterThan(800);
    expect(FR24_PINS.WSSL).toEqual(FR24_AIRPORTS.WSSL);
    expect(Object.keys(FR24_PINS).sort()).toEqual(['WSSL', 'WSSS']);
  });
  it('the reference points, used for the planes box, are unchanged on both sides', () => {
    expect(FR24_AIRPORTS.WSSS).toEqual({ lat: 1.35019, lng: 103.994003 });
    expect(server.AIRPORTS.WSSS).toEqual({ lat: 1.35019, lng: 103.994003 });
  });
  it('the drawn pins use FR24_PINS', async () => {
    const { layer, made } = harness();
    await layer.init();
    expect(made.find((m) => m.fr24Pin === 'WSSS').position).toEqual(FR24_PINS.WSSS);
    expect(made.find((m) => m.fr24Pin === 'WSSL').position).toEqual(FR24_PINS.WSSL);
  });
});

// ── shared facts with the server ───────────────────────────────────────────────────────────────────────────────
describe('the client and the server agree', () => {
  it('on the two airports\' positions', () => {
    for (const c of ['WSSS', 'WSSL']) {
      expect(FR24_AIRPORTS[c].lat).toBeCloseTo(server.AIRPORTS[c].lat, 5);
      expect(FR24_AIRPORTS[c].lng).toBeCloseTo(server.AIRPORTS[c].lng, 5);
    }
    expect(Object.keys(FR24_AIRPORTS).sort()).toEqual(['WSSL', 'WSSS']);
  });
  it('sgtClock is Singapore time', () => {
    expect(sgtClock('2026-11-05T05:10:00Z')).toBe('13:10');
    expect(sgtClock(T0, true)).toBe('14:00:00');
    expect(sgtClock(null)).toBe('');
  });
});

// ── the panel wires it ─────────────────────────────────────────────────────────────────────────────────────────
describe('MrtMapPanel wires the layer', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
  it('creates the layer, calls init once, and sends initData on every FR24 request', () => {
    expect(src).toMatch(/createFr24Layer\(/);
    expect(src).toMatch(/\.init\(\)/);
    expect(src).toMatch(/x-telegram-init-data/);
  });
  it('renders the caption the layer reports', () => {
    expect(src).toMatch(/fr24State\?\.caption|fr24State\.caption/);
  });
  it('hands the board up to App (onFr24BoardChange) with its actions', () => {
    expect(src).toMatch(/onFr24BoardChange/);
    expect(src).toMatch(/onBoard:/);
    for (const a of ['setTab', 'setView', 'togglePlanes', 'selectFlight', 'closeBoard']) expect(src).toContain(a);
  });
});
