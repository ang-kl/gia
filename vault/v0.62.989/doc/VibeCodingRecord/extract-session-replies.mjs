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
// MOVED TO ./redact.mjs (v0.62.860) so `extract-wrong-log.mjs` reuses this exact
// pipeline rather than growing a second one. Nothing changed but the file it lives
// in: the code and every comment were lifted verbatim, because those comments record
// five Codex findings and three wrong first cuts, and a paraphrase would lose them.
//
// The three layers, unchanged: KNOWN SHAPES → TRANSCRIPT-DERIVED operator literals →
// FAIL CLOSED. Publishing is the irreversible act; refusing to publish costs a re-run.
// Only the four this file actually calls. The first cut imported all ten — the six
// internal helpers of the pipeline included — which compiles fine and reads as if
// they were needed here. Measured with a per-name count: six had exactly one
// occurrence, and that occurrence was the import itself.
import { KNOWN_SHAPES, collectOperatorSecrets, redact, residualSecrets } from './redact.mjs';

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
