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

// v0.62.989 — spec doc/Feature/2026-11-12-fr24-city-airports-all-maps-user-caps.spec.md (A1-A11, I1-I9):
//   - any airport in data/airport-names.json with an IATA code is accepted, not just Changi and Seletar (I3);
//   - airportsMenu(lat, lng) / cityAirports(name): the ⋮ menu's ✈️ Airports list, from the table alone (I1);
//   - each reader other than the owner may spend at most 500 credits per Singapore day (I4). The worst case of a
//     call is reserved before it leaves and the difference given back after, so two calls at once cannot both
//     squeeze under the cap; a cache hit costs the reader nothing. Every capped answer carries `usage` (I5).
// Access is unchanged (I6): owner-only unless FR24_PUBLIC is exactly '1'.

'use strict';

const crypto = require('crypto');
const { decideOwner } = require('./owner-gate');

const BASE = 'https://fr24api.flightradar24.com/api';
// From data/airport-names.json's source (OurAirports), WSSS and WSSL rows. Since v0.62.989 these are the
// "Singapore" section of the Airports menu, and their reference points still centre the planes box.
const AIRPORTS = Object.freeze({
  WSSS: Object.freeze({ lat: 1.35019, lng: 103.994003 }),
  WSSL: Object.freeze({ lat: 1.41555, lng: 103.86673 }),
});
// v0.62.989 (A1b, A9): a city's airports are those with an IATA code within 150 km, at most 5.
const NEAR_KM = 150;
const NEAR_MAX = 5;
// v0.62.989 (A1c): international before domestic. No field in OurAirports says which an airport is (Itami is named
// "International" and is domestic; Suvarnabhumi is not, and is Bangkok's main gateway), so the order is the table's
// size rank, nearest first within a rank, and these airports, which OurAirports ranks large but which have no
// scheduled international passenger service, rank with the medium ones. Each row names what was read. Every other
// large airport is taken as international without having been checked one by one; the journal reports how many.
const DOMESTIC_IN_PRACTICE = Object.freeze({
  RJOO: 'Wikipedia, "Itami Airport", read 22-11 \'26 (search excerpt): domestic flights only since Kansai International Airport opened in 1994, despite the "International" in its name.',
  RJOS: 'Wikipedia, "Tokushima Airport", Airlines and destinations, read 22-11 \'26 (search excerpt): All Nippon Airways and Japan Airlines to Tokyo-Haneda, J-Air to Fukuoka; no scheduled international route in the table.',
  WIHH: 'Wikipedia, "Halim Perdanakusuma International Airport", read 22-11 \'26 (search excerpt): designated international, but it primarily handles domestic flights; its international flights are mostly cargo and non-commercial.',
});
// v0.62.989 (A3, A6): the per-reader daily cap and the points at which the board says how much is used.
const USER_DAILY_CAP = 500;
const USAGE_STEPS = Object.freeze([50, 70, 80, 90]);
const USER_TTL_S = 2 * 24 * 3600;       // a day's counter outlives its day by one, then Redis drops it
const LIMIT = 20;                       // Explorer's response limit
const BOX_HALF_KM = 30;                 // C2: about 60 x 60 km around the airport
const BOARD_WINDOW_MS = 3 * 3600 * 1000;
const TTL_S = Object.freeze({ board: 300, planes: 60, flight: 600 });
const RATE_PER_MIN = 8;
const DEFAULT_BUDGET = 25000;
const STALE_MAX_MS = 30 * 24 * 3600 * 1000; // never serve FR24 data older than its 30-day storage rule
const FLIGHT_ID = /^[0-9a-f]{6,12}$/;
const CALLSIGN = /^[A-Z0-9]{2,8}$/;
const GATES_MAX = 15;                   // flight-events takes at most 15 fr24_ids per request
const GATES_TTL_S = 300;
// Amendment 8 (I25): the flown path of the one flight whose card is open. 40 credits per returned flight, so one
// request per id per 2 minutes, and at most TRACK_MAX points sent to the phone.
const TRACK_TTL_S = 120;
const TRACK_MAX = 300;
const TRACK_CREDITS = 40;
// Amendment 9 revised (I29): FR24's estimated arrival, from live positions FULL (the light answer has no eta), for
// every live flight on one airport's tab in one request. 8 credits per returned flight, cached as long as a board tab.
const ETA_TTL_S = 300;
const ETA_CREDITS = 8;
const ETA_MAX = 15;                     // amendment 10 (I32): the board's in-air rows, by callsign

