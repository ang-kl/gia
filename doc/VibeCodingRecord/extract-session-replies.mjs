#!/usr/bin/env node
// extract-session-replies.mjs — pull this project's assistant replies out of a
// Claude Code transcript into data/session-replies.ndjson.
//
//   node doc/VibeCodingRecord/extract-session-replies.mjs <transcript.jsonl>
//
// WHY THIS EXISTS. Rules S-1 and T-1 require every chat reply to carry a serial
// number and per-paragraph `[§X.Y]` tags, logged in `doc/Chat/`. On 22-08 '26 the
// operator found neither had been done for an entire session. Back-filling
// `doc/Chat/` was refused — AU-4 forbids condensation, the protocol forbids
// invention, and retrospective serials would fabricate a compliance that never
// happened. The operator's ruling, *"vibe-journal 359 unlogged replies"*, puts them
// here instead: `doc/VibeCodingRecord/` is explicitly NOT one of the eight
// authenticity templates and NOT under the AU Recipe, so a derived view can record
// the replies as what they are.
//
// v0.62.726 — rewritten after a Codex review on PR #1721 found three defects, all
// of which had the same shape: the artefact OVERSTATED its own rigour. Since the
// whole point of the artefact is to make an omission legible, that is the one
// failure it cannot have.
//
//   P1  Redaction was an allowlist of six patterns, described in the commit as
//       "unconditional". It was not: I18N_TRANSLATE_TOKEN can be any string but only
//       `ASIA6languages.*` was matched; `ghp_*`, private keys and most other
//       credentials passed straight through — and the run reported "0 redactions",
//       which reads as assurance. See §SECRETS below.
//   P2  `tagged` was true if a reply contained ANY `[§X.Y]`. T-1 requires EVERY
//       substantive paragraph, numbered point and bullet to carry one. Reply 400 was
//       stored `tagged: true` with two untagged numbered items — a green tick on a
//       non-compliant reply. See §T1 below.
//   P3  The pre/post-detection boundary was a hardcoded 23:30 cutoff, and that
//       number produced the "351" used to correct the operator's 359. Measured, the
//       first compliant reply is record 362 at 23:39:49; records 352–361 are still
//       unlogged. See §BOUNDARY below.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- §SECRETS
//
// Three layers, because the output is committed AND embedded in a page served
// publicly at soleat.net/doc/vibe-journal.html. A leak here is not recoverable by
// editing the file afterwards.
//
//   1. KNOWN SHAPES — a deliberately wide pattern set, not a tour of what this one
//      session happened to contain.
//   2. TRANSCRIPT-DERIVED — every credential-shaped literal the OPERATOR pasted in
//      their own turns is collected first and redacted from assistant text by exact
//      match. This is the layer that catches a token with no recognisable shape,
//      which is exactly what I18N_TRANSLATE_TOKEN is: an arbitrary string. A secret
//      the model can echo is a secret that was said to it, so the transcript itself
//      is the authority on what to look for.
//   3. FAIL CLOSED — anything that still looks credential-shaped after redaction
//      aborts the run with a non-zero exit and writes nothing. Publishing is the
//      irreversible act; refusing to publish costs a re-run.

