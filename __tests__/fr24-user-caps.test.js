// fr24-user-caps.test.js — v0.62.989. Spec: doc/Feature/2026-11-12-fr24-city-airports-all-maps-user-caps.spec.md
// (A3, A6, A7, A8; I4, I5, I6, I8).
//
// Each reader other than the owner may spend at most 500 Flightradar24 credits per Singapore calendar day. A cache hit
// costs nothing; the cap blocks only NEW FR24 calls and answers `quota`. A call is refused when its worst case would
// pass the cap, and the worst case is reserved before the request leaves, so two calls at once cannot both squeeze
// under it. The board says so once at 50, 70, 80 and 90 %, and at the cap it says the data is used up and asks FR24
// for nothing more. Access is unchanged: owner-only unless FR24_PUBLIC is exactly '1'.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { RedisStub } from './redis-stub.js';
import { createFr24Layer, FR24_LOCALES, FR24_STRINGS, ft } from '../web/transport/src/lib/fr24-layer.js';

const require = createRequire(import.meta.url);
const fr24 = require('../fr24.js');
const TABLE = require('../data/airport-names.json');

const TOKEN = 'tok-SECRET-1234567890';
const OWNER = '424242';
const READER = '999';
const T0 = Date.parse('2026-11-05T06:00:00Z'); // 14:00 SGT
const PUBLIC = { TELEGRAM_OWNER_CHAT_ID: OWNER, FR24_PUBLIC: '1' };
const PRIVATE = { TELEGRAM_OWNER_CHAT_ID: OWNER };

const row = (i) => ({
  fr24_id: `3b${String(i).padStart(6, '0')}`, flight: `SQ${i}`, callsign: `SIA${i}`, orig_icao: 'WSSS', dest_icao: 'RJTT',
  datetime_takeoff: '2026-11-05T05:10:00Z', datetime_landed: null, flight_ended: false,
});
const plane = (i) => ({ fr24_id: `3a${String(i).padStart(6, '0')}`, callsign: `SIA${i}`, lat: 1.35, lon: 103.99, track: 90, gspeed: 300, alt: 9000 });

function svcWith({ rows = 20, planes = 20, budget, cache = null, delay = 0 } = {}) {
  const calls = [];
  let t = T0;
  const request = async (url) => {
    calls.push(url);
    if (delay) await new Promise((r) => setTimeout(r, delay));
    const u = new URL(url);
    if (u.pathname.endsWith('/flight-summary/light')) return { status: 200, data: { data: Array.from({ length: rows }, (_, i) => row(i)) } };
    if (u.pathname.endsWith('/live/flight-positions/light')) return { status: 200, data: { data: Array.from({ length: planes }, (_, i) => plane(i)) } };
    return { status: 200, data: { data: [] } };
  };
  const svc = fr24.createFr24({ token: TOKEN, request, now: () => t, budget, cache });
  return { svc, calls, advance: (ms) => { t += ms; } };
}
const FIVE_MIN = 301 * 1000;

