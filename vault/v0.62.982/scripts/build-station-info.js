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
const SRC_BUS    = path.join(ROOT, 'data', 'bus-services-by-stop.json'); // optional, Phase 2a
const SRC_TIMINGS = path.join(ROOT, 'data', 'sg_train_timings.json');    // optional, Phase 2b
const OUT_PATH   = path.join(ROOT, 'data', 'stations.json');

// v0.61.56 — CR6 Phase 2a: each exit's `nearest_bus_stop` is the
// nearest bus stop within this radius. Its `services` list is whatever
// the routes data covers (may be empty while data_realtime/BusRoutes.json
// is only a partial sample) — the stop's coords still drive the card's
// "Bus №" map link, so we bind the nearest stop regardless of services.
const BUS_NEAR_M = 80;

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
// the station name.
function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// v0.61.77 — SBS Transit station-info deep links. SBS's TrainInformation
// page is parameterised: ?TrainLine=<line>&Station=<code>, where <code>
// is SBS's own station code (HBF, TLA, …), distinct from the LTA code
// (NE1, DT18). The map below was scraped from the SBS TrainInformation
// page + its /Ajax/StationDropdown endpoint (2026-05-21). LRT interchange
// centrals (Sengkang STC, Punggol PTC) have no plain station entry in
// SBS's dropdown — they resolve to the East-loop entry (STCE / PTCE),
// matching the operator-supplied PTCE example for Punggol.
const SBS_TRAINLINE = { NEL: 'NEL', DTL: 'DTL', SLRT: 'SKG+LRT', PLRT: 'PGL+LRT' };
const SBS_STATION_CODE = {
  // North East Line
  NE1: 'HBF', NE3: 'OTP', NE4: 'CNT', NE5: 'CQY', NE6: 'DBG', NE7: 'LTI',
  NE8: 'FRP', NE9: 'BNK', NE10: 'PTP', NE11: 'WLH', NE12: 'SER', NE13: 'KVN',
  NE14: 'HGN', NE15: 'BGK', NE16: 'SKG', NE17: 'PGL', NE18: 'PGC',
  // Downtown Line
  DT1: 'BKP', DT2: 'CSW', DT3: 'HVW', DT4: 'HUM', DT5: 'BTW', DT6: 'KAP',
  DT7: 'SAV', DT8: 'TKK', DT9: 'BTN', DT10: 'STV', DT11: 'NEW', DT12: 'LTI',
  DT13: 'RCR', DT14: 'BGS', DT15: 'PMN', DT16: 'BFT', DT17: 'DTN', DT18: 'TLA',
  DT19: 'CNT', DT20: 'FCN', DT21: 'BCL', DT22: 'JLB', DT23: 'BDM', DT24: 'GLB',
  DT25: 'MTR', DT26: 'MPS', DT27: 'UBI', DT28: 'KKB', DT29: 'BDN', DT30: 'BDR',
  DT31: 'TPW', DT32: 'TAM', DT33: 'TPE', DT34: 'UPC', DT35: 'XPO',
  // Sengkang LRT (STC interchange → East-loop entry STCE)
  STC: 'STCE', SE1: 'SE1', SE2: 'SE2', SE3: 'SE3', SE4: 'SE4', SE5: 'SE5',
  SW1: 'SW1', SW2: 'SW2', SW3: 'SW3', SW4: 'SW4', SW5: 'SW5', SW6: 'SW6',
  SW7: 'SW7', SW8: 'SW8',
  // Punggol LRT (PTC interchange → East-loop entry PTCE)
  PTC: 'PTCE', PE1: 'PE1', PE2: 'PE2', PE3: 'PE3', PE4: 'PE4', PE5: 'PE5',
  PE6: 'PE6', PE7: 'PE7', PW1: 'PW1', PW2: 'PW2', PW3: 'PW3', PW4: 'PW4',
  PW5: 'PW5', PW6: 'PW6', PW7: 'PW7'
};

function moreInfoUrl(operator, slug, stationCode, lineCode) {
  if (operator === 'SMRT') {
    return 'https://journey.smrt.com.sg/journey/station_info/' + slug + '/';
  }
  if (operator === 'SBS Transit') {
    const tl = SBS_TRAINLINE[lineCode];
    const sc = SBS_STATION_CODE[stationCode];
    if (tl && sc) {
      return 'https://www.sbstransit.com.sg/Service/TrainInformation'
        + '?TrainLine=' + tl + '&Station=' + sc;
    }
    // Unmapped station → the generic page (operator picks via dropdown).
    return 'https://www.sbstransit.com.sg/Service/TrainInformation';
  }
  return null;
}

function normaliseExitLabel(raw) {
  if (!raw) return null;
  return String(raw).replace(/^Exit\s+/i, '').trim() || null;
}

function round6(n) {
  return Math.round(n * 1e6) / 1e6;
}

