// fr24.js — v0.62.975. Spec: doc/Feature/2026-11-01-fr24-changi-flights-train-tma.spec.md (C2-C12, amendments 1, 2).
//
// The server half of the Flightradar24 pilot in the Train Mini App. Every FR24 request this app makes is built here,
// and nothing else in the repo talks to FR24:
//   - planes(icao):      live/flight-positions/light around Changi (WSSS) or Seletar (WSSL), flying to or from it;
//   - board(icao, dir):  flight-summary/light, the last 3 hours of departures (outbound:) or arrivals (inbound:);
//   - flight(id):        flight-summary/light for one fr24_id, for the card;
//   - usage():           the owner's /fr24usage (FR24's credits used over 30 days).
//
// Every request costs credits, so every answer is cached (board tab 5 min, planes 60 s, flight 10 min; failures are
// not), at most 8 requests a minute leave this process (Explorer allows 10), and the credits each answer cost are
// counted per Singapore calendar month against FR24_MONTHLY_CREDIT_BUDGET (25,000). A 402 from FR24 stops every
// request until the month turns. Nothing from FR24 is kept past its cache, inside FR24's 30-day storage rule.
//
// Owner-only first (C12, operator 05-11 '26 "owner-only first"): handle() lets a request through only when the
// verified Telegram user is TELEGRAM_OWNER_CHAT_ID, or FR24_PUBLIC is exactly '1'. It uses owner-gate's decideOwner
// with NO opt-in: isOwnerChat opens to everyone when the owner id is unset and GIA_ALLOW_UNOWNED_ADMIN=1, which C12
// forbids (amendment 2).
//
// The token is read from FLIGHTRADER24_API_TOKEN only, sent only in the Authorization header, and never placed in an
// answer, a log line or the client bundle (I1).

'use strict';

const { decideOwner } = require('./owner-gate');

const BASE = 'https://fr24api.flightradar24.com/api';
// From data/airport-names.json's source (OurAirports), WSSS and WSSL rows.
const AIRPORTS = Object.freeze({
  WSSS: Object.freeze({ lat: 1.35019, lng: 103.994003 }),
  WSSL: Object.freeze({ lat: 1.41555, lng: 103.86673 }),
});
const LIMIT = 20;                       // Explorer's response limit
const BOX_HALF_KM = 30;                 // C2: about 60 x 60 km around the airport
const BOARD_WINDOW_MS = 3 * 3600 * 1000;
const TTL_S = Object.freeze({ board: 300, planes: 60, flight: 600 });
const RATE_PER_MIN = 8;
const DEFAULT_BUDGET = 25000;
const STALE_MAX_MS = 30 * 24 * 3600 * 1000; // never serve FR24 data older than its 30-day storage rule
const FLIGHT_ID = /^[0-9a-f]{6,12}$/;
const SGT_MS = 8 * 3600 * 1000;
const KM_PER_DEG = 111.195;

let TABLE = null;
function table() {
  if (!TABLE) {
    try { TABLE = require('./data/airport-names.json').airports || {}; } catch { TABLE = {}; }
  }
  return TABLE;
}

// C11: a code is named from the OurAirports table or shown as itself; nothing is guessed, and FR24 is never asked.
function airportName(code) {
  if (!code) return null;
  const c = String(code);
  const e = table()[c];
  if (!e) return { code: c };
  const out = { code: c };
  if (e.i) out.iata = e.i;
  if (e.c) out.city = e.c;
  if (e.n) out.name = e.n;
  return out;
}

function tokenFrom(env = process.env) {
  return String(env.FLIGHTRADER24_API_TOKEN || '');
}
function budgetFrom(env = process.env) {
  const n = Number(env.FR24_MONTHLY_CREDIT_BUDGET);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_BUDGET;
}
function monthKeySgt(nowMs) {
  return new Date(nowMs + SGT_MS).toISOString().slice(0, 7);
}
const isoSec = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');

