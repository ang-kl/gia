#!/usr/bin/env node
// sync-vault.js — verified data migration to the soleat Redis Vault.
//
// Resolves inputs from (priority order):
//   1. CLI flag --json=<path>            single Saved Places.json
//   2. CLI flag --html=<path>            HTML with map URLs (cheerio)
//   3. CLI flag --kmz=<path>             single KMZ
//   4. Auto-scan data/Saved Places.json + data/My Maps/*.kmz
//   5. Hardcoded URL fallback list
//
// Per location:
//   - Resolve to a Place ID via Places (New) searchText or directly
//     from a parsed url.
//   - Place Details with FieldMask:
//       id, businessStatus, regularOpeningHours, location,
//       displayName, formattedAddress, primaryType
//   - Strict gate: business_status === 'OPERATIONAL'.
//   - Singapore geo-fence by default (lat 1.15-1.50, lng 103.6-104.1).
//     CLI flag --no-fence disables.
//   - GEOADD gia:vault, HSET gia:place:<id>.
//   - Skips logged to migration_audit.log AND console AND
//     gia:vault:cleanup Redis list.
//
// Usage:
//   railway run node sync-vault.js
//   GOOGLE_MAPS_API_KEY=… REDIS_URL=… node sync-vault.js
//   node sync-vault.js --no-fence
//   node sync-vault.js --json=data/Saved\ Places.json

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('redis');
const cheerio = require('cheerio');
const AdmZip = require('adm-zip');
require('dotenv').config();

const PLACES_BASE = 'https://places.googleapis.com/v1/places';
const PLACES_TEXT = `${PLACES_BASE}:searchText`;
const VAULT_GEO_KEY = 'gia:vault';
const VAULT_HASH_PREFIX = 'gia:place:';
const VAULT_CLEANUP_LIST = 'gia:vault:cleanup';
const AUDIT_LOG_FILE = 'migration_audit.log';
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
const PLACE_DETAILS_FIELDS = [
  'id', 'businessStatus', 'regularOpeningHours', 'location',
  'displayName', 'formattedAddress', 'primaryType', 'googleMapsLinks',
  'generativeSummary'
].join(',');

// Singapore bounding box (rough: Tuas → Changi, north of equator)
const SG_FENCE = { latMin: 1.15, latMax: 1.50, lngMin: 103.55, lngMax: 104.10 };

const HARDCODED_URLS = [
  'https://maps.app.goo.gl/v32FSZtCcWxmt4tW6?g_st=i',
  'https://maps.app.goo.gl/9Es6p6h5earnLHyk7?g_st=i',
  'https://maps.app.goo.gl/72STf7BwtHWWXbEC7?g_st=i',
  'https://maps.app.goo.gl/GWgVJtTa9J9uU74G9?g_st=i',
  'https://maps.app.goo.gl/3ziPWTxP5cRzRsjA8?g_st=i',
  'https://maps.app.goo.gl/HxEMMPufgi3dGwhP8?g_st=i',
  'https://maps.app.goo.gl/Pr5q7xSqCoSsbHCJA?g_st=i',
  'https://maps.app.goo.gl/NN4vB9wH3kgQN7VX8?g_st=i',
  'https://maps.app.goo.gl/YgKvsSZfCzDdPCSX6?g_st=i',
  'https://maps.app.goo.gl/rKfgmmBvHhtiXJq79?g_st=i',
  'https://maps.app.goo.gl/GpcwimB59mYx3jna6?g_st=i',
  'https://maps.app.goo.gl/mEiNi3W1PSgrhua3A?g_st=i',
  'https://maps.app.goo.gl/oAAvxLQ5RnWou9zG6?g_st=i',
  'https://maps.app.goo.gl/cuHSjJmLcuB32uV47?g_st=i'
];

const argv = process.argv.slice(2);
const FENCE_DISABLED = argv.includes('--no-fence');
const FLAG_JSON = argv.find((a) => a.startsWith('--json='));
const FLAG_HTML = argv.find((a) => a.startsWith('--html='));
const FLAG_KMZ = argv.find((a) => a.startsWith('--kmz='));

