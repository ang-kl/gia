#!/usr/bin/env node
/**
 * validate-i18n-tma.mjs — coverage + structural gate for the five Mini App locale
 * tables, measured the only way that is actually true: by EVALUATING each module.
 *
 * WHY EVALUATION AND NOT A REGEX. Three of the apps (cuisine, menu, transport) do
 * not keep every language inline in the entry literal. They keep a flat overlay per
 * language and merge it at load:
 *
 *     const ID_STRINGS = { 'hero.subtagline': '…' };
 *     for (const k in ID_STRINGS) if (STRINGS[k] && STRINGS[k].id == null) …
 *
 * A regex looking for `id:` inside the entry object therefore reports a fully
 * translated app as 0% covered. That is not a hypothetical: it is exactly how this
 * arc's first scope estimate came to claim 527–554 missing strings per language
 * when the real figure was 11–37. Parsing the shape you expect, rather than running
 * the code that decides it, is the failure this file exists to prevent.
 *
 * A value that is present but EMPTY counts as translated: `card.distAway` is
 * deliberately `fr: ''` because French renders the distance with no suffix. Treating
 * empty as missing produced a second false gap — and a "fix" for it duplicated the
 * key.
 *
 * Usage: node scripts/validate-i18n-tma.mjs [--failures]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateItem } from './validate-i18n-translations.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LANGS = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

export const TMA_FILES = [
  ['cuisine',   'web/cuisine/src/v2/lib/i18n.js'],
  ['menu',      'web/menu/src/i18n.js'],
  ['hawker',    'web/hawker/src/i18n.js'],
  ['transport', 'web/transport/src/i18n.js'],
  ['clipboard', 'web/clipboard/src/lib/i18n.js'],
];

/**
 * Brand and product names the English value already carries correctly. French leaves
 * them untranslated too, so `t()`'s per-key fallback to `en` is the right answer and
 * a missing variant is not a gap.
 */
export const BRAND_ONLY = new Set(['tile.sketchbook.label', 'footer.brand']);

/** Evaluate a Mini App's locale module and return its merged STRINGS map. */
export async function loadStrings(absFile) {
  const src = fs.readFileSync(absFile, 'utf8');
  // Keep the data and the merge loops; drop the React imports and the exported API.
  const cut = src.search(/^export /m);
  const body = (cut > 0 ? src.slice(0, cut) : src).replace(/^\s*import[^\n]*\n/gm, '');
  if (!/const STRINGS\b/.test(body)) throw new Error(`no STRINGS map in ${absFile}`);
  const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tma-i18n-')), 'probe.mjs');
  fs.writeFileSync(tmp, body + '\nexport default STRINGS;\n');
  try {
    return (await import('file://' + tmp)).default;
  } finally {
    fs.rmSync(path.dirname(tmp), { recursive: true, force: true });
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const SHOW = process.argv.includes('--failures');
  const pad = (s, n) => String(s).padEnd(n);
  let totalKeys = 0, totalFail = 0;
  const missing = [];
  const failures = [];
  console.log(pad('app', 12) + pad('keys', 6) + LANGS.map((l) => pad(l, 9)).join(''));
  for (const [name, rel] of TMA_FILES) {
    const S = await loadStrings(path.join(ROOT, rel));
    const keys = Object.keys(S).filter((k) => S[k] && typeof S[k].en === 'string');
    totalKeys += keys.length;
    const have = Object.fromEntries(LANGS.map((l) => [l, 0]));
    for (const k of keys) {
      for (const l of LANGS) {
        if (typeof S[k][l] !== 'string') {
          if (!BRAND_ONLY.has(k)) missing.push(`${name} ${k} — no ${l}`);
          continue;
        }
        have[l]++;
        // Present but empty is a deliberate choice, not a gap: `card.distAway` is
        // `fr: ''` because French renders the distance with no trailing suffix.
        if (S[k][l] === '') continue;
        const reasons = validateItem(S[k].en, S[k][l]);
        if (reasons.length) { totalFail++; failures.push(`${name} ${l} ${k}: ${reasons.join(', ')}`); }
      }
    }
    console.log(pad(name, 12) + pad(keys.length, 6) + LANGS.map((l) => pad(`${have[l]}/${keys.length}`, 9)).join(''));
  }
  console.log(`\n${totalKeys} keys · ${missing.length} genuine gaps · ${totalFail} structural failures`);
  if (SHOW) { for (const m of missing) console.log('  GAP  ' + m); for (const f of failures) console.log('  FAIL ' + f); }
  process.exitCode = missing.length || totalFail ? 1 : 0;
}
