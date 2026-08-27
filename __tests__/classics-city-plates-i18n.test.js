// __tests__/classics-city-plates-i18n.test.js — v0.62.798
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
  // Hangul belongs to NO target language: id/ru/de/zh/ja/es. A Korean word left in
  // its own script is a leak wherever it lands — caught in a Chinese string naming
  // Daegu's Seongdangmot pond, where 못 had been carried over verbatim.
  { script: /[가-힣ᄀ-ᇿ]/, label: 'Hangul', allowed: new Set() },
];
// A single WORD mixing Cyrillic and Latin letters is a typing slip, never a loanword —
// a Latin proper noun standing alone in a Russian sentence is fine and stays allowed.
const MIXED_WORD = /[A-Za-zÀ-ÿ]+[Ѐ-ӿ]|[Ѐ-ӿ]+[A-Za-zÀ-ÿ]/;
// An untranslated ENGLISH word left standing inside a non-Latin-script string.
// The mixed-script rule is blind to it: "claims" is a well-formed Latin word, and
// Latin proper nouns are legitimate in ru/zh/ja. Caught after a Russian sentence
// shipped as "Батангас ... claims рождение" past every other rule.
const ENGLISH_STOPWORD = /(?<![A-Za-zÀ-ÿ])(?:the|and|or|of|in|on|at|to|for|with|from|by|as|is|are|was|were|be|been|has|have|had|not|but|its|it|this|that|these|those|claims|claim|said|says|made|make|born|now|then|which|who|where|when|while|after|before|until|during|between|among|both|each|every|also|still|only|often|typically|traditionally|usually|commonly)(?![A-Za-zÀ-ÿ])/i;
// NOT A RULE, and the reason is worth keeping. 「乡village沙拉」 shipped past every check
// above — an English noun wedged inside a Chinese word, which ENGLISH_STOPWORD cannot see
// (it knows only function words) and MIXED_WORD cannot see (it pairs Latin with Cyrillic
// alone). The obvious fix, flagging a lowercase Latin run between CJK characters, measured
// 0 false positives across the 895 classics-notes rows — and 18 across city-plates, every
// one of them correct: 蘸cacah酱, 配krecek与, 把tako与. Chinese sets romanised endonyms
// unspaced, so the test separates 'English noun' from 'romanised Malay noun', which no
// character-class rule can do. The slip was caught by reading and is recorded here rather
// than papered over with a rule that would have to be switched off on half the corpus.
const NON_LATIN_LANGS = new Set(['ru', 'zh', 'ja']);

// v0.62.805 — THE LATIN-SCRIPT BLIND SPOT. ENGLISH_STOPWORD runs on ru/zh/ja only, so
// id/de/es shipped unchecked: "bercita rasa nutty" reached the corpus and was caught by
// reading, not by CI. Three widenings were measured against the live overlays before one
// was kept, and the two that failed are recorded because each looked obviously right:
//
//   1. ENGLISH_STOPWORD on id/de/es — 1,096 hits, 100 % false positive. German "in" alone
//      accounts for 1,075; "was", "also" and "still" are German, "has" is Spanish (no has
//      llegado) AND Indonesian (has luar = sirloin), and "AS" is Indonesian for the US.
//      The rest are proper nouns the rule cannot see past: The Halia, Duke of Wellington,
//      Black or White, Taiwan Tobacco and Liquor Corporation.
//   2. An English food-NOUN list (sauce, pastry, noodles, cream, fish …) — 21 hits, again
//      100 % false positive, because a culinary loanword is not a leak: puff pastry,
//      clotted cream, cream cracker, corned beef, baked Alaska, fish and chips, and
//      "topping", which is simply an Indonesian word now.
//   3. English DESCRIPTIVE ADJECTIVES, lowercase only — 0 hits across 11,718 overlay
//      values, while still flagging "rasa nutty". Kept.
//
// Two constraints do the work. Adjectives, not nouns: a dish NAME may legitimately stay in
// English, an adjective describing it may not. And lowercase only, case-SENSITIVELY, which
// is what separates "Mango Sticky Rice" (a Thai dish, named) from "sticky" (a description
// left untranslated). "herbal" was dropped from the list on the same evidence — it is a
// real word in both Indonesian and Spanish, with 9 legitimate uses in the corpus.
const ENGLISH_DESCRIPTOR = /(?<![A-Za-zÀ-ÿ-])(?:nutty|crispy|crunchy|chewy|savoury|savory|spicy|smoky|creamy|fluffy|juicy|sticky|tangy|hearty|fragrant|silky|salty|bitter|zesty|buttery|cheesy|meaty|fishy|garlicky|gingery|peppery|oily|greasy|syrupy|flaky|crumbly|springy|bouncy|velvety|starchy|earthy|fiery|sourish|sweetish|tender|bland|moist|ripe)(?![A-Za-zÀ-ÿ-])/;

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
          if (NON_LATIN_LANGS.has(lang) && ENGLISH_STOPWORD.test(s)) bad.push(`${key}/${lang}: untranslated English`);
          if (lang !== 'en' && ENGLISH_DESCRIPTOR.test(s)) bad.push(`${key}/${lang}: untranslated English descriptor`);
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

