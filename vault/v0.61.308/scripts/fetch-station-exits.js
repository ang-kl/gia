#!/usr/bin/env node
// scripts/fetch-station-exits.js — v0.60.231
//
// One-shot fetcher for Singapore MRT/LRT station EXIT coordinates
// (Build E 5e — the per-exit point dataset that complements the
// per-station coords already in data/mrt-coords.json).
//
// Source: data.gov.sg public dataset
//   dataset_id = d_b39d3a0871985372d7e1637193335da5
//   ("LTA MRT Station Exit (GEOJSON)")
//
// data.gov.sg serves large/geospatial datasets through a two-step
// "poll-download" flow (per the operator-supplied OpenAPI sample):
//   1. GET  /v1/public/api/datasets/<id>/poll-download
//        → { code: 0, data: { url: "<presigned file URL>" } }
//   2. GET  <data.url>  → the GeoJSON file itself
// code !== 0 means the export is still being prepared — we retry.
//
// LTA's data.gov.sg GeoJSON files carry their attributes inside an
// HTML <table> in properties.Description (not as flat JSON keys),
// so this script parses both shapes.
//
// Output: data/mrt-station-exits.json
//   { "_meta": {...}, "<Station>": [ { exit, lat, lng }, ... ], ... }
// Station keys are reconciled against data/mrt-coords.json so the
// Train TMA map can join exits to the station they belong to.
//
// Usage:
//   node scripts/fetch-station-exits.js               # fetch + write
//   node scripts/fetch-station-exits.js --dry         # parse, no write
//   node scripts/fetch-station-exits.js --from-file <path.geojson>
//                                                     # parse a local file
//   node scripts/fetch-station-exits.js --raw-out <path.geojson>
//                                                     # also save raw GeoJSON
//
// Run once where api-open.data.gov.sg is reachable, then commit the
// resulting data/mrt-station-exits.json.

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATASET_ID = 'd_b39d3a0871985372d7e1637193335da5';
const POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/poll-download`;
const OUT_PATH = path.join(__dirname, '..', 'data', 'mrt-station-exits.json');
const COORDS_PATH = path.join(__dirname, '..', 'data', 'mrt-coords.json');

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry');
const fromFile = argFlag('--from-file');
const rawOut = argFlag('--raw-out');

function argFlag(name) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// GET that follows one level of redirect and returns the raw body
// text. data.gov.sg's poll-download data.url is a presigned URL that
// occasionally 30x-redirects to the storage backend.
function fetchText(url, redirectsLeft = 3) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const { statusCode, headers } = res;
      if (statusCode >= 300 && statusCode < 400 && headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('too many redirects'));
        return resolve(fetchText(headers.location, redirectsLeft - 1));
      }
      if (statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${statusCode}`));
      }
      let buf = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { buf += c; });
      res.on('end', () => resolve(buf));
    }).on('error', reject);
  });
}

// data.gov.sg poll-download. Returns the GeoJSON text. Retries while
// the server reports the export is still being generated.
async function downloadDataset() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    console.log(`[fetch-station-exits] poll-download attempt ${attempt} → ${POLL_URL}`);
    const json = JSON.parse(await fetchText(POLL_URL));
    if (json.code === 0 && json.data && json.data.url) {
      console.log('[fetch-station-exits] export ready — downloading file');
      return fetchText(json.data.url);
    }
    const msg = json.errMsg || `code ${json.code}`;
    console.log(`[fetch-station-exits] not ready (${msg}) — waiting 3s`);
    await sleep(3000);
  }
  throw new Error('poll-download never returned a ready file URL');
}

// LTA GeoJSON keeps attributes in an HTML table inside
// properties.Description. Pull every <th>KEY</th><td>VALUE</td> pair.
function parseDescription(html) {
  const out = {};
  if (!html) return out;
  const re = /<th[^>]*>\s*([^<]+?)\s*<\/th>\s*<td[^>]*>\s*([^<]*?)\s*<\/td>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    out[m[1].trim().toUpperCase()] = m[2].trim();
  }
  return out;
}

// Read a feature's attributes from either flat properties or the
// HTML Description table.
function featureAttrs(props) {
  const flat = {};
  for (const [k, v] of Object.entries(props || {})) {
    if (typeof v === 'string' || typeof v === 'number') {
      flat[String(k).toUpperCase()] = v;
    }
  }
  const fromHtml = parseDescription(props && props.Description);
  return Object.assign({}, fromHtml, flat);
}

