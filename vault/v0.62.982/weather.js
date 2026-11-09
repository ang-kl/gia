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

// ─────────────────────────────────────────────────────────────────────
// v0.61.380 — GLOBAL weather (operator: the weather feature must follow the
// country expansion — NEA / data.gov.sg covers Singapore ONLY, so a Tokyo
// user got Singapore's reading). The server routes SG coords to NEA
// (authoritative local) and everywhere else to a global source, so the SG
// path is untouched. That global source was Open-Meteo until v0.62.961.
// ─────────────────────────────────────────────────────────────────────
// v0.62.962 — spec doc/Feature/2026-11-01-local-weather-every-city.spec.md, C2, C5, C6. The global source is now
// MET Norway's Locationforecast 2.0 (operator, 01-11 '26: "Yes, MET Norway"), because Open-Meteo's free tier is
// non-commercial and MET's data is NLOD 2.0 and CC BY 4.0, which allows commercial use with the credit the sheet
// shows. MET's terms, read 01-11 '26: identify yourself with a User-Agent (A3: the website, no email), do not cause
// unnecessary traffic (cache, honour Expires), and stay under 20 requests a second. So one request per 0.1° cell,
// cached until Expires and never for less than 30 minutes, shared by the badge and the sheet; a failure is never
// cached. /complete rather than /compact because it adds the clear-sky UV index the sheet shows, labelled as such.
const MET_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/complete';
const MET_USER_AGENT = `Soleat/${(() => { try { return require('./package.json').version; } catch { return '0'; } })()} (+https://soleat.net)`;
const MET_MIN_TTL_S = 1800;

const metCell = (lat, lng) => ({ lat: lat.toFixed(1), lng: lng.toFixed(1) });

// MET's answer reduced to what we use, oldest step first.
function metSeries(json) {
  const ts = json && json.properties && Array.isArray(json.properties.timeseries) ? json.properties.timeseries : null;
  if (!ts || !ts.length) return null;
  return ts.map((s) => {
    const i = (s.data && s.data.instant && s.data.instant.details) || {};
    const n1 = (s.data && s.data.next_1_hours) || null;
    const n6 = (s.data && s.data.next_6_hours) || null;
    const n12 = (s.data && s.data.next_12_hours) || null;
    return {
      t: s.time,
      temp: Number.isFinite(i.air_temperature) ? i.air_temperature : null,
      rh: Number.isFinite(i.relative_humidity) ? i.relative_humidity : null,
      ws: Number.isFinite(i.wind_speed) ? i.wind_speed : null,
      wd: Number.isFinite(i.wind_from_direction) ? i.wind_from_direction : null,
      uv: Number.isFinite(i.ultraviolet_index_clear_sky) ? i.ultraviolet_index_clear_sky : null,
      s1: n1 && n1.summary ? n1.summary.symbol_code : null,
      r1: n1 && n1.details && Number.isFinite(n1.details.precipitation_amount) ? n1.details.precipitation_amount : null,
      s6: n6 && n6.summary ? n6.summary.symbol_code : null,
      mn6: n6 && n6.details && Number.isFinite(n6.details.air_temperature_min) ? n6.details.air_temperature_min : null,
      mx6: n6 && n6.details && Number.isFinite(n6.details.air_temperature_max) ? n6.details.air_temperature_max : null,
      s12: n12 && n12.summary ? n12.summary.symbol_code : null,
    };
  });
}

// fetchMet(lat, lng) → the reduced series, or null. `getFn` is an axios.get-shaped seam; `cache` is the node-redis
// client (get / setEx) or null; `now` is a clock seam.
async function fetchMet(lat, lng, { getFn = axios.get, cache = null, now = Date.now } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return null;
  const cell = metCell(lat, lng);
  const key = `met:v1:${cell.lat}:${cell.lng}`;
  if (cache) {
    try { const hit = await cache.get(key); if (hit) return JSON.parse(hit); } catch { /* fetch instead */ }
  }
  let res;
  try {
    res = await getFn(`${MET_URL}?lat=${cell.lat}&lon=${cell.lng}`, { timeout: 8000, headers: { 'User-Agent': MET_USER_AGENT } });
  } catch {
    return null;
  }
  const series = metSeries(res && res.data);
  if (!series) return null;
  const out = { series };
  if (cache) {
    const exp = Date.parse(res.headers && (res.headers.expires || res.headers.Expires));
    const ttl = Number.isFinite(exp) ? Math.max(MET_MIN_TTL_S, Math.ceil((exp - now()) / 1000)) : MET_MIN_TTL_S;
    try { await cache.setEx(key, ttl, JSON.stringify(out)); } catch { /* served uncached this time */ }
  }
  return out;
}

