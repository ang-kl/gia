'use strict';

// outside-now.js — v0.62.952. "Outside now" for the Cuisine, Train and Hawker Mini Apps.
//
// Spec: doc/Feature/2026-10-29-outside-now-alerts.spec.md.
//
// Reads five NEA / PUB real-time feeds from data.gov.sg (heat stress as WBGT, lightning, PUB flood alerts, PSI with
// PM2.5, and UV), each fetched ISLAND-WIDE and cached for 5 minutes (C1), then turns them into one level per row for
// a given point, a dot colour (C4) and an ordered list of warnings (C2, C3). A feed that fails or arrives malformed
// becomes `{ status: 'unavailable' }` in its own row and never takes the others down (I2).
//
// The feeds are Singapore-only, so a point outside Singapore gets no rows at all (I3).

const axios = require('axios');
const { inSgBounds } = require('./weather');

const V2_REALTIME = 'https://api-open.data.gov.sg/v2/real-time/api';
// Path → feed name. Paths measured live on 29-10 '26.
const FEEDS = {
  wbgt: '/weather?api=wbgt',
  lightning: '/weather?api=lightning',
  flood: '/weather/flood-alerts',
  psi: '/psi',
  pm25: '/pm25',
  uv: '/uv',
};
const FEED_NAMES = Object.fromEntries(Object.entries(FEEDS).map(([k, v]) => [v, k]));
const CACHE_TTL_MS = 5 * 60 * 1000;
const SG_CENTROID = { lat: 1.3521, lng: 103.8198 };

// C2 thresholds.
const LIGHTNING_KM = 5;
const LIGHTNING_WINDOW_MS = 15 * 60 * 1000;
const FLOOD_KM = 3;
const PSI_WARN_ABOVE = 100;
const UV_WARN_AT = 8;
const UV_WINDOW_HOURS = [11, 15]; // inclusive, SGT
const PARKING_M = 300;
const PARKING_COUNT = 2;

// C3 default order; the Hawker app moves heat ahead of haze on the client.
const PRIORITY = ['lightning', 'flood', 'haze', 'heat', 'uv'];

