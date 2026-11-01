// jma-warnings.js — v0.62.962. JMA's weather warnings for Japan's 11 cities.
//
// Spec doc/Feature/2026-11-01-local-weather-every-city.spec.md, C7 (operator, 01-11 '26: "also JMA warnings now").
//
// SOURCE. JMA's official XML feed only: https://www.data.jma.go.jp/developer/xml/feed/extra.xml, and the VPWW53
// bulletins ("気象特別警報・警報・注意報") it links to. The JSON behind JMA's website was sampled on 01-11 '26 for five
// offices and every file stopped at 2026-05-28, so it is never requested (I10). JMA's Standard Terms of Use are
// compatible with CC BY 4.0; the sheet credits "Source: Japan Meteorological Agency (JMA), processed by Soleat".
//
// WHICH WARNINGS. The point's JMA warning area (see WHICH AREA below). Only the Body's
// <Warning type="気象警報・注意報（市町村等）"> rows for that area's code count, minus "解除" (lifted) and "発表警報・注意報はなし" (none issued) (I11). The Headline repeats
// warnings in an <Information> summary and the bulletin also has grouped-area <Warning> blocks; neither is read.
//
// LEVELS from the name's suffix, so names from JMA's revised system still sort: 特別警報 emergency, 危険警報 danger,
// 警報 warning (all red), 注意報 advisory (amber).
//
// FRESHNESS (I12). A bulletin counts for 24 h after its report time. With none, or an older one, the status is
// 'none-yet' or 'stale' and nothing is claimed: the sheet then says "No JMA bulletin received yet", never "No warnings".
//
// TRAFFIC (I13). The feed is read at most every 5 minutes server-wide (a Redis NX lock, with a per-process window as
// well), and only from warningsForPoint for a point inside the covered areas, i.e. only while someone has one open. A
// bulletin is fetched only when the feed names a newer one for an office whose areas we hold.
//
// WHICH AREA (Amendment 1, operator 01-11 '26: "Ship JMA's map"). The area is the JMA warning area that CONTAINS the
// point, looked up in data/jma-areas.json (JMA's own polygons within 45 km of the 11 cities, simplified to about
// 50 m; built by scripts/build-jma-areas.js). A first version matched the nearest station within 10 km, and a
// headless render showed why that was wrong: Cuisine's picker point for Tokyo sits in Suginami, 10.6 km from Tokyo
// Station, and got nothing; Hiroshima's sits in Naka-ku and would have been shown Minami-ku's warnings. A point
// outside the covered areas gets no JMA block, never a guessed one. The sheet names the area found.
'use strict';

const axios = require('axios');
const AREAS = require('./data/jma-areas.json');

const FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/extra.xml';
const DATA_PREFIX = 'https://www.data.jma.go.jp/developer/xml/data/';
const FEED_MIN_INTERVAL_MS = 5 * 60 * 1000;
const FRESH_MS = 24 * 60 * 60 * 1000;
const STORE_TTL_S = 3 * 24 * 60 * 60;
const LOCK_KEY = 'jma:feed:lock';
// v0.62.963 — Amendment 2 (operator, A7: "Seed only, <=1/hour"). The short feed covers about 9 hours and, on 01-11
// '26, 40 of 58 offices; the long feed (3.5 MB) covers 7 days and all 58. It is read only while an office in the map
// has no stored bulletin, at most once an hour server-wide, and never once every office holds one.
const LONG_FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/extra_l.xml';
const LONG_FEED_MIN_INTERVAL_MS = 60 * 60 * 1000;
const LONG_LOCK_KEY = 'jma:feedl:lock';
const storeKey = (office) => `jma:vpww53:${office}`;

const OUR_OFFICES = new Set(AREAS.areas.map((a) => a.office));
const OUR_CODES = new Set(AREAS.areas.map((a) => a.code));
const RANK = { emergency: 4, danger: 3, warning: 2, advisory: 1 };

function levelOf(name) {
  const n = String(name || '');
  if (n.endsWith('特別警報')) return 'emergency';
  if (n.endsWith('危険警報')) return 'danger';
  if (n.endsWith('警報')) return 'warning';
  if (n.endsWith('注意報')) return 'advisory';
  return null;
}