// MET symbol → one of the existing condition classes (outside-now-i18n.js OUTLOOK_CLASSES), most specific first.
// v0.62.963 — Amendment 2 (A9, operator: "Snow and Sleet"): snow and sleet have their own classes, `wx.snow` and
// `wx.sleet`, used by the abroad sheet only; NEA's OUTLOOK_CLASSES is unchanged. Thunder still wins, so MET's 12
// "…andthunder" snow and sleet symbols stay "thunder". Checked against all 40 IDs in MET's published legend.
function metSymbolClass(sym) {
  const s = String(sym || '');
  if (!s) return null;
  if (/thunder/.test(s)) return 'thunder';
  if (/sleet/.test(s)) return 'sleet';
  if (/snow/.test(s)) return 'snow';
  if (/showers/.test(s)) return 'showers';
  if (/rain/.test(s)) return 'rain';
  if (/fog/.test(s)) return 'haze';
  if (/^partlycloudy/.test(s)) return 'partlyCloudy';
  if (/^cloudy/.test(s)) return 'cloudy';
  if (/^(fair|clearsky)/.test(s)) return 'fair';
  return null;
}

function metSymbolEmoji(sym) {
  const s = String(sym || '');
  if (/thunder/.test(s)) return '⛈️';
  if (/snow|sleet/.test(s)) return '🌨️';
  if (/showers/.test(s)) return '🌦️';
  if (/rain/.test(s)) return '🌧️';
  if (/fog/.test(s)) return '🌫️';
  if (/^partlycloudy/.test(s)) return '⛅';
  if (/^cloudy/.test(s)) return '☁️';
  if (/^clearsky_night|^fair_night/.test(s)) return '🌙';
  if (/^clearsky/.test(s)) return '☀️';
  if (/^fair/.test(s)) return '🌤️';
  return '🌡️';
}

// The English condition text the badge's title and outlookLabel() read; outlookLabel maps it back to the class.
const CLASS_TEXT = { thunder: 'Thundery showers', showers: 'Showers', rain: 'Rain', haze: 'Fog', partlyCloudy: 'Partly cloudy', cloudy: 'Cloudy', fair: 'Fair', snow: 'Snow', sleet: 'Sleet' };
function metConditionText(sym) {
  const c = metSymbolClass(sym);
  return c ? CLASS_TEXT[c] : null;
}

// The step for "now": the latest one not after now, or the first if MET starts in the future.
function stepForNow(series, now) {
  let pick = series[0];
  for (const s of series) { if (Date.parse(s.t) <= now) pick = s; else break; }
  return pick;
}

