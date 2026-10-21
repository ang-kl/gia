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

module.exports = { summary, fetchV2Realtime, fetchV1Realtime, fetchRealtime, fetchTwoHourForecast };
