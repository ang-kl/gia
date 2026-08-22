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
const ORDER = ['id', 'ru', 'de', 'zh', 'ja', 'es'];   // matches SUPPORTED's order

// Collect id -> { lang: translation } for everything that passes the gate.
const byKey = new Map();
let passed = 0, gated = 0;
for (const f of fs.readdirSync(JOBS).filter((x) => x.endsWith('.json') && !x.startsWith('_')).sort()) {
  const job = JSON.parse(fs.readFileSync(path.join(JOBS, f), 'utf8'));
  const lang = LANG_MAP[job.job.target_lang];
  if (!lang) continue;
  for (const it of job.items) {
    if (validateItem(it.source || '', it.google_translation || '').length) { gated++; continue; }
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
let written = 0, skippedExisting = 0, notFound = 0;

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

console.log(`${DRY ? 'DRY RUN — ' : ''}items passing the gate: ${passed}  ·  gated out: ${gated}`);
console.log(`keys updated in i18n.js: ${written}  ·  already had all six: ${skippedExisting}  ·  key not found: ${notFound}`);
if (!DRY) { fs.writeFileSync(I18N, src); console.log('i18n.js written.'); }
else console.log('\nNothing written. Drop --dry-run to apply.');
