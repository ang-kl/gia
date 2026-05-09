#!/usr/bin/env node
// scripts/fetch-hawker-coords.js — v0.60.52
//
// One-shot fetcher for Singapore hawker centre coordinates.
//
// Sources, in order:
//   1. data.gov.sg public dataset (v0.60.40 — primary)
//      resource_id = d_4a086da0a5553be1d89383cd90d07ecd
//      "Dates of Hawker Centres Closure". Only includes centres
//      that have closure dates announced — covers ~31/122.
//   2. OneMap SG forward-geocode (v0.60.52 — fallback)
//      Free SG-government search API (no API key for the basic
//      endpoint). Tries the centre name, then postal code, then
//      address. Sanity-bounded to Singapore (lat 1.15–1.50,
//      lng 103.55–104.10). Covers most of the remaining 91.
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

// Singapore bounding box — used to sanity-check OneMap matches in
// case it hits a same-name place outside SG (rare but possible).
const SG_BOUNDS = { latMin: 1.15, latMax: 1.50, lngMin: 103.55, lngMax: 104.10 };

const dryRun = process.argv.includes('--dry');
const skipOneMap = process.argv.includes('--no-onemap');

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
  // v0.60.52 — start from whatever's already in OUT_PATH so we
  // never lose curated coords if data.gov.sg goes down or rate-
  // limits us. Each subsequent source merges in additively.
  const finalMap = loadExistingOutput();
  const seedCount = Object.keys(finalMap).length;
  if (seedCount) console.log(`[fetch-hawker-coords] seeded from existing ${OUT_PATH} (${seedCount} entries)`);

  // ----- Source 1: data.gov.sg (best-effort) -----
  let datagovExact = 0;
  let datagovFuzzy = 0;
  try {
    console.log(`[fetch-hawker-coords] GET ${URL}`);
    const body = await fetchJson(URL);
    const records = body?.result?.records || [];
    console.log(`[fetch-hawker-coords] dataset rows: ${records.length}`);

    // Derive coords. Field names per data.gov.sg: name, latitude_hc,
    // longitude_hc (verify on first run; older snapshots used
    // `latitude` / `longitude`). Be tolerant of both.
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

    const vault = require('../hawker-vault');
    const ourCentres = vault.getAllCentres();
    const fuzzyMap = new Map();
    for (const [k, v] of Object.entries(coords)) fuzzyMap.set(normalise(k), { name: k, ...v });
    for (const c of ourCentres) {
      if (finalMap[c.name]) continue; // already have it
      if (coords[c.name]) {
        finalMap[c.name] = coords[c.name];
        datagovExact++;
        continue;
      }
      const fz = fuzzyMap.get(normalise(c.name));
      if (fz) {
        finalMap[c.name] = { lat: fz.lat, lng: fz.lng };
        datagovFuzzy++;
      }
    }
  } catch (err) {
    console.warn(`[fetch-hawker-coords] data.gov.sg unreachable (${err.message}) — skipping, will fall through to OneMap`);
  }

  const vault = require('../hawker-vault');
  const ourCentres = vault.getAllCentres();
  const total = ourCentres.length;
  const newFromDatagov = datagovExact + datagovFuzzy;
  console.log(`[fetch-hawker-coords] data.gov.sg added: ${datagovExact} exact + ${datagovFuzzy} fuzzy = ${newFromDatagov} new entries`);
  let matchedExact = 0; // legacy var names retained for downstream log shape
  let matchedFuzzy = 0;
  matchedExact = datagovExact;
  matchedFuzzy = datagovFuzzy;
  console.log(`[fetch-hawker-coords] matched (data.gov.sg): ${matchedExact} exact + ${matchedFuzzy} fuzzy = ${matchedExact + matchedFuzzy}/${total}`);

  // ----- OneMap fallback for the still-uncovered centres -----
  if (!skipOneMap) {
    const stillMissing = ourCentres.filter((c) => !finalMap[c.name]);
    console.log(`[fetch-hawker-coords] OneMap pass: ${stillMissing.length} centres still missing coords`);
    let onemapHits = 0;
    let onemapSkipped = 0;
    for (const c of stillMissing) {
      // Try, in order: full centre name, postal code, address.
      const queries = [c.name, c.postal, c.address].filter(Boolean);
      let geo = null;
      for (const q of queries) {
        // eslint-disable-next-line no-await-in-loop
        geo = await onemapSearch(q);
        if (geo) break;
        // Be polite to OneMap: 200ms between requests.
        // eslint-disable-next-line no-await-in-loop
        await sleep(200);
      }
      if (geo) {
        finalMap[c.name] = geo;
        onemapHits++;
        console.log(`  ✓ ${c.name} → ${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)}`);
      } else {
        onemapSkipped++;
        console.log(`  ✗ ${c.name} — no OneMap match (tried: ${queries.length} queries)`);
      }
    }
    console.log(`[fetch-hawker-coords] OneMap recovered: ${onemapHits} (skipped ${onemapSkipped})`);
  }

  const finalCount = Object.keys(finalMap).length;
  console.log(`[fetch-hawker-coords] FINAL coverage: ${finalCount}/${total}`);

  if (dryRun) {
    console.log('[fetch-hawker-coords] --dry: skipping write');
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(finalMap, null, 2) + '\n', 'utf8');
  console.log(`[fetch-hawker-coords] wrote ${finalCount} entries → ${OUT_PATH}`);
})().catch((err) => {
  console.error('[fetch-hawker-coords] failed:', err.message);
  process.exit(1);
});

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadExistingOutput() {
  try {
    const raw = fs.readFileSync(OUT_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(parsed)) {
        const lat = Number(v?.lat);
        const lng = Number(v?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) out[k] = { lat, lng };
      }
      return out;
    }
  } catch { /* file missing / corrupt — start empty */ }
  return {};
}

// OneMap forward-geocode. Returns { lat, lng } | null. Filters to
// Singapore bounds so we don't accidentally pick a same-named
// venue elsewhere (e.g. "Holland Village" in another country).
async function onemapSearch(query) {
  const q = String(query || '').trim();
  if (!q) return null;
  const u = `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${encodeURIComponent(q)}&returnGeom=Y&getAddrDetails=Y&pageNum=1`;
  let body;
  try {
    body = await fetchJson(u);
  } catch (err) {
    console.warn(`  ! OneMap "${q}" — ${err.message}`);
    return null;
  }
  const results = Array.isArray(body?.results) ? body.results : [];
  for (const r of results) {
    const lat = Number(r.LATITUDE);
    const lng = Number(r.LONGITUDE);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < SG_BOUNDS.latMin || lat > SG_BOUNDS.latMax) continue;
    if (lng < SG_BOUNDS.lngMin || lng > SG_BOUNDS.lngMax) continue;
    return { lat, lng };
  }
  return null;
}
