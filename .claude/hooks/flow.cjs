#!/usr/bin/env node
/*
 * flow-kit v0.1.1 (24-09 '26) - Claude Code hook runner for the six-stage build flow
 * Intent -> Interpretation -> Assumptions -> Invariants -> Execution -> Evidence
 *
 * Subcommands (wired in .claude/settings.json):
 *   gate     PreToolUse  Edit|Write|NotebookEdit  approval, scope, test and protected-path gates
 *   bash     PreToolUse  Bash                     shell writes, overlay patterns
 *   prompt   UserPromptSubmit                     APPROVE / APPROVE QUICK / APPROVE! / REVOKE, state injection
 *   stop     Stop                                 verification and INVARIANTS REPORT before finishing
 *   session  SessionStart                         state injection on startup, resume and compaction
 *   status   (manual / skill)                     human-readable or --json state
 *
 * Design rules: no dependencies (Node >= 18); never exits 2; internal errors surface to the user
 * instead of silently allowing or blocking; state lives on disk, never in the conversation.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const KIT_VERSION = '0.1.1';

const DEFAULTS = {
  enabled: true,
  timeZone: 'Asia/Singapore',
  tzLabel: 'SGT',
  specDir: 'docs/specs',
  codeExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.css', '.scss', '.html', '.vue', '.svelte', '.sql'],
  extraGatedGlobs: ['package.json', '.github/workflows/**', 'vite.config.*', 'vercel.json', 'railway.json', 'railway.toml', 'Dockerfile'],
  ignoreGlobs: ['node_modules/**', 'dist/**', 'build/**', 'coverage/**', '.next/**', '.vercel/**', '.claude/**', 'doc/**', 'docs/**'],
  testGlobs: ['**/*.test.*', '**/*.spec.*', '**/__tests__/**', '**/test/**', '**/tests/**', '**/e2e/**', '**/test_*.py', '**/*_test.py'],
  protectedGlobs: ['.claude/flow/**', '.claude/hooks/**', '.claude/settings.json', '.claude/settings.local.json',
    '.claude/rules/flow*.md', '.claude/skills/flow-*/**', '.env', '.env.*'],
  askGlobs: [],
  askBashPatterns: [],
  verifyCmd: '',
  verifyTimeoutSec: 540,
  maxStopBlocks: 3,
  vagueTerms: ['better', 'cleaner', 'faster', 'improve', 'optimise', 'optimize', 'robust', 'nicer', 'tidy', 'polish',
    'smarter', 'enhance', 'simplify'],
  reportMarker: 'INVARIANTS REPORT'
};

/* ----------------------------------------------------------------- utilities */

function readStdinJSON() {
  let raw = '';
  try { raw = fs.readFileSync(0, 'utf8'); } catch (_) { raw = ''; }
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch (_) { return {}; }
}

function emit(obj) { process.stdout.write(JSON.stringify(obj)); }

function toPosix(p) { return p.split(path.sep).join('/'); }

function sha256(bufOrStr) { return crypto.createHash('sha256').update(bufOrStr).digest('hex'); }

function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (_) { return null; }
}

function writeJSON(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2) + '\n');
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function stamp(cfg, d) {
  const date = d || new Date();
  try {
    const f = new Intl.DateTimeFormat('en-GB', {
      timeZone: cfg.timeZone, day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    });
    const p = {};
    for (const part of f.formatToParts(date)) p[part.type] = part.value;
    return `${p.day}-${p.month} '${p.year} ${p.hour}:${p.minute} ${cfg.tzLabel}`;
  } catch (_) {
    return date.toISOString();
  }
}

/* ------------------------------------------------------------------- globs */

const globCache = new Map();

function compileGlob(glob) {
  if (globCache.has(glob)) return globCache.get(glob);
  let g = String(glob).replace(/\\/g, '/').trim();
  if (g.startsWith('./')) g = g.slice(2);
  if (g.startsWith('/')) g = g.slice(1);
  const anchored = g.includes('/');
  let re = '';
  for (let i = 0; i < g.length; i++) {
    const c = g[i];
    if (c === '*') {
      if (g[i + 1] === '*') {
        const prevSlash = i === 0 || g[i - 1] === '/';
        const nextSlash = g[i + 2] === '/';
        if (prevSlash && nextSlash) { re += '(?:.*/)?'; i += 2; continue; }
        re += '.*'; i += 1; continue;
      }
      re += '[^/]*';
    } else if (c === '?') {
      re += '[^/]';
    } else if ('\\^$+.()|{}[]'.includes(c)) {
      re += '\\' + c;
    } else {
      re += c;
    }
  }
  const compiled = { re: new RegExp('^' + re + '$'), anchored };
  globCache.set(glob, compiled);
  return compiled;
}

