#!/usr/bin/env node
// repair-i18n-translations.mjs — mechanically repair the structural damage Cloud
// Translation did to the machine translations, in place, in the job files.
//
//   node scripts/repair-i18n-translations.mjs --dry-run    # report, change nothing
//   node scripts/repair-i18n-translations.mjs              # write repairs
//
// WHAT IS REPAIRABLE, AND WHY ONLY THIS MUCH.
//
// Cloud Translation damaged these strings in four distinct ways, and only two of
// them are recoverable without re-translating:
//
//   REPAIRABLE — the damage is to MARKUP, and the English source states exactly
//   what the markup should be:
//     • Every closing tag was dropped:  `<b>{label}</b>.`  ->  `<b> {label} .`
//     • The opening tag absorbed the preceding space: `auf <b>X` -> `auf<b> X`
//     • Escaped angles were unescaped: `&lt;place&gt;` -> `<Ort>`, which Telegram
//       reads as an unknown tag and rejects the WHOLE message.
//
//   NOT REPAIRABLE — the damage is to CONTENT, and no amount of markup reasoning
//   recovers it:
//     • Newlines: every damaged item lost ALL of them (N -> 0). Nothing in the
//       translated text marks where a paragraph break belonged, so re-inserting
//       them would be guessing at the author's structure.
//     • Duplicated garble: one item came back as
//       "…`/location<place name> ` ein). `/location<place name> ` es manuell…" —
//       a mistranslation that repeated half the sentence. Deleting the duplicate
//       would be rewriting the translation, not repairing its markup.
//
// Those stay quarantined and are reported, not silently patched. A repairer that
// guessed at them would produce strings that PASS validation while being wrong,
// which is worse than a string that visibly fails.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');
const DRY = process.argv.includes('--dry-run');

const TG_TAGS = 'b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote';
const TAG_RE = new RegExp(`</?(?:${TG_TAGS})(?:\\s[^>]*)?>`, 'g');
const OPEN_RE = new RegExp(`<(${TG_TAGS})(?:\\s[^>]*)?>`, 'g');

const tagsOf = (s) => (String(s || '').match(TAG_RE) || []);

// 1. Escape angle brackets that are not part of a valid Telegram tag. The source
//    had them escaped; translation unescaped them. Split on valid tags so a real
//    tag is never touched.
function escapeStrayAngles(s) {
  const parts = String(s).split(TAG_RE);
  const tags = String(s).match(TAG_RE) || [];
  let out = '';
  parts.forEach((p, i) => {
    out += p.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (i < tags.length) out += tags[i];
  });
  return out;
}

// 2. Undo the space shift: `X<b> Y` -> `X <b>Y`.
function unshiftSpaces(s) {
  return String(s).replace(new RegExp(`(\\S)(<(?:${TG_TAGS})(?:\\s[^>]*)?>) `, 'g'), '$1 $2');
}

// 3. Re-insert dropped closers, anchored on what the SOURCE's span contained.
//    A span wrapping exactly one placeholder closes right after that placeholder;
//    otherwise the closer goes at end of string, which is always balanced even if
//    it emphasises a little more than intended. Over-emphasis is cosmetic; an
//    unbalanced tag kills the whole message.
function closeOpenTags(src, tr) {
  let out = String(tr);
  for (const m of [...String(src).matchAll(OPEN_RE)]) {
    const name = m[1];
    const openCount = (out.match(new RegExp(`<${name}(?:\\s[^>]*)?>`, 'g')) || []).length;
    const closeCount = (out.match(new RegExp(`</${name}>`, 'g')) || []).length;
    if (openCount <= closeCount) continue;

    // Does the source's span wrap exactly one placeholder?
    const span = new RegExp(`<${name}(?:\\s[^>]*)?>(\\{\\w+\\})</${name}>`);
    const ph = String(src).match(span);
    if (ph) {
      const at = out.indexOf(ph[1]);
      if (at >= 0) {
        out = out.slice(0, at + ph[1].length) + `</${name}>` + out.slice(at + ph[1].length);
        continue;
      }
    }
    out += `</${name}>`;
  }
  return out;
}

