#!/usr/bin/env node
// scripts/fetch-hospitals.js — v0.61.40
//
// One-shot builder for data/geo-hospitals.json — the 🏥 Hospital map
// overlay layer. There is no government geojson for this layer, so the
// facility list is curated in data/Hospital_Sample.MD (acute /
// psychiatric / community hospitals, national specialty centres and
// polyclinics) and this script enriches each entry.
//
// Two sources, merged:
//   1. data/Hospital_Sample.MD — the canonical name list (grouped by
//      category) PLUS the "# Example:" detail lines, which carry the
//      curated extras Google Places cannot give: purpose-labelled
//      appointment / urgent-care numbers, WhatsApp numbers, the
//      official website, and operating-hours prose.
//   2. Google Places searchText (New Places API v1) — one call per
//      facility for coordinates, formatted address, the main phone,
//      website fallback and machine-readable opening hours.
//
// Requires GOOGLE_MAPS_API_KEY in env. ~85 Places calls (<$1).
// Idempotent + resumable — facilities already in geo-hospitals.json
// with coordinates are skipped, so a re-run only fills the gaps.
//
// Usage:
//   node scripts/fetch-hospitals.js           # fetch + write
//   node scripts/fetch-hospitals.js --dry     # parse + 8-facility sample, no write
//
// Output: data/geo-hospitals.json — { _meta, features: [ … ] }.

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const MD = path.join(__dirname, '..', 'data', 'Hospital_Sample.MD');
const OUT = path.join(__dirname, '..', 'data', 'geo-hospitals.json');
const SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const CALL_DELAY_MS = 130;
const SG = { latMin: 1.15, latMax: 1.50, lngMin: 103.55, lngMax: 104.10 };

const API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// A heading like "# Community hospitals" → a readable category.
function categoryOf(heading) {
  const h = heading.toLowerCase();
  if (h.includes('psychiatric')) return 'Psychiatric hospital';
  if (h.includes('community')) return 'Community hospital';
  if (h.includes('specialty') || h.includes('speciality')) return 'National specialty centre';
  if (h.includes('polyclinic')) return 'Polyclinic';
  if (h.includes('acute')) return 'Acute hospital';
  return 'Hospital';
}