// Normalise a station name so the GeoJSON's "ADMIRALTY MRT STATION"
// matches the "Admiralty" key used in data/mrt-coords.json.
function normalise(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[.,()/\\\-]/g, ' ')
    .replace(/\b(mrt|lrt|station|interchange)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim();
}

// "Exit A" / "EXIT 1" / "A" → "A" / "1". Falls back to the raw value.
function exitLabel(raw) {
  const v = String(raw || '').trim();
  const m = v.match(/exit\s*([0-9a-z]+)/i);
  if (m) return m[1].toUpperCase();
  return v.toUpperCase() || '?';
}

function loadCoordsIndex() {
  try {
    const coords = JSON.parse(fs.readFileSync(COORDS_PATH, 'utf8'));
    const index = new Map();
    for (const name of Object.keys(coords)) {
      if (name === '_meta') continue;
      index.set(normalise(name), name);
    }
    return index;
  } catch (err) {
    console.warn(`[fetch-station-exits] could not read mrt-coords.json (${err.message}) — station names won't be reconciled`);
    return new Map();
  }
}

(async function main() {
  let geojsonText;
  if (fromFile) {
    console.log(`[fetch-station-exits] reading local file ${fromFile}`);
    geojsonText = fs.readFileSync(fromFile, 'utf8');
  } else {
    geojsonText = await downloadDataset();
  }

  if (rawOut) {
    fs.writeFileSync(rawOut, geojsonText, 'utf8');
    console.log(`[fetch-station-exits] saved raw GeoJSON → ${rawOut}`);
  }

  const geojson = JSON.parse(geojsonText);
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  console.log(`[fetch-station-exits] features in dataset: ${features.length}`);

  const coordsIndex = loadCoordsIndex();
  const byStation = {};
  let parsed = 0;
  let reconciled = 0;
  const unmatched = new Set();

  for (const f of features) {
    const geom = f && f.geometry;
    if (!geom || geom.type !== 'Point' || !Array.isArray(geom.coordinates)) continue;
    const lng = Number(geom.coordinates[0]);
    const lat = Number(geom.coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const attrs = featureAttrs(f.properties);
    const rawName = attrs.STATION_NA || attrs.STATION_NAME || attrs.NAME || attrs.STN_NAME || '';
    const rawExit = attrs.EXIT_CODE || attrs.EXIT || attrs.EXIT_NO || attrs.EXIT_NUMBER || '';
    if (!rawName) continue;

    const norm = normalise(rawName);
    let station = coordsIndex.get(norm);
    if (station) {
      reconciled++;
    } else {
      station = titleCase(String(rawName).replace(/\b(MRT|LRT)\s+STATION\b/i, ''));
      unmatched.add(station);
    }

    if (!byStation[station]) byStation[station] = [];
    byStation[station].push({
      exit: exitLabel(rawExit),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    });
    parsed++;
  }

  // Stable order: stations alphabetically, exits by label.
  const sorted = {};
  for (const station of Object.keys(byStation).sort()) {
    sorted[station] = byStation[station].sort((a, b) => a.exit.localeCompare(b.exit, undefined, { numeric: true }));
  }

  const stationCount = Object.keys(sorted).length;
  console.log(`[fetch-station-exits] parsed ${parsed} exits across ${stationCount} stations (${reconciled} exits matched a mrt-coords.json station)`);
  if (unmatched.size) {
    console.log(`[fetch-station-exits] ${unmatched.size} station name(s) not in mrt-coords.json: ${[...unmatched].sort().join(', ')}`);
  }

  const output = {
    _meta: {
      comment: 'SG MRT/LRT station exit points. Each station maps to an array of exits with WGS84 lat/lng. Sourced from data.gov.sg dataset d_b39d3a0871985372d7e1637193335da5 (LTA MRT Station Exit GEOJSON). Regenerate with scripts/fetch-station-exits.js.',
      source: `data.gov.sg dataset ${DATASET_ID}`,
      lastUpdated: new Date().toISOString().slice(0, 10),
      stationCount,
      exitCount: parsed,
    },
  };
  Object.assign(output, sorted);

  if (dryRun) {
    console.log('[fetch-station-exits] --dry: skipping write');
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`[fetch-station-exits] wrote ${stationCount} stations / ${parsed} exits → ${OUT_PATH}`);
})().catch((err) => {
  console.error('[fetch-station-exits] failed:', err.message);
  process.exit(1);
});
