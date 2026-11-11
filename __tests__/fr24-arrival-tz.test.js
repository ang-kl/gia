// fr24-arrival-tz.test.js — v0.62.985. Spec: doc/Feature/2026-11-11-fr24-globe-arrival-tz.spec.md, I1-I4, I7, I8, I10.
//
// A flight's card now says when it lands: FR24's ETA, in the destination's own time zone and in SGT, with the time
// difference ("Arrives ≈ 13:58 Dubai time · 17:58 SGT" / "Dubai is 4 h behind Singapore"). The zone comes from the
// airport table (`z`, built with tz-lookup), the offset is worked out by Intl at the ETA itself (so a summer-time
// change is honoured), and nothing is shown when any part is missing. A plane at 0 ft or under 50 kt that has not
// landed reads "🛞 On the ground", not "In the air". And the dark Flightradar24 bar over the map is gone.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import {
  FR24_LOCALES, FR24_STRINGS, arrivalLines, tzOffsetMin, boardModel, flightCardLines, flightCardHtml, createFr24Layer,
} from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const ROOT = path.join(__dirname, '..');
const table = require('../data/airport-names.json');
const server = require('../fr24.js');

const place = (code) => server.airportName(code);
const ETA = '2026-11-11T09:58:00Z'; // 17:58 SGT

describe('I3 — every airport in the table carries a valid IANA zone', () => {
  const codes = Object.keys(table.airports);
  it('all 4,021, each accepted by Intl', () => {
    expect(codes).toHaveLength(4021);
    const bad = codes.filter((c) => {
      const z = table.airports[c].z;
      if (typeof z !== 'string' || !z) return true;
      try { new Intl.DateTimeFormat('en', { timeZone: z }); return false; } catch { return true; }
    });
    expect(bad).toEqual([]);
  });
  it('the known ones', () => {
    expect(table.airports.WSSS.z).toBe('Asia/Singapore');
    expect(table.airports.WSSL.z).toBe('Asia/Singapore');
    expect(table.airports.OMDB.z).toBe('Asia/Dubai');
    expect(table.airports.YPPH.z).toBe('Australia/Perth');
    expect(table.airports.VECC.z).toBe('Asia/Kolkata');
    expect(table.airports.RJTT.z).toBe('Asia/Tokyo');
    expect(table.airports.EGLL.z).toBe('Europe/London');
  });
  it('the table says where the zones came from, and the server puts tz and pos on each place', () => {
    expect(table._meta.fields.z).toMatch(/tz-lookup/);
    expect(table._meta.downloaded).toBe('2026-11-11');
    expect(place('OMDB')).toMatchObject({ code: 'OMDB', iata: 'DXB', city: 'Dubai', tz: 'Asia/Dubai' });
    expect(place('OMDB').pos.lat).toBeCloseTo(25.25, 1);
    expect(place('ZZZZ')).toEqual({ code: 'ZZZZ' });
  });
});

describe('I2 — arrival time in the destination\'s zone and in SGT, with the difference stated correctly', () => {
  it('the offset is worked out at the instant, summer time included', () => {
    expect(tzOffsetMin('Asia/Singapore', Date.parse(ETA))).toBe(480);
    expect(tzOffsetMin('Asia/Kolkata', Date.parse(ETA))).toBe(330);
    expect(tzOffsetMin('Europe/London', Date.parse('2026-07-01T10:00:00Z'))).toBe(60);
    expect(tzOffsetMin('Europe/London', Date.parse(ETA))).toBe(0);
  });
  it('Dubai, 4 h behind', () => {
    expect(arrivalLines({ eta: ETA, dest: place('OMDB'), lang: 'en' }))
      .toEqual(['Arrives ≈ 13:58 Dubai time · 17:58 SGT', 'Dubai is 4 h behind Singapore']);
  });
  it('Tokyo, 1 h ahead', () => {
    expect(arrivalLines({ eta: ETA, dest: place('RJTT'), lang: 'en' }))
      .toEqual(['Arrives ≈ 18:58 Tokyo time · 17:58 SGT', 'Tokyo is 1 h ahead of Singapore']);
  });
  it('Perth, the same time', () => {
    expect(arrivalLines({ eta: ETA, dest: place('YPPH'), lang: 'en' }))
      .toEqual(['Arrives ≈ 17:58 Perth time · 17:58 SGT', 'Perth is on Singapore time']);
  });
  it('Kolkata, 2 h 30 min behind', () => {
    expect(arrivalLines({ eta: ETA, dest: place('VECC'), lang: 'en' }))
      .toEqual(['Arrives ≈ 15:28 Kolkata time · 17:58 SGT', 'Kolkata is 2 h 30 min behind Singapore']);
  });
  it('London in July is 7 h behind, in November 8 h', () => {
    expect(arrivalLines({ eta: '2026-07-01T10:00:00Z', dest: place('EGLL'), lang: 'en' })[1]).toBe('London is 7 h behind Singapore');
    expect(arrivalLines({ eta: ETA, dest: place('EGLL'), lang: 'en' })[1]).toBe('London is 8 h behind Singapore');
  });
  it('across a date change, the local time says which day', () => {
    // 00:30 SGT on the 12th is 20:30 in Dubai on the 11th.
    expect(arrivalLines({ eta: '2026-11-11T16:30:00Z', dest: place('OMDB'), lang: 'en' })[0])
      .toBe('Arrives ≈ 20:30 Dubai time (previous day) · 00:30 SGT');
    // 23:30 SGT on the 11th is 00:30 in Tokyo on the 12th.
    expect(arrivalLines({ eta: '2026-11-11T15:30:00Z', dest: place('RJTT'), lang: 'en' })[0])
      .toBe('Arrives ≈ 00:30 Tokyo time (next day) · 23:30 SGT');
  });
  it('a flight to Singapore needs only SGT', () => {
    expect(arrivalLines({ eta: ETA, dest: place('WSSS'), lang: 'en' })).toEqual(['Arrives ≈ 17:58 SGT']);
  });
  it('without a city the airport name, then the code, names the place', () => {
    expect(arrivalLines({ eta: ETA, dest: { code: 'OMDB', name: 'Dubai International Airport', tz: 'Asia/Dubai' }, lang: 'en' })[1])
      .toBe('Dubai International Airport is 4 h behind Singapore');
    expect(arrivalLines({ eta: ETA, dest: { code: 'OMDB', tz: 'Asia/Dubai' }, lang: 'en' })[1]).toBe('OMDB is 4 h behind Singapore');
  });
});

