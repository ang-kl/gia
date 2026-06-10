// corpus-store.js — v0.62.8
//
// Redis-Geo serving layer for the curated cuisine corpus (Phase 1: Bangkok).
// Loads a per-city gzipped shard (data/corpus/<city>.json.gz, built offline by
// scripts/build-cuisine-corpus.py) into Redis Geo, and answers radius+cuisine
// queries — mirroring the existing vault.js GEOSEARCH / sync-vault.js GEOADD
// patterns so it reuses the same client + ops model (no new infra).
//
// Keys (per city, namespaced so they never collide with gia:vault / gia:place):
//   gia:corpus:geo:<City>      — GEO sorted-set of venue ids
//   gia:corpus:place:<id>      — HASH of venue metadata
//   gia:corpus:loaded:<City>   — marker (rows count) once a city is loaded
//
// Boot loads cities in the BACKGROUND (never blocks boot); until a city is
// loaded, the caller transparently falls back to live Places. Lazy-load on
// first query is also supported. Cuisine slugs are computed at load time from
// the FSQ leaf labels via corpus-cuisine-map.js (single source of truth).

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { slugsForCats } = require('./corpus-cuisine-map');

const CORPUS_DIR = path.join(__dirname, 'data', 'corpus');
const GEO_PREFIX = 'gia:corpus:geo:';
const PLACE_PREFIX = 'gia:corpus:place:';
const LOADED_PREFIX = 'gia:corpus:loaded:';
const LOAD_BATCH = 1000;          // commands per Redis pipeline batch
const QUERY_HIT_CAP = 1500;       // max GEOSEARCH hits to scan before slug-filter

let _manifest = null;
function manifest() {
  if (_manifest) return _manifest;
  try { _manifest = JSON.parse(fs.readFileSync(path.join(CORPUS_DIR, 'manifest.json'), 'utf8')); }
  catch { _manifest = {}; }
  return _manifest;
}

function corpusHasCity(city) {
  return !!(city && manifest()[city]);
}

// Which corpus city (if any) covers a search centre — bbox check from manifest.
function corpusCityForPoint(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  for (const [city, m] of Object.entries(manifest())) {
    const b = m && m.bbox;
    if (Array.isArray(b) && lat >= b[0] && lat <= b[1] && lng >= b[2] && lng <= b[3]) return city;
  }
  return null;
}

async function isCityLoaded(redis, city) {
  if (!redis || !city) return false;
  try {
    const n = await redis.get(`${LOADED_PREFIX}${city}`);
    return Number(n) > 0;
  } catch { return false; }
}

// Load a city's shard into Redis Geo. Idempotent + skip-if-already-loaded.
async function loadCityCorpus(redis, city) {
  if (!redis || !corpusHasCity(city)) return 0;
  if (await isCityLoaded(redis, city)) return 0;
  const m = manifest()[city];
  const shard = path.join(CORPUS_DIR, m.shard);
  let rows;
  try {
    rows = JSON.parse(zlib.gunzipSync(fs.readFileSync(shard)).toString('utf8'));
  } catch (err) {
    console.warn(`[corpus] load ${city}: shard read failed: ${err.message}`);
    return 0;
  }
  const geoKey = `${GEO_PREFIX}${city}`;
  let batch = redis.multi();
  let inBatch = 0, total = 0;
  for (const r of rows) {
    if (!r || !r.id || !Number.isFinite(r.lat) || !Number.isFinite(r.lng)) continue;
    const slugs = slugsForCats(r.cats);
    batch.hSet(`${PLACE_PREFIX}${r.id}`, {
      name: r.name || '', address: r.address || '', locality: r.locality || '',
      slugs: slugs.join(','), website: r.website || '', instagram: r.instagram || ''
    });
    batch.sendCommand(['GEOADD', geoKey, String(r.lng), String(r.lat), r.id]);
    inBatch += 2; total++;
    if (inBatch >= LOAD_BATCH * 2) { await batch.exec().catch(() => {}); batch = redis.multi(); inBatch = 0; }
  }
  if (inBatch) await batch.exec().catch(() => {});
  await redis.set(`${LOADED_PREFIX}${city}`, String(total)).catch(() => {});
  console.log(`[corpus] loaded ${city}: ${total} venues into Redis Geo`);
  return total;
}

// Load the listed cities in the BACKGROUND (does not block boot).
function warmCitiesInBackground(redis, cities) {
  (async () => {
    for (const city of cities) {
      try { await loadCityCorpus(redis, city); }
      catch (err) { console.warn(`[corpus] warm ${city} failed: ${err.message}`); }
    }
  })();
}

// queryCorpus — radius + cuisine-slug search over a city's corpus.
//   opts: { city, lat, lng, radiusM, slugs:[], limit }
// Returns venue objects in the pipeline shape (placeId:null, rating:null until
// lazily enriched), nearest-first, with distanceM set from GEOSEARCH.
// Returns [] when the city isn't loaded yet (caller falls back to live Places).
async function queryCorpus(redis, { city, lat, lng, radiusM, slugs = [], limit = 400 } = {}) {
  if (!redis || !city) return [];
  if (!(await isCityLoaded(redis, city))) return [];
  if (!redis.isOpen) { try { await redis.connect(); } catch { return []; } }
  let hits;
  try {
    hits = await redis.sendCommand([
      'GEOSEARCH', `${GEO_PREFIX}${city}`,
      'FROMLONLAT', String(lng), String(lat),
      'BYRADIUS', String(Math.max(1, Math.round(radiusM || 5000))), 'm',
      'ASC', 'WITHCOORD', 'WITHDIST', 'COUNT', String(QUERY_HIT_CAP)
    ]);
  } catch (err) {
    console.warn(`[corpus] GEOSEARCH ${city} failed: ${err.message}`);
    return [];
  }
  if (!Array.isArray(hits) || !hits.length) return [];
  const want = new Set((slugs || []).map((s) => String(s).toLowerCase()));
  const out = [];
  for (const row of hits) {
    if (out.length >= limit) break;
    const id = Array.isArray(row) ? row[0] : row;
    const distM = Array.isArray(row) ? Number(row[1]) : null;
    const coord = Array.isArray(row) && Array.isArray(row[2]) ? row[2] : null;
    const meta = await redis.hGetAll(`${PLACE_PREFIX}${id}`).catch(() => ({}));
    if (!meta || !meta.name) continue;
    const rowSlugs = (meta.slugs || '').split(',').filter(Boolean);
    if (want.size && !rowSlugs.some((s) => want.has(s))) continue;   // cuisine filter
    out.push({
      id,
      placeId: null,                       // filled lazily by corpus-enrich
      name: meta.name,
      area: meta.locality || meta.address || '',
      address: meta.address || '',
      lat: coord ? Number(coord[1]) : null,
      lng: coord ? Number(coord[0]) : null,
      distanceM: Number.isFinite(distM) ? Math.round(distM) : null,
      rating: null, userRatingCount: null,
      primaryType: 'restaurant',
      businessStatus: null,
      slugs: rowSlugs,
      website: meta.website || '',
      instagram: meta.instagram || '',
      source: 'corpus'
    });
  }
  return out;
}

module.exports = {
  corpusHasCity, corpusCityForPoint, isCityLoaded,
  loadCityCorpus, warmCitiesInBackground, queryCorpus,
  GEO_PREFIX, PLACE_PREFIX, LOADED_PREFIX
};
