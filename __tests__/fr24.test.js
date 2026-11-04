// fr24.test.js — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md (amendments 1 and 2).
//
// The server half of the Flightradar24 pilot: fr24.js builds every FR24 request, caches every answer, refuses past
// 8 requests a minute and past the monthly credit budget, names airports from the OurAirports table, and lets only
// the owner in until FR24_PUBLIC is exactly '1'. Every test uses a fake request function and counts its calls, so
// "no FR24 request happened" is a measured zero, not an assumption. Invariants: I1, I3, I4, I5, I9, I11, I13, I14.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { RedisStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const fr24 = require('../fr24.js');
const builder = require('../scripts/build-airport-names.js');
const TABLE = require('../data/airport-names.json');

const TOKEN = 'tok-SECRET-1234567890';
const OWNER = '424242';
const T0 = Date.parse('2026-11-05T06:00:00Z'); // 14:00 SGT

const pos = (i, extra = {}) => ({
  fr24_id: `3a${String(i).padStart(6, '0')}`, hex: 'ABC', callsign: `SIA${i}`, lat: 1.35 + i * 0.01, lon: 103.99,
  track: 90, alt: 3000 + i, gspeed: 180, vspeed: -500, squawk: '1234', timestamp: '2026-11-05T05:59:50Z', source: 'ADSB', ...extra,
});
const summary = (i, ended, extra = {}) => ({
  fr24_id: `3b${String(i).padStart(6, '0')}`, flight: `SQ${i}`, callsign: `SIA${i}`, operating_as: 'SIA', painted_as: 'SIA',
  type: 'A359', reg: '9V-SMA', orig_icao: 'WSSS', dest_icao: 'EGLL', dest_icao_actual: 'EGLL',
  datetime_takeoff: '2026-11-05T05:10:00Z', datetime_landed: ended ? '2026-11-05T05:50:00Z' : null,
  first_seen: '2026-11-05T04:50:00Z', last_seen: '2026-11-05T05:55:00Z', flight_ended: ended, ...extra,
});

// A fake FR24: records every request and answers by path.
function fakeFr24({ planes = [pos(1), pos(2)], rows = [summary(1, true), summary(2, false)], status = 200, usage = null } = {}) {
  const calls = [];
  const request = async (url, headers) => {
    calls.push({ url, headers });
    if (typeof status === 'function') { const s = status(calls.length); if (s !== 200) return { status: s, data: { message: 'x' } }; }
    else if (status !== 200) return { status, data: { message: 'Forbidden', details: 'Credit limit reached.' } };
    const u = new URL(url);
    if (u.pathname.endsWith('/live/flight-positions/light')) return { status: 200, data: { data: planes } };
    if (u.pathname.endsWith('/flight-summary/light')) return { status: 200, data: { data: rows } };
    if (u.pathname.endsWith('/usage')) return { status: 200, data: usage || { data: [{ endpoint: 'live/flight-positions/light', request_count: 3, credits: 36 }, { endpoint: 'flight-summary/light', request_count: 2, credits: 6 }] } };
    return { status: 404, data: { message: 'Not found' } };
  };
  return { calls, request };
}
function svcWith(opts = {}) {
  const f = fakeFr24(opts);
  let t = opts.t0 ?? T0;
  const clock = { now: () => t, advance: (ms) => { t += ms; } };
  const svc = fr24.createFr24({ token: 'token' in opts ? opts.token : TOKEN, request: f.request, cache: opts.cache ?? null, now: clock.now, budget: opts.budget });
  return { svc, calls: f.calls, clock };
}
const qs = (url) => new URL(url).searchParams;

