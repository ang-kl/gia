#!/usr/bin/env node
'use strict';

// build-geo-overlays.js — converts the committed geoloc/*.geojson datasets
// into slim JSON the TMAs can serve as map overlay layers. Run once and
// commit the data/geo-*.json outputs (static data, like data/mrt-line-paths.json).
//
//   node scripts/build-geo-overlays.js
//
// The big NParks parks file (~3 MB) is simplified — outer rings only,
// Douglas-Peucker decimation, tiny polygons dropped — to stay small enough
// to ship to the browser. Point datasets just need name + lat/lng.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const GEOLOC = path.join(ROOT, 'geoloc');
const DATA = path.join(ROOT, 'data');

// --- parks-simplification tuning constants ---------------------------------
const DP_EPSILON = 0.00003;     // Douglas-Peucker tolerance, ~3 m
const TINY_RING_AREA = 5e-7;    // drop polygon rings below this bbox area (deg^2)
const POINT_DP = 5;             // decimal places for park coordinates (~1.1 m)

const CONFIG = [
  { name: 'parks',       file: 'NParksParksandNatureReserves.geojson', kind: 'polygon',
    out: 'geo-parks.json',       authority: 'NParks' },
  { name: 'attractions', file: 'TouristAttractions.geojson',           kind: 'point',
    out: 'geo-attractions.json', authority: 'STB' },
  { name: 'taxis',       file: 'LTATaxiStopGEOJSON.geojson',           kind: 'point',
    out: 'geo-taxis.json',       authority: 'LTA' }
];

function round(n, dp) {
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Title-case an ALL-CAPS name (parks/taxi labels arrive uppercase).
function titleCase(s) {
  return String(s || '').toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()).trim();
}

// Perpendicular distance from point p to the line a-b (planar, lng/lat).
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

// Douglas-Peucker line simplification.
function simplify(points, eps) {
  if (points.length < 3) return points.slice();
  let maxD = 0, idx = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], points[0], points[points.length - 1]);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD > eps) {
    const left = simplify(points.slice(0, idx + 1), eps);
    const right = simplify(points.slice(idx), eps);
    return left.slice(0, -1).concat(right);
  }
  return [points[0], points[points.length - 1]];
}

function ringBboxArea(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

function buildRings(geometry) {
  // Returns an array of outer rings (holes dropped).
  if (!geometry) return [];
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.length ? [geometry.coordinates[0]] : [];
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
      .map(poly => (poly.length ? poly[0] : null))
      .filter(Boolean);
  }
  return [];
}

function convertPolygon(features) {
  const out = [];
  for (const feat of features) {
    const name = titleCase((feat.properties || {}).NAME) || 'Park';
    const rings = [];
    for (const ring of buildRings(feat.geometry)) {
      if (ringBboxArea(ring) < TINY_RING_AREA) continue;
      const simplified = simplify(ring, DP_EPSILON)
        .map(([x, y]) => [round(x, POINT_DP), round(y, POINT_DP)]);
      if (simplified.length >= 4) rings.push(simplified);
    }
    if (rings.length) out.push({ name, rings });
  }
  return out;
}

function pointName(props, kind) {
  if (kind === 'attractions') {
    return String(props.PAGETITLE || props.NAME || 'Attraction').trim();
  }
  // taxis — no name field; label by stand type.
  return titleCase(props.TYPE_CD_DE) || 'Taxi stop';
}

function convertPoint(features, name) {
  const out = [];
  for (const feat of features) {
    const g = feat.geometry;
    if (!g || g.type !== 'Point') continue;
    const [lng, lat] = g.coordinates || [];
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    out.push({
      name: pointName(feat.properties || {}, name),
      lat: round(lat, 6),
      lng: round(lng, 6)
    });
  }
  return out;
}

function main() {
  if (!fs.existsSync(GEOLOC)) {
    console.error('geoloc/ folder not found — merge origin/main first.');
    process.exit(1);
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const cfg of CONFIG) {
    const src = path.join(GEOLOC, cfg.file);
    if (!fs.existsSync(src)) {
      console.error(`  SKIP ${cfg.name}: ${cfg.file} missing`);
      continue;
    }
    const geo = JSON.parse(fs.readFileSync(src, 'utf8'));
    const features = cfg.kind === 'polygon'
      ? convertPolygon(geo.features || [])
      : convertPoint(geo.features || [], cfg.name);
    const payload = {
      _meta: {
        comment: `Generated by scripts/build-geo-overlays.js from geoloc/${cfg.file}`,
        source: `${cfg.authority} (data.gov.sg)`,
        lastUpdated: today,
        featureCount: features.length
      },
      features
    };
    const outPath = path.join(DATA, cfg.out);
    fs.writeFileSync(outPath, JSON.stringify(payload));
    const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`  ${cfg.name}: ${features.length} features -> data/${cfg.out} (${kb} KB)`);
  }
}

main();
