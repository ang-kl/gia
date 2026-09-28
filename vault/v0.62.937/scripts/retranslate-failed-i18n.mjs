#!/usr/bin/env node
// retranslate-failed-i18n.mjs — re-translate ONLY the items that fail structural
// validation, using a request shape that avoids how Cloud Translation broke them.
//
//   GOOGLE_TRANSLATE_API_KEY=… node scripts/retranslate-failed-i18n.mjs --dry-run
//   GOOGLE_TRANSLATE_API_KEY=… node scripts/retranslate-failed-i18n.mjs
//
// WHY A SECOND PASS RATHER THAN A REPAIR. 77 of 1,590 items could not be fixed
// from the English source, because their damage is to CONTENT, not markup:
//
//   • 35 lost EVERY newline (N -> 0). Nothing in the translated text marks where a
//     paragraph break belonged, so re-inserting them is guessing at structure.
//   • 23 have a command butted against Japanese or Chinese text — `/cuisineで` —
//     which stops being tappable. The v0.62.718 masking protected the command TEXT
//     but not the space after it, so the model was free to close the gap.
//   • The rest are garbled: one item repeated half its own sentence.
//
// THE TWO CHANGES THAT ADDRESS THE CAUSES.
//
//   1. SEGMENT ON NEWLINES. Each line is translated as its own request and the
//      results are rejoined with the original separators. Cloud Translation cannot
//      flatten a break it never receives. This is the whole fix for the 35, and it
//      is structural rather than hopeful.
//   2. MASK THE COMMAND *AND ITS BOUNDARY*. `<span translate="no">/cuisine </span>`
//      rather than `<span translate="no">/cuisine</span>`, so the trailing space is
//      inside the protected run and cannot be absorbed.
//
// Everything produced here goes back through the SAME gate
// (validate-i18n-translations.mjs). An item that still fails is left as it was and
// stays on English. There is no path by which this script can lower the bar.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { validateItem } from './validate-i18n-translations.mjs';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { translateChunk, mask, unmask } = require('../i18n-translate');

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');
const DRY = process.argv.includes('--dry-run');
const KEY = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TRANSLATE_API;