// ── I5 — well-formed plane requests ─────────────────────────────────────────────────────────────────────────────
describe('I5 — the planes request', () => {
  it('base, both headers, bounds around the tapped airport, both:<code>, limit 20', async () => {
    const { svc, calls } = svcWith();
    const r = await svc.planes('WSSS');
    expect(r.ok).toBe(true);
    expect(calls).toHaveLength(1);
    const { url, headers } = calls[0];
    expect(url.startsWith('https://fr24api.flightradar24.com/api/live/flight-positions/light?')).toBe(true);
    expect(headers).toMatchObject({ Authorization: `Bearer ${TOKEN}`, 'Accept-Version': 'v1' });
    const q = qs(url);
    expect(q.get('airports')).toBe('both:WSSS');
    expect(q.get('limit')).toBe('20');
    const [n, s, w, e] = q.get('bounds').split(',').map(Number);
    const a = fr24.AIRPORTS.WSSS;
    expect(n).toBeGreaterThan(a.lat); expect(s).toBeLessThan(a.lat);
    expect(e).toBeGreaterThan(a.lng); expect(w).toBeLessThan(a.lng);
    // About 60 x 60 km: 0.54 degrees of latitude, give or take rounding.
    expect(n - s).toBeGreaterThan(0.5); expect(n - s).toBeLessThan(0.58);
    expect(e - w).toBeGreaterThan(0.5); expect(e - w).toBeLessThan(0.58);
    for (const v of q.get('bounds').split(',')) expect(v).toMatch(/^-?\d+\.\d{1,3}$/);
  });
  it('Seletar asks for both:WSSL around Seletar', async () => {
    const { svc, calls } = svcWith();
    await svc.planes('WSSL');
    expect(qs(calls[0].url).get('airports')).toBe('both:WSSL');
    const [n, s] = qs(calls[0].url).get('bounds').split(',').map(Number);
    expect((n + s) / 2).toBeCloseTo(fr24.AIRPORTS.WSSL.lat, 2);
  });
  it('only WSSS and WSSL are accepted: anything else is refused before any request', async () => {
    const { svc, calls } = svcWith();
    for (const bad of ['WSAP', 'wsss', 'EGLL', '', null, 'WSSS,EGLL']) {
      expect(await svc.planes(bad)).toMatchObject({ ok: false, reason: 'badcode' });
      expect(await svc.board(bad, 'dep')).toMatchObject({ ok: false, reason: 'badcode' });
    }
    expect(calls).toHaveLength(0);
  });
  it('a plane comes back with position, heading, speed, altitude and the reading time', async () => {
    const { svc } = svcWith();
    const r = await svc.planes('WSSS');
    expect(r.planes[0]).toMatchObject({ id: '3a000001', callsign: 'SIA1', lat: 1.36, lng: 103.99, track: 90, gspeed: 180, alt: 3001 });
    expect(r.readAt).toBe('2026-11-05T06:00:00Z');       // FR24's own format: whole seconds, Z
    expect(r.source).toBe('Flightradar24');
  });
});

// ── I11 — the board request ─────────────────────────────────────────────────────────────────────────────────────
describe('I11 — the board request', () => {
  it('Departures: flight-summary/light, outbound:<code>, a 3-hour first_seen window, sort desc, limit 20', async () => {
    const { svc, calls } = svcWith();
    await svc.board('WSSS', 'dep');
    const u = new URL(calls[0].url);
    expect(u.origin + u.pathname).toBe('https://fr24api.flightradar24.com/api/flight-summary/light');
    expect(u.searchParams.get('airports')).toBe('outbound:WSSS');
    expect(u.searchParams.get('sort')).toBe('desc');
    expect(u.searchParams.get('limit')).toBe('20');
    expect(u.searchParams.get('flight_datetime_to')).toBe('2026-11-05T06:00:00Z');
    expect(u.searchParams.get('flight_datetime_from')).toBe('2026-11-05T03:00:00Z');
  });
  it('Arrivals asks inbound:<code>, never outbound', async () => {
    const { svc, calls } = svcWith();
    await svc.board('WSSL', 'arr');
    expect(qs(calls[0].url).get('airports')).toBe('inbound:WSSL');
  });
  it('an unknown direction is refused before any request', async () => {
    const { svc, calls } = svcWith();
    expect(await svc.board('WSSS', 'both')).toMatchObject({ ok: false, reason: 'baddir' });
    expect(calls).toHaveLength(0);
  });
  it('rows carry the flight, airline code, aircraft, times, ended flag, and airport names from the table', async () => {
    const { svc } = svcWith();
    const r = await svc.board('WSSS', 'dep');
    expect(r.ok).toBe(true);
    expect(r.dir).toBe('dep');
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toMatchObject({ id: '3b000001', flight: 'SQ1', airline: 'SIA', type: 'A359', ended: true, takeoff: '2026-11-05T05:10:00Z', landed: '2026-11-05T05:50:00Z' });
    expect(r.rows[0].dest).toEqual({ code: 'EGLL', iata: 'LHR', city: 'London', name: 'London Heathrow Airport' });
    expect(r.rows[0].orig).toMatchObject({ code: 'WSSS', iata: 'SIN' });
    expect(r.rows[1]).toMatchObject({ ended: false, landed: null });
  });
});

