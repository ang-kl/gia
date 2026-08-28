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
// Outputs (overwritten on each run, all committed):
//   records.tsv                    — source-of-truth ledger, one row per PR, TSV.
//   vibe-coding-record.md          — human-readable Markdown view of the same data.
//   ../../public/doc/vibe-journal.json — flat JSON array of records (for jq/DuckDB/…).
//   ../../public/doc/vibe-journal.html — self-contained, queryable HTML page, served
//                                    at /doc/vibe-journal.html (filter / sort / search
//                                    + a rework & churn insights panel + lessons).
//
// Run:  node doc/VibeCodingRecord/generate.mjs
//
// To refresh after new PRs land, append their rows to data/prs.ndjson (and the
// squash-commit file lists to data/pr-files.tsv — `git log --name-only origin/main`
// has them), then re-run. See VibeCodingRecord.md for the schema + column legend.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const GEN_DATE = '2026-08-28';   // v0.62.655 three-TMA convergence catch-up: PRs #1638-#1665 (one interaction model across Cuisine/Hawker/Train: carousel default, one list toggle, over-the-map drawer; three silent-drop Tailwind failures found and fixed; viewport-width columns to ultrawide) + backfill of #1456/#1487 missed earlier; 2026-07-30 catch-up: PRs #1666-#1671 (first vault + doc catch-up, Cuisine drawer device-check fixes, Train onboarding + station-search row, urgent desktop TMA close fix, MICHELIN Guide 2026 SG Bib Gourmand + Taiwan updates, Material-alignment Phase 1 invisible a11y across all TMAs); 2026-08-01 catch-up: PRs #1672-#1685 (Material-alignment Phase 2a/2b token bridge, M3 audit Tier 0/1, Michelin footer pagination + year/Bib filters, typography + screen-size audit, O-95/96/97 Hawker parity + glass-effect fix, O-89/91/92 Register items, carousel card spec D-51 one-width/two-height-tiers with the Hawker/Train audit, footer grid-placement bug, liquid-glass-focus, four-corner ring labels, the station-pick inspection overlay, and road/address search via OneMap closing O-110); 2026-08-28 catch-up: PRs #1686-#1771 — the largest single catch-up so far, 85 PRs across 27 days (the Michelin 2026 city expansions and their data-quality fallout, the eight-locale dish-note corpus and its translation-audit gates, the provenance-contamination sweep that removed four fabricated rows, O-317's case-folding fix and the 18 dishes it reached, the cap 30 to 31 ruling, and the transport station-name arc that put the government register's Chinese/Malay names on the card strip). #1707 is absent because that number was never a PR in this repo — the fetch returned 90 PRs across the contiguous span 1681-1771, one short of 91

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
  t = t.replace(/^(feat|fix|chore|docs?|refactor|perf|test|build|ci|style)\s*(\([^)]*\))?\s*:\s*/i, '');
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
  if (/^docs?\s*[:(]/i.test(title) || has(tl, 'journal/feature/technical', 'doc/ + vault', 'vault snapshot', 'doc catch-up', 'doc/ catch-up', 'register catch-up', 'vibe-coding record', 'vibe journal', 'vibe-journal') || (has(tl, 'doc', 'journal', 'vault') && !has(tl, 'document ') && stripped.startsWith('journal'))) return 'docs';
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
// FILE_RULES — the signal the row already carried and nothing was reading (O-324).
// Only paths that name a surface unambiguously; anything shared or ambiguous abstains and
// lets the next stage decide. Deliberately NOT a mirror of TMA_DIRS below: that answers
// "which app was touched", this answers "what is this change about", and doc/ or vault/
// paths are meaningful here in a way they are not there.
const FILE_RULES = [
  ['Oversight / usage stats', [/^web\/oversight\//]],
  // The dish-content corpora live at the repo root and render in the picker. They were
  // briefly routed to Language / i18n — the translation programme works ON them — and that
  // measured WORSE (62 % → 66 % on the labelled sample when moved here), because a change to
  // the dish data is a change to what the picker shows. Genuine i18n work on them lands in
  // their `-i18n.generated.js` siblings, which still match /i18n/ below.
  ['Cuisine Picker',          [/^web\/cuisine\//, /^classics-notes/, /^city-plates/, /^nation-overlay/, /^dish-aliases/]],
  ['Hawker NEA',              [/^web\/hawker\//, /^nea-/]],
  ['Transport / carpark',     [/^web\/transport\//, /^mrt-/, /^lta-/, /^carpark/, /station-info/, /^data\/train/]],
  ['Menu hub',                [/^web\/menu\//]],
  ['Buddy / sharing',         [/^web\/clipboard\//, /^clip-store/]],
  ['Language / i18n',         [/i18n/]],
  ['Weather',                 [/^weather/]],
  ['Maps / geo / location',   [/^onemap/, /^geo/, /^maps-/, /^data\/geo-/]],
  ['Privacy / legal',         [/^doc\/Legal\//, /^privacy/]],
  ['Docs / vault',            [/^doc\//, /^docs\//, /^vault\//, /^public\/doc\//]],
  ['Infra / setup',           [/^\.github\//, /^railway/, /^\.claude\//]],
];
function areaFromFiles(files) {
  if (!files || !files.length) return null;
  const score = new Map();
  for (const f of files) {
    for (const [label, pats] of FILE_RULES) if (pats.some((p) => p.test(f))) { score.set(label, (score.get(label) || 0) + 1); break; }
  }
  if (!score.size) return null;
  // doc/.serial-state.yml and doc/Journal ride along on nearly every PR in this repo, so
  // Docs / vault and Infra / setup only win when they are the ONLY thing that scored —
  // otherwise every feature PR would file itself as documentation.
  const specific = [...score].filter(([l]) => l !== 'Docs / vault' && l !== 'Infra / setup');
  return (specific.length ? specific : [...score]).sort((a, b) => b[1] - a[1])[0][0];
}

// O-324. This used to pour title and body into one bag and take the first rule that hit
// anywhere. Bodies in this repo are long narrative documents that mention every surface in
// passing, so a bare substring like 'hawker' at rule 6 captured whatever it touched: of the
// 8 rows the 2026-08-28 catch-up filed under Hawker NEA, 7 were not about hawker centres —
// including a transport i18n PR that matched on `mrt.nearestHawker` appearing in its prose.
//
// Three stages, strongest evidence first:
//   1. the TITLE — the PR's own statement of what it is;
//   2. the FILES — what it actually changed, which cannot be mentioned in passing;
//   3. the BODY — the old behaviour, kept as the last resort rather than removed, because
//      338 rows have no file list at all (pre-squash PRs, and a handful since).
//
// Measured on a seeded 50-PR sample labelled from title + file list BEFORE any strategy was
// run against it: 38 % → 66 % overall, 38 % → 71 % on the 42 rows whose area was not
// genuinely arguable. Two rejected alternatives, both measured on the same sample:
// title-then-body 46 %, and scoring areas by body keyword FREQUENCY 48 % — the latter also
// moved 433 rows and stripped 219 off Cuisine Picker, i.e. it failed differently rather than
// less. Most of the residual 17 misses are one taxonomy question the rules cannot settle:
// whether a map fix inside the Cuisine TMA is `Maps / geo / location` or `Cuisine Picker`.
function featureAreaOf(title, body, files) {
  const t = (stripVersionPrefix(title) + ' || ' + title).toLowerCase();
  for (const [label, keys] of FEATURE_RULES) if (has(t, ...keys)) return label;
  const fromFiles = areaFromFiles(files);
  if (fromFiles) return fromFiles;
  const b = String(body).toLowerCase();
  for (const [label, keys] of FEATURE_RULES) if (has(b, ...keys)) return label;
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

// structured version of the code-impact buckets (for client-side analytics)
function codeBucketsOf(files, title, body) {
  if (!files || !files.length) return [];
  const out = new Set();
  for (const f of files) {
    if (f === 'index.js') out.add('index.js');
    else if (f.startsWith('web/')) { for (const [dir, name] of Object.entries(TMA_DIRS)) if (f.startsWith(dir + '/')) out.add(`TMA:${name}`); }
    else if (f.startsWith('__tests__/')) out.add('tests');
    else if (f.startsWith('doc/')) out.add('doc');
    else if (f.startsWith('vault/')) out.add('vault');
    else if (f.startsWith('.github/')) out.add('ci');
    else if (f.startsWith('data/') || f.startsWith('seed/')) out.add('data');
    else if (f === 'package.json' || f === 'package-lock.json') out.add('package');
    else if (/\.js$/.test(f) && !f.includes('/')) out.add(f);
    else if (/\.md$/.test(f) && !f.includes('/')) out.add('root-docs');
    else if (!f.includes('/')) out.add(f === '.gitignore' || f.startsWith('.env') || f === '.npmrc' || f === 'vitest.config.js' ? 'config' : f);
    else out.add(f.split('/')[0] + '/');
  }
  return [...out];
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

// v0.62.725 — session reply log. Operator ruling 22-08 '26: *"vibe-journal 359
// unlogged replies"*. Rules S-1/T-1 require every chat reply to carry a serial
// number and [§X.Y] paragraph tags, logged in doc/Chat/; for an entire session
// neither happened. Back-filling doc/Chat/ was refused — AU-4 forbids condensation
// and the protocol forbids invention, so retrospective serials would fabricate
// compliance. This folder is the right home precisely because it is NOT one of the
// eight authenticity templates and NOT under the AU Recipe: a derived, regenerable
// cross-section can record the replies as what they are — unnumbered, untagged.
// Optional: absent file ⇒ the panel is simply not emitted.
let sessionReplies = [];
try {
  sessionReplies = readFileSync(join(HERE, 'data', 'session-replies.ndjson'), 'utf8')
    .split('\n').filter(Boolean).map((l) => JSON.parse(l));
} catch { /* no reply log committed — panel omitted */ }
const replyStats = {
  total: sessionReplies.length,
  unlogged: sessionReplies.filter((r) => r.era === 'pre-compliance').length,
  boundaryReply: (sessionReplies.find((r) => r.serialled) || {}).i || null,
  taggedFully: sessionReplies.filter((r) => r.tagged).length,
  partiallyTagged: sessionReplies.filter((r) => !r.tagged && r.untaggedUnits < r.units).length,
  numbered: sessionReplies.filter((r) => r.kind === 'numbered-reply').length,
  narration: sessionReplies.filter((r) => r.kind === 'inline-narration').length,
  chars: sessionReplies.reduce((a, r) => a + (r.chars || 0), 0),
  redactions: sessionReplies.reduce((a, r) => a + (r.redactions || 0), 0)
};

// `n` is coerced because 116 rows (#1552-#1665) carried it as a STRING — a quirk of
// whichever dump produced them, invisible until a lookup keyed on a number missed them.
// Nothing here broke (every internal use already wrapped it in Number()), but the published
// vibe-journal.json shipped a mixed-type `pr` field to anyone reading it with jq or pandas.
// Coerced at READ as well as normalised in the data, so a future dump that quotes the
// number cannot reintroduce the mix.
const prs = readFileSync(join(HERE, 'data', 'prs.ndjson'), 'utf8')
  .split('\n').filter(Boolean).map((l) => { const p = JSON.parse(l); p.n = Number(p.n); return p; })
  .sort((a, b) => a.n - b.n);

const fileMap = new Map();
for (const line of readFileSync(join(HERE, 'data', 'pr-files.tsv'), 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [n, files] = line.split('\t');
  fileMap.set(Number(n), (files || '').split(',').filter(Boolean));
}

// ── build rows ──────────────────────────────────────────────────────────────

const COLS = ['PR', 'Status', 'Merged (UTC)', 'Version', 'Category', 'Feature & UX area', 'Triggering intent (paraphrased from PR title)', 'AI approach / solution (from PR description)', 'Code / module / TMA impact', 'TMAs', 'Data / privacy / legal / test impact', 'Title'];

// minor (MAJOR.MINOR) of a version string, e.g. "0.60.142" -> "0.60"
const minorOf = (v) => { const m = String(v).match(/^(\d+\.\d+)/); return m ? m[1] : ''; };

// follow-up / rework cue words in a PR title (suggest "we shipped, then iterated")
const REWORK_CUES = ['follow-up', 'followup', 'follow up', 'again', 'still ', 'redo', 're-add', 'readd', 'restore', 'actually', 'properly', 'take 2', 'take two', 'round 2', 'round two', 'revert', 'rollback', 'roll back', 're-enable', 're-do', 'not taking effect', 'didn\'t take', 'doesn\'t take', 'second attempt', 'one more', 'truly', 'finally', 'for real'];

const records = prs.map((p) => {
  const title = clean(p.title);
  const bodyRaw = clean(p.body || '');
  const merged = p.merged ? p.merged.replace('T', ' ').replace('Z', '') : '';
  const status = p.merged ? 'merged' : (p.state === 'closed' ? 'closed (unmerged)' : p.state);
  const files = fileMap.get(Number(p.n)) || null;
  const category = categoryOf(title, bodyRaw);
  const area = featureAreaOf(title, bodyRaw, files);
  const impactStr = dataPrivacyLegalTestOf(files, title, bodyRaw);
  return {
    pr: p.n,
    status,
    merged,
    day: merged ? merged.slice(0, 10) : '',
    version: versionOf(title),
    minor: minorOf(versionOf(title)),
    category,
    area,
    intent: triggerIntentOf(title, category),
    approach: aiApproachOf(bodyRaw, title),
    codeImpact: codeImpactOf(files, title, bodyRaw),
    modules: codeBucketsOf(files, title, bodyRaw),
    nFiles: files ? files.length : null,
    tmas: tmasTouched(files, title, bodyRaw) === '—' ? [] : tmasTouched(files, title, bodyRaw).split('+'),
    impactTags: impactStr === '—' ? [] : impactStr.split('; '),
    title,
  };
});

// ── rework / churn analysis ─────────────────────────────────────────────────
//
// Heuristic "this looped" signal: for each PR, look back over the previous
// LOOKBACK PRs; if it's a `fix` (or its title carries a follow-up cue) AND an
// earlier PR in that window shares the same feature area, flag it as rework of
// the most-recent such PR. Also flag "bursts": ≥3 PRs in the same area within
// any window of LOOKBACK. None of this is exact — it's a prompt to go look.
const LOOKBACK = 8;
for (let i = 0; i < records.length; i++) {
  const r = records[i];
  const titleLc = r.title.toLowerCase();
  const hasCue = REWORK_CUES.some((c) => titleLc.includes(c));
  r.reworkCue = hasCue;
  r.reworkOf = null;
  if (r.area === 'Core / misc' || r.area === 'Docs / vault' || r.area === 'Infra / setup') {
    // these buckets are catch-alls / housekeeping — skip the rework flag
  } else if (r.category === 'fix' || hasCue) {
    for (let j = i - 1; j >= Math.max(0, i - LOOKBACK); j--) {
      if (records[j].area === r.area) { r.reworkOf = records[j].pr; break; }
    }
  }
  // burst membership
  const windowStart = Math.max(0, i - LOOKBACK + 1);
  let sameArea = 0;
  for (let j = windowStart; j <= i; j++) if (records[j].area === r.area) sameArea++;
  r.burst = sameArea >= 3 && r.area !== 'Core / misc';
}

// The highest PR NUMBER, which is not the row COUNT: the numbering has gaps (numbers
// consumed by issues, and PRs that were never opened), so `records.length` understates
// the top of the range. Both banners used to print the count on both sides of `#1–#N`,
// which read as a claim about the range and was wrong by 27 at the 2026-08-28 catch-up.
const maxPr = records.reduce((m, r) => Math.max(m, Number(r.pr) || 0), 0);

// keep the old `rows` shape (capitalised keys) for the TSV + MD writers
const rows = records.map((r) => ({
  PR: r.pr,
  Status: r.status,
  'Merged (UTC)': r.merged,
  Version: r.version,
  Category: r.category,
  'Feature & UX area': r.area,
  'Triggering intent (paraphrased from PR title)': r.intent,
  'AI approach / solution (from PR description)': r.approach,
  'Code / module / TMA impact': r.codeImpact,
  TMAs: r.tmas.join('+') || '—',
  'Data / privacy / legal / test impact': r.impactTags.join('; ') || '—',
  Title: r.title,
}));

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
md.push(`> **Auto-generated** by \`doc/VibeCodingRecord/generate.mjs\` on ${GEN_DATE} from a snapshot of all ${rows.length} pull requests (#1–#${maxPr}).`);
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

// ── write the hosted HTML query page (+ raw JSON) ───────────────────────────
//   public/doc/vibe-journal.html  — self-contained, served at /doc/vibe-journal.html
//   public/doc/vibe-journal.json  — the same records as a flat JSON array

const PUBLIC_DOC = join(HERE, '..', '..', 'public', 'doc');
mkdirSync(PUBLIC_DOC, { recursive: true });
writeFileSync(join(PUBLIC_DOC, 'vibe-journal.json'), JSON.stringify({ generated: GEN_DATE, count: records.length, records, sessionReplies, replyStats }, null, 2) + '\n');

const reworkCount = records.filter((r) => r.reworkOf).length;
const cueCount = records.filter((r) => r.reworkCue).length;
const minorCount = new Set(records.map((r) => r.minor).filter(Boolean)).size;
const HTML_META = { generated: GEN_DATE, count: records.length, maxPr, merged: mergedCount, unmerged: unmergedCount, minors: minorCount, rework: reworkCount, cues: cueCount };

const htmlEsc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const jsonForScript = (o) => JSON.stringify(o)
  .replace(/</g, "\u003c")
  .replace(new RegExp("\u003c/script","gi"), "\u003c/scr"+"ipt")
  .replace(new RegExp("\u2028","g"), "\u2028")
  .replace(new RegExp("\u2029","g"), "\u2029");
// lessons distilled from .claude/skills/gia-preflight/SKILL.md — kept short here.
const LESSONS = [
  ['Run the gates before every PR', 'node --check on each changed .js, npm test 100% green, and (if web/ changed) the TMA build — non-negotiable. Most repeat fixes were caught later than they should have been.'],
  ['Verify module exports when you add a require()', 'A require(\'./x\').y() where y isn\'t exported throws on first call; with a per-item catch it shows a thin fallback, without one the whole handler goes silent. node -e "Object.keys(require(\'./x\'))" settles it.'],
  ['Escape user text in parse_mode:"HTML" messages', 'Any {placeholder} that holds user input / a Places field / external text must be HTML-escaped. Plain-text sends need no escaping — don\'t over-escape those either.'],
  ['Every handler return path must send or be a documented no-op', 'Trace each return in bot.onText / callback handlers / the search fan-outs. Top-level handlers get a try/catch that still sends a friendly fallback; per-card .map() renders get a per-item catch.'],
  ['Smoke-test fuzzy matchers after bulk-adding entries', 'A leading-prefix matcher fed a big list will hijack common queries (ramen, pizza, chicken…). Assert the "must NOT match" set and pin it with a regression test.'],
  ['Deterministic, most-specific resolvers run first; the LLM runs last', 'A confident R.E.D / technique / nation-overlay resolution must pre-empt the looser fallbacks (gate them), not the other way round.'],
  ['Never reset --hard / checkout . / clean -fd / force-push a shared branch with uncommitted work you care about', 'git stash first (recoverable), or just git log / git status to inspect. One reset --hard wiped an in-progress restructure.'],
  ['You can\'t run the bot here — trace the render path end to end before "fixing" a UI report', 'Search for the literal strings/emoji in the screenshot to find which function produced that exact output; don\'t theorise a fix against the wrong code path.'],
  ['Bump package.json version (PATCH for fix/copy/prompt) and re-read long functions you edited start to finish', 'The handleSearchTurn restructures slipped bugs precisely because the diff looked fine in isolation.'],
];

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Soleat — Vibe Journal</title>
<style>
:root{--bg:#fafafa;--fg:#1a1a1a;--mut:#666;--card:#fff;--bd:#e3e3e3;--accent:#0078e7;--bar:#bcd9f7;--warn:#b54708;--ok:#067647}
*{box-sizing:border-box}
body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;margin:0;color:var(--fg);background:var(--bg)}
.wrap{max-width:1280px;margin:0 auto;padding:1.2em 1em 4em}
h1{font-size:1.5em;margin:.2em 0 .1em}
h2{font-size:1.05em;margin:1.6em 0 .5em;border-top:1px solid var(--bd);padding-top:1em}
.sub{color:var(--mut);margin:.1em 0 1em}
.kpis{display:flex;flex-wrap:wrap;gap:.6em}
.kpi{flex:1;min-width:120px;background:var(--card);border:1px solid var(--bd);border-radius:10px;padding:.6em .8em}
.kpi .n{font-size:1.6em;font-weight:700;line-height:1.1}
.kpi .l{color:var(--mut);font-size:.82em}
details{background:var(--card);border:1px solid var(--bd);border-radius:10px;margin:.6em 0;padding:.2em .8em}
details>summary{cursor:pointer;font-weight:600;padding:.5em 0}
.barlist{display:flex;flex-direction:column;gap:3px;margin:.4em 0 .8em}
.barrow{display:grid;grid-template-columns:170px 1fr 44px;align-items:center;gap:.5em;font-size:.85em}
.barrow .b{height:14px;background:var(--bar);border-radius:3px;min-width:2px}
.barrow .v{text-align:right;font-variant-numeric:tabular-nums;color:var(--mut)}
.barrow .k{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.note{color:var(--mut);font-size:.85em;margin:.3em 0 .6em}
.lessons li{margin:.45em 0}
.lessons b{color:var(--fg)}
.controls{position:sticky;top:0;background:var(--bg);padding:.6em 0;border-bottom:1px solid var(--bd);display:flex;flex-wrap:wrap;gap:.5em;align-items:center;z-index:5}
.controls input[type=search]{flex:1;min-width:220px;padding:.45em .6em;border:1px solid var(--bd);border-radius:8px;font:inherit}
.controls select{padding:.4em;border:1px solid var(--bd);border-radius:8px;font:inherit;max-width:180px}
.controls label{font-size:.85em;color:var(--mut);display:flex;align-items:center;gap:.3em}
.controls button{padding:.4em .7em;border:1px solid var(--bd);border-radius:8px;background:var(--card);font:inherit;cursor:pointer}
.count{color:var(--mut);font-size:.85em;margin:.5em 0}
table{border-collapse:collapse;width:100%;font-size:.83em}
th,td{text-align:left;padding:.4em .5em;border-bottom:1px solid var(--bd);vertical-align:top}
#tbl thead th{position:sticky;top:46px;background:var(--bg);cursor:pointer;white-space:nowrap;user-select:none;z-index:2}
#tbl th.sorted::after{content:" ▾";color:var(--mut)}
#tbl th.sorted.asc::after{content:" ▴"}
.scrollbox{max-height:340px;overflow:auto;border:1px solid var(--bd);border-radius:8px;margin:.4em 0 .8em}
.scrollbox table{font-size:.82em}
.scrollbox thead th{position:sticky;top:0;background:var(--card);box-shadow:inset 0 -1px 0 var(--bd);white-space:nowrap;z-index:1}
table.mini td,table.mini th{padding:.3em .45em}
.miss{color:var(--warn)}
tr.row:hover{background:#f0f6fd}
td.pr{font-variant-numeric:tabular-nums;white-space:nowrap}
.tag{display:inline-block;padding:0 .35em;border-radius:4px;background:#eef2f7;color:#334;font-size:.92em;margin:0 .15em .15em 0;white-space:nowrap}
.tag.cat{background:#e7f0ff;color:#1b4}
.tag.rew{background:#fff1e6;color:var(--warn)}
.tag.tma{background:#eaf7ee;color:var(--ok)}
.detrow td{background:#f7fafe;font-size:.92em;color:#333}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
@media(prefers-color-scheme:dark){
:root{--bg:#161616;--fg:#e6e6e6;--mut:#9a9a9a;--card:#1f1f1f;--bd:#333;--accent:#5ab1ff;--bar:#2c4a66}
tr.row:hover{background:#1d2632}.detrow td{background:#1a1f26}.tag{background:#283039;color:#cdd}.tag.cat{background:#1d2c44;color:#9cf}.tag.rew{background:#3a2a1c;color:#f6b27a}.tag.tma{background:#1f2f24;color:#8fd6a5}#tbl th.sorted::after,.barrow .v,.note,.sub,.kpi .l{color:var(--mut)}
}
@media(max-width:760px){.barrow{grid-template-columns:120px 1fr 38px}#tbl thead th{position:static}.controls{position:static}}
</style>
</head>
<body>
<div class="wrap">
<h1>Soleat — Vibe Journal</h1>
<p class="sub">A queryable record of every pull request (#1–#${HTML_META.maxPr}) in <code>ang-kl/gia</code>, built to learn from each interaction and cut the rework. Auto-generated ${GEN_DATE}. &nbsp;<a href="/doc/vibe-journal.json">raw JSON</a></p>

<div class="kpis" id="kpis"></div>

<h2>Insights — where the loops are</h2>
<details open><summary>Likely rework / "we shipped, then iterated" (heuristic)</summary>
<p class="note">A PR is flagged when it's a <code>fix</code> (or its title carries a follow-up cue: "again", "actually", "restore", "follow-up", "not taking effect", …) <em>and</em> an earlier PR within the previous ${LOOKBACK} PRs touched the same feature area. Heuristic — go read the linked pair to judge. <code>Core/misc</code>, <code>Docs/vault</code>, <code>Infra/setup</code> are excluded.</p>
<div id="rework"></div>
</details>
<details><summary>Churn by feature / UX area</summary><div class="note">More PRs in an area ≈ the design took longer to settle. Click an area in the filter below to see them.</div><div class="barlist" id="churnArea"></div></details>
<details><summary>Churn by code area / module</summary><div class="note">Which files keep coming back. (Only PRs with a squash-commit file list ≈ #78 onward.)</div><div class="barlist" id="churnMod"></div></details>
<details><summary>PRs per release (MAJOR.MINOR)</summary><div class="note">A minor line with many PRs = lots of follow-up patches after the first cut.</div><div class="barlist" id="perMinor"></div></details>
<details><summary>Category mix &amp; same-day clusters</summary><div class="barlist" id="catMix"></div><div class="note" id="clusterNote"></div></details>
<details><summary>📈 PRs over time — by day &amp; by week</summary><div class="note">When the work happened — a tall spike is a high-iteration session.</div><div class="note">By ISO week:</div><div class="barlist" id="perWeek"></div><div class="note">By day (every day with at least one PR):</div><div class="barlist" id="perDay"></div></details>
<details><summary>🪶 Small / low-effort PRs — batching candidates</summary><div class="note" id="smallNote"></div><div class="barlist" id="smallByArea"></div><div class="scrollbox"><table class="mini"><thead><tr><th>PR</th><th>Ver</th><th>Cat</th><th>Area</th><th>Title</th></tr></thead><tbody id="smallList"></tbody></table></div></details>
<details><summary>🔁 Indecision — reverts, re-enables, flip-flops</summary><div class="note" id="indecNote"></div><div class="scrollbox"><table class="mini"><thead><tr><th>PR</th><th>Ver</th><th>Area</th><th>Title</th><th>Signal</th></tr></thead><tbody id="indecList"></tbody></table></div></details>
<details><summary>🧠 Behavioural patterns</summary><div class="kpis" id="behav"></div><div class="note" id="behavNote"></div></details>
<details id="replyPanel" style="display:none"><summary>🗒️ Session reply log — the replies that were never serial-numbered</summary><div class="note" id="replyNote"></div><div class="barlist" id="replyMix"></div><div class="note">Filter the log:</div><div class="controls"><input type="search" id="rq" placeholder="search reply text…"><select id="rEra"><option value="">all</option><option value="pre-compliance">unlogged (before the first numbered reply)</option><option value="post-compliance">after compliance began</option></select><label><input type="checkbox" id="rNum"> numbered only</label></div><div class="count" id="rCount"></div><div class="scrollbox"><table class="mini"><thead><tr><th>#</th><th>When (UTC)</th><th>S-1</th><th>T-1</th><th>Kind</th><th>Reply</th></tr></thead><tbody id="replyList"></tbody></table></div></details>
<details><summary>🧩 Hard parts &amp; recurring failure modes</summary><div class="note">Fix-density per area — the share of an area's PRs that are <code>fix</code>; high = the tricky bits (areas with ≥3 PRs).</div><div class="barlist" id="fixDensity"></div><div class="note">PRs whose title / intent / approach matches a known failure mode (keyword heuristic, from the lessons below):</div><div class="barlist" id="failModes"></div><div class="scrollbox" id="failBox" style="display:none"><table class="mini"><thead><tr><th>Mode</th><th>PR</th><th>Title</th></tr></thead><tbody id="failList"></tbody></table></div></details>

<h2>Lessons to reduce rework <span class="note">(distilled from <code>.claude/skills/gia-preflight/SKILL.md</code>)</span></h2>
<ol class="lessons">
${LESSONS.map(([t, d]) => `<li><b>${htmlEsc(t)}.</b> ${htmlEsc(d)}</li>`).join('\n')}
</ol>

<h2>The ledger — query it</h2>
<div class="controls">
  <input type="search" id="q" placeholder="search PR #, title, intent, approach, module…">
  <select id="fCat"><option value="">all categories</option></select>
  <select id="fArea"><option value="">all areas</option></select>
  <select id="fTma"><option value="">any TMA</option></select>
  <select id="fImpact"><option value="">any impact tag</option></select>
  <select id="fMinor"><option value="">all releases</option></select>
  <label><input type="checkbox" id="fRework"> rework only</label>
  <button id="reset">reset</button>
</div>
<div class="count" id="count"></div>
<table id="tbl"><thead><tr>
<th data-k="pr">PR</th><th data-k="merged">Merged</th><th data-k="version">Ver</th><th data-k="category">Category</th><th data-k="area">Feature / UX area</th><th data-k="intent">Triggering intent (paraphrased)</th><th data-k="approach">AI approach / solution</th><th data-k="codeImpact">Code / module / TMA impact</th><th data-k="tmasStr">TMAs</th><th data-k="impactStr">Data / privacy / legal / test</th>
</tr></thead><tbody id="tb"></tbody></table>
<p class="note">Want to query it elsewhere? <code><a href="/doc/vibe-journal.json">vibe-journal.json</a></code> is one object per PR under <code>.records</code> — load it with DuckDB / pandas / <code>jq</code> / a spreadsheet. The canonical tab-separated copy is <code>doc/VibeCodingRecord/records.tsv</code> in the repo.</p>
</div>

<script>
const META = ${jsonForScript(HTML_META)};
const RECORDS = ${jsonForScript(records)};
const REPLIES = ${jsonForScript(sessionReplies)};
const RSTATS  = ${jsonForScript(replyStats)};
for (const r of RECORDS){ r.tmasStr = (r.tmas||[]).join('+'); r.impactStr = (r.impactTags||[]).join('; '); }
const $ = (s)=>document.querySelector(s);
const esc = (s)=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// ---- Session reply log (S-1 / T-1) ------------------------------------------
// Shown only when a reply log is committed. The panel exists to make an omission
// legible, so it leads with the count of replies that carry NO serial number.
if (REPLIES.length) {
  $('#replyPanel').style.display = '';
  $('#replyNote').innerHTML =
    '<b>' + RSTATS.unlogged + '</b> replies were made before rules S-1 (serial number on every reply) '
  + 'and T-1 (<code>[§X.Y]</code> on every paragraph) were being followed at all — none numbered, none tagged. '
  + 'The boundary is <b>measured, not chosen</b>: it is reply #' + RSTATS.boundaryReply + ', the first one that '
  + 'actually carries a serial number. An earlier version of this artefact used a rounded wall-clock cutoff, '
  + 'which understated the count. '
  + 'Of the replies after it, <b>' + RSTATS.taggedFully + '</b> are fully T-1 compliant (every substantive '
  + 'paragraph, point and bullet tagged) and <b>' + RSTATS.partiallyTagged + '</b> are only partly tagged — '
  + 'shown as <code>partial</code> rather than a tick, because a green tick on a partly-tagged reply is the '
  + 'same overstatement this record exists to avoid. '
  + 'They are <b>not</b> back-filled into <code>doc/Chat/</code>: AU-4 forbids condensation and the protocol '
  + 'forbids invention, so retrospective serials would fabricate a compliance that did not happen. '
  + 'They are recorded here instead, because this folder is a derived, regenerable view and explicitly not '
  + 'one of the eight authenticity templates. Secrets are redacted unconditionally on extract ('
  + RSTATS.redactions + ' redacted in this snapshot). ' + (RSTATS.chars/1024).toFixed(0) + ' KB of reply text.';

  const mix = [
    ['unlogged — no serial, no tags', RSTATS.unlogged],
    ['numbered per S-1', RSTATS.numbered],
    ['inline narration beside a tool call', RSTATS.narration],
    ['fully T-1 tagged', RSTATS.taggedFully],
    ['partly tagged only', RSTATS.partiallyTagged]
  ];
  const mx = Math.max(1, ...mix.map((m) => m[1]));
  $('#replyMix').innerHTML = mix.map(([k, v]) =>
    '<div class="bar"><span>' + esc(k) + '</span><i style="width:' + (v / mx * 100) + '%"></i><b>' + v + '</b></div>').join('');

  const rq = $('#rq'), rEra = $('#rEra'), rNum = $('#rNum');
  function drawReplies() {
    const q = rq.value.trim().toLowerCase();
    const era = rEra.value;
    const rows = REPLIES.filter((r) =>
      (!q || (r.text || '').toLowerCase().includes(q)) &&
      (!era || r.era === era) &&
      (!rNum.checked || r.serialled));
    $('#rCount').textContent = rows.length + ' of ' + REPLIES.length + ' replies';
    $('#replyList').innerHTML = rows.map((r) =>
      '<tr><td>' + r.i + '</td><td>' + esc((r.ts || '').replace('T', ' ').slice(0, 16))
      + '</td><td>' + (r.serialled ? '✓' : '—') + '</td><td>'
      + (r.tagged ? '✓' : (r.units && r.untaggedUnits < r.units ? 'partial (' + (r.units - r.untaggedUnits) + '/' + r.units + ')' : '—'))
      + '</td><td>' + esc(r.kind) + '</td><td><details><summary>'
      + esc((r.text || '').slice(0, 110).replace(/\s+/g, ' ')) + '…</summary><pre>'
      + esc(r.text) + '</pre></details></td></tr>').join('');
  }
  rq.addEventListener('input', drawReplies);
  rEra.addEventListener('change', drawReplies);
  rNum.addEventListener('change', drawReplies);
  drawReplies();
}

// KPIs
$('#kpis').innerHTML = [
 ['PRs total', META.count],
 ['Merged', META.merged],
 ['Closed unmerged', META.unmerged],
 ['Releases (minor lines)', META.minors],
 ['Flagged rework', META.rework],
 ['Follow-up-cue titles', META.cues],
].map(([l,n])=>'<div class="kpi"><div class="n">'+n+'</div><div class="l">'+l+'</div></div>').join('');

// generic bar list
function barList(el, pairs, max){ max = max || Math.max(1,...pairs.map(p=>p[1]));
 el.innerHTML = pairs.map(([k,v])=>'<div class="barrow"><span class="k" title="'+esc(k)+'">'+esc(k)+'</span><span class="b" style="width:'+Math.max(2,Math.round(v/max*100))+'%"></span><span class="v">'+v+'</span></div>').join(''); }
function tallyBy(fn){ const m=new Map(); for(const r of RECORDS){ for(const k of [].concat(fn(r))){ if(k==null||k==='')continue; m.set(k,(m.get(k)||0)+1);} } return [...m.entries()].sort((a,b)=>b[1]-a[1]); }

barList($('#churnArea'), tallyBy(r=>r.area));
barList($('#churnMod'), tallyBy(r=>r.modules||[]).slice(0,30));
const perMinor = tallyBy(r=>r.minor).sort((a,b)=>{const pa=a[0].split('.').map(Number),pb=b[0].split('.').map(Number);return pa[0]-pb[0]||pa[1]-pb[1];});
barList($('#perMinor'), perMinor, Math.max(1,...perMinor.map(p=>p[1])));
barList($('#catMix'), tallyBy(r=>r.category));

// rework list
const rew = RECORDS.filter(r=>r.reworkOf).sort((a,b)=>a.pr-b.pr);
$('#rework').innerHTML = '<div class="note">'+rew.length+' PR'+(rew.length===1?'':'s')+' flagged.</div>' + '<div class="scrollbox"><table class="mini"><thead><tr><th>PR</th><th>Area</th><th>Looks like a follow-up of</th><th>Title</th></tr></thead><tbody>'+
 rew.map(r=>'<tr><td class="pr">#'+r.pr+'</td><td>'+esc(r.area)+'</td><td class="pr">#'+r.reworkOf+'</td><td>'+esc(r.title)+'</td></tr>').join('')+'</tbody></table></div>';

// same-day clusters
const byDay = new Map(); for(const r of RECORDS){ if(!r.day)continue; (byDay.get(r.day)||byDay.set(r.day,[]).get(r.day)).push(r.pr); }
const heavy = [...byDay.entries()].filter(([d,ps])=>ps.length>=4).sort((a,b)=>b[1].length-a[1].length);
$('#clusterNote').innerHTML = heavy.length ? ('Days with ≥4 PRs (iterating fast / in production): '+heavy.slice(0,12).map(([d,ps])=>d+' ('+ps.length+')').join(', ')+(heavy.length>12?', …':'')+'.') : 'No day had ≥4 PRs.';

// ── extra instruments ─────────────────────────────────────────────────────
const fmtPct = (n)=>Math.round(n*100)+'%';
function weekKey(day){ if(!day)return ''; const d=new Date(day+'T00:00:00Z'); const dow=(d.getUTCDay()+6)%7; d.setUTCDate(d.getUTCDate()-dow); return d.toISOString().slice(0,10); }
function chronoTally(fn){ const m=new Map(); for(const r of RECORDS){ const k=fn(r); if(!k)continue; m.set(k,(m.get(k)||0)+1);} return [...m.entries()].sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:0); }
const perDayT = chronoTally(r=>r.day);
const perWeekT = chronoTally(r=>weekKey(r.day));
barList($('#perWeek'), perWeekT.map(([k,v])=>['wk of '+k, v]), Math.max(1,...perWeekT.map(p=>p[1])));
barList($('#perDay'), perDayT.map(([k,v])=>[k, v]), Math.max(1,...perDayT.map(p=>p[1])));

// small / low-effort PRs
const SMALL_CATS = new Set(['copy','prompt-tune','test']);
function isSmall(r){ return (r.nFiles!=null && r.nFiles<=2) || SMALL_CATS.has(r.category); }
const smalls = RECORDS.filter(isSmall);
$('#smallNote').innerHTML = smalls.length+' of '+RECORDS.length+' PRs ('+fmtPct(smalls.length/RECORDS.length)+') were small — ≤2 files changed, or category copy / prompt-tune / test. Each is a candidate that might have been folded into a sibling PR.';
barList($('#smallByArea'), (()=>{const m=new Map();for(const r of smalls){m.set(r.area,(m.get(r.area)||0)+1);}return [...m.entries()].sort((a,b)=>b[1]-a[1]);})());
$('#smallList').innerHTML = smalls.map(r=>'<tr><td class="pr"><a href="https://github.com/ang-kl/gia/pull/'+r.pr+'" target="_blank" rel="noopener">#'+r.pr+'</a></td><td class="pr">'+esc(r.version||'')+'</td><td>'+esc(r.category)+'</td><td>'+esc(r.area)+'</td><td>'+esc(r.title)+(r.nFiles!=null?' <span class="note">('+r.nFiles+'f)</span>':'')+'</td></tr>').join('');

// indecision — revert / re-enable / "actually" cues in the title or intent
const INDEC = [['revert',/\brevert(s|ed|ing)?\b/i],['rollback',/\broll[\s-]?back\b/i],['undo',/\bundo\b/i],['re-enable',/\bre[\s-]?(enable|activat)|turn (it )?back on\b/i],['re-add / restore',/\bre[\s-]?add|readd|restore[ds]?\b/i],['"actually"',/\bactually\b/i],['"not taking effect"',/not taking effect|did(n'?t| not) take|no effect\b/i],['"again"',/\bagain\b/i],['take 2 / round 2',/\btake (2|two)\b|\bround (2|two)\b|2nd attempt|second attempt/i],['"finally" / "for real"',/\bfinally\b|for real\b|\btruly\b/i]];
function indecSignal(r){ const t=(r.title+' '+r.intent).toLowerCase(); for(const [label,re] of INDEC){ if(re.test(t))return label; } return null; }
const indecs = RECORDS.map(r=>({r, sig:indecSignal(r)})).filter(x=>x.sig).sort((a,b)=>a.r.pr-b.r.pr);
$('#indecNote').innerHTML = indecs.length+' PR'+(indecs.length===1?'':'s')+' carry a revert / re-enable / "actually" / "not taking effect" / "again" cue — each is a decision that did not stick the first time. Watch for ping-pong within one MAJOR.MINOR line.';
$('#indecList').innerHTML = indecs.map(({r,sig})=>'<tr><td class="pr"><a href="https://github.com/ang-kl/gia/pull/'+r.pr+'" target="_blank" rel="noopener">#'+r.pr+'</a></td><td class="pr">'+esc(r.version||'')+'</td><td>'+esc(r.area)+'</td><td>'+esc(r.title)+'</td><td><span class="tag rew">'+esc(sig)+'</span></td></tr>').join('');

// behavioural patterns
(function(){
 const activeDays = perDayT.length, total = RECORDS.length;
 const maxDay = perDayT.reduce((a,b)=>b[1]>a[1]?b:a, ['',0]);
 const fixN = RECORDS.filter(r=>r.category==='fix').length, featN = RECORDS.filter(r=>r.category==='feature').length;
 const eligibleRework = RECORDS.filter(r=>!['Core / misc','Docs / vault','Infra / setup'].includes(r.area)).length;
 let bestRun=0,bestArea='',cur=0,curArea=null;
 for(const r of RECORDS){ if(r.area===curArea)cur++; else{curArea=r.area;cur=1;} if(cur>bestRun){bestRun=cur;bestArea=curArea;} }
 const fc=RECORDS.map(r=>r.nFiles).filter(n=>n!=null).sort((a,b)=>a-b);
 const medFiles = fc.length ? (fc.length%2 ? fc[(fc.length-1)/2] : Math.round((fc[fc.length/2-1]+fc[fc.length/2])/2)) : '—';
 const modT = tallyBy(r=>r.modules||[]); const topMod = modT.length ? modT[0] : ['—',0];
 const kpis = [
  ['PRs / active day', activeDays?(total/activeDays).toFixed(1):'—', activeDays+' active days'],
  ['Busiest day', maxDay[1]+' PRs', maxDay[0]],
  ['fix : feature', featN?(fixN/featN).toFixed(2)+' : 1':'—', fixN+' fix · '+featN+' feature'],
  ['Rework rate', eligibleRework?fmtPct(META.rework/eligibleRework):'—', META.rework+' / '+eligibleRework+' eligible'],
  ['Longest same-area streak', bestRun+' PRs', bestArea],
  ['Median files / PR', String(medFiles), fc.length+' PRs w/ a file list'],
  ['Most-edited code area', topMod[1]+'×', topMod[0]],
  ['Small-PR share', fmtPct(smalls.length/total)],
 ];
 $('#behav').innerHTML = kpis.map(([l,n,h])=>'<div class="kpi"><div class="n">'+esc(String(n))+'</div><div class="l">'+esc(l)+(h?' · '+esc(h):'')+'</div></div>').join('');
 $('#behavNote').innerHTML = 'Read together: a high fix:feature ratio + a high rework rate + long same-area streaks ⇒ scoping &amp; verification (the gia-preflight gates) are where the leverage is. Lots of small PRs ⇒ consider batching sibling tweaks into one PR.';
})();

// hard parts: fix-density by area + recurring failure modes
(function(){
 const byArea=new Map();
 for(const r of RECORDS){ const a=byArea.get(r.area)||{t:0,f:0}; a.t++; if(r.category==='fix')a.f++; byArea.set(r.area,a); }
 const dens=[...byArea.entries()].filter(([a,o])=>o.t>=3).map(([a,o])=>[a+' ('+o.f+'/'+o.t+')', Math.round(o.f/o.t*100)]).sort((x,y)=>y[1]-x[1]);
 barList($('#fixDensity'), dens, 100);
 const MODES=[
  ['silent handler / thin cards', /\bsilent\b|thin card|went silent|stopped (responding|working)|no(t| longer) respond|doesn'?t respond/i],
  ['missing module export', /is not a function|not exported|missing export|undefined export/i],
  ['HTML escaping / parse_mode', /html[\s-]?escap|unescaped|parse_mode|html entit/i],
  ['fuzzy matcher over-match', /over[\s-]?match|hijack|common[\s-]?(word|dish)|blocklist|matched too/i],
  ['resolver ordering', /resolver order|runs? first|pre[\s-]?empt|disambig.* order|short[\s-]?circuit order/i],
  ['cache / stale bundle', /stale bundle|no[\s-]?cache|cache[\s-]?control|redeploy(ed)? but|pin(ned)? .*stale/i],
  ['regression after a refactor / merge', /regress|broke after|re[\s-]?broke|after the .* (merge|refactor)/i],
 ];
 const counts=new Map(), hits=[];
 for(const r of RECORDS){ const t=(r.title+' '+r.intent+' '+r.approach).toLowerCase(); for(const [label,re] of MODES){ if(re.test(t)){ counts.set(label,(counts.get(label)||0)+1); hits.push([label,r]); } } }
 const fm=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
 if(fm.length){ barList($('#failModes'), fm, Math.max(1,...fm.map(p=>p[1]))); $('#failBox').style.display=''; $('#failList').innerHTML = hits.sort((a,b)=>a[0]<b[0]?-1:a[0]>b[0]?1:a[1].pr-b[1].pr).map(([label,r])=>'<tr><td><span class="tag rew">'+esc(label)+'</span></td><td class="pr"><a href="https://github.com/ang-kl/gia/pull/'+r.pr+'" target="_blank" rel="noopener">#'+r.pr+'</a></td><td>'+esc(r.title)+'</td></tr>').join(''); }
 else { $('#failModes').innerHTML='<div class="note">No PR title/intent/approach matched the failure-mode keywords (those signals live mostly in PR bodies / the journal, which this view does not index).</div>'; }
})();

// filters
function uniq(fn){ const s=new Set(); for(const r of RECORDS){ for(const v of [].concat(fn(r))){ if(v!=null&&v!=='')s.add(v);} } return [...s].sort(); }
function fill(sel, vals){ for(const v of vals){ const o=document.createElement('option'); o.value=v;o.textContent=v; $(sel).appendChild(o);} }
fill('#fCat', tallyBy(r=>r.category).map(p=>p[0]));
fill('#fArea', tallyBy(r=>r.area).map(p=>p[0]));
fill('#fTma', uniq(r=>r.tmas||[]));
fill('#fImpact', uniq(r=>r.impactTags||[]));
fill('#fMinor', perMinor.map(p=>p[0]));

let sortK='pr', sortAsc=true;
const COLS=['pr','merged','version','category','area','intent','approach','codeImpact','tmasStr','impactStr'];
function tagHtml(r){ const t=[]; t.push('<span class="tag cat">'+esc(r.category)+'</span>'); if(r.reworkOf) t.push('<span class="tag rew" title="follow-up of #'+r.reworkOf+'">↻ #'+r.reworkOf+'</span>'); return t.join(''); }
function render(){
 const q=$('#q').value.trim().toLowerCase(), fc=$('#fCat').value, fa=$('#fArea').value, ft=$('#fTma').value, fi=$('#fImpact').value, fm=$('#fMinor').value, fr=$('#fRework').checked;
 let rows = RECORDS.filter(r=>{
  if(fc&&r.category!==fc)return false; if(fa&&r.area!==fa)return false;
  if(ft&&!(r.tmas||[]).includes(ft))return false; if(fi&&!(r.impactTags||[]).includes(fi))return false;
  if(fm&&r.minor!==fm)return false; if(fr&&!r.reworkOf)return false;
  if(q){ const hay=(r.pr+' '+r.title+' '+r.intent+' '+r.approach+' '+r.codeImpact+' '+(r.modules||[]).join(' ')+' '+r.area+' '+r.category).toLowerCase(); if(!hay.includes(q))return false; }
  return true;
 });
 rows.sort((a,b)=>{ let x=a[sortK],y=b[sortK]; if(sortK==='pr'){x=+x;y=+y;} if(x<y)return sortAsc?-1:1; if(x>y)return sortAsc?1:-1; return a.pr-b.pr; });
 $('#count').textContent = rows.length+' of '+RECORDS.length+' PRs';
 const tb=$('#tb'); tb.innerHTML='';
 for(const r of rows){
  const tr=document.createElement('tr'); tr.className='row';
  tr.innerHTML='<td class="pr"><a href="https://github.com/ang-kl/gia/pull/'+r.pr+'" target="_blank" rel="noopener">#'+r.pr+'</a></td>'
   +'<td>'+esc(r.merged||'')+(r.status!=='merged'?' <span class="tag">'+esc(r.status)+'</span>':'')+'</td>'
   +'<td class="pr">'+esc(r.version||'')+'</td>'
   +'<td>'+tagHtml(r)+'</td>'
   +'<td>'+esc(r.area)+'</td>'
   +'<td>'+esc(r.intent)+'</td>'
   +'<td>'+esc(r.approach)+'</td>'
   +'<td>'+esc(r.codeImpact)+'</td>'
   +'<td>'+(r.tmas||[]).map(t=>'<span class="tag tma">'+esc(t)+'</span>').join('')+'</td>'
   +'<td>'+(r.impactTags||[]).map(t=>'<span class="tag">'+esc(t)+'</span>').join('')+'</td>';
  tr.onclick=()=>{ const nx=tr.nextElementSibling; if(nx&&nx.classList.contains('detrow')){nx.remove();return;}
   const d=document.createElement('tr'); d.className='detrow';
   d.innerHTML='<td colspan="10"><b>#'+r.pr+'</b> — '+esc(r.title)+'<br><b>Modules:</b> '+esc((r.modules||[]).join(', ')||'(pre-squash — not tracked)')+(r.nFiles!=null?' &nbsp;('+r.nFiles+' file'+(r.nFiles===1?'':'s')+')':'')+(r.burst?' &nbsp;<span class="tag rew">part of a burst in '+esc(r.area)+'</span>':'')+'</td>';
   tr.after(d); };
  tb.appendChild(tr);
 }
}
document.querySelectorAll('#tbl th').forEach(th=>th.onclick=()=>{ const k=th.dataset.k; if(sortK===k)sortAsc=!sortAsc; else{sortK=k;sortAsc=true;}
 document.querySelectorAll('#tbl th').forEach(x=>x.classList.remove('sorted','asc')); th.classList.add('sorted'); if(sortAsc)th.classList.add('asc'); render(); });
['q','fCat','fArea','fTma','fImpact','fMinor'].forEach(id=>$('#'+id).addEventListener('input',render));
$('#fRework').addEventListener('change',render);
$('#reset').onclick=()=>{ $('#q').value=''; ['fCat','fArea','fTma','fImpact','fMinor'].forEach(id=>$('#'+id).value=''); $('#fRework').checked=false; sortK='pr';sortAsc=true; document.querySelectorAll('#tbl th').forEach(x=>x.classList.remove('sorted','asc')); render(); };
render();
</script>
</body>
</html>
`;
writeFileSync(join(PUBLIC_DOC, 'vibe-journal.html'), html);

console.log(`Vibe-Coding Record: wrote records.tsv (${rows.length} rows), vibe-coding-record.md, public/doc/vibe-journal.html, public/doc/vibe-journal.json`);
console.log('Categories:', catTally.map(([k, v]) => `${k}=${v}`).join('  '), `| rework-flagged=${reworkCount}`);
