// __tests__/bot-ternary-sweep.test.js — v0.62.859 (outstanding item 6).
//
// Operator: *"can we do 1, 3, 4, 6"*. This is item 6 — the bot and server half of the
// two-locale ternary sweep that AMD-59/61 did for `web/` and deliberately left here.
//
// THE DEFECT. 131 sites read `lang === 'fr' ? '<French>' : '<English>'`, written when the app
// had two locales and never revisited when it reached eight. Every one served ENGLISH to the
// six locales added since — under chrome the same user had already set to Japanese or Russian.
//
// FOUR SHAPES, AND ONLY THE FIRST WAS OBVIOUS. The count is 131 rather than 113 because the
// remainder was read instead of the first pattern being trusted:
//   1. single-line, literal arms                    — 113 sites, swept mechanically
//   2. `const isFr = lang === 'fr'` then `isFr ? …`  —   9 sites, the comparison hoisted
//   3. the same, split across lines                  —   7 sites, so neither pattern saw them
//   4. a double-quoted FRENCH arm (it has an apostrophe) —  2 sites, the quote char excluded them
//
// AND ONE FALSE POSITIVE THAT WOULD HAVE BROKEN LANGUAGE SELECTION ITSELF. 18 sites read
// `lang === 'fr' ? 'fr' : 'en'` — locale-code PLUMBING, not display. Keying those would have
// replaced the code that picks a language with a translation of the word. They are excluded by
// rule, and the rule is asserted below rather than left to a reviewer's eye.
//
// en and fr were LIFTED FROM THE ARMS BY SCRIPT, never retyped, so they cannot drift from what
// shipped. The other six are new, and are machine-authored: no native speaker has read them.
// That is stated here because it is true, not because a test can fix it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { maskComments } from './helpers/mask-comments.js';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const { t, tn, SUPPORTED } = require('../i18n');
const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

const STRINGS_SRC = read('i18n.js');
const BOT_KEYS = [...STRINGS_SRC.matchAll(/^\s+"(bot\.[a-z]+\.[A-Za-z0-9]+)":/gm)].map((m) => m[1]);

// Comments quote the very constructs these scans look for; the extractor itself produced a
// phantom key from one before this was made reflexive. Fourth occurrence in this arc.