function km(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat));
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function point(loc) {
  if (!loc) return null;
  const lat = Number(loc.latitude ?? loc.lat);
  const lng = Number(loc.longitude ?? loc.lng ?? loc.lon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

const round1 = (n) => Math.round(n * 10) / 10;

function sgtHour(iso) {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return new Date(t + 8 * 3600 * 1000).getUTCHours();
}

function psiLevel(v) {
  if (v <= 50) return 'good';
  if (v <= 100) return 'moderate';
  if (v <= 200) return 'unhealthy';
  if (v <= 300) return 'veryUnhealthy';
  return 'hazardous';
}

function uvLevel(v) {
  if (v <= 2) return 'low';
  if (v <= 5) return 'moderate';
  if (v <= 7) return 'high';
  if (v <= 10) return 'veryHigh';
  return 'extreme';
}

// Each row builder returns the row or throws; compute() turns a throw into "unavailable".
function heatRow(feed, here) {
  const rec = feed.data.records[0];
  const best = rec.item.readings
    .map((r) => ({ r, p: point(r.location) }))
    .filter((x) => x.p && typeof x.r.heatStress === 'string')
    .map((x) => ({ ...x, d: km(here, x.p) }))
    .sort((a, b) => a.d - b.d)[0];
  if (!best) throw new Error('no WBGT station');
  return {
    status: 'ok',
    level: best.r.heatStress.toLowerCase(),
    wbgt: Number(best.r.wbgt),
    station: best.r.station?.name || null,
    km: round1(best.d),
    at: rec.datetime,
  };
}

function lightningRow(feed, here, now) {
  const recs = feed.data.records;
  if (!Array.isArray(recs) || !recs.length) throw new Error('no lightning records');
  const near = recs
    .flatMap((rec) => rec.item.readings || [])
    .map((r) => ({ p: point(r.location), t: Date.parse(r.datetime) }))
    .filter((x) => x.p && Number.isFinite(x.t) && now - x.t <= LIGHTNING_WINDOW_MS && x.t <= now + 60 * 1000)
    .map((x) => km(here, x.p))
    .filter((d) => d <= LIGHTNING_KM);
  return {
    status: 'ok',
    level: near.length ? 'warn' : 'clear',
    count: near.length,
    nearestKm: near.length ? round1(Math.min(...near)) : null,
    at: recs[0].datetime,
  };
}

function floodRow(feed, here) {
  const rec = feed.data.records[0];
  const readings = rec.item.readings;
  if (!Array.isArray(readings)) throw new Error('no flood readings');
  // A2: PUB's reading shape was unverified when this was written (no alert was active). Use a location if the alert
  // carries one; otherwise the alert counts for all of Singapore and keeps PUB's own words.
  const alerts = readings
    .map((r) => {
      const p = point(r.location) || point(r);
      const text = String(r.text || r.description || r.message || r.area || r.location?.name || '').trim();
      return { text, km: p ? round1(km(here, p)) : null };
    })
    .filter((a) => a.km === null || a.km <= FLOOD_KM);
  return { status: 'ok', level: alerts.length ? 'warn' : 'none', alerts, at: rec.datetime };
}

function nearestRegion(meta, here) {
  return meta
    .map((m) => ({ name: m.name, p: point(m.labelLocation) }))
    .filter((m) => m.p)
    .sort((a, b) => km(here, a.p) - km(here, b.p))[0]?.name;
}

function airRow(psiFeed, pm25Feed, here) {
  const region = nearestRegion(psiFeed.data.regionMetadata, here);
  const item = psiFeed.data.items[0];
  const v = Number(item.readings.psi_twenty_four_hourly[region]);
  if (!Number.isFinite(v)) throw new Error('no PSI');
  let pm = null;
  try { pm = Number(pm25Feed.data.items[0].readings.pm25_one_hourly[region]); } catch { pm = null; }
  return { status: 'ok', level: psiLevel(v), psi: v, pm25: Number.isFinite(pm) ? pm : null, region, at: item.timestamp };
}

// LTA's carpark names arrive in capitals ("AMOY ST OFF ST"). Title-case them, keeping the abbreviations people read
// as letters.
const KEEP_UPPER = new Set(['HDB', 'MSCP', 'URA', 'LTA', 'CBD', 'MRT', 'LRT', 'JTC', 'NEA', 'SAF', 'NUS', 'NTU', 'SMU', 'SGH', 'SCDF', 'ITE']);
function titleCase(s) {
  return String(s || '').toLowerCase().replace(/[a-z0-9][^\s/()-]*/g, (w) => {
    if (KEEP_UPPER.has(w.toUpperCase())) return w.toUpperCase();
    if (/\d/.test(w)) return w.toUpperCase();
    return w.charAt(0).toUpperCase() + w.slice(1);
  });
}

function uvRow(feed, now) {
  const idx = feed.data.records[0].index
    .map((h) => ({ at: h.hour, t: Date.parse(h.hour), v: Number(h.value) }))
    .filter((h) => Number.isFinite(h.t) && Number.isFinite(h.v) && h.t <= now)
    .sort((a, b) => b.t - a.t)[0];
  if (!idx) throw new Error('no UV hour');
  // The window is about NOW, not about the reading: a 15:00 reading of 9 must not still warn at 16:05 because no
  // newer hour has arrived (Codex P2 on #1895). The reading's own time stays on the row for display.
  const hour = sgtHour(new Date(now).toISOString());
  const inWindow = hour !== null && hour >= UV_WINDOW_HOURS[0] && hour <= UV_WINDOW_HOURS[1];
  // Amendment 1 (operator, 29-10 '26): UV 0 after dark is a true reading — the sun has set — so it is flagged as night
  // and the sheet says so, rather than printing a bare 0 that reads like a fault.
  const night = idx.v === 0 && hour !== null && (hour >= 19 || hour < 7);
  return { status: 'ok', level: uvLevel(idx.v), index: idx.v, warn: idx.v >= UV_WARN_AT && inWindow, night, indoors: false, at: idx.at };
}

function parkingRow(carparks, here) {
  if (!Array.isArray(carparks)) return null;
  const list = carparks
    // A full carpark (0 lots) is not a place to park; Amendment 1 drops it rather than listing "0 lots".
    .filter((c) => (c.lotType || 'C') === 'C' && Number.isFinite(c.availableLots) && c.availableLots > 0 && Number.isFinite(c.lat) && Number.isFinite(c.lng))
    .map((c) => ({ name: titleCase(c.name), lots: c.availableLots, m: Math.round(km(here, c) * 1000) }))
    .filter((c) => c.m <= PARKING_M)
    .sort((a, b) => a.m - b.m)
    .slice(0, PARKING_COUNT);
  return list.length ? { status: 'ok', carparks: list } : null;
}

function safe(fn) {
  try { return fn(); } catch { return { status: 'unavailable' }; }
}
const isFeed = (f) => f && !(f instanceof Error);

// feeds: { wbgt, lightning, flood, psi, pm25, uv }, each a parsed response or an Error.
// opts: { lat, lng, now, parking: array of carparks | null }.
function compute(feeds, opts = {}) {
  const hasCoords = Number.isFinite(opts.lat) && Number.isFinite(opts.lng);
  const here = hasCoords ? { lat: opts.lat, lng: opts.lng } : SG_CENTROID;
  if (hasCoords && !inSgBounds(here.lat, here.lng)) {
    return { ok: true, inSg: false, dot: null, warnings: [], rows: null };
  }
  const now = Number.isFinite(opts.now) ? opts.now : Date.now();
  const need = (f, build) => (isFeed(f) ? safe(build) : { status: 'unavailable' });
  const rows = {
    heat: need(feeds.wbgt, () => heatRow(feeds.wbgt, here)),
    lightning: need(feeds.lightning, () => lightningRow(feeds.lightning, here, now)),
    flood: need(feeds.flood, () => floodRow(feeds.flood, here)),
    air: need(feeds.psi, () => airRow(feeds.psi, isFeed(feeds.pm25) ? feeds.pm25 : null, here)),
    uv: need(feeds.uv, () => ({ ...uvRow(feeds.uv, now), indoors: !!(hasCoords && opts.inBuilding) })),
    parking: parkingRow(opts.parking, here),
  };
  const ok = (r) => r && r.status === 'ok';
  const flagged = {
    lightning: ok(rows.lightning) && rows.lightning.level === 'warn',
    flood: ok(rows.flood) && rows.flood.level === 'warn',
    haze: ok(rows.air) && rows.air.psi > PSI_WARN_ABOVE,
    heat: ok(rows.heat) && rows.heat.level === 'high',
    uv: ok(rows.uv) && rows.uv.warn,
  };
  const warnings = PRIORITY.filter((k) => flagged[k]);
  const amber = (ok(rows.heat) && rows.heat.level === 'moderate')
    || (ok(rows.air) && rows.air.psi > 50 && rows.air.psi <= PSI_WARN_ABOVE)
    || (ok(rows.uv) && rows.uv.index >= 6 && rows.uv.index <= 7);
  const anyRow = ['heat', 'lightning', 'flood', 'air', 'uv'].some((k) => ok(rows[k]));
  const dot = !anyRow ? null : warnings.length ? 'red' : amber ? 'amber' : 'green';
  return { ok: true, inSg: true, place: { ...here, isDefault: !hasCoords }, dot, warnings, rows };
}

async function fetchJson(path) {
  const key = process.env.DATA_GOV_SG_API_KEY;
  const { data } = await axios.get(`${V2_REALTIME}${path}`, { timeout: 6000, headers: key ? { 'x-api-key': key } : {} });
  if (data?.code !== 0) throw new Error(data?.errorMsg || `non-zero code ${data?.code}`);
  return data;
}

// One cache for the whole process: each feed is fetched island-wide at most once per 5 minutes (I4), concurrent
// callers share the in-flight request, and a failure is not cached so the next request retries.
function createFeedCache({ fetchJson: fetcher = fetchJson, now = Date.now, ttlMs = CACHE_TTL_MS } = {}) {
  const entries = new Map();
  async function get(name) {
    const e = entries.get(name);
    if (e && (e.pending || now() - e.at < ttlMs)) return e.pending || e.data;
    const pending = fetcher(FEEDS[name]);
    entries.set(name, { pending });
    try {
      const data = await pending;
      entries.set(name, { data, at: now() });
      return data;
    } catch (err) {
      entries.delete(name);
      throw err;
    }
  }
  async function all() {
    const names = Object.keys(FEEDS);
    const got = await Promise.allSettled(names.map(get));
    return Object.fromEntries(names.map((n, i) => [n, got[i].status === 'fulfilled' ? got[i].value : (got[i].reason || new Error('failed'))]));
  }
  return { get, all };
}

const defaultCache = createFeedCache();

// Amendment 1: a set location inside one of the large building footprints in data/buildings.json reads as "Indoors" on
// the UV row. The footprints are a SUBSET of Singapore's buildings, so a miss does not mean "outdoors".
function defaultBuildingAt(lat, lng) {
  try { return require('./buildings').buildingAt(lat, lng); } catch { return null; }
}

async function forLocation({ lat, lng, now, parking = false, getCarparks = null, feedCache = defaultCache, buildingAt = defaultBuildingAt } = {}) {
  const feeds = await feedCache.all();
  let carparks = null;
  if (parking && typeof getCarparks === 'function') {
    try { carparks = await getCarparks(); } catch { carparks = null; }
  }
  const inBuilding = Number.isFinite(lat) && Number.isFinite(lng) ? !!buildingAt(lat, lng) : false;
  return compute(feeds, { lat, lng, now: Number.isFinite(now) ? now : Date.now(), parking: carparks, inBuilding });
}

module.exports = { FEEDS, FEED_NAMES, PRIORITY, compute, createFeedCache, forLocation, psiLevel, uvLevel, titleCase };