function inSingapore(lat, lng) {
  if (FENCE_DISABLED) return true;
  return lat >= SG_FENCE.latMin && lat <= SG_FENCE.latMax &&
         lng >= SG_FENCE.lngMin && lng <= SG_FENCE.lngMax;
}

function requireEnv(name) {
  if (!process.env[name]) {
    console.error(`[Fatal] Missing env: ${name}`);
    process.exit(1);
  }
}

async function withConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        results[i] = await worker(items[i], i);
      } catch (err) {
        results[i] = { ok: false, error: err.message, item: items[i] };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  return results;
}

async function retry(fn, label) {
  let lastErr;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try { return await fn(); }
    catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status !== 429 && status !== 503 && !(err.code && /ETIMEDOUT|ECONNRESET/.test(err.code))) throw err;
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Retry] ${label} status=${status ?? err.code} attempt=${attempt + 1} sleeping=${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// === Input parsers ===

function parseSavedPlacesJson(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) return [];
  const out = [];
  for (const f of data.features) {
    const p = f.properties ?? {};
    const coords = f.geometry?.coordinates ?? [0, 0];
    let lng = Number(coords[0]);
    let lat = Number(coords[1]);
    const url = p.google_maps_url ?? '';
    // Recover coords from URL ?q=<lat>,<lng> when geometry is [0,0]
    if ((!Number.isFinite(lat) || lat === 0) || (!Number.isFinite(lng) || lng === 0)) {
      const qm = url.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (qm) { lat = parseFloat(qm[1]); lng = parseFloat(qm[2]); }
    }
    out.push({
      source: 'json',
      name: p.location?.name ?? null,
      address: p.location?.address ?? null,
      countryCode: p.location?.country_code ?? null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
      url
    });
  }
  return out;
}

function parseHtmlForMapUrls(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  const urls = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (href.includes('maps.app.goo.gl') || href.includes('goo.gl/maps') ||
        /https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\//i.test(href) ||
        /https?:\/\/maps\.google\./i.test(href)) {
      urls.add(href.trim());
    }
  });
  return [...urls].map((u) => ({ source: 'html', name: null, address: null, lat: null, lng: null, url: u }));
}

function parseKmzFile(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const kml = zip.getEntries().find((e) => /\.kml$/i.test(e.entryName));
    if (!kml) return [];
    const xml = kml.getData().toString('utf8');
    const $ = cheerio.load(xml, { xmlMode: true });
    const out = [];
    $('Placemark').each((_, el) => {
      const $el = $(el);
      const name = $el.children('name').first().text().trim() || null;
      const description = $el.children('description').first().text().trim() || null;
      const coordRaw = $el.find('Point > coordinates').first().text().trim();
      let lat = null, lng = null;
      if (coordRaw) {
        const [lon, latv] = coordRaw.split(',').map((n) => parseFloat(n));
        if (Number.isFinite(lon) && Number.isFinite(latv)) { lng = lon; lat = latv; }
      }
      out.push({ source: `kmz:${path.basename(filePath)}`, name, address: description, lat, lng, url: null });
    });
    return out;
  } catch (err) {
    console.warn(`[KMZ] parse failed for ${filePath}:`, err.message);
    return [];
  }
}