// ── I3 — caching ────────────────────────────────────────────────────────────────────────────────────────────────
describe('I3 — answers are cached, failures are not', () => {
  it('a board tab for 5 minutes', async () => {
    const { svc, calls, clock } = svcWith();
    await svc.board('WSSS', 'dep');
    clock.advance(299 * 1000);
    await svc.board('WSSS', 'dep');
    expect(calls).toHaveLength(1);
    await svc.board('WSSS', 'arr');
    expect(calls).toHaveLength(2);       // a different tab is a different answer
    clock.advance(2 * 1000);
    await svc.board('WSSS', 'dep');
    expect(calls).toHaveLength(3);
  });
  it('planes for 60 seconds', async () => {
    const { svc, calls, clock } = svcWith();
    await svc.planes('WSSS');
    clock.advance(59 * 1000);
    await svc.planes('WSSS');
    expect(calls).toHaveLength(1);
    clock.advance(2 * 1000);
    await svc.planes('WSSS');
    expect(calls).toHaveLength(2);
  });
  it('a flight for 10 minutes', async () => {
    const { svc, calls, clock } = svcWith();
    await svc.flight('3b000001');
    clock.advance(599 * 1000);
    await svc.flight('3b000001');
    expect(calls).toHaveLength(1);
    clock.advance(2 * 1000);
    await svc.flight('3b000001');
    expect(calls).toHaveLength(2);
    expect(qs(calls[0].url).get('flight_ids')).toBe('3b000001');
  });
  it('a failure is not cached: the next request tries again', async () => {
    const { svc, calls } = svcWith({ status: (n) => (n === 1 ? 500 : 200) });
    expect(await svc.planes('WSSS')).toMatchObject({ ok: false, reason: 'error' });
    expect((await svc.planes('WSSS')).ok).toBe(true);
    expect(calls).toHaveLength(2);
  });
  it('the shared cache serves a second process: one FR24 request for two services', async () => {
    const cache = new RedisStub();
    const a = svcWith({ cache });
    const b = svcWith({ cache });
    await a.svc.planes('WSSS');
    const r = await b.svc.planes('WSSS');
    expect(r.ok).toBe(true);
    expect(a.calls.length + b.calls.length).toBe(1);
  });
  it('a flight id that is not FR24-shaped is refused before any request', async () => {
    const { svc, calls } = svcWith();
    for (const bad of ['', 'x', '3b0000,3b0001', '../usage', 'zzzzzzzz']) expect(await svc.flight(bad)).toMatchObject({ ok: false, reason: 'badid' });
    expect(calls).toHaveLength(0);
  });
});