function matchGlob(rel, glob) {
  const { re, anchored } = compileGlob(glob);
  if (anchored) return re.test(rel);
  return re.test(path.posix.basename(rel)) || re.test(rel);
}

function anyMatch(rel, globs) { return (globs || []).some(g => matchGlob(rel, g)); }

/* ------------------------------------------------------------------ config */

function projectDirOf(input) {
  return process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
}

function loadConfig(projectDir) {
  const file = path.join(projectDir, '.claude', 'flow', 'config.json');
  if (!fs.existsSync(file)) return { cfg: { ...DEFAULTS }, error: null };
  try {
    const user = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { cfg: { ...DEFAULTS, ...user }, error: null };
  } catch (e) {
    return { cfg: { ...DEFAULTS }, error: `config.json unreadable (${e.message})` };
  }
}

/* --------------------------------------------------------------------- git */

function git(args, cwd) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch (_) {
    return null;
  }
}

function existingDir(p) {
  let d = p;
  try { if (fs.existsSync(d) && fs.statSync(d).isFile()) d = path.dirname(d); } catch (_) { d = path.dirname(d); }
  while (d && !fs.existsSync(d)) {
    const up = path.dirname(d);
    if (up === d) return null;
    d = up;
  }
  return d;
}

function realAbs(p) {
  // Resolve symlinks in the existing part of a path (macOS /var and /tmp are symlinks); keep any not-yet-created tail.
  let head = p;
  const tail = [];
  while (!fs.existsSync(head)) {
    const up = path.dirname(head);
    if (up === head) return p;
    tail.unshift(path.basename(head));
    head = up;
  }
  try { return path.join(fs.realpathSync(head), ...tail); } catch (_) { return p; }
}

function toplevelFor(p) {
  const d = existingDir(p);
  if (!d) return null;
  const top = git(['rev-parse', '--show-toplevel'], d);
  if (!top) return null;
  try { return fs.realpathSync(top); } catch (_) { return top; }
}

function branchOf(repoRoot) {
  const b = git(['symbolic-ref', '--short', '-q', 'HEAD'], repoRoot);
  if (b) return b;
  const h = git(['rev-parse', '--short', 'HEAD'], repoRoot);
  return h ? 'detached-' + h : 'unknown';
}

function headOf(repoRoot) { return git(['rev-parse', '-q', '--verify', 'HEAD'], repoRoot) || null; }

function statusPaths(repoRoot) {
  let out;
  try {
    out = execFileSync('git', ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 20 * 1024 * 1024 });
  } catch (_) {
    return [];
  }
  const parts = out.split('\0');
  const files = [];
  for (let i = 0; i < parts.length; i++) {
    const e = parts[i];
    if (!e || e.length < 4) continue;
    const xy = e.slice(0, 2);
    files.push(e.slice(3));
    if (xy[0] === 'R' || xy[0] === 'C') i++;
  }
  return files;
}

/* ---------------------------------------------------------- classification */

function classify(rel, cfg) {
  if (!rel || rel.startsWith('../') || rel === '..' || path.isAbsolute(rel)) return 'outside';
  if (anyMatch(rel, cfg.protectedGlobs)) return 'protected';
  const extraGated = anyMatch(rel, cfg.extraGatedGlobs);
  if (!extraGated && anyMatch(rel, cfg.ignoreGlobs)) return 'free';
  const ext = path.posix.extname(rel).toLowerCase();
  const isCode = extraGated || (cfg.codeExtensions || []).includes(ext);
  if (!isCode) return 'free';
  return anyMatch(rel, cfg.testGlobs) ? 'test' : 'code';
}

function dirtyCode(repoRoot, cfg) {
  return statusPaths(repoRoot).filter(rel => {
    const k = classify(rel, cfg);
    return k === 'code' || k === 'test';
  });
}

function workState(repoRoot, cfg) {
  const head = headOf(repoRoot) || 'no-commits';
  const dirty = dirtyCode(repoRoot, cfg).sort();
  const h = crypto.createHash('sha256');
  h.update('HEAD:' + head + '\n');
  for (const rel of dirty) {
    const abs = path.join(repoRoot, rel);
    let content = '<deleted>';
    try { content = sha256(fs.readFileSync(abs)); } catch (_) { /* deleted or unreadable */ }
    h.update(rel + ':' + content + '\n');
  }
  return { head, dirty, hash: h.digest('hex') };
}

/* ------------------------------------------------------------------- specs */

function frontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
}

