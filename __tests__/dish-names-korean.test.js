// __tests__/dish-names-korean.test.js — K3 of the Korean arc: the dish-name table.
//
// 1,612 distinct names across 66 cuisines. `ko` is NOT in any SUPPORTED list yet, so
// `dish-names-i18n.test.js` — which iterates a hardcoded `LOCALES` of the seven — cannot see this
// column. The arc stages content first and flips the lists last, which keeps the suite green
// throughout; it also means the content arrives unguarded unless this file guards it.
//
// THE KEY IS THE ENGLISH. There is no `en` column to compare against, so the checks here are
// different from K1's and K2's: script integrity, rule 3 where a curated name exists, and the
// completeness guarantee stated over the OVERLAY rather than over this table — because a dish added
// to a cuisine nobody remembered to list is exactly the gap the hand-maintained `COVERED` list in
// the sibling file already missed once.
//
// RULE 2 TRANSLITERATES HERE, IT DOES NOT KEEP. Hangul is not Latin, so Korean behaves like
// `zh`/`ja`: `laksa` is 락사, not `Laksa`. The batch-7b `fusion` protected-token guard is Latin-only
// for exactly this reason and is deliberately NOT extended to `ko`.
//
// Hand-written, no paid translation API, except the 30 that rule 3 makes free. No native speaker
// has read any of it.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { DISH_NAMES, namesFor } = require('../dish-names-i18n');
const NATION_OVERLAY = require('../nation-overlay').NATION_OVERLAY;
const LOCAL_MAP = require('../nation-overlay-local.generated.js');

const HANGUL = /[가-힣ᄀ-ᇿ㄰-ㆎ]/;
// Latin that is correct inside a Korean dish name: initialisms and grades printed in Latin
// worldwide, exactly as `XO` is allowlisted in the zh column of the sibling file.
const LATIN_OK = new Set(['IPA', 'XO']);
const entries = Object.entries(DISH_NAMES);

describe('the Korean column is complete for the dish-name table', () => {
  it('covers every entry, and the table is the size the arc has been measuring', () => {
    expect(entries.length, '1,612 distinct dish names — the figure this arc closed on').toBe(1612);
    const missing = entries.filter(([, v]) => !v.ko || !String(v.ko).trim()).map(([k]) => k);
    expect(missing, 'these dishes have no Korean').toEqual([]);
  });

  it('and every dish the overlay actually serves resolves to a Korean name', () => {
    // Stated over the OVERLAY, not over this table. `COVERED` in the sibling file is
    // hand-maintained, and a dish added to a slug nobody listed slips past it — the same class of
    // gap that hid 17 dishes at v0.62.862. This iterates every slug there is.
    const untranslated = [];
    let slugs = 0, dishes = 0;
    for (const [slug, nation] of Object.entries(NATION_OVERLAY)) {
      if (!nation || !Array.isArray(nation.iconicDishes)) continue;
      slugs++;
      for (const d of nation.iconicDishes) {
        dishes++;
        const names = namesFor(d.name, slug);
        if (!names || !names.ko || !String(names.ko).trim()) untranslated.push(`${slug}::${d.name}`);
      }
    }
    expect(untranslated, 'these are served but have no Korean').toEqual([]);
    // Non-vacuity on both dimensions: a failed import cannot pass this by iterating nothing.
    expect(slugs).toBeGreaterThanOrEqual(60);
    expect(dishes).toBeGreaterThanOrEqual(1500);
  });

  it('and the eight columns that shipped before it are untouched', () => {
    // The `ko` values were spliced in by script. A splice that also rewrote a neighbouring value
    // would be invisible in a 1,612-entry diff, so the seven are counted rather than eyeballed.
    for (const l of ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']) {
      const gaps = entries.filter(([, v]) => typeof v[l] !== 'string' || !v[l].trim()).map(([k]) => k);
      expect(gaps, `${l} lost values when ko was inserted`).toEqual([]);
    }
  });
});