// v0.61.65 — exit_centroid: the mean of a station's exit coordinates.
// The exit coords come from the LTA MRT Station Exit GeoJSON (6-decimal,
// precise); the canonical data/mrt-coords.json lat/lng is a coarse
// hand-entered value that can sit 100 m+ (occasionally >1 km) off the
// real station. Both are kept — lat/lng for provenance, exit_centroid as
// the accurate map-render position. null when the station has no exits.
function exitCentroidOf(exits) {
  const pts = (Array.isArray(exits) ? exits : [])
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
  if (!pts.length) return null;
  return {
    lat: round6(pts.reduce((a, e) => a + e.lat, 0) / pts.length),
    lng: round6(pts.reduce((a, e) => a + e.lng, 0) / pts.length),
    exit_count: pts.length
  };
}

function loadBusStops() {
  try {
    const doc = JSON.parse(fs.readFileSync(SRC_BUS, 'utf8'));
    const m = doc && doc.stops ? doc.stops : null;
    if (!m) return null;
    // Pre-flatten to an array for the per-exit linear scan; box-filter
    // then haversine for the small set that survives the box.
    return Object.entries(m).map(([code, s]) => ({
      code, lat: s.lat, lng: s.lng, services: Array.isArray(s.services) ? s.services : []
    }));
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    throw e;
  }
}

// v0.61.67 — CR6 Phase 2b: first/last train timings. Reads
// data/sg_train_timings.json (operator-supplied; verbatim source strings,
// no invention) and returns a station-code → entries[] map plus the
// metadata. Each entry is one line+direction the station appears in:
// { station_code, direction, timings, note, service_adjustment }.
// `line_code` is assigned later, from the stations.json line record.
const TIMING_KEYS = [
  'first_mon_sat', 'first_sat', 'first_sun_ph', 'first_weekday', 'first_weekend',
  'last_daily', 'last_weekday', 'last_weekend', 'last_weekend_ph'
];
function loadTrainTimings() {
  let doc;
  try {
    doc = JSON.parse(fs.readFileSync(SRC_TIMINGS, 'utf8'));
  } catch (e) {
    if (e && e.code === 'ENOENT') return null;
    throw e;
  }
  const meta = doc.metadata || {};
  const adjByLine = {};
  for (const a of (Array.isArray(meta.active_service_adjustments) ? meta.active_service_adjustments : [])) {
    if (a && a.line) adjByLine[a.line] = a;
  }
  const byCode = {};
  for (const [lineCode, line] of Object.entries(doc.lines || {})) {
    const dirs = line && line.directions ? line.directions : {};
    const adj = adjByLine[lineCode];
    for (const [direction, dirObj] of Object.entries(dirs)) {
      for (const st of (Array.isArray(dirObj.stations) ? dirObj.stations : [])) {
        if (!st || !st.code) continue;
        const timings = {};
        for (const k of TIMING_KEYS) if (k in st) timings[k] = st[k];
        const hasTiming = Object.values(timings).some((v) => v != null);
        // Skip entries with neither a timing value nor a source note
        // (e.g. EWL airport-branch stations carry only data_available:false).
        if (!hasTiming && !st.note) continue;
        const entry = {
          station_code: st.code,
          direction,
          timings,
          note: st.note || null
        };
        if (adj) {
          entry.service_adjustment = adj.adjustment
            + (adj.period ? ' (' + adj.period + ')' : '');
        }
        (byCode[st.code] = byCode[st.code] || []).push(entry);
      }
    }
  }
  return { byCode, meta };
}

