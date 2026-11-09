#!/usr/bin/env node
/**
 * normalize-i18n-translations.mjs — mechanical repair of the machine-translated
 * language maps in i18n.js (id, ru, de, zh, ja, es only; en/fr are hand-written
 * and are never touched).
 *
 * Three operations, in order:
 *
 *   1. PRUNE — drop the six languages' variants of key families whose English
 *      value is *already* in the reader's target language by design
 *      (`bot.lang.set.*` confirms in the language you just switched to;
 *      `language.btn.*` lists endonyms). Translating those defeats their
 *      purpose, so the per-key `entry.en` fallback in t() is the correct value.
 *
 *   2. ADJACENCY — the slot-substitution translator padded every placeholder
 *      and tag with spaces (`* {n} *`, `<i> {street} </i>`, `/buddy block<id> `).
 *      Copy the English source's spacing around each shared token back onto the
 *      translation.
 *
 *   3. WHITESPACE — restore the English leading/trailing whitespace (several
 *      keys are fragments concatenated onto a preceding run) and remove the
 *      space the translator inserted before sentence punctuation.
 *
 * Nothing here invents wording: every edit is derived from the English source
 * string for the same key. Semantic corrections live in fix-i18n-meaning.mjs.
 *
 * Usage: node scripts/normalize-i18n-translations.mjs [--dry-run]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILE = path.join(ROOT, 'i18n.js');
const LANGS = ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
const DRY = process.argv.includes('--dry-run');

/** Key families whose English value is already the reader-facing target text. */
const PRUNE_PREFIXES = ['bot.lang.set.', 'language.btn.'];

/** Tokens whose spacing must mirror the English source. */
const TOKEN_RE = /\{[\w-]+\}|<[^<>]{1,24}>/g;

function serialize(s) {
  return "'" + s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r') + "'";
}

function deserialize(literal) {
  // literal is a quoted JS string as it appears in i18n.js
  return JSON.parse(
    literal[0] === '"'
      ? literal
      : '"' + literal.slice(1, -1).replace(/\\'/g, "'").replace(/"/g, '\\"') + '"'
  );
}

/**
 * Copy the English source's spacing around every token shared with `en`.
 *
 * Both directions are *context-gated*: a space is only collapsed when the target's
 * neighbouring non-space character is the same one the English source has flush
 * against the token. Without that gate the rule fired on every occurrence and
 * mangled languages that reorder — English `Blocked {target}.` turned Indonesian
 * `{target} diblokir` into `{target}diblokir`.
 */
