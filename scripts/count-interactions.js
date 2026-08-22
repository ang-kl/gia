#!/usr/bin/env node
/**
 * count-interactions.js
 * Measures serial, agent and token counts from Claude Code session
 * transcripts (JSONL) on disk. Transcript is the sole authority - nothing
 * is remembered from context.
 *
 * Usage:
 *   node scripts/count-interactions.js --serial
 *   node scripts/count-interactions.js --agents
 *   node scripts/count-interactions.js --tokens
 *   node scripts/count-interactions.js --all
 *   node scripts/count-interactions.js --file <path-to-session.jsonl> [--serial|--agents|--tokens|--all]
 *   node scripts/count-interactions.js --sessions        # aggregate across ALL sessions of this project
 *   node scripts/count-interactions.js --base <n>        # add rebase offset to serial (e.g. --base 1773)
 *
 * Counting rules (protocol §1, §4, §5):
 *   serial  = assistant entries on the MAIN thread (isSidechain !== true)
 *             carrying at least one non-empty text block. Tool-only turns
 *             and subagent chatter are excluded.
 *   agents  = tool_use blocks named "Task" (older CLI builds) OR "Agent"
 *             (newer ones), grouped by input.subagent_type. Sidechain entries
 *             are excluded so a subagent spawning nothing is not double-counted.
 *             MATCHING ONLY ONE NAME reports a confident agents_total: 0 on a
 *             corpus that really contains subagent calls - protocol §4 names
 *             this exact failure. tool_use_blocks_seen is printed alongside,
 *             because "0 of 0" and "0 of 1,810" are different facts and a bare
 *             zero cannot tell them apart.
 *   tokens  = sum of usage.input_tokens, usage.output_tokens,
 *             usage.cache_read_input_tokens, usage.cache_creation_input_tokens
 *             across main-thread assistant entries, DEDUPED ON message.id.
 *             Usage is per MESSAGE, not per transcript line: the transcript
 *             writes one line per content block and repeats the identical usage
 *             object on each, so summing per entry inflates every figure by
 *             blocks-per-message. Measured on this repo's own transcript:
 *             1.938x (2,799,020 -> 1,444,213 output tokens). Protocol §5.
 *             Absent usage blocks are counted as "unavailable", never estimated.
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

// ---------- CLI ----------
const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (f) => {
  const i = argv.indexOf(f);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : null;
};

const wantSerial = has('--serial') || has('--all');
const wantAgents = has('--agents') || has('--all');
const wantTokens = has('--tokens') || has('--all');
const wantAny = wantSerial || wantAgents || wantTokens;
const allSessions = has('--sessions');
const explicitFile = val('--file');
const base = parseInt(val('--base') || '0', 10) || 0;

if (!wantAny && !allSessions) {
  console.log('Usage: count-interactions.js [--serial|--agents|--tokens|--all] [--file <session.jsonl>] [--sessions] [--base <n>]');
  process.exit(0);
}

// ---------- Locate transcript(s) ----------
// Claude Code stores transcripts under ~/.claude/projects/<munged-cwd>/*.jsonl
// where <munged-cwd> is the absolute project path with '/', '.', '_' and
// spaces replaced by '-'. We munge defensively and fall back to a scan.
function mungePath(p) {
  return p.replace(/[\/\\._ ]/g, '-');
}

function projectDirCandidates() {
  const root = path.join(os.homedir(), '.claude', 'projects');
  if (!fs.existsSync(root)) return [];
  const cwdMunged = mungePath(process.cwd());
  const dirs = fs.readdirSync(root)
    .map((d) => path.join(root, d))
    .filter((d) => fs.statSync(d).isDirectory());
  const exact = dirs.filter((d) => path.basename(d) === cwdMunged);
  if (exact.length) return exact;
  // Fallback: any project dir whose munged name ends with this folder's name
  const tail = mungePath(path.basename(process.cwd()));
  return dirs.filter((d) => path.basename(d).endsWith(tail));
}

function sessionFiles() {
  if (explicitFile) return [path.resolve(explicitFile)];
  const dirs = projectDirCandidates();
  const files = [];
  for (const d of dirs) {
    for (const f of fs.readdirSync(d)) {
      if (f.endsWith('.jsonl')) files.push(path.join(d, f));
    }
  }
  files.sort((a, b) => fs.statSync(a).mtimeMs - fs.statSync(b).mtimeMs);
  if (!files.length) {
    console.error('No session transcripts found. Pass --file <session.jsonl>.');
    process.exit(1);
  }
  return allSessions ? files : [files[files.length - 1]]; // newest only by default
}

// ---------- Measure ----------
function freshTally() {
  return {
    serial: 0,
    userTurns: 0,
    agentsTotal: 0,
    agentsBreakdown: {},
    tokens: { input: 0, output: 0, cache_read: 0, cache_creation: 0 },
    usageMissing: 0,
    toolUseBlocks: 0,
    seenMessageIds: new Set(),
    lines: 0,
    badLines: 0,
  };
}

function measureFile(file, t) {
  const raw = fs.readFileSync(file, 'utf8');
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    t.lines++;
    let e;
    try { e = JSON.parse(line); } catch { t.badLines++; continue; }

    const sidechain = e.isSidechain === true;
    const msg = e.message || {};
    const content = Array.isArray(msg.content) ? msg.content : [];

    if (e.type === 'user' && !sidechain) t.userTurns++;

    if (e.type === 'assistant' && !sidechain) {
      // serial: non-empty text block on main thread
      const hasText = content.some(
        (b) => b && b.type === 'text' && typeof b.text === 'string' && b.text.trim().length > 0
      );
      if (hasText) t.serial++;

      // agents: Task tool invocations
      for (const b of content) {
        if (!b || b.type !== 'tool_use') continue;
        t.toolUseBlocks++;
        // Both names, per protocol §4 - 'Task' on older CLI builds, 'Agent' on newer.
        if (b.name === 'Task' || b.name === 'Agent') {
          t.agentsTotal++;
          const st = (b.input && b.input.subagent_type) || 'unspecified';
          t.agentsBreakdown[st] = (t.agentsBreakdown[st] || 0) + 1;
        }
      }

      // tokens
      const u = msg.usage;
      // Dedupe on message.id: the same usage object is repeated on every content
      // block of a message, so a per-entry sum inflates by blocks-per-message (§5).
      const mid = msg.id;
      if (mid && t.seenMessageIds.has(mid)) {
        continue;
      }
      if (mid) t.seenMessageIds.add(mid);
      if (u && typeof u === 'object') {
        t.tokens.input += u.input_tokens || 0;
        t.tokens.output += u.output_tokens || 0;
        t.tokens.cache_read += u.cache_read_input_tokens || 0;
        t.tokens.cache_creation += u.cache_creation_input_tokens || 0;
      } else if (hasText) {
        t.usageMissing++;
      }
    }
  }
  return t;
}

// ---------- Run ----------
const files = sessionFiles();
const t = freshTally();
for (const f of files) measureFile(f, t);

const fmt = (n) => n.toLocaleString('en-SG');
const scope = allSessions ? `${files.length} session(s)` : path.basename(files[0]);

console.log(`# Transcript scope: ${scope}`);
if (t.badLines) console.log(`# Warning: ${t.badLines} unparseable line(s) skipped`);

if (wantSerial || allSessions) {
  console.log(`serial_measured   : ${fmt(t.serial)}  (main-thread assistant text replies)`);
  console.log(`user_turns        : ${fmt(t.userTurns)}`);
  if (base) console.log(`serial_rebased    : ${fmt(base + t.serial)}  (base ${fmt(base)} + measured)`);
  console.log(`next_serial       : ${fmt((base || 0) + t.serial + 1)}`);
}

if (wantAgents || allSessions) {
  console.log(`agents_total      : ${fmt(t.agentsTotal)}  (Task + Agent tool invocations)`);
  const entries = Object.entries(t.agentsBreakdown).sort((a, b) => b[1] - a[1]);
  if (entries.length) {
    console.log('agents_breakdown  :');
    for (const [k, v] of entries) console.log(`  ${k.padEnd(24)} ${fmt(v)}`);
  } else {
    console.log('agents_breakdown  : none');
  }
  // §4: a bare zero cannot distinguish "no subagents" from "nothing was read".
  console.log(`tool_use_blocks_seen: ${fmt(t.toolUseBlocks)}`);
}

if (wantTokens || allSessions) {
  console.log(`tokens_input      : ${fmt(t.tokens.input)}`);
  console.log(`tokens_output     : ${fmt(t.tokens.output)}`);
  console.log(`tokens_cache_read : ${fmt(t.tokens.cache_read)}`);
  console.log(`tokens_cache_new  : ${fmt(t.tokens.cache_creation)}`);
  if (t.usageMissing) {
    console.log(`tokens_note       : ${fmt(t.usageMissing)} reply(ies) had no usage block - reported, not estimated`);
  }
}
