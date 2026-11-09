#!/usr/bin/env node
// scripts/place-search-variance/run.mjs
//
// One-shot runner for the place-search variance test.
//
// Usage:
//   export GOOGLE_MAPS_API_KEY="..."   # operator's key with Places (New) + Geocoding enabled
//   node scripts/place-search-variance/run.mjs              # full 1700-test run (~$85)
//   node scripts/place-search-variance/run.mjs --limit 50   # smoke test (~$2.50)
//   node scripts/place-search-variance/run.mjs --country MY # MY-only (~$25)
//
// What it does (per row):
//   1. POST https://places.googleapis.com/v1/places:searchText
//      body: { textQuery, includedRegionCodes:[cc], pageSize:6, languageCode:'en' }
//   2. GET  https://maps.googleapis.com/maps/api/geocode/json
//      with: address=<query>&components=country:<cc>
//   3. Merge + dedup the two response lists (placeId + rounded coord)
//   4. Compute top-1 hit: did the venue's canonical name appear in the
//      top-1 returned displayName/formattedAddress?
//   5. Compute top-6 hit: did it appear in any of the merged top-6?
//   6. Write a row to results.json
//
// Throttles: 6 concurrent requests, 200 ms backoff between batches.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const { generateVariants } = require('./typing-variants.js');

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
if (!API_KEY) {
  console.error('FATAL: GOOGLE_MAPS_API_KEY env var is required.');
  process.exit(2);
}

const CONCURRENCY = 6;
const BATCH_PAUSE_MS = 200;
const RESULT_CAP = 6;

const args = process.argv.slice(2);
const argLimit = (() => {
  const i = args.indexOf('--limit');
  return i >= 0 ? Number(args[i + 1]) : null;
})();
const argCountry = (() => {
  const i = args.indexOf('--country');
  return i >= 0 ? String(args[i + 1]).toUpperCase() : null;
})();

const venuesPath = path.join(__dirname, 'venues.json');
const allVenues = JSON.parse(fs.readFileSync(venuesPath, 'utf8')).venues;

// Build the full test set.
const tests = [];
for (const v of allVenues) {
  if (argCountry && v.country !== argCountry) continue;
  const variants = generateVariants(v);
  for (const x of variants) {
    tests.push({
      venueId: v.id,
      country: v.country,
      city: v.city,
      expectedName: v.name,
      variant: x.variant,
      query: x.query
    });
  }
}
const total = argLimit ? Math.min(argLimit, tests.length) : tests.length;
const slice = tests.slice(0, total);
console.log(`Loaded ${allVenues.length} venues → ${tests.length} test rows; running ${slice.length}.`);

// --- API helpers ------------------------------------------------------

async function fetchPlaces(query, cc) {
  const body = {
    textQuery: query,
    includedRegionCodes: [cc],
    pageSize: RESULT_CAP,
    languageCode: 'en'
  };
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.types,places.primaryType'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      return { ok: false, status: r.status, error: text.slice(0, 300), results: [] };
    }
    const data = await r.json();
    const results = (Array.isArray(data.places) ? data.places : []).map((p) => ({
      placeId: p.id || '',
      displayName: p.displayName?.text || '',
      formattedAddress: p.formattedAddress || '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: p.rating ?? null,
      userRatingCount: p.userRatingCount ?? null,
      primaryType: p.primaryType || null,
      types: p.types || [],
      source: 'places'
    }));
    return { ok: true, results };
  } catch (err) {
    return { ok: false, status: 'network', error: err.message, results: [] };
  }
}

