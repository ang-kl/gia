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
  boardHtml, flightCardHtml, createFr24Layer,
} from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const server = require('../fr24.js');

const T0 = Date.parse('2026-11-05T06:00:00Z'); // 14:00 SGT
const OUR_URLS = /^\/api\/fr24\/(access|board\/(WSSS|WSSL)\?dir=(dep|arr)|airport\/(WSSS|WSSL)|flight\/[0-9a-f]+)$|^\/api\/weather\/outside\?/;

function fakeGmaps() {
  const made = [];
  class Marker {
    constructor(o) { Object.assign(this, o || {}); this.listeners = {}; made.push(this); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; } getPosition() { return this.position; }
    setIcon(i) { this.icon = i; }
    addListener(ev, fn) { this.listeners[ev] = fn; return { remove() {} }; }
  }
  class InfoWindow {
    constructor(o) { Object.assign(this, o || {}); this.contents = []; this.isOpen = false; }
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
    if (u.startsWith('/api/weather/outside')) return { ok: true, inSg: true, rows: { lightning: { status: 'ok', level: 'warn', count: 3, nearestKm: 2.1, at: '2026-11-05T05:58:00Z' } } };
    return null;
  };
  const { gmaps, made } = fakeGmaps();
  let t = T0;
  const layer = createFr24Layer({}, gmaps, { fetchJson, lang: 'en', now: () => t, onState: (s) => states.push(s) });
  return { calls, states, layer, made, advance: (ms) => { t += ms; } };
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
  it('the board footer names what Flightradar24 does not publish, and the header says actual times', () => {
    const html = boardHtml({ icao: 'WSSS', dir: 'dep', data: boardPayload('dep'), lang: 'en' });
    expect(html).toContain(ft('board.footer', 'en'));
    expect(html).toContain('actual times, not the schedule');
    expect(html).toContain('Flightradar24');
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
  it('Departures: SGT take-off time, destination name and code, flight, aircraft, status', () => {
    const html = boardHtml({ icao: 'WSSS', dir: 'dep', data: boardPayload('dep'), lang: 'en' });
    expect(html).toContain('13:10');                 // 05:10Z in SGT
    expect(html).toContain('London (LHR)');
    expect(html).toContain('SQ1');
    expect(html).toContain('A359');
    expect(html).toContain('In the air');
    expect(html).toContain('Landed 13:30');
    expect(html).toContain('ZZZZ');                  // unknown code shown as itself
  });
  it('Arrivals shows origins and landed times', () => {
    const html = boardHtml({ icao: 'WSSS', dir: 'arr', data: boardPayload('arr'), lang: 'en' });
    expect(html).toContain('Bangkok (BKK)');
    expect(html).toContain(ft('board.header.arr', 'en'));
  });
  it('no terminal, gate or check-in column, no image and no logo, in any locale', () => {
    for (const lang of FR24_LOCALES) {
      for (const dir of ['dep', 'arr']) {
        const html = boardHtml({ icao: 'WSSS', dir, data: boardPayload(dir), lang });
        expect(html).not.toMatch(/<img|logo|<svg/i);
        const headers = [...html.matchAll(/<th[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
        expect(headers.length).toBeGreaterThanOrEqual(4);
        for (const h of headers) expect(h).not.toMatch(/terminal|gate|check-in|boarding/i);
      }
    }
    expect(boardHtml({ icao: 'WSSS', dir: 'dep', data: boardPayload('dep'), lang: 'en' })).toContain(ft('board.header.dep', 'en'));
  });
  it('the header says actual times, not the schedule, in every locale', () => {
    for (const lang of FR24_LOCALES) {
      const html = boardHtml({ icao: 'WSSS', dir: 'dep', data: boardPayload('dep'), lang });
      expect(html).toContain(ft('board.header.dep', lang));
      expect(html).toContain(ft('board.footer', lang));
    }
  });
  it('a failure, a busy answer and an empty board each say so, in words', () => {
    expect(boardHtml({ icao: 'WSSS', dir: 'dep', data: { ok: false, reason: 'nokey' }, lang: 'en' })).toContain(ft('err.unavailable', 'en'));
    expect(boardHtml({ icao: 'WSSS', dir: 'dep', data: { ok: false, reason: 'busy' }, lang: 'en' })).toContain(ft('err.busy', 'en'));
    expect(boardHtml({ icao: 'WSSS', dir: 'dep', data: { ok: false, reason: 'budget' }, lang: 'en' })).toContain(ft('err.budget', 'en'));
    expect(boardHtml({ icao: 'WSSS', dir: 'dep', data: { ok: true, rows: [] }, lang: 'en' })).toContain(ft('board.empty', 'en'));
  });
  it('the board escapes what FR24 sends', () => {
    const data = boardPayload('dep');
    data.rows[0].flight = '<script>x</script>';
    expect(boardHtml({ icao: 'WSSS', dir: 'dep', data, lang: 'en' })).not.toContain('<script>');
  });
  it('the board puts NEA lightning near the airport on the card when NEA reports it (C9)', async () => {
    vi.useFakeTimers();
    const { layer } = harness();
    await layer.init();
    await layer.openBoard('WSSS');
    expect(layer.lastBoardHtml()).toContain(ft('wx.lightning', 'en', { km: 5 }));
    vi.useRealTimers();
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
});
