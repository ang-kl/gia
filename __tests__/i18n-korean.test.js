// __tests__/i18n-korean.test.js — K1 of the Korean arc.
//
// Korean is NOT an app locale yet. `SUPPORTED` is still the eight, `pickLang('ko')` returns 'en',
// and `t(key, 'ko')` serves English — so every guard that already ships is BLIND to the `ko`
// column this PR adds. That is deliberate (the plan stages content first and flips the lists last),
// but it means the content arrives unguarded unless this file guards it.
//
// WHY THE FLIP IS SAFE TO DEFER. Every completeness guard in the repo is presence-based: it
// iterates a hardcoded locale list and asserts each is present and non-empty. Not one rejects an
// extra key. So `ko:` can sit in all 405 entries with the suite green, and K11's flip turns the
// existing guards on over content that is already complete.
//
// THE SURFACE IS 405, NOT 403. The plan said 403 because the extractor's key pattern read
// `(?:[a-z]+\.)+` and silently skipped every key with a camelCase or digit-bearing segment —
// `wake2.body`, `hidden.anchorAmbiguous.got`, `loc.searchArea.set` and nine others. The count is
// asserted below so the same undercount cannot recur quietly.
//
// The Korean is hand-written. No paid translation API was used, per the operator's standing
// instruction. No native speaker has read it; that is stated because it is true, not because a
// test can fix it.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const ROOT = join(__dirname, '..');
const { t, pickLang, SUPPORTED } = require('../i18n');

// The module exports t()/tn() but not STRINGS, and t() cannot reach `ko` while pickLang rejects
// it — so the table is read directly rather than through the accessor that is designed to hide it.
const STRINGS = (() => {
  const sandbox = { module: { exports: {} }, exports: {}, require, console, process, __dirname: ROOT, __filename: join(ROOT, 'i18n.js') };
  vm.createContext(sandbox);
  vm.runInContext(readFileSync(join(ROOT, 'i18n.js'), 'utf8') + ';module.exports.__STRINGS = STRINGS;', sandbox, { filename: 'i18n.js' });
  return sandbox.module.exports.__STRINGS;
})();

const ENTRIES = Object.entries(STRINGS).filter(([, v]) => v && typeof v === 'object' && typeof v.en === 'string');
const HANGUL = /[가-힣ᄀ-ᇿ㄰-ㆎ]/;
const TAG = /<\/?(?:a|b|i|u|s|code|pre|br|span|tg-spoiler)(?:\s[^>]*)?>/g;

// The language menu prints each language's name IN that language — 🇷🇺 Русский reads the same to a
// Korean reader as to a French one. Naming the eight keys beats relaxing the rule: a NEW stray
// script, or a NEW untranslated cell, still fails.
const OWN_NAME_KEYS = new Set(SUPPORTED.map((l) => `language.btn.${l}`));

// `bot.lang.set.<code>` is keyed by the TARGET language and read as `t('bot.lang.set.ja', 'ja')`,
// so its value is written ONCE, in that target language, and the six locales after fr simply do
// not have a column. A Korean column was inserted here by the first pass and then removed: it
// could never be reached (only lang='ko' reads it, and lang always equals the code in the key),
// and if it ever were, it would say "language set to Japanese" in Korean. Parity with the
// siblings here means having no column, not having an unreachable one.
const TARGET_KEYED = new Set(SUPPORTED.map((l) => `bot.lang.set.${l}`));