const strayCount = (s) => (String(s || '').replace(TAG_RE, '').match(/[<>]/g) || []).length;

// A command butted against a letter — `/cuisineで`, `/ubicaciónの` — is not
// tappable in Telegram: it reads as one token. Inserting the boundary space is a
// spacing repair, not a wording change, and it is only applied where the SOURCE
// had the command properly delimited.
function delimitCommands(src, tr) {
  const undelimited = (s) => {
    let n = 0;
    for (const m of String(s || '').matchAll(/\/[a-z]{2,15}/g)) {
      const nxt = String(s)[m.index + m[0].length];
      if (nxt && !/\s/.test(nxt) && !(nxt.charCodeAt(0) < 128 && /[^\w]/.test(nxt))) n++;
    }
    return n;
  };
  if (undelimited(src) > 0) return String(tr);   // source itself does this — leave alone
  return String(tr).replace(/(\/[a-z]{2,15})(?=[^\s])/g, (full, cmd, off, whole) => {
    const nxt = whole[off + cmd.length];
    if (!nxt || /\s/.test(nxt) || (nxt.charCodeAt(0) < 128 && /[^\w]/.test(nxt))) return full;
    return cmd + ' ';
  });
}

function repair(src, tr) {
  // Only re-escape when the SOURCE has no raw angles — i.e. it wrote `&lt;place&gt;`
  // and translation unescaped it. Several sources legitimately carry raw angles
  // inside code spans (`/buddy block <chat_id>`), and escaping the translation's
  // there produced 54 NEW mismatches where there had been 21. Repairing toward a
  // fixed idea of "correct" instead of toward the source is how a repair becomes
  // damage.
  let out = strayCount(src) === 0 ? escapeStrayAngles(tr) : String(tr);
  out = unshiftSpaces(out);
  out = closeOpenTags(src, out);
  // delimitCommands() is DISABLED. Inserting the boundary space raised command
  // failures from 17 to 94 — the inserted space changes the token stream in ways
  // the command check then rejects, so the "repair" created more damage than it
  // removed. The delimiter CHECK stays in the validator: the ~23 affected items
  // (mostly ja/zh, `/cuisineで`) are gated out and fall back to English, which is
  // correct. An untappable command is a defect; English is not.
  return out;
}

// ------------------------------------------------------------------ run
const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort();
let fixed = 0, unchanged = 0, stillBad = 0;
const remaining = [];

for (const f of files) {
  const p = path.join(DIR, f);
  const job = JSON.parse(fs.readFileSync(p, 'utf8'));
  let touched = false;
  for (const it of job.items) {
    const src = it.source || '', tr = it.google_translation || '';
    if (!tr) continue;
    // Every item is offered to repair(), not just the markup-damaged ones. An
    // earlier version skipped anything whose tags already matched, which meant the
    // command-delimiter fix never ran on the items that needed it most — they were
    // markup-clean and text-broken.
    const next = repair(src, tr);
    if (next === tr) { unchanged++; continue; }
    if (next !== tr) {
      it.google_translation = next;
      it.gemini_audit = it.gemini_audit || {};
      it.gemini_audit.notes = ((it.gemini_audit.notes || '') +
        ' [repaired v0.62.728: markup restored from the English source — closing tags re-inserted,' +
        ' opening-tag space shift undone, stray angle brackets re-escaped. Wording untouched.]').trim();
      fixed++; touched = true;
    }
    // Did the repair actually land?
    const after = it.google_translation;
    if (tagsOf(src).join(',') !== tagsOf(after).join(',') || strayCount(src) !== strayCount(after)) {
      stillBad++; remaining.push(`${job.job.target_lang} · ${it.id}`);
    }
  }
  if (touched && !DRY) fs.writeFileSync(p, JSON.stringify(job, null, 2) + '\n');
}

console.log(`${DRY ? 'DRY RUN — ' : ''}markup repairs applied: ${fixed}`);
console.log(`already clean: ${unchanged}`);
console.log(`still failing markup checks after repair: ${stillBad}`);
if (remaining.length) remaining.slice(0, 12).forEach((r) => console.log(`  ${r}`));
if (DRY) console.log('\nNothing written. Drop --dry-run to apply.');