describe('rule 3 — the curated name is reused, never reinvented', () => {
  // All 30 `korean` dishes carry a Hangul `local` in nation-overlay-local.generated.js. Those 30
  // Korean values are free AND authoritative, and this is the assertion that keeps them so.
  // Note where they live: a grep for a Hangul `local:` over nation-overlay.js finds NOTHING,
  // because the value is folded on at load. Read data through the module, not the file.
  const curated = Object.entries(LOCAL_MAP)
    .filter(([, v]) => HANGUL.test(String(v)))
    .map(([k, v]) => [k.split('::')[1], String(v)]);

  it('every dish with a curated Hangul name uses exactly that name', () => {
    const wrong = [];
    for (const [dish, local] of curated) {
      const mine = namesFor(dish);
      if (!mine) { wrong.push(`${dish}: not in the table at all`); continue; }
      if (mine.ko !== local) wrong.push(`${dish}: curated ${JSON.stringify(local)} but wrote ${JSON.stringify(mine.ko)}`);
    }
    expect(wrong).toEqual([]);
    expect(curated.length, 'the join broke — no curated Hangul name found').toBe(30);
  });
});

describe('script integrity, including the direction Korean adds', () => {
  it('no Korean value carries Cyrillic, kana, Han, or a replacement character', () => {
    // The class that has fired repeatedly here: a word left behind from the locale being copied.
    // Han matters as much as kana — a Korean cell holding 拌饭 would be the zh value pasted across,
    // and it reads as plausible to anyone who does not know the script.
    const bad = [];
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      if (/[Ѐ-ӿ]/.test(v.ko)) bad.push(`${k}: Cyrillic`);
      if (/[぀-ヿ]/.test(v.ko)) bad.push(`${k}: kana`);
      if (/[一-鿿]/.test(v.ko)) bad.push(`${k}: Han`);
      if (/�/.test(v.ko)) bad.push(`${k}: U+FFFD`);
    }
    expect(bad).toEqual([]);
  });

  it('no Korean value is left in Latin, which is what rule 2 means here', () => {
    // Two real slips were caught this way while the batches were being written — `rawon` came out
    // as "라won" and `barberry polo` as "잘barberry 폴로". Both are keyboard slips rather than
    // translation errors, and neither is visible to a reader who does not read Hangul.
    const bad = []; let checked = 0;
    for (const [k, v] of entries) {
      if (typeof v.ko !== 'string') continue;
      checked++;
      // Strip the allowlisted initialisms first, then ask what is left. `ipa` is wholly "IPA",
      // which is neither stray Latin nor a missing translation — ja writes it "IPA" too.
      const rest = v.ko.replace(/[A-Za-z][A-Za-z'&]*/g, (w) => (LATIN_OK.has(w) ? '' : w));
      const latin = rest.match(/[A-Za-z][A-Za-z'&]*/g) || [];
      if (latin.length) bad.push(`${k}: ${JSON.stringify(v.ko)} — stray Latin ${JSON.stringify(latin)}`);
      else if (!HANGUL.test(v.ko) && /[A-Za-z]/.test(rest)) bad.push(`${k}: ${JSON.stringify(v.ko)} — no Hangul`);
    }
    expect(bad).toEqual([]);
    expect(checked).toBe(1612);
    // The allowlist must stay small enough to be read: a list that can grow is a guard that can be
    // retired one entry at a time.
    expect(LATIN_OK.size).toBeLessThanOrEqual(4);
  });
});

describe('K3 changes content only', () => {
  it('ko is still not an app locale, which is what makes staging safe', () => {
    expect(require('../i18n').SUPPORTED).not.toContain('ko');
    expect(require('../user-prefs').SUPPORTED).not.toContain('ko');
  });

  it('and namesFor still prefers a slug-qualified name over the bare one', () => {
    // The lookup this table is read through. If it regressed, every assertion above would still
    // pass while the app served the wrong name.
    expect(namesFor('lapsi', 'nepalese').ko).toBe(DISH_NAMES['nepalese::lapsi'].ko);
    expect(namesFor('lapsi', 'nepalese').ko).not.toBe(DISH_NAMES['lapsi'].ko);
    expect(namesFor('bibimbap', 'korean').ko).toBe('비빔밥');
  });
});
