// gemini-models.js — v0.62.722
//
// ONE place that names Gemini models. Before this file the same three-model
// chain was copy-pasted into eleven files (gemini-client, index, translate-name,
// translate-review, durian-gemini-verifier, i18n-audit, ztest-vision and four
// scripts/*.mjs). When Google retired a generation, all eleven broke and each
// had to be found by grep. That is what happened here.
//
// WHY THESE NAMES — evidence, not memory.
// ---------------------------------------
// The operator's Railway logs on 21-08 '26 carry Google's own 404 bodies:
//
//   models/gemini-2.5-flash-lite is no longer available to new users.
//   Please update your code to use models/gemini-3.5-flash-lite
//
//   models/gemini-2.5-flash is no longer available to new users.
//   Please update your code to use models/gemini-3.6-flash
//
// So FLASH and LITE below are Google's own named replacements for exactly the
// two constants this repo was pinned to — not a guess at what the current
// generation is called. LATEST is kept first in the chain because the same log
// shows it returning 429 (billing) rather than 404: it is the only name in this
// file independently PROVEN to still resolve.
//
// The operator asked for gemini-3.5-flash-lite on 21-08 and this session
// overrode them in favour of 2.5-flash-lite, reasoning that 2.5 was "the only
// candidate with evidence in this repo". That reasoning was wrong in a specific
// way worth keeping: evidence *in the repo* is a record of what was true when it
// was written. Google's live 404 is evidence about now. Register X-6.
//
// gemini-2.5-pro has NO published replacement in any log this repo has seen, so
// no pro-tier name is invented here. Nothing in the chain needs one — every
// entry is deliberately flash-family, so a fallback can never be a slow model.

'use strict';

const FLASH  = 'gemini-3.6-flash';        // ← replaces gemini-2.5-flash
const LITE   = 'gemini-3.5-flash-lite';   // ← replaces gemini-2.5-flash-lite
const LATEST = 'gemini-flash-latest';     // alias; auto-routes to current-gen

// Walked in order when the primary model fails. LATEST first: it is the only
// entry with live proof of resolution, so it is the safest landing spot when a
// concrete version name has gone stale again.
const MODEL_CHAIN = Object.freeze([LATEST, FLASH, LITE]);

// Names Google has told us are gone. Used only to produce a legible error —
// never to silently rewrite a caller's explicit choice.
const RETIRED = Object.freeze({
  'gemini-2.5-flash': FLASH,
  'gemini-2.5-flash-lite': LITE,
  'gemini-1.5-flash': FLASH,
  'gemini-1.5-pro': FLASH,
  'gemini-2.0-flash': FLASH
});

// The primary model for a call. GEMINI_MODEL still wins — the operator sets it
// in Railway and this file must not quietly disagree with the environment. But
// if it names a model Google has published a replacement for, say so loudly
// rather than letting every call 404 in a log nobody reads.
function defaultModel(env = process.env) {
  const chosen = env.GEMINI_MODEL;
  if (!chosen) return FLASH;
  if (RETIRED[chosen]) {
    console.warn(
      `[Gemini] GEMINI_MODEL="${chosen}" was retired by Google; every call will 404. ` +
      `Set GEMINI_MODEL="${RETIRED[chosen]}" in Railway. Honouring the env var as set.`
    );
  }
  return chosen;
}

module.exports = { FLASH, LITE, LATEST, MODEL_CHAIN, RETIRED, defaultModel };