// Amendment 6: a gate's terminal, from its letter, ONLY where a source says so. Nothing is guessed: a letter that is
// not here shows the gate code alone.
//   G, H → Terminal 4: Wikipedia, "Infrastructure of Changi Airport", Terminal 4 section, read 05-11 '26: "There are
//          a total of 21 contact gates and 8 bus gates in Terminal 4, numbered Gates G1 to G21 and Gates H1 to H8."
// Letters A to F: no source was reachable from the build (Wikipedia's text names no other terminal's gates; the
// OpenStreetMap Overpass API refused the connection twice on 05-11 '26). Add a row only with its source.
const GATE_TERMINALS = Object.freeze({ G: 'T4', H: 'T4' });
function terminalForGate(gate) {
  const m = typeof gate === 'string' ? gate.match(/^([A-Z])\d/) : null;
  return m && Object.prototype.hasOwnProperty.call(GATE_TERMINALS, m[1]) ? GATE_TERMINALS[m[1]] : null;
}
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
  // v0.62.985 — spec 2026-11-11-fr24-globe-arrival-tz: the airport's time zone (I2, I3) and position (the globe, I5),
  // from the same table. Left out when the table has none; never guessed.
  if (e.z) out.tz = e.z;
  const pos = airportPos(c);
  if (pos) out.pos = pos;
  return out;
}

// Amendment 8 (I26): an airport's position from the same OurAirports table, or null; never guessed.
function airportPos(code) {
  if (!code) return null;
  const e = table()[String(code)];
  if (!e || !Array.isArray(e.p) || e.p.length !== 2 || !e.p.every(Number.isFinite)) return null;
  return { lat: e.p[0], lng: e.p[1] };
}

