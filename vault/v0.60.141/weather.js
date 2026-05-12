// weather.js — NEA real-time weather + 2-hour forecast.
//
// Tries v2 real-time API first (api-open.data.gov.sg/v2/real-time/api).
// Falls back to legacy v1 (api.data.gov.sg/v1/environment) when v2
// returns empty or errors. Both honour DATA_GOV_SG_API_KEY when set.
//
// 2-hour forecast still on v1 — v2 spec for forecast not yet uploaded
// to data/gov_sg/.

const axios = require('axios');

const V2_REALTIME = 'https://api-open.data.gov.sg/v2/real-time/api';
const V1_BASE = 'https://api.data.gov.sg/v1/environment';
const V1_FORECAST_2HR = `${V1_BASE}/2-hour-weather-forecast`;

// v2 path → v1 path. v1 only has air-temperature (the rest aren't on v1
// or have different endpoint names). When a v2 endpoint fails, fall
// back to v1 if there's a mapping; otherwise the field is silently
// absent.
const V1_MAP = {
  '/air-temperature': `${V1_BASE}/air-temperature`,
  '/rainfall': `${V1_BASE}/rainfall`,
  '/relative-humidity': `${V1_BASE}/relative-humidity`,
  '/wind-direction': `${V1_BASE}/wind-direction`,
  '/wind-speed': `${V1_BASE}/wind-speed`
};

function authHeaders() {
  const key = process.env.DATA_GOV_SG_API_KEY;
  return key ? { 'x-api-key': key } : {};
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// v2 shape:
//   { code: 0, errorMsg: null,
//     data: { stations: [{id, deviceId, name, labelLocation: {latitude, longitude}}],
//             readings: [{timestamp, data: [{stationId, value}]}],
//             readingType, readingUnit, paginationToken } }
async function fetchV2Realtime(endpointPath) {
  const url = `${V2_REALTIME}${endpointPath}`;
  const { data } = await axios.get(url, { timeout: 6000, headers: authHeaders() });
  if (data?.code !== 0 && data?.code !== undefined) {
    throw new Error(data?.errorMsg || `v2 non-zero code ${data?.code}`);
  }
  const stations = (data?.data?.stations ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.labelLocation?.latitude ?? null,
    lng: s.labelLocation?.longitude ?? null
  }));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const reading = data?.data?.readings?.[0];
  const items = (reading?.data ?? [])
    .map((r) => {
      const s = stationById.get(r.stationId);
      if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return null;
      return { ...s, value: r.value };
    })
    .filter(Boolean);
  return {
    source: 'v2',
    timestamp: reading?.timestamp ?? null,
    stations: items
  };
}

// v1 shape:
//   { items: [{timestamp, readings: [{station_id, value}]}],
//     metadata: {stations: [{id, name, location: {latitude, longitude}}]} }
async function fetchV1Realtime(url) {
  const { data } = await axios.get(url, { timeout: 6000, headers: authHeaders() });
  const item = data?.items?.[0];
  if (!item) return { source: 'v1', timestamp: null, stations: [] };
  const stationsMeta = data?.metadata?.stations ?? [];
  const stationById = new Map(stationsMeta.map((s) => [s.id, s]));
  const items = (item.readings ?? []).map((r) => {
    const s = stationById.get(r.station_id);
    return {
      id: r.station_id,
      name: s?.name ?? r.station_id,
      lat: s?.location?.latitude ?? null,
      lng: s?.location?.longitude ?? null,
      value: r.value
    };
  }).filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lng));
  return { source: 'v1', timestamp: item.timestamp, stations: items };
}

// v2 first, fall back to v1 on error or empty.
async function fetchRealtime(endpointPath, label) {
  try {
    const r = await fetchV2Realtime(endpointPath);
    if (r.stations.length) return r;
    console.warn(`[Weather] v2 ${label} returned empty; trying v1 fallback`);
  } catch (err) {
    console.warn(`[Weather] v2 ${label} failed: ${err.message}; trying v1 fallback`);
  }
  const v1Url = V1_MAP[endpointPath];
  if (!v1Url) return { source: 'none', timestamp: null, stations: [] };
  try {
    const r = await fetchV1Realtime(v1Url);
    return r;
  } catch (err) {
    console.error(`[Weather] v1 ${label} also failed: ${err.message}`);
    return { source: 'none', timestamp: null, stations: [] };
  }
}