function isActiveStatus(status) {
  const s = String(status || '');
  return s !== '' && s !== '解除' && s !== '発表警報・注意報はなし';
}

function dotFor(level) {
  if (!level) return null;
  return level === 'advisory' ? 'amber' : 'red';
}

const tag = (xml, name) => { const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(xml); return m ? m[1].trim() : null; };

// The newest VPWW53 per office: { [office]: { url, updated } }. Entries linking outside the developer data path are
// dropped, so nothing else can ever be fetched.
function parseFeed(xml) {
  const out = {};
  const entries = String(xml || '').match(/<entry>[\s\S]*?<\/entry>/g) || [];
  for (const e of entries) {
    const href = (/<link[^>]*href="([^"]+)"/.exec(e) || [])[1];
    if (!href || !href.startsWith(DATA_PREFIX)) continue;
    const m = /_VPWW53_(\d{6})\.xml$/.exec(href);
    if (!m) continue;
    const updated = tag(e, 'updated');
    const prev = out[m[1]];
    if (!prev || Date.parse(updated) > Date.parse(prev.updated)) out[m[1]] = { url: href, updated };
  }
  return out;
}

// { reportAt, areas: { [code]: [{ name, status }] } } from the Body's municipality <Warning> only.
function parseBulletin(xml, codes = null) {
  const s = String(xml || '');
  const reportAt = tag(s, 'ReportDateTime');
  const areas = {};
  const bodyAt = s.indexOf('<Body');
  const body = bodyAt >= 0 ? s.slice(bodyAt) : '';
  const blocks = body.match(/<Warning type="気象警報・注意報（市町村等）">[\s\S]*?<\/Warning>/g) || [];
  for (const block of blocks) {
    for (const item of block.match(/<Item>[\s\S]*?<\/Item>/g) || []) {
      const area = /<Area>[\s\S]*?<Code>([^<]+)<\/Code>[\s\S]*?<\/Area>/.exec(item);
      if (!area) continue;
      const code = area[1].trim();
      if (codes && !codes.has(code)) continue;
      const kinds = (item.match(/<Kind>[\s\S]*?<\/Kind>/g) || []).map((k) => ({ name: tag(k, 'Name'), status: tag(k, 'Status') }));
      areas[code] = (areas[code] || []).concat(kinds);
    }
  }
  return { reportAt, areas };
}

// The area's current warnings, worst first: [{ name, level }].
function areaWarnings(bulletin, code) {
  const kinds = (bulletin && bulletin.areas && bulletin.areas[code]) || [];
  const seen = new Set();
  const out = [];
  for (const k of kinds) {
    if (!k.name || !isActiveStatus(k.status) || seen.has(k.name)) continue;
    seen.add(k.name);
    out.push({ name: k.name, level: levelOf(k.name) });
  }
  return out
    .map((w, i) => ({ w, i }))
    .sort((a, b) => ((RANK[b.w.level] || 0) - (RANK[a.w.level] || 0)) || (a.i - b.i))
    .map((x) => x.w);
}

// Even-odd point-in-polygon over every ring of the area (outer rings and holes alike); rings are flat [lng, lat, …].
function inRings(x, y, rings) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2) {
      const xi = r[i], yi = r[i + 1], xj = r[j], yj = r[j + 1];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

function areaForPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const a of AREAS.areas) {
    const [x0, y0, x1, y1] = a.bbox;
    if (lng < x0 || lng > x1 || lat < y0 || lat > y1) continue;
    if (inRings(lng, lat, a.rings)) return { office: a.office, area: a.code, areaName: a.name };
  }
  return null;
}

