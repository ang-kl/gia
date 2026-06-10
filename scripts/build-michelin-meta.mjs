#!/usr/bin/env node
// scripts/build-michelin-meta.mjs — the Michelin metadata "refresh job".
//
// Resolves every curated Michelin venue (michelin-data.js) against Google
// Places ONCE, offline, and writes a committed snapshot `michelin-meta.json`
// keyed by curated entry `id`. The /api/cuisine/search Michelin handler reads
// that snapshot: when a record carries a `placeId` it resolves details BY ID
// (reliable — no name+city text-search ambiguity), and the 24h per-entry cache
// keeps warm taps ~instant. Until this is run the snapshot is `{}` and the
// handler falls back to the live text-search (unchanged behaviour).
//
// RUN (with your key; monthly cadence is fine — rating/price/hours drift slowly):
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/build-michelin-meta.mjs
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/build-michelin-meta.mjs --dry-run   # resolve, print stats, don't write
//
// G4 (paid external API): bounded, offline, one searchText (+ optional social)
// per curated venue — NOT per user search. ~ (#venues) calls per refresh.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!KEY) { console.error('Set GOOGLE_MAPS_API_KEY'); process.exit(1); }
const DRY = process.argv.includes('--dry-run');
const OUT = path.join(ROOT, 'michelin-meta.json');

const michelin = require(path.join(ROOT, 'michelin-data.js'));
let getSocialProfiles = null, pickTopProfiles = null;
try {
  ({ getSocialProfiles, pickTopProfiles } = require(path.join(ROOT, 'social-profiles.js')));
} catch { /* social is best-effort */ }

// Same fields the live handler reads (FIELD_MASK), as the details-by-id mask
// (no `places.` prefix — single-place searchText still uses `places.`).
const SEARCH_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.businessStatus',
  'places.googleMapsUri', 'places.primaryType', 'places.primaryTypeDisplayName',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.websiteUri', 'places.nationalPhoneNumber', 'places.priceLevel',
  'places.priceRange', 'places.accessibilityOptions.wheelchairAccessibleEntrance'
].join(',');
const PRICE_NUM = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resolveOne(entry) {
  const textQuery = `${entry.name} ${entry.city || ''}`.trim();
  const regionCode = String(entry.country || '').toUpperCase();
  let p = null;
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': SEARCH_MASK },
      body: JSON.stringify({ textQuery, regionCode, languageCode: 'en', maxResultCount: 1 })
    });
    if (r.ok) { const d = await r.json(); p = (Array.isArray(d?.places) ? d.places : [])[0] || null; }
    else { console.warn(`  ! ${entry.id}: HTTP ${r.status}`); }
  } catch (err) { console.warn(`  ! ${entry.id}: ${err.message}`); }
  if (!p || !p.id) return null;

  let social = [];
  if (getSocialProfiles && pickTopProfiles) {
    try {
      const prof = await getSocialProfiles(null, {
        placeId: p.id, name: p.displayName?.text || entry.name,
        address: p.formattedAddress || entry.address, websiteUri: p.websiteUri
      });
      social = pickTopProfiles(prof, 4) || [];
    } catch { /* social best-effort */ }
  }

  return {
    placeId: p.id,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    userRatingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    priceLevel: PRICE_NUM[p.priceLevel] || null,
    googleMapsUri: p.googleMapsUri || '',
    websiteUri: p.websiteUri || '',
    weekdayDescriptions: Array.isArray(p.regularOpeningHours?.weekdayDescriptions) ? p.regularOpeningHours.weekdayDescriptions : null,
    wheelchair: p.accessibilityOptions?.wheelchairAccessibleEntrance === true,
    businessStatus: p.businessStatus || null,
    social,
    fetchedAt: new Date().toISOString()
  };
}

const venues = michelin.visitableVenues(michelin.getAllVenues());
console.log(`Resolving ${venues.length} Michelin venues${DRY ? ' (dry-run)' : ''}…`);
const out = {};
let ok = 0, fail = 0;
for (const v of venues) {
  const rec = await resolveOne(v);
  if (rec) { out[v.id] = rec; ok++; } else { fail++; }
  await sleep(120);   // gentle throttle for Places QPS
}
console.log(`Resolved ${ok}/${venues.length} (${fail} unresolved).`);
if (DRY) { console.log('--dry-run: not writing.'); process.exit(0); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n');
console.log(`Wrote ${OUT} (${Object.keys(out).length} entries).`);