async function fetchTwoHourForecast() {
  try {
    const { data } = await axios.get(V1_FORECAST_2HR, { timeout: 6000, headers: authHeaders() });
    const item = data?.items?.[0];
    if (!item) return null;
    const areaMetadata = data?.area_metadata ?? [];
    const labelByArea = new Map(areaMetadata.map((a) => [a.name, a.label_location]));
    const forecasts = (item.forecasts ?? []).map((f) => ({
      area: f.area,
      forecast: f.forecast,
      location: labelByArea.get(f.area) || null
    }));
    return {
      validFrom: item.valid_period?.start ?? null,
      validTo: item.valid_period?.end ?? null,
      forecasts
    };
  } catch (err) {
    console.error('[Weather] 2-hour forecast failed:', err.message);
    return null;
  }
}

function nearestStation(stations, lat, lng) {
  if (!Array.isArray(stations) || !stations.length) return null;
  let best = null;
  for (const s of stations) {
    const d = haversineKm({ lat, lng }, { lat: s.lat, lng: s.lng });
    if (!best || d < best.distanceKm) best = { ...s, distanceKm: d };
  }
  return best;
}

function nearestForecast(forecasts, lat, lng) {
  if (!Array.isArray(forecasts) || !forecasts.length) return null;
  let best = null;
  for (const f of forecasts) {
    if (!f.location || !Number.isFinite(f.location.latitude) || !Number.isFinite(f.location.longitude)) continue;
    const d = haversineKm({ lat, lng }, { lat: f.location.latitude, lng: f.location.longitude });
    if (!best || d < best.distanceKm) best = { ...f, distanceKm: d };
  }
  return best || forecasts[0];
}

async function summary(lat, lng) {
  const [tempRes, rainRes, humidityRes, windDirRes, windSpdRes, forecast] = await Promise.allSettled([
    fetchRealtime('/air-temperature', 'air-temp'),
    fetchRealtime('/rainfall', 'rainfall'),
    fetchRealtime('/relative-humidity', 'humidity'),
    fetchRealtime('/wind-direction', 'wind-dir'),
    fetchRealtime('/wind-speed', 'wind-speed'),
    fetchTwoHourForecast()
  ]);
  const ok = (r) => (r.status === 'fulfilled' ? r.value : null);
  const fc = ok(forecast) ? nearestForecast(ok(forecast).forecasts, lat, lng) : null;
  const temp = ok(tempRes) ? nearestStation(ok(tempRes).stations, lat, lng) : null;
  const rain = ok(rainRes) ? nearestStation(ok(rainRes).stations, lat, lng) : null;
  const humidity = ok(humidityRes) ? nearestStation(ok(humidityRes).stations, lat, lng) : null;
  const windDir = ok(windDirRes) ? nearestStation(ok(windDirRes).stations, lat, lng) : null;
  const windSpd = ok(windSpdRes) ? nearestStation(ok(windSpdRes).stations, lat, lng) : null;
  return {
    forecastArea: fc?.area ?? null,
    forecast: fc?.forecast ?? null,
    forecastValidTo: ok(forecast)?.validTo ?? null,
    tempStationName: temp?.name ?? null,
    tempC: temp?.value ?? null,
    tempSource: ok(tempRes)?.source ?? null,
    rainStationName: rain?.name ?? null,
    rainMm: rain?.value ?? null,
    humidityStationName: humidity?.name ?? null,
    humidityPct: humidity?.value ?? null,
    windDirDeg: windDir?.value ?? null,
    windSpdKt: windSpd?.value ?? null,
    timestamp: ok(tempRes)?.timestamp ?? null
  };
}

// ─────────────────────────────────────────────────────────────────────
// v0.60.118 — /weather expansion: rain-near-a-venue caveats, /weather
// <area> "head-out window" answers, and a 24-hour "tonight" line.
//
// All powered by NEA feeds already known to weather.js (2-hour nowcast,
// 5-min rainfall) plus the 24-hour forecast. Each feed is Redis-cached
// so however many picks/searches fire, NEA is hit at most ~once per
// cache window: nowcast 5 min, rainfall 60 s, 24-hour forecast 30 min.
// ─────────────────────────────────────────────────────────────────────

const V1_FORECAST_24HR = `${V1_BASE}/24-hour-weather-forecast`;

// Approx centroids of NEA's 5 forecast zones — used to (a) resolve
// `/weather west` etc. to a lat/lng and (b) map an arbitrary lat/lng to
// the zone whose 24-hour forecast applies. Rough on purpose; the zones
// are large.
const WEATHER_ZONE_CENTROIDS = {
  west:    { lat: 1.3500, lng: 103.7000, label: 'West' },
  north:   { lat: 1.4200, lng: 103.8200, label: 'North' },
  central: { lat: 1.3100, lng: 103.8400, label: 'Central' },
  south:   { lat: 1.2700, lng: 103.8200, label: 'South' },
  east:    { lat: 1.3500, lng: 103.9400, label: 'East' }
};

