#!/usr/bin/env node
// scripts/fetch-hawker-closures.js — v0.60.53
//
// One-shot fetcher for Singapore hawker-centre closure schedules.
//
// Source: data.gov.sg public dataset
//   resource_id = d_4a086da0a5553be1d89383cd90d07ecd
//   "Dates of Hawker Centres Closure"
// Each record carries quarterly cleaning windows
//   q1_cleaningstartdate / q1_cleaningenddate, ..., q4_*,
// plus an optional "other_works_startdate / other_works_enddate"
// (R&R / repaving). We pick the **next upcoming window** per centre
// (today ≤ start, take the earliest within the next 90 days) so the
// hawker TMA can show "🚧 Closed 1 Jun → 15 Jun" badges.
//
// Output: data/hawker-closures.json
//   { "Maxwell Food Centre": { from: "2026-06-01", to: "2026-06-15", reason: "Cleaning" }, ... }
//
// Usage:
//   node scripts/fetch-hawker-closures.js
//   node scripts/fetch-hawker-closures.js --dry
//
// Re-run quarterly when data.gov.sg refreshes the dataset.

const fs = require('fs');
const path = require('path');
const https = require('https');

const DATASET_ID = 'd_4a086da0a5553be1d89383cd90d07ecd';
const URL = `https://data.gov.sg/api/action/datastore_search?resource_id=${DATASET_ID}&limit=400`;
const OUT_PATH = path.join(__dirname, '..', 'data', 'hawker-closures.json');

const dryRun = process.argv.includes('--dry');
const HORIZON_DAYS = 90;

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
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

// data.gov.sg dates land as either "YYYY-MM-DD" or "DD/MM/YYYY".
// Normalise to ISO. Return null if unparseable / blank / "NA".
function toIso(raw) {
  const s = String(raw || '').trim();
  if (!s || /^na$/i.test(s) || /^tbc$/i.test(s)) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mm = m[2].padStart(2, '0');
    return `${m[3]}-${mm}-${dd}`;
  }
  // Last-ditch: let Date parse it.
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }
  return null;
}

function pickNextWindow(record, today, horizon) {
  // Each record may carry up to 5 windows: 4 quarterly cleanings
  // plus an optional "other works" entry. Collect them, drop any
  // that have already ended, take the earliest start within horizon.
  const candidates = [];
  for (const q of ['q1', 'q2', 'q3', 'q4']) {
    const from = toIso(record[`${q}_cleaningstartdate`]);
    const to = toIso(record[`${q}_cleaningenddate`]);
    if (from && to) candidates.push({ from, to, reason: 'Cleaning' });
  }
  const otherFrom = toIso(record.other_works_startdate);
  const otherTo = toIso(record.other_works_enddate);
  if (otherFrom && otherTo) {
    const reason = String(record.remarks_other_works || 'Other works').slice(0, 60);
    candidates.push({ from: otherFrom, to: otherTo, reason });
  }
  const todayIso = today.toISOString().slice(0, 10);
  const horizonIso = horizon.toISOString().slice(0, 10);
  const upcoming = candidates
    .filter((c) => c.to >= todayIso && c.from <= horizonIso)
    .sort((a, b) => a.from.localeCompare(b.from));
  return upcoming[0] || null;
}

(async function main() {
  console.log(`[fetch-hawker-closures] GET ${URL}`);
  let body;
  try {
    body = await fetchJson(URL);
  } catch (err) {
    console.error(`[fetch-hawker-closures] data.gov.sg unreachable: ${err.message}`);
    process.exit(1);
  }
  const records = body?.result?.records || [];
  console.log(`[fetch-hawker-closures] dataset rows: ${records.length}`);

  const today = new Date();
  const horizon = new Date(today.getTime() + HORIZON_DAYS * 24 * 60 * 60 * 1000);

  const out = {};
  let withWindow = 0;
  for (const r of records) {
    const name = String(r.name || r.hawker_centre || '').trim();
    if (!name) continue;
    const win = pickNextWindow(r, today, horizon);
    if (win) {
      out[name] = win;
      withWindow++;
    }
  }
  console.log(`[fetch-hawker-closures] centres with upcoming window (≤${HORIZON_DAYS}d): ${withWindow}`);

  if (dryRun) {
    console.log('[fetch-hawker-closures] --dry: skipping write');
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`[fetch-hawker-closures] wrote ${withWindow} entries → ${OUT_PATH}`);
})().catch((err) => {
  console.error('[fetch-hawker-closures] failed:', err.message);
  process.exit(1);
});
