#!/usr/bin/env node
// validate-i18n-translations.mjs — decide which of the 1,590 machine translations
// are SAFE TO SHIP, structurally, without an LLM in the loop.
//
//   node scripts/validate-i18n-translations.mjs                 # report
//   node scripts/validate-i18n-translations.mjs --lang zh        # one language
//   node scripts/validate-i18n-translations.mjs --failures       # list what fails, and why
//
// WHY STRUCTURAL VALIDATION IS WORTH HAVING ON ITS OWN. The Gemini audit was
// designed as the single gate between this data and production copy, and it has
// never run. But a large share of what makes a translated bot string DANGEROUS is
// not semantic at all — it is structural, and structure is checkable here, offline,
// deterministically:
//
//   • Unbalanced <b>/<i> makes Telegram reject the WHOLE sendMessage. One bad
//     string silently kills an entire reply, not just its own line.
//   • A dropped or renamed {placeholder} renders a literal brace to the user, or
//     drops the value the sentence exists to carry.
//   • A mangled /command stops being tappable — `/location <place name>` came back
//     as `/location<place name> ` with the space moved and a stray backtick.
//   • Odd backtick counts leave an unterminated code span.
//   • Lost newlines collapse a multi-paragraph message into a wall.
//
// Every one of those is a defect the operator cannot see by reading the language,
// because they do not read these six languages. That is precisely the class a
// machine should be catching.
//
// WHAT THIS DOES NOT DO. It says nothing about whether the translation MEANS the
// right thing. A structurally perfect sentence can be wrong, rude, or nonsense.
// This narrows the field; it is not the audit, and must not be described as one.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');

const args = process.argv.slice(2);
const LANG = args.includes('--lang') ? args[args.indexOf('--lang') + 1] : null;
const SHOW_FAILURES = args.includes('--failures');

// Each check returns a stable key when the translation diverges from the source in
// a way that changes behaviour. Comparing against the SOURCE rather than asserting
// a shape means a string with no tags is not expected to grow any.
// Telegram's HTML parse_mode accepts exactly this tag set. Anything else between
// angle brackets is an unknown tag and Telegram rejects the WHOLE message.
const TG_TAGS = 'b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote';
const TAG_RE = new RegExp(`</?(?:${TG_TAGS})(?:\\s[^>]*)?>`, 'g');

// v0.62.728 — the first cut of this file checked only <b> and <i>. That missed
// <code> damage entirely, and missed the worse case: `&lt;place&gt;` came back as
// a literal `<Ort>`, which Telegram parses as an unknown tag and rejects the whole
// send. A validator that overlooks the failure it exists to prevent is the same
// class of defect as the artefact that overstated its own rigour (X-10, P2 on
// #1721) — found here by reading a failing item's full text rather than its
// summary.
function strayAngles(s) {
  return (String(s || '').replace(TAG_RE, '').match(/[<>]/g) || []).length;
}

