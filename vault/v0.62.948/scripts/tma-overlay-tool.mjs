#!/usr/bin/env node
/**
 * tma-overlay-tool.mjs — add keys to a Mini App's per-language overlay maps.
 *
 * Three of the Mini Apps (cuisine, menu, transport) do NOT put every language
 * inline in the entry literal. They keep a flat `const XX_STRINGS = { key: '…' }`
 * per language and merge it at module load:
 *
 *     for (const k in ID_STRINGS) if (STRINGS[k] && STRINGS[k].id == null) …
 *
 * A regex that only looks for `id:` inside the entry literal therefore reports a
 * fully translated app as having zero coverage — which is exactly the mistake that
 * produced the first version of this arc's scope estimate. Measure by EVALUATING
 * the module, and write through the same overlay the file already uses rather than
 * mixing a second idiom into it.
 *
 *   node scripts/tma-overlay-tool.mjs <file> <patch.json> [--dry-run]
 *
 * patch.json: { "<key>": { "id": "…", "ru": "…" }, … }
 */
import fs from 'node:fs';

const [file, patchPath, ...flags] = process.argv.slice(2);
if (!file || !patchPath) {
  console.error('usage: tma-overlay-tool.mjs <file> <patch.json> [--dry-run]');
  process.exit(2);
}
const DRY = flags.includes('--dry-run');
const patch = JSON.parse(fs.readFileSync(patchPath, 'utf8'));
const q = (s) => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";

let src = fs.readFileSync(file, 'utf8');
const added = [];
const problems = [];

// Group the patch by language so each overlay map is touched once.
const byLang = {};
for (const [key, vals] of Object.entries(patch)) {
  for (const [lang, text] of Object.entries(vals)) (byLang[lang] ||= {})[key] = text;
}

for (const [lang, entries] of Object.entries(byLang)) {
  const NAME = `${lang.toUpperCase()}_STRINGS`;
  const start = src.indexOf(`const ${NAME} = {`);
  if (start < 0) { problems.push(`no ${NAME} in ${file}`); continue; }
  const open = src.indexOf('{', start);
  let depth = 0, end = -1, inStr = null;
  for (let i = open; i < src.length; i++) {
    const ch = src[i], prev = src[i - 1];
    if (inStr) { if (ch === inStr && prev !== '\\') inStr = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (!depth) { end = i; break; } }
  }
  if (end < 0) { problems.push(`unbalanced ${NAME}`); continue; }

  const body = src.slice(open + 1, end);
  const lines = [];
  for (const [key, text] of Object.entries(entries)) {
    if (new RegExp(`(^|[\\s{,])'${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}'\\s*:`).test(body)) {
      problems.push(`${NAME} already defines '${key}'`);
      continue;
    }
    lines.push(`  '${key}': ${q(text)},`);
    added.push(`${lang} ${key}`);
  }
  if (!lines.length) continue;
  const trimmed = body.replace(/\s*$/, '');
  const sep = /,$/.test(trimmed) ? '' : ',';
  src = src.slice(0, open + 1) + trimmed + sep + '\n' + lines.join('\n') + '\n' + src.slice(end);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} problem(s). Nothing written.`);
  process.exit(2);
}
console.log(`${added.length} overlay entries added to ${file}`);
if (flags.includes('--verbose')) console.log(added.join('\n'));
if (!DRY) { fs.writeFileSync(file, src); console.log('written'); }
