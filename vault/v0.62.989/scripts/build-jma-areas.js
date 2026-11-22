#!/usr/bin/env node
// scripts/build-jma-areas.js — v0.62.962. Builds data/jma-areas.json: a cut-down copy of JMA's warning-area polygons
// (気象警報・注意報（市町村等）) around Soleat's 11 Japanese cities, so jma-warnings.js can find the area that
// CONTAINS a point instead of guessing from the nearest station.
//
// Spec doc/Feature/2026-11-01-local-weather-every-city.spec.md, Amendment 1 (operator, 01-11 '26: "Ship JMA's map";
// A5: "45 km, ~3 MB"; A6: "Proceed, credit JMA").
//
// Inputs, both downloaded by hand and passed as paths (the zip is 154 MB, so it is not kept in the repo):
//   1. the shapefile inside JMA's 20260226_AreaInformationCity_weather_GIS.zip (市町村等（気象警報等）), linked from
//      https://www.data.jma.go.jp/developer/gis.html. Coordinates are JGD2011 longitude/latitude, which differ from
//      WGS84 by well under the simplification tolerance.
//   2. https://www.jma.go.jp/bosai/common/const/area.json, JMA's area dictionary, for each area's office
//      (class20 → class15 → class10 → office) and its full name. It is a dictionary, not the frozen warning JSON.
//
// What it keeps: every polygon whose bounding box comes within COVERAGE_KM of one of the 11 cities in
// city-centroids.js. Each ring is simplified with Douglas-Peucker to EPSILON_DEG (0.0005°, about 50 m) and coordinates
// are rounded to 4 decimals (about 11 m). A point within about 50 m of a boundary may therefore land in the
// neighbouring area; the test suite checks the 19 points the apps are known to send against the full-resolution
// answers.
//
// Usage: node scripts/build-jma-areas.js <path/to/file.shp> <path/to/area.json> [--date YYYY-MM-DD]
'use strict';

const fs = require('fs');
const path = require('path');
const { CITY_CENTROIDS } = require('../city-centroids.js');

const COVERAGE_KM = 45;
const EPSILON_DEG = 0.0005;
const OUT = path.join(__dirname, '..', 'data', 'jma-areas.json');

function readDbf(file) {
  const f = fs.readFileSync(file);
  const n = f.readUInt32LE(4); const hl = f.readUInt16LE(8); const rl = f.readUInt16LE(10);
  const fields = [];
  for (let i = 32; f[i] !== 0x0d; i += 32) {
    fields.push({ name: f.subarray(i, i + 11).toString('latin1').replace(/\0.*$/, ''), len: f[i + 16] });
  }
  const utf8 = new TextDecoder('utf-8', { fatal: true });
  const sjis = new TextDecoder('shift_jis');
  const rows = [];
  for (let r = 0; r < n; r++) {
    let off = hl + r * rl + 1; const row = {};
    for (const fl of fields) {
      const raw = f.subarray(off, off + fl.len); off += fl.len;
      let s; try { s = utf8.decode(raw); } catch { s = sjis.decode(raw); }
      row[fl.name] = s.replace(/\0/g, '').trim();
    }
    rows.push(row);
  }
  return rows;
}

