#!/usr/bin/env node
/**
 * tma-i18n-tool.mjs — dump and fill the Mini App locale tables.
 *
 * The five Mini Apps each keep their own `STRINGS` map with the same shape as the
 * bot's i18n.js — `'key': { en: '…', fr: '…' }` — but three of them (menu, hawker,
 * transport) shipped with EN and FR only, while their `SUPPORTED_LOCALES` offers
 * all eight. `t()` falls back `entry[lang] ?? entry.en`, so a user who picks
 * Japanese gets a working app rendered entirely in English. This fills the gap.
 *
 *   node scripts/tma-i18n-tool.mjs dump  <file> [from] [to]
 *   node scripts/tma-i18n-tool.mjs apply <file> <patch.json> [--dry-run]
 *
 * `apply` rewrites each entry's object literal WHOLE rather than splicing a regex
 * into it. Two earlier attempts at surgical insertion in i18n.js produced a file
 * that would not parse — one orphaned a leading comma, one ate the separator the
 * next entry needed. Rebuilding the literal has no comma bookkeeping to get wrong.
 */
import fs from 'node:fs';

const LANGS = ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const [cmd, file, ...rest] = process.argv.slice(2);
if (!cmd || !file) {
  console.error('usage: tma-i18n-tool.mjs dump|apply <file> [...]');
  process.exit(2);
}

const q = (s) =>
  "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";

const unq = (lit) => {
  if (lit[0] === '`') return lit.slice(1, -1);
  return JSON.parse(
    lit[0] === '"' ? lit : '"' + lit.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'
  );
};

/** Walk the source and return every `'key': { … }` entry that carries an `en:` string. */
function parse(src) {
  const KEY = /^(\s+)'([\w.$-]+)':(\s*)\{/gm;
  const out = [];
  let m;
  while ((m = KEY.exec(src))) {
    const open = src.indexOf('{', m.index + m[1].length + m[2].length);
    let depth = 0, end = -1, inStr = null;
    for (let i = open; i < src.length; i++) {
      const ch = src[i], prev = src[i - 1];
      if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
      if (ch === '{') depth++;
      else if (ch === '}') { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) continue;
    const body = src.slice(open + 1, end);
    const pick = (l) => {
      const g = body.match(new RegExp(`\\b${l}:\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*"|\`[^\`]*\`)`));
      if (!g) return null;
      try { return unq(g[1]); } catch { return null; }
    };
    const vals = {};
    for (const l of ['en', 'fr', ...LANGS]) {
      const v = pick(l);
      if (v !== null) vals[l] = v;
    }
    if (vals.en === undefined) continue;
    out.push({ key: m[2], indent: m[1], open, end, body, vals });
  }
  return out;
}

const src = fs.readFileSync(file, 'utf8');
const entries = parse(src);

if (cmd === 'dump') {
  const from = Number(rest[0] || 0), to = Number(rest[1] || 1e9);
  let n = 0;
  const lines = [];
  for (const e of entries) {
    n++;
    if (n <= from || n > to) continue;
    const miss = LANGS.filter((l) => e.vals[l] === undefined);
    if (!miss.length) continue;
    lines.push(`${n}|${e.key}  [missing: ${miss.join(',')}]\nEN: ${e.vals.en.replace(/\n/g, '⏎')}` +
      (e.vals.fr !== undefined ? `\nFR: ${e.vals.fr.replace(/\n/g, '⏎')}` : ''));
  }
  console.log(lines.join('\n\n'));
  console.error(`${file}: ${entries.length} entries, ${entries.filter((e) => LANGS.some((l) => e.vals[l] === undefined)).length} with gaps`);
  process.exit(0);
}

if (cmd !== 'apply') { console.error('unknown command'); process.exit(2); }

const patch = JSON.parse(fs.readFileSync(rest[0], 'utf8'));
const DRY = rest.includes('--dry-run');
const byKey = new Map(entries.map((e) => [e.key, e]));

const problems = [];
for (const key of Object.keys(patch)) if (!byKey.has(key)) problems.push(`UNKNOWN KEY ${key}`);
if (problems.length) { console.error(problems.join('\n')); process.exit(2); }

// Rewrite back-to-front so earlier offsets stay valid.
const targets = entries.filter((e) => patch[e.key]).sort((a, b) => b.open - a.open);
let out = src;
let filled = 0;
for (const e of targets) {
  const add = patch[e.key];
  const pad = e.indent + '  ';
  const keep = { ...e.vals, ...add };
  const parts = [];
  for (const l of ['en', 'fr', ...LANGS]) {
    if (keep[l] === undefined) continue;
    parts.push(`${pad}${l}: ${q(keep[l])}`);
  }
  const literal = '{\n' + parts.join(',\n') + `\n${e.indent}}`;
  out = out.slice(0, e.open) + literal + out.slice(e.end + 1);
  filled++;
}

console.log(`${filled} entries rewritten in ${file}`);
if (!DRY) { fs.writeFileSync(file, out); console.log('written'); }
