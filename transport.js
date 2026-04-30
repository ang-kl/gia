// transport.js — LTA DataMall bus stops + bus arrivals.
//
// Bus stops list (~5500 entries) is cached at boot in a Redis geo
// set so /transport can run a fast GEOSEARCH. Refreshes every 24h.
//
// Bus arrivals are real-time per request (LTA throttles to ~30/min
// per key — single-user scale is fine).

const axios = require('axios');

const LTA_BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const BUS_STOPS_URL = `${LTA_BASE}/BusStops`;
const BUS_ARRIVAL_URL = `${LTA_BASE}/BusArrivalv2`;
const PAGE_SIZE = 500;

const STOPS_GEO = 'lta:busstops:geo';        // GEO sorted set, member = BusStopCode
const STOPS_HASH_PREFIX = 'lta:busstop:';    // Hash per stop: name, road, code
const STOPS_TS_KEY = 'lta:busstops:cachedAt';
const REFRESH_TTL_MS = 24 * 60 * 60 * 1000;  // 24h

function authHeaders() {
  return { AccountKey: process.env.LTA_ACCOUNT_KEY };
}

async function fetchAllStops() {
  const out = [];
  let skip = 0;
  for (let page = 0; page < 15; page++) {
    const { data } = await axios.get(BUS_STOPS_URL, {
      headers: authHeaders(),
      params: { $skip: skip },
      timeout: 8000
    });
    const batch = data?.value ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    skip += batch.length;
  }
  return out;
}

async function isCacheFresh(redis) {
  if (!redis.isOpen) await redis.connect();
  const ts = await redis.get(STOPS_TS_KEY);
  if (!ts) return false;
  const ageMs = Date.now() - Number(ts);
  return Number.isFinite(ageMs) && ageMs < REFRESH_TTL_MS;
}

async function refreshStops(redis) {
  if (!process.env.LTA_ACCOUNT_KEY) return { imported: 0, skipped: 'no-key' };
  if (await isCacheFresh(redis)) return { imported: 0, skipped: 'fresh' };
  const stops = await fetchAllStops();
  if (!redis.isOpen) await redis.connect();
  // Atomic-ish refresh: remove old key, write new, set timestamp.
  await redis.del(STOPS_GEO).catch(() => {});
  let imported = 0;
  for (const s of stops) {
    const lat = Number(s.Latitude);
    const lng = Number(s.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const code = String(s.BusStopCode);
    if (!code) continue;
    await redis.sendCommand([
      'GEOADD', STOPS_GEO, String(lng), String(lat), code
    ]);
    await redis.hSet(`${STOPS_HASH_PREFIX}${code}`, {
      code,
      description: s.Description || '',
      roadName: s.RoadName || ''
    });
    imported++;
  }
  await redis.set(STOPS_TS_KEY, String(Date.now()));
  return { imported, skipped: null };
}

async function nearestStops(redis, lat, lng, radiusM = 800, count = 3) {
  if (!redis.isOpen) await redis.connect();
  let hits;
  try {
    hits = await redis.sendCommand([
      'GEOSEARCH', STOPS_GEO,
      'FROMLONLAT', String(lng), String(lat),
      'BYRADIUS', String(radiusM), 'm',
      'ASC',
      'WITHCOORD', 'WITHDIST',
      'COUNT', String(count)
    ]);
  } catch (err) {
    console.error('[Transport] GEOSEARCH busstops failed:', err.message);
    return [];
  }
  if (!Array.isArray(hits) || !hits.length) return [];
  const out = [];
  for (const row of hits) {
    const code = Array.isArray(row) ? row[0] : row;
    const distance = Array.isArray(row) ? Number(row[1]) : null;
    const coord = Array.isArray(row) && Array.isArray(row[2]) ? row[2] : null;
    const meta = await redis.hGetAll(`${STOPS_HASH_PREFIX}${code}`).catch(() => ({}));
    out.push({
      code,
      description: meta?.description || '',
      roadName: meta?.roadName || '',
      lat: coord ? Number(coord[1]) : null,
      lng: coord ? Number(coord[0]) : null,
      distanceM: Number.isFinite(distance) ? Math.round(distance) : null
    });
  }
  return out;
}

const LOAD_LABEL = { SEA: 'seats', SDA: 'standing', LSD: 'limited', '': '?' };

async function busArrivals(busStopCode) {
  if (!process.env.LTA_ACCOUNT_KEY) return [];
  try {
    const { data } = await axios.get(BUS_ARRIVAL_URL, {
      headers: authHeaders(),
      params: { BusStopCode: busStopCode },
      timeout: 6000
    });
    const services = data?.Services ?? [];
    const now = Date.now();
    return services.map((s) => ({
      service: s.ServiceNo,
      operator: s.Operator,
      next: arrivalToObject(s.NextBus, now),
      next2: arrivalToObject(s.NextBus2, now),
      next3: arrivalToObject(s.NextBus3, now)
    }));
  } catch (err) {
    console.error(`[Transport] BusArrivalv2 ${busStopCode} failed:`, err.message);
    return [];
  }
}

function arrivalToObject(b, nowMs) {
  if (!b || !b.EstimatedArrival) return null;
  const t = Date.parse(b.EstimatedArrival);
  if (!Number.isFinite(t)) return null;
  const minutes = Math.max(0, Math.round((t - nowMs) / 60000));
  return {
    minutes,
    load: b.Load || '',
    loadLabel: LOAD_LABEL[b.Load] || b.Load || '?',
    type: b.Type || '',  // SD = single deck, DD = double deck, BD = bendy
    feature: b.Feature || '' // WAB = wheelchair-accessible
  };
}

module.exports = {
  refreshStops,
  nearestStops,
  busArrivals,
  isCacheFresh,
  STOPS_GEO,
  STOPS_HASH_PREFIX
};