// C6 — each city's own zone. One per country, except Australia and Indonesia, which span several; China keeps one
// official zone for all 14 cities. A point near no city falls back to its longitude's hour band.
const COUNTRY_TZ = {
  SG: 'Asia/Singapore', MY: 'Asia/Kuala_Lumpur', CN: 'Asia/Shanghai', ID: 'Asia/Jakarta', FR: 'Europe/Paris',
  AU: 'Australia/Sydney', JP: 'Asia/Tokyo', TH: 'Asia/Bangkok', VN: 'Asia/Ho_Chi_Minh', PH: 'Asia/Manila',
  NZ: 'Pacific/Auckland', HK: 'Asia/Hong_Kong', KH: 'Asia/Phnom_Penh', KR: 'Asia/Seoul', TW: 'Asia/Taipei',
  LA: 'Asia/Vientiane', MM: 'Asia/Yangon', BN: 'Asia/Brunei', MO: 'Asia/Macau',
};
const CITY_TZ = {
  Melbourne: 'Australia/Melbourne', Hobart: 'Australia/Hobart', Perth: 'Australia/Perth', Adelaide: 'Australia/Adelaide',
  Darwin: 'Australia/Darwin', Brisbane: 'Australia/Brisbane', 'Gold Coast': 'Australia/Brisbane',
  'Sunshine Coast': 'Australia/Brisbane', Cairns: 'Australia/Brisbane', Denpasar: 'Asia/Makassar',
};
function _distKm(a, b) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
// Every city Cuisine's picker offers (web/cuisine/src/v2/lib/cities.js, 284 points, coordinates to 0.01°), keyed by
// country code, with a per-city zone where the country has several. Copied here because the server cannot import
// that ES module on Node 20; `weather-abroad.test.js` reads the picker list itself and fails if any city there
// resolves to the wrong zone, so a city added to the picker without one here is caught. Measured on 01-11 '26:
// with only the 152 server-side centroids, 123 of these 284 fell back to a longitude band, which put mainland
// Malaysia at UTC+7, Kashgar at UTC+5 and Newcastle NSW without daylight saving.
const TZ_POINTS = {
  'MY': [3.14,101.69,3.15,101.71,3.1,101.74,3.15,101.76,5.28,115.23,2.93,101.7,1.49,103.74,1.85,102.93,2.04,102.57,2.03,103.32,2.51,102.82,1.93,103.34,6.12,100.37,5.65,100.49,6.35,99.8,5.37,100.56,6.13,102.24,6.05,102.14,5.81,102.15,4.88,101.97,2.19,102.25,2.38,102.21,2.31,102.44,2.73,101.94,2.52,101.8,2.81,101.8,2.81,102.42,3.81,103.33,3.45,102.42,3.52,101.91,4.47,101.38,3.42,101.79,5.41,100.33,5.4,100.36,5.36,100.47,5.29,100.27,4.6,101.09,4.85,100.73,4.02,101.02,4.21,100.7,4.31,101.15,6.44,100.2,6.43,100.27,5.98,116.08,5.84,118.12,4.24,117.89,5.03,118.34,5.34,116.16,1.55,110.36,2.29,111.83,4.4,113.99,3.17,113.04,4.75,115,3.07,101.52,3.11,101.61,3.06,101.59,3.04,101.45,2.99,101.79,5.33,103.14,4.76,103.42,4.23,103.42,5.21,103.21],
  'ID': [-6.21,106.85,-7.26,112.75,-6.92,107.62,3.6,98.67,-6.97,110.42,-7.8,110.37],
  'ID|Asia/Makassar': [-5.15,119.43,-8.67,115.21],
  'TH': [13.76,100.5,13.86,100.51,18.79,98.99,14.98,102.1,17.41,102.79,16.44,102.84,14.02,100.53,9.14,99.32,15.24,104.85,13.82,100.06,13.55,100.27,13.36,100.98,12.92,100.88,7.88,98.39,12.57,99.96,8.09,98.91,14.37,100.59,9.51,100.01,8.45,98.53],
  'VN': [21.03,105.85,10.82,106.63,16.05,108.2,16.46,107.59,12.24,109.2,11.94,108.46,15.88,108.34,10.23,103.96],
  'PH': [14.6,120.98,10.32,123.89,7.19,125.46,16.4,120.6,10.72,122.56,14.11,120.96,14.48,120.9,11.97,121.92,9.74,118.74],
  'BN': [4.9,114.94,4.58,114.22,4.61,114.33,4.8,114.65,5.04,115.06,4.7,115.07],
  'AU|Australia/Sydney': [-35.28,149.13,-33.87,151.21,-32.93,151.78,-34.43,150.89,-30.3,153.11,-28.87,153.57],
  'AU|Australia/Melbourne': [-37.81,144.96,-38.15,144.36,-36.76,144.28,-34.19,142.16,-38.38,142.49],
  'AU|Australia/Brisbane': [-27.47,153.03,-28.02,153.4,-26.65,153.09,-16.92,145.78,-19.26,146.82],
  'AU|Australia/Adelaide': [-34.93,138.6,-37.83,140.78,-34.73,135.86,-33.03,137.57,-35.66,137.64],
  'AU|Australia/Perth': [-31.95,115.86,-17.96,122.24,-30.75,121.47,-28.78,114.62,-20.74,116.85],
  'AU|Australia/Hobart': [-42.88,147.33,-41.43,147.14,-41.18,146.35,-41.06,145.9],
  'AU|Australia/Darwin': [-12.46,130.85,-23.7,133.88,-25.24,130.99],
  'NZ': [-41.29,174.78,-36.85,174.76,-43.53,172.64,-37.79,175.28,-45.88,170.5,-39.49,176.91,-45.03,168.66,-38.14,176.25],
  'JP': [35.68,139.65,35.44,139.64,34.69,135.5,35.01,135.77,33.59,130.4,43.06,141.35,34.39,132.46,34.69,135.8],
  'KR': [37.57,126.98,35.18,129.08,37.46,126.71,35.87,128.6,36.35,127.38,35.16,126.85,33.5,126.53,35.86,129.22],
  'CN': [39.9,116.41,39.92,116.44,39.96,116.3,39.93,116.42,23.13,113.26,22.54,114.06,23.04,113.76,23.02,113.12,22.27,113.58,31.23,121.47,31.22,121.54,31.19,121.44,31.23,121.45,30.27,120.16,29.87,121.54,27.99,120.7,28.66,121.42,30.75,120.75,32.06,118.8,31.3,120.59,31.49,120.31,32.39,119.41,31.8,119.97,30.57,104.07,31.47,104.68,29.55,103.77,28.75,104.63,31.82,117.23,31.35,118.37,29.43,106.91,30.81,108.38,26.07,119.3,24.48,118.09,24.87,118.68,36.06,103.83,34.58,105.72,22.82,108.37,25.27,110.29,26.65,106.63,27.71,106.93,20.04,110.2,18.25,109.51,38.04,114.51,39.64,118.18,45.8,126.53,47.35,123.92,34.75,113.63,34.62,112.45,30.59,114.31,30.69,111.29,28.23,112.94,27.83,113.13,40.84,111.75,40.66,109.84,28.68,115.86,29.71,116,43.82,125.32,43.84,126.55,41.81,123.43,38.91,121.61,38.49,106.23,39.02,106.38,36.62,101.78,36.41,94.9,34.34,108.94,36.59,109.49,36.65,117.12,36.07,120.38,37.87,112.55,40.08,113.3,39.34,117.36,39,117.7,29.65,91.17,29.27,88.88,43.83,87.62,39.47,75.99,25.04,102.72,26.87,100.23],
  'HK': [22.32,114.17,22.39,114.19,22.39,113.97,22.44,114.02,22.31,114.26,22.45,114.16,22.29,113.94,22.3,114.17,22.28,114.18,22.28,114.17,22.28,114.16,22.25,114.16],
  'MO': [22.2,113.54],
  'TW': [25.03,121.57,25.02,121.46,22.63,120.3,24.15,120.67,23,120.23,24.81,120.97,25.13,121.74,25.11,121.84,23.86,120.92],
  'FR': [48.86,2.35,45.76,4.84,43.3,5.37,43.71,7.26,44.84,-0.58,43.6,1.44,48.57,7.75,47.22,-1.55,43.61,3.88,50.63,3.06,48.12,-1.68,49.26,4.03],
};
// How far the nearest known city may be. 300 km covers every picker city's surroundings; beyond it (open sea, the
// outback) the zone falls back to the longitude's hour band, which ignores daylight saving.
const TZ_REACH_KM = 300;

