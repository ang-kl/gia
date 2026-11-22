#!/usr/bin/env node
// extract-wrong-log.mjs — collect every paragraph in which the assistant said
// something was WRONG, out of a Claude Code transcript, into data/wrong-log.ndjson.
//
//   node doc/VibeCodingRecord/extract-wrong-log.mjs <transcript.jsonl> [--since YYYY-MM-DD]
//
// WHY THIS EXISTS. The operator, 31-08 '26: *"I scanned that there are more than 77
// times the word 'wrong' appear in the conversation for the past 3 days. Can you copy
// those paragraphs into the vibe-coding journal with a section called Wrong-Log.
// These are good learning lessons."*
//
// Measured on the transcript this container holds (2026-08-09 → 2026-08-30, 32,072
// records): 226 assistant paragraphs across 181 replies on 12 distinct days; 84 of
// them in the operator's three-day window, 76 of those on 30-08 alone. Their ">77"
// was a good estimate of the window they looked at.
//
// VERBATIM, AND ALL OF THEM. No curation, no summarising, no "best of". Two reasons:
// the operator said "copy those paragraphs", and AU-1 says add, never compress. A
// filtered lessons list would be my judgement of which of my own mistakes mattered,
// which is exactly the judgement that should not be mine. Signal was measured before
// deciding: of 84 paragraphs in the sample window, ZERO were "nothing wrong"
// false positives, so there is no noise to remove even if removing it were allowed.
//
// ---------------------------------------------------------------- §NOT-COMMITTED
//
// The output of this script is GITIGNORED, and that is a deliberate instruction, not
// an oversight. The operator was shown that `ang-kl/gia` is a public repo and that
// `data/session-replies.ndjson` is already committed there, and chose that this one
// must not be. So:
//
//   - `data/wrong-log.ndjson` and `wrong-log.html` are in .gitignore.
//   - A test asserts they are ignored, because a later `git add -A` is exactly what
//     would defeat a .gitignore line silently.
//   - Nothing is added to generate.mjs, index.js or public/doc/. The hosted page is
//     untouched, and a regenerate must still produce a byte-identical vibe-journal.
//
// AND THE CONSEQUENCE, STATED SO NOBODY REDISCOVERS IT: Railway deploys from git, so
// a gitignored file can never reach the server. The Wrong-Log therefore CANNOT appear
// on /doc/vibe-journal.html while this rule holds. The operator separately asked for
// the panel to be gated behind VIBE_JOURNAL_KEY; the two requests cannot both be
// satisfied, and "never committed" is the stricter one and was chosen last. Anyone
// re-adding the panel is reversing that decision, not filling a gap.
//
// The durable half is this script. It carries no paragraphs, so it commits safely,
// and it runs against any transcript — including the operator's local corpus, which
// CLAUDE.md records as 6,822+ replies across `gia` and `gia-web`, far more than the
// single transcript an ephemeral container can see.
//
// ---------------------------------------------------------------- §SECRETS
//
// Same three layers as extract-session-replies.mjs, imported from ./redact.mjs rather
// than reimplemented — see that module's header for the five Codex findings the
// pipeline is made of. Being uncommitted does NOT relax this: the file is written to
// disk and handed to a human, and the operator has pasted a Cloud Translation key, an
// i18n token, an OAuth token and a chat id into this transcript. Fail closed.

import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createReadStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectOperatorSecrets, redact, residualSecrets } from './redact.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SGT_MS = 8 * 3600 * 1000;

// The word, on its own, case-insensitively. `\b` is right here — unlike the SECRET
// boundary problem in redact.mjs, "wrong" is never part of a compound identifier that
// matters, and `wrongly`/`wrongness` are the same lesson wearing a suffix, so they
// are deliberately EXCLUDED by \b rather than swept in: the operator asked for the
// word they counted, and widening it would make the count unreproducible against
// their own scan.
const WRONG = /\bwrong\b/i;

const sgtDay = (ts) => new Date(new Date(ts).getTime() + SGT_MS).toISOString().slice(0, 10);

function parseArgs(argv) {
  const args = argv.slice(2);
  const file = args.find((a) => !a.startsWith('--'));
  const sinceIdx = args.indexOf('--since');
  const since = sinceIdx >= 0 ? args[sinceIdx + 1] : null;
  if (!file) {
    console.error('usage: extract-wrong-log.mjs <transcript.jsonl> [--since YYYY-MM-DD]');
    process.exit(2);
  }
  if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) {
    console.error(`--since must be YYYY-MM-DD, got ${since}`);
    process.exit(2);
  }
  return { file: resolve(file), since };
}

/**
 * Read the transcript once, streaming. 81 MB is too large for readFileSync on a
 * small container, and the first draft of this OOM'd on it — which is worth a line
 * because the failure looked like a hang rather than an error.
 */
async function readRecords(file) {
  const records = [];
  const rl = createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    try { records.push(JSON.parse(line)); } catch { /* a partial trailing write */ }
  }
  return records;
}

/** Assistant text blocks on the main thread, in order. */
function assistantTexts(records) {
  const out = [];
  let replyIndex = 0;
  for (const d of records) {
    if (d.type !== 'assistant' || !d.timestamp) continue;
    const c = d.message?.content;
    if (!Array.isArray(c)) continue;
    const text = c.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('\n');
    if (!text.trim()) continue;
    replyIndex += 1;                      // counts every text reply, matching §1's rule
    out.push({ ts: d.timestamp, replyIndex, text });
  }
  return out;
}

async function main() {
  const { file, since } = parseArgs(process.argv);
  const records = await readRecords(file);
  const secrets = collectOperatorSecrets(records);

  const rows = [];
  let redactions = 0;
  const days = new Set();
  const replies = new Set();

  for (const { ts, replyIndex, text } of assistantTexts(records)) {
    const day = sgtDay(ts);
    if (since && day < since) continue;
    for (const para of text.split(/\n\s*\n/)) {
      const p = para.trim();
      if (!p || !WRONG.test(p)) continue;
      const { text: clean, redactions: n } = redact(p, secrets);
      redactions += n;
      days.add(day);
      replies.add(replyIndex);
      rows.push({ i: rows.length + 1, ts, day, replyIndex, text: clean, chars: clean.length, redactions: n });
    }
  }

  // Layer 3 — FAIL CLOSED, over the final text, before anything is written.
  const residual = new Set();
  for (const r of rows) for (const label of residualSecrets(r.text)) residual.add(label);
  if (residual.size) {
    console.error(`REFUSING TO WRITE — ${residual.size} credential shape(s) survived redaction: ${[...residual].join(', ')}`);
    process.exit(1);
  }

  const outPath = join(HERE, 'data', 'wrong-log.ndjson');
  writeFileSync(outPath, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');

  const stats = {
    paragraphs: rows.length,
    replies: replies.size,
    days: days.size,
    chars: rows.reduce((a, r) => a + r.chars, 0),
    redactions,
    operatorSecretsFound: secrets.length,
    since: since || null,
    generated: new Date().toISOString()
  };
  writeFileSync(join(HERE, 'data', 'wrong-log.stats.json'), JSON.stringify(stats, null, 2) + '\n');
  console.log(JSON.stringify(stats, null, 2));
  console.log(`\nwrote ${outPath}`);
}

// Importable for tests without running.
export { WRONG, sgtDay, assistantTexts, parseArgs };

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
