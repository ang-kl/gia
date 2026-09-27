// i18n-translate.js — v0.62.718
//
// Fills the `google_translation` field of the i18n audit job files produced by
// scripts/build-i18n-audit-jobs.mjs, using Google Cloud Translation v2 REST.
//
// WHY A SERVER MODULE: the operator has no CLI and cannot mint a service-account
// key, so there is no local runner. The API key already lives in Railway, so the
// call has to originate there. index.js exposes one temporary owner-gated route
// over this; the key never leaves the server.
//
// WHY MASKING (the part that matters):
//   Machine translation reliably destroys two things in these strings —
//     • placeholders   {cap} → {上限}, and the substitution silently stops working
//     • slash commands /hidden → /oculto, and the command is dead
//   Both render as fluent, plausible text, so they survive casual review. Cloud
//   Translation's supported escape hatch is `format=html` plus
//   <span translate="no">…</span>, so every placeholder, command, backtick span
//   and existing HTML tag is wrapped before sending and unwrapped after.
//
//   This does NOT make the Gemini audit redundant. Masking prevents a known
//   mechanical failure; the audit catches wrong-sense translation, which is the
//   larger and less visible problem. Belt and braces, deliberately.
//
// Env:
//   GOOGLE_TRANSLATE_API_KEY  required — no key, no call (throws)

'use strict';

const axios = require('axios');

const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const MAX_Q_PER_REQUEST = 100;   // API caps segments per call; stay well under
const TIMEOUT_MS = 30_000;

// Everything that must survive byte-identical. Order matters: HTML tags first,
// so a tag is never half-consumed by a later pattern.
const PROTECT = [
  /<\/?(?:b|i|code)>/gi,          // Telegram HTML markup
  /`[^`\n]+`/g,                   // backtick code spans (usually a command)
  /\{\w+\}/g,                     // {placeholder}
  /(?:^|[\s(])(\/[a-z]{1,15})\b/gi // /command — leading boundary kept out of the capture
];

const ENTITIES = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&#x27;': "'", '&nbsp;': ' ' };

function decodeEntities(s) {
  return String(s).replace(/&(?:amp|lt|gt|quot|nbsp|#39|#x27);/g, (m) => ENTITIES[m] ?? m);
}

// Wrap protected runs so Cloud Translation leaves them alone.
function mask(text) {
  let out = String(text);
  for (const re of PROTECT) {
    out = out.replace(re, (full, captured) => {
      // NOTE: replace() passes the match OFFSET as the second argument when the
      // pattern has no capture group, so a truthiness check here silently
      // splices a number into the output. Only the /command pattern captures.
      // Test 'protects a placeholder' pins this.
      if (typeof captured === 'string') {
        // The /command pattern captures without its leading boundary char; keep
        // that char outside the span so spacing survives.
        const lead = full.slice(0, full.length - captured.length);
        return `${lead}<span translate="no">${captured}</span>`;
      }
      return `<span translate="no">${full}</span>`;
    });
  }
  return out;
}

function unmask(text) {
  return decodeEntities(
    String(text).replace(/<span translate=(?:"no"|'no'|no)>([\s\S]*?)<\/span>/gi, '$1')
  ).trim();
}

// True when every protected run in `source` survived into `translated`. The
// caller records this per item so a masking failure is visible in the output
// rather than discovered later by the auditor.
function protectedRunsIntact(source, translated) {
  const runs = [];
  for (const re of PROTECT) {
    for (const m of String(source).matchAll(re)) runs.push(m[1] ?? m[0]);
  }
  return runs.every((r) => String(translated).includes(r));
}

// One Cloud Translation call for up to MAX_Q_PER_REQUEST strings.
async function translateChunk(strings, target, apiKey) {
  const res = await axios.post(
    `${ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
    { q: strings.map(mask), source: 'en', target, format: 'html' },
    { timeout: TIMEOUT_MS, headers: { 'Content-Type': 'application/json' } }
  );
  const out = res?.data?.data?.translations;
  if (!Array.isArray(out) || out.length !== strings.length) {
    throw new Error(`translate: expected ${strings.length} results, got ${Array.isArray(out) ? out.length : 'none'}`);
  }
  return out.map((t) => unmask(t.translatedText));
}

// Fill one parsed job object in place and return it, plus a small report.
// Items that already carry a google_translation are left alone, so a re-run
// after a partial failure only pays for what is still missing.
async function fillJob(job, { apiKey = process.env.GOOGLE_TRANSLATE_API_KEY, redis = null } = {}) {
  if (!apiKey) throw new Error('GOOGLE_TRANSLATE_API_KEY is not set');
  const target = job?.job?.target_lang;
  if (!target) throw new Error('job.target_lang missing');

  const pending = job.items.filter((it) => it.google_translation == null);
  let chars = 0;
  let damaged = 0;

  for (let i = 0; i < pending.length; i += MAX_Q_PER_REQUEST) {
    const slice = pending.slice(i, i + MAX_Q_PER_REQUEST);
    const results = await translateChunk(slice.map((it) => it.source), target, apiKey);
    slice.forEach((it, n) => {
      it.google_translation = results[n];
      chars += it.source.length;
      if (!protectedRunsIntact(it.source, results[n])) {
        damaged++;
        it.gemini_audit.notes =
          'Masking did not fully survive translation — a placeholder, command or tag is missing. '
          + 'Treat as placeholder_damaged unless the back-translation shows otherwise. '
          + it.gemini_audit.notes;
      }
    });
  }

  // Fire-and-forget cost accounting, same posture as every other call site:
  // instrumentation must never fail the underlying request.
  if (redis && chars > 0) {
    try {
      // recordMapsCall is async: a synchronous try/catch does NOT contain its
      // rejection, it escapes as an unhandled promise rejection. The .catch is
      // the part that actually makes this fail-open. Pinned by the
      // 'does not let a cost-recording failure break the translation' test,
      // which surfaced exactly this.
      Promise.resolve(require('./api-cost').recordMapsCall(redis, 'translate', chars))
        .catch((e) => console.warn('[i18n-translate] cost recording failed (ignored):', e && e.message));
    } catch (e) {
      console.warn('[i18n-translate] cost recording threw synchronously (ignored):', e && e.message);
    }
  }

  return { job, filled: pending.length, chars, damaged, alreadyFilled: job.items.length - pending.length };
}

module.exports = { fillJob, mask, unmask, protectedRunsIntact, translateChunk };