// ── I4 — rate guard and budget guard ───────────────────────────────────────────────────────────────────────────
describe('I4 — at most 8 requests a minute, none past the budget or after a 402', () => {
  it('the 9th request inside a minute is not made; past the minute it is', async () => {
    const { svc, calls, clock } = svcWith();
    const ids = Array.from({ length: 9 }, (_, i) => `3c${String(i).padStart(6, '0')}`);
    for (const id of ids.slice(0, 8)) expect((await svc.flight(id)).ok).toBe(true);
    expect(calls).toHaveLength(8);
    expect(await svc.flight(ids[8])).toMatchObject({ ok: false, reason: 'busy' });
    expect(calls).toHaveLength(8);
    clock.advance(61 * 1000);
    expect((await svc.flight(ids[8])).ok).toBe(true);
    expect(calls).toHaveLength(9);
  });
  it('when busy, the last good answer is served (marked stale) rather than nothing', async () => {
    const { svc, calls, clock } = svcWith();
    await svc.planes('WSSS');                       // 1
    clock.advance(61 * 1000);                       // planes cache expired, rate window clear
    for (let i = 0; i < 8; i++) await svc.flight(`3d${String(i).padStart(6, '0')}`);
    const r = await svc.planes('WSSS');
    expect(calls).toHaveLength(9);
    expect(r).toMatchObject({ ok: true, stale: true });
    expect(r.planes).toHaveLength(2);
  });
  it('credits are counted from what each answer returned: 6 a plane, 1 a live summary, 2 an ended one, 1 an empty answer', async () => {
    const a = svcWith();
    await a.svc.planes('WSSS');
    expect(await a.svc.spent()).toBe(12);
    await a.svc.board('WSSS', 'dep');                // one ended (2) + one live (1)
    expect(await a.svc.spent()).toBe(15);
    const b = svcWith({ planes: [] });
    await b.svc.planes('WSSS');
    expect(await b.svc.spent()).toBe(1);
    expect(fr24.creditsForPlanes(0)).toBe(1);
    expect(fr24.creditsForSummary([])).toBe(1);
    expect(fr24.creditsForSummary([{ flight_ended: true }, { flight_ended: false }, { flight_ended: true }])).toBe(5);
  });
  it('at the budget the routes answer budget and make no request', async () => {
    const { svc, calls } = svcWith({ budget: 12 });
    await svc.planes('WSSS');                        // 12 credits: the budget is now spent
    expect(await svc.board('WSSS', 'dep')).toMatchObject({ ok: false, reason: 'budget' });
    expect(calls).toHaveLength(1);
  });
  it('the count is per calendar month in Singapore time, held in the shared cache', async () => {
    const cache = new RedisStub();
    const { svc } = svcWith({ cache });
    await svc.planes('WSSS');
    expect(await cache.get('fr24:credits:2026-11')).toBe('12');
    expect(fr24.monthKeySgt(Date.parse('2026-11-30T16:30:00Z'))).toBe('2026-12'); // 00:30 SGT on 1 Dec
    expect(fr24.monthKeySgt(Date.parse('2026-11-30T15:59:00Z'))).toBe('2026-11');
  });
  it('the default budget is 25,000, and FR24_MONTHLY_CREDIT_BUDGET overrides it', () => {
    expect(fr24.DEFAULT_BUDGET).toBe(25000);
    expect(fr24.budgetFrom({})).toBe(25000);
    expect(fr24.budgetFrom({ FR24_MONTHLY_CREDIT_BUDGET: '5000' })).toBe(5000);
    expect(fr24.budgetFrom({ FR24_MONTHLY_CREDIT_BUDGET: 'lots' })).toBe(25000);
  });
  it('a 402 stops every request until the month turns', async () => {
    let paid = false;
    const { svc, calls, clock } = svcWith({ status: () => (paid ? 200 : 402), t0: Date.parse('2026-11-30T15:00:00Z') });
    expect(await svc.planes('WSSS')).toMatchObject({ ok: false, reason: 'budget' });
    expect(await svc.board('WSSS', 'dep')).toMatchObject({ ok: false, reason: 'budget' });
    expect(calls).toHaveLength(1);
    paid = true;
    clock.advance(2 * 3600 * 1000);                  // 01:00 SGT on 1 December
    expect((await svc.planes('WSSS')).ok).toBe(true);
    expect(calls).toHaveLength(2);
  });
  it('a 429 from FR24 is busy, not an error that is cached', async () => {
    const { svc, calls } = svcWith({ status: (n) => (n === 1 ? 429 : 200) });
    expect(await svc.planes('WSSS')).toMatchObject({ ok: false, reason: 'busy' });
    expect((await svc.planes('WSSS')).ok).toBe(true);
    expect(calls).toHaveLength(2);
  });
});

