#!/usr/bin/env node
// scripts/enrich-nearest-bus-stops.js — v0.61.63
//
// CR6 — per-station "nearest bus stops" enrichment. For every train
// station it triangulates the nearest bus stops from:
//   1. the station centroid,
//   2. each station exit (where available),
//   3. every bus stop's coordinates,
// using coordinate-based Haversine distance (never name matching).
//
// Two-stage, so the geometric core runs fully offline and verifiable:
//
//   Stage A — offline triangulation (always runs):
//     committed `data/stations.json` (station + exit coords) +
//     `geoloc/LTABusStop.geojson` (5,166 bus stops — codes + coords,
//     an LTA / data.gov.sg dataset) → nearest bus stops per station.
//
//   Stage B — OneMap name pass (runs only when ONEMAP_API_KEY is set):
//     GET /api/public/nearbysvc/getNearestBusStops per station →
//     fills `bus_stop_name`. Without the key, names stay null and a
//     data_quality_note records that the OneMap pass is pending.
//
// Outputs (all under data/):
//   stations_with_nearest_bus_stops.json
//   nearest_bus_stop_errors.json
//   nearest_bus_stop_coverage_report.json
//
// Non-invention: bus stop codes / coordinates come only from the LTA
// GeoJSON; names only from OneMap. Anything unavailable is `null`.
//
// Usage:
//   node scripts/enrich-nearest-bus-stops.js            # Stage A only
//   ONEMAP_API_KEY=xxx node scripts/enrich-nearest-bus-stops.js   # A + B

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC_STATIONS = path.join(ROOT, 'data', 'stations.json');
const SRC_BUSSTOPS = path.join(ROOT, 'geoloc', 'LTABusStop.geojson');
const OUT_MAIN     = path.join(ROOT, 'data', 'stations_with_nearest_bus_stops.json');
const OUT_ERRORS   = path.join(ROOT, 'data', 'nearest_bus_stop_errors.json');
const OUT_COVERAGE = path.join(ROOT, 'data', 'nearest_bus_stop_coverage_report.json');

const RADIUS_TIERS = [400, 800, 1000]; // metres — expand when < 3 found / 0 found
const MIN_AT_TIER1 = 3;                // < this at 400 m → expand to 800 m
const KEEP_MAX = 5;                    // keep top 3–5 per station
const ONEMAP_BASE = 'https://www.onemap.gov.sg/api/public/nearbysvc/getNearestBusStops';
const SRC_GEOJSON = 'data.gov.sg (LTA Bus Stop GeoJSON)';
const SRC_MRTCOORDS = 'data.gov.sg / OneMap (via data/mrt-coords.json)';
const SRC_EXITS = 'data.gov.sg (LTA MRT Station Exit GeoJSON)';

const errors = [];

function haversine(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s)));
}

function round6(v) {
  return Number.isFinite(v) ? Math.round(v * 1e6) / 1e6 : null;
}

// --- bus stop universe (committed GeoJSON) ---------------------------
function loadBusStops() {
  const geo = JSON.parse(fs.readFileSync(SRC_BUSSTOPS, 'utf8'));
  const out = [];
  for (const f of (geo.features || [])) {
    const props = f.properties || {};
    const code = props.BUS_STOP_NUM;
    const coords = (f.geometry && f.geometry.coordinates) || [];
    const lng = round6(coords[0]);
    const lat = round6(coords[1]);
    if (!code || lat == null || lng == null) continue;
    out.push({ code: String(code), lat, lng, raw: props });
  }
  return out;
}

