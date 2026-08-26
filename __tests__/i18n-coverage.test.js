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
  ['bot.lang.set.de', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.en', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.es', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.fr', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.id', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.ja', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.ru', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['bot.lang.set.zh', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'confirms-in-target'],
  ['buddy.status.off', ['ja'], 'cognate'],
  ['buddy.status.on', ['ja'], 'cognate'],
  ['cuisine.chat.openWithGps', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'format-only'],
  ['incident.type.Accident', ['fr'], 'cognate'],
  ['incident.type.Incident', ['fr'], 'cognate'],
  ['incident.type.Obstacle', ['fr'], 'cognate'],
  ['language.btn.de', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.en', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.es', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.fr', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.id', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.ja', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.ru', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['language.btn.zh', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'endonym'],
  ['misrep.note', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'format-only'],
  ['recognised.btn.asia50', ['fr'], 'proper-noun'],
  ['recognised.btn.bib', ['fr', 'id', 'ru', 'de', 'es'], 'proper-noun'],
  ['transport.bus.stopCode', ['de'], 'cognate'],
  ['transport.bus.stopRow', ['fr', 'id', 'ru', 'de', 'zh', 'es'], 'format-only'],
  ['transport.drive.openMapsBtn', ['fr'], 'proper-noun'],
  ['transport.incidents.row', ['fr', 'id', 'ru', 'de', 'zh', 'es'], 'format-only'],
  ['transport.menu.btn.bus', ['fr', 'id', 'de'], 'cognate'],
  ['transport.menu.btn.incidents', ['fr'], 'cognate'],
  ['transport.train.stationRow', ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'], 'format-only'],
  ['transport.train.status', ['id', 'de'], 'cognate'],
  ['weather.wind', ['de'], 'cognate'],
];

const REASONS = new Set(['endonym', 'confirms-in-target', 'format-only', 'proper-noun', 'cognate']);

const pinned = new Set();
for (const [key, langs, reason] of IDENTICAL_BY_DESIGN) {
  for (const l of langs) pinned.add(key + '|' + l);
}

describe('i18n coverage', () => {
  it('every key resolves in all 8 supported locales', () => {
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
    expect(KEYS.length).toBe(276);
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
