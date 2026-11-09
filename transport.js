// transport.js — LTA DataMall bus stops + bus arrivals.
//
// Bus stops list (~5500 entries) is cached at boot in a Redis geo
// set so /transport can run a fast GEOSEARCH. Refreshes every 24h.
//
// Bus arrivals are real-time per request (LTA throttles to ~30/min
// per key — single-user scale is fine).

const axios = require('axios');
const { expandSgAbbrev } = require('./sg-address');

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
      description: expandSgAbbrev(meta?.description || ''),
      roadName: expandSgAbbrev(meta?.roadName || ''),
      lat: coord ? Number(coord[1]) : null,
      lng: coord ? Number(coord[0]) : null,
      distanceM: Number.isFinite(distance) ? Math.round(distance) : null
    });
  }
  return out;
}

// v0.61.42 — every cached bus stop (~5500), for the TMA Bus Stop overlay
// layer. One GEOSEARCH over a Singapore-wide radius, then a batched
// hash read for each stop's description / road name. The caller caches
// the result (the bus-stop catalogue rarely changes).
async function allStops(redis) {
  if (!redis.isOpen) await redis.connect();
  let hits;
  try {
    hits = await redis.sendCommand([
      'GEOSEARCH', STOPS_GEO,
      'FROMLONLAT', '103.8198', '1.3521',
      'BYRADIUS', '40000', 'm',
      'ASC', 'WITHCOORD',
      'COUNT', '8000'
    ]);
  } catch (err) {
    console.error('[Transport] GEOSEARCH all busstops failed:', err.message);
    return [];
  }
  if (!Array.isArray(hits) || !hits.length) return [];
  const metas = await Promise.all(hits.map((row) =>
    redis.hGetAll(`${STOPS_HASH_PREFIX}${Array.isArray(row) ? row[0] : row}`).catch(() => ({}))
  ));
  const out = [];
  hits.forEach((row, i) => {
    const code = Array.isArray(row) ? row[0] : row;
    const coord = Array.isArray(row) && Array.isArray(row[1]) ? row[1] : null;
    if (!coord) return;
    const meta = metas[i] || {};
    out.push({
      code,
      description: expandSgAbbrev(meta.description || ''),
      roadName: expandSgAbbrev(meta.roadName || ''),
      lat: Number(coord[1]),
      lng: Number(coord[0])
    });
  });
  return out;
}

// v0.60.71 — empty Load → no label. Previously the empty-string key
// mapped to '?' which rendered as a literal "№ 273 — ≤5 min · ?"
// for unmonitored services / NextBus2 / NextBus3 (LTA frequently
// returns blank Load there). Drop the '' entry; the fallback chain
// in arrivalToObject() now resolves to '' so the chat + map popup
// both omit the load suffix entirely when no info is available.
const LOAD_LABEL = { SEA: 'seats', SDA: 'standing', LSD: 'limited' };

// v0.62.969 — spec 2026-11-03-station-and-stop-tap-animations-train-tma, C7: at most 12 LTA arrival requests in
// flight across the process, so a stop with many services queues its route sampling instead of firing ~150 calls in
// one burst. Every busArrivals call goes through it (the chat's arrivals too), which changes nothing for one call.
const LTA_MAX_IN_FLIGHT = 12;
let ltaInFlight = 0;
const ltaQueue = [];
function ltaSlot() {
  if (ltaInFlight < LTA_MAX_IN_FLIGHT) { ltaInFlight++; return Promise.resolve(); }
  return new Promise((resolve) => ltaQueue.push(resolve));
}
function ltaRelease() {
  const next = ltaQueue.shift();
  if (next) next(); else ltaInFlight--;
}

async function busArrivals(busStopCode, { http = axios } = {}) {
  if (!process.env.LTA_ACCOUNT_KEY) return [];
  await ltaSlot();
  try {
    const { data } = await http.get(BUS_ARRIVAL_URL, {
      headers: authHeaders(),
      params: { BusStopCode: busStopCode },
      timeout: 6000
    });
    const services = data?.Services ?? [];
    const now = Date.now();
    const mapped = services.map((s) => ({
      service: s.ServiceNo,
      operator: s.Operator,
      next: arrivalToObject(s.NextBus, now),
      next2: arrivalToObject(s.NextBus2, now),
      next3: arrivalToObject(s.NextBus3, now)
    }));
    // v0.60.121 — sort by next-bus ETA so services arriving at a
    // similar time group together (LTA returns them in service-number
    // order, which scattered the "≤5 min" rows in the /app/map
    // bus-stop InfoWindow). Services with no live next reading sink to
    // the bottom; ties broken by service number (numeric where
    // possible). The chat-side formatBusArrivalsHtml already re-sorts,
    // so this is harmless there and fixes the map popup ordering.
    mapped.sort((a, b) => {
      const am = Number.isFinite(a.next?.minutes) ? a.next.minutes : Infinity;
      const bm = Number.isFinite(b.next?.minutes) ? b.next.minutes : Infinity;
      if (am !== bm) return am - bm;
      const an = parseInt(a.service, 10);
      const bn = parseInt(b.service, 10);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return String(a.service || '').localeCompare(String(b.service || ''));
    });
    return mapped;
  } catch (err) {
    console.error(`[Transport] BusArrivalv2 ${busStopCode} failed:`, err.message);
    return [];
  } finally {
    ltaRelease();
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
    // v0.60.74 — operator requested the "· seats / standing / limited"
    // suffix dropped entirely from arrival rows 2026-05-10. Force
    // loadLabel to '' so chat formatter (index.js:3674) and /app/map
    // popup (public/app.js:170) both omit the suffix. Raw load code
    // is still on the row object as `load` for future re-enable.
    loadLabel: '',
    type: b.Type || '',  // SD = single deck, DD = double deck, BD = bendy
    feature: b.Feature || '', // WAB = wheelchair-accessible
    // v0.62.967 — spec 2026-11-02-bus-route-and-live-buses-train-tma, C3: the bus's own position and visit number,
    // which LTA has returned all along and this parser dropped. Everything above is unchanged.
    lat: Number.isFinite(Number(b.Latitude)) && Number(b.Latitude) !== 0 ? Number(b.Latitude) : null,
    lng: Number.isFinite(Number(b.Longitude)) && Number(b.Longitude) !== 0 ? Number(b.Longitude) : null,
    visit: Number.isFinite(Number(b.VisitNumber)) && Number(b.VisitNumber) > 0 ? Number(b.VisitNumber) : null
  };
}