// --- Stage A: triangulate nearest bus stops for one station ----------
function triangulate(station, busStops) {
  const { lat, lng } = station;
  const exits = (Array.isArray(station.exits) ? station.exits : [])
    .filter((e) => Number.isFinite(e.lat) && Number.isFinite(e.lng));
  const hasExits = exits.length > 0;

  // expanding-radius search around the station centroid
  let tier = RADIUS_TIERS[0];
  let near = stopsWithin(busStops, lat, lng, RADIUS_TIERS[0]);
  if (near.length < MIN_AT_TIER1) {
    tier = RADIUS_TIERS[1];
    near = stopsWithin(busStops, lat, lng, RADIUS_TIERS[1]);
  }
  if (near.length === 0) {
    tier = RADIUS_TIERS[2];
    near = stopsWithin(busStops, lat, lng, RADIUS_TIERS[2]);
  }

  const rows = near.map((s) => {
    const dStation = haversine(lat, lng, s.lat, s.lng);
    let dExit = null;
    let exitLabel = null;
    for (const e of exits) {
      const d = haversine(e.lat, e.lng, s.lat, s.lng);
      if (dExit == null || d < dExit) { dExit = d; exitLabel = 'Exit ' + (e.label || '?'); }
    }
    // confidence — geometric: distance tier, downgraded if no exit coords.
    const d = dExit != null ? dExit : dStation;
    let confidence = d <= RADIUS_TIERS[0] ? 'high'
      : d <= RADIUS_TIERS[1] ? 'medium' : 'low';
    if (!hasExits && confidence === 'high') confidence = 'medium';
    const notes = [];
    if (!hasExits) notes.push('no exit coordinates — distance measured from the station centroid');
    notes.push('bus_stop_name pending the OneMap name pass');
    return {
      bus_stop_code: s.code,
      bus_stop_name: null,
      latitude: s.lat,
      longitude: s.lng,
      distance_meters_from_station: dStation,
      distance_meters_from_nearest_exit: dExit,
      nearest_exit_label: exitLabel,
      source: SRC_GEOJSON,
      source_url: '',
      confidence,
      raw_source_payload: { geojson: s.raw, onemap: null },
      notes: notes.join('; ')
    };
  });

  // sort by distance from the nearest exit first (fall back to centroid)
  rows.sort((a, b) => {
    const da = a.distance_meters_from_nearest_exit ?? a.distance_meters_from_station;
    const db = b.distance_meters_from_nearest_exit ?? b.distance_meters_from_station;
    return da - db;
  });
  return { rows: rows.slice(0, KEEP_MAX), tier, hasExits };
}

function stopsWithin(busStops, lat, lng, radiusM) {
  const boxDeg = radiusM / 111000 + 1e-6;
  const out = [];
  for (const s of busStops) {
    if (Math.abs(s.lat - lat) > boxDeg || Math.abs(s.lng - lng) > boxDeg) continue;
    if (haversine(lat, lng, s.lat, s.lng) <= radiusM) out.push(s);
  }
  return out;
}

// --- Stage B: OneMap name pass ---------------------------------------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function oneMapNearby(lat, lng, radius, key, stationName) {
  const url = `${ONEMAP_BASE}?latitude=${lat}&longitude=${lng}&radius_in_meters=${radius}`;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, { method: 'GET', headers: { Authorization: key } });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      if (attempt === 3) {
        errors.push({
          station_name: stationName,
          latitude: lat,
          longitude: lng,
          radius,
          error: err.message,
          timestamp: new Date().toISOString()
        });
        return null;
      }
      await sleep(1000 * (2 ** (attempt - 1))); // 1s, 2s exponential backoff
    }
  }
  return null;
}

// Defensive parse — OneMap's getNearestBusStops response shape is not
// verifiable from this sandbox; extract a code→{name,raw} map from
// whatever array the payload carries. Adjust the field list here if a
// real run shows a different schema.
function oneMapCodeNameMap(payload) {
  if (!payload) return {};
  const arr = Array.isArray(payload) ? payload
    : (payload.BusStops || payload.busstops || payload.value
       || payload.data || payload.results || []);
  const map = {};
  for (const it of (Array.isArray(arr) ? arr : [])) {
    const code = it.BusStopNo || it.bus_stop_no || it.Code || it.code
      || it.BUS_STOP_N || it.BusStopCode || it.number;
    const name = it.BusStopName || it.Description || it.name || it.NAME || null;
    if (code != null) map[String(code)] = { name: name || null, raw: it };
  }
  return map;
}

