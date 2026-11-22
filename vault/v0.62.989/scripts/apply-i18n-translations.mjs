#!/usr/bin/env node
// apply-i18n-translations.mjs — write the validated machine translations into
// i18n.js, adding id/ru/de/zh/ja/es alongside the existing en/fr.
//
//   node scripts/apply-i18n-translations.mjs --dry-run
//   node scripts/apply-i18n-translations.mjs
//
// GATE. Only items that pass scripts/validate-i18n-translations.mjs are written.
// An item that fails is LEFT OUT entirely, which means t() falls back to English
// via its `entry[l] || entry.en` guard — the behaviour every key has today. A
// missing translation degrades to English; a structurally broken one takes the
// whole Telegram message down with it. Those are not comparable risks, so the
// gate is one-directional and there is no --force.
//
// NOT AN AUDIT. These strings are unreviewed machine output in six languages the
// operator does not read. This script guarantees they will not break a message.
// It guarantees nothing about whether they say the right thing.

import fs from 'node:fs';
import path from 'node:path';
import { validateItem } from './validate-i18n-translations.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const JOBS = path.join(ROOT, 'scripts/i18n-audit-jobs');
const I18N = path.join(ROOT, 'i18n.js');
const DRY = process.argv.includes('--dry-run');

// The job files use BCP-47 (`zh-CN`); i18n.js uses the bare code from SUPPORTED.
const LANG_MAP = { de: 'de', es: 'es', id: 'id', ja: 'ja', ru: 'ru', 'zh-CN': 'zh' };
const ORDER = ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];   // matches SUPPORTED's order

// Collect id -> { lang: translation } for everything that passes the gate.
const byKey = new Map();
const failing = new Map();          // key -> [langs whose current translation fails]
let passed = 0, gated = 0;
for (const f of fs.readdirSync(JOBS).filter((x) => x.endsWith('.json') && !x.startsWith('_')).sort()) {
  const job = JSON.parse(fs.readFileSync(path.join(JOBS, f), 'utf8'));
  const lang = LANG_MAP[job.job.target_lang];
  if (!lang) continue;
  for (const it of job.items) {
    if (validateItem(it.source || '', it.google_translation || '').length) {
      gated++;
      if (!failing.has(it.id)) failing.set(it.id, []);
      failing.get(it.id).push(lang);
      continue;
    }
    if (!byKey.has(it.id)) byKey.set(it.id, {});
    byKey.get(it.id)[lang] = it.google_translation;
    passed++;
  }
}

// Escape for a single-quoted JS string literal, preserving real newlines as \n.
const lit = (s) => "'" + String(s)
  .replace(/\\/g, '\\\\').replace(/'/g, "\\'")
  .replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";

let src = fs.readFileSync(I18N, 'utf8');
let written = 0, skippedExisting = 0, notFound = 0, pruned = 0;

// PRUNE FIRST, by REWRITING each affected entry rather than splicing regexes.
//
// The gate tightened three times after strings were already applied — <code> and
// stray angles, one-character commands, then command spacing — and an applier that
// only ADDS cannot withdraw what a looser gate let through. `Ketik /l<place>` was
// live because {2,15} never examined `/l`.
//
// Two regex attempts at surgical removal both produced a file that would not
// parse: the first orphaned the leading comma (entries are written `,\n  id: '…'`
// with the comma FIRST), the second ate the separator the NEXT entry needed.
// Comma bookkeeping inside a hand-rolled splice is the wrong tool. This parses the
// entry's language map, drops the failing languages, and re-emits the whole block
// with separators generated fresh — so there is no comma to get wrong.
function entryBounds(text, key) {
  const head = new RegExp(`^(\\s*)('${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}':\\s*\\{)`, 'm');
  const m = text.match(head);
  if (!m) return null;
  const open = text.indexOf('{', m.index + m[1].length);
  let depth = 0, inStr = null;
  for (let i = open; i < text.length; i++) {
    const ch = text[i], prev = text[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === "'" || ch === '"') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return { open, close: i, indent: m[1].length, keyLen: key.length }; }
  }
  return null;
}

// Split `a: '…', b: '…'` into ordered [lang, literal] pairs, respecting escapes.
function parseLangs(body) {
  const out = [];
  const re = /(\w[\w-]*)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\[[\s\S]*?\])/g;
  let m;
  while ((m = re.exec(body))) out.push([m[1], m[2]]);
  return out;
}

for (const [key, failedLangs] of failing) {
  const b = entryBounds(src, key);
  if (!b) continue;
  const body = src.slice(b.open + 1, b.close);
  const pairs = parseLangs(body);
  const keep = pairs.filter(([l]) => !failedLangs.includes(l));
  if (keep.length === pairs.length) continue;
  pruned += pairs.length - keep.length;
  const ind = ' '.repeat(b.indent + b.keyLen + 5);
  const rebuilt = ' ' + keep.map(([l, v]) => `${l}: ${v}`).join(`,\n${ind}`) + ' ';
  src = src.slice(0, b.open + 1) + rebuilt + src.slice(b.close);
}

for (const [key, langs] of byKey) {
  // Find this key's object literal: `  'key': { … },` possibly spanning lines.
  const head = new RegExp(`^(\\s*)('${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}':\\s*\\{)`, 'm');
  const m = src.match(head);
  if (!m) { notFound++; continue; }

  // Walk braces from the opening `{` to find the entry's exact end.
  const openIdx = src.indexOf('{', m.index + m[1].length);
  let depth = 0, endIdx = -1, inStr = null;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i], prev = src[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === "'" || ch === '"') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { endIdx = i; break; } }
  }
  if (endIdx < 0) { notFound++; continue; }

  const body = src.slice(openIdx + 1, endIdx);
  const add = ORDER.filter((l) => langs[l] && !new RegExp(`\\b${l}:\\s*['"\`]`).test(body));
  if (!add.length) { skippedExisting++; continue; }

  const indent = ' '.repeat((m[1] || '  ').length + key.length + 5);
  const extra = add.map((l) => `,\n${indent}${l}: ${lit(langs[l])}`).join('');
  src = src.slice(0, endIdx) + extra + '\n' + ' '.repeat(indent.length - 2) + src.slice(endIdx);
  written++;
}

// COUNT THE ARTEFACT, do not compute the number.
//
// Three successive "applied" figures were reported to the operator and all three
// were wrong — 1,581 (counted keys that do not exist in i18n.js), 1,512 (arithmetic
// over a stale `passed`), 1,551 (the validation-pass count, not the applied count).
// Each was DERIVED from this script's own bookkeeping, and each derivation had a
// different flaw. The file is the authority on what is in the file, so the number
// is now read back out of it after writing. Found by Codex on #1726, having already
// been corrected once for the same class of error on #1724.
function countApplied(text) {
  let n = 0;
  for (const l of ORDER) n += (text.match(new RegExp(`\\n\\s*${l}:\\s*'`, 'g')) || []).length;
  return n;
}
console.log(`${DRY ? 'DRY RUN — ' : ''}items passing the gate: ${passed}  ·  gated out: ${gated}`);
console.log(`skipped, key absent from i18n.js: ${notFound * 6} (${notFound} keys × 6)`);
console.log(`ACTUALLY IN i18n.js (counted, not derived): ${countApplied(src)}`);
console.log(`pruned (now-failing entries removed): ${pruned}`);
console.log(`keys updated in i18n.js: ${written}  ·  already had all six: ${skippedExisting}  ·  key not found: ${notFound}`);
if (!DRY) { fs.writeFileSync(I18N, src); console.log('i18n.js written.'); }
else console.log('\nNothing written. Drop --dry-run to apply.');
