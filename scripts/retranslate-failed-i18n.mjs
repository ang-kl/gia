#!/usr/bin/env node
// retranslate-failed-i18n.mjs — re-translate ONLY the items that fail structural
// validation, using a request shape that avoids how Cloud Translation broke them.
//
//   GOOGLE_TRANSLATE_API_KEY=… node scripts/retranslate-failed-i18n.mjs --dry-run
//   GOOGLE_TRANSLATE_API_KEY=… node scripts/retranslate-failed-i18n.mjs
//
// WHY A SECOND PASS RATHER THAN A REPAIR. 77 of 1,590 items could not be fixed
// from the English source, because their damage is to CONTENT, not markup:
//
//   • 35 lost EVERY newline (N -> 0). Nothing in the translated text marks where a
//     paragraph break belonged, so re-inserting them is guessing at structure.
//   • 23 have a command butted against Japanese or Chinese text — `/cuisineで` —
//     which stops being tappable. The v0.62.718 masking protected the command TEXT
//     but not the space after it, so the model was free to close the gap.
//   • The rest are garbled: one item repeated half its own sentence.
//
// THE TWO CHANGES THAT ADDRESS THE CAUSES.
//
//   1. SEGMENT ON NEWLINES. Each line is translated as its own request and the
//      results are rejoined with the original separators. Cloud Translation cannot
//      flatten a break it never receives. This is the whole fix for the 35, and it
//      is structural rather than hopeful.
//   2. MASK THE COMMAND *AND ITS BOUNDARY*. `<span translate="no">/cuisine </span>`
//      rather than `<span translate="no">/cuisine</span>`, so the trailing space is
//      inside the protected run and cannot be absorbed.
//
// Everything produced here goes back through the SAME gate
// (validate-i18n-translations.mjs). An item that still fails is left as it was and
// stays on English. There is no path by which this script can lower the bar.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validateItem } from './validate-i18n-translations.mjs';

const require = createRequire(import.meta.url);
const { translateChunk, mask, unmask } = require('../i18n-translate');

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');
const DRY = process.argv.includes('--dry-run');
const KEY = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API;

// Extend the shared masking so a command carries its following space into the
// protected run. Applied after mask() so the base protections are unchanged.
function maskCommandBoundaries(text) {
  return String(text).replace(
    /<span translate="no">(\/[a-z]{2,15})<\/span>( )/g,
    '<span translate="no">$1$2</span>'
  );
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();

// Which items still fail, and why — measured, not assumed.
const todo = [];
for (const f of files) {
  const job = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const it of job.items) {
    const fails = validateItem(it.source || '', it.google_translation || '');
    if (fails.length) todo.push({ file: f, lang: job.job.target_lang, id: it.id, fails, source: it.source });
  }
}

const chars = todo.reduce((a, t) => a + (t.source || '').length, 0);
const segments = todo.reduce((a, t) => a + (t.source || '').split('\n').length, 0);
console.log(`${todo.length} items still failing · ${chars.toLocaleString()} source characters`);
console.log(`segmented on newlines: ${segments} requests (was ${todo.length})`);
console.log(`≈ $${(chars / 1e6 * 20).toFixed(4)} at list price; the free tier is 500,000 chars/month.\n`);

if (DRY || !KEY) {
  const byReason = {};
  for (const t of todo) for (const r of t.fails) byReason[r] = (byReason[r] || 0) + 1;
  console.log('failure reasons:');
  for (const [r, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`  ${r.padEnd(14)} ${n}`);
  if (!KEY && !DRY) {
    console.error('\n✗ GOOGLE_TRANSLATE_API_KEY is not set. This script will not invent translations.');
    process.exit(1);
  }
  console.log('\nDry run — nothing sent, nothing written.');
  process.exit(0);
}

let fixed = 0, stillBad = 0, sent = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  const job = JSON.parse(fs.readFileSync(p, 'utf8'));
  const target = job.job.target_lang;
  let touched = false;

  for (const it of job.items) {
    if (!validateItem(it.source || '', it.google_translation || '').length) continue;
    const src = it.source || '';
    // Segment on newlines; translate each line; rejoin with the original breaks.
    const lines = src.split('\n');
    const masked = lines.map((l) => (l.trim() ? maskCommandBoundaries(mask(l)) : l));
    const toSend = masked.filter((l) => l.trim());
    let out;
    try {
      const got = await translateChunk(toSend, target, KEY);
      sent += toSend.length;
      let gi = 0;
      out = masked.map((l) => (l.trim() ? unmask(got[gi++]) : l)).join('\n');
    } catch (err) {
      console.error(`  ✗ ${target} · ${it.id}: ${err.message}`);
      continue;
    }
    const before = it.google_translation;
    if (!validateItem(src, out).length) {
      it.google_translation = out;
      it.gemini_audit = it.gemini_audit || {};
      it.gemini_audit.notes = ((it.gemini_audit.notes || '') +
        ' [re-translated v0.62.729: segmented on newlines, command boundaries masked.]').trim();
      fixed++; touched = true;
    } else {
      // Still fails the gate — keep the old value rather than swap one failure for
      // another. The gate is the same one that let the other 1,513 through.
      it.google_translation = before;
      stillBad++;
    }
  }
  if (touched) fs.writeFileSync(p, JSON.stringify(job, null, 2) + '\n');
}

console.log(`\n${sent} segments sent · ${fixed} items now pass the gate · ${stillBad} still failing (left on English)`);
console.log('Re-run scripts/apply-i18n-translations.mjs to write the newly-passing items into i18n.js.');
