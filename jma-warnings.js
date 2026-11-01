// jma-warnings.js — v0.62.962. JMA's weather warnings for Japan's 11 cities.
//
// Spec doc/Feature/2026-11-01-local-weather-every-city.spec.md, C7 (operator, 01-11 '26: "also JMA warnings now").
//
// SOURCE. JMA's official XML feed only: https://www.data.jma.go.jp/developer/xml/feed/extra.xml, and the VPWW53
// bulletins ("気象特別警報・警報・注意報") it links to. The JSON behind JMA's website was sampled on 01-11 '26 for five
// offices and every file stopped at 2026-05-28, so it is never requested (I10). JMA's Standard Terms of Use are
// compatible with CC BY 4.0; the sheet credits "Source: Japan Meteorological Agency (JMA), processed by Soleat".
//
// WHICH WARNINGS. Each city maps to one JMA warning area in data/jma-city-areas.json (the area containing the
// city's point, checked against JMA's own polygons). Only the Body's <Warning type="気象警報・注意報（市町村等）"> rows
// for that code count, minus "解除" (lifted) and "発表警報・注意報はなし" (none issued) (I11). The Headline repeats
// warnings in an <Information> summary and the bulletin also has grouped-area <Warning> blocks; neither is read.
//
// LEVELS from the name's suffix, so names from JMA's revised system still sort: 特別警報 emergency, 危険警報 danger,
// 警報 warning (all red), 注意報 advisory (amber).
//
// FRESHNESS (I12). A bulletin counts for 24 h after its report time. With none, or an older one, the status is
// 'none-yet' or 'stale' and nothing is claimed: the sheet then says "No JMA bulletin received yet", never "No warnings".
//
// TRAFFIC (I13). The feed is read at most every 5 minutes server-wide (a Redis NX lock, with a per-process window as
// well), and only from warningsForPoint for a point near a Japanese city, i.e. only while someone has one open. A
// bulletin is fetched only when the feed names a newer one for one of our 11 offices.
//
// CITY MATCH. A point counts as a city within 10 km of the city's point. Cuisine's city picker sends the point itself;
// the sheet names the JMA area, so a reader further out can see which area the warnings are for.
'use strict';

const axios = require('axios');
const { CITY_CENTROIDS } = require('./city-centroids.js');
const AREAS = require('./data/jma-city-areas.json');

const FEED_URL = 'https://www.data.jma.go.jp/developer/xml/feed/extra.xml';
const DATA_PREFIX = 'https://www.data.jma.go.jp/developer/xml/data/';
const FEED_MIN_INTERVAL_MS = 5 * 60 * 1000;
const FRESH_MS = 24 * 60 * 60 * 1000;
const CITY_RADIUS_KM = 10;
const STORE_TTL_S = 3 * 24 * 60 * 60;
const LOCK_KEY = 'jma:feed:lock';
const storeKey = (office) => `jma:vpww53:${office}`;

const OUR_OFFICES = new Set(Object.values(AREAS.cities).map((c) => c.office));
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

function haversineKm(a, b) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function cityForPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null;
  for (const [city, a] of Object.entries(AREAS.cities)) {
    const c = CITY_CENTROIDS[city];
    if (!c) continue;
    const d = haversineKm({ lat, lng }, c);
    if (d <= CITY_RADIUS_KM && (!best || d < best.d)) best = { d, city, ...a };
  }
  if (!best) return null;
  const { d, ...rest } = best;
  return rest;
}

const OUR_CODES = new Set(Object.values(AREAS.cities).map((c) => c.area));

function createJma({ fetchText, cache = null, now = Date.now } = {}) {
  const memory = new Map();
  let lastFeedAt = -Infinity;
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
    try { latest = parseFeed(await fetchText(FEED_URL)); } catch { return; }
    for (const [office, e] of Object.entries(latest)) {
      if (!OUR_OFFICES.has(office)) continue;
      const have = await read(office);
      if (have && have.url === e.url) continue;
      try {
        const b = parseBulletin(await fetchText(e.url), OUR_CODES);
        await write(office, { url: e.url, reportAt: b.reportAt, areas: b.areas });
      } catch { /* keep what we had */ }
    }
  }

  async function warningsForPoint(lat, lng) {
    const city = cityForPoint(lat, lng);
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
  FEED_URL, FEED_MIN_INTERVAL_MS, FRESH_MS, CITY_RADIUS_KM,
  levelOf, isActiveStatus, dotFor, parseFeed, parseBulletin, areaWarnings, cityForPoint, createJma, forServer,
};