function cleanValue(s) {
  return String(s).replace(/\s+#.*$/, '').trim().replace(/^["']|["']$/g, '').trim();
}

function fmValue(text, key) {
  const m = frontmatter(text).match(new RegExp('^' + escapeRe(key) + ':\\s*(.*)$', 'm'));
  return m ? cleanValue(m[1]) : '';
}

function parseScope(text) {
  const lines = frontmatter(text).split(/\r?\n/);
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const inline = lines[i].match(/^scope:\s*\[(.*)\]\s*$/);
    if (inline) {
      inline[1].split(',').map(cleanValue).filter(Boolean).forEach(s => out.push(s));
      break;
    }
    if (/^scope:\s*(#.*)?$/.test(lines[i])) {
      for (let j = i + 1; j < lines.length; j++) {
        const item = lines[j].match(/^\s*-\s*(.+?)\s*$/);
        if (item) { const v = cleanValue(item[1]); if (v) out.push(v); continue; }
        if (/^\S/.test(lines[j])) break;
      }
      break;
    }
  }
  return out;
}

function sectionTable(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex(l => new RegExp('^##\\s+' + escapeRe(heading), 'i').test(l));
  if (start < 0) return null;
  const rows = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (/^##\s/.test(lines[i])) break;
    if (/^\s*\|/.test(lines[i])) rows.push(lines[i]);
  }
  if (rows.length < 2) return { header: [], rows: [] };
  const split = l => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim());
  const header = split(rows[0]).map(h => h.toLowerCase());
  const body = rows.slice(1).filter(r => !/^\s*\|?\s*:?-{2,}/.test(r)).map(split);
  return { header, rows: body };
}

function validateSpec(text) {
  const problems = [];
  if (/\{\{[^}]*\}\}/.test(text)) problems.push('unfilled {{...}} placeholders remain');
  for (const h of ['Intent', 'Assumptions', 'Invariants', 'Acceptance']) {
    if (!new RegExp('^##\\s+' + h, 'mi').test(text)) problems.push(`missing section "## ${h}"`);
  }
  const a = sectionTable(text, 'Assumptions');
  if (a && a.header.length) {
    const si = a.header.indexOf('status');
    const pending = a.rows.filter(r => si >= 0 && /pending/i.test(r[si] || '')).map(r => r[0] || '?');
    if (pending.length) problems.push(`assumptions still pending (${pending.join(', ')})`);
  }
  const inv = sectionTable(text, 'Invariants');
  if (inv) {
    if (!inv.rows.length) problems.push('no invariants listed');
    const ci = inv.header.indexOf('check');
    const unchecked = inv.rows.filter(r => ci < 0 || !r[ci] || /^(tbd|todo|-|n\/a|none)$/i.test(r[ci])).map(r => r[0] || '?');
    if (inv.rows.length && unchecked.length) problems.push(`invariants without a named check (${unchecked.join(', ')})`);
  }
  return problems;
}

function newestSpec(repoRoot, specDir) {
  const base = path.join(repoRoot, specDir);
  const found = [];
  const walk = (dir, depth) => {
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_) { return; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory() && depth < 3) walk(p, depth + 1);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) {
        try {
          const head = fs.readFileSync(p, 'utf8').split(/\r?\n/).slice(0, 30).join('\n');
          if (/^flow:\s*spec\b/m.test(head)) found.push({ p, t: fs.statSync(p).mtimeMs });
        } catch (_) { /* skip */ }
      }
    }
  };
  walk(base, 0);
  if (!found.length) return null;
  found.sort((x, y) => y.t - x.t);
  return toPosix(path.relative(repoRoot, found[0].p));
}

/* --------------------------------------------------------------- approvals */

function flowDir(projectDir) { return path.join(projectDir, '.claude', 'flow'); }
function slug(branch) { return String(branch).replace(/[^A-Za-z0-9._-]+/g, '__'); }
function approvalFile(projectDir, branch) { return path.join(flowDir(projectDir), 'approvals', slug(branch) + '.json'); }

function appendLog(projectDir, entry) {
  const file = path.join(flowDir(projectDir), 'approvals.log');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, JSON.stringify(entry) + '\n');
}

function evaluateApproval(projectDir, repoRoot, branch) {
  const rec = readJSON(approvalFile(projectDir, branch));
  if (!rec) return { status: 'none' };
  if (rec.type === 'quick') {
    return (headOf(repoRoot) || null) === (rec.head || null) ? { status: 'quick', rec } : { status: 'quick-expired', rec };
  }
  const specAbs = path.join(repoRoot, rec.spec || '');
  if (!rec.spec || !fs.existsSync(specAbs)) return { status: 'spec-missing', rec };
  const buf = fs.readFileSync(specAbs);
  if (sha256(buf) !== rec.sha256) return { status: 'spec-stale', rec };
  const text = buf.toString('utf8');
  return { status: 'spec', rec, scope: parseScope(text), verify: fmValue(text, 'verify') };
}

