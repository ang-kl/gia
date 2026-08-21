#!/usr/bin/env node
// fill-i18n-translations.mjs — fill every i18n audit job file in place, here,
// so the result arrives as a reviewable diff instead of 36 manual downloads.
//
//   GOOGLE_TRANSLATE_API_KEY=… node scripts/fill-i18n-translations.mjs
//   GOOGLE_TRANSLATE_API_KEY=… node scripts/fill-i18n-translations.mjs --lang zh
//   node scripts/fill-i18n-translations.mjs --dry-run     (no key needed)
//
// WHY THIS EXISTS ALONGSIDE THE ROUTE. v0.62.718 put the Cloud Translation call
// behind a Railway route because the operator had no runner: no CLI, no
// service-account key. That works, but the filled JSON lands in a browser, and
// neither the route nor Gemini can write to the repo — so every file is a manual
// download AND a manual re-upload before anything can be applied. The operator's
// correction was to reverse it: do the work where the repo already is, and ship
// a PR. This script is that reversal.
//
// It reuses fillJob() from i18n-translate.js verbatim, so the masking that keeps
// {placeholders} and /commands intact is the same code path the route uses and
// the same one the tests pin. No second, drifting copy.
//
// SAFE TO RE-RUN. Items that already carry a google_translation are skipped, so
// a partial failure costs only what is still missing on the next pass.
//
// It does NOT invent translations. Without a key it refuses and says so. A
// fabricated string in a language nobody here reads is the same failure as a
// fabricated price in a spend tracker — it would be trusted, and it would be
// wrong in an unknown direction.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { fillJob } = require('../i18n-translate');

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'scripts/i18n-audit-jobs');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const langArg = (() => {
  const i = args.indexOf('--lang');
  return i >= 0 ? args[i + 1] : null;
})();

const KEY = process.env.GOOGLE_TRANSLATE_API_KEY;
if (!KEY && !DRY) {
  console.error('✗ GOOGLE_TRANSLATE_API_KEY is not set.\n');
  console.error('  This script will not fabricate translations. Set the key in this');
  console.error('  environment and re-run, or use --dry-run to see what would be sent.\n');
  process.exit(1);
}

const files = fs.readdirSync(DIR)
  .filter((f) => f.startsWith('i18n-audit-') && f.endsWith('.json'))
  .filter((f) => !langArg || f.startsWith(`i18n-audit-${langArg}-`))
  .sort();

if (!files.length) {
  console.error(`✗ no job files${langArg ? ` for lang "${langArg}"` : ''} in ${path.relative(ROOT, DIR)}`);
  process.exit(1);
}

const totals = { files: 0, filled: 0, skipped: 0, chars: 0, damaged: 0 };
const damagedItems = [];

for (const name of files) {
  const file = path.join(DIR, name);
  const job = JSON.parse(fs.readFileSync(file, 'utf8'));
  const pending = job.items.filter((i) => i.google_translation == null).length;

  if (DRY) {
    const chars = job.items.filter((i) => i.google_translation == null)
      .reduce((a, i) => a + i.source.length, 0);
    console.log(`  ${name.padEnd(28)} ${String(pending).padStart(3)} pending · ${chars} chars`);
    totals.files++; totals.filled += pending; totals.chars += chars;
    continue;
  }

  try {
    const r = await fillJob(job, { apiKey: KEY });
    fs.writeFileSync(file, JSON.stringify(r.job, null, 2) + '\n');
    totals.files++; totals.filled += r.filled; totals.skipped += r.alreadyFilled;
    totals.chars += r.chars; totals.damaged += r.damaged;
    // Name the damaged ids rather than only counting them — a count tells you
    // something broke, an id tells you which string to look at.
    for (const it of r.job.items) {
      if (/Masking did not fully survive/.test(it.gemini_audit.notes || '')) damagedItems.push(`${name}:${it.id}`);
    }
    const flag = r.damaged ? ` ⚠️ ${r.damaged} damaged` : '';
    console.log(`  ✓ ${name.padEnd(28)} filled ${String(r.filled).padStart(3)} · skipped ${r.alreadyFilled} · ${r.chars} chars${flag}`);
  } catch (err) {
    console.error(`  ✗ ${name.padEnd(28)} ${err.message}`);
    console.error('    Stopping. Already-written files keep their translations; re-run to resume.');
    process.exit(1);
  }
}

console.log('');
if (DRY) {
  console.log(`DRY RUN — ${totals.files} files, ${totals.filled} items, ${totals.chars.toLocaleString()} chars would be sent.`);
  console.log(`Estimated cost at $20/M chars: $${(totals.chars * 20 / 1e6).toFixed(4)} (list price; the 500k/month free tier likely absorbs it).`);
  process.exit(0);
}

console.log(`${totals.files} files · ${totals.filled} filled · ${totals.skipped} already done · ${totals.chars.toLocaleString()} chars`);
console.log(`Estimated cost: $${(totals.chars * 20 / 1e6).toFixed(4)}`);

if (totals.damaged) {
  console.log(`\n⚠️  ${totals.damaged} item(s) lost a protected run — a placeholder, command or tag did not survive.`);
  console.log('   Each is flagged in its own gemini_audit.notes. Review these before applying:');
  damagedItems.slice(0, 40).forEach((d) => console.log(`     ${d}`));
  if (damagedItems.length > 40) console.log(`     … and ${damagedItems.length - 40} more`);
  console.log('\n   Non-zero damage on a first real run is expected to be informative, not fatal:');
  console.log('   every test of the masking layer mocks axios, so this is its first contact');
  console.log('   with what Cloud Translation actually returns.');
} else {
  console.log('\n✓ Every protected run survived — no placeholder, command or tag was altered.');
}
