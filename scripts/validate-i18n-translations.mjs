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
const CHECKS = [
  ['html-tags',    (s) => (s.match(/<\/?[bi]>/g) || []).join(',')],
  ['placeholders', (s) => (s.match(/\{\w+\}/g) || []).sort().join(',')],
  ['commands',     (s) => (s.match(/\/[a-z]{2,15}\b/g) || []).sort().join(',')],
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
