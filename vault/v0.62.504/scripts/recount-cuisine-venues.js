#!/usr/bin/env node
// scripts/recount-cuisine-venues.js — v0.61.173
//
// Manual runner for the v0.61.173 per-cuisine venue tabulator.
// Operator invokes this when they want fresh counts; the script
// writes data/cuisine-venue-counts.json (atomic via tmp + rename).
//
// Usage:
//   node scripts/recount-cuisine-venues.js
//   GOOGLE_MAPS_API_KEY=... node scripts/recount-cuisine-venues.js
//   npm run count:cuisines   (see package.json)
//
// Cost: ~$3.45 per run (48 cuisines × ~1.8 Places searchText calls
// avg). See cuisine-venue-counts.js header for the privacy contract.

'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { countAll, SCOPE_SLUGS } = require('../cuisine-venue-counts');

const OUTPUT = path.join(__dirname, '..', 'data', 'cuisine-venue-counts.json');

(async () => {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY not set — aborting (set in .env or env).');
    process.exit(2);
  }
  console.log(`Counting venues for ${SCOPE_SLUGS.length} cuisines via Places searchText...`);
  const result = await countAll();
  const json = {
    _meta: {
      schema: 'cuisine-venue-counts/v1',
      generatedAt: result.ts,
      generator: 'scripts/recount-cuisine-venues.js (v0.61.173)',
      scopeCount: SCOPE_SLUGS.length,
      pagesIssued: result.pages,
      elapsedMs: result.elapsedMs,
      cappedSlugs: result.capped,        // these read as "60+"
      errorCount: Object.keys(result.errors || {}).length
    },
    total: result.total,
    perSlug: result.perSlug,
    errors: result.errors
  };
  const tmp = OUTPUT + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(json, null, 2) + '\n');
  fs.renameSync(tmp, OUTPUT);
  console.log(`\nWrote ${OUTPUT}`);
  console.log(`Total across ${SCOPE_SLUGS.length} cuisines: ${result.total}`);
  if (result.capped.length) console.log(`Capped at 60+ (${result.capped.length}): ${result.capped.join(', ')}`);
  if (Object.keys(result.errors || {}).length) {
    console.log(`Errors (${Object.keys(result.errors).length}):`);
    for (const [slug, err] of Object.entries(result.errors)) console.log(`  ${slug}: ${err}`);
  }
  console.log(`Pages issued: ${result.pages}, elapsed: ${result.elapsedMs} ms`);
  process.exit(0);
})().catch((err) => {
  console.error('Recount failed:', err);
  process.exit(1);
});