// Douglas-Peucker, iterative so long coastlines cannot overflow the stack. Closed rings are split at the vertex
// farthest from the first, so the two halves have distinct end points.
function simplifyOpen(pts, eps) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = 1; keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = pts[a]; const [bx, by] = pts[b];
    const L = Math.hypot(bx - ax, by - ay) || 1e-12;
    let dmax = 0; let idx = -1;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = pts[i];
      const d = Math.abs((bx - ax) * (ay - py) - (ax - px) * (by - ay)) / L;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (idx >= 0 && dmax > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function simplifyRing(ring, eps) {
  if (ring.length < 4) return ring;
  let far = 0; let best = -1;
  for (let i = 0; i < ring.length; i++) {
    const d = (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2;
    if (d > best) { best = d; far = i; }
  }
  const a = simplifyOpen(ring.slice(0, far + 1), eps);
  const b = simplifyOpen(ring.slice(far), eps);
  return a.concat(b.slice(1));
}

function main() {
  const args = process.argv.slice(2);
  const shp = args[0]; const areaJson = args[1];
  const dateAt = args.indexOf('--date');
  const builtAt = dateAt >= 0 ? args[dateAt + 1] : new Date().toISOString().slice(0, 10);
  if (!shp || !areaJson) { console.error('usage: build-jma-areas.js <file.shp> <area.json> [--date YYYY-MM-DD]'); process.exit(2); }
  const dbf = readDbf(shp.replace(/\.shp$/i, '.dbf'));
  const dict = JSON.parse(fs.readFileSync(areaJson, 'utf8'));
  const jp = Object.values(CITY_CENTROIDS).filter((c) => c.country === 'JP');
  if (jp.length !== 11) throw new Error(`expected 11 Japanese cities, found ${jp.length}`);
  const near = (x0, y0, x1, y1) => jp.some((c) => {
    const dLat = COVERAGE_KM / 111; const dLng = COVERAGE_KM / (111 * Math.cos(c.lat * Math.PI / 180));
    return x1 >= c.lng - dLng && x0 <= c.lng + dLng && y1 >= c.lat - dLat && y0 <= c.lat + dLat;
  });
  const S = fs.readFileSync(shp);
  const byCode = new Map();
  let p = 100; let k = 0; let rawPts = 0; let keptPts = 0; const uncoded = [];
  while (p < S.length) {
    const clen = S.readInt32BE(p + 4) * 2; const body = S.subarray(p + 8, p + 8 + clen); p += 8 + clen;
    if (body.readInt32LE(0) === 5) {
      const x0 = body.readDoubleLE(4); const y0 = body.readDoubleLE(12); const x1 = body.readDoubleLE(20); const y1 = body.readDoubleLE(28);
      const code = dbf[k].regioncode;
      // JMA's file includes land with no area code (e.g. "市川市・船橋市境界地先の土地", a strip whose municipality
      // is undetermined). No bulletin can name it, so it is left out and counted; a point there gets no JMA block.
      if (near(x0, y0, x1, y1) && !code) uncoded.push(dbf[k].name);
      if (near(x0, y0, x1, y1) && code) {
        const c20 = dict.class20s[code];
        if (!c20) throw new Error(`area ${code} (${dbf[k].name}) is not in area.json`);
        const c15 = dict.class15s[c20.parent]; const c10 = c15 && dict.class10s[c15.parent];
        if (!c10) throw new Error(`area ${code}: broken area.json chain`);
        const npart = body.readInt32LE(36); const npt = body.readInt32LE(40);
        const starts = []; for (let i = 0; i < npart; i++) starts.push(body.readInt32LE(44 + 4 * i));
        starts.push(npt);
        const q = 44 + 4 * npart;
        const rings = [];
        for (let i = 0; i < npart; i++) {
          const ring = [];
          for (let t = starts[i]; t < starts[i + 1]; t++) ring.push([body.readDoubleLE(q + 16 * t), body.readDoubleLE(q + 16 * t + 8)]);
          rawPts += ring.length;
          const s = simplifyRing(ring, EPSILON_DEG);
          if (s.length < 4) continue;
          keptPts += s.length;
          rings.push(s.flatMap(([x, y]) => [Math.round(x * 1e4) / 1e4, Math.round(y * 1e4) / 1e4]));
        }
        const prev = byCode.get(code);
        const bbox = [x0, y0, x1, y1].map((v) => Math.round(v * 1e4) / 1e4);
        if (prev) {
          prev.rings.push(...rings);
          prev.bbox = [Math.min(prev.bbox[0], bbox[0]), Math.min(prev.bbox[1], bbox[1]), Math.max(prev.bbox[2], bbox[2]), Math.max(prev.bbox[3], bbox[3])];
        } else {
          byCode.set(code, { code, name: c20.name, office: c10.parent, bbox, rings });
        }
      }
    }
    k++;
  }
  const out = {
    source: {
      gis: '20260226_AreaInformationCity_weather_GIS.zip',
      layer: '市町村等（気象警報等）',
      page: 'https://www.data.jma.go.jp/developer/gis.html',
      areaJson: 'https://www.jma.go.jp/bosai/common/const/area.json',
      terms: 'Japan Meteorological Agency website terms of use (Government of Japan Standard Terms of Use); credited in the app as "Source: Japan Meteorological Agency (JMA), processed by Soleat"',
      script: 'scripts/build-jma-areas.js',
    },
    builtAt,
    coverageKm: COVERAGE_KM,
    epsilonDeg: EPSILON_DEG,
    uncodedLeftOut: uncoded,
    areas: [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code)),
  };
  fs.writeFileSync(OUT, `${JSON.stringify(out)}\n`);
  console.log(`areas ${out.areas.length} · vertices ${rawPts} -> ${keptPts} · ${fs.statSync(OUT).size} bytes -> ${path.relative(process.cwd(), OUT)}`);
}

main();
