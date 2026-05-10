#!/usr/bin/env node
// scripts/fetch-hawker-stalls.js — v0.60.59
//
// One-shot fetcher for Singapore hawker-centre stall counts + status.
//
// Source: data.gov.sg v2 API
//   resource_id = d_4a086da0a5553be1d89383cd90d07ecd
//   "Hawker Centres (GEOJSON)" — managed by National Environment Agency
//
// History: this resource id used to host "Dates of Hawker Centres
// Closure" (the closures dataset). Some time before 2026-05 NEA
// retired the closures dataset and reused the same id for a richer
// GeoJSON dataset that includes per-centre stall counts and status.
// The legacy CKAN endpoint (/api/action/datastore_search) was also
// retired in favour of the v2 poll-download flow:
//   1. POST/GET <prefix>/datasets/<id>/poll-download → returns
//      { code, data: { url, status }, errorMsg }
//   2. GET data.url → the actual GeoJSON file
//
// Output: data/hawker-stalls.json
//   { "Maxwell Food Centre": { stalls: 64, status: "Existing" }, ... }
//
// Usage:
//   node scripts/fetch-hawker-stalls.js
//   node scripts/fetch-hawker-stalls.js --dry
//
// Re-run quarterly when NEA refreshes the dataset.

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATASET_ID = 'd_4a086da0a5553be1d89383cd90d07ecd';
const POLL_URL = `https://api-production.data.gov.sg/v2/public/api/datasets/${DATASET_ID}/poll-download`;
const OUT_PATH = path.join(__dirname, '..', 'data', 'hawker-stalls.json');

const dryRun = process.argv.includes('--dry');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        try { resolve(JSON.parse(buf)); }
        catch (err) { reject(err); }
      });
    }).on('error', reject);
  });
}

// poll-download v2: usually returns the signed URL on the first call
// (data.url populated immediately). Some larger datasets need a few
// polls until status === 'COMPLETED'. Cap at ~15 s.
async function pollDownload(url, attempts = 30) {
  for (let i = 0; i < attempts; i++) {
    const r = await fetchJson(url);
    const data = r?.data || {};
    if (data.url) return data.url;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error('poll-download timed out without producing a URL');
}

(async function main() {
  console.log(`[fetch-hawker-stalls] poll ${POLL_URL}`);
  let downloadUrl;
  try {
    downloadUrl = await pollDownload(POLL_URL);
  } catch (err) {
    console.error(`[fetch-hawker-stalls] poll-download failed: ${err.message}`);
    process.exit(1);
  }
  console.log('[fetch-hawker-stalls] download URL acquired, fetching GeoJSON…');

  let geojson;
  try {
    geojson = await fetchJson(downloadUrl);
  } catch (err) {
    console.error(`[fetch-hawker-stalls] GeoJSON download failed: ${err.message}`);
    process.exit(1);
  }

  const features = Array.isArray(geojson?.features) ? geojson.features : [];
  console.log(`[fetch-hawker-stalls] features: ${features.length}`);
  if (!features.length) {
    console.error('[fetch-hawker-stalls] no features in GeoJSON — aborting (would produce empty output)');
    process.exit(1);
  }

  const out = {};
  let withStalls = 0;
  let withStatus = 0;
  for (const f of features) {
    const p = f?.properties || {};
    const name = String(p.NAME || p.name || '').trim();
    if (!name) continue;
    const rawStalls = p.NUMBER_OF_COOKED_FOOD_STALLS ?? p.number_of_cooked_food_stalls;
    const stalls = Number(rawStalls);
    const status = String(p.STATUS || p.status || '').trim();
    const entry = {};
    if (Number.isFinite(stalls) && stalls > 0) {
      entry.stalls = Math.round(stalls);
      withStalls++;
    } else {
      entry.stalls = null;
    }
    if (status) {
      entry.status = status;
      withStatus++;
    } else {
      entry.status = null;
    }
    if (entry.stalls != null || entry.status) {
      out[name] = entry;
    }
  }
  console.log(`[fetch-hawker-stalls] entries: ${Object.keys(out).length} (with stalls: ${withStalls}, with status: ${withStatus})`);

  if (dryRun) {
    console.log('[fetch-hawker-stalls] --dry: skipping write');
    console.log('--- preview (first 3 entries) ---');
    Object.entries(out).slice(0, 3).forEach(([k, v]) => console.log(`  ${k}: ${JSON.stringify(v)}`));
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[fetch-hawker-stalls] wrote ${Object.keys(out).length} entries → ${OUT_PATH}`);
})().catch((err) => {
  console.error('[fetch-hawker-stalls] failed:', err.message);
  process.exit(1);
});
