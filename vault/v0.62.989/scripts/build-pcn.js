#!/usr/bin/env node
'use strict';

// build-pcn.js — v0.62.956. Builds data/geo-pcn.json, the Park Connector layer the Cuisine, Train and Hawker maps
// draw when 🌳 Park is on (spec doc/Feature/2026-10-30-park-connector-layer.spec.md).
//
//   node scripts/build-pcn.js
//
// Two data.gov.sg datasets (Singapore Open Data Licence), committed unedited in geoloc/:
//   NParksParkConnectorLoop.geojson              — the six named loops, one feature per segment, with its PARK.
//   MasterPlan2025SDCPParkConnectorLine.geojson  — URA's full network, CLASSIFCTN PCN / RIR / RAIL CORRIDOR.
// NParks' own PCN website is NOT a source: its terms forbid copying without written consent.
//
// A separate script on purpose. build-geo-overlays.js rewrites all nine overlays and a full run drops the clinic
// opening hours other scripts add (Technical H-1), so it is not touched for a new layer.
//
// Output shape:
//   routes: [{ name, src, features, segs: [{ park?, pts: [[lng,lat], …] }] }]   — 6 NParks loops, then RIR, Rail Corridor
//   other:  [[[lng,lat], …], …]                                                 — URA's PCN lines, unnamed
// `features` counts SOURCE features, before a MultiLineString is split into its lines, so the test can account for
// every one of them.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const NPARKS_FILE = path.join(ROOT, 'geoloc', 'NParksParkConnectorLoop.geojson');
const URA_FILE = path.join(ROOT, 'geoloc', 'MasterPlan2025SDCPParkConnectorLine.geojson');
const OUT_FILE = path.join(ROOT, 'data', 'geo-pcn.json');

// The same tolerance and precision as the parks overlay (build-geo-overlays.js): ~3 m and ~1.1 m.
const DP_EPSILON = 0.00003;
const POINT_DP = 5;

// Fixed order: the loop list in the app is re-sorted by distance at runtime, so this only has to be stable.
const LOOPS = ['Eastern Coastal Loop', 'Northern Explorer Loop', 'Western Adventure Loop', 'Central Urban Loop',
  'North Eastern Riverine Loop', 'Southern Ridges Loop'];
// C2 — NParks' data names 8 segments "Urban Central Loop", all at Adam PC, which sits on the Central Urban Loop; its
// own site names no such loop. Read as a typo and folded, rather than shown as a seventh loop.
const LOOP_ALIASES = { 'Urban Central Loop': 'Central Urban Loop' };
const URA_ROUTES = { RIR: 'Round Island Route', 'RAIL CORRIDOR': 'Rail Corridor' };

// Perpendicular distance from point p to the line a-b (planar, lng/lat). Copied from build-geo-overlays.js, which
// exports nothing.
function perpDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

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

const round = (v) => Math.round(v * 10 ** POINT_DP) / 10 ** POINT_DP;

// One geometry → its simplified lines. Rounding can collapse neighbours onto one point, so consecutive duplicates are
// dropped and a line left with fewer than two points is dropped too.
function lines(geometry) {
  if (!geometry) return [];
  const parts = geometry.type === 'LineString' ? [geometry.coordinates]
    : geometry.type === 'MultiLineString' ? geometry.coordinates : [];
  const res = [];
  for (const part of parts) {
    const pts = [];
    for (const [lng, lat] of simplify(part.map((c) => [c[0], c[1]]), DP_EPSILON)) {
      const p = [round(lng), round(lat)];
      const last = pts[pts.length - 1];
      if (!last || last[0] !== p[0] || last[1] !== p[1]) pts.push(p);
    }
    if (pts.length >= 2) res.push(pts);
  }
  return res;
}

function build(nparks, ura) {
  const nFeatures = (nparks && nparks.features) || [];
  const uFeatures = (ura && ura.features) || [];
  const routes = new Map();
  for (const name of LOOPS) routes.set(name, { name, src: 'NParks', features: 0, segs: [] });
  for (const name of Object.values(URA_ROUTES)) routes.set(name, { name, src: 'URA', features: 0, segs: [] });

  for (const f of nFeatures) {
    const p = f.properties || {};
    const name = LOOP_ALIASES[p.PCN_LOOP] || p.PCN_LOOP;
    const route = routes.get(name);
    if (!route) throw new Error('build-pcn: unknown NParks loop ' + JSON.stringify(p.PCN_LOOP));
    route.features++;
    for (const pts of lines(f.geometry)) route.segs.push({ park: String(p.PARK || '').trim(), pts });
  }

  const other = [];
  let otherFeatures = 0;
  for (const f of uFeatures) {
    const cls = (f.properties || {}).CLASSIFCTN;
    if (cls === 'PCN') {
      otherFeatures++;
      for (const pts of lines(f.geometry)) other.push(pts);
      continue;
    }
    const route = routes.get(URA_ROUTES[cls]);
    if (!route) throw new Error('build-pcn: unknown URA classification ' + JSON.stringify(cls));
    route.features++;
    for (const pts of lines(f.geometry)) route.segs.push({ pts });
  }

  return {
    _meta: {
      generated: new Date().toISOString(),
      licence: 'Singapore Open Data Licence (data.gov.sg)',
      sources: [
        { id: 'd_a69ef89737379f231d2ae93fd1c5707f', authority: 'NParks', name: 'Park Connector Loop',
          file: 'geoloc/NParksParkConnectorLoop.geojson' },
        { id: 'd_cebde179d5cd6b85be36d618c8fe3b85', authority: 'URA', name: 'Master Plan 2025 SDCP Park Connector Line',
          file: 'geoloc/MasterPlan2025SDCPParkConnectorLine.geojson' }
      ],
      sourceFeatures: { nparks: nFeatures.length, ura: uFeatures.length },
      simplify: { epsilonDeg: DP_EPSILON, decimals: POINT_DP }
    },
    routes: [...routes.values()],
    otherFeatures,
    other
  };
}

module.exports = { build, lines, LOOPS, LOOP_ALIASES, URA_ROUTES };

if (require.main === module) {
  const read = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
  const out = build(read(NPARKS_FILE), read(URA_FILE));
  const text = JSON.stringify(out);
  fs.writeFileSync(OUT_FILE, text);
  const segs = out.routes.reduce((s, r) => s + r.segs.length, 0);
  console.log(`geo-pcn.json: ${out.routes.length} routes, ${segs} named segments, ${out.other.length} other lines, `
    + `${(text.length / 1024).toFixed(1)} KB`);
}
