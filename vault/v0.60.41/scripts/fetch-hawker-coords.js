#!/usr/bin/env node
// scripts/fetch-hawker-coords.js — v0.60.40
//
// One-shot fetcher for Singapore hawker centre coordinates.
//
// Source: data.gov.sg public dataset
//   resource_id = d_4a086da0a5553be1d89383cd90d07ecd
//   "Dates of Hawker Centres Closure"
//   (the only public hawker-centre dataset with lat/lng).
//
// Output: data/hawker-coords.json — { "<centre name>": { lat, lng } }
//
// Usage:
//   node scripts/fetch-hawker-coords.js          # fetch + write
//   node scripts/fetch-hawker-coords.js --dry    # show match count, no write
//
// Run once after merging this PR. Commit the resulting JSON. The
// hawker-vault.js loader picks it up automatically and the TMA's
// "🗺 View N Hawker Centres on the map" button starts opening the
// soleat /app/map multi-pin TMA instead of a Google Maps text query.
//
// Re-run when:
//   - data.gov.sg refreshes the dataset (new centres / corrections)
//   - data/list-of-hawker-centres.md adds an entry without coords

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATASET_ID = 'd_4a086da0a5553be1d89383cd90d07ecd';
const URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=200`;
const OUT_PATH = path.join(__dirname, '..', 'data', 'hawker-coords.json');

const dryRun = process.argv.includes('--dry');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
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

// Normalise hawker centre names so tiny spelling differences between
// data.gov.sg and our MD file match. Lowercase, drop punctuation,
// collapse whitespace, strip filler words ("food centre", "market",
// "complex"). Same shape as hawker-vault.js normaliseName.
function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.,()/\\\-]/g, ' ')
    .replace(/\b(centre|center|market|food|hawker|complex|cooked|stalls?)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

(async function main() {
  console.log(`[fetch-hawker-coords] GET ${URL}`);
  const body = await fetchJson(URL);
  const records = body?.result?.records || [];
  if (!records.length) {
    console.error('[fetch-hawker-coords] no records returned — aborting');
    process.exit(1);
  }
  console.log(`[fetch-hawker-coords] dataset rows: ${records.length}`);

  // Derive coords. Field names per data.gov.sg: name, latitude_hc,
  // longitude_hc (verify on first run; older snapshots used `latitude`
  // / `longitude`). Be tolerant of both.
  const coords = {};
  let withCoords = 0;
  for (const r of records) {
    const name = String(r.name || r.hawker_centre || '').trim();
    if (!name) continue;
    const lat = Number(r.latitude_hc ?? r.latitude ?? r.lat ?? r.y);
    const lng = Number(r.longitude_hc ?? r.longitude ?? r.lng ?? r.x);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    coords[name] = { lat, lng };
    withCoords++;
  }
  console.log(`[fetch-hawker-coords] rows with lat/lng: ${withCoords}`);

  // Cross-reference with our MD vault for match-rate visibility.
  const vault = require('../hawker-vault');
  const ourCentres = vault.getAllCentres();
  let matchedExact = 0;
  let matchedFuzzy = 0;
  const fuzzyMap = new Map();
  for (const [k, v] of Object.entries(coords)) fuzzyMap.set(normalise(k), { name: k, ...v });
  const finalMap = {};
  for (const c of ourCentres) {
    if (coords[c.name]) {
      finalMap[c.name] = coords[c.name];
      matchedExact++;
      continue;
    }
    const fz = fuzzyMap.get(normalise(c.name));
    if (fz) {
      finalMap[c.name] = { lat: fz.lat, lng: fz.lng };
      matchedFuzzy++;
    }
  }
  const total = ourCentres.length;
  console.log(`[fetch-hawker-coords] matched: ${matchedExact} exact + ${matchedFuzzy} fuzzy = ${matchedExact + matchedFuzzy}/${total}`);

  if (dryRun) {
    console.log('[fetch-hawker-coords] --dry: skipping write');
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(finalMap, null, 2) + '\n', 'utf8');
  console.log(`[fetch-hawker-coords] wrote ${Object.keys(finalMap).length} entries → ${OUT_PATH}`);
})().catch((err) => {
  console.error('[fetch-hawker-coords] failed:', err.message);
  process.exit(1);
});