describe('every swept key exists in all eight locales', () => {
  it('the sweep produced the number of keys it claims', () => {
    // v0.62.884 — floor raised from 126 to 144. A floor that never moves stops
    // being a measurement: 129 keys had been passing a 126 floor for four
    // versions, so a deletion of two would have gone unnoticed.
    expect(BOT_KEYS.length).toBeGreaterThanOrEqual(160);
    expect(new Set(BOT_KEYS).size, 'a key is defined twice — the later wins silently').toBe(BOT_KEYS.length);
  });

  it('no key falls back to English for any of the six added locales', () => {
    // `t()` returns entry[l] || entry.en, so a missing cell is INVISIBLE at the call site — it
    // just serves English. That is the exact failure this sweep exists to remove, so it is
    // checked by comparing against the English rather than by checking the key resolves.
    // IDENTITY IS THE SIGNAL, AND IT HAS EXACTLY ONE HONEST EXCEPTION. A cell equal to the
    // English is almost always a cell nobody filled — but "Menu" really is "Menu" in
    // Indonesian. Listing the pair beats relaxing the rule: a NEW accidental identity still
    // fails, which a loosened check would have swallowed.
    // v0.62.885 — two more, both the same shape as the first. The "About" pane
    // line reads "Michelin, Bib, Asia 50/100": four proper nouns and a number,
    // and Indonesian and Spanish both write "Asia". The French and Russian arms
    // DO differ (Asie, Азия) and are not listed — the exemption is per PAIR, so
    // it cannot quietly cover a locale that simply went unfilled.
    const IDENTICAL_ON_PURPOSE = new Set([
      'bot.index.menu.id',
      'bot.about.recognised.id',
      'bot.about.recognised.es',
    ]);
    const gaps = [];
    for (const k of BOT_KEYS) {
      const en = t(k, 'en');
      for (const l of ['id', 'ru', 'de', 'zh', 'ja', 'es']) {
        const v = t(k, l);
        if (!v || v === k) gaps.push(`${k}.${l}: missing`);
        else if (v === en && !/^[^A-Za-z]*$/.test(en) && !IDENTICAL_ON_PURPOSE.has(`${k}.${l}`)) {
          gaps.push(`${k}.${l}: identical to en`);
        }
      }
    }
    expect(gaps, 'these serve English to a reader who chose otherwise').toEqual([]);
  });

  it('placeholders never appear in a translation that English does not have', () => {
    // An invented `{foo}` renders literally as "{foo}" — tn() leaves unknown names alone. A
    // DROPPED one is legal and sometimes correct: `{b}` is an English plural suffix and six
    // locales deliberately do not use it.
    const bad = [];
    for (const k of BOT_KEYS) {
      const en = new Set([...t(k, 'en').matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
      for (const l of LOCALES) {
        for (const m of t(k, l).matchAll(/\{(\w+)\}/g)) {
          if (!en.has(m[1])) bad.push(`${k}.${l}: {${m[1]}} is not in the English`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no translation carries a script from another language', () => {
    // The one real slip this caught while the table was being written: a stray CJK character
    // inside a Russian string. Cheap, automatic, and it found a thing reading would not.
    const CJK = /[぀-ヿ一-鿿]/, CYR = /[Ѐ-ӿ]/;
    const bad = [];
    for (const k of BOT_KEYS) {
      for (const l of ['ru', 'de', 'es', 'id', 'fr', 'en']) if (CJK.test(t(k, l))) bad.push(`${k}.${l}: CJK`);
      for (const l of ['zh', 'ja', 'de', 'es', 'id', 'fr', 'en']) if (CYR.test(t(k, l))) bad.push(`${k}.${l}: Cyrillic`);
    }
    expect(bad).toEqual([]);
  });

  it('tn() substitutes named placeholders, so a translation may reorder them', () => {
    // AMD-61 measured why this matters: zh and ja put the count and the noun in the other
    // order, and positional {p1}/{p2} filled by index silently transposes them.
    expect(tn('bot.index.removeClip', 'ja', { n: 3 })).toContain('3');
    expect(tn('bot.index.removeClip', 'ru', { n: 3 })).toContain('3');
    expect(tn('bot.index.totalShowingFirst', 'zh', { total: 9, count: 3 })).toContain('9');
    // An unsupplied name is left visible rather than printed as "undefined".
    expect(tn('bot.index.removeClip', 'en', {})).toContain('{n}');
  });
});

describe('the call sites are keyed, and the ones that must NOT be are not', () => {
  const FILES = ['index.js', 'rating-pref.js', 'footfall-signal.js', 'nation-overlay.js',
    'venue-templates.js', 'search-conversation.js', 'clip-store.js', 'pipeline.js',
    'bot-fun-facts.js', 'open-hours.js', 'gemini-client.js'];

  it('no display ternary with two string literals survives outside web/', () => {
    const RE = /(\w+)\s*===\s*'(fr|ja|zh|ru|de|es|id)'\s*\?\s*(['"`])((?:\\.|(?!\3)[\s\S])*?)\3\s*:\s*(['"`])((?:\\.|(?!\5)[\s\S])*?)\5/g;
    const CODE_LIKE = /^(en|fr|de|id|ru|zh|ja|es|en-GB|fr-FR)$/;
    const left = [];
    for (const f of FILES) {
      const src = maskComments(read(f));
      let m; RE.lastIndex = 0;
      while ((m = RE.exec(src))) {
        if (CODE_LIKE.test(m[6])) continue;          // locale plumbing — correct as-is
        left.push(`${f}: ${JSON.stringify(m[6]).slice(0, 60)}`);
      }
    }
    expect(left, 'a two-locale display string is back').toEqual([]);
  });

  it('and the hoisted-boolean shape is gone too, declarations included', () => {
    // `const isFr = lang === 'fr'` then `isFr ? … : …`, on one line or across three. Leaving
    // the dead declaration behind would read as if two-locale logic still lived here.
    expect(read('index.js')).not.toMatch(/\bisFr\b/);
  });

  it('locale-code plumbing is UNTOUCHED — keying it would break language selection', async () => {
    // The false positive that would have looked like thoroughness. These pick a locale; they
    // display nothing. `clip-store` is the clearest: it maps a stored record's language onto
    // the app's list.
    // v0.62.915 — this line USED to pin `record.lang === 'fr' ? 'fr'` in clip-store.js. That
    // ladder is gone: the clamp now reads i18n's SUPPORTED list, because the ladder stopped at
    // five locales while the app reached nine, so a card saved by a zh/ja/es/ko reader came back
    // 'en'. The pin's PURPOSE survives — this call site resolves a locale CODE and displays
    // nothing — so it is asserted by CALLING, the same repair applied to pipeline.js below.
    // That is the SEVENTH source-scan pin this arc has had to fix after a refactor changed
    // nothing a reader can see.
    {
      const { _normaliseRecord, _denormaliseRecord } = require('../clip-store');
      const { SUPPORTED } = require('../i18n');
      const round = (l) => _denormaliseRecord(_normaliseRecord({ lang: l, body: 'x' })).lang;
      for (const l of SUPPORTED) expect(round(l), `a card saved in ${l} came back as something else`).toBe(l);
      // …and an unshipped locale is clamped rather than persisted.
      expect(round('pt')).toBe('en');
      expect(round(undefined)).toBe('en');
      // The output is a language CODE, never a sentence — the distinction this test guards.
      expect(round('ko')).toMatch(/^[a-z]{2}$/);
    }
    // v0.62.896 — this line USED to pin `const languageCode = lang === 'fr' ? 'fr' : 'en'`
    // in pipeline.js. That ternary is gone: it is now `placesLanguage(lang)`, and the
    // fr-or-en collapse it encoded was the defect the operator reported (a Korean reader
    // in Seoul got an English venue name from a bot speaking Korean everywhere else).
    // The pin's PURPOSE survives — this call site resolves a locale CODE and displays
    // nothing, so the sweep must never turn it into a t() call — so it is asserted by
    // CALLING, which is what it should have done all along. That is the sixth source-scan
    // pin this arc has had to repair after a refactor changed nothing a reader can see.
    expect(read('pipeline.js')).toMatch(/const languageCode = placesLanguage\(lang\)/);
    {
      const { placesLanguage } = require('../places-language');
      for (const [lang, code] of [['fr', 'fr'], ['ko', 'ko'], ['zh', 'zh-CN'], ['en', 'en']]) {
        const got = placesLanguage(lang);
        expect(got, `placesLanguage(${lang})`).toBe(code);
        // The output is a language TAG, never a sentence — that is the whole distinction
        // this test guards, and it is checkable without reading the source at all.
        expect(got).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/);
      }
      // …and an unshipped locale falls back rather than being forwarded to Google.
      expect(placesLanguage('pt')).toBe('en');
      expect(placesLanguage(undefined)).toBe('en');
    }
    // v0.62.915 — and the EIGHTH. This pinned `const safeLang = lang === 'fr' ? 'fr' : 'en'` in
    // bot-fun-facts.js, the else-branch of a local copy of the overlay rule that was three
    // locales behind the lib's. The copy is deleted, not widened: the body is resolved by the
    // lib's `factBody()`, which is the one place that knows the precedence. Asserted by calling.
    {
      const { _formatHtml } = require('../bot-fun-facts');
      const fact = { id: 'x', en: 'EN body', fr: 'FR body', _i18n: { zh: 'ZH overlay' } };
      // `await`, not a returned promise: a `return` here would end the `it` early and silently
      // skip anything added below it later — the shape that makes a test pass for no reason.
      const [fr, zh, pt] = await Promise.all([
        _formatHtml(fact, 'fr'), _formatHtml(fact, 'zh'), _formatHtml(fact, 'pt'),
      ]);
      expect(fr, 'the French body no longer resolves').toContain('FR body');
      // The locale this call site used to collapse to English.
      expect(zh, 'zh still falls through to English').toContain('ZH overlay');
      expect(pt, 'an unshipped locale no longer falls back').toContain('EN body');
    }
  });

  it('every file that calls t() can actually reach it', () => {
    // Four files were rewritten to call `t()` and had no import at all; one imported it under
    // an alias. `node --check` passes either way — this is a runtime break that only a load
    // or a test would find.
    for (const f of ['rating-pref.js', 'footfall-signal.js', 'nation-overlay.js', 'search-conversation.js']) {
      const src = read(f);
      if (/\bt\('bot\./.test(src)) expect(src, `${f} calls t() without importing it`).toMatch(/require\('\.\/i18n'\)/);
    }
    expect(read('venue-templates.js'), 'venue-templates imports t as `tr`').toMatch(/const \{ t: tr \} = require\('\.\/i18n'\)/);
    expect(read('venue-templates.js')).not.toMatch(/[^r]\bt\('bot\.venuetemplates/);
    expect(read('index.js')).toMatch(/^const \{ t, tn \} = require\('\.\/i18n'\);/m);
  });
});

describe('dates follow the reader too', () => {
  it('all eight locales have a date locale, not just fr and en', () => {
    const src = read('index.js');
    expect(src).toMatch(/const DATE_LOCALE = \{/);
    for (const l of LOCALES) expect(src, `DATE_LOCALE missing ${l}`).toMatch(new RegExp(`\\b${l}: '`));
    expect(src, 'the two-locale date ternary is back').not.toMatch(/toLocaleDateString\(lang === 'fr'/);
  });

  it('and SUPPORTED is the app’s eight, so the table cannot quietly narrow', () => {
    expect(SUPPORTED).toEqual(LOCALES);
  });
});
