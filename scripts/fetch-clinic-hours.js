#!/usr/bin/env node
// scripts/fetch-clinic-hours.js — v0.61.39
//
// One-shot enricher: adds Google-Places opening hours to each clinic in
// data/geo-clinics.json. The CHAS dataset (data.gov.sg) carries no
// opening-hours field, so the clinic map popup can only show hours once
// this script has run.
//
// For every clinic that has no `hours` field yet it issues ONE Places
// `searchText` call (New Places API v1), biased to the clinic's
// coordinates, with `regularOpeningHours` in the field mask — so the
// hours arrive without a separate Place Details call. The nearest
// returned place within MATCH_RADIUS_M of the clinic is accepted; its
// `hours` is stored as the Places `weekdayDescriptions` array
// (Monday-first, 7 strings).
//
// Requires GOOGLE_MAPS_API_KEY in env. Billed: ~1 Places searchText
// call per clinic (~1193 total). Idempotent + resumable — clinics that
// already carry `hours` are skipped, so a re-run only fills the gaps.
//
// Usage:
//   node scripts/fetch-clinic-hours.js           # fetch + write
//   node scripts/fetch-clinic-hours.js --dry     # 20-clinic sample, no write
//   node scripts/fetch-clinic-hours.js --limit 200
//
// Run once (with a funded API key) after merging, then commit the
// updated data/geo-clinics.json. NOTE: re-running scripts/build-geo-
// overlays.js regenerates geo-clinics.json from the raw geojson and
// drops the Places-sourced `hours` — re-run this script afterwards.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CLINICS = path.join(__dirname, '..', 'data', 'geo-clinics.json');
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const MATCH_RADIUS_M = 140;   // accept a Places hit only this near the clinic
const BIAS_RADIUS_M = 200;    // location-bias circle for the text search
const CALL_DELAY_MS = 120;    // gentle pacing between API calls

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Approximate planar distance in metres (fine at city scale).
function metresBetween(aLat, aLng, bLat, bLng) {
  const dy = (bLat - aLat) * 110574;
  const dx = (bLng - aLng) * 111320 * Math.cos(aLat * Math.PI / 180);
  return Math.hypot(dx, dy);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One Places searchText for a clinic → its weekdayDescriptions array,
// or null when no place matches within MATCH_RADIUS_M.
async function lookupHours(clinic) {
  const textQuery = [clinic.name, clinic.street, 'Singapore'].filter(Boolean).join(' ');
  const { data } = await axios.post(
    SEARCH_URL,
    {
      textQuery,
      maxResultCount: 5,
      locationBias: {
        circle: {
          center: { latitude: clinic.lat, longitude: clinic.lng },
          radius: BIAS_RADIUS_M
        }
      }
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.regularOpeningHours'
      },
      timeout: 10000
    }
  );
  const places = Array.isArray(data.places) ? data.places : [];
  let best = null;
  let bestD = Infinity;
  for (const p of places) {
    const lat = p.location && p.location.latitude;
    const lng = p.location && p.location.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const d = metresBetween(clinic.lat, clinic.lng, lat, lng);
    if (d < bestD) { bestD = d; best = p; }
  }
  if (!best || bestD > MATCH_RADIUS_M) return null;
  const wd = best.regularOpeningHours && best.regularOpeningHours.weekdayDescriptions;
  return Array.isArray(wd) && wd.length ? wd : null;
}

async function main() {
  if (!API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY not set — cannot fetch clinic hours.');
    process.exit(1);
  }
  const dry = process.argv.includes('--dry');
  const limArg = process.argv.indexOf('--limit');
  const limit = dry
    ? 20
    : (limArg > -1 ? (Number(process.argv[limArg + 1]) || Infinity) : Infinity);

  const doc = JSON.parse(fs.readFileSync(CLINICS, 'utf8'));
  const features = Array.isArray(doc.features) ? doc.features : [];
  const pending = features.filter((f) => !f.hours
    && Number.isFinite(f.lat) && Number.isFinite(f.lng));
  console.log(`${features.length} clinics; ${pending.length} without hours.`);

  let done = 0;
  let hit = 0;
  let miss = 0;
  let err = 0;
  for (const clinic of pending) {
    if (done >= limit) break;
    done++;
    try {
      const hours = await lookupHours(clinic);
      if (hours) { clinic.hours = hours; hit++; }
      else { miss++; }
    } catch (e) {
      err++;
      console.error(`  [err] ${clinic.name}: ${(e.response && e.response.status) || e.message}`);
    }
    if (done % 50 === 0) {
      console.log(`  …${done}/${pending.length} (hit ${hit}, miss ${miss}, err ${err})`);
    }
    await sleep(CALL_DELAY_MS);
  }
  console.log(`Done: ${done} looked up — ${hit} with hours, ${miss} no match, ${err} errors.`);

  if (dry) { console.log('--dry: not writing.'); return; }
  doc._meta = doc._meta || {};
  doc._meta.hoursLastUpdated = new Date().toISOString().slice(0, 10);
  doc._meta.hoursSource = 'Google Places API (regularOpeningHours)';
  fs.writeFileSync(CLINICS, JSON.stringify(doc));
  console.log(`Wrote ${CLINICS}.`);
}

main();
