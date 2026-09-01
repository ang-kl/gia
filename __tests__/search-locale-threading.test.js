// __tests__/search-locale-threading.test.js — v0.62.825.
//
// THE JAPANESE WAS NEVER MISSING. `open-hours.js` has carried all eight locales for
// versions; a reader with the Mini App toggled to Japanese still got
//
//     Closed today · Opens Sun 11:30 AM
//
// where the same module returns 本日休業 · 日 11:30 開店. Four hand-copied locale lists
// stood between the two, and the shortest one came first:
//
//   index.js:14874  POST /api/cuisine/user-language rejected ja/zh/es with 400
//                   "unsupported lang" — in FRONT of setUserLang, which validates
//                   against user-prefs' own SUPPORTED (all eight). The pick never
//                   persisted, so the server never learned the reader's language at all.
//   index.js:15547  the cuisine route's body-lang allowlist, three short
//   index.js:18319  the free-text route's, the same five
//   index.js:10413  `const ohLang = csLang === 'fr' ? 'fr' : 'en'` — two of eight
//
// The last one is the famous shape (O-305, and the v0.62.778 French bug): the OTHER
// search path, cuisine-enrich.js:100, wrote `ctx.csLang || 'en'` and was right all
// along. One datum, two call sites, one of them forgot. The first three are the same
// defect a layer up, and the reason all four existed is a comment in user-prefs.js
// stating that chat replies are en/fr-only — true when written, false since v0.62.511.
//
// So this file asserts the SHAPE, not the strings: nobody re-lists the locales.
import { describe, it, expect } from 'vitest';
const fs = require('fs');

const oh = require('../open-hours.js');
const { SUPPORTED } = require('../user-prefs.js');
const INDEX = fs.readFileSync(require.resolve('../index.js'), 'utf8');

const EIGHT = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

describe('open-hours speaks every locale the app claims to support', () => {
  it('its phrase table and user-prefs agree on the set, and neither is hand-listed here', () => {
    expect([...oh.OH_LANGS].sort()).toEqual([...SUPPORTED].sort());
    expect([...SUPPORTED].sort()).toEqual([...EIGHT].sort());
  });

  it('normalises a tag, keeps what it knows, and degrades unknown to en', () => {
    expect(oh.ohLang('ja')).toBe('ja');
    expect(oh.ohLang('zh-CN')).toBe('zh');   // Telegram sends region-tagged codes
    expect(oh.ohLang('ES')).toBe('es');
    // v0.62.883 (K6) — this line used to read `.toBe('en')` with the comment "no Korean
    // phrases". The phrase table now has them, so the degrade-to-English case needs a code
    // the table genuinely lacks; 'pt' is that code, and 'ko' proves the opposite.
    expect(oh.ohLang('ko')).toBe('ko');      // Korean phrases exist now — K6 added them
    expect(oh.ohLang('pt')).toBe('en');      // no Portuguese phrases — English, not a crash
    expect(oh.ohLang(undefined)).toBe('en');
  });

  // The regression itself, as a value rather than a claim: a venue closed today that
  // reopens Sunday 11:30. This is the card in the operator's screenshot.
  it('renders the closed-today label in the reader’s language, not English', () => {
    const periods = [{ open: { day: 0, hour: 11, minute: 30 }, close: { day: 0, hour: 14, minute: 0 } }];
    const at = new Date('2026-08-29T12:00:00+09:00');
    const say = (l) => oh.closedTodayString(periods, at, 540, l);

    expect(say('en')).toBe('Closed today · Opens Sun 11:30 AM');
    expect(say('ja')).toBe('本日休業 · 日 11:30 開店');
    expect(say('zh')).toBe('今天休息 · 周日 11:30 开门');
    expect(say('es')).toBe('Cerrado hoy · Abre dom 11:30');

    // and every locale differs from English — a table that silently fell back would
    // pass a "returns a string" check and fail this one.
    const english = say('en');
    const same = EIGHT.filter((l) => l !== 'en' && say(l) === english);
    expect(same, 'a locale fell back to English').toEqual([]);
  });
});

describe('no route re-lists the locales', () => {
  // Asserting on source text, which is weaker than calling the routes — they are
  // Express handlers wired to redis and Places. What it CAN prove is the property
  // that actually broke: that a shortened copy of the list is not present.
  it('the five-locale list that dropped ja/zh/es is gone from index.js', () => {
    const shortLists = INDEX.split('\n')
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /\[\s*'en'\s*,\s*'fr'\s*,\s*'id'\s*,\s*'ru'\s*,\s*'de'\s*\]/.test(l))
      .filter(([, l]) => !l.trim().startsWith('//'))
      .map(([n, l]) => `${n}: ${l.trim().slice(0, 80)}`);
    expect(shortLists, 'a locale allowlist was re-listed short').toEqual([]);
  });

  it('the three language gates read SUPPORTED from user-prefs', () => {
    expect(INDEX).toContain("const { setUserLang, SUPPORTED: PREF_LANGS } = require('./user-prefs');");
    expect(INDEX).toContain('CS_LANGS.includes(langIn)');
    expect(INDEX).toContain('NL_LANGS.includes(nlLangIn)');
  });

  it('the Michelin path asks open-hours for the locale instead of a two-way ternary', () => {
    expect(INDEX).toContain('const ohLang = ohLangFor(csLang);');
    expect(INDEX, 'the fr/en ternary is back on the open-hours language')
      .not.toContain("const ohLang = csLang === 'fr' ? 'fr' : 'en';");
  });
});

describe('the Mini App can name itself, and the Michelin pill is not the odd one out', () => {
  const I18N = fs.readFileSync('web/cuisine/src/v2/lib/i18n.js', 'utf8');
  const APP = fs.readFileSync('web/cuisine/src/v2/App.jsx', 'utf8');

  it('header.appTitle exists in the base table and in all six overlays', () => {
    const hits = [...I18N.matchAll(/'header\.appTitle'/g)].length;
    expect(hits, 'base + id/ru/de/zh/ja/es').toBe(7);
    expect(I18N).toContain("'header.appTitle': '料理',");
    expect(I18N).toContain("'header.appTitle': 'Кухня',");
  });

  it('the <h1> renders the key, not the literal it used to hardcode', () => {
    expect(APP).toContain("{t('header.appTitle', lang)}");
    expect(APP).not.toContain('truncate">Cuisine</h1>');
  });

  // Comment lines are stripped before the absence check, because this file's own
  // comments QUOTE the code they replaced — an assertion of absence that reads
  // commentary as code is an assertion that can never pass, and the honest fix is
  // to look at code only rather than to reword the comment until the test is quiet.
  const APP_CODE = APP.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n');

  it('the michelin pill uses cat.michelinBib, which the drawer already uses', () => {
    // BOTH sites: the folio pill, and the criteria popup's nameForCuisine. The
    // second was found by this assertion — it had the identical expression.
    expect([...APP_CODE.matchAll(/if \(slug === 'michelin'\) return t\('cat\.michelinBib', lang\);/g)].length).toBe(2);
    expect(APP_CODE, "the server's English edition label is back on a pill")
      .not.toContain('return michelinRemaining.label;');
    expect(APP_CODE, 'the criteria popup went back to the raw English catalogue name')
      .not.toContain('return cuisineNameBySlug.get(slug) || null;');
    // the key it now uses is genuinely translated, not an English row in three files
    expect(I18N).toContain("'cat.michelinBib': 'ミシュラン · ビブグルマン',");
    expect(I18N).toContain("'cat.michelinBib': '米其林 · 必比登',");
  });
});
