// transport.js — LTA DataMall bus stops + bus arrivals.
//
// Bus stops list (~5500 entries) is cached at boot in a Redis geo
// set so /transport can run a fast GEOSEARCH. Refreshes every 24h.
//
// Bus arrivals are real-time per request (LTA throttles to ~30/min
// per key — single-user scale is fine).

const axios = require('axios');

// v0.60.68 — LTA DataMall API User Guide v6.8 (21 Apr 2026) renamed
// BusArrivalv2 → v3/BusArrival. The old URL now returns 404 "The
// requested API was not found" (per probe by Human Lead 2026-05-10),
// which is why every /b lookup was rendering "no real-time arrivals"
// for every stop. BusStops catalogue endpoint is unchanged.
const LTA_BASE = 'https://datamall2.mytransport.sg/ltaodataservice';
const BUS_STOPS_URL = `${LTA_BASE}/BusStops`;
const BUS_ARRIVAL_URL = `${LTA_BASE}/v3/BusArrival`;
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

// v0.60.71 — empty Load → no label. Previously the empty-string key
// mapped to '?' which rendered as a literal "№ 273 — ≤5 min · ?"
// for unmonitored services / NextBus2 / NextBus3 (LTA frequently
// returns blank Load there). Drop the '' entry; the fallback chain
// in arrivalToObject() now resolves to '' so the chat + map popup
// both omit the load suffix entirely when no info is available.
const LOAD_LABEL = { SEA: 'seats', SDA: 'standing', LSD: 'limited' };

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
    loadLabel: LOAD_LABEL[b.Load] || b.Load || '',
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

// v0.56.1: SG MRT station NAME → CODES lookup table for the top ~50
// stations Singaporeans actually use. Each entry maps the canonical
// name (lowercase, suffix-stripped) to one or more LTA station codes.
// For interchange stations we list all codes; the crowd lookup picks
// the worst level across them.
const STATION_NAME_TO_CODES = {
  // EWL spine
  'pasir ris': ['EW1'], 'tampines': ['EW2', 'DT32'], 'simei': ['EW3'], 'tanah merah': ['EW4'],
  'bedok': ['EW5'], 'kembangan': ['EW6'], 'eunos': ['EW7'], 'paya lebar': ['EW8', 'CC9'],
  'aljunied': ['EW9'], 'kallang': ['EW10'], 'lavender': ['EW11'], 'bugis': ['EW12', 'DT14'],
  'city hall': ['EW13', 'NS25'], 'raffles place': ['EW14', 'NS26'], 'tanjong pagar': ['EW15'],
  'outram park': ['EW16', 'NE3', 'TE17'], 'tiong bahru': ['EW17'], 'redhill': ['EW18'],
  'queenstown': ['EW19'], 'commonwealth': ['EW20'], 'buona vista': ['EW21', 'CC22'],
  'dover': ['EW22'], 'clementi': ['EW23'], 'jurong east': ['EW24', 'NS1'],
  'chinese garden': ['EW25'], 'lakeside': ['EW26'], 'boon lay': ['EW27'], 'pioneer': ['EW28'],
  'joo koon': ['EW29'], 'gul circle': ['EW30'], 'tuas crescent': ['EW31'],
  'tuas west road': ['EW32'], 'tuas link': ['EW33'],
  // CGL (Changi)
  'expo': ['CG1', 'DT35'], 'changi airport': ['CG2'],
  // NSL spine (north of Jurong East)
  'bukit batok': ['NS2'], 'bukit gombak': ['NS3'], 'choa chu kang': ['NS4', 'BP1'],
  'yew tee': ['NS5'], 'kranji': ['NS7'], 'marsiling': ['NS8'], 'woodlands': ['NS9', 'TE2'],
  'admiralty': ['NS10'], 'sembawang': ['NS11'], 'canberra': ['NS12'], 'yishun': ['NS13'],
  'khatib': ['NS14'], 'yio chu kang': ['NS15'], 'ang mo kio': ['NS16'], 'bishan': ['NS17', 'CC15'],
  'braddell': ['NS18'], 'toa payoh': ['NS19'], 'novena': ['NS20'], 'newton': ['NS21', 'DT11'],
  'orchard': ['NS22', 'TE14'], 'somerset': ['NS23'], 'dhoby ghaut': ['NS24', 'NE6', 'CC1'],
  'marina bay': ['NS27', 'CE2', 'TE20'], 'marina south pier': ['NS28'],
  // NEL
  'harbourfront': ['NE1', 'CC29'], 'outram': ['NE3', 'EW16', 'TE17'],
  'chinatown': ['NE4', 'DT19'], 'clarke quay': ['NE5'], 'little india': ['NE7', 'DT12'],
  'farrer park': ['NE8'], 'boon keng': ['NE9'], 'potong pasir': ['NE10'], 'woodleigh': ['NE11'],
  'serangoon': ['NE12', 'CC13'], 'kovan': ['NE13'], 'hougang': ['NE14'],
  'buangkok': ['NE15'], 'sengkang': ['NE16', 'STC'], 'punggol': ['NE17', 'PTC'],
  // CCL
  'bras basah': ['CC2'], 'esplanade': ['CC3'], 'promenade': ['CC4', 'DT15'],
  'nicoll highway': ['CC5'], 'stadium': ['CC6'], 'mountbatten': ['CC7'],
  'dakota': ['CC8'], 'macpherson': ['CC10', 'DT26'], 'tai seng': ['CC11'], 'bartley': ['CC12'],
  'lorong chuan': ['CC14'], 'marymount': ['CC16'], 'caldecott': ['CC17', 'TE9'],
  'botanic gardens': ['CC19', 'DT9'], 'farrer road': ['CC20'], 'holland village': ['CC21'],
  'one-north': ['CC23'], 'kent ridge': ['CC24'], 'haw par villa': ['CC25'],
  'pasir panjang': ['CC26'], 'labrador park': ['CC27'], 'telok blangah': ['CC28'],
  // DTL
  'bukit panjang': ['DT1', 'BP6'], 'cashew': ['DT2'], 'hillview': ['DT3'],
  'beauty world': ['DT5'], 'king albert park': ['DT6'], 'sixth avenue': ['DT7'],
  'tan kah kee': ['DT8'], 'stevens': ['DT10', 'TE11'], 'rochor': ['DT13'],
  'downtown': ['DT17'], 'telok ayer': ['DT18'], 'fort canning': ['DT20'],
  'bencoolen': ['DT21'], 'jalan besar': ['DT22'], 'bendemeer': ['DT23'],
  'geylang bahru': ['DT24'], 'mattar': ['DT25'], 'ubi': ['DT27'], 'kaki bukit': ['DT28'],
  'bedok north': ['DT29'], 'bedok reservoir': ['DT30'], 'tampines west': ['DT31'],
  'tampines east': ['DT33'], 'upper changi': ['DT34'],
  // TEL
  'woodlands north': ['TE1'], 'woodlands south': ['TE3'], 'springleaf': ['TE4'],
  'lentor': ['TE5'], 'mayflower': ['TE6'], 'bright hill': ['TE7'], 'upper thomson': ['TE8'],
  'mount pleasant': ['TE10'], 'napier': ['TE12'], 'orchard boulevard': ['TE13'],
  'great world': ['TE15'], 'havelock': ['TE16'], 'maxwell': ['TE18'], 'shenton way': ['TE19'],
  'gardens by the bay': ['TE22'], 'tanjong rhu': ['TE23'], 'katong park': ['TE24'],
  'tanjong katong': ['TE25'], 'marine parade': ['TE26'], 'marine terrace': ['TE27'],
  'siglap': ['TE28'], 'bayshore': ['TE29']
};

