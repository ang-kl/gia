#!/usr/bin/env node
// doc/VibeCodingRecord/generate.mjs — regenerates the Vibe-Coding Record.
//
// Inputs  (committed snapshots in ./data/):
//   data/prs.ndjson   — one JSON object per PR: { n, title, state, merged, body }
//                       (body = first ~360 chars of the GitHub PR description)
//   data/pr-files.tsv  — "<PR#>\t<file1,file2,…>" for every PR that squash-merged
//                        to a commit on main tagged "(#NNN)" (≈ PR #78 onward;
//                        earlier PRs predate that convention → no file list).
//
// Outputs (overwritten on each run, both committed):
//   records.tsv             — the source-of-truth ledger, one row per PR, TSV.
//   vibe-coding-record.md   — the human-readable Markdown view of the same data.
//
// Run:  node doc/VibeCodingRecord/generate.mjs
//
// To refresh after new PRs land, append their rows to data/prs.ndjson (and the
// squash-commit file lists to data/pr-files.tsv — `git log --name-only origin/main`
// has them), then re-run. See VibeCodingRecord.md for the schema + column legend.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN_DATE = '2026-05-12';   // bump when you regenerate against a fresh snapshot

// ── helpers ─────────────────────────────────────────────────────────────────

function decodeEntities(s = '') {
  return String(s)
    .replace(/&#x60;/gi, '`').replace(/&#96;/g, '`')
    .replace(/&#34;/g, '"').replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'").replace(/&apos;/gi, "'")
    .replace(/&#38;/g, '&').replace(/&amp;/gi, '&')
    .replace(/&#60;/g, '<').replace(/&lt;/gi, '<')
    .replace(/&#62;/g, '>').replace(/&gt;/gi, '>')
    .replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(Number(d)); } catch { return _; } });
}
const clean = (s = '') => decodeEntities(s).replace(/\s+/g, ' ').trim();
const cell = (s = '') => clean(s).replace(/\t/g, ' ').replace(/\|/g, '\\|');
const truncate = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);

// strip the leading "vX.Y.Z — " / "vX.Y.Z: " / "docs(vX.Y.Z): " prefix from a title
function stripVersionPrefix(title) {
  let t = title;
  t = t.replace(/^docs?\s*\(?\s*v?\d+\.\d+(?:\.\d+)?\)?\s*[:—–-]\s*/i, '');
  t = t.replace(/^v?\d+\.\d+(?:\.\d+)?\s*[:—–-]\s*/i, '');
  t = t.replace(/^(feat|fix|chore|docs|refactor|perf|test|build|ci|style)\s*(\([^)]*\))?\s*:\s*/i, '');
  return t.trim();
}
function versionOf(title) {
  const m = title.match(/v?(\d+\.\d+\.\d+)/) || title.match(/v?(\d+\.\d+)\b/);
  return m ? m[1] : '';
}

// ── categorisation ──────────────────────────────────────────────────────────

const has = (hay, ...needles) => needles.some((n) => hay.includes(n));