let _tzIndex = null;
function tzIndex() {
  if (_tzIndex) return _tzIndex;
  const { CITY_CENTROIDS } = require('./city-centroids.js');
  const idx = [];
  for (const [city, c] of Object.entries(CITY_CENTROIDS)) idx.push({ lat: c.lat, lng: c.lng, tz: CITY_TZ[city] || COUNTRY_TZ[c.country] || null });
  for (const [key, flat] of Object.entries(TZ_POINTS)) {
    const [cc, zone] = key.split('|');
    for (let i = 0; i < flat.length; i += 2) idx.push({ lat: flat[i], lng: flat[i + 1], tz: zone || COUNTRY_TZ[cc] || null });
  }
  _tzIndex = idx.filter((p) => p.tz);
  return _tzIndex;
}

function tzForPoint(lat, lng) {
  let best = null;
  for (const p of tzIndex()) {
    const d = _distKm({ lat, lng }, p);
    if (d <= TZ_REACH_KM && (!best || d < best.d)) best = { d, tz: p.tz };
  }
  if (best) return best.tz;
  const h = Math.round(lng / 15);
  return h === 0 ? 'UTC' : `Etc/GMT${h > 0 ? '-' : '+'}${Math.abs(h)}`;
}

function localDate(iso, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}
function localHours(iso, tz) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(iso));
  const g = (t) => Number((p.find((x) => x.type === t) || {}).value);
  return g('hour') + g('minute') / 60;
}

