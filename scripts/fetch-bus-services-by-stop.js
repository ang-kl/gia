#!/usr/bin/env node
// scripts/fetch-bus-services-by-stop.js — v0.61.56
//
// CR6 Phase 2a — fetches LTA DataMall BusStops + BusRoutes, joins them
// into one record per bus stop: { lat, lng, name, road, services[] }.
// Output is consumed by scripts/build-station-info.js to populate
// exits[].nearest_bus_stop for the CR6 station info card.
//
//   data/bus-services-by-stop.json
//   {
//     "_meta": { ... },
//     "stops": {
//       "<BusStopCode>": { "lat": …, "lng": …, "name": …,
//                          "road": …, "services": ["10","100","NR1",…] }
//     }
//   }
//
// Requires: LTA_ACCOUNT_KEY env var (operator-owned DataMall key —
//           same var that index.js / the live transit feeds already use).
//
// Usage:    LTA_ACCOUNT_KEY=xxx node scripts/fetch-bus-services-by-stop.js
//
// Volume:   ~5,500 bus stops, ~26,000 route records → ~63 API calls in
//           pages of 500.  ~30-60 s total.  Idempotent (re-run to refresh).

'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const KEY = process.env.LTA_ACCOUNT_KEY;
if (!KEY) {
  console.error('LTA_ACCOUNT_KEY env var is required.');
  console.error('Set it to your LTA DataMall account key (same var the live');
  console.error('feeds in index.js use) and re-run.');
  process.exit(1);
}

const OUT_PATH = path.join(__dirname, '..', 'data', 'bus-services-by-stop.json');

const lta = axios.create({
  baseURL: 'https://datamall2.mytransport.sg/ltaodataservice',
  headers: { AccountKey: KEY, Accept: 'application/json' },
  timeout: 30000
});

const PAGE = 500;

async function fetchAll(endpoint) {
  const out = [];
  for (let skip = 0; ; skip += PAGE) {
    const { data } = await lta.get(endpoint, { params: { '$skip': skip } });
    const batch = (data && data.value) || [];
    out.push(...batch);
    if (batch.length < PAGE) break;
  }
  return out;
}

function round6(v) {
  return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null;
}

// Natural-ish sort for service numbers: 5 < 10 < 13 < 100 < NR1 < 5N.
function compareServiceNo(a, b) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  const aN = Number.isFinite(na);
  const bN = Number.isFinite(nb);
  if (aN && bN && na !== nb) return na - nb;
  if (aN !== bN) return aN ? -1 : 1;
  return String(a).localeCompare(String(b));
}

async function main() {
  console.log('LTA DataMall: fetching BusStops…');
  const stops = await fetchAll('/BusStops');
  console.log('  →', stops.length, 'stops');

  console.log('LTA DataMall: fetching BusRoutes…');
  const routes = await fetchAll('/BusRoutes');
  console.log('  →', routes.length, 'route records');

  // Build services-per-stop set map (de-duped across directions).
  const svcByStop = new Map();
  for (const r of routes) {
    const code = r.BusStopCode;
    const svc = r.ServiceNo;
    if (!code || !svc) continue;
    if (!svcByStop.has(code)) svcByStop.set(code, new Set());
    svcByStop.get(code).add(String(svc));
  }

  const result = {};
  for (const s of stops) {
    const code = s.BusStopCode;
    if (!code) continue;
    const svcSet = svcByStop.get(code) || new Set();
    result[code] = {
      lat: round6(s.Latitude),
      lng: round6(s.Longitude),
      name: s.Description || null,
      road: s.RoadName || null,
      services: Array.from(svcSet).sort(compareServiceNo)
    };
  }

  const doc = {
    _meta: {
      comment: 'v0.61.56 — services per bus stop (CR6 Phase 2a); joined from LTA DataMall BusStops + BusRoutes.',
      source: 'LTA DataMall /BusStops + /BusRoutes',
      lastUpdated: new Date().toISOString().slice(0, 10),
      stopCount: Object.keys(result).length,
      routeRecordCount: routes.length
    },
    stops: result
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(doc, null, 2) + '\n');
  console.log('bus-services-by-stop.json written:', Object.keys(result).length, 'stops');
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