// ── I1 — the token never leaves the server ─────────────────────────────────────────────────────────────────────
describe('I1 — the token stays on the server', () => {
  it('no answer, success or failure, contains the token', async () => {
    const outs = [];
    const a = svcWith();
    outs.push(await a.svc.planes('WSSS'), await a.svc.board('WSSS', 'dep'), await a.svc.flight('3b000001'), await a.svc.usage());
    for (const s of [401, 402, 429, 500]) {
      const b = svcWith({ status: s });
      outs.push(await b.svc.planes('WSSS'));
    }
    const env = { TELEGRAM_OWNER_CHAT_ID: OWNER };
    outs.push(await fr24.handle(a.svc, { kind: 'airport', icao: 'WSSS', userId: OWNER, env }));
    outs.push(await fr24.usageReply(a.svc, { chatId: OWNER, env }));
    for (const o of outs) expect(JSON.stringify(o)).not.toContain(TOKEN);
  });
  it('without a token every call answers nokey and makes no request', async () => {
    const { svc, calls } = svcWith({ token: '' });
    expect(await svc.planes('WSSS')).toMatchObject({ ok: false, reason: 'nokey' });
    expect(await svc.board('WSSS', 'dep')).toMatchObject({ ok: false, reason: 'nokey' });
    expect(await svc.flight('3b000001')).toMatchObject({ ok: false, reason: 'nokey' });
    expect(calls).toHaveLength(0);
  });
  it('the token is read from FLIGHTRADER24_API_TOKEN only', () => {
    expect(fr24.tokenFrom({ FLIGHTRADER24_API_TOKEN: 'a' })).toBe('a');
    expect(fr24.tokenFrom({ FLIGHTRADER24_API_KEY: 'b' })).toBe('');
    expect(fr24.tokenFrom({})).toBe('');
  });
  it('nothing under web/ names FR24\'s host or the token variable', () => {
    const hits = [];
    const walk = (d) => {
      for (const f of fs.readdirSync(d)) {
        if (f === 'node_modules' || f === 'dist') continue;
        const p = path.join(d, f);
        if (fs.statSync(p).isDirectory()) walk(p);
        else if (/\.(jsx?|mjs|html|json)$/.test(f)) {
          const s = fs.readFileSync(p, 'utf8');
          if (/fr24api\.flightradar24\.com|FLIGHTRADER24/.test(s)) hits.push(p);
        }
      }
    };
    walk(path.join(process.cwd(), 'web'));
    expect(hits).toEqual([]);
  });
});

// ── I14 — owner-only until FR24_PUBLIC is exactly '1' ──────────────────────────────────────────────────────────
describe('I14 — only the owner reaches FR24 unless FR24_PUBLIC is exactly 1', () => {
  it('the access decision', () => {
    const env = { TELEGRAM_OWNER_CHAT_ID: OWNER };
    expect(fr24.hasAccess(OWNER, env)).toBe(true);
    expect(fr24.hasAccess(Number(OWNER), env)).toBe(true);
    expect(fr24.hasAccess('999', env)).toBe(false);
    expect(fr24.hasAccess(null, env)).toBe(false);
    expect(fr24.hasAccess(undefined, env)).toBe(false);
    // An unset owner is closed, even with the admin opt-in that opens isOwnerChat (amendment 2, C12).
    expect(fr24.hasAccess('999', {})).toBe(false);
    expect(fr24.hasAccess('999', { GIA_ALLOW_UNOWNED_ADMIN: '1' })).toBe(false);
    expect(fr24.hasAccess(undefined, { GIA_ALLOW_UNOWNED_ADMIN: '1' })).toBe(false);
    // FR24_PUBLIC opens it only when it is exactly '1'.
    expect(fr24.hasAccess('999', { ...env, FR24_PUBLIC: '1' })).toBe(true);
    expect(fr24.hasAccess(null, { FR24_PUBLIC: '1' })).toBe(true);
    for (const v of ['true', 'yes', 'on', ' 1', '1 ', '01', 'TRUE', '0', '']) expect(fr24.hasAccess('999', { ...env, FR24_PUBLIC: v })).toBe(false);
  });
  it('a non-owner gets 403 owner-only on every route, with no FR24 request and no credit counted', async () => {
    const env = { TELEGRAM_OWNER_CHAT_ID: OWNER };
    const { svc, calls } = svcWith();
    for (const req of [{ kind: 'board', icao: 'WSSS', dir: 'dep' }, { kind: 'airport', icao: 'WSSS' }, { kind: 'flight', id: '3b000001' }]) {
      for (const userId of ['999', null, undefined]) {
        const r = await fr24.handle(svc, { ...req, userId, env });
        expect(r).toEqual({ status: 403, body: { ok: false, reason: 'owner-only' } });
      }
    }
    expect(calls).toHaveLength(0);
    expect(await svc.spent()).toBe(0);
  });
  it('the access route answers enabled for the owner only, and makes no FR24 request either way', async () => {
    const env = { TELEGRAM_OWNER_CHAT_ID: OWNER };
    const { svc, calls } = svcWith();
    expect(await fr24.handle(svc, { kind: 'access', userId: OWNER, env })).toEqual({ status: 200, body: { ok: true, enabled: true } });
    expect(await fr24.handle(svc, { kind: 'access', userId: '999', env })).toEqual({ status: 200, body: { ok: true, enabled: false } });
    expect(await fr24.handle(svc, { kind: 'access', userId: '999', env: { ...env, FR24_PUBLIC: '1' } })).toEqual({ status: 200, body: { ok: true, enabled: true } });
    expect(calls).toHaveLength(0);
  });
  it('the owner gets the answers; FR24_PUBLIC=1 lets anyone through', async () => {
    const env = { TELEGRAM_OWNER_CHAT_ID: OWNER };
    const { svc, calls } = svcWith();
    const r = await fr24.handle(svc, { kind: 'airport', icao: 'WSSS', userId: OWNER, env });
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    const b = await fr24.handle(svc, { kind: 'board', icao: 'WSSS', dir: 'arr', userId: '999', env: { ...env, FR24_PUBLIC: '1' } });
    expect(b.body.ok).toBe(true);
    expect(calls).toHaveLength(2);
  });
  it('an unknown kind is a 404, not a request', async () => {
    const { svc, calls } = svcWith();
    expect((await fr24.handle(svc, { kind: 'tracks', userId: OWNER, env: { TELEGRAM_OWNER_CHAT_ID: OWNER } })).status).toBe(404);
    expect(calls).toHaveLength(0);
  });
});