function resolveInputs() {
  if (FLAG_JSON) {
    const items = parseSavedPlacesJson(FLAG_JSON.slice('--json='.length));
    console.log(`[Sync] CLI --json → ${items.length} items`);
    return items;
  }
  if (FLAG_HTML) {
    const items = parseHtmlForMapUrls(FLAG_HTML.slice('--html='.length));
    console.log(`[Sync] CLI --html → ${items.length} items`);
    return items;
  }
  if (FLAG_KMZ) {
    const items = parseKmzFile(FLAG_KMZ.slice('--kmz='.length));
    console.log(`[Sync] CLI --kmz → ${items.length} items`);
    return items;
  }
  // Auto-scan
  const items = [];
  const jsonPath = path.join(__dirname, 'data', 'Saved Places.json');
  if (fs.existsSync(jsonPath)) {
    const j = parseSavedPlacesJson(jsonPath);
    console.log(`[Sync] Auto: ${jsonPath} → ${j.length} items`);
    items.push(...j);
  }
  const myMapsDir = path.join(__dirname, 'data', 'My Maps');
  if (fs.existsSync(myMapsDir)) {
    for (const fn of fs.readdirSync(myMapsDir)) {
      if (!/\.kmz$/i.test(fn)) continue;
      const k = parseKmzFile(path.join(myMapsDir, fn));
      console.log(`[Sync] Auto: My Maps/${fn} → ${k.length} placemarks`);
      items.push(...k);
    }
  }
  if (items.length) return items;
  console.log(`[Sync] No data files — falling back to ${HARDCODED_URLS.length} hardcoded URLs.`);
  return HARDCODED_URLS.map((u) => ({ source: 'hardcoded', name: null, address: null, lat: null, lng: null, url: u }));
}

// === Place ID resolution ===

async function expandShortUrl(url) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await axios.get(current, {
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 soleat-vault-sync' }
    });
    if (res.status >= 300 && res.status < 400 && res.headers.location) current = res.headers.location;
    else return current;
  }
  return current;
}

function parseLongMapsUrl(longUrl) {
  const placeMatch = longUrl.match(/\/maps\/place\/([^/]+)\/@(-?[\d.]+),(-?[\d.]+)/);
  if (placeMatch) return { name: decodeURIComponent(placeMatch[1]).replace(/\+/g, ' '), lat: parseFloat(placeMatch[2]), lng: parseFloat(placeMatch[3]) };
  const cidMatch = longUrl.match(/[?&]cid=(\d+)/);
  const search = longUrl.match(/\/maps\/search\/([^/?]+)/);
  if (search) return { name: decodeURIComponent(search[1]).replace(/\+/g, ' '), lat: null, lng: null, cid: cidMatch?.[1] };
  return { name: null, lat: null, lng: null, cid: cidMatch?.[1] ?? null };
}

async function resolvePlaceId(item) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  // Use name + locationBias if we have one
  let name = item.name;
  let lat = item.lat;
  let lng = item.lng;
  if (item.url && !name) {
    try {
      const longUrl = await expandShortUrl(item.url);
      const parsed = parseLongMapsUrl(longUrl);
      name = parsed.name || name;
      if (parsed.lat && parsed.lng) { lat = parsed.lat; lng = parsed.lng; }
    } catch (err) {
      // fall through; might still work via name search
    }
  }
  if (!name && (!Number.isFinite(lat) || !Number.isFinite(lng))) return null;

  const body = {
    textQuery: name ? `${name} Singapore` : `${lat},${lng}`,
    maxResultCount: 1
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 100 } };
  }
  const { data } = await retry(
    () => axios.post(PLACES_TEXT, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id'
      },
      timeout: 8000
    }),
    `searchText "${name ?? `${lat},${lng}`}"`
  );
  return data?.places?.[0]?.id || null;
}

async function fetchPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const { data } = await retry(
    () => axios.get(`${PLACES_BASE}/${placeId}`, {
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACE_DETAILS_FIELDS },
      timeout: 8000
    }),
    `Place Details ${placeId}`
  );
  return data;
}

async function vaultUpsert(redis, place, sourceTag) {
  const g = place.generativeSummary;
  const generativeOverview = g?.overview?.text?.trim() || '';
  const generativeDisclosure = (g?.disclosureText?.text || g?.disclaimerText?.text || (generativeOverview ? 'Summarized with Gemini' : '')).trim();
  await redis.hSet(`${VAULT_HASH_PREFIX}${place.id}`, {
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    primaryType: place.primaryType ?? '',
    hours: JSON.stringify(place.regularOpeningHours ?? {}),
    businessStatus: place.businessStatus ?? '',
    placeUri: place.googleMapsLinks?.placeUri ?? '',
    directionsUri: place.googleMapsLinks?.directionsUri ?? '',
    reviewsUri: place.googleMapsLinks?.reviewsUri ?? '',
    photosUri: place.googleMapsLinks?.photosUri ?? '',
    generativeOverview,
    generativeDisclosure,
    generativeFlagUri: g?.overviewFlagContentUri || '',
    source: sourceTag
  });
  await redis.sendCommand([
    'GEOADD', VAULT_GEO_KEY,
    String(place.location.longitude),
    String(place.location.latitude),
    place.id
  ]);
}