function boundsFor(icao) {
  const a = AIRPORTS[icao];
  const dLat = BOX_HALF_KM / KM_PER_DEG;
  const dLng = BOX_HALF_KM / (KM_PER_DEG * Math.cos((a.lat * Math.PI) / 180));
  return [a.lat + dLat, a.lat - dLat, a.lng - dLng, a.lng + dLng].map((v) => v.toFixed(3)).join(',');
}

// What FR24 charges for an answer, from what the answer contained (FR24's credits page, read 01-11 '26).
function creditsForPlanes(n) { return n > 0 ? 6 * n : 1; }
function creditsForSummary(rows) {
  if (!Array.isArray(rows) || !rows.length) return 1;
  return rows.reduce((s, r) => s + (r && r.flight_ended ? 2 : 1), 0);
}

// C12 / I14. The owner check is decideOwner with no opt-in, so an unset owner id is always closed.
function isOwner(userId, env) {
  if (userId === undefined || userId === null || String(userId) === '') return false;
  return decideOwner({ chatId: userId, owner: env.TELEGRAM_OWNER_CHAT_ID, optIn: undefined }).allow;
}
function hasAccess(userId, env = process.env) {
  if (env.FR24_PUBLIC === '1') return true;
  return isOwner(userId, env);
}

function planeOf(p) {
  return {
    id: String(p.fr24_id), callsign: p.callsign || null, lat: Number(p.lat), lng: Number(p.lon),
    track: Number.isFinite(p.track) ? p.track : null, gspeed: Number.isFinite(p.gspeed) ? p.gspeed : null,
    alt: Number.isFinite(p.alt) ? p.alt : null, vspeed: Number.isFinite(p.vspeed) ? p.vspeed : null,
    at: p.timestamp || null,
  };
}
function rowOf(r) {
  return {
    id: String(r.fr24_id), flight: r.flight || null, callsign: r.callsign || null,
    airline: r.operating_as || r.painted_as || null, type: r.type || null, reg: r.reg || null,
    orig: airportName(r.orig_icao), dest: airportName(r.dest_icao_actual || r.dest_icao),
    takeoff: r.datetime_takeoff || null, landed: r.datetime_landed || null, ended: r.flight_ended === true,
  };
}