const KNOWN_SHAPES = [
  [/AIza[0-9A-Za-z_\-]{20,}/g,                        'GOOGLE-API-KEY'],
  [/\bAQ\.[A-Za-z0-9_\-]{20,}/g,                      'OAUTH-TOKEN'],
  [/\bya29\.[A-Za-z0-9_\-]{10,}/g,                    'OAUTH-TOKEN'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g,                   'GITHUB-TOKEN'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}/g,                 'GITHUB-PAT'],
  [/\b\d{8,10}:[A-Za-z0-9_\-]{30,}/g,                 'TELEGRAM-TOKEN'],
  [/\bsk-[A-Za-z0-9_\-]{20,}/g,                       'API-KEY'],
  [/\bsk-ant-[A-Za-z0-9_\-]{20,}/g,                   'ANTHROPIC-KEY'],
  [/\bAKIA[0-9A-Z]{16}\b/g,                           'AWS-ACCESS-KEY'],
  [/\bxox[baprs]-[A-Za-z0-9\-]{10,}/g,                'SLACK-TOKEN'],
  [/\bglpat-[A-Za-z0-9_\-]{20,}/g,                    'GITLAB-TOKEN'],
  [/\bey[A-Za-z0-9_\-]{10,}\.ey[A-Za-z0-9_\-]{10,}\.[A-Za-z0-9_\-]{10,}/g, 'JWT'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, 'PRIVATE-KEY'],
  [/\bredis:\/\/[^\s"'`]+/gi,                         'REDIS-URL'],
  [/\bpostgres(?:ql)?:\/\/[^\s"'`]+/gi,               'POSTGRES-URL']
];

// A literal in an operator turn is treated as a credential only when it looks
// RANDOM. The first cut of this used "long and mixed-class", which redacted 77
// strings and not one of them was a secret: model names (`gemini-2.5-flash-lite`),
// branch names (`claude/handover-…`), session UUIDs, service-account emails. That
// is not a harmless excess — masking a model name destroys the meaning of the
// record the artefact exists to preserve, while still reporting a healthy-looking
// redaction count.
//
// The discriminator that separates them cleanly on this corpus: a real credential
// mixes UPPER, lower and digits, because it is base64-ish random. Word-structured
// identifiers are lowercase throughout — `gemini-2.5-flash-lite`,
// `claude/handover-july-11-49uzvf`, a hex UUID, a GCP project id. Shannon entropy
// is required as well, so a long CamelCase English phrase does not qualify.
const CANDIDATE = /\b[A-Za-z0-9][A-Za-z0-9._\-]{19,}\b/g;

function shannon(s) {
  const f = {};
  for (const ch of s) f[ch] = (f[ch] || 0) + 1;
  return -Object.values(f).reduce((h, c) => {
    const p = c / s.length;
    return h + p * Math.log2(p);
  }, 0);
}

function looksRandom(s) {
  if (!/[A-Z]/.test(s)) return false;   // word-structured ids are lowercase
  if (!/[a-z]/.test(s)) return false;
  if (!/[0-9]/.test(s)) return false;
  if (/\s/.test(s)) return false;
  return shannon(s) >= 3.5;             // bits per character
}

// Layer 2b — CONTEXT. Entropy cannot catch a token that is word-shaped, and the
// operator's I18N_TRANSLATE_TOKEN is exactly that: `ASIA6languages.forkiasee` reads
// like English, scores below the entropy gate, and matches no known vendor prefix.
// Codex made the point on PR #1721: "the documented I18N_TRANSLATE_TOKEN can be any
// random string". Shape-based detection has no answer to that; context does. When an
// operator turn mentions a credential word, every substantial literal in that turn
// is treated as sensitive — except env-var NAMES, which are ALL_CAPS and must stay
// legible or the record becomes unreadable.
const SECRET_CONTEXT = /\b(key|token|secret|password|passphrase|credential|api[_\s-]?key|bearer)\b/i;
const ENV_VAR_NAME = /^[A-Z][A-Z0-9_]{2,}$/;
const PATHY = /[/\\]|\.(?:js|mjs|json|md|yml|yaml|html|tsv|ndjson|txt|png|jpg)$/i;

// Restricted to how a credential is actually pasted: on a line of its own, or as
// the right-hand side of NAME=value / NAME: value. A first cut collected every
// 12-char literal from any turn mentioning "key" and produced 258 redactions —
// over-masking prose and destroying the record, which is the same failure as the
// entropy-only cut, in the other direction. A secret arrives as a value, not inside
// a sentence, and that positional fact is the discriminator.
function contextCandidates(text) {
  if (!SECRET_CONTEXT.test(text)) return [];
  const out = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    const assigned = line.match(/^[A-Za-z_][A-Za-z0-9_]*\s*[=:]\s*(\S+)$/);
    const bare = /^\S+$/.test(line) ? line : null;
    const value = assigned ? assigned[1] : bare;
    if (!value || value.length < 12) continue;
    if (ENV_VAR_NAME.test(value) || PATHY.test(value)) continue;
    if (/^[a-z]+$/.test(value)) continue;
    out.push(value);
  }
  return out;
}

function collectOperatorSecrets(records) {
  const found = new Set();
  for (const d of records) {
    if (d.type !== 'user') continue;
    const c = d.message?.content;
    const text = typeof c === 'string'
      ? c
      : Array.isArray(c) ? c.map((b) => (b && typeof b.text === 'string' ? b.text : '')).join('\n') : '';
    if (!text) continue;
    for (const [re] of KNOWN_SHAPES) for (const m of text.match(re) || []) found.add(m);
    for (const m of text.match(CANDIDATE) || []) if (looksRandom(m)) found.add(m);
    for (const m of contextCandidates(text)) found.add(m);
  }
  // Longest first, so a secret containing another is masked whole.
  return [...found].sort((a, b) => b.length - a.length);
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function redact(text, operatorSecrets) {
  let out = String(text), n = 0;
  for (const [re, label] of KNOWN_SHAPES) {
    out = out.replace(re, () => { n++; return `«${label}-REDACTED»`; });
  }
  for (const secret of operatorSecrets) {
    const re = new RegExp(esc(secret), 'g');
    out = out.replace(re, () => { n++; return '«OPERATOR-SECRET-REDACTED»'; });
  }
  return { text: out, redactions: n };
}

// Layer 3. Runs over the FINAL text, after redaction.
function residualSecrets(text) {
  const hits = [];
  for (const [re, label] of KNOWN_SHAPES) if (re.test(text)) hits.push(label);
  return hits;
}

// -------------------------------------------------------------------- §T1
//
// T-1: "Every substantive paragraph, numbered point, or bullet in a chat response
// MUST end with [§X.Y]." Compliance is therefore a property of EVERY unit, not of
// the reply as a whole — the previous version's any-tag test is what let a reply
// with untagged numbered items show a green tick.
//
// Not substantive, and so not required to carry a tag: the serial line itself,
// fenced code, table rows and separators, headings, and blockquote markers.
function substantiveUnits(text) {
  const units = [];
  let inFence = false;
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (/^```/.test(line)) { inFence = !inFence; continue; }
    if (inFence || !line) continue;
    if (/^\(№\s/.test(line)) continue;                       // the serial line
    if (/^#{1,6}\s/.test(line)) continue;                    // heading
    if (/^\|/.test(line) || /^:?-{3,}/.test(line)) continue; // table row / rule
    if (/^>/.test(line)) continue;                           // blockquote
    units.push(line);
  }
  return units;
}
const TAG_AT_END = /\[§\d+[.·]\d+\]\s*$/;
function tagAudit(text) {
  const units = substantiveUnits(text);
  const untagged = units.filter((u) => !TAG_AT_END.test(u));
  return { units: units.length, untagged: untagged.length, tagged: units.length > 0 && untagged.length === 0 };
}

// -------------------------------------------------------------- §BOUNDARY
//
// Derived from the transcript, never from a wall-clock guess. The unlogged period
// ends at the FIRST reply that actually carries a serial number — that is the
// observable moment compliance began, and it needs no judgement call. The
// operator's complaint lands earlier; both points are reported, because the gap
// between them (replies made after being told, still unnumbered) is itself part of
// the record and should not be quietly absorbed into either side.
const SERIAL_RE = /^\(№\s[\d,]+\s-\s\d{2}-\d{2}\s'\d{2}\s\d{2}:\d{2}\s\w+\)/;

const src = process.argv[2];
if (!src) {
  console.error('usage: node doc/VibeCodingRecord/extract-session-replies.mjs <transcript.jsonl>');
  process.exit(1);
}

const lines = readFileSync(src, 'utf8').split('\n').filter(Boolean);
const parsed = [];
for (const l of lines) { try { parsed.push(JSON.parse(l)); } catch { /* unparseable */ } }

const operatorSecrets = collectOperatorSecrets(parsed);

const out = [];
let idx = 0, totalRedactions = 0;
for (const d of parsed) {
  if (d.type !== 'assistant') continue;
  const c = d.message?.content;
  if (!Array.isArray(c)) continue;
  const raw = c.filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
  if (!raw) continue;

  const { text, redactions } = redact(raw, operatorSecrets);
  totalRedactions += redactions;
  const audit = tagAudit(text);
  idx++;
  out.push({
    i: idx,
    ts: d.timestamp || null,
    serialled: SERIAL_RE.test(raw),
    tagged: audit.tagged,
    units: audit.units,
    untaggedUnits: audit.untagged,
    chars: text.length,
    redactions,
    text
  });
}

// Fail closed before anything is written.
const residual = new Map();
for (const r of out) for (const label of residualSecrets(r.text)) {
  residual.set(label, (residual.get(label) || 0) + 1);
}
if (residual.size) {
  console.error('✗ ABORTED — credential-shaped strings survive redaction. Nothing written.\n');
  for (const [label, n] of residual) console.error(`    ${label}: ${n} replies`);
  console.error('\n  This output is committed and embedded in a PUBLICLY served page.');
  console.error('  Widen KNOWN_SHAPES or fix the input, then re-run. Refusing to publish.');
  process.exit(2);
}

const firstCompliant = out.find((r) => r.serialled);
const boundary = firstCompliant ? firstCompliant.i : out.length + 1;
for (const r of out) {
  r.era = r.i < boundary ? 'pre-compliance' : 'post-compliance';
  r.kind = r.serialled ? 'numbered-reply'
         : (r.era === 'post-compliance' && r.chars < 400) ? 'inline-narration'
         : 'unnumbered-reply';
}

const stats = {
  total: out.length,
  boundaryReply: boundary,
  boundaryTs: firstCompliant?.ts || null,
  unlogged: out.filter((r) => r.era === 'pre-compliance').length,
  numbered: out.filter((r) => r.kind === 'numbered-reply').length,
  narration: out.filter((r) => r.kind === 'inline-narration').length,
  taggedFully: out.filter((r) => r.tagged).length,
  partiallyTagged: out.filter((r) => !r.tagged && r.untaggedUnits < r.units).length,
  chars: out.reduce((a, r) => a + r.chars, 0),
  redactions: totalRedactions,
  operatorSecretsFound: operatorSecrets.length
};

writeFileSync(join(HERE, 'data', 'session-replies.ndjson'), out.map((r) => JSON.stringify(r)).join('\n') + '\n');
writeFileSync(join(HERE, 'data', 'session-replies.stats.json'), JSON.stringify(stats, null, 2) + '\n');

console.log(`session-replies.ndjson: ${stats.total} assistant texts`);
console.log(`  compliance began at reply #${stats.boundaryReply} (${stats.boundaryTs}) — first serial-numbered reply`);
console.log(`  BEFORE it, no serial number — the unlogged set:  ${stats.unlogged}`);
console.log(`  after it, numbered per S-1:                      ${stats.numbered}`);
console.log(`  after it, inline narration beside a tool call:   ${stats.narration}`);
console.log(`  fully T-1 compliant (every unit tagged):         ${stats.taggedFully}`);
console.log(`  partially tagged (some units untagged):          ${stats.partiallyTagged}`);
console.log(`  operator secrets collected from their turns:     ${stats.operatorSecretsFound}`);
console.log(`  redactions applied:                              ${stats.redactions}`);
