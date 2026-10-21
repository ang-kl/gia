#!/usr/bin/env node
'use strict';

// fetch-mrt-lines-osm.js — fetch Singapore MRT/LRT route geometry from
// OpenStreetMap via the Overpass API and write data/mrt-line-paths.json
// in the shape the app already consumes:
//   { _meta, <LINE_CODE>: Array<Array<{ lat, lng }>> }
//
//   node scripts/fetch-mrt-lines-osm.js
//
// Why OSM: it carries the COMPLETE, current SG rail network (MRT + LRT,
// incl. TEL) as `route=subway` / `route=light_rail` relations, each with
// real track geometry and a line name — so the polylines follow the
// actual track instead of the smoothed station-to-station fallback.
//
// resolveLinePaths() and GET /api/transport/line-paths already prefer
// data/mrt-line-paths.json over the derived geometry, so committing the
// generated file is all that is needed — no app change.
//
// LICENCE: OSM data is © OpenStreetMap contributors, ODbL. Any UI that
// renders this geometry must show an "© OpenStreetMap contributors"
// attribution (see the _meta.attribution field written below).
//
// Run this where overpass-api.de is reachable (a dev machine or a
// Railway job), then commit data/mrt-line-paths.json. An alternative
// keyless source is scripts/fetch-mrt-lines.js (data.gov.sg LTA dataset).

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const OVERPASS = process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';
const OUT = path.join(__dirname, '..', 'data', 'mrt-line-paths.json');

// Singapore bounding box (south, west, north, east).
const BBOX = '1.15,103.58,1.50,104.10';

const QUERY = `
[out:json][timeout:180];
(
  relation["route"="subway"](${BBOX});
  relation["route"="light_rail"](${BBOX});
);
(._;>;);
out body qt;
`;

// OSM route-relation name/ref (lower-cased) → soleat line code.
const NAME_TO_CODE = [
  [/north[\s-]*south/, 'NSL'],
  [/east[\s-]*west/, 'EWL'],
  [/changi airport/, 'CGL'],
  [/north[\s-]*east/, 'NEL'],
  [/circle/, 'CCL'],
  [/downtown/, 'DTL'],
  [/thomson[\s-]*east coast|thomson/, 'TEL'],
  [/bukit panjang/, 'BPL'],
  [/sengkang/, 'SLRT'],
  [/punggol/, 'PLRT'],
  [/jurong region/, 'JRL'],
  [/cross island/, 'CRL']
];

function lineCodeFor(tags) {
  const hay = `${tags.name || ''} ${tags.ref || ''} ${tags.network || ''}`.toLowerCase();
  for (const [rx, code] of NAME_TO_CODE) {
    if (rx.test(hay)) return code;
  }
  return null;
}

const round = (n) => Math.round(n * 1e6) / 1e6;

async function main() {
  console.log('[fetch-mrt-osm] querying Overpass …');
  const res = await axios.post(OVERPASS, QUERY, {
    headers: { 'Content-Type': 'text/plain' },
    timeout: 200000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity
  });
  const elements = (res.data && res.data.elements) || [];

  const nodes = new Map();   // id -> { lat, lng }
  const ways = new Map();    // id -> [nodeId, ...]
  const relations = [];
  for (const el of elements) {
    if (el.type === 'node') {
      nodes.set(el.id, { lat: round(el.lat), lng: round(el.lon) });
    } else if (el.type === 'way') {
      ways.set(el.id, el.nodes || []);
    } else if (el.type === 'relation') {
      relations.push(el);
    }
  }

  // line code -> de-duplicated list of track way ids (platform/stop
  // members skipped; both route directions collapse onto one code).
  const PLATFORM = /platform|stop/i;
  const wayIdsByCode = new Map();
  for (const rel of relations) {
    const code = lineCodeFor(rel.tags || {});
    if (!code) continue;
    if (!wayIdsByCode.has(code)) wayIdsByCode.set(code, []);
    const list = wayIdsByCode.get(code);
    for (const m of (rel.members || [])) {
      if (m.type !== 'way') continue;
      if (m.role && PLATFORM.test(m.role)) continue;
      if (!list.includes(m.ref)) list.push(m.ref);
    }
  }

  const out = {};
  let segCount = 0;
  for (const [code, wayIds] of wayIdsByCode) {
    const segments = [];
    for (const wid of wayIds) {
      const nodeIds = ways.get(wid);
      if (!nodeIds) continue;
      const seg = nodeIds.map((nid) => nodes.get(nid)).filter(Boolean);
      if (seg.length >= 2) segments.push(seg);
    }
    if (segments.length) {
      out[code] = segments;
      segCount += segments.length;
    }
  }

  const payload = {
    _meta: {
      comment: 'SG MRT/LRT route geometry from OpenStreetMap (Overpass API).',
      source: 'overpass-api.de — relation[route=subway|light_rail] within Singapore',
      attribution: '© OpenStreetMap contributors (ODbL)',
      lastUpdated: new Date().toISOString().slice(0, 10),
      lineCount: Object.keys(out).length,
      segmentCount: segCount
    },
    ...out
  };
  fs.writeFileSync(OUT, JSON.stringify(payload));
  const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
  console.log(`[fetch-mrt-osm] wrote data/mrt-line-paths.json — ${payload._meta.lineCount} lines, ${segCount} segments (${kb} KB)`);
  if (!payload._meta.lineCount) {
    console.error('[fetch-mrt-osm] WARNING: no lines matched — check the Overpass response or the NAME_TO_CODE map.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[fetch-mrt-osm] failed:', err.message);
  process.exit(1);
});
