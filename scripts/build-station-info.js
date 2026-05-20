#!/usr/bin/env node
// scripts/build-station-info.js — v0.61.55
//
// Phase 1 of CR6 (the "station info card"): assemble a unified
// per-station record from data already curated in the repo. No web
// scraping; no new external fetches. Joins:
//
//   data/mrt-coords.json     → canonical station list, codes, lines, lat/lng
//   data/station-exits.json  → exits + coords per station (from LTA GEOJSON)
//
// Output:
//   data/stations.json
//   {
//     "_meta": { ... },
//     "stations": {
//       "<Station Name>": {
//         "station_name": "...",
//         "lat": ..., "lng": ...,
//         "lines": [ { operator, line_code, line_name, station_code,
//                      station_slug, more_info_url } ],
//         "exits": [ { label, lat, lng, nearest_bus_stop } ],
//         "first_last_train": [ ... ],
//         "last_updated_at": "<ISO>",
//         "data_quality_notes": [ ... ]
//       }
//     }
//   }
//
// Deferred to Phase 2 follow-ups (each needs a new LTA fetch):
//   - nearest_bus_stop per exit (LTA DataMall BusRoutes → services-per-stop,
//     then nearest-stop lookup capped at ~80 m).
//   - first_last_train (source TBD — data.gov.sg dataset if it exists, else
//     a one-shot curated file).
//
// Usage:
//   node scripts/build-station-info.js

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_COORDS = path.join(ROOT, 'data', 'mrt-coords.json');
const SRC_EXITS  = path.join(ROOT, 'data', 'station-exits.json');
const OUT_PATH   = path.join(ROOT, 'data', 'stations.json');

// Line code → { display name, operator }. Operators per the CR6 brief:
// SMRT runs NSL / EWL / CCL / TEL / BPLRT; SBS Transit runs DTL / NEL /
// SKLRT / PGLRT. CGL (East-West Changi branch) is operationally SMRT.
// JRL / CRL are future LTA-let lines; left as "LTA" until they open.
const LINE_META = {
  NSL:  { name: 'North-South Line',        operator: 'SMRT' },
  EWL:  { name: 'East-West Line',          operator: 'SMRT' },
  CGL:  { name: 'East-West Line (Changi branch)', operator: 'SMRT' },
  CCL:  { name: 'Circle Line',             operator: 'SMRT' },
  TEL:  { name: 'Thomson-East Coast Line', operator: 'SMRT' },
  BPL:  { name: 'Bukit Panjang LRT',       operator: 'SMRT' },
  DTL:  { name: 'Downtown Line',           operator: 'SBS Transit' },
  NEL:  { name: 'North East Line',         operator: 'SBS Transit' },
  SLRT: { name: 'Sengkang LRT',            operator: 'SBS Transit' },
  PLRT: { name: 'Punggol LRT',             operator: 'SBS Transit' },
  JRL:  { name: 'Jurong Region Line',      operator: 'LTA' },
  CRL:  { name: 'Cross Island Line',       operator: 'LTA' }
};

// SMRT's station-info pages use a lowercase-hyphen slug derived from
// the station name. SBS Transit uses its own opaque 3-letter codes in
// URLs (e.g. ?Station=BKP for Bukit Panjang), which differ from the
// LTA station code (DT1/BP6). Curating that mapping is a Phase 2
// follow-up; for now SBS links go to the generic Train Information
// page so the operator can pick the station via its in-page dropdown.
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function moreInfoUrl(operator, slug, stationCode, lineCode) {
  if (operator === 'SMRT') {
    return 'https://journey.smrt.com.sg/journey/station_info/' + slug + '/';
  }
  if (operator === 'SBS Transit') {
    return 'https://www.sbstransit.com.sg/Service/TrainInformation';
  }
  return null;
}

function normaliseExitLabel(raw) {
  if (!raw) return null;
  return String(raw).replace(/^Exit\s+/i, '').trim() || null;
}

function build() {
  const coords = JSON.parse(fs.readFileSync(SRC_COORDS, 'utf8'));
  const exitsDoc = JSON.parse(fs.readFileSync(SRC_EXITS, 'utf8'));
  const exitsByStation = exitsDoc.stations || {};

  const stations = {};
  const now = new Date().toISOString();

  let opCount = 0;
  let skipFuture = 0;

  for (const [name, info] of Object.entries(coords)) {
    if (name === '_meta') continue;
    if (!info || info.status !== 'operational') { skipFuture += 1; continue; }
    opCount += 1;

    const slug = slugify(name);
    const codes = Array.isArray(info.codes) ? info.codes : [];
    const lineCodes = Array.isArray(info.lines) ? info.lines : [];

    const lines = lineCodes.map((lineCode, i) => {
      const meta = LINE_META[lineCode] || { name: lineCode, operator: 'Unknown' };
      const stationCode = codes[i] || null;
      return {
        operator: meta.operator,
        line_code: lineCode,
        line_name: meta.name,
        station_code: stationCode,
        station_slug: slug,
        more_info_url: moreInfoUrl(meta.operator, slug, stationCode, lineCode)
      };
    });

    const rawExits = Array.isArray(exitsByStation[name]) ? exitsByStation[name] : [];
    const exits = rawExits.map((e) => ({
      label: normaliseExitLabel(e.exit),
      lat: e.lat,
      lng: e.lng,
      nearest_bus_stop: null
    }));

    const dqNotes = [];
    if (!exits.length) dqNotes.push('no exits in source');
    if (lines.some((l) => l.operator === 'Unknown')) dqNotes.push('unknown line operator');
    if (lines.some((l) => l.operator === 'SBS Transit')) {
      dqNotes.push('SBS more_info_url is generic (per-station code mapping not curated)');
    }

    stations[name] = {
      station_name: name,
      lat: info.lat,
      lng: info.lng,
      lines,
      exits,
      first_last_train: [],
      last_updated_at: now,
      data_quality_notes: dqNotes
    };
  }

  const out = {
    _meta: {
      comment: 'v0.61.55 — CR6 Phase 1: station info data layer (rule-based + existing-data joins; no scraping).',
      sources: [
        'data/mrt-coords.json (canonical operational station list)',
        'data/station-exits.json (LTA MRT Station Exit GEOJSON)'
      ],
      lastUpdated: now.slice(0, 10),
      stationCount: opCount,
      futureStationsSkipped: skipFuture,
      schemaNotes: [
        'first_last_train: [] — deferred to Phase 2 (source TBD: data.gov.sg dataset if it exists, else curated commit).',
        'exits[].nearest_bus_stop: null — deferred to Phase 2 (needs LTA DataMall BusRoutes services-per-stop fetch).',
        'SMRT more_info_url uses lowercase-hyphen slug; reasonable convention but unverified per-station.',
        'SBS Transit more_info_url is generic; per-station codes (e.g. BKP for Bukit Panjang) require curated mapping.'
      ]
    },
    stations
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  const counts = {
    stations: opCount,
    skipped_future: skipFuture,
    with_exits: Object.values(stations).filter((s) => s.exits.length).length,
    smrt_links: Object.values(stations).filter((s) => s.lines.some((l) => l.operator === 'SMRT' && l.more_info_url)).length,
    sbs_links:  Object.values(stations).filter((s) => s.lines.some((l) => l.operator === 'SBS Transit' && l.more_info_url)).length
  };
  console.log('stations.json written:', counts);
}

build();