function describeApproval(ap) {
  switch (ap.status) {
    case 'none': return 'none (code edits are gated)';
    case 'quick': return `quick "${ap.rec.intent}" (valid until the next commit)`;
    case 'quick-expired': return 'quick approval expired at the last commit (code edits are gated)';
    case 'spec': return `${ap.rec.spec} approved ${ap.rec.approvedAt}${ap.scope.length ? ' · scope ' + ap.scope.join(', ') : ''}`;
    case 'spec-stale': return `${ap.rec.spec} CHANGED since approval (code edits are gated)`;
    case 'spec-missing': return `${ap.rec.spec} is missing (code edits are gated)`;
    default: return ap.status;
  }
}

/* ------------------------------------------------------------------- cache */

function cacheFile(projectDir) { return path.join(flowDir(projectDir), '.cache.json'); }

function loadCache(projectDir) {
  const c = readJSON(cacheFile(projectDir)) || {};
  c.verify = c.verify || {}; c.report = c.report || {}; c.blocks = c.blocks || {}; c.turn = c.turn || {};
  return c;
}

function saveCache(projectDir, c) {
  const trim = obj => {
    const keys = Object.keys(obj);
    if (keys.length > 30) keys.slice(0, keys.length - 30).forEach(k => delete obj[k]);
  };
  trim(c.blocks); trim(c.turn);
  try { writeJSON(cacheFile(projectDir), c); } catch (_) { /* best effort */ }
}

/* ------------------------------------------------------------ PreToolUse */

function preTool(decision, reason, context) {
  const o = { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } };
  if (context) o.hookSpecificOutput.additionalContext = context;
  emit(o);
}

function gateMessageF1(branch, ap) {
  const why = ap.status === 'quick-expired'
    ? `the quick approval for branch '${branch}' expired at the last commit`
    : `no valid approval covers branch '${branch}'`;
  return `FLOW ALERT [F1] · ${why}. Code edits are gated until the user approves a spec (APPROVE <spec path>) ` +
    `or a small fix (APPROVE QUICK <intent>). Raise this as a FLOW ALERT and wait; do not route around the gate.`;
}

function cmdGate(input, env) {
  const cfg = env.cfg;
  const ti = input.tool_input || {};
  const fp = ti.file_path || ti.notebook_path || ti.path;
  if (!fp) return;
  const abs = realAbs(path.isAbsolute(fp) ? fp : path.resolve(input.cwd || env.projectDir, fp));
  const repoRoot = toplevelFor(abs);
  if (!repoRoot) {
    return preTool('ask', `flow-kit [F3] · ${fp} is outside any git repository. Allow this edit?`,
      `FLOW: the user was asked to confirm an edit outside the repository (${fp}).`);
  }
  const rel = toPosix(path.relative(repoRoot, abs));
  const kind = classify(rel, cfg);
  if (kind === 'protected') {
    return preTool('deny', `FLOW [F9] · ${rel} is a flow-kit protected path; only the user edits it. ` +
      `Relay this as a FLOW ALERT if the change is genuinely needed.`);
  }
  if (kind === 'outside') {
    return preTool('ask', `flow-kit [F3] · ${fp} is outside the project. Allow this edit?`,
      `FLOW: the user was asked to confirm an edit outside the project (${fp}).`);
  }
  if (/(^|\/)CLAUDE\.md$/.test(rel) && touchesFlowBlock(abs, ti)) {
    return preTool('ask', `flow-kit [F9] · this edit changes the flow-kit block in ${rel}. Allow it?`,
      `FLOW: the user was asked to confirm a change to the flow-kit block in ${rel}. That block is the user's instrument; ` +
      'if the change was not requested, raise a FLOW ALERT instead.');
  }
  if (kind === 'free') return;

  const branch = branchOf(repoRoot);
  const ap = evaluateApproval(env.projectDir, repoRoot, branch);
  if (ap.status === 'none' || ap.status === 'quick-expired') return preTool('deny', gateMessageF1(branch, ap));
  if (ap.status === 'spec-stale' || ap.status === 'spec-missing') {
    return preTool('deny', `FLOW ALERT [F2] · ${ap.rec.spec} ${ap.status === 'spec-stale' ? 'changed after' : 'went missing after'} ` +
      `it was approved (${ap.rec.approvedAt}). Approval covers only what was approved; ask the user to re-approve ` +
      `(APPROVE ${ap.rec.spec}) and wait.`);
  }

  const asks = [];
  if (ap.status === 'spec' && ap.scope.length && !anyMatch(rel, ap.scope)) asks.push(`[F3] is outside the approved scope of ${ap.rec.spec}`);
  if (kind === 'test' && fs.existsSync(abs)) asks.push('[F7] modifies an existing test (tests are the contract)');
  if (anyMatch(rel, cfg.askGlobs)) asks.push('[F8] is a capital-path file under the repo overlay');
  if (asks.length) {
    return preTool('ask', `flow-kit · ${rel} ${asks.join('; ')}. Allow this edit?`,
      `FLOW: the user was asked to confirm an edit to ${rel} because it ${asks.join('; ')}. If they decline, or if this ` +
      `reflects a change of scope, raise a FLOW ALERT and update the spec rather than working around it.`);
  }
}