const CHECKS = [
  ['html-tags',    (s) => (s.match(TAG_RE) || []).join(',')],
  ['stray-angles', (s) => String(strayAngles(s))],
  // [\w-]+, not \w+: `{cuisine-venues}` is a live placeholder in start.intro, and
  // \w+ never matched it. The Russian translation replaced it with
  // `{кулинарные-торговые площадки}` — a translated placeholder NAME, which can
  // never substitute, so /start would render the literal to users. Found by Codex
  // on PR #1725.
  ['placeholders', (s) => (s.match(/\{[\w-]+\}/g) || []).sort().join(',')],
  // {1,15}, not {2,15}: `/l` is a real, supported command and the two-character
  // minimum meant neither command check ever looked at it. Six `wake2.anotherHint`
  // translations shipped with `/l<place>` — the delimiter gone, the command dead —
  // and passed the gate cleanly. Found by Codex on PR #1724.
  ['commands',     (s) => (s.match(/\/[a-z]{1,15}\b/g) || []).sort().join(',')],
  // A Telegram command is only tappable when it ends at a boundary. Cloud
  // Translation butted commands straight against Japanese and Chinese text —
  // `/cuisineで` — which reads as one long token and stops being a command. The
  // check counts undelimited commands rather than asserting zero, so a source that
  // legitimately has one is not failed for it.
  ['cmd-delimited', (s) => {
    let n = 0;
    for (const m of String(s || '').matchAll(/\/[a-z]{1,15}/g)) {
      const nxt = String(s)[m.index + m[0].length];
      // v0.62.732 — CJK punctuation delimits a command exactly as ASCII punctuation
      // does: Telegram ends the bot_command entity at the first character outside
      // [A-Za-z0-9_], and `请尝试 /hidden，` reads as cleanly as `try /hidden,`. Kana
      // and hanzi are still not delimiters, so `/cuisineで` — the case this check was
      // written for — still counts as undelimited.
      const cjkPunct = /[，。、；：！？（）【】「」『』〜・]/.test(nxt || '');
      if (nxt && !/\s/.test(nxt) && !cjkPunct && !(nxt.charCodeAt(0) < 128 && /[^\w]/.test(nxt))) n++;
    }
    return String(n);
  }],
  // Count commands FOLLOWED BY A CLOSING BOUNDARY, and compare against the source.
  // The delimiter check above treats any ASCII punctuation as a valid boundary, so
  // `/l<place>` passed it — `<` is punctuation. But the source wrote `/l <place>`,
  // and losing that space is the damage: it reads wrong and the argument fuses to
  // the command.
  //
  // v0.62.732 — whitespace alone was too narrow. Every language here punctuates
  // differently from English, and `просто /weather, чтобы …` renders a command that
  // Telegram still makes tappable; failing it taught the gate to reject correct
  // Russian. Sentence punctuation counts as a closing boundary; `<`, backtick, `{`
  // and word characters do not, so `/l<place>` — the case this check was written
  // for — still fails.
  ['cmd-spacing',  (s) => {
    let n = 0;
    for (const m of String(s || '').matchAll(/\/[a-z]{1,15}/g)) {
      const nxt = String(s)[m.index + m[0].length];
      if (nxt && (/\s/.test(nxt) || /[,.;:!?)\]—–]/.test(nxt) || /[，。、；：！？）】」』]/.test(nxt))) n++;
    }
    return String(n);
  }],
  ['backticks',    (s) => String((s.match(/`/g) || []).length)],
  ['newlines',     (s) => String((s.match(/\n/g) || []).length)]
];

export function validateItem(source, translation) {
  const failures = [];
  if (!translation || !translation.trim()) return ['empty'];
  for (const [name, fn] of CHECKS) if (fn(source) !== fn(translation)) failures.push(name);
  return failures;
}

function load() {
  return fs.readdirSync(DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .filter((f) => !LANG || f.startsWith(`i18n-audit-${LANG}-`))
    .sort()
    .map((f) => ({ file: f, job: JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) }));
}

// Importable without side effects: apply-i18n-translations.mjs uses validateItem()
// as its gate, and a gate that prints a report every time it is loaded buries the
// caller's own output.
const RUN_AS_CLI = process.argv[1] && process.argv[1].endsWith('validate-i18n-translations.mjs');

const byLang = {}, reasons = {}, failing = [];
let total = 0, safe = 0;

for (const { job } of load()) {
  const lang = job.job.target_lang;
  byLang[lang] ||= { safe: 0, failed: 0 };
  for (const it of job.items) {
    total++;
    const f = validateItem(it.source || '', it.google_translation || '');
    if (f.length) {
      byLang[lang].failed++; failing.push({ lang, id: it.id, failures: f, source: it.source, translation: it.google_translation });
      for (const r of f) reasons[r] = (reasons[r] || 0) + 1;
    } else { byLang[lang].safe++; safe++; }
  }
}

if (RUN_AS_CLI) {
console.log(`${total} items · ${safe} structurally safe · ${total - safe} failing\n`);
console.log('by language:');
for (const [l, c] of Object.entries(byLang)) {
  console.log(`  ${l.padEnd(6)} safe ${String(c.safe).padStart(3)} · failing ${String(c.failed).padStart(3)}`);
}
console.log('\nfailure reasons (one item can fail several):');
for (const [r, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${r.padEnd(14)} ${n}`);
}

if (SHOW_FAILURES) {
  console.log('\n--- failing items ---');
  for (const f of failing) {
    console.log(`\n${f.lang} · ${f.id} · ${f.failures.join(', ')}`);
    console.log(`  EN: ${JSON.stringify((f.source || '').slice(0, 120))}`);
    console.log(`  TR: ${JSON.stringify((f.translation || '').slice(0, 120))}`);
  }
}

console.log(`\nStructural only. It does not check whether a translation MEANS the right thing —`);
console.log(`that is the Gemini audit's job, and the audit has not run (0 / ${total}).`);
}
