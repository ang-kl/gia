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

// === MRT stations + platform crowd ===

const MRT_LINES = ['NSL', 'EWL', 'CCL', 'NEL', 'DTL', 'CGL', 'BPL', 'TEL', 'SLRT', 'PLRT'];
const PCD_URL = `${LTA_BASE}/PCDRealTime`;
const CROWD_LABEL = { l: 'low', m: 'medium', h: 'high' };

// Use Google Places (New) to find nearest MRT/subway stations.
// More reliable than maintaining a hardcoded coord table for ~140 stations.
async function nearestMrtStations(lat, lng, radiusM = 1500, count = 3) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];
  try {
    const { data } = await axios.post(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        includedTypes: ['subway_station'],
        maxResultCount: Math.max(count, 5),
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } },
        rankPreference: 'DISTANCE'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
        },
        timeout: 8000
      }
    );
    return (data.places ?? []).slice(0, count).map((p) => ({
      placeId: p.id,
      name: p.displayName?.text ?? '',
      address: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null
    }));
  } catch (err) {
    console.error('[Transport] MRT searchNearby failed:', err.message);
    return [];
  }
}

// Fetches crowd density for a single LTA train line.
async function fetchLineCrowd(trainLine) {
  if (!process.env.LTA_ACCOUNT_KEY) return [];
  try {
    const { data } = await axios.get(PCD_URL, {
      headers: authHeaders(),
      params: { TrainLine: trainLine },
      timeout: 6000
    });
    return data?.value ?? [];
  } catch (err) {
    // 400 is common when a line code isn't supported on this endpoint version.
    return [];
  }
}

// Fetches all 10 lines in parallel. Returns a Map keyed by uppercased
// station name → crowd label. LTA's PCDRealTime returns Station as the
// short station code (e.g. NS1, EW24); we key on that and on a derived
// human-readable variant if available.
async function fetchPlatformCrowdAll() {
  const results = await Promise.all(MRT_LINES.map(fetchLineCrowd));
  const byCode = new Map();
  for (const arr of results) {
    for (const row of arr) {
      const code = (row.Station || '').toUpperCase().trim();
      if (!code) continue;
      const level = (row.CrowdLevel || '').toLowerCase();
      if (!byCode.has(code)) byCode.set(code, level);
    }
  }
  return byCode;
}

// Lightweight name → crowd lookup. Tries to match the Places station
// "displayName" against LTA station codes by stripping common suffixes
// and uppercasing. Match success is best-effort; null if no match.
function lookupCrowdForPlace(crowdByCode, placeName) {
  if (!placeName) return null;
  // Strip common suffixes: "MRT Station", "Station"
  const norm = String(placeName)
    .replace(/\s+(MRT|LRT)\s+Station\s*$/i, '')
    .replace(/\s+Station\s*$/i, '')
    .trim();
  // LTA PCDRealTime uses station CODES (NS27, etc.), not names.
  // Without an authoritative name→code table we can only show the
  // worst-case crowd across the whole network. Until a mapping table
  // is added, return null and let callers omit the crowd line.
  // (Future patch: hardcode top ~30 station name → code.)
  return null; // intentional — see comment above
}

// Compute a coarse city-wide crowd: highest level seen across all lines.
// Useful as a fallback when per-station mapping isn't available.
function networkCrowdSummary(crowdByCode) {
  let counts = { l: 0, m: 0, h: 0 };
  for (const level of crowdByCode.values()) {
    if (counts[level] !== undefined) counts[level]++;
  }
  const total = counts.l + counts.m + counts.h;
  if (!total) return null;
  return {
    total,
    low: counts.l,
    medium: counts.m,
    high: counts.h,
    overall: counts.h > total * 0.2 ? 'high' : counts.m > total * 0.4 ? 'medium' : 'low'
  };
}

// LTA TrafficIncidents — live accidents, roadworks, vehicle breakdowns.
// Each entry: { Type, Latitude, Longitude, Message }.
// Message is pre-formatted by LTA, e.g. "(15/4)18:30 Accident on PIE..."
const TRAFFIC_INCIDENTS_URL = `${LTA_BASE}/TrafficIncidents`;

async function fetchTrafficIncidents() {
  if (!process.env.LTA_ACCOUNT_KEY) return [];
  try {
    const { data } = await axios.get(TRAFFIC_INCIDENTS_URL, {
      headers: authHeaders(),
      timeout: 6000
    });
    const rows = data?.value ?? [];
    return rows.map((r) => ({
      type: r.Type || 'Incident',
      lat: Number(r.Latitude),
      lng: Number(r.Longitude),
      message: r.Message || ''
    })).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  } catch (err) {
    console.error('[Transport] TrafficIncidents fetch failed:', err.message);
    return [];
  }
}

// Haversine distance in metres.
function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Filter incidents to those within `radiusM` of (lat,lng), sorted nearest first.
// If lat/lng absent, returns the full list (caller can slice).
function nearestIncidents(incidents, lat, lng, radiusM = 5000, count = 3) {
  if (!Array.isArray(incidents) || !incidents.length) return [];
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return incidents.slice(0, count);
  }
  const ranked = incidents
    .map((i) => ({ ...i, distanceM: Math.round(haversineM(lat, lng, i.lat, i.lng)) }))
    .filter((i) => i.distanceM <= radiusM)
    .sort((a, b) => a.distanceM - b.distanceM);
  return ranked.slice(0, count);
}

module.exports = {
  refreshStops,
  nearestStops,
  busArrivals,
  isCacheFresh,
  nearestMrtStations,
  fetchPlatformCrowdAll,
  lookupCrowdForPlace,
  networkCrowdSummary,
  fetchTrafficIncidents,
  nearestIncidents,
  CROWD_LABEL,
  STOPS_GEO,
  STOPS_HASH_PREFIX
};