// request(url, headers) → Promise<{ status, data }>. cache: a Redis client (get / setEx / incrBy / expire) or null.
function createFr24({ token = '', request, cache = null, now = Date.now, budget = DEFAULT_BUDGET } = {}) {
  const memory = new Map();      // key → { exp, value }
  const last = new Map();        // key → { at, value }: the last good answer, for a busy minute
  const inflight = new Map();
  const sent = [];               // request times inside the last minute
  let memSpent = new Map();      // month → credits, when there is no shared cache
  let blockedMonth = null;       // a 402 stops requests until this month has passed

  const cacheGet = async (key) => {
    if (cache) {
      try { const v = await cache.get(key); if (v) return JSON.parse(v); } catch { /* fall through */ }
    }
    const m = memory.get(key);
    return m && m.exp > now() ? m.value : null;
  };
  const cachePut = async (key, ttl, value) => {
    memory.set(key, { exp: now() + ttl * 1000, value });
    last.set(key, { at: now(), value });
    if (cache) { try { await cache.setEx(key, ttl, JSON.stringify(value)); } catch { /* memory holds it */ } }
  };
  const spentKey = () => `fr24:credits:${monthKeySgt(now())}`;
  async function spent() {
    if (cache) {
      try { const v = await cache.get(spentKey()); if (v != null) return Number(v) || 0; } catch { /* fall through */ }
    }
    return memSpent.get(monthKeySgt(now())) || 0;
  }
  async function addSpent(n) {
    const month = monthKeySgt(now());
    memSpent.set(month, (memSpent.get(month) || 0) + n);
    if (cache) {
      try {
        await cache.incrBy(spentKey(), n);
        await cache.expire(spentKey(), 40 * 24 * 3600);
      } catch { /* memory holds it */ }
    }
  }
  const staleOf = (key) => {
    const l = last.get(key);
    return l && now() - l.at < STALE_MAX_MS ? { ...l.value, stale: true } : null;
  };

  // One FR24 request, behind every guard. `cost(data)` is what the answer cost; `shape(data)` is our answer.
  async function call(key, ttl, url, cost, shape) {
    if (!token) return { ok: false, reason: 'nokey' };
    const hit = await cacheGet(key);
    if (hit) return hit;
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      if (blockedMonth && blockedMonth === monthKeySgt(now())) return { ok: false, reason: 'budget' };
      if ((await spent()) >= budget) return { ok: false, reason: 'budget' };
      const t = now();
      while (sent.length && t - sent[0] >= 60 * 1000) sent.shift();
      if (sent.length >= RATE_PER_MIN) return staleOf(key) || { ok: false, reason: 'busy' };
      sent.push(t);
      let res;
      try {
        res = await request(url, { Authorization: `Bearer ${token}`, 'Accept-Version': 'v1', Accept: 'application/json' });
      } catch {
        return { ok: false, reason: 'error' };
      }
      const status = res && res.status;
      if (status === 402) { blockedMonth = monthKeySgt(now()); return { ok: false, reason: 'budget' }; }
      if (status === 429) return staleOf(key) || { ok: false, reason: 'busy' };
      if (status !== 200 || !res.data) return { ok: false, reason: status === 401 || status === 403 ? 'nokey' : 'error' };
      await addSpent(cost(res.data));
      const out = { ok: true, source: 'Flightradar24', readAt: isoSec(t), ...shape(res.data) };
      await cachePut(key, ttl, out);
      return out;
    })();
    inflight.set(key, p);
    try { return await p; } finally { inflight.delete(key); }
  }

  const listOf = (d) => (Array.isArray(d && d.data) ? d.data : []);

  async function planes(icao) {
    if (!Object.prototype.hasOwnProperty.call(AIRPORTS, icao)) return { ok: false, reason: 'badcode' };
    const url = `${BASE}/live/flight-positions/light?bounds=${boundsFor(icao)}&airports=both:${icao}&limit=${LIMIT}`;
    return call(`fr24:planes:${icao}`, TTL_S.planes, url,
      (d) => creditsForPlanes(listOf(d).length),
      (d) => ({ icao, planes: listOf(d).map(planeOf).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) }));
  }

  async function board(icao, dir) {
    if (!Object.prototype.hasOwnProperty.call(AIRPORTS, icao)) return { ok: false, reason: 'badcode' };
    if (dir !== 'dep' && dir !== 'arr') return { ok: false, reason: 'baddir' };
    if (!token) return { ok: false, reason: 'nokey' };
    const t = now();
    const side = dir === 'dep' ? 'outbound' : 'inbound';
    const url = `${BASE}/flight-summary/light?flight_datetime_from=${isoSec(t - BOARD_WINDOW_MS)}`
      + `&flight_datetime_to=${isoSec(t)}&airports=${side}:${icao}&sort=desc&limit=${LIMIT}`;
    return call(`fr24:board:${icao}:${dir}`, TTL_S.board, url,
      (d) => creditsForSummary(listOf(d)),
      (d) => ({ icao, dir, rows: listOf(d).map(rowOf) }));
  }

  async function flight(id) {
    const fid = String(id || '');
    if (!FLIGHT_ID.test(fid)) return { ok: false, reason: 'badid' };
    const url = `${BASE}/flight-summary/light?flight_ids=${fid}`;
    return call(`fr24:flight:${fid}`, TTL_S.flight, url,
      (d) => creditsForSummary(listOf(d)),
      (d) => { const r = listOf(d)[0]; return { flight: r ? rowOf(r) : null }; });
  }

  // The owner's usage: not cached, not budget-guarded (FR24 charges nothing for it), but rate-guarded.
  async function usage() {
    if (!token) return { ok: false, reason: 'nokey' };
    const t = now();
    while (sent.length && t - sent[0] >= 60 * 1000) sent.shift();
    if (sent.length >= RATE_PER_MIN) return { ok: false, reason: 'busy' };
    sent.push(t);
    let res;
    try {
      res = await request(`${BASE}/usage?period=30d`, { Authorization: `Bearer ${token}`, 'Accept-Version': 'v1', Accept: 'application/json' });
    } catch {
      return { ok: false, reason: 'error' };
    }
    if (!res || res.status !== 200) return { ok: false, reason: res && (res.status === 401 || res.status === 403) ? 'nokey' : 'error' };
    const endpoints = listOf(res.data).map((e) => ({ endpoint: String(e.endpoint || ''), requests: Number(e.request_count) || 0, credits: Number(e.credits) || 0 }));
    return { ok: true, period: '30d', endpoints, total: endpoints.reduce((s, e) => s + e.credits, 0) };
  }

  return { planes, board, flight, usage, spent, budget: () => budget, month: () => monthKeySgt(now()) };
}