function touchesFlowBlock(abs, ti) {
  let text;
  try { text = fs.readFileSync(abs, 'utf8'); } catch (_) { return false; }
  const start = text.indexOf('<!-- flow-kit');
  if (start < 0) return false;
  const endTag = '<!-- /flow-kit -->';
  const end = text.indexOf(endTag, start);
  const block = end < 0 ? text.slice(start) : text.slice(start, end + endTag.length);
  if (typeof ti.content === 'string') return !ti.content.includes(block);
  const old = String(ti.old_string || '');
  return Boolean(old) && (block.includes(old) || old.includes('<!-- flow-kit') || old.includes(endTag));
}

const SHELL_WRITE = /(\bsed\s+(-[a-zA-Z]*i\b|--in-place)|\bperl\s+-[a-zA-Z]*i|\btee\b|\bmv\b|\bcp\b|\brm\b|\bgit\s+(apply|restore|checkout\s+--)|\bpatch\b)/;

const KIT_PATH = /\.claude\/(flow|hooks)\b|\.claude\/settings(\.local)?\.json|\.claude\/rules\/flow|\.claude\/skills\/flow-/;

function redirectTargets(cmd) {
  // File targets of > and >> redirects; fd duplications such as 2>&1 are not files and are skipped.
  const re = />>?\s*(?!&)(["']?)([^\s"';|&<>]+)\1/g;
  const out = [];
  let m;
  while ((m = re.exec(cmd))) out.push(m[2]);
  return out;
}

function redirectsToCode(cmd, cfg) {
  return redirectTargets(cmd).some(t => (cfg.codeExtensions || []).includes(path.extname(t).toLowerCase()));
}

function cmdBash(input, env) {
  const cfg = env.cfg;
  const cmd = String((input.tool_input && input.tool_input.command) || '');
  if (!cmd) return;
  const writesKit = (SHELL_WRITE.test(cmd) && KIT_PATH.test(cmd)) || redirectTargets(cmd).some(t => KIT_PATH.test(t));
  if (writesKit) {
    return preTool('deny', 'FLOW [F9] · this command would modify flow-kit files, which only the user edits. Raise a FLOW ALERT if it is genuinely needed.');
  }
  const asks = [];
  const hits = (cfg.askBashPatterns || []).filter(p => { try { return new RegExp(p).test(cmd); } catch (_) { return false; } });
  if (hits.length) asks.push(`[F8] matches a repo overlay pattern (${hits.join(', ')})`);
  const extAlt = (cfg.codeExtensions || []).map(e => escapeRe(e)).join('|');
  const codeRef = extAlt ? new RegExp('\\S(' + extAlt + ')\\b') : null;
  const modifiesCode = (SHELL_WRITE.test(cmd) && codeRef && codeRef.test(cmd)) || redirectsToCode(cmd, cfg);
  if (modifiesCode) {
    const repoRoot = toplevelFor(input.cwd || env.projectDir);
    if (repoRoot) {
      const ap = evaluateApproval(env.projectDir, repoRoot, branchOf(repoRoot));
      if (ap.status !== 'spec' && ap.status !== 'quick') asks.push('[F1] appears to modify code through the shell without a valid approval');
    }
  }
  if (asks.length) {
    return preTool('ask', `flow-kit · this command ${asks.join('; ')}. Allow it?`,
      `FLOW: the user was asked to confirm a shell command because it ${asks.join('; ')}. Use Edit/Write for code ` +
      `changes so the gates apply, and raise a FLOW ALERT if approval is missing.`);
  }
}

/* --------------------------------------------------------- UserPromptSubmit */

function promptOut(systemMessage, context) {
  const o = { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: context } };
  if (systemMessage) o.systemMessage = systemMessage;
  emit(o);
}

function vagueNote(text, cfg) {
  const found = (cfg.vagueTerms || []).filter(t => new RegExp('\\b' + escapeRe(t) + '\\w*\\b', 'i').test(text));
  if (!found.length) return '';
  if (/\d|%|\bat least\b|\bat most\b|\bless than\b|\bmore than\b|\bwithin\b|\bunder\b/i.test(text)) return '';
  return `FLOW NOTE [F4]: the request uses ${found.map(f => `"${f}"`).join(', ')}. If that steers scope, ask for a ` +
    'measurable criterion before planning.';
}

function stateText(env, repoRoot, source) {
  const branch = branchOf(repoRoot);
  const ap = evaluateApproval(env.projectDir, repoRoot, branch);
  const dirty = dirtyCode(repoRoot, env.cfg);
  const lines = [`FLOW STATE (flow-kit ${KIT_VERSION}, ${stamp(env.cfg)}): branch ${branch} · approval: ${describeApproval(ap)} · ` +
    `uncommitted code files: ${dirty.length}.`];
  if (dirty.length && ap.status !== 'spec' && ap.status !== 'quick') {
    lines.push(`FLOW ALERT [F1]: uncommitted code changes exist without a valid approval (${dirty.slice(0, 5).join(', ')}` +
      `${dirty.length > 5 ? ', ...' : ''}). Raise it with the user before further work.`);
  }
  if (ap.status === 'spec-stale') lines.push(`FLOW ALERT [F2]: ${ap.rec.spec} changed after approval; ask the user to re-approve.`);
  if (source === 'compact') lines.push('Context was compacted: re-read the approved spec from disk before continuing; the summary does not override it.');
  if (env.configError) lines.push(`FLOW NOTE: ${env.configError}; defaults are in use. Tell the user.`);
  return lines.join('\n');
}

function normaliseSpecArg(arg, repoRoot) {
  const a = cleanValue(arg);
  if (!a) return null;
  const abs = realAbs(path.resolve(repoRoot, a));
  const rel = toPosix(path.relative(repoRoot, abs));
  if (rel.startsWith('..')) return null;
  return rel;
}

function approveSpec(env, repoRoot, branch, specArg, forced) {
  const specRel = specArg ? normaliseSpecArg(specArg, repoRoot) : newestSpec(repoRoot, env.cfg.specDir);
  if (!specRel) return emit({ decision: 'block', reason: 'flow-kit: no spec found to approve. Type APPROVE <spec path>.' });
  const abs = path.join(repoRoot, specRel);
  if (!fs.existsSync(abs) || !abs.toLowerCase().endsWith('.md')) {
    return emit({ decision: 'block', reason: `flow-kit: spec not found or not markdown: ${specRel}` });
  }
  const buf = fs.readFileSync(abs);
  const problems = validateSpec(buf.toString('utf8'));
  if (problems.length && !forced) {
    return promptOut(`✗ flow-kit: ${specRel} NOT approved - ${problems.join('; ')}. Fix the spec, or type APPROVE! ${specRel} to override.`,
      `FLOW: the hook REFUSED approval of ${specRel}: ${problems.join('; ')}. Resolve these with the user (never mark ` +
      'assumptions confirmed yourself), then ask for APPROVE again.');
  }
  const rec = {
    kit: KIT_VERSION, type: 'spec', branch, spec: specRel, sha256: sha256(buf), head: headOf(repoRoot),
    forced: Boolean(forced && problems.length), overridden: forced ? problems : [],
    approvedAt: stamp(env.cfg), approvedAtISO: new Date().toISOString()
  };
  writeJSON(approvalFile(env.projectDir, branch), rec);
  appendLog(env.projectDir, { event: 'APPROVE', ...rec });
  const override = rec.forced ? ` (OVERRIDE: ${problems.join('; ')})` : '';
  return promptOut(`✓ flow-kit: approved ${specRel} (sha ${rec.sha256.slice(0, 8)}) for ${branch} at ${rec.approvedAt}${override}`,
    `FLOW: the user APPROVED ${specRel} (sha ${rec.sha256.slice(0, 8)}) for branch ${branch}${override}. Proceed to ` +
    'Execution: tests first from the acceptance criteria, then implement within scope. Any edit to the spec voids this approval.');
}

function approveQuick(env, repoRoot, branch, intent) {
  const text = String(intent || '').trim();
  if (!text) return emit({ decision: 'block', reason: 'flow-kit: APPROVE QUICK needs a one-line intent, e.g. APPROVE QUICK fix typo in header.' });
  const rec = {
    kit: KIT_VERSION, type: 'quick', branch, intent: text.slice(0, 200), head: headOf(repoRoot),
    approvedAt: stamp(env.cfg), approvedAtISO: new Date().toISOString()
  };
  writeJSON(approvalFile(env.projectDir, branch), rec);
  appendLog(env.projectDir, { event: 'APPROVE QUICK', ...rec });
  return promptOut(`✓ flow-kit: quick approval for "${rec.intent}" on ${branch} (valid until the next commit)`,
    `FLOW: the user gave a QUICK approval on branch ${branch} for: "${rec.intent}". Keep the change small and ` +
    'behaviour-neutral; anything larger needs a spec. The approval expires at the next commit.');
}

function revoke(env, branch) {
  const file = approvalFile(env.projectDir, branch);
  const had = fs.existsSync(file);
  if (had) fs.unlinkSync(file);
  appendLog(env.projectDir, { event: 'REVOKE', kit: KIT_VERSION, branch, at: stamp(env.cfg), atISO: new Date().toISOString(), hadApproval: had });
  return promptOut(`flow-kit: approval ${had ? 'revoked' : '(none) cleared'} for ${branch}`,
    `FLOW: the user REVOKED approval for branch ${branch}. Code edits are gated again; stop and ask how to proceed.`);
}

function cmdPrompt(input, env) {
  const text = String(input.prompt || '');
  const trimmed = text.trim();
  const repoRoot = toplevelFor(input.cwd || env.projectDir);
  if (!repoRoot) return;
  const branch = branchOf(repoRoot);

  let m = trimmed.match(/^APPROVE!?\s+QUICK\b[:\s]*([\s\S]*)$/);
  if (m) return approveQuick(env, repoRoot, branch, m[1]);
  m = trimmed.match(/^APPROVE(!?)(?=\s|$)\s*([^\s]*)/);
  if (m) {
    const arg = m[2] && (/\.md$/i.test(m[2]) || m[2].includes('/')) ? m[2] : '';
    return approveSpec(env, repoRoot, branch, arg, m[1] === '!');
  }
  if (/^REVOKE\b/.test(trimmed)) return revoke(env, branch);

  const cache = loadCache(env.projectDir);
  const ws = workState(repoRoot, env.cfg);
  cache.turn[input.session_id || 'unknown'] = { hash: ws.hash, at: stamp(env.cfg) };
  saveCache(env.projectDir, cache);

  const parts = [stateText(env, repoRoot)];
  const note = vagueNote(text, env.cfg);
  if (note) parts.push(note);
  return promptOut(null, parts.join('\n'));
}

/* -------------------------------------------------------------- SessionStart */

function cmdSession(input, env) {
  const repoRoot = toplevelFor(input.cwd || env.projectDir);
  if (!repoRoot) return;
  const text = stateText(env, repoRoot, input.source) +
    '\nThis repo runs flow-kit: follow .claude/rules/flow.md; hooks enforce approval, scope and verification.';
  emit({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } });
}