const normName = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Parse Hospital_Sample.MD → { list: [{name, category}], detail: Map }.
function parseMd() {
  const text = fs.readFileSync(MD, 'utf8');
  const lines = text.split(/\r?\n/);
  const dividerIdx = lines.findIndex((l) => /^[—–-]{6,}/.test(l.trim()));
  const split = dividerIdx > -1 ? dividerIdx : lines.length;

  const list = [];
  let category = 'Hospital';
  for (let i = 0; i < split; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (raw.startsWith('#')) { category = categoryOf(raw.replace(/^#+/, '').trim()); continue; }
    list.push({ name: raw, category });
  }

  const detail = new Map();
  for (let i = split; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith('#')) continue;
    const parts = raw.split(' - ').map((p) => p.trim()).filter(Boolean);
    if (parts.length < 2) continue;
    const rec = { phones: [] };
    rec.name = parts[0];
    for (let j = 1; j < parts.length; j++) {
      const part = parts[j];
      const m = part.match(/^([^:]+):\s*(.+)$/);
      if (!m) {
        if (/singapore\s*\d{5,6}/i.test(part)) rec.address = part;
        continue;
      }
      const key = m[1].trim();
      const val = m[2].trim();
      const kl = key.toLowerCase();
      if (/whatsapp/.test(kl) && /hour/.test(kl)) { rec.whatsappHours = val; continue; }
      if (/whatsapp/.test(kl)) { if (/\d/.test(val)) rec.whatsapp = val; continue; }
      if (/operating hours/.test(kl)) { rec.hoursNote = val; continue; }
      if (/website/.test(kl)) { rec.website = val; continue; }
      if (/\d/.test(val)) {
        let purpose = key;
        if (/^tel$/.test(kl) || /main line/.test(kl)) purpose = 'Main';
        else if (/^appointments?$/.test(kl)) purpose = 'Appointments';
        else if (/urgent care/.test(kl)) purpose = 'Urgent Care';
        rec.phones.push({ purpose, number: val });
      }
    }
    detail.set(normName(rec.name), rec);
  }
  return { list, detail };
}

// Find a parsed-detail record for a facility name (exact, then prefix).
function detailFor(name, detail) {
  const n = normName(name);
  if (detail.has(n)) return detail.get(n);
  for (const [k, v] of detail) {
    if (k.startsWith(n) || n.startsWith(k)) return v;
  }
  return null;
}

function postalOf(address) {
  const m = String(address || '').match(/singapore\s*(\d{5,6})/i);
  return m ? m[1] : null;
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
          'places.displayName', 'places.location', 'places.formattedAddress',
          'places.nationalPhoneNumber', 'places.websiteUri',
          'places.regularOpeningHours'
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
    console.error('GOOGLE_MAPS_API_KEY not set — cannot fetch hospitals.');
    process.exit(1);
  }
  const dry = process.argv.includes('--dry');
  const { list, detail } = parseMd();
  console.log(`Parsed ${list.length} facilities; ${detail.size} with curated detail.`);

  const existing = new Map();
  if (!dry && fs.existsSync(OUT)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, 'utf8'));
      for (const f of (prev.features || [])) {
        if (Number.isFinite(f.lat) && Number.isFinite(f.lng)) existing.set(normName(f.name), f);
      }
    } catch (e) { /* ignore a corrupt prior file */ }
  }

  const todo = dry ? list.slice(0, 8) : list;
  const features = [];
  let hit = 0;
  let miss = 0;
  let err = 0;
  for (const fac of todo) {
    const cached = existing.get(normName(fac.name));
    if (cached) { features.push(cached); continue; }
    const d = detailFor(fac.name, detail);
    let place = null;
    try {
      place = await placeLookup(fac.name);
    } catch (e) {
      err++;
      console.error(`  [err] ${fac.name}: ${(e.response && e.response.status) || e.message}`);
    }
    await sleep(CALL_DELAY_MS);
    if (!place) {
      miss++;
      console.error(`  [no coords] ${fac.name} — skipped (no Places match in SG)`);
      continue;
    }
    hit++;
    const address = (d && d.address) || place.formattedAddress || null;
    const feat = {
      name: fac.name,
      category: fac.category,
      lat: place.location.latitude,
      lng: place.location.longitude
    };
    if (address) feat.address = address.replace(/,?\s*Singapore\s*\d{5,6}\s*$/i, '').trim() || address;
    const postal = postalOf(address);
    if (postal) feat.postal = postal;
    const phones = (d && d.phones && d.phones.length)
      ? d.phones
      : (place.nationalPhoneNumber ? [{ purpose: 'Main', number: place.nationalPhoneNumber }] : []);
    if (phones.length) feat.phones = phones;
    if (d && d.whatsapp) feat.whatsapp = d.whatsapp;
    if (d && d.whatsappHours) feat.whatsappHours = d.whatsappHours;
    const website = (d && d.website) || place.websiteUri || null;
    if (website) feat.website = website;
    const wd = place.regularOpeningHours && place.regularOpeningHours.weekdayDescriptions;
    if (Array.isArray(wd) && wd.length) feat.hours = wd;
    if (d && d.hoursNote) feat.hoursNote = d.hoursNote;
    features.push(feat);
  }
  console.log(`Done: ${hit} located, ${miss} no Places match, ${err} errors; ${features.length} features.`);

  if (dry) {
    console.log(JSON.stringify(features.slice(0, 3), null, 2));
    console.log('--dry: not writing.');
    return;
  }
  const doc = {
    _meta: {
      comment: 'Built by scripts/fetch-hospitals.js from data/Hospital_Sample.MD + Google Places',
      source: 'Curated (Hospital_Sample.MD) + Google Places API',
      lastUpdated: new Date().toISOString().slice(0, 10),
      featureCount: features.length
    },
    features
  };
  fs.writeFileSync(OUT, JSON.stringify(doc));
  console.log(`Wrote ${OUT} (${features.length} features).`);
}

main();
