#!/usr/bin/env node
// sync-vault.js — one-shot importer for the soleat Redis Vault.
//
// Resolves Google Maps short URLs → Place IDs → Place Details (filtered
// by business_status === 'OPERATIONAL') → GEOADD + HSET into Redis.
//
// Usage (locally with Railway env vars or .env):
//   GOOGLE_MAPS_API_KEY=… REDIS_URL=… node sync-vault.js
//
// Or with railway CLI:
//   railway run node sync-vault.js

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('redis');
const cheerio = require('cheerio');
require('dotenv').config();

const PLACES_BASE = 'https://places.googleapis.com/v1/places';
const PLACES_TEXT = `${PLACES_BASE}:searchText`;
const VAULT_GEO_KEY = 'gia:vault';
const VAULT_HASH_PREFIX = 'gia:place:';
const VAULT_CLEANUP_LIST = 'gia:vault:cleanup';
const CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
const PLACE_DETAILS_FIELDS = [
  'id',
  'businessStatus',
  'regularOpeningHours',
  'location',
  'displayName',
  'formattedAddress',
  'primaryType'
].join(',');

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

// Resolve URLs from (in priority order):
//   1. CLI arg --html=<path> (parse with cheerio)
//   2. data/Saved Places.html (auto-detect, parse with cheerio)
//   3. Any data/*.html that contains maps.app.goo.gl or maps.google.com links
//   4. HARDCODED_URLS fallback
function resolveUrlSet() {
  const argv = process.argv.slice(2);
  const htmlArg = argv.find((a) => a.startsWith('--html='));
  if (htmlArg) {
    const file = htmlArg.slice('--html='.length);
    const urls = parseHtmlForMapUrls(file);
    console.log(`[Sync] CLI --html=${file} → ${urls.length} URL(s)`);
    return urls;
  }
  const candidate = path.join(__dirname, 'data', 'Saved Places.html');
  if (fs.existsSync(candidate)) {
    const urls = parseHtmlForMapUrls(candidate);
    if (urls.length) {
      console.log(`[Sync] Auto-detected ${candidate} → ${urls.length} URL(s)`);
      return urls;
    }
  }
  console.log(`[Sync] No HTML input — using hardcoded URL list (${HARDCODED_URLS.length}).`);
  return HARDCODED_URLS;
}

function parseHtmlForMapUrls(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const $ = cheerio.load(html);
  const urls = new Set();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') ?? '';
    if (
      href.includes('maps.app.goo.gl') ||
      href.includes('goo.gl/maps') ||
      /https?:\/\/(?:www\.)?google\.[a-z.]+\/maps\//i.test(href) ||
      /https?:\/\/maps\.google\./i.test(href)
    ) {
      urls.add(href.trim());
    }
  });
  return [...urls];
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
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err.response?.status;
      if (status !== 429 && status !== 503 && !(err.code && /ETIMEDOUT|ECONNRESET/.test(err.code))) {
        throw err;
      }
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.warn(`[Retry] ${label} status=${status ?? err.code} attempt=${attempt + 1} sleeping=${delay}ms`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

async function expandShortUrl(url) {
  let current = url;
  for (let hop = 0; hop < 5; hop++) {
    const res = await axios.get(current, {
      maxRedirects: 0,
      validateStatus: (s) => s >= 200 && s < 400,
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 soleat-vault-sync' }
    });
    if (res.status >= 300 && res.status < 400 && res.headers.location) {
      current = res.headers.location;
    } else {
      return current;
    }
  }
  return current;
}

function parseLongMapsUrl(longUrl) {
  const placeMatch = longUrl.match(/\/maps\/place\/([^/]+)\/@(-?[\d.]+),(-?[\d.]+)/);
  if (placeMatch) {
    return {
      name: decodeURIComponent(placeMatch[1]).replace(/\+/g, ' '),
      lat: parseFloat(placeMatch[2]),
      lng: parseFloat(placeMatch[3])
    };
  }
  const searchMatch = longUrl.match(/\/maps\/search\/([^/?]+)/);
  if (searchMatch) {
    return {
      name: decodeURIComponent(searchMatch[1]).replace(/\+/g, ' '),
      lat: null,
      lng: null
    };
  }
  return null;
}

async function resolvePlaceId(name, lat, lng) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const body = {
    textQuery: `${name} Singapore`,
    maxResultCount: 1
  };
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 100 } };
  }
  const { data } = await retry(
    () =>
      axios.post(PLACES_TEXT, body, {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'places.id'
        },
        timeout: 8000
      }),
    `searchText "${name}"`
  );
  return data?.places?.[0]?.id || null;
}