/* ---------------------------------------------------------------------- Stop */

function runVerify(cmd, cwd, timeoutSec) {
  const r = spawnSync(cmd, {
    cwd, shell: true, encoding: 'utf8', timeout: timeoutSec * 1000, maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, CI: 'true', FORCE_COLOR: '0' }
  });
  const timedOut = Boolean(r.error && r.error.code === 'ETIMEDOUT');
  const lines = ((r.stdout || '') + (r.stderr || '')).split(/\r?\n/);
  return { ok: r.status === 0 && !timedOut, exit: timedOut ? 'timeout' : r.status, tail: lines.slice(-40).join('\n').slice(-3000) };
}

function cmdStop(input, env) {
  const cfg = env.cfg;
  const repoRoot = toplevelFor(input.cwd || env.projectDir);
  if (!repoRoot) return;
  const sid = input.session_id || 'unknown';
  const cache = loadCache(env.projectDir);
  const last = String(input.last_assistant_message || '');

  const allow = msg => { cache.blocks[sid] = 0; saveCache(env.projectDir, cache); if (msg) emit({ systemMessage: msg }); };
  const block = (reason, cappedWarning) => {
    const n = (cache.blocks[sid] || 0) + 1;
    if (n > cfg.maxStopBlocks) return allow(cappedWarning);
    cache.blocks[sid] = n;
    saveCache(env.projectDir, cache);
    return emit({ decision: 'block', reason });
  };

  if (/FLOW ALERT/i.test(last)) return allow();

  const ws = workState(repoRoot, cfg);
  const turn = cache.turn[sid];
  const changedThisTurn = turn ? turn.hash !== ws.hash : ws.dirty.length > 0;
  if (!changedThisTurn) return allow();

  const ap = evaluateApproval(env.projectDir, repoRoot, branchOf(repoRoot));
  const cmd = (ap.status === 'spec' && ap.verify) || cfg.verifyCmd;
  if (!cmd) {
    return block('FLOW ALERT [F6] · code changed but no verification command is configured. Ask the user how this change ' +
      'should be verified (verifyCmd in .claude/flow/config.json, or verify: in the spec frontmatter).',
      '⚠ flow-kit [F6]: finished with no verification configured; these changes are unverified.');
  }

  let v = cache.verify[repoRoot];
  if (!v || v.hash !== ws.hash || v.cmd !== cmd) {
    const r = runVerify(cmd, repoRoot, cfg.verifyTimeoutSec);
    v = { hash: ws.hash, cmd, ok: r.ok, exit: r.exit, tail: r.tail, at: stamp(cfg) };
    cache.verify[repoRoot] = v;
    saveCache(env.projectDir, cache);
  }
  if (!v.ok) {
    return block(`FLOW [F6] · verification failed (exit ${v.exit}): ${cmd}\nFix the cause. If the failure suggests the spec ` +
      `or a test is wrong, raise a FLOW ALERT instead of editing the test.\n--- output tail ---\n${v.tail}`,
      `⚠ flow-kit [F6]: verification still failing after ${cfg.maxStopBlocks} attempts; the work is NOT done.`);
  }

  if (cache.report[repoRoot] === ws.hash) return allow();
  if (last.toUpperCase().includes(String(cfg.reportMarker).toUpperCase())) {
    cache.report[repoRoot] = ws.hash;
    return allow();
  }
  return block(`FLOW [E1] · verification passed (${cmd}). Before finishing, close with an ${cfg.reportMarker}: each ` +
    'invariant Passed, Failed or Not Verifiable, with its evidence (test name, command output, file:line). ' +
    'An unchecked invariant is Not Verifiable, never Passed.',
    `⚠ flow-kit [E1]: finished without an ${cfg.reportMarker}.`);
}

