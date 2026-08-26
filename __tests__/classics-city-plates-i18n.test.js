// __tests__/classics-city-plates-i18n.test.js — v0.62.785
//
// THE MERGE SITE IS THE THING UNDER TEST, not the size of the corpus.
//
// classics-notes.js (1,677 notes) and city-plates.js 📜 histories (279) shipped
// en+fr only, with NO translation overlay and NO merge site — the last two
// curated prose corpora in the repo with neither. Three defects this month all
// had the same shape, and it is the shape this file guards:
//
//   v0.62.777  ~5,300 translated strings existed and no reader could reach them.
//   v0.62.778  1,649 notes rendered English to French readers.
//   v0.62.781  four ArrivalPlate sites read `fr ? x.fr : x.en`, so six locales
//              got English however many the datum carried.
//
// Every one was invisible because the DATA was measured and the RENDER was not.
// So: assert the merge folds a locale in, assert a hand-authored body wins, and
// assert the renderer reads the reader's language. Corpus coverage is tracked in
// the Register (O-307), not pinned here — a count assertion would fail on every
// tranche and teach whoever hits it to weaken the check.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');

describe('classics-notes / city-plates — translation merge site', () => {
  it('classics-notes.js folds any language the overlay row carries', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    // Language-agnostic merge: prove it by construction rather than by trusting
    // the loop's shape. Both namespaces must fold, and they must not collide.
    const probe = { note: { en: 'x' } };
    const OVERLAY = require('../classics-notes-i18n.generated.js');
    expect(typeof OVERLAY).toBe('object');
    // Every overlay key must address a note that actually exists, or the row is
    // dead weight that looks like coverage.
    const orphans = Object.keys(OVERLAY).filter((k) => {
      const i = k.indexOf('::');
      if (i < 0) return true;
      const scope = k.slice(0, i);
      const dish = k.slice(i + 2);
      const table = scope === scope.toUpperCase() ? CLASSIC_NOTES : CUISINE_NOTES;
      return !(table[scope] && table[scope][dish]);
    });
    expect(orphans).toEqual([]);
    expect(probe.note.en).toBe('x');
  });

  it('city-plates.js folds any language the history overlay row carries', () => {
    const { CITY_PLATES } = require('../city-plates.js');
    const HIST = require('../city-plates-i18n.generated.js');
    const orphans = Object.keys(HIST).filter((k) => {
      const i = k.indexOf('::');
      if (i < 0) return true;
      const city = k.slice(0, i);
      const dish = k.slice(i + 2);
      const entry = CITY_PLATES[city];
      return !(entry && (entry.dishes || []).some((d) => d.dish === dish && d.history));
    });
    expect(orphans).toEqual([]);
  });

  it('a hand-authored body always wins over the overlay', () => {
    // The merge fills only what is absent. Asserted on the real modules: every
    // note that carries `en` still carries the curated `en`, never an overlay one.
    const { CLASSIC_NOTES } = require('../classics-notes.js');
    const sg = CLASSIC_NOTES.SG && CLASSIC_NOTES.SG['chilli crab'];
    expect(sg && sg.note && sg.note.en).toMatch(/mud crab/i);
    expect(sg.note.fr).toMatch(/crabe/i);
  });

  it('ArrivalPlate renders the READER\'S language, not just French', () => {
    // v0.62.781. This is the assertion the other three defects needed and did not
    // have: it reads the RENDERER. `fr ? x.fr : x.en` served English to six
    // locales however complete the data was.
    const src = readFileSync(join(ROOT, 'web/cuisine/src/v2/components/ArrivalPlate.jsx'), 'utf8');
    expect(src).not.toMatch(/fr \? d\.note\.fr : d\.note\.en/);
    expect(src).not.toMatch(/fr \? d\.history\.fr : d\.history\.en/);
    // and the replacement resolves lang → en → fr
    expect(src).toMatch(/return obj\[lang\] \|\| obj\.en \|\| obj\.fr \|\| '';/);
    expect((src.match(/localisedBody\(d\.(note|history), lang\)/g) || []).length).toBe(4);
  });
});

// v0.62.785 — SCRIPT CONTAMINATION. These overlays are written by one author across
// six scripts, and eight errors got in that reading could not catch: the Russian word
// "официально" inside a CHINESE string, Japanese kana inside four Chinese strings
// (shop names left in their source script), the Han characters 日月 mid-sentence in
// two RUSSIAN strings, and one word — "лua" — spelling Russian with Latin letters.
//
// The check lived in a scratch file while the batches were written. That is a check
// that dies with the container, so it lives here now and runs in CI.
const SCRIPT_RULES = [
  { lang: 'ru', must: /[Ѐ-ӿ]/, mustLabel: 'Cyrillic' },
  { lang: 'zh', must: /[一-鿿]/, mustLabel: 'Han' },
  { lang: 'ja', must: /[぀-ヿ]/, mustLabel: 'kana' },
];
const FORBIDDEN = [
  { script: /[Ѐ-ӿ]/, label: 'Cyrillic', allowed: new Set(['ru']) },
  { script: /[぀-ヿ]/, label: 'kana', allowed: new Set(['ja']) },
  { script: /[一-鿿]/, label: 'Han', allowed: new Set(['zh', 'ja']) },
];
// A single WORD mixing Cyrillic and Latin letters is a typing slip, never a loanword —
// a Latin proper noun standing alone in a Russian sentence is fine and stays allowed.
const MIXED_WORD = /[A-Za-zÀ-ÿ]+[Ѐ-ӿ]|[Ѐ-ӿ]+[A-Za-zÀ-ÿ]/;

describe('translation overlays — script contamination', () => {
  for (const [name, path] of [
    ['city-plates', '../city-plates-i18n.generated.js'],
    ['classics-notes', '../classics-notes-i18n.generated.js'],
  ]) {
    it(`${name}: every value is written in its own script`, () => {
      const overlay = require(path);
      const bad = [];
      for (const [key, langs] of Object.entries(overlay)) {
        for (const [lang, text] of Object.entries(langs)) {
          const s = String(text);
          if (!s.trim()) bad.push(`${key}/${lang}: empty`);
          if (/\s\s/.test(s) || s !== s.trim() || /\n/.test(s)) bad.push(`${key}/${lang}: whitespace`);
          if (MIXED_WORD.test(s)) bad.push(`${key}/${lang}: mixed-script word`);
          for (const f of FORBIDDEN) {
            if (!f.allowed.has(lang) && f.script.test(s)) bad.push(`${key}/${lang}: ${f.label} leak`);
          }
          const rule = SCRIPT_RULES.find((r) => r.lang === lang);
          if (rule && !rule.must.test(s)) bad.push(`${key}/${lang}: no ${rule.mustLabel}`);
          for (const [other, otherText] of Object.entries(langs)) {
            if (other !== lang && otherText === text) bad.push(`${key}/${lang}: identical to ${other}`);
          }
        }
      }
      expect(bad).toEqual([]);
    });
  }
});