// ── I4 — at most 500 credits per reader per SGT day ──────────────────────────────────────────────────────────────
describe('I4 — a reader other than the owner cannot spend more than 500 credits per Singapore day', () => {
  for (const withRedis of [false, true]) {
    it(`boards until refused, never past 500, and no FR24 call once refused (${withRedis ? 'Redis' : 'memory'})`, async () => {
      const { svc, calls, advance } = svcWith({ cache: withRedis ? new RedisStub() : null });
      // A different airport each time, so no answer is a cache hit (the Redis stub expires on the real clock, not on
      // this test's), and a minute apart, so the 8-a-minute rate limit never answers instead of the cap.
      const icaos = Object.keys(TABLE.airports).filter((c) => fr24.isKnownAirport(c)).slice(0, 40);
      let last = null;
      let refusedAt = null;
      for (let k = 0; k < 40; k++) {
        const r = await fr24.handle(svc, { kind: 'board', icao: icaos[k], dir: 'dep', userId: READER, env: PUBLIC });
        last = r.body;
        expect(r.body.usage.used, `call ${k}`).toBeLessThanOrEqual(500);
        if (r.body.reason === 'quota') { refusedAt = calls.length; break; }
        advance(61 * 1000);
      }
      expect(last).toMatchObject({ ok: false, reason: 'quota' });
      expect(last.usage).toMatchObject({ cap: 500 });
      expect(last.usage.used).toBe(480);              // 24 boards of 20; the 25th could cost 40 and pass 500
      // a refusal makes no request, then or later in the day
      await fr24.handle(svc, { kind: 'airport', icao: 'WSSS', userId: READER, env: PUBLIC });
      expect(calls.length).toBe(refusedAt);
      expect(await svc.userSpent(READER)).toBe(480);
    });
  }
  it('two calls at once cannot both squeeze under the cap (the worst case is reserved first)', async () => {
    const { svc, calls } = svcWith({ delay: 5 });
    // 4 planes answers of 20 planes cost 120 each: 480. The fifth would pass 500.
    const icaos = ['WSSS', 'WSSL', 'WIII', 'RJTT', 'VTBS', 'WMKK', 'RKSI'];
    const out = await Promise.all(icaos.map((icao) => fr24.handle(svc, { kind: 'airport', icao, userId: READER, env: PUBLIC })));
    const ok = out.filter((r) => r.body.ok);
    expect(ok).toHaveLength(4);
    expect(out.filter((r) => r.body.reason === 'quota')).toHaveLength(3);
    expect(calls).toHaveLength(4);
    expect(await svc.userSpent(READER)).toBe(480);
  });
  it('an answer cheaper than its worst case gives the difference back', async () => {
    const { svc } = svcWith({ rows: 3 });
    await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: READER, env: PUBLIC });
    expect(await svc.userSpent(READER)).toBe(3);
  });
  it('a failed FR24 call costs the reader nothing', async () => {
    const calls = [];
    const svc = fr24.createFr24({ token: TOKEN, now: () => T0, request: async (u) => { calls.push(u); return { status: 500, data: null }; } });
    const r = await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: READER, env: PUBLIC });
    expect(r.body.ok).toBe(false);
    expect(await svc.userSpent(READER)).toBe(0);
  });
  it('a cache hit costs the reader nothing, even one another reader paid for', async () => {
    const { svc, calls } = svcWith();
    await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: READER, env: PUBLIC });
    const r = await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: '888', env: PUBLIC });
    expect(r.body.ok).toBe(true);
    expect(calls).toHaveLength(1);
    expect(await svc.userSpent('888')).toBe(0);
    expect(r.body.usage).toMatchObject({ used: 0, cap: 500, pct: 0 });
  });
  it('the next Singapore day starts at zero', async () => {
    const { svc, advance } = svcWith();
    await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: READER, env: PUBLIC });
    expect(await svc.userSpent(READER)).toBe(20);
    advance(10 * 3600 * 1000);                                  // 14:00 SGT + 10 h = 00:00 the next day
    expect(await svc.userSpent(READER)).toBe(0);
  });
  it('the owner is never capped and gets no usage field', async () => {
    const { svc, advance } = svcWith({ planes: 20 });
    for (let k = 0; k < 6; k++) {
      const r = await fr24.handle(svc, { kind: 'airport', icao: 'WSSS', userId: OWNER, env: PUBLIC });
      expect(r.body.ok, `call ${k}`).toBe(true);
      expect(r.body.usage).toBeUndefined();
      advance(61 * 1000 * 2);
    }
  });
  it('the reader\'s counter is keyed on a hash of the id, never the id itself, and expires', async () => {
    const cache = new RedisStub();
    const { svc } = svcWith({ cache });
    await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: READER, env: PUBLIC });
    const keys = [...cache.store.keys()].filter((k) => k.startsWith('fr24:user:'));
    expect(keys).toHaveLength(1);
    expect(keys[0]).toMatch(/^fr24:user:[0-9a-f]{16}:2026-11-05$/);
    expect(keys[0]).not.toContain(READER);
    expect(cache.store.get(keys[0]).expiresAt).not.toBeNull();
  });
});