function metresBetween(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearestBusStop(exit, stops, capM) {
  if (!stops || !stops.length
      || !Number.isFinite(exit.lat) || !Number.isFinite(exit.lng)) return null;
  const boxDeg = capM / 111000 + 1e-6;
  let best = null;
  let bestD = Infinity;
  for (const s of stops) {
    if (!Number.isFinite(s.lat) || !Number.isFinite(s.lng)) continue;
    if (Math.abs(s.lat - exit.lat) > boxDeg) continue;
    if (Math.abs(s.lng - exit.lng) > boxDeg) continue;
    const d = metresBetween(exit.lat, exit.lng, s.lat, s.lng);
    if (d <= capM && d < bestD) { bestD = d; best = s; }
  }
  if (!best) return null;
  return { code: best.code, lat: best.lat, lng: best.lng, services: best.services };
}

function build() {
  const coords = JSON.parse(fs.readFileSync(SRC_COORDS, 'utf8'));
  const exitsDoc = JSON.parse(fs.readFileSync(SRC_EXITS, 'utf8'));
  const exitsByStation = exitsDoc.stations || {};
  // v0.62.533 — case-insensitive station-name join. The exit source keys some
  // stations with different capitalisation than the canonical mrt-coords names
  // (e.g. "Harbourfront" vs "HarbourFront", "Macpherson" vs "MacPherson",
  // "One-North" vs "one-north", "Gardens By The Bay" vs "Gardens by the Bay").
  // The old exact-match `exitsByStation[name]` silently dropped those exits.
  const exitsByStationLC = {};
  for (const [k, v] of Object.entries(exitsByStation)) exitsByStationLC[k.toLowerCase()] = v;
  const busStops = loadBusStops(); // null when data/bus-services-by-stop.json absent
  const trainTimings = loadTrainTimings(); // null when data/sg_train_timings.json absent

  const stations = {};
  const now = new Date().toISOString();

  let opCount = 0;
  let skipFuture = 0;
  let exitsWithBus = 0;
  let stationsWithTimings = 0;

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

    const rawExits = Array.isArray(exitsByStationLC[name.toLowerCase()]) ? exitsByStationLC[name.toLowerCase()] : [];
    const exits = rawExits.map((e) => {
      const nearest = busStops ? findNearestBusStop(e, busStops, BUS_NEAR_M) : null;
      if (nearest) exitsWithBus += 1;
      return {
        label: normaliseExitLabel(e.exit),
        lat: e.lat,
        lng: e.lng,
        nearest_bus_stop: nearest
      };
    });

    // v0.61.67 — CR6 Phase 2b: join first/last-train timings by station
    // code. One entry per (line, direction) the station appears in; the
    // entry's line_code uses the stations.json convention (from `lines`).
    const firstLastTrain = [];
    if (trainTimings) {
      for (const ln of lines) {
        for (const e of (trainTimings.byCode[ln.station_code] || [])) {
          firstLastTrain.push({ line_code: ln.line_code, ...e });
        }
      }
    }
    if (firstLastTrain.length) stationsWithTimings += 1;

    const dqNotes = [];
    if (!exits.length) dqNotes.push('no exits in source');
    if (lines.some((l) => l.operator === 'Unknown')) dqNotes.push('unknown line operator');
    if (lines.some((l) => l.operator === 'SBS Transit'
      && l.more_info_url === 'https://www.sbstransit.com.sg/Service/TrainInformation')) {
      dqNotes.push('SBS more_info_url is the generic page (station code unmapped)');
    }
    if (trainTimings && !firstLastTrain.length) {
      dqNotes.push('no first/last-train timings from source (e.g. LRT loop, or station not listed)');
    }

    stations[name] = {
      station_name: name,
      lat: info.lat,
      lng: info.lng,
      exit_centroid: exitCentroidOf(exits),
      lines,
      exits,
      first_last_train: firstLastTrain,
      last_updated_at: now,
      data_quality_notes: dqNotes
    };
  }

  const out = {
    _meta: {
      comment: 'v0.61.55 — CR6 Phase 1: station info data layer (rule-based + existing-data joins; no scraping).',
      sources: [
        'data/mrt-coords.json (canonical operational station list)',
        'data/station-exits.json (LTA MRT Station Exit GEOJSON)',
        ...(trainTimings ? ['data/sg_train_timings.json (first/last-train timings, operator-supplied)'] : [])
      ],
      lastUpdated: now.slice(0, 10),
      stationCount: opCount,
      futureStationsSkipped: skipFuture,
      busServicesJoined: !!busStops,
      trainTimingsJoined: !!trainTimings,
      stationsWithTrainTimings: stationsWithTimings,
      trainTimingsMeta: trainTimings ? {
        scraped_on: trainTimings.meta.scraped_on || null,
        active_service_adjustments: trainTimings.meta.active_service_adjustments || []
      } : null,
      schemaNotes: [
        busStops
          ? `exits[].nearest_bus_stop = nearest bus stop within ${BUS_NEAR_M} m (from data/bus-services-by-stop.json). Its services[] reflects data_realtime/BusRoutes.json coverage — may be empty while that file is a partial DataMall sample.`
          : 'exits[].nearest_bus_stop: null — run scripts/build-bus-services-by-stop.js to produce data/bus-services-by-stop.json, then re-run this build.',
        'exit_centroid: mean of exits[].lat/lng (LTA MRT Station Exit GeoJSON). The accurate map-render position; lat/lng (mrt-coords.json) is kept for provenance but is coarser. null when no exits.',
        'first_last_train: one entry per (line, direction) a station appears in within data/sg_train_timings.json — { line_code, station_code, direction, timings, note, service_adjustment? }. timings strings are verbatim from source; null + note for terminal/no-data. Empty [] when the source has no per-station data (Sengkang/Punggol LRT loops give town-centre departures only) or the station is not listed.',
        'SMRT more_info_url uses lowercase-hyphen slug; reasonable convention but unverified per-station.',
        'SBS Transit more_info_url is ?TrainLine=<line>&Station=<code>, using SBS station codes scraped from the SBS TrainInformation page (2026-05-21). LRT interchange centrals (Sengkang/Punggol) use the East-loop entry (STCE/PTCE).'
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
    sbs_links:  Object.values(stations).filter((s) => s.lines.some((l) => l.operator === 'SBS Transit' && l.more_info_url)).length,
    bus_services_joined: !!busStops,
    exits_with_bus_stop: exitsWithBus,
    train_timings_joined: !!trainTimings,
    stations_with_train_timings: stationsWithTimings
  };
  console.log('stations.json written:', counts);
}

build();
