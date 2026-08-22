#!/usr/bin/env node
// extract-session-replies.mjs — pull this session's assistant replies out of the
// Claude Code transcript into data/session-replies.ndjson.
//
//   node doc/VibeCodingRecord/extract-session-replies.mjs <transcript.jsonl>
//
// WHY THIS EXISTS. Rules S-1 and T-1 require every chat reply to carry a serial
// number and per-paragraph `[§X.Y]` tags, logged in `doc/Chat/`. On 22-08 '26 the
// operator found that neither had been done for an entire session: 359 replies,
// none numbered, none tagged, against a `current_chat_id` two and a half months
// stale. See `journal-0_62_723` [HDR].
//
// Back-filling them into `doc/Chat/` was refused: AU-4 forbids condensation and
// the protocol forbids invention, so assigning retrospective serial numbers to
// replies that never carried them would fabricate a record of compliance. The
// operator's ruling — *"vibe-journal 359 unlogged replies"* — resolves it by
// putting them where a derived record belongs. `doc/VibeCodingRecord/` is
// explicitly NOT one of the eight authenticity templates and explicitly NOT under
// the AU append-only Recipe: it is a regenerable cross-section. The replies can be
// recorded there as what they are — unnumbered, untagged — without any document
// claiming they were compliant.
//
// REDACTION. The output feeds a PUBLIC page (`/doc/vibe-journal.html` on
// soleat.net). This session's chat contained API keys and an OAuth token pasted by
// the operator. A scan found none of them echoed in assistant text, but "I checked
// and it was clean" is not a safeguard — the redaction below runs unconditionally,
// so a future session with different content cannot leak by inheriting a
// one-time-clean result.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

// Defence in depth: patterns are redacted whether or not they are expected.
const SECRETS = [
  [/AIza[0-9A-Za-z_\-]{20,}/g,            '«GOOGLE-API-KEY-REDACTED»'],
  [/\bAQ\.[A-Za-z0-9_\-]{20,}/g,          '«OAUTH-TOKEN-REDACTED»'],
  [/\bya29\.[A-Za-z0-9_\-]{10,}/g,        '«OAUTH-TOKEN-REDACTED»'],
  [/\b\d{8,10}:[A-Za-z0-9_\-]{30,}/g,     '«TELEGRAM-TOKEN-REDACTED»'],
  [/\bsk-[A-Za-z0-9_\-]{20,}/g,           '«API-KEY-REDACTED»'],
  [/ASIA6languages\.[A-Za-z0-9_\-]+/g,    '«I18N-TOKEN-REDACTED»']
];
function redact(text) {
  let out = String(text), n = 0;
  for (const [re, rep] of SECRETS) {
    out = out.replace(re, () => { n++; return rep; });
  }
  return { text: out, redactions: n };
}

// A reply counts as "logged" once doc/Chat/chat-0_62_723 existed and replies began
// carrying serials. Detected from the text itself rather than from a wall-clock
// cutoff: a reply that opens with a serial number is one that complied.
const SERIAL_RE = /^\(№\s[\d,]+\s-\s\d{2}-\d{2}\s'\d{2}\s\d{2}:\d{2}\s\w+\)/;

const src = process.argv[2];
if (!src) {
  console.error('usage: node doc/VibeCodingRecord/extract-session-replies.mjs <transcript.jsonl>');
  process.exit(1);
}

const out = [];
let idx = 0, totalRedactions = 0;
for (const line of readFileSync(src, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  let d;
  try { d = JSON.parse(line); } catch { continue; }
  if (d.type !== 'assistant') continue;
  const c = d.message?.content;
  if (!Array.isArray(c)) continue;
  const raw = c.filter((b) => b && b.type === 'text').map((b) => b.text).join('').trim();
  if (!raw) continue;

  const { text, redactions } = redact(raw);
  totalRedactions += redactions;
  idx++;
  const serialled = SERIAL_RE.test(raw);
  out.push({
    i: idx,
    ts: d.timestamp || null,
    serialled,                                   // did it comply with S-1?
    tagged: /\[§\d+\.\d+\]/.test(raw),           // did it comply with T-1?
    chars: text.length,
    redactions,
    text
  });
}

// The chat log opened at 2026-08-21T23:30Z (22-08 '26 07:30 SGT), when the
// violation was surfaced. Before that: the unlogged set. After that: replies that
// SHOULD carry a serial, plus short inline narration emitted alongside tool calls,
// which is not a numbered reply and is marked as such rather than counted as a
// violation.
const CUTOFF = Date.parse('2026-08-21T23:30:00Z');
for (const r of out) {
  const t = r.ts ? Date.parse(r.ts) : NaN;
  r.era = Number.isNaN(t) ? 'unknown' : (t < CUTOFF ? 'pre-detection' : 'post-detection');
  r.kind = r.serialled ? 'numbered-reply'
         : (r.era === 'post-detection' && r.chars < 400) ? 'inline-narration'
         : 'unnumbered-reply';
}
const preUnlogged = out.filter((r) => r.era === 'pre-detection').length;
const postUnnumbered = out.filter((r) => r.kind === 'unnumbered-reply' && r.era === 'post-detection').length;
writeFileSync(
  join(HERE, 'data', 'session-replies.ndjson'),
  out.map((r) => JSON.stringify(r)).join('\n') + '\n'
);
console.log(`session-replies.ndjson: ${out.length} assistant texts`);
console.log(`  pre-detection, none serial-numbered — THE UNLOGGED SET: ${preUnlogged}`);
console.log(`  post-detection, numbered per S-1:                       ${out.filter((r) => r.kind === 'numbered-reply').length}`);
console.log(`  post-detection, inline narration beside a tool call:    ${out.filter((r) => r.kind === 'inline-narration').length}`);
console.log(`  post-detection, unnumbered and NOT narration:           ${postUnnumbered}`);
console.log(`  secrets redacted: ${totalRedactions}`);