// --- main ------------------------------------------------------------
async function main() {
  const stationsDoc = JSON.parse(fs.readFileSync(SRC_STATIONS, 'utf8'));
  const stations = stationsDoc.stations || {};
  const busStops = loadBusStops();
  const key = process.env.ONEMAP_API_KEY || null;
  const now = new Date().toISOString();

  const out = {};
  const cov = {
    total_stations: 0,
    stations_with_bus_stops: 0,
    stations_without_bus_stops: 0,
    bus_stop_entries: 0,
    confidence: { high: 0, medium: 0, low: 0 },
    radius_tier_used: { 400: 0, 800: 0, 1000: 0 },
    names_resolved: 0,
    onemap_pass_run: !!key
  };

  for (const [name, st] of Object.entries(stations)) {
    cov.total_stations += 1;
    const lines = Array.isArray(st.lines) ? st.lines : [];
    const dqNotes = [];

    const rec = {
      station_name: st.station_name || name,
      station_codes: lines.map((l) => l.station_code).filter(Boolean),
      line_codes: lines.map((l) => l.line_code).filter(Boolean),
      operator: [...new Set(lines.map((l) => l.operator).filter(Boolean))].join(' · '),
      station_coordinates: {
        latitude: Number.isFinite(st.lat) ? st.lat : null,
        longitude: Number.isFinite(st.lng) ? st.lng : null,
        source: SRC_MRTCOORDS,
        source_url: ''
      },
      station_exits: (Array.isArray(st.exits) ? st.exits : []).map((e) => ({
        exit_label: e.label ? 'Exit ' + e.label : null,
        latitude: Number.isFinite(e.lat) ? e.lat : null,
        longitude: Number.isFinite(e.lng) ? e.lng : null,
        source: SRC_EXITS,
        source_url: ''
      })),
      nearest_bus_stops: [],
      data_quality_notes: dqNotes
    };

    if (!Number.isFinite(st.lat) || !Number.isFinite(st.lng)) {
      dqNotes.push('station has no coordinates — nearest bus stops not computed');
      out[name] = rec;
      cov.stations_without_bus_stops += 1;
      continue;
    }

    const { rows, tier, hasExits } = triangulate(st, busStops);
    cov.radius_tier_used[tier] += 1;
    if (!hasExits) dqNotes.push('no station-exit coordinates — exit distances are null, confidence capped at medium');
    if (tier === 1000) dqNotes.push('nearest bus stops only found within 1000 m — confidence low');
    if (!rows.length) dqNotes.push('no bus stop found within 1000 m');

    // Stage B — OneMap names
    if (key && rows.length) {
      const payload = await oneMapNearby(st.lat, st.lng, tier, key, rec.station_name);
      const nameMap = oneMapCodeNameMap(payload);
      for (const r of rows) {
        const hit = nameMap[r.bus_stop_code];
        if (hit && hit.name) {
          r.bus_stop_name = hit.name;
          r.source = SRC_GEOJSON + ' | OneMap';
          r.raw_source_payload.onemap = hit.raw;
          r.notes = r.notes.replace('; bus_stop_name pending the OneMap name pass', '');
          cov.names_resolved += 1;
        }
      }
    } else if (!key) {
      dqNotes.push('OneMap name pass not run (ONEMAP_API_KEY unset) — bus_stop_name is null');
    }

    rec.nearest_bus_stops = rows;
    cov.bus_stop_entries += rows.length;
    for (const r of rows) cov.confidence[r.confidence] += 1;
    if (rows.length) cov.stations_with_bus_stops += 1;
    else cov.stations_without_bus_stops += 1;
    out[name] = rec;
  }

  fs.writeFileSync(OUT_MAIN, JSON.stringify({
    _meta: {
      comment: 'v0.61.63 — CR6 per-station nearest-bus-stop enrichment. Triangulated offline by Haversine; bus_stop_name via the OneMap pass.',
      sources: [SRC_MRTCOORDS, SRC_EXITS, SRC_GEOJSON, 'OneMap getNearestBusStops'],
      generatedAt: now,
      stationCount: cov.total_stations,
      busStopUniverse: busStops.length,
      onemapPassRun: !!key
    },
    stations: out
  }, null, 2) + '\n');

  fs.writeFileSync(OUT_ERRORS, JSON.stringify({
    _meta: { comment: 'OneMap fetch failures during enrichment; the run continues past each.', generatedAt: now },
    errors
  }, null, 2) + '\n');

  cov.generated_at = now;
  fs.writeFileSync(OUT_COVERAGE, JSON.stringify(cov, null, 2) + '\n');

  console.log('nearest-bus-stop enrichment:', {
    stations: cov.total_stations,
    with_bus_stops: cov.stations_with_bus_stops,
    without: cov.stations_without_bus_stops,
    bus_stop_entries: cov.bus_stop_entries,
    confidence: cov.confidence,
    names_resolved: cov.names_resolved,
    onemap_run: cov.onemap_pass_run,
    onemap_errors: errors.length
  });
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });
