// fr24-city-airports.test.js — v0.62.989. Spec: doc/Feature/2026-11-12-fr24-city-airports-all-maps-user-caps.spec.md
// (A1, A1b, A1c, A2, A9, A11; I1, I2, I3).
//
// The ⋮ menu's ✈️ Airports ▾: the airports near the reader (international first, then domestic, at most 5, within
// 150 km), then Changi and Seletar under Singapore, each airport once, then any of the 152 known cities on request. A
// tap jumps the map to the airport, pins it and opens its board. The server accepts exactly the table's airports with
// an IATA code. Every FR24 request goes through a fake that counts its calls, so "no request" is a measured zero.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  createFr24Layer, airportMenuRows, FR24_AIRPORTS,
} from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const fr24 = require('../fr24.js');
const builder = require('../scripts/build-airport-names.js');
const TABLE = require('../data/airport-names.json');
const { CITY_CENTROIDS } = require('../city-centroids.js');

const TOKEN = 'tok-SECRET-1234567890';
const T0 = Date.parse('2026-11-05T06:00:00Z');
const OWNER = '424242';
const env = { TELEGRAM_OWNER_CHAT_ID: OWNER };

function svcWith() {
  const calls = [];
  const request = async (url) => {
    calls.push(url);
    const u = new URL(url);
    if (u.pathname.endsWith('/flight-summary/light')) return { status: 200, data: { data: [] } };
    return { status: 200, data: { data: [] } };
  };
  return { svc: fr24.createFr24({ token: TOKEN, request, now: () => T0 }), calls };
}
const codes = (list) => list.map((a) => a.icao);
const centre = (name) => CITY_CENTROIDS[name];

// ── A11 — the table carries OurAirports' size rank ──────────────────────────────────────────────────────────────
describe('A11 — the size rank in the airport table', () => {
  it('the builder writes r: 1 large, 2 medium, 3 small, 4 anything else', () => {
    const base = { name: 'X', scheduled_service: 'yes', icao_code: 'ABCD', iata_code: 'ABC', latitude_deg: '1', longitude_deg: '103' };
    expect(builder.entryOf({ ...base, type: 'large_airport' }).r).toBe(1);
    expect(builder.entryOf({ ...base, type: 'medium_airport' }).r).toBe(2);
    expect(builder.entryOf({ ...base, type: 'small_airport' }).r).toBe(3);
    expect(builder.entryOf({ ...base, type: 'heliport' }).r).toBe(4);
    expect(builder.entryOf({ ...base, type: 'seaplane_base' }).r).toBe(4);
  });
  it('every airport in the shipped table has a rank, from the same pinned source file as before', () => {
    const rows = Object.values(TABLE.airports);
    expect(rows.length).toBe(4021);
    expect(rows.every((e) => [1, 2, 3, 4].includes(e.r))).toBe(true);
    expect(TABLE._meta.sha256).toBe('aeb59c38c84720fc78ffb6b713d5f4c968d2aaa0b3fc58fa84385d137ae3de8b');
    expect(TABLE._meta.fields.r).toMatch(/large/);
    expect(TABLE.airports.WSSS.r).toBe(1);
    expect(TABLE.airports.WSSL.r).toBe(2);
  });
});

// ── I1 — the list ───────────────────────────────────────────────────────────────────────────────────────────────
describe('I1 — international first, then domestic, at most 5, within 150 km', () => {
  it('Jakarta: Soekarno-Hatta before Halim, then Changi and Seletar under Singapore', () => {
    const c = centre('Jakarta');
    const m = fr24.airportsMenu(c.lat, c.lng);
    const near = codes(m.near);
    expect(near).toContain('WIII');
    expect(near).toContain('WIHH');
    expect(near.indexOf('WIII')).toBeLessThan(near.indexOf('WIHH'));
    expect(codes(m.singapore)).toEqual(['WSSS', 'WSSL']);
  });
  it('Osaka: Kansai before Itami (Itami is domestic in practice, a cited override)', () => {
    const near = codes(fr24.cityAirports('Osaka').airports);
    expect(near).toContain('RJBB');
    expect(near).toContain('RJOO');
    expect(near.indexOf('RJBB')).toBeLessThan(near.indexOf('RJOO'));
  });
  it('Singapore: Changi and Seletar each appear exactly once in the whole menu', () => {
    const c = centre('Singapore');
    const m = fr24.airportsMenu(c.lat, c.lng);
    const all = [...codes(m.near), ...codes(m.singapore)];
    expect(all.filter((x) => x === 'WSSS')).toHaveLength(1);
    expect(all.filter((x) => x === 'WSSL')).toHaveLength(1);
  });
  it('Savannakhet: its nearest airport is 91 km out and still listed (A1b)', () => {
    const a = fr24.cityAirports('Savannakhet').airports;
    expect(a[0]).toMatchObject({ icao: 'VTUW', iata: 'KOP', km: 91 });
  });
  it('every one of the 152 cities has 1 to 5 airports, each with an IATA code, within 150 km, in order', () => {
    const names = Object.keys(CITY_CENTROIDS);
    expect(names).toHaveLength(152);
    for (const n of names) {
      const a = fr24.cityAirports(n).airports;
      expect(a.length, n).toBeGreaterThan(0);
      expect(a.length, n).toBeLessThanOrEqual(5);
      for (const x of a) {
        expect(x.iata, `${n} ${x.icao}`).toMatch(/^[A-Z0-9]{3}$/);
        expect(x.km, `${n} ${x.icao}`).toBeLessThanOrEqual(150);
      }
      // international (rank 1, no override) first; then by rank; nearest first within a rank
      for (let k = 1; k < a.length; k++) {
        const p = a[k - 1];
        const q = a[k];
        expect(p.order <= q.order, `${n}: ${p.icao} before ${q.icao}`).toBe(true);
        if (p.order === q.order) expect(p.km <= q.km, `${n}: ${p.icao} ${p.km} km before ${q.icao} ${q.km} km`).toBe(true);
        expect(!(q.intl && !p.intl), `${n}: domestic ${p.icao} above international ${q.icao}`).toBe(true);
      }
    }
  });
  it('the menu lists all 152 cities for "Other cities", nearest first from the reader', () => {
    const c = centre('Jakarta');
    const m = fr24.airportsMenu(c.lat, c.lng);
    expect(m.cities).toHaveLength(152);
    expect(m.cities[0].name).toBe('Jakarta');
    for (let k = 1; k < m.cities.length; k++) expect(m.cities[k - 1].km <= m.cities[k].km).toBe(true);
  });
  it('every override names its source, and is a large airport in the table', () => {
    const o = fr24.DOMESTIC_IN_PRACTICE;
    expect(Object.keys(o).length).toBeGreaterThan(0);
    expect(Object.keys(o).length).toBeLessThanOrEqual(10);   // "a short cited override list"
    for (const [icao, src] of Object.entries(o)) {
      expect(TABLE.airports[icao] && TABLE.airports[icao].r, icao).toBe(1);
      expect(src, icao).toMatch(/read \d{2}-\d{2} '\d{2}/);
    }
  });
  it('an unknown city answers null; a point in the sea far from everything answers an empty near list', () => {
    expect(fr24.cityAirports('Atlantis')).toBeNull();
    expect(fr24.airportsMenu(-40, -120).near).toEqual([]);
  });
});

// ── I3 — the server accepts exactly the table's IATA airports ─────────────────────────────────────────────────────
describe('I3 — the whitelist is the table\'s airports with an IATA code', () => {
  it('Soekarno-Hatta and Haneda are accepted, with the planes box around each', async () => {
    const { svc, calls } = svcWith();
    expect((await svc.planes('WIII')).ok).toBe(true);
    expect((await svc.board('RJTT', 'dep')).ok).toBe(true);
    const q = new URL(calls[0]).searchParams;
    expect(q.get('airports')).toBe('both:WIII');
    const [n, s, w, e] = q.get('bounds').split(',').map(Number);
    const [lat, lng] = TABLE.airports.WIII.p;
    expect(n).toBeGreaterThan(lat); expect(s).toBeLessThan(lat);
    expect(e).toBeGreaterThan(lng); expect(w).toBeLessThan(lng);
  });
  it('ZZZZ and a table airport without an IATA code answer badcode, with no FR24 request', async () => {
    const { svc, calls } = svcWith();
    expect(TABLE.airports.CYPK && TABLE.airports.CYPK.i).toBeUndefined();
    for (const bad of ['ZZZZ', 'CYPK', 'wiii', '__proto__', 'constructor']) {
      expect(await svc.planes(bad), bad).toMatchObject({ ok: false, reason: 'badcode' });
      expect(await svc.board(bad, 'dep'), bad).toMatchObject({ ok: false, reason: 'badcode' });
      expect(await svc.gates(bad, ['3b000001']), bad).toMatchObject({ ok: false, reason: 'badcode' });
      expect(await svc.etas(bad, 'arr', ['SIA1']), bad).toMatchObject({ ok: false, reason: 'badcode' });
    }
    expect(calls).toHaveLength(0);
  });
  // Codex review of #1931 (P2): the G/H → Terminal 4 letters are sourced for Changi only. Once other airports were
  // accepted, a gate "G1" at Haneda would have been shown as "G1 · T4".
  it('a gate at another airport carries no terminal; Changi keeps its sourced letters', async () => {
    const calls = [];
    const request = async (url) => {
      calls.push(url);
      return { status: 200, data: { data: [{ fr24_id: '3b000001', events: [{ type: 'gate_arrival', details: { gate_ident: 'G1' } }] }] } };
    };
    const svc = fr24.createFr24({ token: TOKEN, request, now: () => T0 });
    expect((await svc.gates('RJTT', ['3b000001'])).gates['3b000001']).toEqual({ gate: 'G1', terminal: null });
    expect((await svc.gates('WSSS', ['3b000001'])).gates['3b000001']).toEqual({ gate: 'G1', terminal: 'T4' });
    expect(fr24.terminalForGate('G1', 'RJTT')).toBeNull();
    expect(fr24.terminalForGate('G1', 'WSSS')).toBe('T4');
    expect(fr24.terminalForGate('G1')).toBe('T4');   // the existing one-argument call is still Changi's
  });
  it('the near route: owner-only like every other route, 400 on a bad point, a city by name', async () => {
    const { svc, calls } = svcWith();
    expect((await fr24.handle(svc, { kind: 'near', lat: '-6.2', lng: '106.8', userId: '999', env })).status).toBe(403);
    const ok = await fr24.handle(svc, { kind: 'near', lat: '-6.2', lng: '106.8', userId: OWNER, env });
    expect(ok.status).toBe(200);
    expect(ok.body.ok).toBe(true);
    expect(codes(ok.body.near)).toContain('WIII');
    for (const [lat, lng] of [['x', '1'], ['91', '0'], ['0', '181'], ['', '']]) {
      expect((await fr24.handle(svc, { kind: 'near', lat, lng, userId: OWNER, env })).status, `${lat},${lng}`).toBe(400);
    }
    const city = await fr24.handle(svc, { kind: 'near', city: 'Tokyo', userId: OWNER, env });
    expect(city.status).toBe(200);
    expect(codes(city.body.airports)).toContain('RJTT');
    expect((await fr24.handle(svc, { kind: 'near', city: 'Atlantis', userId: OWNER, env })).status).toBe(400);
    expect(calls).toHaveLength(0);   // the table answers; FR24 is never asked
  });
});

// ── I2 — a tap jumps, pins and opens the board ──────────────────────────────────────────────────────────────────
function fakeGmaps() {
  const made = [];
  class Marker {
    constructor(o) { Object.assign(this, o || {}); this.listeners = {}; made.push(this); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; }
    setTitle(t) { this.title = t; }
    addListener(ev, fn) { this.listeners[ev] = fn; return { remove() {} }; }
  }
  class InfoWindow { setContent() {} setPosition() {} open() {} close() {} addListener() { return { remove() {} }; } }
  return { gmaps: { Marker, InfoWindow, Polyline: class { setMap() {} }, SymbolPath: { CIRCLE: 0 }, marker: null }, made };
}
function layerHarness({ point = { lat: -6.2, lng: 106.8 } } = {}) {
  const calls = [];
  const fetchJson = async (u) => {
    calls.push(u);
    if (u === '/api/fr24/access') return { ok: true, enabled: true };
    if (u.startsWith('/api/fr24/airports-near?city=')) {
      return { ok: true, ...fr24.cityAirports(decodeURIComponent(new URL(u, 'http://x').searchParams.get('city'))) };
    }
    if (u.startsWith('/api/fr24/airports-near?')) {
      const q = new URL(u, 'http://x').searchParams;
      return { ok: true, ...fr24.airportsMenu(Number(q.get('lat')), Number(q.get('lng'))) };
    }
    if (u.startsWith('/api/fr24/board/')) return { ok: true, rows: [] };
    return null;
  };
  const { gmaps, made } = fakeGmaps();
  const pans = [];
  const zooms = [];
  const map = { panTo: (p) => pans.push(p), setZoom: (z) => zooms.push(z) };
  let menuChanges = 0;
  const boards = [];
  const layer = createFr24Layer(map, gmaps, {
    fetchJson, lang: 'en', now: () => T0, getPoint: () => point, onMenu: () => { menuChanges += 1; }, onBoard: (b) => boards.push(b),
  });
  return { layer, calls, made, pans, zooms, boards, menuChanges: () => menuChanges };
}

describe('I2 — the menu, and a tap that jumps, pins and opens the board', () => {
  it('init still asks for access only; the menu loads when it is first read, for the reader\'s point', async () => {
    const h = layerHarness();
    await h.layer.init();
    expect(h.calls).toEqual(['/api/fr24/access']);
    expect(h.layer.menuRows()).toEqual([expect.objectContaining({ key: 'h:loading' })]);
    await h.layer.menuReady();
    expect(h.calls).toContain('/api/fr24/airports-near?lat=-6.2&lng=106.8');
    expect(h.menuChanges()).toBeGreaterThan(0);
    const keys = h.layer.menuRows().map((r) => r.key);
    expect(keys[0]).toBe('h:near');
    expect(keys.indexOf('WIII')).toBeLessThan(keys.indexOf('WIHH'));
    expect(keys.indexOf('WIHH')).toBeLessThan(keys.indexOf('h:sg'));
    expect(keys.slice(keys.indexOf('h:sg') + 1, keys.indexOf('h:sg') + 3)).toEqual(['WSSS', 'WSSL']);
    expect(keys[keys.length - 1]).toBe('other');
  });
  it('tapping Soekarno-Hatta pans there, draws its pin and opens its board', async () => {
    const h = layerHarness();
    await h.layer.init();
    h.layer.menuRows();
    await h.layer.menuReady();
    await h.layer.menuPick('WIII');
    const [lat, lng] = TABLE.airports.WIII.p;
    expect(h.pans[h.pans.length - 1]).toEqual({ lat, lng });
    expect(h.made.some((m) => m.fr24Pin === 'WIII')).toBe(true);
    expect(h.layer.openIcao()).toBe('WIII');
    expect(h.calls).toContain('/api/fr24/board/WIII?dir=dep');
    const b = h.boards[h.boards.length - 1];
    expect(b.icao).toBe('WIII');
    expect(b.title).toMatch(/Soekarno-Hatta/);
    expect(b.getThere).toBeNull();
  });
  it('tapping Changi pans to its terminal pin and opens Changi; no second Changi pin is drawn', async () => {
    const h = layerHarness({ point: { lat: 1.3, lng: 103.85 } });
    await h.layer.init();
    h.layer.menuRows();
    await h.layer.menuReady();
    await h.layer.menuPick('WSSS');
    expect(h.layer.openIcao()).toBe('WSSS');
    expect(h.made.filter((m) => m.fr24Pin === 'WSSS')).toHaveLength(1);
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/board/WSSS'))).toHaveLength(1);
  });
  it('Other cities ▸ lists the cities; a city lists its airports; ‹ Back returns', async () => {
    const h = layerHarness();
    await h.layer.init();
    h.layer.menuRows();
    await h.layer.menuReady();
    await h.layer.menuPick('other');
    const cities = h.layer.menuRows();
    expect(cities[0].key).toBe('back');
    expect(cities.filter((r) => r.key.startsWith('city:'))).toHaveLength(152);
    await h.layer.menuPick('city:Tokyo');
    const tokyo = h.layer.menuRows().map((r) => r.key);
    expect(tokyo[0]).toBe('back');
    expect(tokyo).toContain('RJTT');
    expect(h.calls).toContain('/api/fr24/airports-near?city=Tokyo');
    await h.layer.menuPick('RJTT');
    expect(h.layer.openIcao()).toBe('RJTT');
    await h.layer.menuPick('back');
    expect(h.layer.menuRows()[0].key).toBe('back');                     // back to the city list
    await h.layer.menuPick('back');
    expect(h.layer.menuRows()[0].key).toBe('h:near');                   // back to the start
  });
  it('a heading row does nothing; an unknown key does nothing', async () => {
    const h = layerHarness();
    await h.layer.init();
    h.layer.menuRows();
    await h.layer.menuReady();
    const before = h.calls.length;
    await h.layer.menuPick('h:near');
    await h.layer.menuPick('ZZZZ');
    expect(h.calls.length).toBe(before);
    expect(h.layer.openIcao()).toBeNull();
  });
  it('the menu reloads when the reader has moved more than 20 km, and not before', async () => {
    let point = { lat: -6.2, lng: 106.8 };
    const h = layerHarness();
    h.layer.destroy();
    const calls = [];
    const layer = createFr24Layer({ panTo() {} }, fakeGmaps().gmaps, {
      fetchJson: async (u) => { calls.push(u); if (u === '/api/fr24/access') return { ok: true, enabled: true }; const q = new URL(u, 'http://x').searchParams; return { ok: true, ...fr24.airportsMenu(Number(q.get('lat')), Number(q.get('lng'))) }; },
      lang: 'en', now: () => T0, getPoint: () => point,
    });
    await layer.init();
    layer.menuRows(); await layer.menuReady();
    point = { lat: -6.25, lng: 106.85 };                                  // about 8 km
    layer.menuRows(); await layer.menuReady();
    expect(calls.filter((u) => u.startsWith('/api/fr24/airports-near'))).toHaveLength(1);
    point = { lat: 1.3, lng: 103.85 };                                    // Singapore
    layer.menuRows(); await layer.menuReady();
    expect(calls.filter((u) => u.startsWith('/api/fr24/airports-near'))).toHaveLength(2);
  });
  it('airportMenuRows labels: IATA, name and distance; Changi and Seletar by their translated names', () => {
    const c = centre('Singapore');
    const rows = airportMenuRows({ view: 'main', menu: fr24.airportsMenu(c.lat, c.lng), lang: 'zh', open: 'WSSS' });
    const changi = rows.find((r) => r.key === 'WSSS');
    expect(changi.label).toMatch(/^SIN 樟宜 · \d+ km$/);
    expect(changi.active).toBe(true);
    expect(rows.find((r) => r.key === 'WIDD').label).toMatch(/^BTH Hang Nadim · \d+ km$/);
    expect(FR24_AIRPORTS).toEqual({ WSSS: { lat: 1.35019, lng: 103.994003 }, WSSL: { lat: 1.41555, lng: 103.86673 } });
  });
});
