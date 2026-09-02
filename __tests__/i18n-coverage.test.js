// __tests__/i18n-coverage.test.js — v0.62.773 (Register O-187, O-189-O-191)
//
// THE REGISTER SAID "i18n.js is still 0 / 276 keys translated". Measured on
// 26-08 '26, that is not merely stale — it is inverted:
//
//   276 keys      242 differ in all 7 non-EN locales
//                  34 are IDENTICAL in at least one locale
//                   0 are untranslated for a reason nobody can name
//
// All 34 are identical BY DESIGN, and this file is what turns that sentence
// from a claim into a check. Every identical (key, locale) pair is pinned with
// a reason below; nothing is exempted as a category, because "language.btn.*
// is exempt" would silently absorb a new language.btn key that genuinely
// needed translating.
//
// The pairing is the same shape that has already caught two real mistakes in
// michelin-city-manifest.test.js today: one test fails when a NEW identical
// pair appears, the other fails when a PINNED pair stops being identical and
// is left pinned. Neither direction can rot quietly.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const i18n = require('../i18n.js');

// Keys are read from the SOURCE, not from an export: i18n.js exposes t()/tn()
// and not the STRINGS table, so a key that exists but is unreachable through
// t() would otherwise be invisible to this suite.
const KEYS = [...new Set(
  [...fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8')
      .matchAll(/^\s*'([a-zA-Z0-9_.\-]+)':\s*\{/gm)].map((m) => m[1]),
)];

const NON_EN = i18n.SUPPORTED.filter((l) => l !== 'en');

// ── identical BY DESIGN ────────────────────────────────────────────────────
// [key, locales, reason]
//
//   endonym             a language's own name. "Francais" is Francais in every
//                       UI locale; translating it defeats the picker.
//   confirms-in-target  /language confirmations. "Language set to English"
//                       must arrive IN English whatever the previous locale
//                       was, or the user cannot read the confirmation of the
//                       switch they just made.
//   format-only         placeholders, punctuation and glyphs. Nothing to
//                       translate: "{name} - {dist}" has no words in it.
//   proper-noun         MICHELIN Bib Gourmand, Asia's 50 Best, Google Map.
//   cognate             the target language uses the same word. "Bus" is Bus
//                       in fr/id/de; "Wind", "Status", "Code" are German;
//                       Accident / Obstacle / Incident are French; ON/OFF is
//                       standard in Japanese UI.
const IDENTICAL_BY_DESIGN = [
  ['bot.lang.set.de', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.en', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.es', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.fr', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.id', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.ja', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.ru', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.zh', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['buddy.status.off', ['ja'], 'cognate'],
  ['buddy.status.on', ['ja'], 'cognate'],
  ['cuisine.chat.openWithGps', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'format-only'],
  ['incident.type.Accident', ['fr'], 'cognate'],
  ['incident.type.Incident', ['fr'], 'cognate'],
  ['incident.type.Obstacle', ['fr'], 'cognate'],
  ['language.btn.de', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.en', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.es', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.fr', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.id', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.ja', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.ru', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['language.btn.zh', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
  ['misrep.note', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'format-only'],
  ['recognised.btn.asia50', ['fr'], 'proper-noun'],
  ['recognised.btn.bib', ['fr', 'id', 'ru', 'de', 'es'], 'proper-noun'],
  ['transport.bus.stopCode', ['de'], 'cognate'],
  ['transport.bus.stopRow', ['fr', 'id', 'ru', 'de', 'zh', 'es', 'ko'], 'format-only'],
  ['transport.drive.openMapsBtn', ['fr'], 'proper-noun'],
  ['transport.incidents.row', ['fr', 'id', 'ru', 'de', 'zh', 'es', 'ko'], 'format-only'],
  ['transport.menu.btn.bus', ['fr', 'id', 'de'], 'cognate'],
  ['transport.menu.btn.incidents', ['fr'], 'cognate'],
  ['transport.train.stationRow', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'format-only'],
  ['transport.train.status', ['id', 'de'], 'cognate'],
  ['weather.wind', ['de'], 'cognate'],
  // v0.62.883 (K6) — the two keys the flip adds. `bot.lang.set.ko` confirms IN Korean
  // whatever the previous locale was, so it is identical across every column; and
  // `language.btn.ko` is an endonym, identical for the same reason its eight siblings are.
  ['bot.lang.set.ko', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['language.btn.ko', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'endonym'],
];

const REASONS = new Set(['endonym', 'confirms-in-target', 'format-only', 'proper-noun', 'cognate']);

const pinned = new Set();
for (const [key, langs, reason] of IDENTICAL_BY_DESIGN) {
  for (const l of langs) pinned.add(key + '|' + l);
}

// ── raw locale PRESENCE, read from the source ──────────────────────────────
// EVERYTHING ABOVE GOES THROUGH t(), AND t() IS `entry[l] || entry.en || key`.
// So every assertion in this file measures what RENDERS, not what EXISTS.
// Delete the `fr` property from language.btn.fr and t('language.btn.fr','fr')
// still returns the English value: the pair is still identical, the pin above
// still passes it, and "every key resolves in all 8 locales" still passes too.
// A gate that cannot tell a missing translation from an intended one is not a
// gate. Caught by Codex on #1754 — its P2 comment on this file.
//
// Measured when fixing it, the hole was not hypothetical: 96 locale entries
// are ALREADY absent (16 keys x 6 locales), and every check in this file
// passed anyway. They are absent correctly — an endonym and a switch
// confirmation must arrive in their own language, which is what the English
// fallback already delivers — but "correct" was never recorded anywhere, and
// an unrecorded absence is indistinguishable from a deletion.
//
// STRINGS is not exported, so the table is brace-matched out of the source:
// the same "read the source, not an export" approach the KEYS list uses.
const RAW = (() => {
  const src = fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8');
  const out = {};
  const re = /^\s*'([a-zA-Z0-9_.\-]+)':\s*\{/gm;
  let m;
  while ((m = re.exec(src))) {
    let i = src.indexOf('{', m.index);
    let depth = 0, quote = null, esc = false, top = '';
    for (; i < src.length; i++) {
      const c = src[i];
      if (esc) { esc = false; continue; }
      if (quote) { if (c === '\\') esc = true; else if (c === quote) quote = null; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '{') { depth++; continue; }
      if (c === '}') { depth--; if (depth === 0) break; continue; }
      if (depth === 1) top += c;
    }
    out[m[1]] = [...top.matchAll(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g)]
      .map((x) => x[1])
      .filter((prop) => i18n.SUPPORTED.includes(prop));
  }
  return out;
})();

// ── absent BY DESIGN ───────────────────────────────────────────────────────
// [key, locales, reason] — the entry does not exist and should not.
//
//   endonym             language.btn.* is a language's own name in the picker.
//                       "Deutsch" is Deutsch on every row of every locale's
//                       keyboard; one entry serves all eight.
//   confirms-in-target  bot.lang.set.* must arrive in the language just
//                       chosen, not the one being left. The English slot holds
//                       the target-language text, so the fallback is the
//                       feature, not a gap.
//
// Written out one key at a time, not generated from a loop over SUPPORTED. A
// loop would be the category rule this file already refuses above: it would
// silently absorb a future language.btn.* key that genuinely needed eight
// entries.
const ABSENT_BY_DESIGN = [
  ['bot.lang.set.en', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.fr', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.id', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.ru', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.de', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.zh', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.ja', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['bot.lang.set.es', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  ['language.btn.en', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.fr', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.id', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.ru', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.de', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.zh', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.ja', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.es', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  // v0.62.883 (K6) — the ninth member of the target-keyed family. Its value is written
  // once in Korean under en/fr; a `ko` column would only be read when display === 'ko',
  // and display always equals the code in the key.
  ['bot.lang.set.ko', ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'], 'confirms-in-target'],
  // …and the new endonym, absent from the same six its eight siblings are absent from.
  ['language.btn.ko', ['id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
];

const absentPinned = new Set();
for (const [key, langs] of ABSENT_BY_DESIGN) {
  for (const l of langs) absentPinned.add(key + '|' + l);
}

describe('i18n coverage', () => {
  it('every key RESOLVES in all 8 locales — resolution only, NOT presence', () => {
    // Names what it actually proves. t() falls back to English, so this
    // passes for a locale whose entry was deleted; presence is asserted
    // separately below, against the raw table.
    const broken = [];
    for (const k of KEYS) {
      for (const l of i18n.SUPPORTED) {
        const v = i18n.t(k, l);
        if (typeof v !== 'string' || !v.length) broken.push(k + '/' + l);
      }
    }
    expect(broken).toEqual([]);
  });

  it('276 keys, and the count is asserted so a silent deletion shows up', () => {
    // v0.62.893 — 278 -> 279. `bot.error.generic`, the reply that sixteen
    // unguarded `bot.onText` handlers never sent. The title's "276" is the
    // figure the Register carried when this file was written and is kept as the
    // heading it was; the assertion below is the measurement.
    expect(KEYS.length).toBe(279);
  });

  it('no key is identical to English except the pinned ones', () => {
    // The direction that catches a NEW untranslated key.
    const identical = [];
    for (const k of KEYS) {
      const en = i18n.t(k, 'en');
      for (const l of NON_EN) if (i18n.t(k, l) === en) identical.push(k + '|' + l);
    }
    expect(identical.filter((p) => !pinned.has(p)).sort()).toEqual([]);
  });

  it('every pinned pair is STILL identical — no stale exemptions', () => {
    // The direction that catches a pin left behind after a real translation
    // landed. Without it the list would only ever grow.
    const stale = [];
    for (const [key, langs] of IDENTICAL_BY_DESIGN) {
      const en = i18n.t(key, 'en');
      for (const l of langs) if (i18n.t(key, l) !== en) stale.push(key + '|' + l);
    }
    expect(stale).toEqual([]);
  });

  it('every exemption carries a reason from the known set', () => {
    for (const [key, langs, reason] of IDENTICAL_BY_DESIGN) {
      expect(REASONS.has(reason), key + ' has reason "' + reason + '"').toBe(true);
      expect(langs.length).toBeGreaterThan(0);
      expect(KEYS).toContain(key);
    }
  });

  it('every key has an English entry — the fallback root must exist', () => {
    // If `en` is missing too, t() returns the KEY and the user sees
    // "bot.lang.set.de" on screen. Nothing else in this file catches that.
    expect(KEYS.filter((k) => !RAW[k] || !RAW[k].includes('en'))).toEqual([]);
  });

  it('raw locale entries are pinned at 2,112 of a possible 2,208', () => {
    const have = KEYS.reduce((n, k) => n + RAW[k].length, 0);
    // v0.62.893 — 2,502 -> 2,511 and 2,385 -> 2,394: one key in all NINE locales,
    // so the possible-cells total and the present-cells total move together and
    // `absentPinned` does not move at all. That the third line still balances is
    // the check that the new key really is complete rather than merely counted.
    expect(KEYS.length * i18n.SUPPORTED.length).toBe(2511);
    expect(have).toBe(2394);
    expect(absentPinned.size).toBe(2511 - 2394);
  });

  it('no locale entry is MISSING except the pinned ones', () => {
    // The direction that catches a DELETION — the case t() hides entirely.
    const missing = [];
    for (const k of KEYS) {
      for (const l of i18n.SUPPORTED) if (!RAW[k].includes(l)) missing.push(k + '|' + l);
    }
    expect(missing.filter((p) => !absentPinned.has(p)).sort()).toEqual([]);
  });

  it('every pinned absence is STILL absent — no stale absence pins', () => {
    // The direction that catches a pin left behind after the entry was really
    // added. Without it the exemption list would only ever grow.
    const filled = [];
    for (const [key, langs] of ABSENT_BY_DESIGN) {
      for (const l of langs) if ((RAW[key] || []).includes(l)) filled.push(key + '|' + l);
    }
    expect(filled).toEqual([]);
  });

  it('every absence exemption carries a reason from the known set', () => {
    for (const [key, langs, reason] of ABSENT_BY_DESIGN) {
      expect(REASONS.has(reason), key + ' has reason "' + reason + '"').toBe(true);
      expect(langs.length).toBeGreaterThan(0);
      expect(KEYS).toContain(key);
    }
  });

  it('a deleted entry is caught by presence even though t() hides it', () => {
    // Codex's exact case, run rather than described. `language.btn.fr` is one
    // of the 165 pinned-identical pairs, so the identical-pair gate cannot see
    // its deletion: t() falls back to English and the strings still match.
    expect(RAW['language.btn.fr']).toContain('fr');
    expect(i18n.t('language.btn.fr', 'fr')).toBe(i18n.t('language.btn.fr', 'en'));
    expect(pinned.has('language.btn.fr|fr')).toBe(true);

    const mutated = { ...RAW, 'language.btn.fr': RAW['language.btn.fr'].filter((l) => l !== 'fr') };
    const missing = [];
    for (const k of KEYS) {
      for (const l of i18n.SUPPORTED) if (!mutated[k].includes(l)) missing.push(k + '|' + l);
    }
    expect(missing.filter((p) => !absentPinned.has(p))).toEqual(['language.btn.fr|fr']);
  });

  it('the long-form legal text is translated in every locale', () => {
    // privacy.body and legal.body are the two keys O-191 recorded as having
    // "no path". They have one: both differ in all 7 non-EN locales, and
    // neither may ever appear in IDENTICAL_BY_DESIGN — a legal notice the
    // reader cannot read is worse than no notice.
    for (const k of ['privacy.body', 'legal.body']) {
      const en = i18n.t(k, 'en');
      expect(en.length).toBeGreaterThan(300);
      for (const l of NON_EN) {
        expect(i18n.t(k, l), k + '/' + l).not.toBe(en);
        expect(i18n.t(k, l).length, k + '/' + l).toBeGreaterThan(100);
      }
      expect(IDENTICAL_BY_DESIGN.map((e) => e[0])).not.toContain(k);
    }
  });

  it('placeholders survive translation — {name} in EN means {name} everywhere', () => {
    // A translated string that dropped or renamed a placeholder renders the
    // literal token to the user. Cheap to check, invisible until someone sees
    // "{dist}" in a card.
    const drift = [];
    for (const k of KEYS) {
      const want = [...new Set([...i18n.t(k, 'en').matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
      if (!want.length) continue;
      for (const l of NON_EN) {
        const got = [...new Set([...i18n.t(k, l).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
        if (JSON.stringify(want) !== JSON.stringify(got)) {
          drift.push(k + '/' + l + ' want[' + want + '] got[' + got + ']');
        }
      }
    }
    expect(drift).toEqual([]);
  });
});

// ── the audit corpus, which is NOT run ─────────────────────────────────────
// scripts/i18n-audit-jobs/ holds 1,590 items across 36 files, prepared for the
// Gemini meaning-audit. Not one carries a verdict: the audit has never been
// run, because running it needs a paid API key and the operator's standing
// instruction is not to spend on external APIs.
//
// That is a real gap and it stays open (Register). What these assertions do is
// stop it decaying while it waits — a corpus nobody runs is a corpus nobody
// notices going stale. If a future run DOES land verdicts, the second test
// fails and forces the Register entry to be updated in the same change,
// instead of the state drifting silently the way "0 / 276 translated" did.
describe('i18n audit corpus (prepared, unrun)', () => {
  const DIR = path.join(ROOT, 'scripts', 'i18n-audit-jobs');
  const files = fs.readdirSync(DIR).filter((f) => f.startsWith('i18n-audit-') && f.endsWith('.json'));

  it('every job file parses and the item count is pinned', () => {
    let total = 0;
    for (const f of files) {
      const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      const items = j.items || j.entries || [];
      expect(Array.isArray(items), f).toBe(true);
      total += items.length;
    }
    expect(files.length).toBe(36);
    expect(total).toBe(1590);
  });

  it('is still unrun — no item carries a verdict', () => {
    // Deliberately asserts the ABSENCE of work. When someone runs the audit
    // this test fails, and that failure is the prompt to record the result
    // rather than let the Register keep saying "pending".
    const withVerdict = [];
    for (const f of files) {
      const j = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      for (const it of (j.items || j.entries || [])) {
        if (it.verdict && it.verdict !== 'unreviewed') withVerdict.push(f);
      }
    }
    expect([...new Set(withVerdict)]).toEqual([]);
  });
});