// Singapore-only bounds — NEA data doesn't cover Johor; skip rain
// caveats for venues outside this box (the Cuisine search radius can
// reach JB).
function inSgBounds(lat, lng) {
  // North bound 1.48 keeps all of mainland SG (Sungei Buloh ≈1.446,
  // Woodlands ≈1.44) but excludes JB CBD (≈1.493) so JB picks from the
  // Cuisine search's wide radius don't get NEA caveats.
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= 1.15 && lat <= 1.48 && lng >= 103.55 && lng <= 104.10;
}

const WET_RE = /(shower|thundery|thunder|rain|squall|wet|drizzle)/i;

async function getCached(redis, key, ttlS, fetchFn) {
  if (redis && redis.isOpen) {
    try {
      const hit = await redis.get(key);
      if (hit) return JSON.parse(hit);
    } catch (err) { console.warn(`[Weather] cache read ${key} failed: ${err.message}`); }
  }
  const fresh = await fetchFn();
  if (fresh && redis && redis.isOpen) {
    try { await redis.setEx(key, ttlS, JSON.stringify(fresh)); } catch (err) { console.warn(`[Weather] cache write ${key} failed: ${err.message}`); }
  }
  return fresh;
}

const getNowcastCached  = (redis) => getCached(redis, 'nea:2h-nowcast', 300,  fetchTwoHourForecast);
const getRainfallCached = (redis) => getCached(redis, 'nea:rainfall',   60,   () => fetchRealtime('/rainfall', 'rainfall'));
const get24hCached      = (redis) => getCached(redis, 'nea:24h-forecast', 1800, fetch24hForecast);

async function fetch24hForecast() {
  try {
    const { data } = await axios.get(V1_FORECAST_24HR, { timeout: 6000, headers: authHeaders() });
    const item = data?.items?.[0];
    if (!item) return null;
    const periods = (item.periods ?? []).map((p) => ({
      startIso: p.time?.start ?? null,
      endIso: p.time?.end ?? null,
      // regions: { west, east, central, north, south } → forecast strings
      regions: p.regions || {}
    }));
    return {
      updatedAt: item.update_timestamp ?? item.timestamp ?? null,
      general: item.general?.forecast ?? null,
      periods
    };
  } catch (err) {
    console.error('[Weather] 24-hour forecast failed:', err.message);
    return null;
  }
}

// nearest of the 5 zone centroids to a point → its key ('west' | …).
function zoneKeyFor(lat, lng) {
  let best = null;
  for (const [key, c] of Object.entries(WEATHER_ZONE_CENTROIDS)) {
    const d = haversineKm({ lat, lng }, c);
    if (!best || d < best.d) best = { key, d };
  }
  return best ? best.key : 'central';
}

// Resolve a free-text area argument from `/weather <area>` to a
// { name, lat, lng } anchor. Tries the ~47 nowcast area names first
// (exact, then substring), then the 5 broad zones.
function resolveArea(nowcast, areaArg) {
  const q = String(areaArg || '').trim().toLowerCase();
  if (!q) return null;
  const forecasts = nowcast?.forecasts || [];
  // exact area name
  let hit = forecasts.find((f) => f.area && f.area.toLowerCase() === q && f.location);
  // substring either way (e.g. "tampines" ⊂ "Tampines"; "amk" won't match — that's fine)
  if (!hit) hit = forecasts.find((f) => f.area && f.location && (f.area.toLowerCase().includes(q) || q.includes(f.area.toLowerCase())));
  if (hit && Number.isFinite(hit.location.latitude) && Number.isFinite(hit.location.longitude)) {
    return { name: hit.area, lat: hit.location.latitude, lng: hit.location.longitude };
  }
  // broad zones (accept a few synonyms)
  const zoneAliases = { centre: 'central', 'central area': 'central', 'cbd': 'central', downtown: 'central', 'east coast': 'east', 'far east': 'east', 'far west': 'west' };
  const zk = WEATHER_ZONE_CENTROIDS[q] ? q : (zoneAliases[q] || (q.includes('west') ? 'west' : q.includes('north') ? 'north' : q.includes('south') ? 'south' : q.includes('east') ? 'east' : (q.includes('central') || q.includes('centre')) ? 'central' : null));
  if (zk && WEATHER_ZONE_CENTROIDS[zk]) {
    const c = WEATHER_ZONE_CENTROIDS[zk];
    return { name: c.label, lat: c.lat, lng: c.lng };
  }
  return null;
}

