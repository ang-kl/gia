// dish-names-i18n.test.js — v0.62.862
//
// Operator, 31-08 '26: "translate all the dishes into 6 languages", after a
// screenshot of 更多新加坡经典 sitting over an all-English dish list.
//
// The interesting assertions are NOT "every key has eight locales" — that only
// proves the file is rectangular. They are the ones that catch a translation
// which is confidently wrong: script contamination, a zh name that contradicts
// the curated one already in the repo, and a display name leaking into the
// search key.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';
const require_ = createRequire(import.meta.url);

const { DISH_NAMES } = require_('../dish-names-i18n.js');
const { NATION_OVERLAY } = require_('../nation-overlay.js');
const { COMMUNITY } = require_('../dish-community.js');
const { namesFor } = require_('../dish-names-i18n.js');
const { platesForCity } = require_('../city-plates.js');

const LOCALES = ['fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;
const CJK = /[぀-ヿ㐀-鿿]/;

// "100 Plus" is a brand printed in Latin on the can; a Cyrillic rendering would
// be wrong, not more localised. Listed explicitly so the rule stays strict.
const LATIN_BRAND_OK = new Set(['100 plus (isotonic)']);

describe('dish names — coverage', () => {
  const sgNames = [...new Set(NATION_OVERLAY.singaporean.iconicDishes.map((d) => d.name))];

  it('covers every distinct Singapore classic', () => {
    const missing = sgNames.filter((n) => !DISH_NAMES[n]);
    expect(missing, `untranslated: ${missing.join(', ')}`).toEqual([]);
  });

  it('carries all seven non-English locales for every dish', () => {
    for (const [dish, v] of Object.entries(DISH_NAMES)) {
      for (const l of LOCALES) {
        expect(typeof v[l], `${dish}.${l}`).toBe('string');
        expect(v[l].trim(), `${dish}.${l} is empty`).not.toBe('');
      }
    }
  });

  it('has no key that is not a real dish (a typo’d key is silently dead)', () => {
    const known = new Set(sgNames);
    const orphans = Object.keys(DISH_NAMES).filter((k) => !known.has(k));
    expect(orphans, `keys matching no dish: ${orphans.join(', ')}`).toEqual([]);
  });
});

describe('dish names — script integrity', () => {
  // A stray Latin fragment inside a Cyrillic string is invisible when reading
  // and obvious when rendered. Three shipped in the first draft of this file
  // ("по-теочeuски" — Latin "eu" inside Cyrillic), all caught here, not by eye.
  it('has no Latin letters stranded inside a Cyrillic name', () => {
    const bad = Object.entries(DISH_NAMES)
      .filter(([k, v]) => CYRILLIC.test(v.ru) && LATIN.test(v.ru) && !LATIN_BRAND_OK.has(k))
      .map(([k, v]) => `${k} => ${v.ru}`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('keeps CJK out of the Latin-script locales', () => {
    const bad = [];
    for (const [k, v] of Object.entries(DISH_NAMES)) {
      for (const l of ['fr', 'id', 'de', 'es']) {
        if (CJK.test(v[l])) bad.push(`${k}.${l} => ${v[l]}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('gives zh an actual Chinese name', () => {
    const bad = Object.entries(DISH_NAMES)
      .filter(([, v]) => !CJK.test(v.zh))
      .map(([k, v]) => `${k} => ${v.zh}`);
    expect(bad, bad.join(' | ')).toEqual([]);
  });
});

describe('dish names — zh agrees with the curated local name', () => {
  // nation-overlay.js already carries `local` for many dishes, authored against
  // the dish's own sources. Inventing a second, competing Chinese name here
  // would be a regression wearing coverage as a disguise.
  it('never contradicts an existing curated local name', () => {
    const disagree = [];
    let checked = 0;
    for (const d of NATION_OVERLAY.singaporean.iconicDishes) {
      const mine = DISH_NAMES[d.name] && DISH_NAMES[d.name].zh;
      if (!d.local || !mine) continue;
      checked += 1;
      if (mine !== d.local) disagree.push(`${d.name}: curated ${d.local} vs ${mine}`);
    }
    expect(checked, 'no dish had both a curated local name and a zh — the join broke')
      .toBeGreaterThan(50);
    expect(disagree, disagree.join(' | ')).toEqual([]);
  });
});

describe('community sub-headers are localised', () => {
  // The operator's screenshot showed "— Chinese —" in English under a Chinese
  // header, because COMMUNITY carried en/fr only.
  it('every community label has all eight locales', () => {
    for (const [key, v] of Object.entries(COMMUNITY)) {
      for (const l of ['en', ...LOCALES]) {
        expect(typeof v[l], `${key}.${l}`).toBe('string');
        expect(v[l].trim(), `${key}.${l} is empty`).not.toBe('');
      }
    }
  });
});

describe('the names actually reach the payload the app renders', () => {
  // This is the assertion that matters, and the one the table tests above CANNOT
  // make. They all passed while the feature was broken for 17 of 162 dishes:
  // city-plates.js looked the name up with `DISH_NAMES[name.toLowerCase()]`, but
  // the keys are written as nation-overlay.js writes them, so every dish with a
  // capital missed — "chicken curry SG style", "kopi-O", "teh-C". A green table
  // and a broken feature. Only rendering the real payload showed it.
  const dishes = (platesForCity('Singapore').classicGroups || []).flatMap((g) => g.dishes || []);

  it('has the Singapore plate the operator screenshotted', () => {
    expect(dishes.length).toBe(162);
  });

  it('attaches nameI18n to EVERY classic in that plate', () => {
    const missing = dishes.filter((d) => !d.nameI18n).map((d) => d.dish);
    expect(missing, `still English: ${missing.join(', ')}`).toEqual([]);
  });

  it('folds case on both sides of the lookup', () => {
    // The exact shape of the 17-dish miss, pinned.
    for (const n of ['kopi-O', 'KOPI-O', 'chicken curry SG style', 'CHICKEN CURRY sg STYLE']) {
      expect(namesFor(n), n).toBeTruthy();
    }
    expect(namesFor('no such dish at all')).toBeNull();
    expect(namesFor(null)).toBeNull();
  });

  it('never lets a translated name displace the search key', () => {
    // `d.dish` is what onTryDish() searches for and what the explain-card keys
    // on. If a translation ever overwrote it, the row would stop finding food.
    for (const d of dishes) {
      expect(typeof d.dish).toBe('string');
      expect(/[぀-ヿ㐀-鿿Ѐ-ӿ]/.test(d.dish), `${d.dish} is no longer a Latin search key`).toBe(false);
    }
  });
});
