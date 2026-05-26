// cuisine-venue-counts.js — v0.61.173
//
// Standalone per-cuisine venue tabulator for the operator's
// "non-Asia + selected" cuisine subset. NOT wired into the
// v0.61.166 Periodical system — the operator chose manual-only
// invocation via scripts/recount-cuisine-venues.js so the paid
// Google Places Text Search calls only fire when the operator
// explicitly asks for fresh numbers.
//
// Scope: 48 cuisine slugs (out of the 67 in cuisines-vault). The
// operator excluded 19 slugs that either saturate SG (everyone in
// Singapore is "Singaporean" or "Chinese" — the count tells us
// nothing useful), are generic umbrellas that double-count
// (European / Mediterranean), are China-regional umbrellas, or
// aren't nationalities (Dessert / Fusion).
//
// Per cuisine: 1 Places searchText call with pagination up to
// 3 pages × 20 = 60-result cap (Places API ceiling). For most
// non-saturating cuisines the count is exact; for the popular
// few (Italian, Japanese, American, ...) it reads as "60+" — a
// floor, not an undercount that pretends to be exact.
//
// Cost (v0.61.173 ship-time pricing): ~$3.45 per full sweep
// across the 48 slugs. Operator runs manually as needed; no cron.
//
// Privacy contract: this module fetches venue names + placeIds
// transiently to count them, but persists ONLY integers to disk
// (data/cuisine-venue-counts.json). No placeId, name, address,
// rating, or any venue-identifying field is stored.

'use strict';

const axios = require('axios');

// Frozen scope: the 48 slugs the operator confirmed (filter applied
// against cuisines-vault's full 67-cuisine list).
const SCOPE_SLUGS = Object.freeze([
  'peranakan', 'eurasian',
  'north-indian', 'bengali', 'gujarati', 'nepalese', 'sri-lankan', 'pakistani',
  'thai', 'filipino', 'vietnamese', 'burmese',
  'japanese', 'korean', 'taiwanese',
  'american', 'mexican', 'brazilian', 'argentinian',
  'australian', 'new-zealand', 'australasia',
  'shanghainese', 'northeastern', 'northwestern',
  'italian', 'spanish', 'greek', 'french', 'british', 'german', 'austrian',
  'swiss', 'portuguese', 'russian', 'ukrainian', 'polish', 'scandinavian',
  'lebanese', 'persian', 'moroccan', 'egyptian', 'jordanian', 'israeli',
  'uzbek', 'georgian',
  'african', 'south-african'
]);

const PLACES_SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';

// Minimum field mask — we only need placeId to count + dedup
// across paginated pages. This keeps us on the cheapest SKU
// (Places Text Search "ID Only" / "Basic" tier).
const FIELD_MASK_COUNT = ['places.id', 'nextPageToken'].join(',');

const PAGE_SIZE = 20;
const MAX_PAGES = 3;       // 3 × 20 = 60 (Places hard ceiling)
const REQUEST_TIMEOUT_MS = 8000;

// Build the text query the v0.61.X Cuisine TMA / chat free-text
// path uses, prefer the cuisines-vault `searchQuery` field. Falls
// back to "<name> restaurant Singapore" when the vault doesn't
// expose one.
function buildTextQuery(cuisinesVault, slug) {
  const entry = (cuisinesVault.getAllCuisines() || []).find((c) => c.slug === slug);
  if (entry && typeof entry.searchQuery === 'string' && entry.searchQuery.trim()) {
    return entry.searchQuery.trim();
  }
  const name = entry?.name || slug;
  return `${name} restaurant Singapore`;
}

// Count for one cuisine slug. Paginates up to MAX_PAGES, dedups
// placeIds across pages (Places sometimes returns overlapping
// results between page 1 and page 2). Returns
// { slug, n, capped, pages, error } — n is null on failure.
// `opts.fetchFn` lets tests inject a synthetic fetch.
async function countOne(slug, opts = {}) {
  const apiKey = opts.apiKey || process.env.GOOGLE_MAPS_API_KEY;
  const cuisinesVault = opts.cuisinesVault || require('./cuisines-vault');
  const fetchFn = opts.fetchFn || _defaultFetch;
  if (!apiKey) {
    return { slug, n: null, capped: false, pages: 0, error: 'GOOGLE_MAPS_API_KEY missing' };
  }
  const textQuery = buildTextQuery(cuisinesVault, slug);
  const seen = new Set();
  let pageToken;
  let pages = 0;
  let error = null;
  for (let p = 0; p < MAX_PAGES; p++) {
    let body;
    try {
      body = await fetchFn({
        url: PLACES_SEARCH_TEXT_URL,
        apiKey,
        textQuery,
        pageSize: PAGE_SIZE,
        pageToken,
        timeoutMs: REQUEST_TIMEOUT_MS
      });
    } catch (err) {
      error = err && err.message ? err.message : String(err);
      break;
    }
    pages += 1;
    const places = Array.isArray(body?.places) ? body.places : [];
    for (const pl of places) {
      const id = pl && pl.id;
      if (id) seen.add(id);
    }
    pageToken = body?.nextPageToken;
    if (!pageToken) break;
  }
  const n = error && seen.size === 0 ? null : seen.size;
  const capped = seen.size >= PAGE_SIZE * MAX_PAGES; // 60+
  return { slug, n, capped, pages, error };
}

