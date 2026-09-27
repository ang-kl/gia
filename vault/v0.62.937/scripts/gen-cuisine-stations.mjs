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
for (const [name, v] of Object.entries(src)) {
  if (name === '_meta' || v?.status !== 'operational') continue;
  if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue;
  out.push({ n: name, lat: v.lat, lng: v.lng, c: Array.isArray(v.codes) ? v.codes : [] });
}
out.sort((a, b) => a.n.localeCompare(b.n));

const header = `// mrt-stations.generated.js — GENERATED from data/mrt-coords.json, do not hand-edit.
//
// Operational SG MRT/LRT stations (name, lat, lng, line codes) for the Cuisine
// TMA's nearby-zone grouping. Regenerate: node scripts/gen-cuisine-stations.mjs
// Keys: n=name, c=codes[]. ${out.length} stations.
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
// Keys: n=name, c=codes[]. ${out.length} stations.
`;
const body = 'export const SG_STATIONS = [\n'
  + out.map((s) => `  { n: ${JSON.stringify(s.n)}, lat: ${s.lat}, lng: ${s.lng}, c: ${JSON.stringify(s.c)} },`).join('\n')
  + '\n];\n';
writeFileSync(join(ROOT, 'web/cuisine/src/v2/lib/mrt-stations.generated.js'), `${header}\n${body}`);
writeFileSync(join(ROOT, 'web/_shared/lib/mrt-stations.generated.js'), `${sharedHeader}\n${body}`);
console.log(`[gen-cuisine-stations] wrote ${out.length} stations (cuisine + _shared)`);