// ── I9 — /fr24usage answers only the owner ─────────────────────────────────────────────────────────────────────
describe('I9 — /fr24usage answers only in the owner\'s chat', () => {
  it('a non-owner, or an unset owner, gets no reply and no FR24 request', async () => {
    const { svc, calls } = svcWith();
    expect(await fr24.usageReply(svc, { chatId: '999', env: { TELEGRAM_OWNER_CHAT_ID: OWNER } })).toBeNull();
    expect(await fr24.usageReply(svc, { chatId: '999', env: {} })).toBeNull();
    expect(await fr24.usageReply(svc, { chatId: '999', env: { GIA_ALLOW_UNOWNED_ADMIN: '1' } })).toBeNull();
    // FR24_PUBLIC opens the map feature, never the owner's usage.
    expect(await fr24.usageReply(svc, { chatId: '999', env: { TELEGRAM_OWNER_CHAT_ID: OWNER, FR24_PUBLIC: '1' } })).toBeNull();
    expect(calls).toHaveLength(0);
  });
  it('the owner gets FR24\'s 30-day credits used, per endpoint, and our own month against the budget', async () => {
    const { svc, calls } = svcWith({ budget: 25000 });
    await svc.planes('WSSS');                        // 12 of our own credits
    const text = await fr24.usageReply(svc, { chatId: OWNER, env: { TELEGRAM_OWNER_CHAT_ID: OWNER } });
    expect(qs(calls.at(-1).url).get('period')).toBe('30d');
    expect(new URL(calls.at(-1).url).pathname).toBe('/api/usage');
    expect(text).toContain('42');                    // FR24: 36 + 6 used in 30 days
    expect(text).toContain('live/flight-positions/light');
    expect(text).toContain('12');                    // our month so far
    expect(text).toContain('24,988');                // left of our 25,000
    expect(text).toMatch(/does not report credits left/i);
  });
  it('without a token the owner is told so, and no request is made', async () => {
    const { svc, calls } = svcWith({ token: '' });
    const text = await fr24.usageReply(svc, { chatId: OWNER, env: { TELEGRAM_OWNER_CHAT_ID: OWNER } });
    expect(text).toMatch(/FLIGHTRADER24_API_TOKEN/);
    expect(calls).toHaveLength(0);
  });
});

