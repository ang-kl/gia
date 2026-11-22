#!/usr/bin/env node
// scripts/fetch-mrt-lines.js — v0.60.232
//
// One-shot fetcher for Singapore MRT/LRT line GEOMETRY — the real
// LTA route polylines, replacing the station-code-derived straight
// segments that buildLinePaths() produces (Build E 5a, PR #482).
//
// Source: data.gov.sg public dataset
//   dataset_id = d_ae38cc7a5c706d33f115bebc01f9e4f7
//   ("LTA MRT/LRT Line (GEOJSON)")
//
// data.gov.sg serves geospatial datasets through the two-step
// "poll-download" flow (per the operator-supplied OpenAPI sample):
//   1. GET  /v1/public/api/datasets/<id>/poll-download
//        → { code: 0, data: { url: "<presigned file URL>" } }
//   2. GET  <data.url>  → the GeoJSON file itself
// code !== 0 means the export is still being prepared — we retry.
//
// LTA GeoJSON line features are LineString / MultiLineString geometry;
// their attributes live either as flat properties keys or inside an
// HTML <table> in properties.Description. This script reads both,
// maps each feature to a soleat line code (NSL/EWL/CGL/…), and writes
// the geometry as { [lineCode]: Array<segment> } where each segment
// is an Array<{lat,lng}>.
//
// Output: data/mrt-line-paths.json
//   { "_meta": {...}, "NSL": [ [ {lat,lng}, ... ], ... ], ... }
// The Train TMA map (/api/transport/line-paths → MrtMapPanel) draws
// this geometry when present, falling back to buildLinePaths() when
// the file is absent.
//
// Usage:
//   node scripts/fetch-mrt-lines.js                 # fetch + write
//   node scripts/fetch-mrt-lines.js --dry           # parse, no write
//   node scripts/fetch-mrt-lines.js --from-file <path.geojson>
//   node scripts/fetch-mrt-lines.js --raw-out <path.geojson>
//
// Run once where api-open.data.gov.sg is reachable, then commit the
// resulting data/mrt-line-paths.json.

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATASET_ID = 'd_ae38cc7a5c706d33f115bebc01f9e4f7';
const POLL_URL = `https://api-open.data.gov.sg/v1/public/api/datasets/${DATASET_ID}/poll-download`;
const OUT_PATH = path.join(__dirname, '..', 'data', 'mrt-line-paths.json');

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

// GET that follows one level of redirect and returns the raw body.
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