// ── I8 — the monthly budget still holds ─────────────────────────────────────────────────────────────────────────
describe('I8 — the monthly budget holds over every reader\'s cap', () => {
  it('a reader under their own cap is still refused once the month\'s budget is spent', async () => {
    const { svc, advance } = svcWith({ budget: 40 });
    const a = await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: READER, env: PUBLIC });
    advance(FIVE_MIN);
    const b = await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: '888', env: PUBLIC });
    advance(FIVE_MIN);
    const c = await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'dep', userId: '777', env: PUBLIC });
    expect([a.body.ok, b.body.ok]).toEqual([true, true]);
    expect(c.body).toMatchObject({ ok: false, reason: 'budget' });
    expect(await svc.spent()).toBe(40);
  });
});

// ── I6 — access is unchanged ────────────────────────────────────────────────────────────────────────────────────
describe('I6 — owner-only unless FR24_PUBLIC is exactly 1', () => {
  it('a reader is refused on every route without FR24_PUBLIC, the new airports route included', async () => {
    const { svc, calls } = svcWith();
    expect((await fr24.handle(svc, { kind: 'access', userId: READER, env: PRIVATE })).body.enabled).toBe(false);
    for (const kind of ['board', 'airport', 'flight', 'locate', 'gates', 'track', 'eta', 'near']) {
      const r = await fr24.handle(svc, { kind, icao: 'WSSS', dir: 'dep', id: '3b000001', callsign: 'SIA1', ids: '3b000001', cs: 'SIA1', lat: '1.3', lng: '103.8', userId: READER, env: PRIVATE });
      expect(r, kind).toEqual({ status: 403, body: { ok: false, reason: 'owner-only' } });
    }
    for (const v of ['true', 'yes', '0', '']) {
      expect((await fr24.handle(svc, { kind: 'access', userId: READER, env: { ...PRIVATE, FR24_PUBLIC: v } })).body.enabled, v).toBe(false);
    }
    expect(calls).toHaveLength(0);
  });
});

// ── I5 — warnings at 50, 70, 80, 90 %, and a clear message at the cap ─────────────────────────────────────────
function fakeGmaps() {
  class Marker {
    constructor(o) { Object.assign(this, o || {}); }
    setMap(m) { this.map = m; } setPosition(p) { this.position = p; }
    addListener() { return { remove() {} }; }
  }
  class InfoWindow { setContent() {} setPosition() {} open() {} close() {} addListener() { return { remove() {} }; } }
  return { Marker, InfoWindow, Polyline: class { setMap() {} }, SymbolPath: { CIRCLE: 0 }, marker: null };
}
function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}
function layerWith(pcts, { storage = memoryStorage(), lang = 'en' } = {}) {
  const calls = [];
  let n = 0;
  const fetchJson = async (u) => {
    calls.push(u);
    if (u === '/api/fr24/access') return { ok: true, enabled: true };
    if (u.startsWith('/api/weather/')) return null;
    const pct = pcts[Math.min(n, pcts.length - 1)];
    n += 1;
    const usage = { used: pct * 5, cap: 500, pct };
    if (pct >= 100) return { ok: false, reason: 'quota', usage };
    if (u.startsWith('/api/fr24/board/')) return { ok: true, rows: [], usage };
    if (u.startsWith('/api/fr24/airport/')) return { ok: true, readAt: new Date(T0).toISOString(), planes: [], usage };
    return { ok: true, usage };
  };
  const boards = [];
  let t = T0;
  const layer = createFr24Layer({ panTo() {} }, fakeGmaps(), { fetchJson, lang, now: () => t, onBoard: (b) => boards.push(b), storage });
  return { layer, calls, boards, storage, last: () => boards[boards.length - 1], advance: (ms) => { t += ms; } };
}