// C3 / I6 — the next four days in the city's own zone, from tomorrow: low and high from every step on that date
// (its instant temperature and its 6-hour min and max), and the condition of the step nearest local noon (the
// earlier on a tie).
function daysFromSeries(series, tz, now) {
  const today = localDate(new Date(now).toISOString(), tz);
  const byDate = new Map();
  for (const s of series) {
    const d = localDate(s.t, tz);
    if (d <= today) continue;
    if (!byDate.has(d)) byDate.set(d, { temps: [], best: null });
    const e = byDate.get(d);
    for (const v of [s.temp, s.mn6, s.mx6]) if (Number.isFinite(v)) e.temps.push(v);
    const sym = s.s1 || s.s6 || s.s12;
    if (sym) {
      const dist = Math.abs(localHours(s.t, tz) - 12);
      if (!e.best || dist < e.best.dist) e.best = { dist, sym };
    }
  }
  return [...byDate.keys()].sort().slice(0, 4).map((date) => {
    const e = byDate.get(date);
    const sym = e.best ? e.best.sym : null;
    return {
      date,
      lowC: e.temps.length ? Math.round(Math.min(...e.temps)) : null,
      highC: e.temps.length ? Math.round(Math.max(...e.temps)) : null,
      cls: metSymbolClass(sym),
      emoji: metSymbolEmoji(sym),
    };
  });
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const compass8 = (deg) => (Number.isFinite(deg) ? COMPASS[Math.round((((deg % 360) + 360) % 360) / 45) % 8] : null);

// summaryGlobal(lat,lng) → the same shape /api/weather/summary emits, from MET (any coords on Earth). null when
// unreachable, so the badge hides.
async function summaryGlobal(lat, lng, opts = {}) {
  const m = await fetchMet(lat, lng, opts);
  if (!m) return null;
  const s = stepForNow(m.series, (opts.now || Date.now)());
  if (!s || !Number.isFinite(s.temp)) return null;
  const sym = s.s1 || s.s6 || s.s12;
  return { tempC: s.temp, humidityPct: s.rh, condition: metConditionText(sym), emoji: metSymbolEmoji(sym), source: 'met-norway' };
}

// C5 — GET /api/weather/abroad. Singapore answers { ok, inSg: true } and the apps keep NEA's sheet. `jma` is
// jma-warnings' warningsForPoint (null outside Japan's cities).
async function abroadForPoint(lat, lng, { getFn = axios.get, cache = null, now = Date.now, jma = null } = {}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { ok: false };
  if (inSgBounds(lat, lng)) return { ok: true, inSg: true };
  const m = await fetchMet(lat, lng, { getFn, cache, now });
  if (!m) return { ok: false };
  const t = now();
  const s = stepForNow(m.series, t);
  if (!s || !Number.isFinite(s.temp)) return { ok: false };
  const tz = tzForPoint(lat, lng);
  const sym = s.s1 || s.s6 || s.s12;
  let warnings = null;
  if (jma) { try { warnings = await jma(lat, lng); } catch { warnings = null; } }
  return {
    ok: true,
    inSg: false,
    tz,
    at: s.t,
    now: {
      tempC: Math.round(s.temp * 10) / 10,
      humidityPct: Number.isFinite(s.rh) ? Math.round(s.rh) : null,
      windKmh: Number.isFinite(s.ws) ? Math.round(s.ws * 3.6) : null,
      windFrom: compass8(s.wd),
      cls: metSymbolClass(sym),
      emoji: metSymbolEmoji(sym),
    },
    rainNextHourMm: Number.isFinite(s.r1) ? s.r1 : null,
    uvClearSky: Number.isFinite(s.uv) ? Math.round(s.uv) : null,
    days: daysFromSeries(m.series, tz, t),
    jma: warnings || null,
  };
}

module.exports = {
  summary, fetchV2Realtime, fetchV1Realtime, fetchRealtime, fetchTwoHourForecast,
  // v0.60.118
  fetch24hForecast, getNowcastCached, getRainfallCached, get24hCached,
  WEATHER_ZONE_CENTROIDS, inSgBounds, zoneKeyFor, zoneLabelFor,
  resolveArea, rainAlertFor, headOutLine, tonightOutlookFor, attachRainAlerts,
  // v0.61.380 — global; v0.62.962 — from MET Norway
  summaryGlobal, fetchMet, metSeries, metSymbolClass, metSymbolEmoji, tzForPoint, daysFromSeries, abroadForPoint,
  MET_URL, MET_USER_AGENT, MET_MIN_TTL_S
};
