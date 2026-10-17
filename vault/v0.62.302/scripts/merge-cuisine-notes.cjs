#!/usr/bin/env node
// scripts/merge-cuisine-notes.cjs — merge a verified curation batch into
// classics-notes.js CUISINE_NOTES[slug]. Input: a JSON file {slug, entries}.
// Regenerates classics-notes.js preserving its leading comment header; the two
// data objects are re-serialised as clean JSON (native scripts preserved).
const fs = require('fs');
const path = require('path');

const dataPath = process.argv[2];
if (!dataPath) { console.error('usage: node scripts/merge-cuisine-notes.cjs <batch.json>'); process.exit(1); }

const file = path.join(__dirname, '..', 'classics-notes.js');
// Fresh require (bust cache) so repeated merges in one process compound.
delete require.cache[require.resolve(file)];
const { CLASSIC_NOTES, CUISINE_NOTES } = require(file);

const batch = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const batches = Array.isArray(batch) ? batch : [batch];
let added = 0;
for (const b of batches) {
  if (!b || !b.slug || !b.entries) continue;
  CUISINE_NOTES[b.slug] = { ...(CUISINE_NOTES[b.slug] || {}), ...b.entries };
  added += Object.keys(b.entries).length;
}

const src = fs.readFileSync(file, 'utf8');
const header = src.slice(0, src.indexOf('const CLASSIC_NOTES'));
const out = header
  + 'const CLASSIC_NOTES = ' + JSON.stringify(CLASSIC_NOTES, null, 2) + ';\n\n'
  + 'const CUISINE_NOTES = ' + JSON.stringify(CUISINE_NOTES, null, 2) + ';\n\n'
  + 'module.exports = { CLASSIC_NOTES, CUISINE_NOTES };\n';
fs.writeFileSync(file, out);
console.log('Merged ' + added + ' entries; CUISINE_NOTES now has ' + Object.keys(CUISINE_NOTES).length + ' cuisines: ' + Object.keys(CUISINE_NOTES).join(', '));
