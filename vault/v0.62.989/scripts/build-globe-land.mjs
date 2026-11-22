#!/usr/bin/env node
// scripts/build-globe-land.mjs — v0.62.985. Spec: doc/Feature/2026-11-11-fr24-globe-arrival-tz.spec.md, I5, I9.
//
// Builds web/transport/src/data/globe-land.json, the land the Train Mini App's flight globe draws, from
// data/land-110m.json: Natural Earth 1:110m land (public domain) as pre-built TopoJSON from world-atlas 2.0.2
// (ISC, Michael Bostock), copied unchanged with its notice in data/land-110m.LICENSE.txt.
//
// The method is a port of hongjia's holiday-coffee-table `globe_data()` (kit/build.py, same owner): decode the arcs,
// simplify each coastline to points at least 0.45° apart, and fill the land with dots on a 2.4° grid found by a
// point-in-polygon test. Everything is in tenths of a degree, and each coastline is stored as deltas, so the file
// stays small and the phone does no geometry beyond the projection.
//
//   node scripts/build-globe-land.mjs
//
// Output: { c: [[x0, y0, dx, dy, ...], ...], d: [lng, lat, lng, lat, ...], _meta }.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

// Math.round(-0.4) is -0; JSON writes it as 0, so keep it 0 here and a rebuild compares equal to the file.
const r10 = (v) => Math.round(v * 10) || 0;

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'data', 'land-110m.json');
const OUT = path.join(ROOT, 'web', 'transport', 'src', 'data', 'globe-land.json');

export function buildGlobeLand(topo) {
  const [sx, sy] = topo.transform.scale;
  const [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((a) => {
    let x = 0;
    let y = 0;
    return a.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
  });
  const rings = [];
  for (const g of topo.objects.land.geometries) {
    for (const poly of (g.type === 'MultiPolygon' ? g.arcs : [g.arcs])) {
      for (const ring of poly) {
        const pts = [];
        for (const i of ring) {
          const a = i >= 0 ? arcs[i] : arcs[~i].slice().reverse();
          pts.push(...(pts.length ? a.slice(1) : a));
        }
        rings.push(pts);
      }
    }
  }
  const boxes = rings.map((r) => {
    let x0 = Infinity; let x1 = -Infinity; let y0 = Infinity; let y1 = -Infinity;
    for (const [x, y] of r) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return [x0, x1, y0, y1];
  });
  const land = (lon, lat) => {
    let inside = false;
    rings.forEach((r, k) => {
      const [x0, x1, y0, y1] = boxes[k];
      if (!(y0 <= lat && lat <= y1 && x0 <= lon && lon <= x1)) return;
      for (let j = 0; j + 1 < r.length; j++) {
        const [xa, ya] = r[j];
        const [xb, yb] = r[j + 1];
        if ((ya > lat) !== (yb > lat) && lon < xa + ((lat - ya) * (xb - xa)) / (yb - ya)) inside = !inside;
      }
    });
    return inside;
  };
  const d = [];
  const step = 2.4;
  for (let i = 0; ; i++) {
    const lat = -84 + i * step;
    if (lat > 84 + 1e-9) break;
    const dlon = step / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    for (let lon = -180 + dlon / 2; lon < 180; lon += dlon) {
      if (land(lon, lat)) d.push(r10(lon), r10(lat));
    }
  }
  const c = arcs.map((a) => {
    const kept = [a[0]];
    for (const p of a.slice(1, -1)) {
      const q = kept[kept.length - 1];
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) >= 0.45) kept.push(p);
    }
    if (a.length > 1) kept.push(a[a.length - 1]);
    const t = kept.map(([x, y]) => [r10(x), r10(y)]);
    const flat = [t[0][0], t[0][1]];
    for (let j = 1; j < t.length; j++) flat.push(t[j][0] - t[j - 1][0], t[j][1] - t[j - 1][1]);
    return flat;
  });
  return { c, d };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const raw = fs.readFileSync(SRC, 'utf8');
  const out = buildGlobeLand(JSON.parse(raw));
  out._meta = {
    source: 'Natural Earth 1:110m land (public domain), via world-atlas 2.0.2 land-110m.json (ISC); see data/land-110m.LICENSE.txt',
    sha256: crypto.createHash('sha256').update(raw).digest('hex'),
    units: 'tenths of a degree; c = coastlines as x0, y0 then deltas; d = land dots as lng, lat pairs on a 2.4° grid',
  };
  fs.writeFileSync(OUT, JSON.stringify(out) + '\n');
  console.log(`wrote ${OUT}: ${out.c.length} coastlines, ${out.d.length / 2} dots, ${fs.statSync(OUT).size} bytes`);
}