function normaliseStationName(name) {
  return String(name || '')
    .replace(/\s+(MRT|LRT)\s+Station\s*$/i, '')
    .replace(/\s+Station\s*$/i, '')
    .replace(/\s+\(.*?\)\s*$/, '')
    .trim()
    .toLowerCase();
}

// v0.56.1: returns the WORST crowd level across all matching codes
// (e.g. interchange Bishan = NS17 + CC15 → if either is high, return h).
// Returns one of 'l' / 'm' / 'h' / null.
function lookupCrowdForPlace(crowdByCode, placeName) {
  if (!placeName || !crowdByCode) return null;
  const norm = normaliseStationName(placeName);
  const codes = STATION_NAME_TO_CODES[norm];
  if (!codes?.length) return null;
  let worst = null;
  const order = { l: 1, m: 2, h: 3 };
  for (const code of codes) {
    const lvl = crowdByCode.get(code);
    if (!lvl) continue;
    if (!worst || order[lvl] > order[worst]) worst = lvl;
  }
  return worst;
}

// v0.56.1: rough wait-time approximation in MINUTES based on
// SGT clock. Singapore MRT actual headways:
//   Peak (Mon-Fri 07-09 AM, 17-19 PM): 2-3 min
//   Off-peak day: 4-6 min
//   Late evening (after 22:00): 5-8 min
function estimateWaitMinutes(now = new Date()) {
  const sgt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = sgt.getUTCDay(); // 0=Sun..6=Sat
  const hour = sgt.getUTCHours();
  const isWeekday = day >= 1 && day <= 5;
  if (isWeekday && ((hour >= 7 && hour < 9) || (hour >= 17 && hour < 19))) {
    return { min: 2, max: 3, label: 'peak' };
  }
  if (hour >= 22 || hour < 6) {
    return { min: 5, max: 8, label: 'late' };
  }
  return { min: 4, max: 6, label: 'off-peak' };
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

// v0.60.72 — LTA's two dedicated SG ⟷ JB checkpoint endpoints.
// Each returns one or two CCTV stills (CameraID + ImageLink + lat/lng).
// Used by /causeway to surface live border-crossing congestion.
const WOODLANDS_TRAFFIC_URL = `${LTA_BASE}/WoodlandsTraffic`;
const SECOND_LINK_TRAFFIC_URL = `${LTA_BASE}/2ndLinkTraffic`;

async function fetchCheckpointTraffic() {
  if (!process.env.LTA_ACCOUNT_KEY) return [];
  const sources = [
    { url: WOODLANDS_TRAFFIC_URL,   label: 'Woodlands Causeway' },
    { url: SECOND_LINK_TRAFFIC_URL, label: 'Tuas 2nd Link' }
  ];
  const out = [];
  await Promise.all(sources.map(async ({ url, label }) => {
    try {
      const { data } = await axios.get(url, { headers: authHeaders(), timeout: 6000 });
      const rows = data?.value ?? [];
      for (const r of rows) {
        if (!r.ImageLink) continue;
        out.push({
          label,
          cameraId: String(r.CameraID || ''),
          imageUrl: String(r.ImageLink),
          lat: Number(r.Latitude),
          lng: Number(r.Longitude)
        });
      }
    } catch (err) {
      console.error(`[Transport] checkpoint ${label} fetch failed:`, err.message);
    }
  }));
  return out;
}

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
  estimateWaitMinutes,
  STATION_NAME_TO_CODES,
  lookupCrowdForPlace,
  networkCrowdSummary,
  fetchTrafficIncidents,
  fetchCheckpointTraffic,
  nearestIncidents,
  CROWD_LABEL,
  STOPS_GEO,
  STOPS_HASH_PREFIX,
  haversineM
};