describe('the Korean column is complete for bot i18n.js', () => {
  it('covers every entry in the table, and the table is the size we measured', () => {
    expect(ENTRIES.length, 'the surface is 439 units — 405 at K1, +2 at K6, +15 at v0.62.884, +16 at v0.62.885 (14 bot.about.* plus the hint and the profile blurb), +1 at v0.62.893 (bot.error.generic)').toBe(439);
    const missing = ENTRIES.filter(([k, v]) => !TARGET_KEYED.has(k) && (!v.ko || !String(v.ko).trim())).map(([k]) => k);
    expect(missing, 'these entries have no Korean').toEqual([]);
    // v0.62.893 — 429 -> 430 and 420 -> 421: `bot.error.generic` ships complete,
    // so ko and the other six all gain exactly one. They move TOGETHER, which is
    // what proves the new key was not added to some locales and not others.
    expect(ENTRIES.filter(([, v]) => typeof v.ko === 'string').length).toBe(430);
  });

  it('and the target-keyed family stays uncolumned, as its six other locales are', () => {
    for (const k of TARGET_KEYED) {
      expect(STRINGS[k], `${k} is missing`).toBeTruthy();
      expect(STRINGS[k].ko, `${k} gained an unreachable ko column`).toBeUndefined();
      expect(STRINGS[k].ja, `${k} should have no ja column either — the value lives in en`).toBeUndefined();
    }
  });

  it('and does not disturb a single value in the eight locales that ship', () => {
    // The `ko` values were spliced in by script. A splice that also rewrote a neighbouring value
    // would be invisible in a 405-entry diff, so the eight are counted rather than eyeballed.
    // en and fr carry all 405; the other six carry 389 — the 16 that differ are the two
    // language-menu families above, which are correct as they stand.
    const count = (l) => ENTRIES.filter(([, v]) => typeof v[l] === 'string' && v[l].trim()).length;
    expect({ en: count('en'), fr: count('fr') }).toEqual({ en: 439, fr: 439 });
    // v0.62.884 — 389 + 15. bot.langname.ko is in that fifteen: the family had
    // stood at eight since K6, and widening /start's ['en','fr'] client-language
    // gate is what would have put the literal "bot.langname.ko" in front of a
    // reader. The gate was hiding the gap, not preventing it.
    for (const l of ['id', 'ru', 'de', 'zh', 'ja', 'es']) expect(count(l), `${l} lost values when ko was inserted`).toBe(421);
  });
});

describe('each Korean value keeps the structure of the English it replaces', () => {
  // Placeholders, HTML tags and the literal backslash escapes this file carries are all invisible
  // to a reader checking the prose. Every one of them is a runtime break if it drifts.
  const sig = (s) => ({
    placeholders: [...s.matchAll(/\{[\w-]+\}/g)].map((m) => m[0]).sort().join(','),
    tags: (s.match(TAG) || []).join(''),
    realNewlines: (s.match(/\n/g) || []).length,
  });

  it('placeholder names match, so no cell renders a literal {foo}', () => {
    const bad = [];
    for (const [k, v] of ENTRIES) {
      if (typeof v.ko !== 'string') continue;
      if (sig(v.en).placeholders !== sig(v.ko).placeholders) bad.push(`${k}: en=${sig(v.en).placeholders} ko=${sig(v.ko).placeholders}`);
    }
    expect(bad).toEqual([]);
  });

  it('HTML tags match, so no message reaches Telegram with an unclosed <b> or <i>', () => {
    const bad = [];
    for (const [k, v] of ENTRIES) {
      if (typeof v.ko !== 'string') continue;
      if (sig(v.en).tags !== sig(v.ko).tags) bad.push(`${k}: en=${sig(v.en).tags} ko=${sig(v.ko).tags}`);
    }
    expect(bad).toEqual([]);
  });

  it('newline shape matches, and the two halves of this file genuinely differ', () => {
    // 17 entries carry a LITERAL backslash-n rather than a newline — an artefact of the
    // two-locale sweep, present in all eight locales including English, and left alone here
    // because K1 adds a locale rather than repairing 19 keys across 8 columns. Korean matches
    // whatever its siblings do, so it is neither better nor worse than what ships.
    const bad = [];
    for (const [k, v] of ENTRIES) {
      if (typeof v.ko !== 'string') continue;
      if (sig(v.en).realNewlines !== sig(v.ko).realNewlines) bad.push(k);
      if ((v.en.match(/\\n/g) || []).length !== (v.ko.match(/\\n/g) || []).length) bad.push(`${k} (literal)`);
    }
    expect(bad).toEqual([]);
  });
});