function categoryOf(title, body) {
  const tl = title.toLowerCase();
  const bl = body.toLowerCase();
  const stripped = stripVersionPrefix(title).toLowerCase();
  if (/^docs?\s*\(/i.test(title) || /^docs:/i.test(title) || has(tl, 'journal/feature/technical', 'doc/ + vault', 'vault snapshot', 'doc catch-up', 'doc/ catch-up', 'register catch-up') || (has(tl, 'doc', 'journal', 'vault') && !has(tl, 'document ') && stripped.startsWith('journal'))) return 'docs';
  if (/^(ci|build|chore)\s*[:(]/i.test(title) || has(stripped, 'ci ', 'workflow', 'github action', 'gitignore', 'dependency', 'dependencies', 'package.json bump', 'bump version', 'deploy', 'railway', 'node version', 'eslint', 'lint config')) return 'infra';
  if (/^fix\s*[:(]/i.test(title) || /^hotfix/i.test(stripped) || /^fix /i.test(stripped) || /\bfixes? #\d+/i.test(bl) || (has(stripped, 'fix', 'bug', 'regression', 'broken', "doesn't", 'no longer', 'stopped working', 'crash', 'throws', 'silent') && !has(stripped, 'add ', 'new '))) return 'fix';
  if (has(stripped, 'refactor', 'rename', 'restructure', 'consolidat', 'extract ', 'split ', 'de-dup', 'dedup', 'tidy', 'cleanup', 'clean up', 'reorganis', 'reorganiz')) return 'refactor';
  if (has(stripped, 'copy', 'wording', 'rephrase', 'reword', 'rewrite the', 'translation', 'translate', 'en/fr', 'en + fr', 'i18n string', 'message text', 'phrasing', 'blurb')) return 'copy';
  if (has(stripped, 'prompt', 'gemini ', 'llm ', 'claude ', 'narrate', 'instruction to', 'system prompt', 'temperature', 'few-shot')) return 'prompt-tune';
  if (has(stripped, 'test', 'vitest', 'coverage')) return 'test';
  return 'feature';
}

const FEATURE_RULES = [
  ['Oversight / usage stats', ['oversight', 'usage-log', 'usage tracking', 'usage stats', 'usage counters', 'dau ']],
  ['Cuisine Picker', ['cuisine picker', '/cuisine', 'cuisine tma', 'cuisine-tma', 'cuisine search', 'cuisines vault', 'cuisine card', 'criteria card', 'cuisine chip', 'cuisine family']],
  ['Search / free-text', ['/s ', '/search', 'free-text', 'freetext', 'dish search', 'cooking method', 'cooking-method', 'technique search', 'nation-iconic', 'red disambig', 'r.e.d', 'ambiguous dish']],
  ['/eat /drink flow', ['/eat', '/drink', 'runflow', 'fan-out', 'fanout', 'pickvalidated', 'meal period', 'deliverpicks', 'vault-first']],
  ['/hidden surprise', ['/hidden', '/surprise', 'hidden gem', 'hidden sanctuary', 'surprise search', 'findsurprise', 'deliversurprise']],
  ['Hawker NEA', ['hawker', 'nea closures', 'hawker centre', 'hawker tma']],
  ['Transport / carpark', ['transport tma', '/transport', ' mrt', 'mrt ', 'lta ', 'datamall', 'carpark', '/carpark', 'train service', 'bus arrival', 'engineering hours']],
  ['Weather', ['weather', '/weather', 'nea forecast', '2-hour forecast', '2 h forecast', 'rain ']],
  ['Buddy / sharing', ['buddy', '/share', '/picks', 'recent picks', 'recent-picks', 'clip-store', 'share token']],
  ['Recognised lists', ['michelin', 'bib gourmand', '/recognised', '/recognized', 'asia 50', 'asia 100', 'local produce', 'guide 2025']],
  ['Menu hub', ['menu tma', '/menu', 'menu hub', 'menu tile', 'hub tile']],
  ['Privacy / legal', ['privacy', '/forgetme', '/legal', 'data retention', 'legal disclaimer', 'jurisdiction', 'forgetuserdata', 'data handling', 'erasure']],
  ['Language / i18n', ['/language', 'i18n', 'français', 'french translation', 'language pref', 'locale']],
  ['Maps / geo / location', ['leaflet', 'map tma', 'geocode', 'reverse-geocode', 'street view', '3d view', 'open in 3d', 'location cache', 'gps', 'directions url', 'map hash']],
  ['Docs / vault', ['journal', 'vault snapshot', 'doc/ ', 'register', 'feature doc', 'technical doc', 'serial-state', 'doc protocol', 'changelog']],
  ['Infra / setup', ['phase 1', 'phase 2', 'phase 3', 'setup', 'env template', 'env.example', '.env', 'webhook', 'long-poll', 'long poll', 'ci ', 'workflow', 'gitignore', 'package.json', 'deploy', 'railway', 'health check', 'preflight', 'skill', 'gatekeeper']],
  ['Pipeline / discovery', ['pipeline', 'discover', 'google places', 'places api', 'validation', 'footfall', 'enrichment', 'narrate step', 'request-store', 'response-cache', 'consultant layer']],
  ['Commands / chat UX', ['/ver', '/ftlog', '/start', '/status', 'onboarding', 'help text', 'command list', 'setmycommands', 'inline keyboard', 'callback query', 'keyboard']],
];
function featureAreaOf(title, body) {
  const txt = (stripVersionPrefix(title) + ' || ' + title + ' || ' + body).toLowerCase();
  for (const [label, keys] of FEATURE_RULES) if (has(txt, ...keys)) return label;
  return 'Core / misc';
}

const TMA_DIRS = { 'web/cuisine': 'cuisine', 'web/menu': 'menu', 'web/hawker': 'hawker', 'web/transport': 'transport', 'web/oversight': 'oversight' };
function codeImpactOf(files, title, body) {
  if (!files || !files.length) {
    // fall back to a guess from the text
    const txt = (title + ' ' + body).toLowerCase();
    const guesses = [];
    if (has(txt, 'index.js')) guesses.push('index.js');
    for (const [dir, name] of Object.entries(TMA_DIRS)) if (has(txt, dir, `${name} tma`, `${name}-tma`)) guesses.push(`TMA:${name}`);
    if (has(txt, 'i18n')) guesses.push('i18n.js');
    if (has(txt, 'doc/', 'journal', 'vault')) guesses.push('doc');
    return (guesses.length ? guesses.join(', ') + ' (inferred — pre-squash)' : '(pre-squash convention — not tracked)');
  }
  const buckets = new Set();
  const mods = new Set();
  for (const f of files) {
    if (f === 'index.js') buckets.add('index.js');
    else if (f.startsWith('web/')) { for (const [dir, name] of Object.entries(TMA_DIRS)) if (f.startsWith(dir + '/')) buckets.add(`TMA:${name}`); }
    else if (f.startsWith('__tests__/')) buckets.add('tests');
    else if (f.startsWith('doc/')) buckets.add('doc');
    else if (f.startsWith('vault/')) buckets.add('vault');
    else if (f.startsWith('.github/')) buckets.add('ci');
    else if (f.startsWith('data/') || f.startsWith('seed/')) buckets.add('data');
    else if (f === 'package.json' || f === 'package-lock.json') buckets.add('package');
    else if (/\.js$/.test(f) && !f.includes('/')) mods.add(f);
    else if (/\.md$/.test(f) && !f.includes('/')) buckets.add('root-docs');
    else if (!f.includes('/')) buckets.add(f === '.gitignore' || f.startsWith('.env') || f === '.npmrc' || f === 'vitest.config.js' ? 'config' : f);
    else buckets.add(f.split('/')[0] + '/');
  }
  const modList = [...mods].sort();
  const parts = [];
  const emitted = new Set();
  if (buckets.has('index.js')) { parts.push('index.js'); emitted.add('index.js'); }
  if (modList.length) parts.push(modList.slice(0, 6).join(', ') + (modList.length > 6 ? `, +${modList.length - 6} more` : ''));
  for (const b of ['TMA:cuisine', 'TMA:menu', 'TMA:hawker', 'TMA:transport', 'TMA:oversight', 'tests', 'doc', 'vault', 'ci', 'data', 'package', 'config', 'root-docs']) if (buckets.has(b)) { parts.push(b); emitted.add(b); }
  for (const b of buckets) if (!emitted.has(b)) parts.push(b);
  return `${files.length} file${files.length === 1 ? '' : 's'} — ` + (parts.length ? parts.join(', ') : files.slice(0, 4).join(', '));
}

function tmasTouched(files, title, body) {
  const out = [];
  if (files && files.length) { for (const [dir, name] of Object.entries(TMA_DIRS)) if (files.some((f) => f.startsWith(dir + '/'))) out.push(name); }
  else { const txt = (title + ' ' + body).toLowerCase(); for (const [dir, name] of Object.entries(TMA_DIRS)) if (has(txt, dir, `${name} tma`, `${name}-tma`)) out.push(name); }
  return out.join('+') || '—';
}

function dataPrivacyLegalTestOf(files, title, body) {
  const txt = (title + ' ' + body).toLowerCase();
  const tags = [];
  const fileStr = (files || []).join(' ');
  if (has(txt, 'redis', ' ttl', 'ttl ', 'sadd', 'zadd', 'zincrby', 'scard', 'hincrby', 'cache key', 'redis key', 'redis-only', ':<chatid>', 'expire ', 'lpush', 'rpush') || /\b[a-z][a-z-]*:<[a-z]+>/i.test(txt)) tags.push('Redis/state');
  if (has(txt, 'privacy', '/forgetme', 'forgetuserdata', 'sha256', 'hash', 'hashchatid', 'identity-free', 'identity free', 'anonymis', 'anonymiz', 'de-identif', 'pii', 'no persistent identity')) tags.push('privacy');
  if (has(txt, 'legal', 'disclaimer', 'jurisdiction', 'doc/legal', 'legal/') || fileStr.includes('doc/Legal/')) tags.push('legal');
  if ((files || []).some((f) => f.startsWith('__tests__/')) || has(txt, 'vitest', 'unit test', 'regression test', 'added a test', 'add a test', 'test coverage')) tags.push('tests');
  if (fileStr.includes('doc/') || has(txt, 'journal', 'vault', 'feature doc', 'technical doc', 'register')) tags.push('doc/vault');
  return tags.length ? tags.join('; ') : '—';
}

function aiApproachOf(body, title) {
  let b = clean(body);
  // drop a leading "## Summary" / "Summary" header
  b = b.replace(/^#+\s*summary[:\s-]*/i, '').replace(/^summary[:\s-]+/i, '').trim();
  // take the first sentence-ish or first bullet
  let first = b;
  const bullet = b.match(/^[-*•]\s*(.+?)(?:\s+[-*•]\s|\s+##\s|$)/);
  if (bullet) first = bullet[1];
  else { const sent = b.match(/^(.+?[.!?])(\s|$)/); if (sent) first = sent[1]; }
  first = first.replace(/^[-*•]\s*/, '').trim();
  if (!first) first = stripVersionPrefix(title);
  return truncate(first, 240);
}

function triggerIntentOf(title, category) {
  const s = stripVersionPrefix(title).trim();
  if (!s) return truncate(clean(title), 160);
  const lead = s.split(/[—–:-]/)[0].trim();
  let verb;
  switch (category) {
    case 'fix': verb = /^(fix|fixes|fixed)\b/i.test(s) ? '' : 'Fix: '; break;
    case 'docs': verb = /^(doc|docs|journal|vault)/i.test(s) ? '' : 'Update docs: '; break;
    case 'refactor': verb = /^(refactor|rename|restructure|consolidat|extract|split|clean)/i.test(s) ? '' : 'Refactor: '; break;
    case 'copy': verb = /^(rewrite|reword|rephrase|update|copy)/i.test(s) ? '' : 'Reword: '; break;
    case 'infra': verb = ''; break;
    case 'test': verb = /^(add|test)/i.test(s) ? '' : 'Add tests: '; break;
    default: verb = /^(add|enable|introduce|build|create|wire|implement|make|restore|allow|let)/i.test(s) ? '' : 'Add: ';
  }
  return truncate(verb + s, 200);
}

// ── load inputs ─────────────────────────────────────────────────────────────

const prs = readFileSync(join(HERE, 'data', 'prs.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map((l) => JSON.parse(l)).sort((a, b) => a.n - b.n);

const fileMap = new Map();
for (const line of readFileSync(join(HERE, 'data', 'pr-files.tsv'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [n, files] = line.split('\t');
  fileMap.set(Number(n), (files || '').split(',').filter(Boolean));
}

// ── build rows ──────────────────────────────────────────────────────────────

const COLS = ['PR', 'Status', 'Merged (UTC)', 'Version', 'Category', 'Feature & UX area', 'Triggering intent (paraphrased from PR title)', 'AI approach / solution (from PR description)', 'Code / module / TMA impact', 'TMAs', 'Data / privacy / legal / test impact', 'Title'];

const rows = prs.map((p) => {
  const title = clean(p.title);
  const body = clean(p.body || '');
  const merged = p.merged ? p.merged.replace('T', ' ').replace('Z', '') : '';
  const status = p.merged ? 'merged' : (p.state === 'closed' ? 'closed (unmerged)' : p.state);
  const files = fileMap.get(p.n) || null;
  const category = categoryOf(title, body);
  return {
    PR: p.n,
    Status: status,
    'Merged (UTC)': merged,
    Version: versionOf(title),
    Category: category,
    'Feature & UX area': featureAreaOf(title, body),
    'Triggering intent (paraphrased from PR title)': triggerIntentOf(title, category),
    'AI approach / solution (from PR description)': aiApproachOf(body, title),
    'Code / module / TMA impact': codeImpactOf(files, title, body),
    TMAs: tmasTouched(files, title, body),
    'Data / privacy / legal / test impact': dataPrivacyLegalTestOf(files, title, body),
    Title: title,
  };
});

// ── write records.tsv ───────────────────────────────────────────────────────

const tsv = [COLS.join('\t')]
  .concat(rows.map((r) => COLS.map((c) => String(r[c]).replace(/[\t\r\n]+/g, ' ').trim()).join('\t')))
  .join('\n') + '\n';
writeFileSync(join(HERE, 'records.tsv'), tsv);

// ── write vibe-coding-record.md ─────────────────────────────────────────────

function tally(key) {
  const m = new Map();
  for (const r of rows) m.set(r[key], (m.get(r[key]) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}
const catTally = tally('Category');
const featTally = tally('Feature & UX area');
const mergedCount = rows.filter((r) => r.Status === 'merged').length;
const unmergedCount = rows.length - mergedCount;

const md = [];
md.push('# Vibe-Coding Record — `ang-kl/gia` (Soleat)');
md.push('');
md.push(`> **Auto-generated** by \`doc/VibeCodingRecord/generate.mjs\` on ${GEN_DATE} from a snapshot of all ${rows.length} pull requests (#1–#${rows.length}).`);
md.push('> Do not hand-edit this file — change \`data/prs.ndjson\` / \`data/pr-files.tsv\` and re-run the generator. See \`VibeCodingRecord.md\` for the schema, the column legend, the category taxonomy, and how to refresh it.');
md.push('');
md.push('## At a glance');
md.push('');
md.push(`- **PRs:** ${rows.length} total — ${mergedCount} merged, ${unmergedCount} closed without merge.`);
md.push(`- **First:** #1 · ${rows[0]['Merged (UTC)'] || '—'} · _${rows[0].Title}_`);
md.push(`- **Latest:** #${rows[rows.length - 1].PR} · ${rows[rows.length - 1]['Merged (UTC)'] || '—'} · _${rows[rows.length - 1].Title}_`);
md.push('');
md.push('### By category');
md.push('');
md.push('| Category | PRs |');
md.push('|---|--:|');
for (const [k, v] of catTally) md.push(`| ${k} | ${v} |`);
md.push('');
md.push('### By feature / UX area');
md.push('');
md.push('| Area | PRs |');
md.push('|---|--:|');
for (const [k, v] of featTally) md.push(`| ${k} | ${v} |`);
md.push('');
md.push('## The ledger');
md.push('');
md.push('Columns: **PR** · **Status** · **Merged (UTC)** · **Ver** = release version cut by the PR · **Category** (see legend in `VibeCodingRecord.md`) · **Feature & UX area** · **Triggering intent** (paraphrased from the PR title — the verbatim chat prompt is not retained in repo history) · **AI approach / solution** (first line of the PR description) · **Code / module / TMA impact** (files changed on the squash commit; "pre-squash convention" for PRs before that practice began ≈ #78) · **TMAs** touched · **Data / privacy / legal / test impact**.');
md.push('');
const MDCOLS = ['PR', 'Status', 'Merged (UTC)', 'Version', 'Category', 'Feature & UX area', 'Triggering intent (paraphrased from PR title)', 'AI approach / solution (from PR description)', 'Code / module / TMA impact', 'TMAs', 'Data / privacy / legal / test impact'];
const HEAD = ['PR', 'Status', 'Merged (UTC)', 'Ver', 'Category', 'Feature & UX area', 'Triggering intent (paraphrased)', 'AI approach / solution', 'Code / module / TMA impact', 'TMAs', 'Data / privacy / legal / test'];
md.push('| ' + HEAD.join(' | ') + ' |');
md.push('|' + HEAD.map(() => '---').join('|') + '|');
for (const r of rows) md.push('| ' + MDCOLS.map((c) => cell(String(r[c] ?? ''))).join(' | ') + ' |');
md.push('');
md.push('---');
md.push('');
md.push('_Generated from `data/prs.ndjson` (GitHub PR metadata) + `data/pr-files.tsv` (squash-commit file lists from `git log origin/main`). The `Title` column and a few extra fields live in the machine-readable `records.tsv` alongside this file._');
md.push('');
writeFileSync(join(HERE, 'vibe-coding-record.md'), md.join('\n'));

console.log(`Vibe-Coding Record: wrote records.tsv (${rows.length} rows) and vibe-coding-record.md`);
console.log('Categories:', catTally.map(([k, v]) => `${k}=${v}`).join('  '));