function createJma({ fetchText, cache = null, now = Date.now } = {}) {
  const memory = new Map();
  let lastFeedAt = -Infinity;
  let lastLongAt = -Infinity;
  let inflight = null;

  const read = async (office) => {
    if (cache) {
      try { const v = await cache.get(storeKey(office)); if (v) return JSON.parse(v); } catch { /* fall through */ }
    }
    return memory.get(office) || null;
  };
  const write = async (office, rec) => {
    memory.set(office, rec);
    if (cache) { try { await cache.setEx(storeKey(office), STORE_TTL_S, JSON.stringify(rec)); } catch { /* memory holds it */ } }
  };

  async function refresh() {
    const t = now();
    if (t - lastFeedAt < FEED_MIN_INTERVAL_MS) return;
    lastFeedAt = t;
    if (cache) {
      try {
        const got = await cache.set(LOCK_KEY, String(t), { NX: true, EX: FEED_MIN_INTERVAL_MS / 1000 });
        if (got == null) return; // another process read the feed inside the window
      } catch { /* no lock available: the per-process window above still holds */ }
    }
    let latest;
    try { latest = parseFeed(await fetchText(FEED_URL)); } catch { latest = null; }
    if (latest) await take(latest);
    await seed(t);
  }

  // Store the newest bulletin of each of our offices that a feed names, unless we already hold that one.
  async function take(latest, only = null) {
    for (const [office, e] of Object.entries(latest)) {
      if (!OUR_OFFICES.has(office) || (only && !only.has(office))) continue;
      const have = await read(office);
      if (have && have.url === e.url) continue;
      try {
        const b = parseBulletin(await fetchText(e.url), OUR_CODES);
        await write(office, { url: e.url, reportAt: b.reportAt, areas: b.areas });
      } catch { /* keep what we had */ }
    }
  }

  // I13′ / I17 — fill offices with no stored bulletin from the long feed: at most once an hour, server-wide, and not
  // at all once every office holds one. Only the missing offices are taken from it; the short feed keeps the rest.
  async function seed(t) {
    if (t - lastLongAt < LONG_FEED_MIN_INTERVAL_MS) return;
    const missing = new Set();
    for (const office of OUR_OFFICES) if (!(await read(office))) missing.add(office);
    if (!missing.size) return;
    lastLongAt = t;
    if (cache) {
      try {
        const got = await cache.set(LONG_LOCK_KEY, String(t), { NX: true, EX: LONG_FEED_MIN_INTERVAL_MS / 1000 });
        if (got == null) return; // another process read the long feed inside the hour
      } catch { /* the per-process hour above still holds */ }
    }
    let longest;
    try { longest = parseFeed(await fetchText(LONG_FEED_URL)); } catch { return; }
    await take(longest, missing);
  }

  async function warningsForPoint(lat, lng) {
    const city = areaForPoint(lat, lng);
    if (!city) return null;
    if (!inflight) inflight = refresh().finally(() => { inflight = null; });
    await inflight;
    const rec = await read(city.office);
    const base = { office: city.office, area: { code: city.area, name: city.areaName }, warnings: [], level: null, dot: null };
    if (!rec || !rec.reportAt) return { ...base, status: 'none-yet', reportAt: null };
    if (!(now() - Date.parse(rec.reportAt) < FRESH_MS)) return { ...base, status: 'stale', reportAt: rec.reportAt };
    const warnings = areaWarnings(rec, city.area);
    const level = warnings.length ? warnings[0].level : null;
    return { ...base, status: 'ok', reportAt: rec.reportAt, warnings, level, dot: dotFor(level) };
  }

  return { warningsForPoint, refresh };
}

async function fetchTextAxios(url) {
  const { data } = await axios.get(url, { timeout: 6000, responseType: 'text', headers: { 'User-Agent': 'Soleat (https://soleat.net)' } });
  return String(data);
}

// The server's shared instance; index.js hands it the Redis client on first use.
let shared = null;
function forServer(cache) {
  if (!shared) shared = createJma({ fetchText: fetchTextAxios, cache });
  return shared;
}

module.exports = {
  FEED_URL, FEED_MIN_INTERVAL_MS, FRESH_MS, LONG_FEED_URL, LONG_FEED_MIN_INTERVAL_MS,
  levelOf, isActiveStatus, dotFor, parseFeed, parseBulletin, areaWarnings, areaForPoint, createJma, forServer,
};