// Keep the first and the last, and evenly spaced points between, so the line still starts at take-off.
function downsample(points, max = TRACK_MAX) {
  if (points.length <= max) return points;
  const out = [];
  for (let k = 0; k < max; k++) out.push(points[Math.round((k * (points.length - 1)) / (max - 1))]);
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

// v0.62.989 (I3): the airports a request may name: Changi and Seletar, and any table airport with an IATA code and a
// position. Own properties only, so '__proto__' and 'constructor' are not airports.
const ICAO_RE = /^[A-Z0-9]{4}$/;
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
function isKnownAirport(icao) {
  if (typeof icao !== 'string' || !ICAO_RE.test(icao)) return false;
  if (own(AIRPORTS, icao)) return true;
  const t = table();
  return own(t, icao) && !!t[icao].i && !!airportPos(icao);
}
// The reference point a request is built around: Changi's and Seletar's as before, else the table's.
function posOf(icao) {
  if (typeof icao === 'string' && own(AIRPORTS, icao)) return AIRPORTS[icao];
  return airportPos(icao);
}
function sgtDay(nowMs) {
  return new Date(nowMs + SGT_MS).toISOString().slice(0, 10);
}
function hashId(id) {
  return crypto.createHash('sha256').update(String(id)).digest('hex').slice(0, 16);
}

// ── v0.62.989 (I1): the Airports menu, from the table alone ─────────────────────────────────────────────────────
function kmBetween(a, b) {
  const r = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * r) / 2) ** 2
    + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h));
}
// "Soekarno-Hatta International Airport" → "Soekarno-Hatta"; "Darwin International Airport / RAAF Darwin" → "Darwin".
function shortName(n) {
  const s = String(n || '').split(' / ')[0].replace(/\s+International\s+Airport$/i, '').replace(/\s+Airport$/i, '').trim();
  return s || String(n || '');
}
let IATA_LIST = null;
function iataAirports() {
  if (!IATA_LIST) {
    IATA_LIST = Object.keys(table()).filter(isKnownAirport).map((icao) => {
      const e = table()[icao];
      const p = posOf(icao);
      const domestic = own(DOMESTIC_IN_PRACTICE, icao);
      const order = e.r === 1 && !domestic ? 1 : e.r === 1 ? 2 : (e.r || 4);
      return { icao, iata: e.i, name: e.n, short: shortName(e.n), city: e.c || null, lat: p.lat, lng: p.lng, order, intl: order === 1 };
    });
  }
  return IATA_LIST;
}
const withKm = (a, at) => ({ ...a, km: Math.round(kmBetween(at, a)) });
// The airports within NEAR_KM of a point: international (order 1) first, then by rank, nearest first, at most 5.
function nearAirports(lat, lng, { km = NEAR_KM, max = NEAR_MAX } = {}) {
  const at = { lat: Number(lat), lng: Number(lng) };
  if (!Number.isFinite(at.lat) || !Number.isFinite(at.lng)) return [];
  return iataAirports()
    .map((a) => ({ a, d: kmBetween(at, a) }))
    .filter((x) => x.d <= km)
    .sort((x, y) => x.a.order - y.a.order || x.d - y.d)
    .slice(0, max)
    .map((x) => ({ ...x.a, km: Math.round(x.d) }));
}
let CITIES = null;
function cities() {
  if (!CITIES) {
    try { CITIES = require('./city-centroids.js').CITY_CENTROIDS || {}; } catch { CITIES = {}; }
  }
  return CITIES;
}
// A1: near the reader, then Changi and Seletar under Singapore (each airport once), then every known city, nearest
// first, for "Other cities".
function airportsMenu(lat, lng) {
  const at = { lat: Number(lat), lng: Number(lng) };
  const near = nearAirports(at.lat, at.lng);
  const seen = new Set(near.map((a) => a.icao));
  const singapore = Object.keys(AIRPORTS).filter((c) => !seen.has(c))
    .map((c) => iataAirports().find((a) => a.icao === c)).filter(Boolean).map((a) => withKm(a, at));
  const list = Object.entries(cities())
    .map(([name, c]) => ({ name, country: c.country || null, km: Math.round(kmBetween(at, c)) }))
    .sort((a, b) => a.km - b.km || a.name.localeCompare(b.name));
  return { near, singapore, cities: list };
}
function cityAirports(name) {
  const c = typeof name === 'string' && own(cities(), name) ? cities()[name] : null;
  if (!c) return null;
  return { city: name, country: c.country || null, airports: nearAirports(c.lat, c.lng) };
}

function boundsFor(icao) {
  const a = posOf(icao);
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
    firstSeen: r.first_seen || null,   // amendment 9 (I27): the free fallback when FR24 has no take-off time
  };
}