// Extend the shared masking so a command carries its following space into the
// protected run. Applied after mask() so the base protections are unchanged.
// A placeholder inside an HTML ATTRIBUTE must not be masked. `<a href="{gmapsUrl}">`
// became `<a href="<span translate="no">{gmapsUrl} ">` — a span nested in an
// attribute value, which is not valid markup, so unmask() could not undo it and
// the mask leaked into the shipped string. Attributes are protected wholesale by
// the tag rule already, so re-inlining them after masking is safe.
// The shared mask() wraps `<code>` and `</code>` as SEPARATE protected runs, which
// leaves the content between them exposed and — worse — lets Cloud Translation drop
// the closing run entirely. Observed directly:
//
//   in : Use <span…><code></span>/location<span…></code></span> or …
//   out: Verwenden<span…><code></span> /location oder<span…><code></span> …
//
// Both closers gone, one opener duplicated. The fix is to protect the WHOLE span as
// one atomic run for tags whose content must not be translated anyway — <code> and
// <pre> hold commands and literals. Emphasis tags are left to the per-tag masking
// plus the repairer, because their inner text SHOULD be translated.
//
// Entities are protected for the same reason: `&lt;place&gt;` was being decoded and
// translated into `<Ort>`, which Telegram then reads as an unknown tag and rejects
// the whole message.
function maskAtomicSpans(text) {
  return String(text)
    .replace(/<span translate="no">(<(code|pre)>)<\/span>([\s\S]*?)<span translate="no">(<\/\2>)<\/span>/g,
      (_m, open, _t, inner, close) =>
        `<span translate="no">${open}${inner.replace(/<span translate="no">|<\/span>/g, '')}${close}</span>`)
    .replace(/(&(?:lt|gt|amp|quot|#39|#x27);)/g, '<span translate="no">$1</span>');
}

function unmaskInsideAttributes(text) {
  return String(text).replace(/="[^"]*"/g, (attr) =>
    attr.replace(/<span translate="no">([\s\S]*?)<\/span>/g, '$1'));
}

function maskCommandBoundaries(text) {
  return String(text).replace(
    /<span translate="no">(\/[a-z]{2,15})<\/span>( )/g,
    '<span translate="no">$1$2</span>'
  );
}

// ---------------------------------------------------------------- SLOTTING
//
// Cloud Translation's `format=html` cannot be made to preserve this markup. Three
// runs proved it rather than assuming it: masking tags individually let the model
// DROP every closer; masking a whole `<code>…</code>` as one atomic protected span
// still came back as `<span translate="no"><code>/location</span>` — closer gone
// from inside the protection it was meant to have.
//
// So the markup is not sent at all. Every non-translatable run — whole <code>/<pre>
// elements, bare tags, backtick spans, {placeholders}, entities, /commands — is
// replaced by an opaque token `⸤N⸥`, the bare prose is translated, and the ORIGINAL
// run is substituted back verbatim. Nothing the model returns can corrupt markup it
// never saw.
//
// Spacing is restored from the SOURCE's adjacency, not guessed: a slot that had no
// space before it in English gets none back, which is what keeps `<b>{label}</b>.`
// from becoming `<b>{label}</b> .`.
const SLOT_RES = [
  new RegExp(`<(code|pre)(?:\\s[^>]*)?>[\\s\\S]*?</\\1>`, 'g'),
  new RegExp(`</?(?:${'b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote'})(?:\\s[^>]*)?>`, 'g'),
  /`[^`\n]+`/g,
  /\{\w+\}/g,
  /&(?:lt|gt|amp|quot|#39|#x27);/g,
  /(?<=^|[\s(])\/[a-z]{1,15}\b/g
];

function slot(text) {
  const slots = [];
  let out = String(text);
  for (const re of SLOT_RES) {
    out = out.replace(re, (m, ...rest) => {
      const off = rest[rest.length - 2];
      const whole = rest[rest.length - 1];
      slots.push({
        text: m,
        spaceBefore: off === 0 ? false : /\s/.test(whole[off - 1]),
        spaceAfter: off + m.length >= whole.length ? false : /\s/.test(whole[off + m.length])
      });
      return ` ⸤${slots.length - 1}⸥ `;
    });
  }
  return { out: out.replace(/[ \t]{2,}/g, ' ').trim(), slots };
}

function unslot(text, slots) {
  return String(text).replace(/\s*⸤\s*(\d+)\s*⸥\s*/g, (_m, i) => {
    const s = slots[+i];
    if (!s) return '';
    return (s.spaceBefore ? ' ' : '') + s.text + (s.spaceAfter ? ' ' : '');
  });
}

const TG = 'b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote';
const TAGRE = new RegExp(`</?(?:${TG})(?:\\s[^>]*)?>`, 'g');
const OPENRE = new RegExp(`<(${TG})(?:\\s[^>]*)?>`, 'g');
const strayN = (s) => (String(s || '').replace(TAGRE, '').match(/[<>]/g) || []).length;

function repairInline(src, tr) {
  let out = String(tr);
  if (strayN(src) === 0) {
    const parts = out.split(TAGRE), tags = out.match(TAGRE) || [];
    let acc = '';
    parts.forEach((p, i) => { acc += p.replace(/</g, '&lt;').replace(/>/g, '&gt;'); if (i < tags.length) acc += tags[i]; });
    out = acc;
  }
  out = out.replace(new RegExp(`(\\S)(<(?:${TG})(?:\\s[^>]*)?>) `, 'g'), '$1 $2');
  for (const m of [...String(src).matchAll(OPENRE)]) {
    const name = m[1];
    const o = (out.match(new RegExp(`<${name}(?:\\s[^>]*)?>`, 'g')) || []).length;
    const c = (out.match(new RegExp(`</${name}>`, 'g')) || []).length;
    if (o <= c) continue;
    const span = new RegExp(`<${name}(?:\\s[^>]*)?>(\\{\\w+\\})</${name}>`);
    const ph = String(src).match(span);
    if (ph) { const at = out.indexOf(ph[1]); if (at >= 0) { out = out.slice(0, at + ph[1].length) + `</${name}>` + out.slice(at + ph[1].length); continue; } }
    out += `</${name}>`;
  }
  return out;
}

const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();

// Which items still fail, and why — measured, not assumed.
const todo = [];
for (const f of files) {
  const job = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
  for (const it of job.items) {
    const fails = validateItem(it.source || '', it.google_translation || '');
    if (fails.length) todo.push({ file: f, lang: job.job.target_lang, id: it.id, fails, source: it.source });
  }
}

const chars = todo.reduce((a, t) => a + (t.source || '').length, 0);
const segments = todo.reduce((a, t) => a + (t.source || '').split('\n').length, 0);
console.log(`${todo.length} items still failing · ${chars.toLocaleString()} source characters`);
console.log(`segmented on newlines: ${segments} requests (was ${todo.length})`);
console.log(`≈ $${(chars / 1e6 * 20).toFixed(4)} at list price; the free tier is 500,000 chars/month.\n`);

if (DRY || !KEY) {
  const byReason = {};
  for (const t of todo) for (const r of t.fails) byReason[r] = (byReason[r] || 0) + 1;
  console.log('failure reasons:');
  for (const [r, n] of Object.entries(byReason).sort((a, b) => b[1] - a[1])) console.log(`  ${r.padEnd(14)} ${n}`);
  if (!KEY && !DRY) {
    console.error('\n✗ GOOGLE_TRANSLATE_API_KEY is not set. This script will not invent translations.');
    process.exit(1);
  }
  console.log('\nDry run — nothing sent, nothing written.');
  process.exit(0);
}

let fixed = 0, stillBad = 0, sent = 0;
for (const f of files) {
  const p = path.join(DIR, f);
  const job = JSON.parse(fs.readFileSync(p, 'utf8'));
  const target = job.job.target_lang;
  let touched = false;

  for (const it of job.items) {
    if (!validateItem(it.source || '', it.google_translation || '').length) continue;
    const src = it.source || '';
    // Segment on newlines; translate each line; rejoin with the original breaks.
    const lines = src.split('\n');
    const slotted = lines.map((l) => (l.trim() ? slot(l) : null));
    const toSend = slotted.filter(Boolean).map((x) => x.out);
    let out;
    try {
      const got = await translateChunk(toSend, target, KEY);
      sent += toSend.length;
      let gi = 0;
      out = slotted.map((x, i) => (x ? unslot(got[gi++], x.slots) : lines[i])).join('\n');
    } catch (err) {
      console.error(`  ✗ ${target} · ${it.id}: ${err.message}`);
      continue;
    }
    // Repair the FRESH output before judging it: a re-translation reintroduces the
    // same dropped-closer and shifted-space damage the repairer already handles, and
    // rejecting an item for damage that is mechanically fixable would leave it on
    // English for no reason.
    out = repairInline(src, out);
    const before = it.google_translation;
    if (!validateItem(src, out).length) {
      it.google_translation = out;
      it.gemini_audit = it.gemini_audit || {};
      it.gemini_audit.notes = ((it.gemini_audit.notes || '') +
        ' [re-translated v0.62.729: segmented on newlines, command boundaries masked.]').trim();
      fixed++; touched = true;
    } else {
      // Still fails the gate — keep the old value rather than swap one failure for
      // another. The gate is the same one that let the other 1,513 through.
      it.google_translation = before;
      stillBad++;
    }
  }
  if (touched) fs.writeFileSync(p, JSON.stringify(job, null, 2) + '\n');
}

console.log(`\n${sent} segments sent · ${fixed} items now pass the gate · ${stillBad} still failing (left on English)`);
console.log('Re-run scripts/apply-i18n-translations.mjs to write the newly-passing items into i18n.js.');
