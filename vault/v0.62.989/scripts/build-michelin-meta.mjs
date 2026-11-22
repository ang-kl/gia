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
// GEO GUARD (v0.62.2): `regionCode` only *biases* Places searchText — it does
// NOT restrict to a country. Short/generic names in low-Google-coverage
// countries (China especially) matched a data-rich Singapore/Malaysia business
// instead of the real overseas venue (e.g. Seoul "Subaru" → a SG car
// showroom). We now (a) `locationBias` a circle around the venue's CITY
// centroid, and (b) HARD-REJECT any match outside the venue's country bbox or
// >MAX_DIST_KM from the city centroid — a wrong match becomes *unresolved*
// (omitted) rather than a confidently-wrong placeId. Better blank than wrong.
//
// RUN (with your key; monthly cadence is fine — rating/price/hours drift slowly):
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/build-michelin-meta.mjs
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/build-michelin-meta.mjs --dry-run
//   # Re-run only some countries and MERGE into the existing snapshot (keeps the
//   # rest; purges entries that now fail the guard):
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/build-michelin-meta.mjs --countries=CN,KR,TW
//   # Re-resolve specific ids only (cheap correctness check), dry:
//   GOOGLE_MAPS_API_KEY=xxxx node scripts/build-michelin-meta.mjs --ids=kr-sel-san,cn-sha-tan --dry-run
//
// G4 (paid external API): bounded, offline, one searchText (+ optional social +
// at most one geocode per uncovered city) per curated venue — NOT per user search.
//
// NOTE: --countries / --ids run in MERGE mode (load existing snapshot, replace
// only the selected ids, keep everything else). A bare run rebuilds the whole file.

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

function argVal(flag) {
  const a = process.argv.find((x) => x.startsWith(flag + '='));
  return a ? a.slice(flag.length + 1) : null;
}
const ONLY_COUNTRIES = (argVal('--countries') || '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
const ONLY_IDS = (argVal('--ids') || '').split(',').map((s) => s.trim()).filter(Boolean);
const MERGE = ONLY_COUNTRIES.length > 0 || ONLY_IDS.length > 0;

const michelin = require(path.join(ROOT, 'michelin-data.js'));
const cc = require(path.join(ROOT, 'city-centroids.js'));
const CENT = cc.CITY_CENTROIDS || cc;
let getSocialProfiles = null, pickTopProfiles = null;
try {
  ({ getSocialProfiles, pickTopProfiles } = require(path.join(ROOT, 'social-profiles.js')));
} catch { /* social is best-effort */ }

// Same fields the live handler reads (FIELD_MASK), as the search mask.
const SEARCH_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.businessStatus',
  'places.googleMapsUri', 'places.primaryType', 'places.primaryTypeDisplayName',
  'places.regularOpeningHours.weekdayDescriptions',
  'places.websiteUri', 'places.nationalPhoneNumber', 'places.priceLevel',
  'places.priceRange', 'places.accessibilityOptions.wheelchairAccessibleEntrance'
].join(',');
const PRICE_NUM = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };

