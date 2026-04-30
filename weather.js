// weather.js — NEA real-time weather + 2-hour forecast.
//
// v2 real-time API (api-open.data.gov.sg/v2/real-time/api) provides
// air-temperature, rainfall, relative-humidity, wind-direction,
// wind-speed. v2 specs are in data/gov_sg/.
//
// v1 environment API (api.data.gov.sg/v1/environment) still hosts
// the 2-hour weather forecast; kept for that one call.
//
// Both honour the optional DATA_GOV_SG_API_KEY env via x-api-key
// header (higher rate limits per v2 docs).

const axios = require('axios');

const V2_REALTIME = 'https://api-open.data.gov.sg/v2/real-time/api';
const V1_FORECAST_2HR = 'https://api.data.gov.sg/v1/environment/2-hour-weather-forecast';

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

// Generic v2 real-time fetcher. Returns:
//   { unit, readingType, timestamp, stations: [{id, name, lat, lng, value}] }
async function fetchV2Realtime(endpointPath) {
  const url = `${V2_REALTIME}${endpointPath}`;
  const { data } = await axios.get(url, { timeout: 6000, headers: authHeaders() });
  if (data?.code !== 0 && data?.code !== undefined) {
    throw new Error(data?.errorMsg || `non-zero code ${data?.code}`);
  }
  const stations = (data?.data?.stations ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    lat: s.labelLocation?.latitude ?? null,
    lng: s.labelLocation?.longitude ?? null
  }));
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const reading = data?.data?.readings?.[0]; // latest snapshot
  const items = (reading?.data ?? [])
    .map((r) => {
      const s = stationById.get(r.stationId);
      if (!s || !Number.isFinite(s.lat) || !Number.isFinite(s.lng)) return null;
      return { ...s, value: r.value };
    })
    .filter(Boolean);
  return {
    unit: data?.data?.readingUnit ?? '',
    readingType: data?.data?.readingType ?? '',
    timestamp: reading?.timestamp ?? null,
    stations: items
  };
}

async function fetchTwoHourForecast() {
  // v1 still hosts this one; v2 spec not yet available.
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
    fetchV2Realtime('/air-temperature'),
    fetchV2Realtime('/rainfall'),
    fetchV2Realtime('/relative-humidity'),
    fetchV2Realtime('/wind-direction'),
    fetchV2Realtime('/wind-speed'),
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
    rainStationName: rain?.name ?? null,
    rainMm: rain?.value ?? null,
    humidityStationName: humidity?.name ?? null,
    humidityPct: humidity?.value ?? null,
    windDirDeg: windDir?.value ?? null,
    windSpdKt: windSpd?.value ?? null,
    timestamp: ok(tempRes)?.timestamp ?? null
  };
}

module.exports = { summary, fetchV2Realtime, fetchTwoHourForecast };
