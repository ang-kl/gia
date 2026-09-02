// __tests__/locale-cache-keys.test.js — v0.62.897
//
// Operator: *"Have we complete the translation challenges"*.
//
// The audit that answered it found nothing missing in any string table — 32 suites, 931
// tests, every key in every locale. What it found instead were FOUR CALL SITES THAT THREW
// AWAY TRANSLATIONS ALREADY IN THE REPO, and not one of them broke a test when it was
// fixed. That is the finding: a completeness guard can only see the table, and three of
// these four defects live in a cache key.
//
//   1. index.js michelin:enrich  keyed fr-or-en while the narration prompt got the full
//      csLang. Seven locales wrote into one bucket named `en` — a Korean reader's Korean
//      vibe line served to the next English reader. Not a missing translation: a
//      translation delivered to the wrong person.
//   2. index.js cuisine:pool     no language segment at all, caching whole venue objects
//      that v0.62.896 had just made language-specific. Codex found this one on #1834.
//   3. nation-overlay-i18n       66 tourist explainers, no `ko` column.
//   4. index.js touristExplainer read as [lang === 'fr' ? 'fr' : 'en'], so the 396
//      id/ru/de/zh/ja/es strings merged at load were never shown to anyone.
//
// Everything here that CAN be asserted by calling is. The three index.js sites cannot be —
// that file exports nothing — so they are source pins, and each says so rather than
// pretending otherwise.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { narrationLang, narrationLocalisation, APP_LOCALES } = require('../prompt-locale');
const { placesLanguage, poolLanguages, cuisinePoolKey } = require('../places-language');
const { SUPPORTED } = require('../i18n');
const { NATION_OVERLAY } = require('../nation-overlay');
const { readFileSync } = require('fs');
const { join } = require('path');

const read = (p) => readFileSync(join(__dirname, '..', p), 'utf8');
const IDX = read('index.js');

describe('1. the Michelin enrich cache key names the language the narration is in', () => {
  it('narrationLang covers every APP_LOCALE and never collapses to two', () => {
    const collapsed = APP_LOCALES.filter((l) => l !== 'en' && narrationLang(l) === 'en');
    expect(collapsed, 'these locales share the English cache bucket').toEqual([]);
    for (const l of APP_LOCALES) expect(narrationLang(l), l).toBe(l);
  });

  it('and it agrees with the prompt, because a key is a claim about the prose', () => {
    // The whole defect was two opinions about one fact. Same predicate, so they cannot
    // disagree: narrationLang returns 'en' exactly when the LOCALISATION block is empty.
    for (const l of [...APP_LOCALES, 'pt', 'xx', '', undefined]) {
      const instructed = narrationLocalisation(l) !== '';
      expect(narrationLang(l) !== 'en', String(l)).toBe(instructed);
    }
  });

  it('an unshipped locale is stored as English rather than under its own name', () => {
    for (const bad of ['pt', 'xx', '', null, undefined]) expect(narrationLang(bad)).toBe('en');
  });

  it('the key uses it, and the version was bumped to retire the poisoned bucket', () => {
    // SOURCE PIN, and named as one: this is a template literal inside index.js, which has
    // no module.exports. What it guards is that the fix is not half-done — routing new
    // writes correctly while leaving a week of Korean-filed-as-English being served.
    expect(IDX).toMatch(/const enrichLang = narrationLang\(csLang\)/);
    expect(IDX).toMatch(/michelin:enrich:v3:\$\{enrichLang\}/);
    expect(IDX, 'the v2 bucket is contaminated and must not be read again').not.toMatch(/michelin:enrich:v2:/);
  });
});

describe('2. the cuisine pool key carries the Places language', () => {
  it('two languages, same criteria, are two different pools', () => {
    const a = cuisinePoolKey(42, 'abc123', 'ko', 0);
    const b = cuisinePoolKey(42, 'abc123', 'en', 0);
    expect(a).not.toBe(b);
    // …and the segments stay distinguishable: a language must not be able to impersonate
    // a criteria hash or a variant index by colliding on the joined string.
    expect(a).toBe('cuisine:pool:42:abc123:ko:v0');
  });

  it('and two criteria, same language, are still two different pools', () => {
    expect(cuisinePoolKey(42, 'abc', 'ko', 0)).not.toBe(cuisinePoolKey(42, 'def', 'ko', 0));
    expect(cuisinePoolKey(42, 'abc', 'ko', 0)).not.toBe(cuisinePoolKey(42, 'abc', 'ko', 1));
    expect(cuisinePoolKey(1, 'abc', 'ko', 0)).not.toBe(cuisinePoolKey(2, 'abc', 'ko', 0));
  });

  it('the reset list is DERIVED from SUPPORTED, so a tenth locale cannot be forgotten', () => {
    const expected = [...new Set(SUPPORTED.map((l) => placesLanguage(l)))];
    expect(poolLanguages()).toEqual(expected);
    expect(poolLanguages()).toContain('ko');
    expect(poolLanguages()).toContain('zh-CN');
    // Deduped: two app locales mapping to one Places code must not delete twice.
    expect(new Set(poolLanguages()).size).toBe(poolLanguages().length);
  });

  it('and ↺ Start over clears every language, not just the current one', () => {
    // SOURCE PIN plus a SCOPE check, and the scope check is the point. The first version
    // of this loop wrote `SUPPORTED.map(...)` inside index.js, where SUPPORTED is NOT in
    // module scope — every use there is a local require. It would have thrown a
    // ReferenceError into a swallowing catch and ↺ Start over would have silently stopped
    // clearing pools. `node --check` passed on it: a syntax check cannot see scope.
    expect(IDX).toMatch(/for \(const pl of poolLanguages\(\)\)/);
    expect(IDX).toMatch(/redis\.del\(cuisinePoolKey\(chatId, criteriaHash, pl, v\)\)/);
    const resetBody = /async function resetSeenSet\(chatId, criteriaHash\) \{[\s\S]*?\n\}/.exec(IDX);
    expect(resetBody, 'resetSeenSet not found').toBeTruthy();
    expect(resetBody[0], 'a bare SUPPORTED here is a ReferenceError, not a reference')
      .not.toMatch(/\bSUPPORTED\b/);
    // The read site keys on the reader's own language.
    expect(IDX).toMatch(/cuisinePoolKey\(csChatId, cuisineSearchHash, placesLanguage\(csLang\), vIdx\)/);
    expect(IDX, 'a language-blind pool key is back').not.toMatch(/cuisine:pool:\$\{[a-zA-Z]+\}:\$\{[a-zA-Z]+\}:v/);
  });
});