// === MRT stations + platform crowd ===

const MRT_LINES = ['NSL', 'EWL', 'CCL', 'NEL', 'DTL', 'CGL', 'BPL', 'TEL', 'SLRT', 'PLRT'];
const PCD_URL = `${LTA_BASE}/PCDRealTime`;
const CROWD_LABEL = { l: 'low', m: 'medium', h: 'high' };

// Use Google Places (New) to find nearest MRT/subway stations.
// More reliable than maintaining a hardcoded coord table for ~140 stations.
async function nearestMrtStations(lat, lng, radiusM = 1500, count = 3, redis = null) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];
  try {
    const { data } = await axios.post(
      'https://places.googleapis.com/v1/places:searchNearby',
      {
        // v0.60.100 — include LRT (light_rail_station) alongside MRT
        // (subway_station) so BPLRT / SKLRT / PGLRT stops surface in
        // /transport train's nearest-stations enrichment. Operator
        // 2026-05-11: LRT lines should be first-class citizens in
        // the chat-side results, not just the TMA scroll.
        includedTypes: ['subway_station', 'light_rail_station'],
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
    require('./api-cost').recordMapsCall(redis, 'searchNearby');
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
  // v0.60.88 — also retain per-line counts so the chat reply can
  // surface WHICH lines have crowded platforms (operator 2026-05-11:
  // "show # of 141 platform is crowded or mild instead of 'low' and
  // which line"). Per-line attribution is available at fetch-time
  // because each fetchLineCrowd call is for one specific TrainLine;
  // we just hadn't kept it.
  const byCode = new Map();
  const byLine = new Map();   // lineCode → { l, m, h }
  await Promise.all(MRT_LINES.map(async (line) => {
    const arr = await fetchLineCrowd(line);
    const counts = { l: 0, m: 0, h: 0 };
    for (const row of arr) {
      const code = (row.Station || '').toUpperCase().trim();
      if (!code) continue;
      const level = (row.CrowdLevel || '').toLowerCase();
      if (!byCode.has(code)) byCode.set(code, level);
      if (counts[level] !== undefined) counts[level]++;
    }
    byLine.set(line, counts);
  }));
  // Attach byLine as a property on the Map — backwards-compatible
  // with existing callers that iterate byCode.values().
  byCode.byLine = byLine;
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
  // v0.60.88 — surface lines with ANY non-low platforms so the chat
  // reply can call them out ("Lines: NSL, CCL"). Reads the byLine
  // property attached by fetchPlatformCrowdAll.
  const crowdedLines = [];
  const byLine = crowdByCode?.byLine;
  if (byLine instanceof Map) {
    for (const [line, c] of byLine.entries()) {
      if ((c.m || 0) + (c.h || 0) > 0) crowdedLines.push(line);
    }
  }
  return {
    total,
    low: counts.l,
    medium: counts.m,
    high: counts.h,
    crowdedLines,
    overall: counts.h > total * 0.2 ? 'high' : counts.m > total * 0.4 ? 'medium' : 'low'
  };
}

// LTA TrafficIncidents — live accidents, roadworks, vehicle breakdowns.
// Each entry: { Type, Latitude, Longitude, Message }.
// Message is pre-formatted by LTA, e.g. "(15/4)18:30 Accident on PIE..."
const TRAFFIC_INCIDENTS_URL = `${LTA_BASE}/TrafficIncidents`;

// v0.60.72 — Live SG ⟷ JB checkpoint cameras. v0.60.73: switched
// from the dedicated /WoodlandsTraffic + /2ndLinkTraffic endpoints
// (which 404'd in production — likely deprecated by LTA's revamp,
// per Human Lead 2026-05-10) to /Traffic-Imagesv2 + a camera-ID
// allow-list. Traffic-Imagesv2 returns ~80 cameras across SG.
// v0.60.103 — replaced the 4-camera allow-list (2701, 2702, 4709,
// 4710) with two lat/lng bounding boxes covering Woodlands Checkpoint
// + Tuas Second Link plus their approach roads (BKE, AYE, Woodlands
// Rd, Tuas Rd). Any camera LTA places inside either bbox is included
// so the operator sees every available view, not just the 4 hardcoded
// ones. Per Human Lead 2026-05-11.
const TRAFFIC_IMAGES_URL = `${LTA_BASE}/Traffic-Imagesv2`;

// Bounding boxes drawn ~3 km around each checkpoint to capture the
// approach roads (queue forms ~1-2 km out at peak). Woodlands centre
// ≈ 1.4471, 103.7682; Tuas Second Link centre ≈ 1.3454, 103.6356.
const CHECKPOINT_BBOXES = [
  { label: 'Woodlands Checkpoint', minLat: 1.420, maxLat: 1.470, minLng: 103.740, maxLng: 103.790 },
  { label: 'Tuas 2nd Link',        minLat: 1.330, maxLat: 1.360, minLng: 103.610, maxLng: 103.660 }
];

function checkpointLabelFor(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const b of CHECKPOINT_BBOXES) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) return b.label;
  }
  return null;
}