// Generous country bboxes [latMin, latMax, lngMin, lngMax] — the HARD guard
// against cross-country leaks (the wrong matches were 1,000–4,000 km away, so
// these wide boxes never false-reject a same-country venue).
const BBOX = {
  SG: [1.1, 1.55, 103.5, 104.1], MY: [0.5, 7.6, 99.3, 119.6], TH: [5.5, 20.7, 97.2, 105.8],
  ID: [-11, 6.5, 94.5, 141.5], VN: [8.0, 23.6, 102, 110], PH: [4.4, 21.2, 116, 127],
  HK: [22.1, 22.6, 113.8, 114.5], MO: [22.0, 22.27, 113.5, 113.66], KR: [33, 38.7, 124.5, 131.1],
  JP: [24, 46, 122, 154], TW: [21.8, 25.4, 119.4, 122.1], IN: [6.5, 35.6, 68, 97.6],
  CN: [17.5, 53.7, 73, 135.2]
};
const MAX_DIST_KM = 150;   // reject a match >150 km from the city centroid

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function haversineKm(a, b) {
  const R = 6371, r = (x) => x * Math.PI / 180;
  const dLa = r(b.lat - a.lat), dLo = r(b.lng - a.lng);
  const s = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// City centroid: prefer city-centroids.js; else geocode once (best-effort, cached).
const geoCache = new Map();
async function centroidFor(entry) {
  const c = CENT[entry.city];
  if (c && Number.isFinite(c.lat) && Number.isFinite(c.lng)) return { lat: c.lat, lng: c.lng };
  const key = `${entry.city}|${entry.country}`;
  if (geoCache.has(key)) return geoCache.get(key);
  let res = null;
  try {
    const q = encodeURIComponent(`${entry.city}, ${entry.country}`);
    const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${q}&key=${KEY}`);
    if (r.ok) {
      const d = await r.json();
      const loc = d?.results?.[0]?.geometry?.location;
      if (loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng)) res = { lat: loc.lat, lng: loc.lng };
    }
  } catch { /* geocode best-effort — bbox guard still applies */ }
  geoCache.set(key, res);
  return res;
}

async function resolveOne(entry) {
  const textQuery = `${entry.name} ${entry.city || ''}`.trim();
  const regionCode = String(entry.country || '').toUpperCase();
  const centroid = await centroidFor(entry);
  const body = { textQuery, regionCode, languageCode: 'en', maxResultCount: 1 };
  // Soft bias toward the venue's metro (50 km) when we know the centroid.
  if (centroid) body.locationBias = { circle: { center: { latitude: centroid.lat, longitude: centroid.lng }, radius: 50000 } };

  let p = null;
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': SEARCH_MASK },
      body: JSON.stringify(body)
    });
    if (r.ok) { const d = await r.json(); p = (Array.isArray(d?.places) ? d.places : [])[0] || null; }
    else { console.warn(`  ! ${entry.id}: HTTP ${r.status}`); }
  } catch (err) { console.warn(`  ! ${entry.id}: ${err.message}`); }
  if (!p || !p.id) return null;

  // HARD GEO GUARD — reject cross-country / far-from-city leaks. Better the
  // venue stays unresolved (handler text-search fallback) than carry a
  // confidently-wrong placeId.
  const lat = p.location?.latitude, lng = p.location?.longitude;
  const bb = BBOX[regionCode];
  if (bb && Number.isFinite(lat) && Number.isFinite(lng) && (lat < bb[0] || lat > bb[1] || lng < bb[2] || lng > bb[3])) {
    console.warn(`  ✗ ${entry.id}: rejected — match "${p.displayName?.text || '?'}" at ${lat?.toFixed(3)},${lng?.toFixed(3)} outside ${regionCode} bbox`);
    return null;
  }
  if (centroid && Number.isFinite(lat) && Number.isFinite(lng)) {
    const dkm = haversineKm({ lat, lng }, centroid);
    if (dkm > MAX_DIST_KM) {
      console.warn(`  ✗ ${entry.id}: rejected — match "${p.displayName?.text || '?'}" ${Math.round(dkm)}km from ${entry.city} centroid`);
      return null;
    }
  }

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
    lat: lat ?? null,
    lng: lng ?? null,
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

// Select the venue set.
let venues = michelin.visitableVenues(michelin.getAllVenues());
if (ONLY_COUNTRIES.length) venues = venues.filter((v) => ONLY_COUNTRIES.includes(String(v.country || '').toUpperCase()));
if (ONLY_IDS.length) venues = venues.filter((v) => ONLY_IDS.includes(v.id));

// Merge mode: start from the existing snapshot so untouched ids are preserved.
let out = {};
if (MERGE && fs.existsSync(OUT)) {
  try { out = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { out = {}; }
}
const baseCount = Object.keys(out).length;

console.log(`Resolving ${venues.length} Michelin venues${DRY ? ' (dry-run)' : ''}${MERGE ? ` [MERGE into ${baseCount} existing]` : ''}…`);
let ok = 0, fail = 0, purged = 0;
for (const v of venues) {
  const rec = await resolveOne(v);
  if (rec) { out[v.id] = rec; ok++; }
  else { fail++; if (MERGE && out[v.id]) { delete out[v.id]; purged++; } }   // purge now-rejected wrong entries
  await sleep(120);
}
console.log(`Resolved ${ok}/${venues.length} (${fail} unresolved${MERGE ? `, ${purged} stale entries purged` : ''}).`);
if (DRY) { console.log('--dry-run: not writing.'); process.exit(0); }
fs.writeFileSync(OUT, JSON.stringify(out, null, 0) + '\n');
console.log(`Wrote ${OUT} (${Object.keys(out).length} entries).`);