/* -------------------------------------------------------------------- status */

function cmdStatus(env, asJson) {
  const repoRoot = toplevelFor(env.projectDir);
  if (!repoRoot) { console.log('flow-kit: not inside a git repository.'); return; }
  const branch = branchOf(repoRoot);
  const ap = evaluateApproval(env.projectDir, repoRoot, branch);
  const ws = workState(repoRoot, env.cfg);
  const cache = loadCache(env.projectDir);
  const v = cache.verify[repoRoot];
  const verification = !v ? 'not run yet' : v.hash !== ws.hash ? 'not run for the current changes'
    : (v.ok ? `passed ${v.at} (${v.cmd})` : `FAILED ${v.at} (exit ${v.exit}, ${v.cmd})`);
  const report = cache.report[repoRoot] === ws.hash ? 'present for the current changes' : 'not yet given for the current changes';
  const data = {
    kit: KIT_VERSION, enabled: env.cfg.enabled !== false, repo: repoRoot, branch, head: ws.head,
    approval: { status: ap.status, detail: describeApproval(ap), spec: ap.rec && ap.rec.spec, scope: ap.scope || [] },
    uncommittedCode: ws.dirty, verification, report,
    config: { verifyCmd: env.cfg.verifyCmd, specDir: env.cfg.specDir, askGlobs: env.cfg.askGlobs, askBashPatterns: env.cfg.askBashPatterns },
    configError: env.configError
  };
  if (asJson) { console.log(JSON.stringify(data, null, 2)); return; }
  console.log([
    `flow-kit ${KIT_VERSION}${data.enabled ? '' : ' (DISABLED)'} · ${stamp(env.cfg)}`,
    `branch:        ${branch} (HEAD ${String(ws.head).slice(0, 7)})`,
    `approval:      ${describeApproval(ap)}`,
    `uncommitted:   ${ws.dirty.length ? ws.dirty.join(', ') : 'none'}`,
    `verification:  ${verification}`,
    `report:        ${report}`,
    `verify cmd:    ${env.cfg.verifyCmd || '(not configured)'}`,
    `spec dir:      ${env.cfg.specDir}`,
    `overlay asks:  ${(env.cfg.askGlobs || []).length} path(s), ${(env.cfg.askBashPatterns || []).length} shell pattern(s)`,
    env.configError ? `config error:  ${env.configError}` : ''
  ].filter(Boolean).join('\n'));
}