// request(url, headers) → Promise<{ status, data }>. cache: a Redis client (get / setEx / incrBy / expire) or null.
function createFr24({ token = '', request, cache = null, now = Date.now, budget = DEFAULT_BUDGET, userCap = USER_DAILY_CAP } = {}) {
  const memory = new Map();      // key → { exp, value }
  const last = new Map();        // key → { at, value }: the last good answer, for a busy minute
  const inflight = new Map();
  const sent = [];               // request times inside the last minute
  let memSpent = new Map();      // month → credits, when there is no shared cache
  let blockedMonth = null;       // a 402 stops requests until this month has passed
  const memUser = new Map();     // v0.62.989: `fr24:user:<hash>:<day>` → credits, mirrored like memSpent

  // ── v0.62.989 (I4): the reader's day, keyed on a hash of the Telegram id, never the id ─────────────────────────
  const userKey = (id) => `fr24:user:${hashId(id)}:${sgtDay(now())}`;
  async function userSpent(id) {
    const k = userKey(id);
    if (cache) {
      try { const v = await cache.get(k); if (v != null) return Number(v) || 0; } catch { /* fall through */ }
    }
    return memUser.get(k) || 0;
  }
  async function bump(k, n) {
    const m = (memUser.get(k) || 0) + n;
    memUser.set(k, m);
    let total = null;
    if (cache) {
      try {
        const v = await cache.incrBy(k, n);
        if (v != null && Number.isFinite(Number(v))) total = Number(v);
        await cache.expire(k, USER_TTL_S);
      } catch { /* memory holds it */ }
    }
    return total == null ? m : total;
  }
  // Hold the call's worst case; null when holding it would pass the cap (and nothing stays held).
  async function reserve(who, worst) {
    if (memUser.size > 5000) { const day = sgtDay(now()); for (const k of memUser.keys()) if (!k.endsWith(`:${day}`)) memUser.delete(k); }
    const k = userKey(who.id);
    const total = await bump(k, worst);
    if (total > userCap) { await bump(k, -worst); return null; }
    return { k, held: worst };
  }
  // Give back what the call did not cost (all of it when it failed); add the excess if it cost more.
  async function settle(hold, actual) {
    if (!hold || actual === hold.held) return;
    await bump(hold.k, actual - hold.held);
  }

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
  // v0.62.989 (I4): `who` is a capped reader ({ id }) or null (the owner); `worst` is the most the answer can cost.
  // A cache hit, or joining a request already in flight, costs the reader nothing.
  async function call(key, ttl, url, cost, shape, { on403 = 'nokey', who = null, worst = 0 } = {}) {
    if (!token) return { ok: false, reason: 'nokey' };
    const hit = await cacheGet(key);
    if (hit) return hit;
    if (inflight.has(key)) return inflight.get(key);
    const p = (async () => {
      if (blockedMonth && blockedMonth === monthKeySgt(now())) return { ok: false, reason: 'budget' };
      if ((await spent()) >= budget) return { ok: false, reason: 'budget' };
      const hold = who ? await reserve(who, worst) : null;
      if (who && !hold) return { ok: false, reason: 'quota' };
      const t = now();
      while (sent.length && t - sent[0] >= 60 * 1000) sent.shift();
      if (sent.length >= RATE_PER_MIN) { await settle(hold, 0); return staleOf(key) || { ok: false, reason: 'busy' }; }
      sent.push(t);
      let res;
      try {
        res = await request(url, { Authorization: `Bearer ${token}`, 'Accept-Version': 'v1', Accept: 'application/json' });
      } catch {
        await settle(hold, 0);
        return { ok: false, reason: 'error' };
      }
      const status = res && res.status;
      if (status !== 200 || !res.data) await settle(hold, 0);
      if (status === 402) { blockedMonth = monthKeySgt(now()); return { ok: false, reason: 'budget' }; }
      if (status === 429) return staleOf(key) || { ok: false, reason: 'busy' };
      if (status === 403) return { ok: false, reason: on403 };
      if (status !== 200 || !res.data) return { ok: false, reason: status === 401 ? 'nokey' : 'error' };
      const c = cost(res.data);
      await addSpent(c);
      await settle(hold, c);
      const out = { ok: true, source: 'Flightradar24', readAt: isoSec(t), ...shape(res.data) };
      await cachePut(key, ttl, out);
      return out;
    })();
    inflight.set(key, p);
    try { return await p; } finally { inflight.delete(key); }
  }

  const listOf = (d) => (Array.isArray(d && d.data) ? d.data : []);

  // v0.62.989 (I4): each method takes the capped reader last (null for the owner) and states its worst case: what
  // FR24 would charge for the fullest answer the request allows.
  async function planes(icao, who = null) {
    if (!isKnownAirport(icao)) return { ok: false, reason: 'badcode' };
    const url = `${BASE}/live/flight-positions/light?bounds=${boundsFor(icao)}&airports=both:${icao}&limit=${LIMIT}`;
    return call(`fr24:planes:${icao}`, TTL_S.planes, url,
      (d) => creditsForPlanes(listOf(d).length),
      (d) => ({ icao, planes: listOf(d).map(planeOf).filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) }),
      { who, worst: creditsForPlanes(LIMIT) });
  }

  async function board(icao, dir, who = null) {
    if (!isKnownAirport(icao)) return { ok: false, reason: 'badcode' };
    if (dir !== 'dep' && dir !== 'arr') return { ok: false, reason: 'baddir' };
    if (!token) return { ok: false, reason: 'nokey' };
    const t = now();
    const side = dir === 'dep' ? 'outbound' : 'inbound';
    const url = `${BASE}/flight-summary/light?flight_datetime_from=${isoSec(t - BOARD_WINDOW_MS)}`
      + `&flight_datetime_to=${isoSec(t)}&airports=${side}:${icao}&sort=desc&limit=${LIMIT}`;
    return call(`fr24:board:${icao}:${dir}`, TTL_S.board, url,
      (d) => creditsForSummary(listOf(d)),
      (d) => ({ icao, dir, rows: listOf(d).map(rowOf) }),
      { who, worst: 2 * LIMIT });
  }

  async function flight(id, who = null) {
    const fid = String(id || '');
    if (!FLIGHT_ID.test(fid)) return { ok: false, reason: 'badid' };
    const url = `${BASE}/flight-summary/light?flight_ids=${fid}`;
    return call(`fr24:flight:${fid}`, TTL_S.flight, url,
      (d) => creditsForSummary(listOf(d)),
      (d) => {
        const r = listOf(d)[0];
        if (!r) return { flight: null, origPos: null, destPos: null };
        return { flight: rowOf(r), origPos: airportPos(r.orig_icao), destPos: airportPos(r.dest_icao_actual || r.dest_icao) };
      },
      { who, worst: 2 });
  }

  // Amendment 9 revised (I29), amendment 10 (I32): id → eta for the board's own in-air flights, asked by callsign
  // (at most 15, sorted, so the order does not matter to the cache). Was "any 20 flights to or from the airport",
  // which missed the rows on the board.
  async function etas(icao, dir, callsigns, who = null) {
    if (!isKnownAirport(icao)) return { ok: false, reason: 'badcode' };
    if (dir !== 'dep' && dir !== 'arr') return { ok: false, reason: 'baddir' };
    const list = [...new Set(Array.isArray(callsigns) ? callsigns.map(String) : [])].sort();
    if (!list.length || list.length > ETA_MAX || !list.every((c) => CALLSIGN.test(c))) return { ok: false, reason: 'badcallsign' };
    const url = `${BASE}/live/flight-positions/full?callsigns=${list.join(',')}&limit=${list.length}`;
    return call(`fr24:eta:${list.join(',')}`, ETA_TTL_S, url,
      (d) => { const n = listOf(d).length; return n > 0 ? ETA_CREDITS * n : 1; },
      (d) => {
        const out = {};
        // v0.62.985 (I7): the same answer carries each plane's altitude and ground speed, so a row can say
        // "On the ground" without a second request.
        const pos = {};
        for (const f of listOf(d)) {
          if (!f || !f.fr24_id) continue;
          if (typeof f.eta === 'string' && f.eta) out[String(f.fr24_id)] = f.eta;
          if (Number.isFinite(f.alt) || Number.isFinite(f.gspeed)) {
            pos[String(f.fr24_id)] = { alt: Number.isFinite(f.alt) ? f.alt : null, gspeed: Number.isFinite(f.gspeed) ? f.gspeed : null };
          }
        }
        return { icao, dir, etas: out, pos };
      },
      { on403: 'unavailable', who, worst: ETA_CREDITS * list.length });
  }

  // Amendment 8 (I25): the flown path, for the dotted line. The schema documents an object { fr24_id, tracks }; an
  // array of those is read the same way. A 403 is "not on this plan" (`unavailable`): the phone then draws the line
  // from the origin airport instead.
  async function track(id, who = null) {
    const fid = typeof id === 'string' ? id : '';
    if (!FLIGHT_ID.test(fid)) return { ok: false, reason: 'badid' };
    const url = `${BASE}/flight-tracks?flight_id=${fid}`;
    const first = (d) => (Array.isArray(d) ? d[0] : Array.isArray(d && d.data) ? d.data[0] : d) || null;
    return call(`fr24:track:${fid}`, TRACK_TTL_S, url,
      (d) => { const f = first(d); return f && Array.isArray(f.tracks) && f.tracks.length ? TRACK_CREDITS : 1; },
      (d) => {
        const f = first(d);
        const pts = (f && Array.isArray(f.tracks) ? f.tracks : [])
          .filter((t) => t && Number.isFinite(t.lat) && Number.isFinite(t.lon))
          .sort((a, b) => String(a.timestamp || '').localeCompare(String(b.timestamp || '')))
          .map((t) => [Number(t.lat.toFixed(5)), Number(t.lon.toFixed(5))]);
        return { id: fid, points: downsample(pts) };
      },
      { on403: 'unavailable', who, worst: TRACK_CREDITS });
  }

  // Amendment 6 (I21): the gate each flight reached, from FR24's flight events. One request for up to 15 flights,
  // filtered to gate_arrival; cached 5 minutes per SET of ids (sorted, so the order does not matter). A 403 is read as
  // "this plan does not include the endpoint" (`unavailable`), which tells the phone to stop polling.
  async function gates(icao, ids, who = null) {
    if (!isKnownAirport(icao)) return { ok: false, reason: 'badcode' };
    const list = [...new Set(Array.isArray(ids) ? ids.map(String) : [])];
    if (!list.length || list.length > GATES_MAX || !list.every((x) => FLIGHT_ID.test(x))) return { ok: false, reason: 'badids' };
    const url = `${BASE}/historic/flight-events/light?flight_ids=${list.join(',')}&event_types=gate_arrival`;
    const events = (d) => listOf(d).flatMap((f) => (Array.isArray(f && f.events) ? f.events : []));
    return call(`fr24:gates:${[...list].sort().join(',')}`, GATES_TTL_S, url,
      (d) => { const n = events(d).length; return n > 0 ? 2 * n : 1; },
      (d) => {
        const out = {};
        for (const f of listOf(d)) {
          const e = (Array.isArray(f && f.events) ? f.events : []).find((x) => x && x.type === 'gate_arrival' && x.details && x.details.gate_ident);
          if (e) out[String(f.fr24_id)] = { gate: String(e.details.gate_ident), terminal: terminalForGate(String(e.details.gate_ident)) };
        }
        return { icao, gates: out };
      },
      // Worst case: two gate events a flight (FR24 charges 2 per event; a flight normally reaches one gate). If FR24
      // ever returns more, the reader is charged what it cost.
      { on403: 'unavailable', who, worst: 2 * 2 * list.length });
  }

  // Amendment 3 (C3 revised): where one flight is now, by callsign, for a board row still in the air.
  async function locate(callsign, who = null) {
    const cs = typeof callsign === 'string' ? callsign : '';
    if (!CALLSIGN.test(cs)) return { ok: false, reason: 'badcallsign' };
    const url = `${BASE}/live/flight-positions/light?callsigns=${cs}&limit=1`;
    return call(`fr24:locate:${cs}`, TTL_S.planes, url,
      (d) => creditsForPlanes(listOf(d).length),
      (d) => {
        const p = listOf(d).map(planeOf).find((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
        return { callsign: cs, plane: p || null };
      },
      { who, worst: creditsForPlanes(1) });
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

  return {
    planes, board, flight, track, etas, locate, gates, usage, spent, budget: () => budget, month: () => monthKeySgt(now()),
    userSpent, userCap: () => userCap,
  };
}

// v0.62.989 (I5): what a capped reader has used today, for the board's line. pct is whole percent, at most 100.
function usageOf(used, cap) {
  const u = Math.max(0, Number(used) || 0);
  return { used: u, cap, pct: Math.min(100, Math.floor((u * 100) / cap)) };
}
const coord = (v, lim) => v !== undefined && v !== null && String(v).trim() !== ''
  && Number.isFinite(Number(v)) && Math.abs(Number(v)) <= lim;

// The routes' one entry point: the access gate, then the call. Returns { status, body } for index.js to send.
async function handle(svc, { kind, icao, dir, id, callsign, ids, cs, lat, lng, city, userId, env = process.env } = {}) {
  if (kind === 'access') return { status: 200, body: { ok: true, enabled: hasAccess(userId, env) } };
  if (!['board', 'airport', 'flight', 'locate', 'gates', 'track', 'eta', 'near'].includes(kind)) return { status: 404, body: { ok: false, reason: 'notfound' } };
  if (!hasAccess(userId, env)) return { status: 403, body: { ok: false, reason: 'owner-only' } };
  // v0.62.989 (I1): the Airports menu comes from the table; FR24 is never asked and nothing is charged.
  if (kind === 'near') {
    if (city !== undefined && city !== null && String(city) !== '') {
      const c = cityAirports(String(city));
      return c ? { status: 200, body: { ok: true, ...c } } : { status: 400, body: { ok: false, reason: 'badcity' } };
    }
    if (!coord(lat, 90) || !coord(lng, 180)) return { status: 400, body: { ok: false, reason: 'badpoint' } };
    return { status: 200, body: { ok: true, ...airportsMenu(Number(lat), Number(lng)) } };
  }
  // v0.62.989 (I4): everyone but the owner is capped. The id comes from verified initData (index.js).
  const who = isOwner(userId, env) ? null : { id: String(userId == null ? '' : userId) };
  let body;
  if (kind === 'board') body = await svc.board(icao, dir, who);
  else if (kind === 'airport') body = await svc.planes(icao, who);
  else if (kind === 'locate') body = await svc.locate(callsign, who);
  else if (kind === 'track') body = await svc.track(id, who);
  else if (kind === 'eta') body = await svc.etas(icao, dir, String(cs || '').split(',').filter(Boolean), who);
  else if (kind === 'gates') body = await svc.gates(icao, String(ids || '').split(',').filter(Boolean), who);
  else body = await svc.flight(id, who);
  const bad = body && ['badcode', 'baddir', 'badid', 'badcallsign', 'badids'].includes(body.reason);
  // A copy: a cached answer is shared by every reader, so one reader's usage must never be written into it.
  if (who && body && typeof svc.userSpent === 'function') {
    body = { ...body, usage: usageOf(await svc.userSpent(who.id), typeof svc.userCap === 'function' ? svc.userCap() : USER_DAILY_CAP) };
  }
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
  hasAccess, createFr24, handle, usageReply, forServer, GATE_TERMINALS, terminalForGate,
  airportPos, downsample, TRACK_TTL_S, TRACK_MAX, TRACK_CREDITS, ETA_TTL_S, ETA_CREDITS, ETA_MAX,
  // v0.62.989
  NEAR_KM, NEAR_MAX, DOMESTIC_IN_PRACTICE, USER_DAILY_CAP, USAGE_STEPS, isKnownAirport, nearAirports, airportsMenu,
  cityAirports, shortName, sgtDay, usageOf,
};
