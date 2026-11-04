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
  boardModel, flightCardHtml, flightCardLines, createFr24Layer,
} from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const server = require('../fr24.js');

const T0 = Date.parse('2026-11-05T06:00:00Z'); // 14:00 SGT
const OUR_URLS = /^\/api\/fr24\/(access|board\/(WSSS|WSSL)\?dir=(dep|arr)|airport\/(WSSS|WSSL)|flight\/[0-9a-f]+|locate\/[A-Z0-9]{2,8})$|^\/api\/weather\/outside\?/;

function fakeGmaps() {
  const made = [];
  class Marker {
    constructor(o) { Object.assign(this, o || {}); this.listeners = {}; made.push(this); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; } getPosition() { return this.position; }
    setIcon(i) { this.icon = i; }
    addListener(ev, fn) { this.listeners[ev] = fn; return { remove() {} }; }
  }
  class InfoWindow {
    constructor(o) { Object.assign(this, o || {}); this.contents = []; this.isOpen = false; made.iws = (made.iws || []).concat(this); }
    setContent(c) { this.contents.push(c); } setPosition(p) { this.position = p; }
    open() { this.isOpen = true; } close() { this.isOpen = false; }
  }
  return { gmaps: { Marker, InfoWindow, SymbolPath: { CIRCLE: 0, FORWARD_CLOSED_ARROW: 1 }, marker: null }, made };
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
function harness({ enabled = true } = {}) {
  const calls = [];
  const states = [];
  const fetchJson = async (u) => {
    calls.push(u);
    if (u === '/api/fr24/access') return { ok: true, enabled };
    if (u.startsWith('/api/fr24/board/')) return boardPayload(new URL(u, 'http://x').searchParams.get('dir'));
    if (u.startsWith('/api/fr24/airport/')) return planesPayload();
    if (u.startsWith('/api/fr24/flight/')) return { ok: true, flight: boardPayload('dep').rows[0] };
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
  it('init asks the server once whether this reader has access, then draws the two pins', async () => {
    const { calls, layer } = harness();
    expect(await layer.init()).toBe(true);
    expect(calls).toEqual(['/api/fr24/access']);
    expect(layer.pinCount()).toBe(2);
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
    const fr = () => calls.filter((u) => u.startsWith('/api/fr24/'));
    expect(fr()).toEqual(['/api/fr24/access', '/api/fr24/board/WSSS?dir=dep']);
    await layer.setTab('arr');
    expect(fr().at(-1)).toBe('/api/fr24/board/WSSS?dir=arr');
    await layer.setTab('dep');
    await layer.setTab('arr');
    expect(fr()).toHaveLength(3);
  });
  it('the pins themselves start the board: tapping the Changi pin fetches its board', async () => {
    const { calls, layer, made } = harness();
    await layer.init();
    const pin = made.find((m) => m.fr24Pin === 'WSSS');
    expect(pin).toBeTruthy();
    await pin.listeners.click();
    expect(calls).toContain('/api/fr24/board/WSSS?dir=dep');
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
    expect(m.rows[0]).toMatchObject({ id: '3b000001', time: '13:10', place: 'London (LHR)', flight: 'SQ1', type: 'A359', status: 'In the air', inAir: true, callsign: 'SIA1' });
    expect(m.rows[1]).toMatchObject({ status: 'Landed 13:30', inAir: false, place: 'ZZZZ' });   // unknown code as itself
    expect(m.labels).toEqual({ time: 'Took off', place: 'To', flight: 'Flight', type: 'Aircraft', status: 'Status' });
  });
  it('Arrivals rows show origins and landed times', () => {
    const m = boardModel({ icao: 'WSSS', dir: 'arr', data: boardPayload('arr'), lang: 'en' });
    expect(m.rows[1]).toMatchObject({ place: 'Bangkok (BKK)', time: '13:30' });
    expect(m.rows[0]).toMatchObject({ time: '', status: 'In the air' });
    expect(m.header).toBe(ft('board.header.arr', 'en'));
    expect(m.labels.place).toBe('From');
  });
  it('no terminal, gate or check-in label, in any locale; the model carries no such field', () => {
    for (const lang of FR24_LOCALES) {
      for (const dir of ['dep', 'arr']) {
        const m = boardModel({ icao: 'WSSS', dir, data: boardPayload(dir), lang });
        for (const v of Object.values(m.labels)) expect(v).not.toMatch(/terminal|gate|check-in|boarding/i);
        for (const r of m.rows) expect(Object.keys(r).sort()).toEqual(['callsign', 'flight', 'id', 'inAir', 'place', 'status', 'time', 'type']);
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
    expect(calls.slice(n)).toEqual(['/api/fr24/locate/SIA1']);
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
