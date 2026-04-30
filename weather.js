// weather.js — NEA 2-hour weather forecast for Singapore via api.data.gov.sg.
// No API key required. Free public sovereign-Singapore endpoint.

const axios = require('axios');

const NEA_2HR = 'https://api.data.gov.sg/v1/environment/2-hour-weather-forecast';
const NEA_AIR_TEMP = 'https://api.data.gov.sg/v1/environment/air-temperature';

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

async function fetchTwoHourForecast() {
  const { data } = await axios.get(NEA_2HR, { timeout: 6000 });
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

async function fetchAirTemp() {
  const { data } = await axios.get(NEA_AIR_TEMP, { timeout: 6000 });
  const item = data?.items?.[0];
  if (!item) return null;
  const stations = data?.metadata?.stations ?? [];
  const stationById = new Map(stations.map((s) => [s.id, s]));
  const readings = (item.readings ?? []).map((r) => {
    const s = stationById.get(r.station_id);
    return {
      stationId: r.station_id,
      stationName: s?.name ?? r.station_id,
      lat: s?.location?.latitude ?? null,
      lng: s?.location?.longitude ?? null,
      tempC: r.value
    };
  }).filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
  return { timestamp: item.timestamp, readings };
}

function nearestForecast(forecasts, lat, lng) {
  if (!Array.isArray(forecasts) || !forecasts.length) return null;
  let best = null;
  for (const f of forecasts) {
    if (!f.location || !Number.isFinite(f.location.latitude) || !Number.isFinite(f.location.longitude)) continue;
    const d = haversineKm({ lat, lng }, { lat: f.location.latitude, lng: f.location.longitude });
    if (!best || d < best.distanceKm) best = { ...f, distanceKm: d };
  }
  return best || forecasts[0]; // any forecast is better than none
}

function nearestStation(readings, lat, lng) {
  if (!Array.isArray(readings) || !readings.length) return null;
  let best = null;
  for (const r of readings) {
    const d = haversineKm({ lat, lng }, { lat: r.lat, lng: r.lng });
    if (!best || d < best.distanceKm) best = { ...r, distanceKm: d };
  }
  return best;
}

async function summary(lat, lng) {
  const [forecast, temp] = await Promise.all([
    fetchTwoHourForecast().catch((e) => { console.error('[Weather] 2hr forecast failed:', e.message); return null; }),
    fetchAirTemp().catch((e) => { console.error('[Weather] air temp failed:', e.message); return null; })
  ]);
  const fc = forecast ? nearestForecast(forecast.forecasts, lat, lng) : null;
  const ts = temp ? nearestStation(temp.readings, lat, lng) : null;
  return {
    forecastArea: fc?.area ?? null,
    forecast: fc?.forecast ?? null,
    forecastValidTo: forecast?.validTo ?? null,
    tempStationName: ts?.stationName ?? null,
    tempC: ts?.tempC ?? null,
    tempTimestamp: temp?.timestamp ?? null
  };
}

module.exports = { summary, fetchTwoHourForecast, fetchAirTemp };
