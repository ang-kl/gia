#!/usr/bin/env node
// scripts/build-bus-services-by-stop.js — v0.61.56
//
// CR6 Phase 2a — joins committed static LTA datasets into one record
// per bus stop: { lat, lng, services[] }. No network, no API key.
//
// Inputs (committed in the repo):
//   geoloc/LTABusStop.geojson     — full bus stop locations
//                                   (~5,166 stops; BUS_STOP_NUM + coords)
//   data_realtime/BusRoutes.json  — LTA DataMall BusRoutes snapshot
//                                   ({ value: [ { ServiceNo, BusStopCode, … } ] })
//
// Output:
//   data/bus-services-by-stop.json
//   { "_meta": {…}, "stops": { "<code>": { lat, lng, services[] } } }
//
// IMPORTANT — services completeness tracks data_realtime/BusRoutes.json.
// The DataMall BusRoutes endpoint paginates 500 records at a time; a
// full export is ~26,000 records. If the committed file is only a
// sample (few records / one ServiceNo), most stops will carry an empty
// services[]. To get complete service lists: replace
// data_realtime/BusRoutes.json with a full BusRoutes export, then
// re-run this script + scripts/build-station-info.js.
//
// Usage:  node scripts/build-bus-services-by-stop.js

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_GEOJSON = path.join(ROOT, 'geoloc', 'LTABusStop.geojson');
const SRC_ROUTES  = path.join(ROOT, 'data_realtime', 'BusRoutes.json');
const OUT_PATH    = path.join(ROOT, 'data', 'bus-services-by-stop.json');

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

function main() {
  const geo = JSON.parse(fs.readFileSync(SRC_GEOJSON, 'utf8'));
  const routesDoc = JSON.parse(fs.readFileSync(SRC_ROUTES, 'utf8'));
  const routeRecords = Array.isArray(routesDoc.value) ? routesDoc.value
    : (Array.isArray(routesDoc) ? routesDoc : []);

  // services per stop (de-duped across directions)
  const svcByStop = new Map();
  for (const r of routeRecords) {
    const code = r.BusStopCode;
    const svc = r.ServiceNo;
    if (!code || svc == null) continue;
    if (!svcByStop.has(code)) svcByStop.set(code, new Set());
    svcByStop.get(code).add(String(svc));
  }

  const stops = {};
  for (const f of (geo.features || [])) {
    const props = f.properties || {};
    const code = props.BUS_STOP_NUM;
    const coords = (f.geometry && f.geometry.coordinates) || [];
    const lng = round6(coords[0]);
    const lat = round6(coords[1]);
    if (!code || lat == null || lng == null) continue;
    const svcSet = svcByStop.get(code) || new Set();
    stops[code] = {
      lat,
      lng,
      services: Array.from(svcSet).sort(compareServiceNo)
    };
  }

  const total = Object.keys(stops).length;
  const withServices = Object.values(stops).filter((s) => s.services.length).length;
  const partial = withServices < total / 2;

  const doc = {
    _meta: {
      comment: 'v0.61.56 — CR6 Phase 2a; services per bus stop joined from committed static LTA datasets (no live fetch).',
      sources: [
        'geoloc/LTABusStop.geojson (bus stop locations)',
        'data_realtime/BusRoutes.json (ServiceNo per BusStopCode)'
      ],
      lastUpdated: new Date().toISOString().slice(0, 10),
      stopCount: total,
      stopsWithServices: withServices,
      routeRecordCount: routeRecords.length,
      note: partial
        ? 'data_realtime/BusRoutes.json is a partial DataMall sample — most stops have empty services[]. Replace it with a full BusRoutes export and re-run for complete service lists.'
        : 'service coverage looks complete.'
    },
    stops
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(doc) + '\n');
  console.log('bus-services-by-stop.json:', {
    stops: total,
    withServices,
    routeRecords: routeRecords.length,
    partial
  });
}

main();
