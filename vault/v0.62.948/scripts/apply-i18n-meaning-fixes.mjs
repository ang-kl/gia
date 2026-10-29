#!/usr/bin/env node
/**
 * apply-i18n-meaning-fixes.mjs — apply the hand-written corrections in
 * scripts/i18n-meaning-fixes.json to i18n.js.
 *
 * The structural gate (validate-i18n-translations.mjs) can only see shape. Every
 * defect corrected here was structurally perfect and semantically wrong: German
 * `Massenzerstörung` ("mass destruction") for "Mass Disruption", Russian
 * "Delivery to Indonesia" for "Language set to Indonesian", Japanese "will read
 * aloud" for "set". Those are found by reading, and reading is the only thing
 * that finds them — which is why this file is data, reviewed line by line, rather
 * than another rule.
 *
 * Each fix carries `before` and the applier FAILS CLOSED if it does not match the
 * file byte for byte. A fix list that silently no-ops as the file moves under it
 * is worse than no fix list, because it reports success either way.
 *
 * Usage: node scripts/apply-i18n-meaning-fixes.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'i18n.js');
const FIXES = path.join(ROOT, 'scripts/i18n-meaning-fixes.json');
const DRY = process.argv.includes('--dry-run');

const serialize = (s) =>
  "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";

const deserialize = (lit) =>
  JSON.parse(lit[0] === '"' ? lit : '"' + lit.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"');

const fixes = JSON.parse(fs.readFileSync(FIXES, 'utf8'));
const lines = fs.readFileSync(FILE, 'utf8').split('\n');

const KEY_RE = /^ {2}'([\w.]+)':\s*\{/;
// The trailing group absorbs both `', ` and the inline-close form `' },` — seven
// entries put their last language on the same line as the closing brace, and a
// pattern that only matched the comma form skipped them silently.
const LANG_RE = /^(\s+)(id|ru|de|zh|ja|es):\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")(,?(?:\s*\},?)?)\s*$/;

// key -> lang -> line index
const index = new Map();
let currentKey = null;
for (let i = 0; i < lines.length; i++) {
  const km = lines[i].match(KEY_RE);
  if (km) { currentKey = km[1]; continue; }
  const lm = lines[i].match(LANG_RE);
  if (lm && currentKey) {
    if (!index.has(currentKey)) index.set(currentKey, new Map());
    index.get(currentKey).set(lm[2], i);
  }
}

const problems = [];
let applied = 0;
for (const fix of fixes) {
  const at = index.get(fix.key)?.get(fix.lang);
  if (at === undefined) { problems.push(`MISSING ${fix.lang} ${fix.key}`); continue; }
  const lm = lines[at].match(LANG_RE);
  const current = deserialize(lm[3]);
  if (current === fix.after) { applied++; continue; } // already applied — idempotent
  if (current !== fix.before) {
    problems.push(`STALE   ${fix.lang} ${fix.key}\n        file: ${JSON.stringify(current)}\n        expected: ${JSON.stringify(fix.before)}`);
    continue;
  }
  lines[at] = `${lm[1]}${fix.lang}: ${serialize(fix.after)}${lm[4]}`;
  applied++;
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} fix(es) did not match the file. Nothing written.`);
  process.exit(2);
}

console.log(`${applied}/${fixes.length} meaning fixes applied`);
if (!DRY) {
  fs.writeFileSync(FILE, lines.join('\n'));
  console.log(`wrote ${FILE}`);
}