describe('I4 — no ETA, no zone, or no airborne plane: no arrival line, never a placeholder', () => {
  it('missing or bad parts give nothing', () => {
    expect(arrivalLines({ eta: null, dest: place('OMDB'), lang: 'en' })).toEqual([]);
    expect(arrivalLines({ eta: 'soon', dest: place('OMDB'), lang: 'en' })).toEqual([]);
    expect(arrivalLines({ eta: ETA, dest: { code: 'ZZZZ' }, lang: 'en' })).toEqual([]);
    expect(arrivalLines({ eta: ETA, dest: { code: 'XXXX', city: 'Nowhere', tz: 'Not/AZone' }, lang: 'en' })).toEqual([]);
    expect(arrivalLines({ eta: ETA, dest: null, lang: 'en' })).toEqual([]);
  });
  const flight = { id: '3b000009', flight: 'EK355', callsign: 'UAE355', ended: false, landed: null, takeoff: '2026-11-11T02:00:00Z', orig: place('WSSS'), dest: place('OMDB') };
  const flying = { alt: 35000, gspeed: 480 };
  it('the card carries the lines while the plane flies, and replaces our own landing estimate', () => {
    const lines = flightCardLines({ flight, plane: flying, icao: 'WSSS', lang: 'en', eta: ETA });
    expect(lines).toContain('Arrives ≈ 13:58 Dubai time · 17:58 SGT');
    expect(lines).toContain('Dubai is 4 h behind Singapore');
    expect(flightCardHtml({ flight, plane: flying, icao: 'WSSS', lang: 'en', eta: ETA })).toContain('Arrives ≈ 13:58 Dubai time');
  });
  it('not once landed, not on the ground, not without an ETA', () => {
    const landed = { ...flight, ended: true, landed: '2026-11-11T09:50:00Z' };
    const all = (o) => flightCardLines({ icao: 'WSSS', lang: 'en', ...o }).join('\n');
    expect(all({ flight: landed, plane: flying, eta: ETA })).not.toMatch(/Arrives/);
    expect(all({ flight, plane: { alt: 0, gspeed: 14 }, eta: ETA })).not.toMatch(/Arrives/);
    expect(all({ flight, plane: flying, eta: null })).not.toMatch(/Arrives/);
    for (const o of [{ flight, plane: flying, eta: null }, { flight, plane: flying, eta: ETA }]) {
      expect(all(o)).not.toMatch(/undefined|NaN|--:--|\{/);
    }
  });
  it('the strings exist in all nine locales, with their placeholders', () => {
    const want = {
      'card.arrives': ['{local}', '{city}', '{sgt}'], 'card.arrivesSgt': ['{sgt}'],
      'card.tzBehind': ['{city}', '{diff}'], 'card.tzAhead': ['{city}', '{diff}'], 'card.tzSame': ['{city}'],
      'card.dayPrev': [], 'card.dayNext': [], 'dur.h': ['{n}'], 'dur.min': ['{n}'], 'status.ground': [],
    };
    for (const [k, ph] of Object.entries(want)) {
      for (const l of FR24_LOCALES) {
        expect(FR24_STRINGS[k] && FR24_STRINGS[k][l], `${k} ${l}`).toBeTruthy();
        for (const p of ph) expect(FR24_STRINGS[k][l], `${k} ${l}`).toContain(p);
      }
    }
    // Every locale yields the two lines for Kolkata, with no braces left.
    for (const l of FR24_LOCALES) {
      const out = arrivalLines({ eta: ETA, dest: place('VECC'), lang: l });
      expect(out, l).toHaveLength(2);
      expect(out.join(' '), l).not.toMatch(/[{}]|undefined/);
    }
  });
});

describe('I7 — a plane on the ground does not read "In the air"', () => {
  const data = {
    ok: true, rows: [
      { id: '3b000011', flight: 'EK315', callsign: 'UAE315', ended: false, landed: null, takeoff: null, orig: place('WSSS'), dest: place('OMDB') },
      { id: '3b000012', flight: 'SQ2', callsign: 'SIA2', ended: false, landed: null, takeoff: '2026-11-11T05:00:00Z', orig: place('WSSS'), dest: place('EGLL') },
      { id: '3b000013', flight: 'SQ3', callsign: 'SIA3', ended: false, landed: null, takeoff: '2026-11-11T05:00:00Z', orig: place('WSSS'), dest: place('RJTT') },
      { id: '3b000014', flight: 'SQ4', callsign: 'SIA4', ended: true, landed: '2026-11-11T05:30:00Z', takeoff: '2026-11-11T04:00:00Z', orig: place('WSSS'), dest: place('WSSL') },
    ],
  };
  const live = { '3b000011': { alt: 0, gspeed: 14 }, '3b000012': { alt: 35000, gspeed: 480 }, '3b000014': { alt: 0, gspeed: 0 } };
  const rows = boardModel({ icao: 'WSSS', dir: 'dep', data, lang: 'en', live }).rows;
  const by = (id) => rows.find((r) => r.id === id);
  it('0 ft at 14 kt: On the ground', () => {
    expect(by('3b000011').status).toBe('🛞 On the ground');
    expect(by('3b000011').ground).toBe(true);
  });
  it('35,000 ft at 480 kt: In the air', () => {
    expect(by('3b000012').status).toBe('✈️ In the air');
    expect(by('3b000012').ground).toBe(false);
  });
  it('no live position: unchanged', () => expect(by('3b000013').status).toBe('✈️ In the air'));
  it('landed stays landed', () => expect(by('3b000014').status).toMatch(/^🛬 Landed/));
  it('the card says so too', () => {
    const lines = flightCardLines({ flight: data.rows[0], plane: { alt: 0, gspeed: 14 }, icao: 'WSSS', lang: 'en' });
    expect(lines).toContain('🛞 On the ground');
    expect(flightCardLines({ flight: data.rows[1], plane: { alt: 35000, gspeed: 480 }, icao: 'WSSS', lang: 'en' })).not.toContain('🛞 On the ground');
  });
  it('the board uses the ETA answer\'s positions as well as the planes on the map', () => {
    const src = fs.readFileSync(path.join(ROOT, 'web/transport/src/lib/fr24-layer.js'), 'utf8');
    expect(src).toMatch(/live: liveNow\(\)/);
  });
});

// ── the layer: a harness like fr24-layer.test.js's, with a plane that is not on the board ───────────────────────
function fakeGmaps() {
  const made = [];
  class Marker {
    constructor(o) { Object.assign(this, o || {}); this.listeners = {}; made.push(this); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; } getPosition() { return this.position; }
    setIcon(i) { this.icon = i; }
    addListener(ev, fn) { this.listeners[ev] = fn; return { remove() {} }; }
  }
  made.lines = [];
  class Polyline { constructor(o) { Object.assign(this, o || {}); made.lines.push(this); } setMap(m) { this.map = m; } }
  class InfoWindow {
    constructor(o) { Object.assign(this, o || {}); this.contents = []; made.iws = (made.iws || []).concat(this); }
    addListener() { return { remove() {} }; }
    setContent(c) { this.contents.push(c); } setPosition(p) { this.position = p; } open() { this.isOpen = true; } close() { this.isOpen = false; }
  }
  return { gmaps: { Marker, InfoWindow, Polyline, SymbolPath: { CIRCLE: 0 }, marker: null }, made };
}
const T0 = Date.parse('2026-11-11T06:00:00Z');
function harness({ etaAnswer = (u) => ({ ok: true, etas: { '3c000001': ETA }, pos: { '3c000001': { alt: 31000, gspeed: 450 } } }) } = {}) {
  const calls = [];
  const states = [];
  const flights = [];
  let t = T0;
  const fetchJson = async (u) => {
    calls.push(u);
    if (u === '/api/fr24/access') return { ok: true, enabled: true };
    if (u.startsWith('/api/fr24/airport/')) {
      return { ok: true, readAt: new Date(T0).toISOString(), planes: [{ id: '3c000001', callsign: 'UAE355', lat: 1.6, lng: 103.4, track: 300, gspeed: 450, alt: 31000 }] };
    }
    if (u.startsWith('/api/fr24/flight/')) {
      return { ok: true, flight: { id: '3c000001', flight: 'EK355', callsign: 'UAE355', ended: false, landed: null, orig: place('WSSS'), dest: place('OMDB') },
        origPos: place('WSSS').pos, destPos: place('OMDB').pos };
    }
    if (u.startsWith('/api/fr24/eta/')) return etaAnswer(u);
    if (u.startsWith('/api/fr24/track/')) return null;
    return null;
  };
  const { gmaps, made } = fakeGmaps();
  const layer = createFr24Layer({ panTo() {} }, gmaps, {
    fetchJson, lang: 'en', now: () => t, onState: (s) => states.push(s), onFlight: (f) => flights.push(f),
  });
  return { calls, states, flights, made, layer, advance: (ms) => { t += ms; } };
}

describe('I8 — one ETA call per tapped off-board callsign, kept 5 minutes', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('the tapped plane\'s card gains the arrival lines from one ETA call', async () => {
    const h = harness();
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    await h.layer.openFlight('3c000001');
    const etaCalls = h.calls.filter((u) => u.startsWith('/api/fr24/eta/'));
    expect(etaCalls).toEqual(['/api/fr24/eta/WSSS?dir=dep&cs=UAE355']);
    expect(h.made.iws.at(-1).contents.at(-1)).toContain('Arrives ≈ 13:58 Dubai time · 17:58 SGT');
  });
  it('tapped again within 5 minutes: no second call; after 5 minutes: one more', async () => {
    const h = harness();
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    await h.layer.openFlight('3c000001');
    h.advance(4 * 60 * 1000);
    await h.layer.openFlight('3c000001');
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/eta/'))).toHaveLength(1);
    expect(h.made.iws.at(-1).contents.at(-1)).toContain('Arrives ≈');
    h.advance(2 * 60 * 1000);
    await h.layer.openFlight('3c000001');
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/eta/'))).toHaveLength(2);
  });
  it('a plane on the ground asks for no ETA', async () => {
    const h = harness();
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    await h.layer.openFlight('3c000001', { id: '3c000001', callsign: 'UAE355', lat: 1.35, lng: 103.99, alt: 0, gspeed: 12, track: 0 });
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/eta/'))).toHaveLength(0);
  });
  it('an "unavailable" answer stops further ETA calls', async () => {
    const h = harness({ etaAnswer: () => ({ ok: false, reason: 'unavailable' }) });
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    await h.layer.openFlight('3c000001');
    h.advance(10 * 60 * 1000);
    await h.layer.openFlight('3c000001');
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/eta/'))).toHaveLength(1);
    expect(h.made.iws.at(-1).contents.at(-1)).not.toMatch(/Arrives/);
  });
});

describe('I1 — no Flightradar24 bar over the map', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('the layer\'s state carries no caption', async () => {
    const h = harness();
    await h.layer.init();
    await h.layer.togglePlanes('WSSS');
    expect(h.states.at(-1)).toMatchObject({ planes: true, icao: 'WSSS' });
    expect(h.states.every((s) => !('caption' in s))).toBe(true);
  });
  it('the map panel draws none', () => {
    const src = fs.readFileSync(path.join(ROOT, 'web/transport/src/components/MrtMapPanel.jsx'), 'utf8');
    expect(src).not.toMatch(/data-fr24-caption/);
    expect(src).not.toMatch(/fr24State\?\.caption|fr24State\.caption/);
  });
});
