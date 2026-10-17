#!/usr/bin/env node
// scripts/fetch-24hr-places.js — v0.61.69
//
// Builds data/sg_24hr_places.json — Singapore places that are open 24
// hours, grouped by type — using the Google Places API (New) Text
// Search (places:searchText).
//
// Non-invention: every field — name, address, tel, Google Maps URL — is
// taken verbatim from the Places API response. Missing values are
// stored as null. Nothing is fabricated; a place is included only when
// the API's own opening-hours data says it is open 24 hours.
//
// API key (NEVER commit it — read from the environment):
//   export GOOGLE_PLACES_API_KEY="<your Google Places API key>"
//
// Usage:
//   GOOGLE_PLACES_API_KEY=xxx node scripts/fetch-24hr-places.js
//
// Output: data/sg_24hr_places.json  (failures recorded in metadata.errors[]).

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT_PATH = path.join(ROOT, 'data', 'sg_24hr_places.json');

const PLACES_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

// Operator's type list → { Places text query, Places API (New) primary
// type to narrow the search }. This table is the tuning surface: adjust
// a query or includedType here if a real run is too broad / too narrow.
const TYPE_QUERIES = [
  { type: 'Retail',              query: '24 hour convenience store in Singapore', includedType: 'convenience_store' },
  { type: 'Supermarket',         query: '24 hour supermarket in Singapore',       includedType: 'supermarket' },
  { type: 'Clinic',              query: '24 hour clinic in Singapore',            includedType: 'doctor' },
  { type: 'Petrol Station',      query: '24 hour petrol station in Singapore',    includedType: 'gas_station' },
  { type: 'Restaurant',          query: '24 hour restaurant in Singapore',        includedType: 'restaurant' },
  { type: 'Fitness',             query: '24 hour gym in Singapore',               includedType: 'gym' },
  { type: 'Drink',               query: '24 hour cafe in Singapore',              includedType: 'cafe' },
  { type: 'EV Charging Station', query: 'EV charging station in Singapore',       includedType: 'electric_vehicle_charging_station' }
];

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress',
  'places.nationalPhoneNumber', 'places.internationalPhoneNumber',
  'places.googleMapsUri', 'places.regularOpeningHours', 'places.types',
  'nextPageToken'
].join(',');

const MAX_PAGES = 3; // searchText returns up to 20/page; 3 pages ≈ 60 places

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One searchText page — 3× retry with exponential backoff (1s, 2s).
async function searchTextPage(entry, pageToken, key) {
  const body = { textQuery: entry.query, regionCode: 'SG', maxResultCount: 20 };
  if (entry.includedType) body.includedType = entry.includedType;
  if (pageToken) body.pageToken = pageToken;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(PLACES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          'X-Goog-FieldMask': FIELD_MASK
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' ' + (await res.text()).slice(0, 200));
      }
      return await res.json();
    } catch (err) {
      if (attempt === 3) {
        errors.push({
          type: entry.type, query: entry.query,
          error: err.message, timestamp: new Date().toISOString()
        });
        return null;
      }
      await sleep(1000 * (2 ** (attempt - 1)));
    }
  }
  return null;
}

// Open-24-hours test. Places API (New): a 24/7 place's
// regularOpeningHours.periods is a single period with `open`
// {day:0,hour:0,minute:0} and NO `close`; weekdayDescriptions each read
// "Open 24 hours". Both signals are checked defensively — adjust here if
// a real run shows the API uses a different shape.
function isOpen24(hours) {
  if (!hours || typeof hours !== 'object') return false;
  const periods = Array.isArray(hours.periods) ? hours.periods : [];
  if (periods.length === 1) {
    const p = periods[0];
    if (p && p.open && !p.close
      && (p.open.day === 0 || p.open.day == null)
      && !p.open.hour && !p.open.minute) return true;
  }
  const wd = Array.isArray(hours.weekdayDescriptions) ? hours.weekdayDescriptions : [];
  if (wd.length >= 7 && wd.every((d) => /open 24 hours/i.test(String(d)))) return true;
  return false;
}

// All 24-hour places for one type — paginates, keeps only API-confirmed
// 24-hour results, maps each to the operator's field schema.
async function fetchType(entry, key) {
  const out = [];
  let pageToken = null;
  let pages = 0;
  do {
    const payload = await searchTextPage(entry, pageToken, key);
    if (!payload) break;
    for (const pl of (Array.isArray(payload.places) ? payload.places : [])) {
      if (!isOpen24(pl.regularOpeningHours)) continue;
      out.push({
        type: entry.type,
        name: (pl.displayName && pl.displayName.text) || null,
        address: pl.formattedAddress || null,
        tel: pl.nationalPhoneNumber || pl.internationalPhoneNumber || null,
        google_maps_url: pl.googleMapsUri || null,
        place_id: pl.id || null
      });
    }
    pageToken = payload.nextPageToken || null;
    pages += 1;
    if (pageToken) await sleep(2000); // brief wait before a page token activates
  } while (pageToken && pages < MAX_PAGES);
  return out;
}

async function main() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key) {
    console.error('GOOGLE_PLACES_API_KEY is not set — nothing fetched.');
    console.error('Run:  GOOGLE_PLACES_API_KEY=xxx node scripts/fetch-24hr-places.js');
    process.exit(1);
  }

  const seen = new Set();
  const places = [];
  for (const entry of TYPE_QUERIES) {
    const found = await fetchType(entry, key);
    for (const p of found) {
      const dedupKey = p.place_id || (p.name + '|' + p.address);
      if (seen.has(dedupKey)) continue; // a place can match several type queries
      seen.add(dedupKey);
      places.push(p);
    }
  }

  places.sort((a, b) => a.type.localeCompare(b.type)
    || String(a.name).localeCompare(String(b.name)));
  const counts = {};
  for (const p of places) counts[p.type] = (counts[p.type] || 0) + 1;

  const out = {
    metadata: {
      description: 'Singapore places open 24 hours, grouped by type.',
      generated_on: new Date().toISOString().slice(0, 10),
      source: 'Google Places API (New) — places:searchText',
      open_24h_rule: 'Included only when the API\'s regularOpeningHours reports a single '
        + 'period opening at day 0 / 00:00 with no close, or weekdayDescriptions all read '
        + '"Open 24 hours". Places with no opening-hours data are excluded (non-invention).',
      types: TYPE_QUERIES.map((t) => t.type),
      non_invention: 'name / address / tel / google_maps_url are verbatim from the Places '
        + 'API response; missing values are null. Nothing is fabricated.',
      counts,
      total: places.length,
      errors
    },
    places
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log('sg_24hr_places.json written:',
    { total: places.length, counts, errors: errors.length });
}

main();
