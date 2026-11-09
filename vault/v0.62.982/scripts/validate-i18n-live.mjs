#!/usr/bin/env node
/**
 * validate-i18n-live.mjs — run the structural checks against what i18n.js
 * ACTUALLY SHIPS, not against the translation job files.
 *
 * validate-i18n-translations.mjs reads scripts/i18n-audit-jobs/, which is the
 * translator's output *before* anything was pruned, repaired or hand-corrected.
 * That made it blind to the file the bot loads: a gate pointed at the input of a
 * pipeline cannot see what came out the other end. This walks i18n.js itself and
 * compares every non-English variant against its own `en` source.
 *
 * Usage: node scripts/validate-i18n-live.mjs [--lang de] [--failures]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateItem } from './validate-i18n-translations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');

const args = process.argv.slice(2);
const ONLY = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const SHOW = args.includes('--failures');
const LANGS = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

const KEY_RE = /^ {2}'([\w.]+)':\s*\{/gm;
const items = [];
let m;
while ((m = KEY_RE.exec(src))) {
  const open = src.indexOf('{', m.index);
  let depth = 0, end = -1, inStr = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i], prev = src[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === "'" || ch === '"') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (!depth) { end = i; break; } }
  }
  if (end < 0) continue;
  const body = src.slice(open + 1, end);
  // Two entries — `privacy.body` and `legal.body` — are not quoted strings but
  // `[ 'line', … ].join('\n')`. Matching only quoted literals silently excluded the
  // two longest and most sensitive strings in the file from every structural check,
  // and made a companion script report them as having no French when they always had.
  const pick = (l) => {
    const str = body.match(new RegExp(`\\b${l}:\\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")`));
    if (str) { try { return (0, eval)(str[1]); } catch { return null; } }
    const at = body.search(new RegExp(`\\b${l}:\\s*\\[`));
    if (at < 0) return null;
    const open = body.indexOf('[', at);
    let depth = 0, end = -1, inStr = null;
    for (let i = open; i < body.length; i++) {
      const ch = body[i], prev = body[i - 1];
      if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
      if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
      if (ch === '[') depth++;
      else if (ch === ']') { depth--; if (!depth) { end = i; break; } }
    }
    if (end < 0) return null;
    const join = body.slice(end + 1).match(/^\s*\.join\(\s*('(?:[^'\\\\]|\\\\.)*'|"(?:[^"\\\\]|\\\\.)*")\s*\)/);
    try {
      const arr = (0, eval)(body.slice(open, end + 1));
      return join ? arr.join((0, eval)(join[1])) : arr.join('');
    } catch { return null; }
  };
  const en = pick('en');
  if (en === null) continue;
  for (const lang of LANGS) {
    if (ONLY && lang !== ONLY) continue;
    const t = pick(lang);
    if (t === null) continue;
    items.push({ key: m[1], lang, en, t });
  }
}

const failures = [];
const byLang = {};
for (const it of items) {
  const reasons = validateItem(it.en, it.t);
  (byLang[it.lang] ||= { safe: 0, fail: 0 });
  if (reasons.length) { byLang[it.lang].fail++; failures.push({ ...it, reasons }); }
  else byLang[it.lang].safe++;
}

console.log(`${items.length} shipped variants · ${items.length - failures.length} structurally safe · ${failures.length} failing`);
console.log('\nby language:');
for (const l of Object.keys(byLang).sort()) {
  console.log(`  ${l.padEnd(4)} safe ${String(byLang[l].safe).padStart(4)} · failing ${String(byLang[l].fail).padStart(3)}`);
}
const reasonCount = {};
for (const f of failures) for (const r of f.reasons) reasonCount[r] = (reasonCount[r] || 0) + 1;
if (failures.length) {
  console.log('\nfailure reasons:');
  for (const [r, n] of Object.entries(reasonCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${r.padEnd(14)} ${n}`);
  }
}
if (SHOW) {
  console.log('');
  for (const f of failures) {
    console.log(`--- ${f.lang} ${f.key}  [${f.reasons.join(', ')}]`);
    console.log(`    en: ${JSON.stringify(f.en)}`);
    console.log(`    ${f.lang}: ${JSON.stringify(f.t)}`);
  }
}
process.exitCode = 0;