async function downloadDataset() {
  for (let attempt = 1; attempt <= 6; attempt++) {
    console.log(`[fetch-mrt-lines] poll-download attempt ${attempt} → ${POLL_URL}`);
    const json = JSON.parse(await fetchText(POLL_URL));
    if (json.code === 0 && json.data && json.data.url) {
      console.log('[fetch-mrt-lines] export ready — downloading file');
      return fetchText(json.data.url);
    }
    const msg = json.errMsg || `code ${json.code}`;
    console.log(`[fetch-mrt-lines] not ready (${msg}) — waiting 3s`);
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

// soleat line codes (mirror web/transport/src/data/lines.js). A
// feature is matched to one of these by name substring, then by an
// explicit code token, then by the operational-line LTA hex palette.
const NAME_TO_CODE = [
  [/NORTH\s*SOUTH/, 'NSL'],
  [/EAST\s*WEST/, 'EWL'],
  [/CHANGI\s*AIRPORT/, 'CGL'],
  [/NORTH\s*EAST/, 'NEL'],
  [/CIRCLE/, 'CCL'],
  [/DOWNTOWN/, 'DTL'],
  [/THOMSON/, 'TEL'],
  [/BUKIT\s*PANJANG/, 'BPL'],
  [/SENGKANG/, 'SLRT'],
  [/PUNGGOL/, 'PLRT'],
  [/JURONG\s*REGION/, 'JRL'],
  [/CROSS\s*ISLAND/, 'CRL'],
];
const KNOWN_CODES = new Set(['NSL', 'EWL', 'CGL', 'NEL', 'CCL', 'DTL', 'TEL', 'BPL', 'SLRT', 'PLRT', 'JRL', 'CRL']);
const HEX_TO_CODE = {
  '009645': 'EWL', D42E12: 'NSL', '9900AA': 'NEL', FA9E0D: 'CCL',
  '005EC4': 'DTL', '9D5B25': 'TEL', '718472': 'BPL',
};

// Resolve a feature's line code from its attributes.
function resolveLineCode(attrs) {
  const text = Object.values(attrs).map((v) => String(v).toUpperCase()).join(' ');
  for (const [re, code] of NAME_TO_CODE) {
    if (re.test(text)) return code;
  }
  const token = text.match(/\b(NSL|EWL|CGL|NEL|CCL|DTL|TEL|BPL|SLRT|PLRT|JRL|CRL)\b/);
  if (token && KNOWN_CODES.has(token[1])) return token[1];
  const hex = text.match(/#?([0-9A-F]{6})\b/);
  if (hex && HEX_TO_CODE[hex[1]]) return HEX_TO_CODE[hex[1]];
  return null;
}

// A GeoJSON geometry → array of segments, each Array<{lat,lng}>.
// Handles LineString and MultiLineString; skips anything else.
function geometrySegments(geom) {
  if (!geom) return [];
  const toPts = (coords) => (Array.isArray(coords) ? coords : [])
    .map((c) => ({ lat: Number(c[1]), lng: Number(c[0]) }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
  if (geom.type === 'LineString') {
    const seg = toPts(geom.coordinates);
    return seg.length >= 2 ? [seg] : [];
  }
  if (geom.type === 'MultiLineString') {
    return (Array.isArray(geom.coordinates) ? geom.coordinates : [])
      .map(toPts)
      .filter((seg) => seg.length >= 2);
  }
  return [];
}

(async function main() {
  let geojsonText;
  if (fromFile) {
    console.log(`[fetch-mrt-lines] reading local file ${fromFile}`);
    geojsonText = fs.readFileSync(fromFile, 'utf8');
  } else {
    geojsonText = await downloadDataset();
  }

  if (rawOut) {
    fs.writeFileSync(rawOut, geojsonText, 'utf8');
    console.log(`[fetch-mrt-lines] saved raw GeoJSON → ${rawOut}`);
  }

  const geojson = JSON.parse(geojsonText);
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  console.log(`[fetch-mrt-lines] features in dataset: ${features.length}`);

  const byLine = {};
  let segmentCount = 0;
  let unmatched = 0;

  for (const f of features) {
    const segments = geometrySegments(f && f.geometry);
    if (!segments.length) continue;
    const code = resolveLineCode(featureAttrs(f.properties));
    if (!code) {
      unmatched++;
      continue;
    }
    for (const seg of segments) {
      (byLine[code] || (byLine[code] = [])).push(
        seg.map((p) => ({ lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)) }))
      );
      segmentCount++;
    }
  }

  const sorted = {};
  for (const code of Object.keys(byLine).sort()) sorted[code] = byLine[code];

  const lineCount = Object.keys(sorted).length;
  console.log(`[fetch-mrt-lines] mapped ${segmentCount} segments across ${lineCount} lines`);
  if (unmatched) {
    console.log(`[fetch-mrt-lines] ${unmatched} line feature(s) could not be matched to a line code — check the dataset's attribute names`);
  }

  const output = {
    _meta: {
      comment: 'SG MRT/LRT line route geometry. Each line code maps to an array of polyline segments (Array<{lat,lng}>). Sourced from data.gov.sg dataset d_ae38cc7a5c706d33f115bebc01f9e4f7 (LTA MRT/LRT Line GEOJSON). Regenerate with scripts/fetch-mrt-lines.js.',
      source: `data.gov.sg dataset ${DATASET_ID}`,
      lastUpdated: new Date().toISOString().slice(0, 10),
      lineCount,
      segmentCount,
    },
  };
  Object.assign(output, sorted);

  if (dryRun) {
    console.log('[fetch-mrt-lines] --dry: skipping write');
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`[fetch-mrt-lines] wrote ${lineCount} lines / ${segmentCount} segments → ${OUT_PATH}`);
})().catch((err) => {
  console.error('[fetch-mrt-lines] failed:', err.message);
  process.exit(1);
});
