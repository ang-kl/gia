#!/usr/bin/env node
'use strict';

// scripts/fetch-attraction-details.js — v0.61.109
//
// Enriches the STB tourist-attraction overlay layer. The base layer
// (data/geo-attractions.json, built by scripts/build-geo-overlays.js
// from geoloc/TouristAttractions.geojson) carries only name / address /
// website / opening-hours prose / nearest station — the operator asked
// for star rating, contact, structured hours, accessibility and an
// Instagram link too.
//
// Two sources, merged into data/attraction-details.json (name-keyed):
//   1. Google Places searchText (New Places API v1) — one call per
//      attraction for rating + review count, the main phone, machine-
//      readable opening hours, a website fallback and the wheelchair-
//      accessible-entrance flag.
//   2. The attraction's own website — fetched once and scanned for an
//      instagram.com/<handle> link (Google Places does not expose
//      social handles).
//
// build-geo-overlays.js performs an OPTIONAL join against this file:
// when it is absent or empty the attraction layer simply ships without
// the extra fields, so this script is a non-blocking enrichment step.
//
// Requires GOOGLE_MAPS_API_KEY in env. ~109 Places calls (<$2).
// Idempotent + resumable — attractions already in attraction-details.json
// are skipped, so a re-run only fills the gaps.
//
// Usage:
//   node scripts/fetch-attraction-details.js          # fetch + write
//   node scripts/fetch-attraction-details.js --dry     # 6-attraction sample, no write

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const DATA = path.join(__dirname, '..', 'data');
const SRC = path.join(DATA, 'geo-attractions.json');
const OUT = path.join(DATA, 'attraction-details.json');
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const CALL_DELAY_MS = 130;
const SG = { latMin: 1.15, latMax: 1.50, lngMin: 103.55, lngMax: 104.10 };

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The STB PAGETITLE is a verbose marketing string ("Orchard Road,
// Singapore: Asia's Most Famous Shopping Street") — reduce it to the
// bare landmark name for a clean Places textQuery. Mirrors
// cleanAttractionName() in build-geo-overlays.js.
function cleanName(raw) {
  let s = String(raw || '').replace(/â€™/g, "'").replace(/â€[“”™]/g, '-');
  s = s.split(/[:(,–]/)[0];
  s = s.split(/\s*-\s+/)[0];
  return s.replace(/\s+in\s+singapore$/i, '').replace(/\s+singapore$/i, '')
    .replace(/\s+/g, ' ').trim();
}

// Reserved Instagram paths that are not a profile handle.
const IG_RESERVED = new Set([
  'p', 'reel', 'reels', 'explore', 'accounts', 'about', 'developer',
  'legal', 'directory', 'tv', 'stories'
]);

// Scan a page's HTML for the first real instagram.com profile link.
function instagramFromHtml(html) {
  const re = /instagram\.com\/([A-Za-z0-9_.]+)/gi;
  let m;
  while ((m = re.exec(String(html || '')))) {
    const handle = m[1].replace(/\.$/, '');
    if (handle && !IG_RESERVED.has(handle.toLowerCase())) {
      return 'https://www.instagram.com/' + handle;
    }
  }
  return null;
}

async function scrapeInstagram(website) {
  if (!website) return null;
  const url = /^https?:\/\//.test(website) ? website : 'https://' + website;
  try {
    const { data } = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 4,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SoleatBot/1.0)' },
      responseType: 'text',
      transformResponse: [(d) => d]
    });
    return instagramFromHtml(data);
  } catch (e) {
    return null;
  }
}

async function placeLookup(name) {
  const { data } = await axios.post(
    SEARCH_URL,
    { textQuery: name + ', Singapore', maxResultCount: 3 },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': [
          'places.displayName', 'places.location',
          'places.nationalPhoneNumber', 'places.websiteUri',
          'places.regularOpeningHours', 'places.rating',
          'places.userRatingCount', 'places.accessibilityOptions'
        ].join(',')
      },
      timeout: 10000
    }
  );
  for (const p of (Array.isArray(data.places) ? data.places : [])) {
    const lat = p.location && p.location.latitude;
    const lng = p.location && p.location.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < SG.latMin || lat > SG.latMax || lng < SG.lngMin || lng > SG.lngMax) continue;
    return p;
  }
  return null;
}

async function main() {
  if (!API_KEY) {
    console.error('GOOGLE_MAPS_API_KEY not set — cannot fetch attraction details.');
    process.exit(1);
  }
  const dry = process.argv.includes('--dry');

  let attractions = [];
  try {
    const src = JSON.parse(fs.readFileSync(SRC, 'utf8'));
    attractions = Array.isArray(src.features) ? src.features : [];
  } catch (e) {
    console.error('Cannot read data/geo-attractions.json — run build:geo first.');
    process.exit(1);
  }
  console.log(`Parsed ${attractions.length} attractions from geo-attractions.json.`);

  const details = {};
  if (!dry && fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      if (prev && prev.details && typeof prev.details === 'object') {
        Object.assign(details, prev.details);
      }
    } catch (e) { /* ignore a corrupt prior file */ }
  }

  const todo = dry ? attractions.slice(0, 6) : attractions;
  let hit = 0;
  let miss = 0;
  let err = 0;
  for (const a of todo) {
    if (!a || !a.name) continue;
    if (!dry && details[a.name]) continue;            // resume — already done
    let place = null;
    try {
      place = await placeLookup(cleanName(a.name));
    } catch (e) {
      err++;
      console.error(`  [err] ${a.name}: ${(e.response && e.response.status) || e.message}`);
    }
    await sleep(CALL_DELAY_MS);
    if (!place) {
      miss++;
      console.error(`  [no match] ${a.name} — skipped (no Places result in SG)`);
      continue;
    }
    hit++;
    const rec = {};
    if (Number.isFinite(place.rating)) rec.rating = place.rating;
    if (Number.isFinite(place.userRatingCount)) rec.ratingCount = place.userRatingCount;
    if (place.nationalPhoneNumber) rec.phone = place.nationalPhoneNumber;
    const wd = place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions;
    if (Array.isArray(wd) && wd.length) rec.hoursWeek = wd;
    if (place.websiteUri) rec.website = place.websiteUri;
    const acc = place.accessibilityOptions;
    if (acc && acc.wheelchairAccessibleEntrance === true) rec.wheelchair = true;
    const ig = await scrapeInstagram(a.website || place.websiteUri);
    if (ig) rec.instagram = ig;
    details[a.name] = rec;
  }
  console.log(`Done: ${hit} enriched, ${miss} no Places match, ${err} errors; ${Object.keys(details).length} total.`);

  if (dry) {
    console.log(JSON.stringify(details, null, 2));
    console.log('--dry: not writing.');
    return;
  }
  const doc = {
    _meta: {
      comment: 'Built by scripts/fetch-attraction-details.js — Google Places + website Instagram scrape. Joined into geo-attractions.json by build-geo-overlays.js.',
      source: 'Google Places API + attraction websites',
      lastUpdated: new Date().toISOString().slice(0, 10),
      detailCount: Object.keys(details).length
    },
    details
  };
  fs.writeFileSync(OUT, JSON.stringify(doc));
  console.log(`Wrote ${OUT} (${Object.keys(details).length} attractions).`);
}

main();