describe('script integrity, including the direction Korean adds', () => {
  it('no Korean value carries Cyrillic or Japanese kana', () => {
    // The class that has fired five times in this project: a word left behind from the locale
    // that was being copied. Latin cannot be forbidden — Soleat, MRT, LTA, /cuisine and the
    // typed examples are all legitimately Latin — so the rule is aimed at the scripts that have
    // no business here at all.
    const bad = [];
    for (const [k, v] of ENTRIES) {
      if (OWN_NAME_KEYS.has(k) || typeof v.ko !== 'string') continue;
      if (/[Ѐ-ӿ]/.test(v.ko)) bad.push(`${k}: Cyrillic`);
      if (/[぀-ヿ]/.test(v.ko)) bad.push(`${k}: kana`);
      if (/�/.test(v.ko)) bad.push(`${k}: U+FFFD`);
    }
    expect(bad).toEqual([]);
  });

  it('a value with no Hangul is a defect unless the English has nothing to translate', () => {
    // The Korean analogue of "identical to en": a cell nobody filled looks like a cell that
    // needed no filling. 13 entries legitimately carry no Hangul — pure-placeholder rows like
    // `· {desc} ({road}) — {dist}`, a bare ↓, and the language menu. The first group is
    // recognised by RULE (strip placeholders, tags and punctuation; if no letter survives in the
    // English, none is owed in the Korean); only the menu is listed by name.
    const translatable = (s) => /[A-Za-z]/.test(
      s.replace(TAG, ' ').replace(/\{[\w-]+\}/g, ' ').replace(/https?:\/\/\S+/g, ' ')
    );
    const bad = [];
    let checkedWithProse = 0;
    for (const [k, v] of ENTRIES) {
      if (OWN_NAME_KEYS.has(k) || typeof v.ko !== 'string') continue;
      if (!translatable(v.en)) continue;
      checkedWithProse++;
      if (!HANGUL.test(v.ko)) bad.push(k);
    }
    expect(bad, 'these read as untranslated cells').toEqual([]);
    // Non-vacuity in both directions: the rule must be exercised, and the named exemption list
    // must stay the eight it is — an exemption list that can grow is a guard that can be retired
    // one key at a time.
    expect(checkedWithProse).toBeGreaterThanOrEqual(370);
    expect(OWN_NAME_KEYS.size).toBe(9);
  });
});

describe('K6 — Korean is OFFERED now, which is what these assertions used to deny', () => {
  // THIS BLOCK IS THE INVERSE OF WHAT IT SAID THROUGH K1–K5, and the inversion is the point.
  // While the content was staged it asserted `SUPPORTED` did NOT contain 'ko' and that t()
  // still served English — the guarantee that 6,277 Korean cells could sit on production
  // unreachable while every unflipped guard stayed honest. K6 removes that guarantee on
  // purpose. Deleting these tests would have left the flip unwitnessed; inverting them makes
  // the same lines prove the opposite fact, and a revert of K6 fails here rather than silently.
  it('SUPPORTED carries Korean, appended last so the existing order is untouched', () => {
    expect(SUPPORTED).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
    expect(SUPPORTED).toContain('ko');
    // Appended, not inserted: the eight that shipped keep their positions, so anything that
    // indexes into this array — a keyboard row, a column order — is unmoved by the flip.
    expect(SUPPORTED.slice(0, 8)).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']);
    expect(SUPPORTED[8]).toBe('ko');
  });

  it('and t() now serves the Korean value rather than falling back to English', () => {
    // The exact assertion that used to prove the content was inert, read the other way.
    expect(pickLang('ko')).toBe('ko');
    expect(t('bot.index.cancel', 'ko')).not.toBe(t('bot.index.cancel', 'en'));
    expect(t('bot.index.cancel', 'ko')).toBe(STRINGS['bot.index.cancel'].ko);
  });

  it('and the two keys the flip needed exist and resolve', () => {
    // `language.btn.ko` is the button a user taps; `bot.lang.set.ko` is the confirmation they
    // get back. Without both, the flip offers a language it cannot acknowledge.
    expect(STRINGS['language.btn.ko']).toBeTruthy();
    expect(STRINGS['bot.lang.set.ko']).toBeTruthy();
    expect(t('language.btn.ko', 'en')).toContain('한국어');
    expect(t('bot.lang.set.ko', 'ko')).toMatch(/한국어/);
    // The confirmation is target-keyed like its eight siblings: written once, in Korean, and
    // carrying no per-locale columns. A `ko` column here would be unreachable.
    expect(STRINGS['bot.lang.set.ko'].ko).toBeUndefined();
  });
});
