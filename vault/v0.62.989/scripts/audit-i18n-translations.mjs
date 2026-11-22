#!/usr/bin/env node
// audit-i18n-translations.mjs — run the Gemini translation audit here, against
// the API, instead of by hand in the Gemini chat UI.
//
//   GEMINI_API_KEY=… node scripts/audit-i18n-translations.mjs --lang zh
//   GEMINI_API_KEY=… node scripts/audit-i18n-translations.mjs            (all six)
//   node scripts/audit-i18n-translations.mjs --list-models               (what exists)
//   node scripts/audit-i18n-translations.mjs --dry-run                   (no key needed)
//
// WHY. The chat UI audits ~50 items per conversation and the operator reported it
// "very slow". 1,590 items across six languages is 30+ manual conversations plus
// 30+ copy-pastes back. This does the same work in one command and writes the
// verdicts straight into the job files, so the result is a reviewable diff.
//
// It is the SAME prompt: the instruction block is read from
// scripts/i18n-translation-audit-prompt.md at run time (everything below the
// `---`), so the API path and the chat path cannot drift apart.
//
// MODEL. Whatever you pass is VERIFIED against ListModels before any work
// starts. This session has repeatedly been burned by asserting a fact about the
// system instead of measuring it (Register X-3/X-4/X-5); a model name typed from
// memory is exactly that kind of fact. If the requested model does not exist the
// script prints the models that DO and exits — it does not silently fall back,
// because an audit run under a different model than the one recorded is a
// provenance lie.
//
// RESUMABLE. Items whose verdict is no longer 'unreviewed' are skipped, so a
// failed or interrupted run costs only what is still outstanding.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// Shared core — the SAME module the /api/i18n-audit route uses. There is
// deliberately no second copy of the prompt-loading, chunking or verdict-merge
// logic here: two implementations of an audit would eventually disagree, and
// the disagreement would be invisible in the output.
const { auditJob, listModels, DEFAULT_MODEL } = require('../i18n-audit');

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const DRY = flag('--dry-run');
const LIST = flag('--list-models');
const LANG = val('--lang');
// v0.62.722 — the default is now gemini-3.5-flash-lite (see gemini-models.js).
// This comment previously argued for 2.5-flash-lite on the grounds that it was
// "the only candidate with evidence behind it in this repo". The operator had
// asked for 3.5-flash-lite and was overruled on that reasoning. Google's live
// 404 body then named gemini-3.5-flash-lite as the replacement for the very
// model this defaulted to. Repo evidence dates; the API does not.
// Override with --model or GEMINI_MODEL; either way the name is still checked
// against ListModels before any work starts.
const MODEL = val('--model', process.env.GEMINI_MODEL || DEFAULT_MODEL);
const CHUNK = Number(val('--chunk', '25'));
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// ------------------------------------------------------------------- main

const files = fs.readdirSync(DIR)
  .filter((f) => f.startsWith('i18n-audit-') && f.endsWith('.json'))
  .filter((f) => !LANG || f.startsWith(`i18n-audit-${LANG}-`))
  .sort();

if (DRY) {
  let pending = 0;
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
    const p = j.items.filter((i) => i.gemini_audit.verdict === 'unreviewed').length;
    pending += p;
    console.log(`  ${f.padEnd(28)} ${String(p).padStart(3)} unreviewed`);
  }
  console.log(`\nDRY RUN — ${files.length} files, ${pending} items to audit, chunk size ${CHUNK}`);
  console.log(`≈ ${Math.ceil(pending / CHUNK)} API calls to "${MODEL}". No key used.`);
  process.exit(0);
}

if (!KEY) {
  console.error('✗ GEMINI_API_KEY is not set.\n');
  console.error('  This script will not invent audit verdicts. Set a key whose API restrictions');
  console.error('  ALLOW generativelanguage.googleapis.com, then re-run. --dry-run needs no key.\n');
  process.exit(1);
}

let available;
try {
  available = await listModels(KEY);   // shared core takes the key explicitly
} catch (err) {
  const d = err.response?.data?.error;
  console.error(`✗ cannot reach the Gemini API: ${d?.status || err.message}`);
  if (d?.message) console.error(`  ${d.message}`);
  if (d?.details?.[0]?.reason === 'API_KEY_SERVICE_BLOCKED') {
    console.error('\n  This key is restricted and Generative Language is not on its allow-list.');
    console.error('  GCP Console → APIs & Services → Credentials → the key → API restrictions.');
  }
  if (/ACCOUNT_STATE_INVALID/.test(JSON.stringify(d || {}))) {
    console.error('\n  The service account bound to this key is deleted or disabled.');
    console.error('  A new key must be minted against an ACTIVE service account.');
  }
  process.exit(1);
}

if (LIST) {
  console.log(`${available.length} models support generateContent:\n`);
  available.forEach((m) => console.log('  ' + m));
  process.exit(0);
}

if (!available.includes(MODEL)) {
  console.error(`✗ model "${MODEL}" is not available to this key.\n`);
  console.error('  Not falling back to another model: an audit recorded under a model that did');
  console.error('  not run it is a provenance lie. Pick one of these with --model:\n');
  available.filter((m) => /flash|pro/.test(m)).slice(0, 25).forEach((m) => console.error('  ' + m));
  process.exit(1);
}

console.log(`Auditing with ${MODEL} · chunk ${CHUNK} · ${files.length} file(s)\n`);
let audited = 0, skipped = 0, inTok = 0, outTok = 0, missing = 0;

for (const name of files) {
  const file = path.join(DIR, name);
  const job = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!job.items.some((i) => i.gemini_audit.verdict === 'unreviewed')) {
    console.log(`  – ${name.padEnd(28)} already audited`);
    skipped += job.items.length;
    continue;
  }
  try {
    const r = await auditJob(job, { apiKey: KEY, model: MODEL, chunk: CHUNK });
    fs.writeFileSync(file, JSON.stringify(r.job, null, 2) + '\n');
    audited += r.audited; missing += r.missing; skipped += r.alreadyAudited;
    inTok += r.inTok; outTok += r.outTok;
    const c = r.counts;
    console.log(`  ✓ ${name.padEnd(28)} pass ${c.pass} · warn ${c.warn} · fail ${c.fail} · unreviewed ${c.unreviewed}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.response?.data?.error?.message || err.message}`);
    console.error('    Stopping. Files written so far keep their verdicts; re-run to resume.');
    process.exit(1);
  }
}

console.log(`\n${audited} audited · ${skipped} already done · ${missing} returned no verdict (left unreviewed)`);
console.log(`tokens: ${inTok.toLocaleString()} in · ${outTok.toLocaleString()} out`);
if (missing) console.log(`\n⚠️  ${missing} item(s) came back without a verdict. Re-run to retry only those.`);
