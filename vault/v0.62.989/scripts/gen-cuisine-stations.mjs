#!/usr/bin/env node
// gen-cuisine-stations.mjs — regenerate the Cuisine TMA's bundled SG station
// list from the canonical data/mrt-coords.json. Operational stations only,
// trimmed to {n,lat,lng,c} for the nearby-zone grouping.
//
//   node scripts/gen-cuisine-stations.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = JSON.parse(readFileSync(join(ROOT, 'data/mrt-coords.json'), 'utf8'));
const out = [];
// v0.62.974 — spec 2026-11-04-tel5-dtl3e-auto-open-26-dec, C4: a future station with an opening date (`opensOn`, the
// Singapore date) is emitted too, tagged `o`, and the readers skip it until that date (station-open.js openAt). So
// TEL5/DTL3e join these lists by themselves at 00:00 SGT on 26 Dec 2026, with no regeneration or deploy that day.
for (const [name, v] of Object.entries(src)) {
  if (name === '_meta') continue;
  if (v?.status !== 'operational' && !v?.opensOn) continue;
  if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
  const row = { n: name, lat: v.lat, lng: v.lng, c: Array.isArray(v.codes) ? v.codes : [] };
  if (v.status !== 'operational') row.o = v.opensOn;
  out.push(row);
}
out.sort((a, b) => a.n.localeCompare(b.n));

const header = `// mrt-stations.generated.js — GENERATED from data/mrt-coords.json, do not hand-edit.
//
// Operational SG MRT/LRT stations (name, lat, lng, line codes) for the Cuisine
// TMA's nearby-zone grouping. Regenerate: node scripts/gen-cuisine-stations.mjs
// Keys: n=name, c=codes[], o=opening date (Singapore; read through _shared/lib/station-open.js openAt).
// ${out.length} stations, ${out.filter((s) => s.o).length} of them opening on a date.
`;
// v0.62.537 — the shared distance-ring helper (web/_shared/lib/distance-rings.js)
// walks ±2 operational stops along a line to size the "2 MRT stops away" ring, so
// it needs the same operational station list on BOTH the Cuisine and Hawker TMAs.
// Emit an identical copy into web/_shared/lib/ (same source-of-truth file) so the
// ring helper has one import that resolves from either TMA.
const sharedHeader = `// mrt-stations.generated.js — GENERATED from data/mrt-coords.json, do not hand-edit.
//
// Operational SG MRT/LRT stations (name, lat, lng, line codes) shared by the
// distance-ring overlay (web/_shared/lib/distance-rings.js) on the Cuisine +
// Hawker TMAs. Regenerate: node scripts/gen-cuisine-stations.mjs
// Keys: n=name, c=codes[], o=opening date (Singapore; read through _shared/lib/station-open.js openAt).
// ${out.length} stations, ${out.filter((s) => s.o).length} of them opening on a date.
`;
const body = 'export const SG_STATIONS = [\n'
  + out.map((s) => `  { n: ${JSON.stringify(s.n)}, lat: ${s.lat}, lng: ${s.lng}, c: ${JSON.stringify(s.c)}${s.o ? `, o: ${JSON.stringify(s.o)}` : ''} },`).join('\n')
  + '\n];\n';
writeFileSync(join(ROOT, 'web/cuisine/src/v2/lib/mrt-stations.generated.js'), `${header}\n${body}`);
writeFileSync(join(ROOT, 'web/_shared/lib/mrt-stations.generated.js'), `${sharedHeader}\n${body}`);
console.log(`[gen-cuisine-stations] wrote ${out.length} stations (cuisine + _shared)`);
