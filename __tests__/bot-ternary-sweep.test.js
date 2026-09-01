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

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const { t, tn, SUPPORTED } = require('../i18n');
const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

const STRINGS_SRC = read('i18n.js');
const BOT_KEYS = [...STRINGS_SRC.matchAll(/^\s+"(bot\.[a-z]+\.[A-Za-z0-9]+)":/gm)].map((m) => m[1]);

// Comments quote the very constructs these scans look for; the extractor itself produced a
// phantom key from one before this was made reflexive. Fourth occurrence in this arc.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

describe('every swept key exists in all eight locales', () => {
  it('the sweep produced the number of keys it claims', () => {
    // v0.62.884 — floor raised from 126 to 144. A floor that never moves stops
    // being a measurement: 129 keys had been passing a 126 floor for four
    // versions, so a deletion of two would have gone unnoticed.
    expect(BOT_KEYS.length).toBeGreaterThanOrEqual(144);
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
    const IDENTICAL_ON_PURPOSE = new Set(['bot.index.menu.id']);
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

  it('locale-code plumbing is UNTOUCHED — keying it would break language selection', () => {
    // The false positive that would have looked like thoroughness. These pick a locale; they
    // display nothing. `clip-store` is the clearest: it maps a stored record's language onto
    // the app's list.
    expect(read('clip-store.js')).toMatch(/record\.lang === 'fr' \? 'fr'/);
    expect(read('pipeline.js')).toMatch(/const languageCode = lang === 'fr' \? 'fr' : 'en'/);
    expect(read('bot-fun-facts.js')).toMatch(/const safeLang = lang === 'fr' \? 'fr' : 'en'/);
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