function fixAdjacency(en, t, lang) {
  // Chinese and Japanese set no space between running text and an inline token,
  // so a space is only *inserted* next to ASCII neighbours (command syntax such
  // as `/buddy block <chat_id>`), never between a token and a CJK character.
  const cjk = lang === 'zh' || lang === 'ja';
  const asciiish = (c) => /[A-Za-z0-9`<>/_-]/.test(c || '');
  // Only command-syntax placeholders (`<chat_id>`, `<reason>`) take an inserted
  // space in CJK; real HTML tags and `{}` placeholders sit flush against the text.
  const HTML_TAG = /^<\/?(?:b|i|u|s|em|strong|del|ins|code|pre|a|tg-spoiler|blockquote)(?:\s[^<>]*)?>$/i;
  const cjkInsertable = (tok) => tok[0] === '<' && !HTML_TAG.test(tok);
  let out = t;
  const seen = new Set();
  for (const m of t.matchAll(TOKEN_RE)) {
    const tok = m[0];
    if (seen.has(tok)) continue;
    seen.add(tok);
    const ei = en.indexOf(tok);
    if (ei < 0) continue;
    const enBefore = ei === 0 ? '' : en[ei - 1];
    const enAfter = en[ei + tok.length] ?? '';
    const esc = (x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const T = esc(tok);
    // CJK translations swap ASCII brackets/colons for their full-width forms;
    // treat the pair as the same neighbour so the padding is still collapsed.
    const WIDE = { '(': '（', ')': '）', ':': '：', ',': '，', ';': '；', '.': '。', '[': '［', ']': '］' };
    const alt = (c) => (WIDE[c] ? `[${esc(c)}${WIDE[c]}]` : esc(c));

    if (enBefore && enBefore !== ' ' && enBefore !== '\n') {
      out = out.replace(new RegExp(`(${alt(enBefore)})[ \t]+${T}`, 'g'), `$1${tok}`);
    } else if (enBefore === ' ' && (!cjk || cjkInsertable(tok))) {
      // Gate insertion the same way as collapsing: only restore the space when the
      // character now touching the token is the one the source has on the far side
      // of that space. Ungated, `<b>Top {n}` taught this rule to rewrite a correct
      // `<b>{n} tempat` into `<b> {n} tempat`.
      const anchor = ei >= 2 ? en[ei - 2] : '';
      if (anchor && !/\s/.test(anchor) && (!cjk || asciiish(anchor))) {
        out = out.replace(new RegExp(`(${esc(anchor)})${T}`, 'g'), `$1 ${tok}`);
      }
    }

    if (enAfter && enAfter !== ' ' && enAfter !== '\n') {
      out = out.replace(new RegExp(`${T}[ \t]+(${alt(enAfter)})`, 'g'), `${tok}$1`);
    } else if (enAfter === ' ' && (!cjk || cjkInsertable(tok))) {
      const anchor = en[ei + tok.length + 1] ?? '';
      if (anchor && !/\s/.test(anchor) && (!cjk || asciiish(anchor))) {
        out = out.replace(new RegExp(`${T}(?=${esc(anchor)})`, 'g'), `${tok} `);
      }
    }
  }
  return out;
}

/** Restore the English leading/trailing whitespace and drop pre-punctuation spaces. */
function fixWhitespace(en, t) {
  let out = t;
  const enLead = (en.match(/^[ \t]*/) || [''])[0];
  const enTrail = (en.match(/[ \t]*$/) || [''])[0];
  out = enLead + out.replace(/^[ \t]*/, '');
  out = out.replace(/[ \t]*$/, '') + enTrail;
  if (!/[^\s][ \t]+[,.;:!?](\s|$)/.test(en)) {
    out = out.replace(/([^\s])[ \t]+([,.;:!?])(\s|$)/g, '$1$2$3');
  }
  return out;
}

/**
 * Chinese and Japanese never set a space either side of full-width punctuation,
 * but the translator carried the English spacing across the substitution — every
 * `Status: {status}` came back as `状态： {status}`. Collapse it.
 */
const FULLWIDTH = '：，。、；！？（）「」『』【】';
function fixFullwidthSpacing(t) {
  const cls = `[${FULLWIDTH}]`;
  return t
    .replace(new RegExp(`(${cls})[ \t]+`, 'g'), '$1')
    .replace(new RegExp(`[ \t]+(${cls})`, 'g'), '$1');
}

/** Re-apply a wrapping markdown marker the translator dropped from both ends. */
function fixWrapper(en, t) {
  for (const mark of ['_', '*']) {
    if (en.startsWith(mark) && en.endsWith(mark) && en.length > 2 &&
        !t.startsWith(mark) && !t.endsWith(mark) && !t.includes(mark)) {
      return mark + t + mark;
    }
  }
  return t;
}

const src = fs.readFileSync(FILE, 'utf8');
const lines = src.split('\n');

const KEY_RE = /^ {2}'([\w.]+)':\s*\{/;
// The trailing group absorbs both `', ` and the inline-close form `' },` — seven
// entries put their last language on the same line as the closing brace, and a
// pattern that only matched the comma form skipped them silently.
const LANG_RE = /^(\s+)(id|ru|de|zh|ja|es):\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")(,?(?:\s*\},?)?)\s*$/;
const EN_RE = /\ben:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")/;

let currentKey = null;
let currentEn = null;
const stats = { pruned: 0, adjacency: 0, whitespace: 0, wrapper: 0, fullwidth: 0 };
const changed = [];
const out = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const km = line.match(KEY_RE);
  if (km) {
    currentKey = km[1];
    const em = line.match(EN_RE);
    currentEn = em ? deserialize(em[1]) : null;
    out.push(line);
    continue;
  }
  const lm = line.match(LANG_RE);
  if (!lm || !currentKey) { out.push(line); continue; }

  const [, indent, lang, literal, comma] = lm;

  if (PRUNE_PREFIXES.some((p) => currentKey.startsWith(p))) {
    stats.pruned++;
    changed.push(`PRUNE  ${lang} ${currentKey}`);
    continue; // drop the line entirely
  }
  if (currentEn === null) { out.push(line); continue; }

  const before = deserialize(literal);
  let after = fixAdjacency(currentEn, before, lang);
  if (after !== before) stats.adjacency++;
  const w = fixWhitespace(currentEn, after);
  if (w !== after) stats.whitespace++;
  after = w;
  const p = fixWrapper(currentEn, after);
  if (p !== after) stats.wrapper++;
  after = p;
  if (lang === 'zh' || lang === 'ja') {
    const fw = fixFullwidthSpacing(after);
    if (fw !== after) stats.fullwidth++;
    after = fw;
  }

  if (after === before) { out.push(line); continue; }
  changed.push(`FIX    ${lang} ${currentKey}\n       - ${JSON.stringify(before)}\n       + ${JSON.stringify(after)}`);
  out.push(`${indent}${lang}: ${serialize(after)}${comma}`);
}

// A pruned family can leave a dangling comma on the last surviving language line
// before its closing brace. Trailing commas are legal in object literals, so the
// only repair needed is the reverse: a line that lost its comma-bearing successor.
let text = out.join('\n');
// (no repair needed: a trailing comma before } is legal in an object literal)

if (process.argv.includes('--verbose')) console.log(changed.join('\n'));
console.log(`pruned=${stats.pruned} adjacency=${stats.adjacency} whitespace=${stats.whitespace} wrapper=${stats.wrapper} fullwidth=${stats.fullwidth} lines_changed=${changed.length}`);

if (!DRY) {
  fs.writeFileSync(FILE, text);
  console.log(`wrote ${FILE}`);
}