describe('3. every tourist explainer speaks all nine locales', () => {
  const ENTRIES = Object.entries(NATION_OVERLAY)
    .filter(([, v]) => v && v.touristExplainer && v.touristExplainer.en);

  it('66 explainers, and none of them falls through to English', () => {
    expect(ENTRIES).toHaveLength(66);
    const gaps = [];
    for (const [slug, v] of ENTRIES) {
      for (const l of SUPPORTED) {
        const s = v.touristExplainer[l];
        if (typeof s !== 'string' || !s.trim()) gaps.push(`${slug}/${l}`);
      }
    }
    expect(gaps, 'these readers get the English explainer').toEqual([]);
  });

  it('the Korean is Korean — no kana, Cyrillic, Han, or replacement character', () => {
    const bad = [];
    for (const [slug, v] of ENTRIES) {
      const s = v.touristExplainer.ko;
      if (!/[가-힣]/.test(s)) bad.push(`${slug}: no Hangul`);
      if (/[぀-ヿ]/.test(s)) bad.push(`${slug}: kana`);
      if (/[Ѐ-ӿ]/.test(s)) bad.push(`${slug}: Cyrillic`);
      if (/[一-鿿]/.test(s)) bad.push(`${slug}: Han`);
      if (s.includes('�')) bad.push(`${slug}: replacement char`);
      if (s !== s.trim()) bad.push(`${slug}: untrimmed`);
    }
    expect(bad).toEqual([]);
  });

  it('and none is an English paragraph left in place', () => {
    // Four or more consecutive Latin words is the shape of an untranslated cell. Venue and
    // dish names survive it because they sit against Hangul particles or commas — which is
    // why the threshold is four and not two.
    const bad = ENTRIES
      .filter(([, v]) => /\b[A-Za-z][a-z]*(?:\s+[A-Za-z][a-z]*){3,}\b/.test(v.touristExplainer.ko))
      .map(([k]) => k);
    expect(bad).toEqual([]);
  });

  it('the length band is MEASURED from the corpus, not guessed at', () => {
    // Measured across all 66: ko/en ratio runs 0.456 (sichuan) to 0.686 (dessert). The band
    // below is that range with a margin, which is narrow enough to catch a truncated cell
    // or a doubled one. A band picked by eye — [0.25, 1.4] was the first draft — passes
    // both, which makes it a check that cannot fail.
    for (const [slug, v] of ENTRIES) {
      const r = v.touristExplainer.ko.length / v.touristExplainer.en.length;
      expect(r, `${slug} ratio ${r.toFixed(3)}`).toBeGreaterThan(0.35);
      expect(r, `${slug} ratio ${r.toFixed(3)}`).toBeLessThan(0.85);
    }
  });

  it('and no two explainers share a Korean string', () => {
    const seen = new Map();
    const dupes = [];
    for (const [slug, v] of ENTRIES) {
      const s = v.touristExplainer.ko;
      if (seen.has(s)) dupes.push(`${slug} == ${seen.get(s)}`); else seen.set(s, slug);
    }
    expect(dupes, 'a copy-paste that pasted the wrong row').toEqual([]);
  });
});

describe('4. the bot SHOWS the explainer it loaded', () => {
  it('the read site takes the reader locale, not one of two', () => {
    // SOURCE PIN. The merge at nation-overlay.js:3166 is real and testable above; what
    // cannot be tested by calling is the one line in index.js that consumes it, and that
    // line is where 396 authored strings were being discarded.
    expect(IDX).toMatch(/const tourist = \(te && \(te\[lang\] \?\? te\.en\)\) \|\| ''/);
    expect(IDX, 'the fr-or-en collapse is back on touristExplainer')
      .not.toMatch(/touristExplainer\?\.\[lang === 'fr'/);
  });

  it('and the merge really does reach the overlay, so the pin has something to show', () => {
    // Asserted by calling: these six locales exist ONLY in the generated overlay, never in
    // nation-overlay.js itself, so their presence proves the load-time merge ran.
    for (const l of ['id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']) {
      expect(NATION_OVERLAY.korean.touristExplainer[l], l).toBeTruthy();
    }
    expect(NATION_OVERLAY.korean.touristExplainer.fr).toBeTruthy();   // hand-authored, in the source
  });
});