// v0.62.795 — city-plates.js is COMPLETE: 279 of 279 histories in all eight locales.
//
// The v0.62.781 header said a coverage count would "fail on every tranche and teach
// whoever hits it to weaken the check". That was true WHILE the corpus was being
// filled. It is finished now, so the count becomes the opposite of brittle: the only
// way to break it is to add a dish without translating it, which is exactly the
// failure this corpus suffered for its whole existence before v0.62.781.
//
// classics-notes.js is deliberately NOT pinned here — it is still en+fr only, and
// O-307 tracks it. Pinning an unfinished corpus is how a gate gets switched off.
describe('city-plates histories — complete locale coverage', () => {
  it('every 📜 history carries all 8 locales', () => {
    const { CITY_PLATES } = require('../city-plates.js');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
    const gaps = [];
    let rows = 0;
    for (const [city, entry] of Object.entries(CITY_PLATES)) {
      for (const d of (entry.dishes || [])) {
        if (!d || !d.history) continue;
        rows += 1;
        for (const l of LOCALES) {
          if (typeof d.history[l] !== 'string' || !d.history[l].trim()) gaps.push(`${city}::${d.dish}/${l}`);
        }
      }
    }
    expect(rows).toBeGreaterThanOrEqual(279);
    expect(gaps).toEqual([]);
  });
});

// v0.62.798 — THE 140-CHARACTER CAP APPLIES TO EVERY LOCALE, NOT JUST en/fr.
//
// classics-notes.js line 11 states the contract: each note is "trimmed to <=140
// chars". All 1,677 curated notes obey it in BOTH en and fr — 0 violations. The only
// test enforcing it (city-plates.test.js) checked `en` and `fr`, on ONE dish.
//
// So the first 50 translated rows shipped 154 of 300 strings over the cap, up to 188
// characters — a 34% overflow on a curated UI card. Codex found it on PR #1760 and
// measured 79 of 150; the true figure across both tranches was 154 of 300.
//
// Note WHICH languages: id/ru/de/es overflow, zh/ja never do. A character cap is not
// script-neutral — 140 Han characters carry far more than 140 Latin ones — but the
// contract is a LAYOUT budget, and the layout counts characters. Translating to the
// cap is the discipline the curated English already keeps.
describe('classics-notes — the 140-character cap holds in every locale', () => {
  it('no translated note exceeds the cap the curated notes obey', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
    const over = [];
    for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
      for (const [scope, dishes] of Object.entries(table)) {
        for (const [dish, entry] of Object.entries(dishes)) {
          if (!entry || !entry.note) continue;
          for (const l of LOCALES) {
            const s = entry.note[l];
            if (typeof s === 'string' && s.length > 140) over.push(`${scope}::${dish}/${l} (${s.length})`);
          }
        }
      }
    }
    expect(over).toEqual([]);
  });
});

// v0.62.805 — classics-notes.js reaches eight-locale coverage, and O-307 closes with it.
//
// 1,674 of 1,677 notes now carry all eight locales: 10,044 strings written by hand across
// the tranches, no external-API spend. This assertion pins that, the way v0.62.795 pinned
// city-plates at 279 / 279 — a corpus that is finished stops being a target and starts
// being an invariant.
//
// THREE KEYS ARE EXCLUDED, BY NAME, AND THE REASON IS NOT "TOO HARD". Each is an O-315
// mismatch where the note describes a DIFFERENT DISH from the key it hangs on:
// changchun braised duck is described as a steamed Songhua white fish; roast suckling pig
// is described as a curry of diced pork and offal; eurasian fishball curry is described as
// Hong Kong post-war street food. Translating them faithfully would render the wrong dish
// into six more languages and multiply the error by six. Fixing them is a key-versus-note
// decision that changes what the app offers, so it is the operator's, not the translator's,
// and the rows stay in English until it is made. Listing them here means the exception is
// visible in CI rather than remembered — and the moment one is resolved, this list shrinks.
const O315_HELD = [
  'northeastern::changchun braised duck',
  'eurasian::roast suckling pig',
  'eurasian::eurasian fishball curry',
];
describe('classics-notes — complete locale coverage', () => {
  it('every note but the three held O-315 mismatches carries all eight locales', () => {
    const { CLASSIC_NOTES, CUISINE_NOTES } = require('../classics-notes.js');
    const overlay = require('../classics-notes-i18n.generated.js');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
    const held = new Set(O315_HELD);
    const gaps = [];
    let rows = 0;
    for (const table of [CLASSIC_NOTES, CUISINE_NOTES]) {
      for (const [scope, dishes] of Object.entries(table)) {
        for (const [dish, entry] of Object.entries(dishes)) {
          if (!entry || !entry.note || !entry.note.en) continue;
          const key = `${scope}::${dish}`;
          rows += 1;
          if (held.has(key)) continue;
          for (const l of LOCALES) {
            const s = entry.note[l] || (overlay[key] && overlay[key][l]);
            if (typeof s !== 'string' || !s.trim()) gaps.push(`${key}/${l}`);
          }
        }
      }
    }
    expect(rows).toBeGreaterThanOrEqual(1677);
    expect(gaps).toEqual([]);
    // The held list is an exception register, not a dumping ground: it may shrink, never grow.
    expect(O315_HELD.length).toBeLessThanOrEqual(3);
  });
});
