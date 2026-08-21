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
const axios = require('axios');

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');
const PROMPT_FILE = path.join(ROOT, 'scripts/i18n-translation-audit-prompt.md');
const API = 'https://generativelanguage.googleapis.com/v1beta';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const val = (n, d = null) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const DRY = flag('--dry-run');
const LIST = flag('--list-models');
const LANG = val('--lang');
const MODEL = val('--model', process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite');
const CHUNK = Number(val('--chunk', '25'));
const KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// The instruction block, read from the shared prompt file so the API path and
// the chat path stay identical by construction.
function systemInstruction() {
  const md = fs.readFileSync(PROMPT_FILE, 'utf8');
  const i = md.indexOf('\n---\n');
  if (i < 0) throw new Error('prompt file has no --- separator; cannot split operator notes from instructions');
  return md.slice(i + 5).trim();
}

async function listModels() {
  const r = await axios.get(`${API}/models?key=${encodeURIComponent(KEY)}&pageSize=100`, { timeout: 30_000 });
  return (r.data?.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));
}

// Audit one chunk. Returns a Map of id -> gemini_audit object.
async function auditChunk(items, sys) {
  const payload = {
    system_instruction: { parts: [{ text: sys }] },
    contents: [{
      role: 'user',
      parts: [{
        text: 'Audit every item below. Return ONLY a JSON array, one object per item, '
            + 'each shaped { "id": <the item id>, "gemini_audit": { …all required fields… } }. '
            + 'One entry per input item, same ids, no extras, no commentary.\n\n'
            + JSON.stringify(items, null, 2)
      }]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 }
  };
  const r = await axios.post(
    `${API}/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(KEY)}`,
    payload, { timeout: 180_000, headers: { 'Content-Type': 'application/json' } }
  );
  const text = r.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    throw new Error(`model returned non-JSON (${text.slice(0, 120)}…)`);
  }
  const arr = Array.isArray(parsed) ? parsed : (parsed.items || parsed.results || []);
  const out = new Map();
  for (const e of arr) if (e && e.id && e.gemini_audit) out.set(e.id, e.gemini_audit);
  const usage = r.data?.usageMetadata || {};
  return { verdicts: out, inTok: usage.promptTokenCount || 0, outTok: usage.candidatesTokenCount || 0 };
}

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
  available = await listModels();
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
const sys = systemInstruction();
let audited = 0, skipped = 0, inTok = 0, outTok = 0, missing = 0;

for (const name of files) {
  const file = path.join(DIR, name);
  const job = JSON.parse(fs.readFileSync(file, 'utf8'));
  const todo = job.items.filter((i) => i.gemini_audit.verdict === 'unreviewed');
  skipped += job.items.length - todo.length;
  if (!todo.length) { console.log(`  – ${name.padEnd(28)} already audited`); continue; }

  for (let i = 0; i < todo.length; i += CHUNK) {
    const slice = todo.slice(i, i + CHUNK);
    // Send only what the auditor needs to judge — not the whole record.
    const payload = slice.map((it) => ({
      id: it.id, source: it.source, context: it.context, kind: it.kind,
      max_chars: it.max_chars, parse_mode: it.parse_mode,
      repo_translation: it.repo_translation, google_translation: it.google_translation,
      prior_note: it.gemini_audit.notes || ''
    }));
    try {
      const { verdicts, inTok: it2, outTok: ot } = await auditChunk(payload, sys);
      inTok += it2; outTok += ot;
      for (const item of slice) {
        const v = verdicts.get(item.id);
        // No verdict returned = the item stays visibly unreviewed. Never
        // upgrade silence into a pass.
        if (!v) { missing++; continue; }
        item.gemini_audit = { ...item.gemini_audit, ...v };
        audited++;
      }
    } catch (err) {
      console.error(`  ✗ ${name} chunk ${i / CHUNK + 1}: ${err.message}`);
      console.error('    Writing what succeeded so far; re-run to resume.');
      fs.writeFileSync(file, JSON.stringify(job, null, 2) + '\n');
      process.exit(1);
    }
  }

  // Recount from the items, never accumulate — a computed total cannot drift.
  const c = { pass: 0, warn: 0, fail: 0, unreviewed: 0 };
  for (const it of job.items) c[it.gemini_audit.verdict] = (c[it.gemini_audit.verdict] || 0) + 1;
  job.summary = { ...job.summary, total: job.items.length, ...c };
  fs.writeFileSync(file, JSON.stringify(job, null, 2) + '\n');
  console.log(`  ✓ ${name.padEnd(28)} pass ${c.pass} · warn ${c.warn} · fail ${c.fail} · unreviewed ${c.unreviewed}`);
}

console.log(`\n${audited} audited · ${skipped} already done · ${missing} returned no verdict (left unreviewed)`);
console.log(`tokens: ${inTok.toLocaleString()} in · ${outTok.toLocaleString()} out`);
if (missing) console.log(`\n⚠️  ${missing} item(s) came back without a verdict. Re-run to retry only those.`);