async function logSkip(redis, item, reason) {
  const id = item.url || `${item.name ?? '<noname>'} (${item.lat},${item.lng})`;
  const entry = `${new Date().toISOString()} src=${item.source} ${id} :: ${reason}`;
  console.warn(`[Skip] ${entry}`);
  try { fs.appendFileSync(AUDIT_LOG_FILE, entry + '\n'); } catch { /* fs may be ephemeral */ }
  try { await redis.lPush(VAULT_CLEANUP_LIST, entry); } catch { /* console + file is enough */ }
}

async function main() {
  requireEnv('GOOGLE_MAPS_API_KEY');
  requireEnv('REDIS_URL');
  const redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', (e) => console.error('[Redis]', e.message));
  await redis.connect();

  const items = resolveInputs();
  if (!items.length) {
    console.error('[Fatal] No items to process.');
    await redis.quit();
    process.exit(1);
  }
  console.log(`[Sync] Processing ${items.length} items (concurrency ${CONCURRENCY}, geo-fence=${FENCE_DISABLED ? 'OFF' : 'Singapore'})…`);

  let imported = 0, fenced = 0, skippedClosed = 0, failed = 0;

  await withConcurrency(items, CONCURRENCY, async (item) => {
    try {
      // Coarse fence — drop on file-level coords if obviously out of scope.
      if (Number.isFinite(item.lat) && Number.isFinite(item.lng) && !inSingapore(item.lat, item.lng)) {
        await logSkip(redis, item, `fenced_outside_singapore lat=${item.lat} lng=${item.lng}`);
        fenced++;
        return;
      }
      const placeId = await resolvePlaceId(item);
      if (!placeId) {
        await logSkip(redis, item, `place_id_unresolved name="${item.name ?? ''}"`);
        failed++;
        return;
      }
      const details = await fetchPlaceDetails(placeId);
      if (!details.location?.latitude || !details.location?.longitude) {
        await logSkip(redis, item, `missing_location placeId=${placeId}`);
        failed++;
        return;
      }
      // Re-check fence on resolved coords (canonical Place location).
      if (!inSingapore(details.location.latitude, details.location.longitude)) {
        await logSkip(redis, item, `fenced_after_resolve placeId=${placeId} lat=${details.location.latitude} lng=${details.location.longitude}`);
        fenced++;
        return;
      }
      if ((details.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') {
        await logSkip(redis, item, `business_status=${details.businessStatus} placeId=${placeId} name="${details.displayName?.text}"`);
        skippedClosed++;
        return;
      }
      await vaultUpsert(redis, details, item.source);
      imported++;
      console.log(`[Sync]  ${details.displayName?.text} (${placeId})`);
    } catch (err) {
      failed++;
      await logSkip(redis, item, `exception=${err.message}`);
    }
  });

  const vaultCount = await redis.sendCommand(['ZCARD', VAULT_GEO_KEY]).catch(() => null);
  console.log('\n[Sync] Done.');
  console.log(`[Sync]   imported: ${imported}`);
  console.log(`[Sync]   skipped (closed/non-operational): ${skippedClosed}`);
  console.log(`[Sync]   fenced (outside Singapore): ${fenced}`);
  console.log(`[Sync]   failed (resolve/fetch): ${failed}`);
  console.log(`[Sync]   vault size now: ${vaultCount}`);
  console.log(`[Sync]   audit log file: ${AUDIT_LOG_FILE}`);
  console.log(`[Sync]   redis cleanup list: LRANGE ${VAULT_CLEANUP_LIST} 0 -1`);

  await redis.quit();
}

main().catch((err) => { console.error('[Fatal]', err.message); process.exit(1); });
