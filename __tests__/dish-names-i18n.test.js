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

// v0.62.863 — the suite was Singapore-only; each new batch of nations gets the
// SAME four guarantees by being listed here, rather than a fresh set of
// hand-written assertions that quietly omit one.
const COVERED = [
  'singaporean', 'cantonese', 'japanese', 'korean',
  'thai', 'malaysian', 'indonesian', 'peranakan',
];
const distinctDishes = (slug) =>
  [...new Set((NATION_OVERLAY[slug].iconicDishes || []).map((d) => d.name))];
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;
const CJK = /[぀-ヿ㐀-鿿]/;

// "100 Plus" is a brand printed in Latin on the can; a Cyrillic rendering would
// be wrong, not more localised. Listed explicitly so the rule stays strict.
const LATIN_BRAND_OK = new Set(['100 plus (isotonic)']);

describe('dish names — coverage', () => {
  const sgNames = [...new Set(NATION_OVERLAY.singaporean.iconicDishes.map((d) => d.name))];

  it.each(COVERED)('covers every distinct classic in %s', (slug) => {
    const missing = distinctDishes(slug).filter((n) => !namesFor(n));
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
    const known = new Set(COVERED.flatMap(distinctDishes));
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

  // Added after a heredoc mangled one Cyrillic value into "Тве\uFFFD\uFFFDжан ччигэ".
  // A replacement character renders as a black diamond and is invisible in a diff
  // scanned by eye, so it is a machine check now.
  it('has no replacement characters anywhere', () => {
    const bad = [];
    for (const [k, v] of Object.entries(DISH_NAMES)) {
      for (const [l, str] of Object.entries(v)) {
        if (str.includes('\uFFFD')) bad.push(`${k}.${l} => ${str}`);
      }
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('gives ja kana or kanji', () => {
    const bad = Object.entries(DISH_NAMES)
      .filter(([, v]) => !CJK.test(v.ja))
      .map(([k, v]) => `${k} => ${v.ja}`);
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
  // Which locale a curated `local` constrains depends on the NATION, not on the
  // script. The first draft of this inferred it from the script — "pure Han
  // therefore Chinese" — and it failed on true data: Japan's 蕎麦, 餅, 日本酒 and
  // 親子丼 are Japanese words written in kanji, and the Chinese names really are
  // 荞麦面, 麻糬, 清酒, 亲子丼. The test was wrong, not the table.
  //
  // Korean (비빔밥) and Thai (ผัดไทย) `local` values are in scripts no app locale
  // uses, so they constrain nothing. Asserting against them would be noise
  // dressed as rigour.
  const LOCAL_WRITES = {
    singaporean: 'zh', cantonese: 'zh', peranakan: 'zh',
    japanese: 'ja',
    korean: null, thai: null, malaysian: null, indonesian: null,
  };

  it('never invents a name where a curated one exists', () => {
    // A dish name is one key here but can be curated by SEVERAL nations, and they
    // do not always agree: `claypot frog leg porridge` is 砂煲田鸡粥 in the
    // Singapore overlay and 田鸡粥 in the Cantonese one. One global entry cannot
    // equal both, so the rule is membership in the curated SET, not equality with
    // whichever nation was iterated last — which would make the result depend on
    // key order.
    const curated = {};   // `${dish}|${locale}` -> Set of curated values
    for (const [slug, locale] of Object.entries(LOCAL_WRITES)) {
      if (!locale) continue;
      for (const d of NATION_OVERLAY[slug].iconicDishes) {
        if (!d.local || !namesFor(d.name)) continue;
        const k = `${d.name.toLowerCase()}|${locale}`;
        (curated[k] = curated[k] || new Set()).add(d.local);
      }
    }
    const invented = [];
    for (const [k, values] of Object.entries(curated)) {
      const [dish, locale] = k.split('|');
      const mine = namesFor(dish)[locale];
      if (!values.has(mine)) {
        invented.push(`${dish}.${locale}: curated {${[...values].join(', ')}} but wrote ${mine}`);
      }
    }
    expect(Object.keys(curated).length, 'the join broke — no curated pair found')
      .toBeGreaterThan(100);
    expect(invented, invented.join(' | ')).toEqual([]);
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
  // One city per batch nation. A green table proves the file is rectangular; only
  // this proves it is CONNECTED — and last time the difference was 17 dishes.
  const CITIES = ['Singapore', 'Kuala Lumpur', 'George Town', 'Bangkok', 'Tokyo', 'Kyoto'];
  const classicsIn = (city) =>
    ((platesForCity(city) || {}).classicGroups || []).flatMap((g) => g.dishes || []);
  const dishes = classicsIn('Singapore');

  it.each(CITIES)('attaches nameI18n to EVERY classic served for %s', (city) => {
    const list = classicsIn(city);
    expect(list.length, `${city} returned no classics — the plate lookup broke`)
      .toBeGreaterThan(0);
    const missing = list.filter((d) => !d.nameI18n).map((d) => d.dish);
    expect(missing, `${city} still English: ${missing.join(', ')}`).toEqual([]);
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
    for (const d of CITIES.flatMap(classicsIn)) {
      expect(typeof d.dish).toBe('string');
      expect(/[぀-ヿ㐀-鿿Ѐ-ӿ]/.test(d.dish), `${d.dish} is no longer a Latin search key`).toBe(false);
    }
  });
});