// Parallel sweep across all 48 cuisines in SCOPE_SLUGS. Returns
// { ts, total, perSlug: {slug: n}, capped: [slug, ...], errors:
// {slug: errMsg}, pages, tiles, elapsedMs }. Per-cuisine failures
// are isolated — one cuisine erroring out leaves the rest's
// counts intact and surfaces the slug + reason in `errors`.
//
// v0.61.181 — smart routing: SATURATING_SLUGS get the tile-search
// path (~15 tiles × ~1.5 paginated pages each = ~22 calls per
// cuisine, breaks the Places 60-cap). Non-saturating slugs keep
// the single-query path (~1-3 calls, exact counts below 60).
// `tiledSlugs` field reports which slugs took the tiled path so
// the operator can see where the extra spend went.
async function countAll(opts = {}) {
  const t0 = Date.now();
  const out = await Promise.all(SCOPE_SLUGS.map((slug) => {
    if (SATURATING_SLUGS.has(slug)) return countOneTiled(slug, opts);
    return countOne(slug, opts);
  }));
  const perSlug = {};
  const capped = [];
  const errors = {};
  const tiledSlugs = [];
  let total = 0;
  let pages = 0;
  for (const r of out) {
    perSlug[r.slug] = r.n;
    if (Number.isFinite(r.n)) total += r.n;
    if (r.capped) capped.push(r.slug);
    if (r.error) errors[r.slug] = r.error;
    pages += r.pages || 0;
    if (Number.isFinite(r.tiles) && r.tiles > 1) tiledSlugs.push(r.slug);
  }
  return {
    ts: new Date().toISOString(),
    total,
    perSlug,
    capped,
    errors,
    pages,
    tiledSlugs,
    elapsedMs: Date.now() - t0
  };
}

// Default axios-based fetch. Posts to Places searchText with the
// minimal field mask; throws on network / 4xx / 5xx. Wrapped by
// callers in try/catch so a single-page failure ends pagination
// for that cuisine without sinking the rest.
// v0.61.181 — accepts optional `locationBias` + `regionCode`
// overrides so the tile-search path can constrain results to a
// geographic circle (9 SG tiles + 6 JB tiles).
async function _defaultFetch({ url, apiKey, textQuery, pageSize, pageToken, locationBias, regionCode, timeoutMs }) {
  const body = {
    textQuery,
    regionCode: regionCode || 'SG',
    pageSize,
    ...(pageToken ? { pageToken } : {}),
    ...(locationBias ? { locationBias } : {})
  };
  const { data } = await axios.post(url, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK_COUNT
    },
    timeout: timeoutMs || REQUEST_TIMEOUT_MS
  });
  return data;
}