async function fetchCheckpointTraffic() {
  if (!process.env.LTA_ACCOUNT_KEY) return [];
  const out = [];
  try {
    const { data } = await axios.get(TRAFFIC_IMAGES_URL, {
      headers: authHeaders(),
      timeout: 6000
    });
    const rows = data?.value ?? [];
    for (const r of rows) {
      const lat = Number(r.Latitude);
      const lng = Number(r.Longitude);
      const label = checkpointLabelFor(lat, lng);
      if (!label || !r.ImageLink) continue;
      out.push({
        label,
        cameraId: String(r.CameraID || ''),
        imageUrl: String(r.ImageLink),
        lat,
        lng
      });
    }
    // Stable order: Woodlands cameras first (alphabetical bbox order),
    // then Tuas — matches the geography from north-east to south-west.
    out.sort((a, b) => a.label.localeCompare(b.label) || a.cameraId.localeCompare(b.cameraId));
  } catch (err) {
    console.error('[Transport] Traffic-Imagesv2 fetch failed:', err.message);
  }
  return out;
}

// v0.60.104 — ICA checkpoint queue scrape. Operator 2026-05-11 accepted
// the fragility: LTA's dedicated WoodlandsTraffic / 2ndLinkTraffic
// endpoints (which used to carry CarsWaiting / MotorcyclesWaiting) are
// 404'd, and ICA doesn't publish an open JSON API for queue status. We
// scrape the public trafficupdates page heuristically:
//   1. Pull the HTML with a real-browser User-Agent
//   2. Look for "Woodlands" / "Tuas" headings near status words
//      (Heavy / Moderate / Light / Smooth / Healthy)
//   3. Distinguish "Departing" vs "Arriving" if both appear
//   4. Return a structured object, or null if the page shape changed
//
// All chat-side rendering is gated on a non-null return so a scrape
// failure degrades gracefully (camera-only view, no queue line).
const ICA_TRAFFIC_URL = 'https://www.ica.gov.sg/enter-depart/checkpoints/trafficupdates';
const ICA_CACHE_TTL_MS = 60 * 1000;            // 60 s — page refreshes ~every minute
let icaCache = { at: 0, value: null };

const ICA_STATUS_WORDS = /\b(Smooth|Healthy|Light|Moderate|Heavy|Congested|Closed)\b/gi;

function fetchIcaCheckpointStatus() {
  // Module-level promise dedupe to avoid stampeding ICA when multiple
  // /checkpoint commands fire in the same second.
  const now = Date.now();
  if (icaCache.value && (now - icaCache.at) < ICA_CACHE_TTL_MS) {
    return Promise.resolve(icaCache.value);
  }
  return scrapeIca()
    .then((v) => { icaCache = { at: Date.now(), value: v }; return v; })
    .catch((err) => {
      console.warn('[Transport] ICA scrape failed:', err.message);
      return null;
    });
}

async function scrapeIca() {
  const cheerio = require('cheerio');
  const { data } = await axios.get(ICA_TRAFFIC_URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9'
    },
    timeout: 8000,
    responseType: 'text',
    transformResponse: [(d) => d]                // keep raw HTML for cheerio
  });
  if (typeof data !== 'string' || !data.length) return null;
  const $ = cheerio.load(data);
  // Strategy: walk the rendered text, find Woodlands + Tuas sections,
  // and within each section capture (Departing|Arriving|To Singapore|
  // From Singapore) + first status word.
  const text = $('body').text().replace(/\s+/g, ' ').trim();
  if (!text.length) return null;
  const result = {
    source: 'ICA',
    fetchedAt: new Date().toISOString(),
    woodlands: extractCheckpointSection(text, 'Woodlands'),
    tuas: extractCheckpointSection(text, 'Tuas')
  };
  // Reject if neither section parsed any status — page shape likely
  // changed; degrade to no-queue-line.
  if (!result.woodlands && !result.tuas) return null;
  return result;
}