// Per-venue rain caveat string (for open-air picks) — null when the
// outlook is fair. `tnFn` is the i18n tn(key, lang, vars) function;
// pass it in so weather.js stays UI-framework-agnostic.
function rainAlertFor(nowcast, rainfall, lat, lng, lang, tnFn) {
  if (!inSgBounds(lat, lng) || typeof tnFn !== 'function') return null;
  const rainNow = nearestStation(rainfall?.stations, lat, lng);
  const fc = nowcast ? nearestForecast(nowcast.forecasts, lat, lng) : null;
  const areaName = fc?.area || zoneLabelFor(lat, lng);
  if (rainNow && Number.isFinite(Number(rainNow.value)) && Number(rainNow.value) > 0.2) {
    return tnFn('weather.rainNowNear', lang, { area: areaName });
  }
  if (fc && WET_RE.test(String(fc.forecast || ''))) {
    return tnFn('weather.rainSoonNear', lang, { area: areaName, desc: fc.forecast });
  }
  return null;
}

function zoneLabelFor(lat, lng) {
  const k = zoneKeyFor(lat, lng);
  return WEATHER_ZONE_CENTROIDS[k]?.label || 'Singapore';
}

// "Good window to head out?" lead line for the /weather reply. tFn =
// i18n t(key, lang); tnFn = tn(key, lang, vars).
function headOutLine(nowcast, rainfall, lat, lng, lang, tnFn) {
  if (typeof tnFn !== 'function') return null;
  const rainNow = nearestStation(rainfall?.stations, lat, lng);
  const fc = nowcast ? nearestForecast(nowcast.forecasts, lat, lng) : null;
  const areaName = fc?.area || zoneLabelFor(lat, lng);
  if (rainNow && Number.isFinite(Number(rainNow.value)) && Number(rainNow.value) > 0.2) {
    return tnFn('weather.headOutRaining', lang, { area: areaName });
  }
  if (fc && WET_RE.test(String(fc.forecast || ''))) {
    return tnFn('weather.headOutShowery', lang, { area: areaName, desc: fc.forecast });
  }
  if (fc) return tnFn('weather.headOutGood', lang, { area: areaName });
  return null;
}

// One-line "tonight in the {zone}: {forecast}" from the 24-hour
// forecast. Picks the period that covers this evening (SGT 17:00–23:59
// start) when available; else the latest period; else the general
// forecast. Returns null if nothing usable.
function tonightOutlookFor(fc24h, lat, lng, lang, tnFn) {
  if (typeof tnFn !== 'function' || !fc24h) return null;
  const zk = zoneKeyFor(lat, lng);
  const label = WEATHER_ZONE_CENTROIDS[zk]?.label || 'Singapore';
  const periods = Array.isArray(fc24h.periods) ? fc24h.periods : [];
  const sgHour = (iso) => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return Number(new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', hour: '2-digit', hour12: false }).format(d));
  };
  let chosen = periods.find((p) => { const h = sgHour(p.startIso); return h != null && h >= 17 && h <= 23; });
  if (!chosen && periods.length) chosen = periods[periods.length - 1];
  const desc = chosen?.regions?.[zk] || fc24h.general || null;
  if (!desc) return null;
  return tnFn('weather.tonight', lang, { zone: label, desc });
}

// Best-effort: attach `v.rainAlert` to each rain-sensitive venue in
// `venues` (mutates). `isRainSensitive` is the predicate from
// venue-filters; `tnFn` the i18n tn(). Any failure → no alerts, callers
// proceed normally.
async function attachRainAlerts(redis, venues, lang, isRainSensitive, tnFn) {
  try {
    if (!Array.isArray(venues) || !venues.length || typeof isRainSensitive !== 'function') return;
    const candidates = venues.filter((v) => v && Number.isFinite(v.lat) && Number.isFinite(v.lng) && inSgBounds(v.lat, v.lng) && isRainSensitive(v));
    if (!candidates.length) return;
    const [nowcast, rainfall] = await Promise.all([getNowcastCached(redis), getRainfallCached(redis)]);
    if (!nowcast && !rainfall) return;
    for (const v of candidates) {
      const line = rainAlertFor(nowcast, rainfall, v.lat, v.lng, lang, tnFn);
      if (line) v.rainAlert = line;
    }
  } catch (err) {
    console.warn('[Weather] attachRainAlerts failed:', err.message);
  }
}

module.exports = {
  summary, fetchV2Realtime, fetchV1Realtime, fetchRealtime, fetchTwoHourForecast,
  // v0.60.118
  fetch24hForecast, getNowcastCached, getRainfallCached, get24hCached,
  WEATHER_ZONE_CENTROIDS, inSgBounds, zoneKeyFor, zoneLabelFor,
  resolveArea, rainAlertFor, headOutLine, tonightOutlookFor, attachRainAlerts
};