async function fetchPlaceDetails(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  const { data } = await retry(
    () =>
      axios.get(`${PLACES_BASE}/${placeId}`, {
        headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': PLACE_DETAILS_FIELDS },
        timeout: 8000
      }),
    `Place Details ${placeId}`
  );
  return data;
}

async function vaultUpsert(redis, place) {
  const key = `${VAULT_HASH_PREFIX}${place.id}`;
  await redis.hSet(key, {
    name: place.displayName?.text ?? '',
    address: place.formattedAddress ?? '',
    primaryType: place.primaryType ?? '',
    hours: JSON.stringify(place.regularOpeningHours ?? {}),
    businessStatus: place.businessStatus ?? ''
  });
  await redis.sendCommand([
    'GEOADD', VAULT_GEO_KEY,
    String(place.location.longitude),
    String(place.location.latitude),
    place.id
  ]);
}

async function logSkip(redis, url, reason) {
  const entry = `${new Date().toISOString()} ${url} ${reason}`;
  console.warn(`[Skip] ${entry}`);
  try {
    await redis.lPush(VAULT_CLEANUP_LIST, entry);
  } catch {
    /* console-only is fine */
  }
}

async function main() {
  requireEnv('GOOGLE_MAPS_API_KEY');
  requireEnv('REDIS_URL');
  const redis = createClient({ url: process.env.REDIS_URL });
  redis.on('error', (e) => console.error('[Redis]', e.message));
  await redis.connect();

  const urls = resolveUrlSet();
  if (!urls.length) {
    console.error('[Fatal] No URLs to process. Check --html=<path> or data/Saved Places.html.');
    await redis.quit();
    process.exit(1);
  }
  console.log(`[Sync] Processing ${urls.length} URLs (concurrency ${CONCURRENCY})…`);
  let imported = 0;
  let skipped = 0;
  let failed = 0;

  await withConcurrency(urls, CONCURRENCY, async (url) => {
    try {
      const longUrl = await expandShortUrl(url);
      const parsed = parseLongMapsUrl(longUrl);
      if (!parsed?.name) {
        await logSkip(redis, url, `unparsable_long_url=${longUrl}`);
        failed++;
        return;
      }
      const placeId = await resolvePlaceId(parsed.name, parsed.lat, parsed.lng);
      if (!placeId) {
        await logSkip(redis, url, `place_id_unresolved name="${parsed.name}"`);
        failed++;
        return;
      }
      const details = await fetchPlaceDetails(placeId);
      if ((details.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') {
        await logSkip(redis, url, `business_status=${details.businessStatus} placeId=${placeId} name="${details.displayName?.text}"`);
        skipped++;
        return;
      }
      if (!details.location?.latitude || !details.location?.longitude) {
        await logSkip(redis, url, `missing_location placeId=${placeId}`);
        failed++;
        return;
      }
      await vaultUpsert(redis, details);
      imported++;
      console.log(`[Sync]  ${details.displayName?.text} (${placeId})`);
    } catch (err) {
      failed++;
      await logSkip(redis, url, `exception=${err.message}`);
    }
  });

  const vaultCount = await redis.sendCommand(['ZCARD', VAULT_GEO_KEY]).catch(() => null);
  console.log(`\n[Sync] Done.`);
  console.log(`[Sync]   imported: ${imported}`);
  console.log(`[Sync]   skipped (closed): ${skipped}`);
  console.log(`[Sync]   failed (resolve/fetch): ${failed}`);
  console.log(`[Sync]   vault size now: ${vaultCount}`);
  console.log(`[Sync]   cleanup log: LRANGE ${VAULT_CLEANUP_LIST} 0 -1`);

  await redis.quit();
}

main().catch((err) => {
  console.error('[Fatal]', err.message);
  process.exit(1);
});
