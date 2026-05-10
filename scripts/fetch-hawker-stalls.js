#!/usr/bin/env node
// scripts/fetch-hawker-stalls.js — v0.60.60
//
// One-shot extractor for Singapore hawker-centre stall counts + status
// from NEA's "Hawker Centres (GEOJSON)" dataset on data.gov.sg.
//
// Two input modes:
//
//   1. Local file (recommended):
//        node scripts/fetch-hawker-stalls.js --from path/to/file.geojson
//      Download the dataset manually from
//      https://data.gov.sg/datasets/d_4a086da0a5553be1d89383cd90d07ecd/view
//      (click the Download button), point this script at the saved file,
//      and the script writes data/hawker-stalls.json. Most reliable —
//      data.gov.sg's v2 download API has been finicky in 2026-05.
//
//   2. v2 API auto-fetch (best-effort):
//        node scripts/fetch-hawker-stalls.js
//      Tries the poll-download flow. May 404 or time out depending on
//      data.gov.sg's current API surface. If it fails, fall back to (1).
//
// GeoJSON schema we parse: features[].properties carries the per-centre
// fields. Two shapes are tolerated:
//   • Direct properties (modern): { NAME, NUMBER_OF_COOKED_FOOD_STALLS,
//     STATUS, ADDRESSPOSTALCODE, ... }
//   • Legacy HTML-blob: { Name, Description } where Description is an
//     HTML <table> with <th>/<td> rows (NEA used this format pre-2024).
//     Parsed by stripHtmlTable() below as a fallback.
//
// Output: data/hawker-stalls.json
//   { "Maxwell Food Centre": { stalls: 64, status: "Existing" }, ... }
//
// Re-run when NEA refreshes the dataset (typically quarterly).

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATASET_ID = 'd_4a086da0a5553be1d89383cd90d07ecd';
const POLL_URL = `https://api-production.data.gov.sg/v2/public/api/datasets/${DATASET_ID}/poll-download`;
const OUT_PATH = path.join(__dirname, '..', 'data', 'hawker-stalls.json');

// Parse CLI args. Recognised: --dry, --from <path>.
function parseArgs(argv) {
  const out = { dry: false, from: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry') out.dry = true;
    else if (a === '--from') out.from = argv[i + 1] || null;
    else if (a.startsWith('--from=')) out.from = a.slice(7);
  }
  return out;
}
const args = parseArgs(process.argv.slice(2));

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

// NEA's legacy GeoJSON wraps the per-feature attributes in an HTML
// <table>. Each row is `<tr><th>KEY</th><td>VALUE</td></tr>`. Parse
// that into a plain { KEY: VALUE } map. Tolerates extra whitespace and
// nested span tags. Returns {} if no table is present.
function stripHtmlTable(html) {
  const out = {};
  if (!html || typeof html !== 'string') return out;
  const rowRx = /<tr[^>]*>\s*<th[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>\s*<\/tr>/gi;
  let m;
  while ((m = rowRx.exec(html)) !== null) {
    const key = m[1].replace(/<[^>]*>/g, '').trim();
    const val = m[2].replace(/<[^>]*>/g, '').trim();
    if (key) out[key] = val;
  }
  return out;
}

// Pull the (NAME, stalls, status) triple out of one GeoJSON feature,
// trying both modern (direct properties) and legacy (HTML <table>) shapes.
function extractTriple(feature) {
  const p = feature?.properties || {};
  let name = String(p.NAME || p.name || '').trim();
  let rawStalls = p.NUMBER_OF_COOKED_FOOD_STALLS ?? p.number_of_cooked_food_stalls ?? null;
  let status = String(p.STATUS || p.status || '').trim();
  if (!name || rawStalls == null || !status) {
    // Fall back to HTML-table parse for legacy datasets.
    const tbl = stripHtmlTable(p.Description || p.description);
    if (!name) name = tbl.NAME || tbl.Name || tbl.name || '';
    if (rawStalls == null) {
      rawStalls = tbl.NUMBER_OF_COOKED_FOOD_STALLS
        ?? tbl.NUMBER_OF_FOOD_STALLS
        ?? tbl.NUMBER_OF_STALLS
        ?? null;
    }
    if (!status) status = tbl.STATUS || tbl.status || '';
  }
  const stalls = rawStalls != null ? Number(rawStalls) : NaN;
  return { name: name.trim(), stalls, status: status.trim() };
}

(async function main() {
  let geojson;
  if (args.from) {
    const filePath = path.isAbsolute(args.from) ? args.from : path.resolve(process.cwd(), args.from);
    console.log(`[fetch-hawker-stalls] reading local file: ${filePath}`);
    let raw;
    try { raw = fs.readFileSync(filePath, 'utf8'); }
    catch (err) {
      console.error(`[fetch-hawker-stalls] failed to read --from file: ${err.message}`);
      process.exit(1);
    }
    try { geojson = JSON.parse(raw); }
    catch (err) {
      console.error(`[fetch-hawker-stalls] file is not valid JSON: ${err.message}`);
      process.exit(1);
    }
  } else {
    console.log(`[fetch-hawker-stalls] poll ${POLL_URL}`);
    let downloadUrl;
    try {
      downloadUrl = await pollDownload(POLL_URL);
    } catch (err) {
      console.error(`[fetch-hawker-stalls] poll-download failed: ${err.message}`);
      console.error('[fetch-hawker-stalls] tip: download the GeoJSON manually from');
      console.error('[fetch-hawker-stalls]   https://data.gov.sg/datasets/' + DATASET_ID + '/view');
      console.error('[fetch-hawker-stalls] then re-run with --from path/to/file.geojson');
      process.exit(1);
    }
    console.log('[fetch-hawker-stalls] download URL acquired, fetching GeoJSON…');
    try {
      geojson = await fetchJson(downloadUrl);
    } catch (err) {
      console.error(`[fetch-hawker-stalls] GeoJSON download failed: ${err.message}`);
      process.exit(1);
    }
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
    const { name, stalls, status } = extractTriple(f);
    if (!name) continue;
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
    if (entry.stalls != null || entry.status) out[name] = entry;
  }
  console.log(`[fetch-hawker-stalls] entries: ${Object.keys(out).length} (with stalls: ${withStalls}, with status: ${withStatus})`);

  if (args.dry) {
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