/* ---------------------------------------------------------------------- main */

function main() {
  const sub = process.argv[2] || '';
  const isHook = ['gate', 'bash', 'prompt', 'stop', 'session'].includes(sub);
  const input = isHook ? readStdinJSON() : {};
  const projectDir = projectDirOf(input);
  const { cfg, error } = loadConfig(projectDir);
  const env = { projectDir, cfg, configError: error };

  if (sub === 'status') return cmdStatus(env, process.argv.includes('--json'));
  if (cfg.enabled === false) return;

  try {
    if (sub === 'gate') return cmdGate(input, env);
    if (sub === 'bash') return cmdBash(input, env);
    if (sub === 'prompt') return cmdPrompt(input, env);
    if (sub === 'stop') return cmdStop(input, env);
    if (sub === 'session') return cmdSession(input, env);
    console.error('usage: flow.cjs gate|bash|prompt|stop|session|status [--json]');
  } catch (e) {
    const msg = `flow-kit internal error in "${sub}": ${e && e.message ? e.message : e}`;
    if (sub === 'gate' || sub === 'bash') return preTool('ask', `${msg}. The gate could not evaluate this action. Allow it?`);
    if (sub === 'prompt') return promptOut(`⚠ ${msg}`, `FLOW NOTE: ${msg}. Tell the user; gates may not be evaluating.`);
    return emit({ systemMessage: `⚠ ${msg}` });
  }
}

if (require.main === module) main();

module.exports = { compileGlob, matchGlob, classify, parseScope, validateSpec, fmValue, stamp, DEFAULTS, KIT_VERSION };
