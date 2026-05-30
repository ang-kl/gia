#!/usr/bin/env node
// scripts/durian-variance.js — v0.61.293
//
// Thin CLI wrapper around durian-variance-runner.js's `runVariance`.
//
// Pre-v0.61.293 this file was 278 lines of code duplicated from the
// runner: same SEEDS, same REGIONS, same _placeToVenue, same loop.
// The duplication caused the silent placeId-loss bug — v0.61.283
// fixed THIS file but missed the runner, leaving the bot's /ver
// path broken for another 5 patches (until v0.61.288). Register O-37
// flags this class of risk; the v0.61.293 refactor closes it for the
// variance pipeline specifically: there is now exactly ONE source of
// truth for variance logic, which both the CLI and the bot call.
//
// Run:
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-variance.js
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-variance.js --mode=durian-pastry
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-variance.js --json-out=./out.json
//   GOOGLE_MAPS_API_KEY=... node scripts/durian-variance.js --json (stdout)
//
// Cost: ~$0.40 per mode at the current v0.61.262 limits (20 results/
// query × 3 pages × ~30 query-language combos × 4 regions).

'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { runVariance } = require('../durian-variance-runner');

const apiKey = process.env.GOOGLE_MAPS_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_MAPS_API_KEY required. Aborting.');
  process.exit(2);
}

const argMode = (process.argv.find((a) => a.startsWith('--mode=')) || '').split('=')[1];
const MODE = argMode === 'durian-pastry' ? 'durian-pastry' : 'durian';
const JSON_STDOUT = process.argv.includes('--json');
const JSON_OUT_ARG = (process.argv.find((a) => a.startsWith('--json-out=')) || '').split('=')[1];
const JSON_OUT_PATH = JSON_OUT_ARG ? JSON_OUT_ARG.trim() : null;

(async () => {
  console.log(`durian-variance CLI — mode=${MODE} (delegates to durian-variance-runner)`);
  let report;
  try {
    report = await runVariance({
      apiKey,
      mode: MODE,
      log: (line) => console.log(line)
    });
  } catch (err) {
    console.error(`\nFATAL: ${err && err.message ? err.message : String(err)}`);
    process.exit(1);
  }
  console.log('\n========== cross-region rollup ==========');
  for (const r of report.regions) {
    console.log(`  ${r.name.padEnd(15)} kept=${r.totals.kept}/${r.totals.placesReturned}  precision=${r.totals.precision}`);
  }
  console.log(`  ${'ALL'.padEnd(15)} kept=${report.totals.kept}/${report.totals.placesReturned}  precision=${report.totals.precision}`);
  if (JSON_OUT_PATH) {
    const outPath = path.resolve(JSON_OUT_PATH);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
    console.log(`\n[durian-variance] JSON written → ${outPath}`);
  }
  if (JSON_STDOUT) {
    console.log('\n========== JSON ==========');
    console.log(JSON.stringify(report, null, 2));
  }
  console.log('\ndone.');
})();