// v0.61.181 — geographic tiles for the smart tile-search path.
// Saturating cuisines (italian, japanese, korean, american, thai,
// vietnamese, north-indian, french) hit the Places 60-result API
// ceiling on a single SG-wide query. To get TRUE counts (e.g.
// Italian ~150-300 SG, Japanese 400+), we issue one searchText
// per tile with a locationBias.circle constraint, then dedup
// placeIds across all tiles. Non-saturating cuisines keep the
// single-query path (cheap, exact counts below 60).
//
// 9 SG tiles (3×3 grid, ~9 km radius each) cover the entire
// island including Tuas/Jurong-W, Sembawang/Yishun-N,
// Changi/Pulau-Ubin-E. 6 JB tiles span west to east from
// Iskandar Puteri (Legoland Malaysia, 1.4248° / 103.6347°) all
// the way to Desaru beach resort area (~1.54° / 104.27°), with
// an enlarged radius on the easternmost tiles to bridge the
// Pasir Gudang → Bandar Penawar → Desaru rural span.
//
// Tile-search adds ~150-200 API calls per saturating cuisine
// (~$0.50-0.65 per cuisine at the cheapest SKU). Total sweep
// cost rises from ~\$3.45 (v0.61.177) to ~\$8-12 (this PR).
const SG_TILES = Object.freeze([
  { id: 'sg-nw', region: 'SG', lat: 1.42, lng: 103.72, radiusM: 9000,  label: 'Choa Chu Kang / Kranji' },
  { id: 'sg-n',  region: 'SG', lat: 1.43, lng: 103.83, radiusM: 9000,  label: 'Yishun / Sembawang' },
  { id: 'sg-ne', region: 'SG', lat: 1.42, lng: 103.94, radiusM: 9000,  label: 'Punggol / Pasir Ris' },
  { id: 'sg-w',  region: 'SG', lat: 1.34, lng: 103.69, radiusM: 9000,  label: 'Tuas / Jurong West' },
  { id: 'sg-c',  region: 'SG', lat: 1.35, lng: 103.83, radiusM: 9000,  label: 'Bishan / Toa Payoh / Orchard' },
  { id: 'sg-e',  region: 'SG', lat: 1.35, lng: 103.95, radiusM: 9000,  label: 'Tampines / Bedok East' },
  { id: 'sg-sw', region: 'SG', lat: 1.27, lng: 103.74, radiusM: 9000,  label: 'Pasir Panjang / Sentosa W' },
  { id: 'sg-s',  region: 'SG', lat: 1.28, lng: 103.84, radiusM: 9000,  label: 'CBD / Marina Bay / Sentosa' },
  { id: 'sg-se', region: 'SG', lat: 1.30, lng: 103.97, radiusM: 9000,  label: 'Bedok / Changi Airport' }
]);

// JB tile #1 sits AT Legoland Malaysia (verified 1.4248° / 103.6347°).
// JB tile #6 sits AT Desaru (~1.54° / 104.27°). Tiles 4-5 use a
// larger radius (12-15 km) to bridge the sparsely-built area
// between Pasir Gudang and Bandar Penawar.
const JB_TILES = Object.freeze([
  { id: 'jb-1-iskandar', region: 'JB', lat: 1.4248, lng: 103.6347, radiusM: 10000, label: 'Iskandar Puteri / Legoland Malaysia' },
  { id: 'jb-2-skudai',   region: 'JB', lat: 1.5000, lng: 103.7100, radiusM: 10000, label: 'Skudai / Tampoi / Mt Austin' },
  { id: 'jb-3-city',     region: 'JB', lat: 1.4655, lng: 103.7600, radiusM: 10000, label: 'JB City Centre / Bukit Indah' },
  { id: 'jb-4-pasir',    region: 'JB', lat: 1.4710, lng: 103.8902, radiusM: 11000, label: 'Pasir Gudang / Plentong / Masai' },
  { id: 'jb-5-mid',      region: 'JB', lat: 1.5200, lng: 104.0500, radiusM: 15000, label: 'Sungai Tiram / Tg Langsat / Bandar Penawar' },
  { id: 'jb-6-desaru',   region: 'JB', lat: 1.5400, lng: 104.2700, radiusM: 12000, label: 'Desaru / Sebana Cove' }
]);

const TILES = Object.freeze([...SG_TILES, ...JB_TILES]);

// 8 of the 48 slugs hit the 60-cap on a single SG-wide query
// (v0.61.177 sweep observed these saturating). These get the
// tile-search path; the other 40 keep the single-query path.
const SATURATING_SLUGS = Object.freeze(new Set([
  'italian', 'japanese', 'korean', 'american', 'thai',
  'vietnamese', 'north-indian', 'french'
]));