async function fetchGeocoding(query, cc) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:${cc}&key=${API_KEY}`;
  try {
    const r = await fetch(url);
    if (!r.ok) {
      return { ok: false, status: r.status, results: [] };
    }
    const data = await r.json();
    if (data.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return { ok: false, status: data.status, error: data.error_message || '', results: [] };
    }
    const arr = Array.isArray(data.results) ? data.results : [];
    const results = arr.map((g) => {
      const fa = g.formatted_address || '';
      return {
        placeId: g.place_id || '',
        displayName: '',
        formattedAddress: fa,
        lat: g.geometry?.location?.lat ?? null,
        lng: g.geometry?.location?.lng ?? null,
        rating: null,
        userRatingCount: null,
        primaryType: null,
        types: g.types || [],
        source: 'geocode'
      };
    });
    return { ok: true, results };
  } catch (err) {
    return { ok: false, status: 'network', error: err.message, results: [] };
  }
}

// Merge places + geocode, dedup by placeId + rounded coord. Returns
// up to RESULT_CAP entries.
function merge(p, g) {
  const seenIds = new Set();
  const seenCoords = new Set();
  const out = [];
  for (const list of [p, g]) {
    for (const x of list) {
      if (out.length >= RESULT_CAP) break;
      const id = x.placeId || '';
      const coordKey = `${(x.lat ?? 0).toFixed(4)}|${(x.lng ?? 0).toFixed(4)}`;
      if (id && seenIds.has(id)) continue;
      if (seenCoords.has(coordKey)) continue;
      if (id) seenIds.add(id);
      seenCoords.add(coordKey);
      out.push(x);
    }
    if (out.length >= RESULT_CAP) break;
  }
  return out;
}

// Scoring: does the resolved result match the expected venue name?
// Heuristic: tokenize both, count overlap of name-words (length ≥ 3),
// require ≥ 50% of expected tokens present.
const NAME_STOPWORDS = new Set([
  'the', 'of', 'and', 'at', 'in', 'a', 'an',
  'mall', 'plaza', 'shopping', 'centre', 'center', 'mart'
]);
function nameTokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}
function isMatch(expectedName, candidate) {
  const expTok = nameTokens(expectedName);
  if (expTok.length === 0) return false;
  const hay = `${candidate.displayName} ${candidate.formattedAddress}`.toLowerCase();
  let hits = 0;
  for (const t of expTok) if (hay.includes(t)) hits++;
  return hits / expTok.length >= 0.5;
}

// --- Run a single test ------------------------------------------------

async function runOne(t) {
  const [pRes, gRes] = await Promise.all([
    fetchPlaces(t.query, t.country),
    fetchGeocoding(t.query, t.country)
  ]);
  const merged = merge(pRes.results, gRes.results);
  const top1 = merged[0] || null;
  const top1Hit = top1 ? isMatch(t.expectedName, top1) : false;
  const top6HitIdx = merged.findIndex((c) => isMatch(t.expectedName, c));
  return {
    ...t,
    placesOk: pRes.ok,
    placesStatus: pRes.status,
    placesError: pRes.error,
    geocodeOk: gRes.ok,
    geocodeStatus: gRes.status,
    geocodeError: gRes.error,
    placesCount: pRes.results.length,
    geocodeCount: gRes.results.length,
    mergedCount: merged.length,
    top1: top1 ? {
      placeId: top1.placeId,
      displayName: top1.displayName,
      formattedAddress: top1.formattedAddress,
      rating: top1.rating,
      userRatingCount: top1.userRatingCount,
      source: top1.source
    } : null,
    top1Hit,
    top6Hit: top6HitIdx >= 0,
    top6HitIdx,
    merged: merged.map((c) => ({
      placeId: c.placeId,
      displayName: c.displayName,
      formattedAddress: c.formattedAddress,
      rating: c.rating,
      userRatingCount: c.userRatingCount,
      source: c.source
    }))
  };
}

// --- Runner with concurrency ------------------------------------------

async function main() {
  const startedAt = Date.now();
  const results = [];
  let done = 0;
  for (let i = 0; i < slice.length; i += CONCURRENCY) {
    const batch = slice.slice(i, i + CONCURRENCY);
    const batchRes = await Promise.all(batch.map(runOne));
    results.push(...batchRes);
    done += batch.length;
    if (done % 30 === 0 || done === slice.length) {
      const pct = ((done / slice.length) * 100).toFixed(1);
      const top1Pct = ((results.filter((r) => r.top1Hit).length / results.length) * 100).toFixed(1);
      console.log(`  [${done}/${slice.length}  ${pct}%]  top-1 hit so far: ${top1Pct}%`);
    }
    if (i + CONCURRENCY < slice.length) await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
  }
  const elapsedMs = Date.now() - startedAt;
  // Save raw results.
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const filterTag = argCountry ? `-${argCountry.toLowerCase()}` : '';
  const out = {
    _meta: {
      generatedAt: new Date().toISOString(),
      durationMs: elapsedMs,
      total: results.length,
      countryFilter: argCountry,
      limit: argLimit
    },
    summary: summarise(results),
    results
  };
  const outPath = path.join(__dirname, `results-${stamp}${filterTag}.json`);
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  console.log(`\nDone. ${results.length} rows in ${(elapsedMs / 1000).toFixed(1)}s. Wrote ${outPath}.\n`);
  printSummary(out.summary);
}

function summarise(results) {
  const total = results.length;
  const top1Hits = results.filter((r) => r.top1Hit).length;
  const top6Hits = results.filter((r) => r.top6Hit).length;
  const placesFails = results.filter((r) => !r.placesOk).length;
  const geocodeFails = results.filter((r) => !r.geocodeOk).length;
  const bothEmpty = results.filter((r) => r.mergedCount === 0).length;
  // By variant
  const byVariant = {};
  for (const r of results) {
    if (!byVariant[r.variant]) byVariant[r.variant] = { n: 0, top1: 0, top6: 0 };
    byVariant[r.variant].n++;
    if (r.top1Hit) byVariant[r.variant].top1++;
    if (r.top6Hit) byVariant[r.variant].top6++;
  }
  // By country
  const byCountry = {};
  for (const r of results) {
    if (!byCountry[r.country]) byCountry[r.country] = { n: 0, top1: 0, top6: 0 };
    byCountry[r.country].n++;
    if (r.top1Hit) byCountry[r.country].top1++;
    if (r.top6Hit) byCountry[r.country].top6++;
  }
  // By city
  const byCity = {};
  for (const r of results) {
    const key = `${r.country}/${r.city}`;
    if (!byCity[key]) byCity[key] = { n: 0, top1: 0, top6: 0 };
    byCity[key].n++;
    if (r.top1Hit) byCity[key].top1++;
    if (r.top6Hit) byCity[key].top6++;
  }
  return { total, top1Hits, top6Hits, placesFails, geocodeFails, bothEmpty, byVariant, byCountry, byCity };
}

function pct(num, den) { return den === 0 ? '—' : `${((num / den) * 100).toFixed(1)}%`; }

function printSummary(s) {
  console.log('============================================================');
  console.log('SUMMARY');
  console.log('============================================================');
  console.log(`Total tests:       ${s.total}`);
  console.log(`Top-1 hit:         ${s.top1Hits} (${pct(s.top1Hits, s.total)})`);
  console.log(`Top-6 hit:         ${s.top6Hits} (${pct(s.top6Hits, s.total)})`);
  console.log(`Places API fails:  ${s.placesFails}`);
  console.log(`Geocoding fails:   ${s.geocodeFails}`);
  console.log(`Both empty:        ${s.bothEmpty}`);
  console.log('');
  console.log('By variant:');
  for (const [k, v] of Object.entries(s.byVariant)) {
    console.log(`  ${k.padEnd(14)}  n=${String(v.n).padStart(4)}   top-1 ${pct(v.top1, v.n).padStart(7)}   top-6 ${pct(v.top6, v.n).padStart(7)}`);
  }
  console.log('');
  console.log('By country:');
  for (const [k, v] of Object.entries(s.byCountry)) {
    console.log(`  ${k.padEnd(4)}  n=${String(v.n).padStart(4)}   top-1 ${pct(v.top1, v.n).padStart(7)}   top-6 ${pct(v.top6, v.n).padStart(7)}`);
  }
  console.log('');
  console.log('By city:');
  for (const [k, v] of Object.entries(s.byCity)) {
    console.log(`  ${k.padEnd(22)}  n=${String(v.n).padStart(4)}   top-1 ${pct(v.top1, v.n).padStart(7)}   top-6 ${pct(v.top6, v.n).padStart(7)}`);
  }
  console.log('============================================================');
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