function extractCheckpointSection(fullText, checkpointName) {
  // Find the slice of text that mentions this checkpoint and at least
  // one status word. Limit slice to 800 chars to avoid picking up
  // unrelated mentions of the same word further down the page.
  const idx = fullText.toLowerCase().indexOf(checkpointName.toLowerCase());
  if (idx < 0) return null;
  const slice = fullText.slice(idx, idx + 800);
  // Look for direction-tagged status pairs: "Departing ... Heavy",
  // "Arriving ... Moderate", or just one overall status.
  const directionPattern = /\b(Departing|Arriving|To\s+Singapore|From\s+Singapore|Departure|Arrival|Inbound|Outbound)\b[^A-Za-z]{0,80}?\b(Smooth|Healthy|Light|Moderate|Heavy|Congested|Closed)\b/gi;
  const directions = {};
  let m;
  while ((m = directionPattern.exec(slice)) !== null) {
    const dirRaw = m[1].toLowerCase();
    const status = m[2];
    const key = /(depart|outbound|to\s+sg|to\s+singapore)/i.test(dirRaw) ? 'departing'
              : /(arriv|inbound|from\s+sg|from\s+singapore)/i.test(dirRaw) ? 'arriving'
              : null;
    if (key && !directions[key]) directions[key] = status;
  }
  if (Object.keys(directions).length) return directions;
  // Fallback: no direction tags found — capture the first status word
  // anywhere in the slice as an overall indicator.
  ICA_STATUS_WORDS.lastIndex = 0;
  const single = ICA_STATUS_WORDS.exec(slice);
  return single ? { overall: single[1] } : null;
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

// v0.61.85 — parse the LTA "(D/M)HH:MM" message prefix into a sortable
// epoch (current year assumed — LTA omits it). A parsed date more than
// a day in the future is read as last year's. Returns 0 when the prefix
// is absent / unparseable, so those incidents sort to the bottom.
function incidentEpoch(message) {
  const m = /^\((\d{1,2})\/(\d{1,2})\)(\d{1,2}):(\d{2})/.exec(String(message || ''));
  if (!m) return 0;
  const now = new Date();
  const d = new Date(now.getFullYear(), Number(m[2]) - 1, Number(m[1]),
    Number(m[3]), Number(m[4]));
  if (d.getTime() > now.getTime() + 86400000) d.setFullYear(now.getFullYear() - 1);
  return d.getTime();
}

// v0.61.85 — the latest `count` incidents island-wide, newest first by
// the LTA message timestamp prefix. No radius filter.
function latestIncidents(incidents, count = 20) {
  if (!Array.isArray(incidents) || !incidents.length) return [];
  return incidents
    .map((i) => ({ ...i, epoch: incidentEpoch(i.message) }))
    .sort((a, b) => b.epoch - a.epoch)
    .slice(0, count);
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

// v0.62.598 — the single nearest hawker centre to a point, from the vault's
// name→{lat,lng} coord map (data/hawker-coords.json). Powers the Transport
// station card's "🍜 nearest hawker" hyperlink. Straight-line (haversine)
// nearest; returns { name, lat, lng, distanceM } or null when no coords.
function nearestHawkerCentre(coords, lat, lng) {
  if (!coords || typeof coords !== 'object') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null;
  for (const [name, v] of Object.entries(coords)) {
    if (!v || !Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
    const d = haversineM(lat, lng, v.lat, v.lng);
    if (!best || d < best.distanceM) {
      best = { name, lat: v.lat, lng: v.lng, distanceM: Math.round(d) };
    }
  }
  return best;
}

// ── v0.62.967 — a bus service's route and the buses on it now ─────────────────────────────────────────────────────
// Spec: doc/Feature/2026-11-02-bus-route-and-live-buses-train-tma.spec.md, C1, C2, C3, C5, C5a.
// Routes are cached daily from LTA's BusRoutes the way the stops are (C1); the buses on a route come from the arrival
// feed, sampled along the route (C2); the road shape comes from Google Directions once per service and direction per
// 30 days, capped daily, with a stop-to-stop fallback (C5, C5a). The sampler and the dedupe are shared with the Mini
// App (web/transport/src/lib/bus-route.js, ESM), loaded here with a dynamic import() because CI runs Node 20.
const BUS_ROUTES_URL = `${LTA_BASE}/BusRoutes`;
const ROUTES_TS_KEY = 'lta:busroutes:cachedAt';
const STOP_SERVICES_PREFIX = 'lta:busroute:stop:';
const RESUME_PREFIX = 'lta:busroute:resume:';
const RESUME_TTL_S = 60;
// "0530" → 330; "-", "" or anything else → null.
function hhmm(v) {
  const m = /^(\d{2})(\d{2})$/.exec(String(v || '').trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}
const ROUTE_PREFIX = 'lta:busroute:';
const SHAPE_PREFIX = 'lta:busroute:shape:';
const SHAPE_CAP_PREFIX = 'lta:busroute:shapecap:';
const SHAPE_TTL_S = 30 * 24 * 60 * 60;
const SHAPE_DAILY_CAP = 200;
const DIRECTIONS_URL = 'https://maps.googleapis.com/maps/api/directions/json';
let _busRouteLibP = null;
function busRouteLib() {
  if (!_busRouteLibP) _busRouteLibP = import('./web/transport/src/lib/bus-route.js');
  return _busRouteLibP;
}

async function fetchAllRoutes(http) {
  const out = [];
  let skip = 0;
  for (let page = 0; page < 80; page++) {
    const { data } = await http.get(BUS_ROUTES_URL, { headers: authHeaders(), params: { $skip: skip }, timeout: 10000 });
    const batch = data?.value ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    skip += batch.length;
  }
  return out;
}

// C1 — one list per service and direction, in stop sequence. A route whose stops changed loses its cached shape.
async function refreshRoutes(redis, { http = axios, force = false } = {}) {
  if (!process.env.LTA_ACCOUNT_KEY) return { imported: 0, skipped: 'no-key' };
  if (!redis.isOpen) await redis.connect();
  if (!force) {
    const ts = await redis.get(ROUTES_TS_KEY);
    const ageMs = ts ? Date.now() - Number(ts) : Infinity;
    if (Number.isFinite(ageMs) && ageMs < REFRESH_TTL_MS) return { imported: 0, skipped: 'fresh' };
  }
  const rows = await fetchAllRoutes(http);
  const byRoute = new Map();
  for (const r of rows) {
    const svc = String(r.ServiceNo || '').trim();
    const dir = Number(r.Direction) === 2 ? 2 : 1;
    const code = String(r.BusStopCode || '').trim();
    if (!svc || !code) continue;
    const k = `${svc}:${dir}`;
    if (!byRoute.has(k)) byRoute.set(k, []);
    // v0.62.971 — spec 2026-11-04-run-drawer-and-operating-hours, C7: each stop's first and last bus, [weekday,
    // Saturday, Sunday] in minutes after midnight (null when the service does not run that day), and the operator.
    byRoute.get(k).push({
      seq: Number(r.StopSequence) || 0, code, distance: Number.isFinite(Number(r.Distance)) ? Number(r.Distance) : null,
      fb: [hhmm(r.WD_FirstBus), hhmm(r.SAT_FirstBus), hhmm(r.SUN_FirstBus)],
      lb: [hhmm(r.WD_LastBus), hhmm(r.SAT_LastBus), hhmm(r.SUN_LastBus)],
      op: String(r.Operator || '').trim() || null,
    });
  }
  let imported = 0;
  const byStop = new Map();
  for (const [k, list] of byRoute) {
    list.sort((a, b) => a.seq - b.seq);
    const json = JSON.stringify(list);
    const prev = await redis.get(`${ROUTE_PREFIX}${k}`).catch(() => null);
    // v0.62.971 — only a change in the stop codes invalidates the road shape; first and last bus times changing (or
    // being added, as on the first refresh after this release) must not throw away every paid-for shape.
    let prevCodes = null;
    try { prevCodes = prev ? JSON.parse(prev).map((x) => x.code).join(',') : null; } catch { prevCodes = null; }
    if (prev && prevCodes !== list.map((x) => x.code).join(',')) await redis.del(`${SHAPE_PREFIX}${k}`).catch(() => {});
    await redis.set(`${ROUTE_PREFIX}${k}`, json);
    const [svc, dir] = k.split(':');
    for (const st of list) {
      if (!byStop.has(st.code)) byStop.set(st.code, []);
      byStop.get(st.code).push({ svc, dir: Number(dir), seq: st.seq, fb: st.fb, lb: st.lb, op: st.op });
    }
    imported++;
  }
  // v0.62.971 — the stop's own index, so "when does each operator resume here" is one read.
  for (const [code, list] of byStop) await redis.set(`${STOP_SERVICES_PREFIX}${code}`, JSON.stringify(list)).catch(() => {});
  await redis.set(ROUTES_TS_KEY, String(Date.now()));
  return { imported, skipped: null };
}

async function stopMeta(redis, code) {
  const meta = await redis.hGetAll(`${STOPS_HASH_PREFIX}${code}`).catch(() => ({}));
  let lat = Number(meta?.lat);
  let lng = Number(meta?.lng);
  if ((!Number.isFinite(lat) || !Number.isFinite(lng)) && typeof redis.sendCommand === 'function') {
    try {
      const pos = await redis.sendCommand(['GEOPOS', STOPS_GEO, String(code)]);
      const p = Array.isArray(pos) ? pos[0] : null;
      if (Array.isArray(p)) { lng = Number(p[0]); lat = Number(p[1]); }
    } catch { /* no position */ }
  }
  return {
    name: expandSgAbbrev(meta?.description || '') || String(code),
    road: expandSgAbbrev(meta?.roadName || ''),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null
  };
}

// C2 — the stops of one direction, named, with coordinates; null when the route is not cached.
async function busRoute(redis, service, direction) {
  if (!redis.isOpen) await redis.connect();
  const raw = await redis.get(`${ROUTE_PREFIX}${String(service)}:${Number(direction) === 2 ? 2 : 1}`).catch(() => null);
  if (!raw) return null;
  let list;
  try { list = JSON.parse(raw); } catch { return null; }
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const s of list) {
    const m = await stopMeta(redis, s.code);
    // v0.62.984 — fb / lb ride along ([weekday, Saturday, Sunday] minutes, null when not running), so the strip can say
    // today's first and last bus at the tapped stop. Spec 2026-11-09-bus-first-last-in-route-strip.
    out.push({ seq: s.seq, code: s.code, name: m.name, road: m.road, lat: m.lat, lng: m.lng, distance: s.distance,
      fb: Array.isArray(s.fb) ? s.fb : null, lb: Array.isArray(s.lb) ? s.lb : null });
  }
  return out;
}

// C2 — the buses on one direction now: the arrival feed at every fifth stop and the last, this service only, first
// visit only, with a position, each bus once.
// v0.62.968 — spec 2026-11-03-bus-route-shape-and-buses-cache, C6: one reading per service and direction is shared
// for 20 seconds, with readAt kept as the time LTA was read (never the time of the cache hit).
const BUSES_PREFIX = 'lta:busroute:buses:';
const BUSES_TTL_S = 20;

async function busRouteBuses(redis, service, direction, { http = axios, now = Date.now } = {}) {
  const route = await busRoute(redis, service, direction);
  if (!route) return { buses: [], readAt: now() };
  const bk = `${BUSES_PREFIX}${String(service)}:${Number(direction) === 2 ? 2 : 1}`;
  try {
    const raw = await redis.get(bk);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && Array.isArray(c.buses) && Number.isFinite(c.readAt)) return { buses: c.buses, readAt: c.readAt };
    }
  } catch { /* read LTA */ }
  const { sampleStops, dedupeBuses } = await busRouteLib();
  const picked = sampleStops(route);
  const results = await Promise.all(picked.map((s) => busArrivals(s.code, { http }).catch(() => [])));
  const buses = [];
  picked.forEach((s, i) => {
    for (const svc of (results[i] || [])) {
      if (String(svc.service) !== String(service)) continue;
      for (const b of [svc.next, svc.next2, svc.next3]) {
        if (!b || b.visit !== 1 || !Number.isFinite(b.lat) || !Number.isFinite(b.lng)) continue;
        buses.push({ lat: b.lat, lng: b.lng, minutes: b.minutes, load: b.load, type: b.type, nextStopCode: s.code, nextStopSeq: s.seq, nextStop: s.name });
      }
    }
  });
  const deduped = dedupeBuses(buses).sort((a, b) => (a.nextStopSeq - b.nextStopSeq) || (a.minutes - b.minutes));
  const out = { buses: deduped, readAt: now() };
  await redis.set(bk, JSON.stringify(out), { EX: BUSES_TTL_S }).catch(() => {});
  return out;
}

// v0.62.969 — spec 2026-11-03-station-and-stop-tap-animations-train-tma, C4-C7. Every service at one stop: the 2
// buses coming, from the stop's own feed (one LTA call), and the 2 that most recently left it, from that service's
// sampled route in the direction serving the stop (busRouteBuses, shared for 20 s). Positions only, no shapes, so
// the phone's refresh stays small. Each refresh's LTA call count is logged; the limiter above bounds the burst.
let _stopLib = null;
function stopBusesLib() {
  if (!_stopLib) _stopLib = import('./web/transport/src/lib/stop-buses.js');
  return _stopLib;
}
async function stopBuses(redis, stopCode, { http = axios, now = Date.now } = {}) {
  const { stopSeqOf, pickComing, pickGoing } = await stopBusesLib();
  const { pickDirection } = await busRouteLib();
  let calls = 0;
  const counted = { get: (...a) => { calls++; return http.get(...a); } };
  const code = String(stopCode);
  const [arrivals, meta] = await Promise.all([busArrivals(code, { http: counted }), stopMeta(redis, code).catch(() => null)]);
  const services = await Promise.all((arrivals || []).map(async (svc) => {
    const service = String(svc.service);
    const [d1, d2] = await Promise.all([busRoute(redis, service, 1), busRoute(redis, service, 2)]);
    const byDir = {};
    if (d1) byDir[1] = d1;
    if (d2) byDir[2] = d2;
    const direction = pickDirection(byDir, code);
    let going = [];
    if (direction) {
      const r = await busRouteBuses(redis, service, direction, { http: counted, now });
      going = pickGoing(r.buses, stopSeqOf(byDir[direction], code));
    }
    const coming = pickComing(svc).map((b) => ({ lat: b.lat, lng: b.lng, minutes: b.minutes, load: b.load, type: b.type }));
    return { service, direction: direction || null, coming, going: going.map((b) => ({ lat: b.lat, lng: b.lng, minutes: b.minutes, load: b.load, type: b.type, nextStopCode: b.nextStopCode, nextStop: b.nextStop })) };
  }));
  console.log(`[Transport] stop-buses ${code}: ${services.length} services, ${calls} LTA calls`);
  return { code, name: meta?.name || code, lat: meta?.lat ?? null, lng: meta?.lng ?? null, readAt: now(), services };
}

// v0.62.971 — spec 2026-11-04-run-drawer-and-operating-hours, C7. For each operator at the stop whose services all
// have no bus on the feed now and are outside their hours, the earliest next first bus. Public holidays take Sunday
// times. One LTA call (the stop's own feed), and the answer is shared for 60 s.
let _runLib = null;
function runStateLib() {
  if (!_runLib) _runLib = import('./web/transport/src/lib/run-state.js');
  return _runLib;
}
async function stopResume(redis, stopCode, { http = axios, now = Date.now, isHoliday = null } = {}) {
  const code = String(stopCode);
  const nowMs = now();
  const ck = `${RESUME_PREFIX}${code}`;
  if (!isHoliday) {
    try {
      const raw = await redis.get(ck);
      if (raw) return JSON.parse(raw);
    } catch { /* recompute */ }
  }
  const { busHours, OPERATOR_NAMES } = await runStateLib();
  const hol = isHoliday || ((iso) => !!holidaysLib().isPublicHoliday(new Date(Date.parse(iso + 'T04:00:00Z'))));
  let services = [];
  try { services = JSON.parse((await redis.get(`${STOP_SERVICES_PREFIX}${code}`)) || '[]'); } catch { services = []; }
  const arrivals = await busArrivals(code, { http });
  const running = new Set((arrivals || []).filter((s) => [s.next, s.next2, s.next3].some((b) => b && Number.isFinite(b.minutes))).map((s) => String(s.service)));
  const byOp = new Map();
  for (const s of services) {
    const op = s.op || 'OTHER';
    if (!byOp.has(op)) byOp.set(op, { anyRunning: false, resumeAt: null });
    const e = byOp.get(op);
    const h = busHours(s.fb, s.lb, nowMs, hol);
    if (running.has(String(s.svc)) || h.inHours) { e.anyRunning = true; continue; }
    if (Number.isFinite(h.resumeAt) && (e.resumeAt == null || h.resumeAt < e.resumeAt)) e.resumeAt = h.resumeAt;
  }
  const operators = [...byOp.entries()]
    .filter(([, e]) => !e.anyRunning && Number.isFinite(e.resumeAt))
    .map(([operator, e]) => ({ operator, name: OPERATOR_NAMES[operator] || operator, resumeAt: e.resumeAt }))
    .sort((a, b) => (a.resumeAt - b.resumeAt) || a.operator.localeCompare(b.operator));
  const out = { code, readAt: nowMs, operators };
  if (!isHoliday) await redis.set(ck, JSON.stringify(out), { EX: RESUME_TTL_S }).catch(() => {});
  return out;
}
// v0.62.984 — today's bus day type (0 weekday, 1 Saturday, 2 Sunday or public holiday), returned with a route. The rule
// is run-state.js's `busDayIndex`, the one `busHours` uses; holidays come from holidays.js as in stopResume.
async function busDayToday({ now = Date.now, isHoliday = null } = {}) {
  const { busDayIndex } = await runStateLib();
  const hol = isHoliday || ((iso) => !!holidaysLib().isPublicHoliday(new Date(Date.parse(iso + 'T04:00:00Z'))));
  return busDayIndex(now(), hol);
}
let _holidays = null;
function holidaysLib() {
  if (!_holidays) _holidays = require('./holidays.js');
  return _holidays;
}

// Google's encoded polyline, both ways (the decoder is what the shape route needs; the encoder is what proves it).
function encodeValue(v) {
  let n = v < 0 ? ~(v << 1) : (v << 1);
  let s = '';
  while (n >= 0x20) { s += String.fromCharCode((0x20 | (n & 0x1f)) + 63); n >>= 5; }
  return s + String.fromCharCode(n + 63);
}
function encodePolyline(points) {
  let out = '';
  let lastLat = 0;
  let lastLng = 0;
  for (const [lat, lng] of points) {
    const la = Math.round(lat * 1e5);
    const ln = Math.round(lng * 1e5);
    out += encodeValue(la - lastLat) + encodeValue(ln - lastLng);
    lastLat = la; lastLng = ln;
  }
  return out;
}
function decodePolyline(str) {
  const pts = [];
  let i = 0;
  let lat = 0;
  let lng = 0;
  const s = String(str || '');
  while (i < s.length) {
    let b; let shift = 0; let result = 0;
    do { b = s.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i <= s.length);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = s.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20 && i <= s.length);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    pts.push([lat / 1e5, lng / 1e5]);
  }
  return pts;
}