// The routes' one entry point: the access gate, then the call. Returns { status, body } for index.js to send.
async function handle(svc, { kind, icao, dir, id, userId, env = process.env } = {}) {
  if (kind === 'access') return { status: 200, body: { ok: true, enabled: hasAccess(userId, env) } };
  if (!['board', 'airport', 'flight'].includes(kind)) return { status: 404, body: { ok: false, reason: 'notfound' } };
  if (!hasAccess(userId, env)) return { status: 403, body: { ok: false, reason: 'owner-only' } };
  let body;
  if (kind === 'board') body = await svc.board(icao, dir);
  else if (kind === 'airport') body = await svc.planes(icao);
  else body = await svc.flight(id);
  const bad = body && (body.reason === 'badcode' || body.reason === 'baddir' || body.reason === 'badid');
  return { status: bad ? 400 : 200, body };
}

const fmt = (n) => Number(n || 0).toLocaleString('en-US');

// C8 (amendment 2): the owner-only /fr24usage reply, plain text. null for anyone else, including when FR24_PUBLIC
// opens the map feature: the account's usage stays the owner's.
async function usageReply(svc, { chatId, env = process.env } = {}) {
  if (!isOwner(chatId, env)) return null;
  const ours = await svc.spent();
  const budget = svc.budget();
  const lines = ['✈️ Flightradar24 usage'];
  const u = await svc.usage();
  if (!u.ok && u.reason === 'nokey') {
    lines.push('No FLIGHTRADER24_API_TOKEN on this server, or FR24 refused it.');
  } else if (!u.ok) {
    lines.push(`FR24's usage call failed (${u.reason}).`);
  } else {
    lines.push(`FR24, last 30 days: ${fmt(u.total)} credits used`);
    for (const e of u.endpoints) lines.push(`  ${e.endpoint}: ${fmt(e.credits)} credits, ${fmt(e.requests)} requests`);
    lines.push('FR24 does not report credits left; your plan page does.');
  }
  lines.push(`Our count, ${svc.month()} (SGT): ${fmt(ours)} of ${fmt(budget)}, ${fmt(Math.max(0, budget - ours))} left in our budget.`);
  return lines.join('\n');
}

let shared = null;
function axiosRequest(url, headers) {
  const axios = require('axios');
  return axios.get(url, { headers, timeout: 8000, validateStatus: () => true }).then((r) => ({ status: r.status, data: r.data }));
}
function forServer(cache, env = process.env) {
  if (!shared) shared = createFr24({ token: tokenFrom(env), request: axiosRequest, cache, budget: budgetFrom(env) });
  return shared;
}

module.exports = {
  BASE, AIRPORTS, LIMIT, TTL_S, RATE_PER_MIN, DEFAULT_BUDGET, BOX_HALF_KM,
  airportName, tokenFrom, budgetFrom, monthKeySgt, boundsFor, creditsForPlanes, creditsForSummary,
  hasAccess, createFr24, handle, usageReply, forServer,
};
