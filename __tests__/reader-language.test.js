// __tests__/reader-language.test.js — v0.62.845.
//
// Operator, with three screenshots (ru / de / ja), v0.62.842:
//   "i still dont see the translations . i change to japanese, french, russian"
//
// THE SHAPE OF THE BUG, because it explains why four shipped features all looked broken
// at once and none of them was. Every screenshot showed a fully translated CHROME —
// "Кухня", "Küche", "料理", the filter chips, the open-hours line, the distance — and an
// untranslated CARD: no pronunciation line, no reading line, an English address. The
// boundary between what was translated and what was not fell EXACTLY on the
// client/server line, and that is the tell.
//
// The client renders from `gia.locale`, the in-app toggle. The server was handed
// `deviceLang` — `navigator.language`, the PHONE's language. The operator's phone is in
// English. So the toggle never reached the server, which correctly computed a
// pronunciation guide for an ENGLISH reader of "The Canteen by Enjoy", correctly decided
// none was needed, cached the NONE, and rendered nothing.
//
// Nothing failed. Nothing threw. Nothing logged. The wrong question was answered
// perfectly, and a cache made the wrong answer durable — which is why no amount of
// staring at pronounce-name.js would have found it.
//
// `csLang` — the language the response is actually rendered in — was computed 2,500
// lines earlier in the same function and was in scope the whole time.
//
// These are source-level assertions, and that is a deliberate, stated limit: they prove
// which VARIABLE is passed, not what the model returns. That is exactly the defect class
// here — the call was always well-formed, just given the wrong argument.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');

describe('the reader-facing enrichers use the READER’s language', () => {
  it('all three on the search path take readerLang, not deviceLang', () => {
    for (const [what, re] of [
      ['name readings', /attachNameReadings\(payload\?\.venues, searchRegionCode, readerLang, redis\)/],
      ['pronunciations', /attachPronunciations\(payload\?\.venues, readerLang, \{ redis \}\)/],
      ['name gloss', /attachNameGloss\(payload\?\.venues, searchRegionCode, readerLang, redis\)/],
    ]) {
      expect(src, `${what} is not using readerLang`).toMatch(re);
    }
  });

  it('and NONE of them is still handed the phone’s language', () => {
    // The exact three call shapes that shipped the bug.
    expect(src).not.toMatch(/attachNameReadings\(payload\?\.venues, searchRegionCode, deviceLang/);
    expect(src).not.toMatch(/attachPronunciations\(payload\?\.venues, deviceLang/);
    expect(src).not.toMatch(/attachNameGloss\(payload\?\.venues, searchRegionCode, deviceLang/);
  });

  it('the Michelin path was the same bug and gets the same fix', () => {
    expect(src).toMatch(/attachNameReadings\(filteredVenues, michCC, csLang \|\| michDeviceLang, redis\)/);
    expect(src, 'the Michelin bracket still follows the phone').not.toMatch(
      /attachNameReadings\(filteredVenues, michCC, michDeviceLang, redis\)/,
    );
  });
});

describe('readerLang prefers the toggle, then the phone, then the stored pref', () => {
  it('is defined in that order', () => {
    expect(src).toMatch(/const readerLang = csBodyLang \|\| deviceLang \|\| csLang;/);
  });

  it('is declared BEFORE it is used — this session shipped two ordering crashes', () => {
    const decl = src.search(/const readerLang = csBodyLang/);
    expect(decl).toBeGreaterThan(-1);
    for (const re of [
      /attachNameReadings\(payload\?\.venues, searchRegionCode, readerLang/,
      /attachPronunciations\(payload\?\.venues, readerLang/,
      /attachNameGloss\(payload\?\.venues, searchRegionCode, readerLang/,
    ]) {
      expect(src.search(re), 'used above its declaration — temporal dead zone').toBeGreaterThan(decl);
    }
    // And csBodyLang, which it reads, must itself be declared earlier still.
    expect(src.search(/const csBodyLang = /)).toBeLessThan(decl);
  });

  it('csBodyLang is validated against user-prefs’ own list, not a hand-copy', () => {
    // v0.62.825 fixed a hand-copied 5-locale list that silently dropped ja/zh/es. If
    // that regresses, readerLang starts discarding the toggle again for three locales
    // and this whole class of bug comes back wearing the same face.
    expect(src).toMatch(/const \{ SUPPORTED: CS_LANGS \} = require\('\.\/user-prefs'\)/);
    expect(src).toMatch(/CS_LANGS\.includes\(langIn\)/);
  });

  it('user-prefs really does carry all eight app locales', () => {
    const { SUPPORTED } = require('../user-prefs');
    for (const l of ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']) {
      expect(SUPPORTED, `${l} would be dropped from the toggle`).toContain(l);
    }
  });
});

describe('the client still sends the toggle, which is what makes csBodyLang real', () => {
  it('searchCuisine puts `lang` in the request body', () => {
    const api = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/lib/api.js'), 'utf8');
    expect(api).toMatch(/const body = \{ lat, lng, cuisines, filters, region, lang,/);
  });

  it('and deviceLang is still the PHONE’s language, so it can never replace the toggle', () => {
    // Pinned so the fallback keeps meaning what the comment says it means.
    const api = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/lib/api.js'), 'utf8');
    expect(api).toMatch(/navigator\.language/);
  });
});