describe('I5 — the board warns once at each of 50, 70, 80 and 90 %', () => {
  it('a crossing shows one line naming the threshold; the next answer under the same threshold adds nothing', async () => {
    const h = layerWith([52, 55, 71, 85, 91]);
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    expect(h.last().usage).toBe(ft('usage.warn', 'en', { pct: 50 }));
    expect(h.last().usage).toMatch(/50 ?%/);
    await h.layer.setTab('arr');                                 // 55 %: still the 50 % line, not a second one
    expect(h.last().usage).toBe(ft('usage.warn', 'en', { pct: 50 }));
    h.layer.closeBoard();
    h.advance(FIVE_MIN);
    await h.layer.openBoard('WSSL');                             // 71 %
    expect(h.last().usage).toBe(ft('usage.warn', 'en', { pct: 70 }));
    h.layer.closeBoard();
    h.advance(FIVE_MIN);
    await h.layer.openBoard('WSSS');                             // 85 %
    expect(h.last().usage).toBe(ft('usage.warn', 'en', { pct: 80 }));
    h.layer.closeBoard();
    h.advance(FIVE_MIN);
    await h.layer.openBoard('WSSL');                             // 91 %
    expect(h.last().usage).toBe(ft('usage.warn', 'en', { pct: 90 }));
  });
  it('a threshold already shown today is not shown again, even after the app is reopened', async () => {
    const storage = memoryStorage();
    const a = layerWith([52], { storage });
    await a.layer.init();
    await a.layer.openBoard('WSSS');
    expect(a.last().usage).toBeTruthy();
    const b = layerWith([53], { storage });                      // a fresh layer, the same day, the same phone
    await b.layer.init();
    await b.layer.openBoard('WSSS');
    expect(b.last().usage).toBeNull();
  });
  it('a closed board drops the line; no usage, no line (the owner)', async () => {
    const h = layerWith([52]);
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    h.layer.closeBoard();
    h.advance(FIVE_MIN);
    await h.layer.openBoard('WSSS');
    expect(h.last().usage).toBeNull();
  });
  it('at the cap the board says so, offers no planes button, and asks for nothing more', async () => {
    const h = layerWith([92, 100]);
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    await h.layer.setTab('arr');                                 // this answer is the quota refusal
    const m = h.last();
    expect(m.full).toBe(true);
    expect(m.usage).toBe(ft('err.quota', 'en'));
    expect(m.planesLabel).toBeNull();
    const before = h.calls.length;
    await h.layer.togglePlanes('WSSS');
    await h.layer.setTab('dep');
    await h.layer.openBoard('WSSL');
    await h.layer.openFlight('3b000001');
    expect(h.calls.length).toBe(before);
  });
  // Codex review of #1931 (P2): an app left open across Singapore midnight kept refusing every request, although the
  // server's count had started again.
  it('a used-up day ends at Singapore midnight: the next board asks the server again', async () => {
    const h = layerWith([100, 10]);
    await h.layer.init();
    await h.layer.openBoard('WSSS');                             // quota
    expect(h.last().full).toBe(true);
    const before = h.calls.length;
    await h.layer.openBoard('WSSL');
    expect(h.calls.length).toBe(before);                         // still the same day: nothing asked
    h.layer.closeBoard();
    h.advance(10 * 3600 * 1000);                                 // 14:00 SGT + 10 h = 00:00 the next day
    await h.layer.openBoard('WSSL');
    expect(h.calls.filter((u) => u.startsWith('/api/fr24/board/WSSL'))).toHaveLength(1);
    expect(h.last().full).toBe(false);
    expect(h.last().usage).toBeNull();                           // 10 %: under the first threshold
  });
  it('the warning and the used-up message exist in all nine languages, with the number in each', () => {
    for (const l of FR24_LOCALES) {
      expect(FR24_STRINGS['usage.warn'][l], l).toBeTruthy();
      expect(ft('usage.warn', l, { pct: 70 }), l).toContain('70');
      expect(FR24_STRINGS['err.quota'][l], l).toBeTruthy();
      if (l !== 'en') {
        expect(FR24_STRINGS['usage.warn'][l], l).not.toBe(FR24_STRINGS['usage.warn'].en);
        expect(FR24_STRINGS['err.quota'][l], l).not.toBe(FR24_STRINGS['err.quota'].en);
      }
    }
  });
  it('a Korean reader gets the Korean line', async () => {
    const h = layerWith([72], { lang: 'ko' });
    await h.layer.init();
    await h.layer.openBoard('WSSS');
    expect(h.last().usage).toBe(ft('usage.warn', 'ko', { pct: 70 }));
  });
});