// Tile-search variant of countOne. Iterates TILES, paginates
// each up to MAX_PAGES, dedups placeIds across the whole sweep.
// Returns { slug, n, capped, pages, tiles, error }. `capped` is
// always false for tiled (no single API ceiling to hit when we
// query 15 different geographic circles); `tiles` is the number
// of tiles processed (typically TILES.length unless we bail
// early on a fatal error). On per-tile errors, we continue to
// the next tile; `error` captures the FIRST error seen so the
// operator can debug.
async function countOneTiled(slug, opts = {}) {
  const apiKey = opts.apiKey || process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return { slug, n: null, capped: false, pages: 0, tiles: 0, error: 'GOOGLE_MAPS_API_KEY missing' };
  }
  const cuisinesVault = opts.cuisinesVault || require('./cuisines-vault');
  const fetchFn = opts.fetchFn || _defaultFetch;
  const textQuery = buildTextQuery(cuisinesVault, slug);
  const seen = new Set();
  let totalPages = 0;
  let tilesProcessed = 0;
  let firstError = null;
  for (const tile of TILES) {
    let pageToken;
    let tileFailed = false;
    for (let p = 0; p < MAX_PAGES; p++) {
      let body;
      try {
        body = await fetchFn({
          url: PLACES_SEARCH_TEXT_URL,
          apiKey,
          textQuery,
          pageSize: PAGE_SIZE,
          pageToken,
          regionCode: tile.region === 'JB' ? 'MY' : 'SG',
          locationBias: { circle: { center: { latitude: tile.lat, longitude: tile.lng }, radius: tile.radiusM } },
          timeoutMs: REQUEST_TIMEOUT_MS
        });
      } catch (err) {
        if (!firstError) firstError = err && err.message ? err.message : String(err);
        tileFailed = true;
        break;
      }
      totalPages += 1;
      const places = Array.isArray(body?.places) ? body.places : [];
      for (const pl of places) {
        const id = pl && pl.id;
        if (id) seen.add(id);
      }
      pageToken = body?.nextPageToken;
      if (!pageToken) break;
    }
    tilesProcessed += 1;
    if (tileFailed) continue;
  }
  const n = firstError && seen.size === 0 ? null : seen.size;
  return { slug, n, capped: false, pages: totalPages, tiles: tilesProcessed, error: firstError };
}

// v0.61.177 — Redis persistence so the result survives Railway
// container redeploys (the data/cuisine-venue-counts.json file from
// v0.61.173 lives on the container's ephemeral filesystem; gone on
// each rollout). Single key, single JSON blob, long TTL (manually
// invoked recount means stale-but-present is better than empty).
const REDIS_KEY = 'cuisine-venue-counts:latest';
const REDIS_TTL_S = 60 * 24 * 60 * 60;     // 60 days

async function persistToRedis(redis, result) {
  if (!redis || !redis.isOpen) return false;
  if (!result || typeof result !== 'object') return false;
  try {
    await redis.set(REDIS_KEY, JSON.stringify(result), { EX: REDIS_TTL_S });
    return true;
  } catch (err) {
    return false;
  }
}

async function loadFromRedis(redis) {
  if (!redis || !redis.isOpen) return null;
  try {
    const raw = await redis.get(REDIS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

// v0.61.179 — 60-second debounce so the operator can't
// accidentally double-tap the chat-side Recount button and spend
// ~\$7 instead of ~\$3.50. `claimDebounceSlot(redis)` uses Redis
// SET NX EX semantics: returns true if THIS caller won the slot,
// false if a recent caller already holds it. Caller then either
// fires the sweep (won=true) or shows a "wait N seconds" message
// (won=false). The slot expires after DEBOUNCE_TTL_S so future
// runs aren't permanently blocked.
const DEBOUNCE_KEY = 'cuisine-venue-counts:debounce';
const DEBOUNCE_TTL_S = 60;

async function claimDebounceSlot(redis) {
  if (!redis || !redis.isOpen) return { won: true, remainingSec: 0 };
  try {
    const result = await redis.set(DEBOUNCE_KEY, '1', { NX: true, EX: DEBOUNCE_TTL_S });
    if (result === 'OK') return { won: true, remainingSec: 0 };
    let ttl = 0;
    try { ttl = await redis.ttl(DEBOUNCE_KEY); } catch { /* ignore */ }
    return { won: false, remainingSec: Math.max(0, ttl) };
  } catch (err) {
    // On Redis error, allow the call (debounce is a nice-to-have,
    // not a security gate — the cost is operator-borne).
    return { won: true, remainingSec: 0 };
  }
}

module.exports = {
  SCOPE_SLUGS,
  PLACES_SEARCH_TEXT_URL,
  FIELD_MASK_COUNT,
  PAGE_SIZE,
  MAX_PAGES,
  REDIS_KEY,
  REDIS_TTL_S,
  DEBOUNCE_KEY,
  DEBOUNCE_TTL_S,
  SG_TILES,
  JB_TILES,
  TILES,
  SATURATING_SLUGS,
  buildTextQuery,
  countOne,
  countOneTiled,
  countAll,
  persistToRedis,
  loadFromRedis,
  claimDebounceSlot,
  _defaultFetch
};