// ── I13 — airport names from the OurAirports table only ────────────────────────────────────────────────────────
describe('I13 — airport names come only from the OurAirports table', () => {
  it('_meta names the source and its sha256', () => {
    expect(TABLE._meta.source).toMatch(/OurAirports/);
    expect(TABLE._meta.url).toBe('https://davidmegginson.github.io/ourairports-data/airports.csv');
    expect(TABLE._meta.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(TABLE._meta.downloaded).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(TABLE._meta.count).toBe(Object.keys(TABLE.airports).length);
    expect(TABLE._meta.count).toBeGreaterThan(3000);
  });
  it('the builder keeps scheduled-service airports with an ICAO code, and nothing else', () => {
    expect(builder.keepRow({ scheduled_service: 'yes', icao_code: 'WSSS' })).toBe(true);
    expect(builder.keepRow({ scheduled_service: 'no', icao_code: 'WSSS' })).toBe(false);
    expect(builder.keepRow({ scheduled_service: 'yes', icao_code: '' })).toBe(false);
    expect(builder.keepRow({ scheduled_service: 'yes', icao_code: 'XYZ' })).toBe(false);
    expect(builder.keepRow({ scheduled_service: 'yes' })).toBe(false);
    expect(builder.keepRow(null)).toBe(false);
  });
  it('the builder parses quoted commas and doubled quotes, and records the sha256 of exactly what it read', () => {
    const csv = 'id,"name","municipality","scheduled_service","icao_code","iata_code"\n'
      + '1,"Foo, ""Intl"" Airport","Bar, City","yes","ABCD","ABC"\n'
      + '2,"Heliport","X","no","EFGH",\n';
    const t = builder.buildTable(csv, { downloaded: '2026-11-05' });
    expect(t.airports).toEqual({ ABCD: { n: 'Foo, "Intl" Airport', i: 'ABC', c: 'Bar, City' } });
    expect(t._meta.sha256).toBe(require('crypto').createHash('sha256').update(csv).digest('hex'));
  });
  it('WSSS and WSSL resolve; an unknown code shows as itself, never guessed', () => {
    expect(fr24.airportName('WSSS')).toEqual({ code: 'WSSS', iata: 'SIN', city: 'Singapore', name: 'Singapore Changi Airport' });
    expect(fr24.airportName('WSSL')).toMatchObject({ code: 'WSSL', iata: 'XSP' });
    expect(fr24.airportName('ZZZZ')).toEqual({ code: 'ZZZZ' });
    expect(fr24.airportName(null)).toBeNull();
  });
  it('fr24.js never calls FR24\'s airport or airline lookup', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'fr24.js'), 'utf8');
    expect(src).not.toMatch(/static\/airports|static\/airlines/);
  });
});

// ── I14 at the routes: index.js verifies initData and hands handle() the VERIFIED user ─────────────────────────
describe('I14 — the routes in index.js', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'index.js'), 'utf8')
    .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
  it('the four FR24 routes each verify Telegram initData before fr24Route', () => {
    for (const r of ['access', 'board/:icao', 'airport/:icao', 'flight/:id']) {
      const rx = new RegExp(`app\\.get\\('/api/fr24/${r.replace('/', '\\/')}', requireInitDataFromBodyOrHeader, fr24Route\\(`);
      expect(src, r).toMatch(rx);
    }
    expect((src.match(/app\.get\('\/api\/fr24\//g) || []).length).toBe(4);
  });
  it('the user id handed to handle() is the verified one, req.tg.user.id, and nothing from the query', () => {
    expect(src).toMatch(/handle\(fr24Service\(\), \{ kind, \.\.\.pick\(req\), userId: req\.tg\?\.user\?\.id \}\)/);
    expect(src).not.toMatch(/userId: req\.(query|params|body|headers)/);
  });
  it('/fr24usage replies through usageReply with the chat id, and is not in the public command menu', () => {
    expect(src).toMatch(/bot\.onText\(\/\^\\\/fr24usage/);
    expect(src).toMatch(/usageReply\(fr24Service\(\), \{ chatId: msg\.chat\.id \}\)/);
    expect(fs.readFileSync(path.join(process.cwd(), 'bot-commands.js'), 'utf8')).not.toMatch(/fr24/i);
  });
});

// ── the shared instance ─────────────────────────────────────────────────────────────────────────────────────────
describe('forServer', () => {
  it('reads the token from the environment and is shared', () => {
    const a = fr24.forServer(null, { FLIGHTRADER24_API_TOKEN: '' });
    const b = fr24.forServer(null, { FLIGHTRADER24_API_TOKEN: '' });
    expect(a).toBe(b);
    expect(typeof a.planes).toBe('function');
  });
});
