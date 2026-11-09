// i18n-audit.js — v0.62.720
//
// Gemini audit of the machine translations in the i18n job files. Shared core,
// used by BOTH callers so there is only ever one implementation:
//   • scripts/audit-i18n-translations.mjs  — local CLI, needs a key in the shell
//   • GET /api/i18n-audit                  — Railway route, key stays in Railway
//
// WHY THE ROUTE EXISTS. The operator declined to paste GEMINI_API_KEY into the
// chat: "wire it behind a Railway route". That is a legitimate call — the key
// then never leaves the environment that already holds it. The cost is the
// return path: results come back through a browser and have to be re-uploaded
// before they can be applied. That trade is the operator's to make, and this
// module supports either side of it without forking.
//
// WALL-CLOCK IS THE REAL CONSTRAINT ON THE ROUTE. A full language is 265 items
// ≈ 11 model calls, which will exceed any sensible HTTP timeout. So the route
// audits ONE batch file (50 items ≈ 2 calls) per request and the caller walks
// the batches. The CLI has no such limit and does whole languages in one go.
//
// Env: GEMINI_API_KEY, GEMINI_MODEL (optional; default below)

'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API = 'https://generativelanguage.googleapis.com/v1beta';
const PROMPT_FILE = path.join(__dirname, 'scripts', 'i18n-translation-audit-prompt.md');

// v0.62.722 — this used to read: "gemini-2.5-flash-lite is the only candidate
// with evidence in this repo rather than from memory". That was true and still
// wrong: evidence in the repo is a record of a past state. Google's live 404
// names gemini-3.5-flash-lite as its replacement, which is what the operator
// asked for in the first place. See gemini-models.js.
const DEFAULT_MODEL = require('./gemini-models').LITE;
const DEFAULT_CHUNK = 25;
const CALL_TIMEOUT_MS = 180_000;

// The instruction block is read from the same markdown the chat workflow uses —
// everything below the `---` that separates operator notes from instructions.
// Reading it at call time means the API path and the chat path cannot drift.
function systemInstruction() {
  const md = fs.readFileSync(PROMPT_FILE, 'utf8');
  const i = md.indexOf('\n---\n');
  if (i < 0) throw new Error('prompt file has no --- separator');
  return md.slice(i + 5).trim();
}

async function listModels(apiKey) {
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  const r = await axios.get(`${API}/models?key=${encodeURIComponent(apiKey)}&pageSize=100`, { timeout: 30_000 });
  return (r.data?.models || [])
    .filter((m) => (m.supportedGenerationMethods || []).includes('generateContent'))
    .map((m) => m.name.replace(/^models\//, ''));
}

// Only what the auditor needs to judge — not the whole record.
function slimForAudit(it) {
  return {
    id: it.id, source: it.source, context: it.context, kind: it.kind,
    max_chars: it.max_chars, parse_mode: it.parse_mode,
    repo_translation: it.repo_translation, google_translation: it.google_translation,
    prior_note: it.gemini_audit?.notes || ''
  };
}

async function auditChunk(items, sys, { apiKey, model }) {
  const body = {
    system_instruction: { parts: [{ text: sys }] },
    contents: [{
      role: 'user',
      parts: [{
        text: 'Audit every item below. Return ONLY a JSON array, one object per item, each '
            + 'shaped { "id": <the item id>, "gemini_audit": { …all required fields… } }. '
            + 'One entry per input item, same ids, no extras, no commentary.\n\n'
            + JSON.stringify(items, null, 2)
      }]
    }],
    generationConfig: { responseMimeType: 'application/json', temperature: 0 }
  };
  const r = await axios.post(
    `${API}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    body, { timeout: CALL_TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
  );
  const text = r.data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    throw new Error(`model returned non-JSON (${text.slice(0, 120)}…)`);
  }
  const arr = Array.isArray(parsed) ? parsed : (parsed.items || parsed.results || []);
  const verdicts = new Map();
  for (const e of arr) if (e && e.id && e.gemini_audit) verdicts.set(e.id, e.gemini_audit);
  const u = r.data?.usageMetadata || {};
  return { verdicts, inTok: u.promptTokenCount || 0, outTok: u.candidatesTokenCount || 0 };
}

// Audit one parsed job object in place. Items already carrying a verdict are
// skipped, so a partial failure only costs what is still outstanding.
//
// An item the model returns nothing for stays 'unreviewed' and is counted in
// `missing`. Silence is never upgraded into a pass — that is the whole reason
// the 'unreviewed' state exists.
async function auditJob(job, opts = {}) {
  const apiKey = opts.apiKey || process.env.GEMINI_API_KEY;
  const model = opts.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const chunk = Number(opts.chunk) > 0 ? Number(opts.chunk) : DEFAULT_CHUNK;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
  if (!Array.isArray(job?.items)) throw new Error('job.items missing');

  const sys = systemInstruction();
  const todo = job.items.filter((i) => i.gemini_audit?.verdict === 'unreviewed');
  let audited = 0, missing = 0, inTok = 0, outTok = 0, calls = 0;

  for (let i = 0; i < todo.length; i += chunk) {
    const slice = todo.slice(i, i + chunk);
    const r = await auditChunk(slice.map(slimForAudit), sys, { apiKey, model });
    calls++; inTok += r.inTok; outTok += r.outTok;
    for (const item of slice) {
      const v = r.verdicts.get(item.id);
      if (!v) { missing++; continue; }
      item.gemini_audit = { ...item.gemini_audit, ...v };
      audited++;
    }
  }

  // Recount from the items rather than accumulate — a computed total cannot
  // drift from what is actually in the file.
  const c = { pass: 0, warn: 0, fail: 0, unreviewed: 0 };
  for (const it of job.items) {
    const v = it.gemini_audit?.verdict || 'unreviewed';
    c[v] = (c[v] || 0) + 1;
  }
  job.summary = { ...job.summary, total: job.items.length, ...c };

  return {
    job, model, audited, missing, calls, inTok, outTok,
    alreadyAudited: job.items.length - todo.length, counts: c
  };
}

module.exports = { auditJob, listModels, systemInstruction, slimForAudit, DEFAULT_MODEL, DEFAULT_CHUNK };