function shapeCapKey(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${SHAPE_CAP_PREFIX}${y}${m}${day}`;
}

// C5 / C5a / I8 — the road shape along the route's stops, from Google Directions (driving, `via:` waypoints, at most
// 25 points a request, legs joined end to end), cached 30 days per service and direction under a signature of the
// stop codes, never more than SHAPE_DAILY_CAP fetches a day, never without a key. Null means "draw stop to stop".
// v0.62.968 — spec 2026-11-03-bus-route-shape-and-buses-cache. Statuses that mean "this stretch cannot be driven as
// asked" (C1): the chunk is drawn stop to stop and the rest keeps the road. Any other status, or a thrown error, is an
// account-level or passing failure (C2): nothing is cached for 30 days, and the direction waits an hour.
const SHAPE_ROUTE_STATUSES = new Set(['ZERO_RESULTS', 'NOT_FOUND']);
const SHAPE_WAIT_PREFIX = 'lta:busroute:shapewait:';
const SHAPE_WAIT_S = 60 * 60;

async function routeShape(redis, service, direction, stops, { http = axios, key = process.env.GOOGLE_MAPS_API_KEY, now = Date.now } = {}) {
  if (!key) return null;
  const pts = (Array.isArray(stops) ? stops : []).filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng));
  if (pts.length < 2) return null;
  const sig = pts.map((s) => String(s.code)).join(',');
  const dir = Number(direction) === 2 ? 2 : 1;
  const ck = `${SHAPE_PREFIX}${String(service)}:${dir}`;
  const wk = `${SHAPE_WAIT_PREFIX}${String(service)}:${dir}`;
  if (!redis.isOpen) await redis.connect();
  try {
    const raw = await redis.get(ck);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && c.sig === sig && c.straight) return null;
      if (c && c.sig === sig && Array.isArray(c.points) && c.points.length) {
        const out = c.points;
        if (c.partial) out.partial = true;
        return out;
      }
    }
  } catch { /* refetch */ }
  if (await redis.get(wk).catch(() => null)) return null;
  const capKey = shapeCapKey(new Date(now()));
  const n = await redis.incr(capKey).catch(() => SHAPE_DAILY_CAP + 1);
  await redis.expire(capKey, 2 * 24 * 60 * 60).catch(() => {});
  if (n > SHAPE_DAILY_CAP) return null;
  const tag = `${String(service)}/${dir}`;
  const wait = async (why) => {
    console.warn(`[Transport] bus route shape ${tag}: ${why}; waiting an hour before trying again`);
    await redis.set(wk, '1', { EX: SHAPE_WAIT_S }).catch(() => {});
    return null;
  };
  const starts = [];
  for (let i = 0; i < pts.length - 1; i += 24) starts.push(i);
  const points = [];
  let road = 0;
  let straight = 0;
  try {
    for (let k = 0; k < starts.length; k++) {
      const i = starts[k];
      const chunk = pts.slice(i, Math.min(i + 25, pts.length));
      const first = chunk[0];
      const last = chunk[chunk.length - 1];
      const params = { origin: `${first.lat},${first.lng}`, destination: `${last.lat},${last.lng}`, mode: 'driving', key };
      const via = chunk.slice(1, -1).map((p) => `via:${p.lat},${p.lng}`).join('|');
      if (via) params.waypoints = via;
      const { data } = await http.get(DIRECTIONS_URL, { params, timeout: 8000 });
      const status = String(data?.status || 'NO_STATUS');
      const enc = status === 'OK' ? data?.routes?.[0]?.overview_polyline?.points : null;
      let seg;
      if (enc) {
        seg = decodePolyline(enc);
        road++;
      } else if (SHAPE_ROUTE_STATUSES.has(status)) {
        console.warn(`[Transport] bus route shape ${tag} chunk ${k + 1} of ${starts.length}: ${status}; drawn stop to stop`);
        seg = chunk.map((p) => [p.lat, p.lng]);
        straight++;
      } else {
        return await wait(`chunk ${k + 1} of ${starts.length}: ${status === 'OK' ? 'OK without a route' : status}`);
      }
      points.push(...(points.length ? seg.slice(1) : seg));
    }
  } catch (err) {
    return await wait(`request failed (${err?.message || 'error'})`);
  }
  if (!points.length) return null;
  if (!road) {
    await redis.set(ck, JSON.stringify({ sig, straight: true }), { EX: SHAPE_TTL_S }).catch(() => {});
    return null;
  }
  const partial = straight > 0;
  await redis.set(ck, JSON.stringify(partial ? { sig, points, partial: true } : { sig, points }), { EX: SHAPE_TTL_S }).catch(() => {});
  if (partial) points.partial = true;
  return points;
}

module.exports = {
  refreshStops,
  refreshRoutes,     // v0.62.967
  busRoute,          // v0.62.967
  busRouteBuses,     // v0.62.967
  stopBuses,         // v0.62.969
  stopResume,        // v0.62.971
  busDayToday,       // v0.62.984
  routeShape,        // v0.62.967
  shapeCapKey,       // v0.62.967
  encodePolyline,    // v0.62.967
  decodePolyline,    // v0.62.967
  arrivalToObject,   // v0.62.967 (exported for its test)
  nearestStops,
  nearestHawkerCentre,
  allStops,
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
  fetchIcaCheckpointStatus,
  nearestIncidents,
  latestIncidents,
  CROWD_LABEL,
  STOPS_GEO,
  STOPS_HASH_PREFIX,
  haversineM
};
