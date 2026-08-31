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
import { readFileSync } from 'node:fs';
import { join as pathJoin, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = pathJoin(dirname(fileURLToPath(import.meta.url)), '..');

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
  // v0.62.864 — batch 2.
  'north-indian', 'south-indian', 'american', 'italian',
  // v0.62.865 — batch 3, first three.
  'chinese', 'sichuan', 'hunan',
  // v0.62.866 — batch 3 complete: the rest of the Chinese family.
  'hong-kong', 'northwestern', 'hakka', 'shanghainese', 'northeastern',
  'macau', 'taiwanese', 'hokkien', 'hainanese', 'teochew',
  // v0.62.867 — batch 4: the Southeast & South Asian set.
  'vietnamese', 'filipino', 'pakistani', 'bengali', 'sri-lankan',
  'gujarati', 'goan', 'nepalese', 'burmese',
];
const distinctDishes = (slug) =>
  [...new Set((NATION_OVERLAY[slug].iconicDishes || []).map((d) => d.name))];
const CYRILLIC = /[Ѐ-ӿ]/;
const LATIN = /[A-Za-z]/;
const CJK = /[぀-ヿ㐀-鿿]/;

// "100 Plus" is a brand printed in Latin on the can; a Cyrillic rendering would
// be wrong, not more localised. Listed explicitly so the rule stays strict.
// Brands printed in Latin on the product. A Cyrillic or kana rendering would be
// wrong, not more localised — "IPA" is "IPA" on a Japanese beer menu too. Listed
// one by one so the rule itself stays strict.
const LATIN_BRAND_OK = new Set([
  '100 plus (isotonic)',      // printed in Latin on the can
  'ipa',                      // "IPA" on a Japanese beer menu too
  'din tai fung dumplings',   // the restaurant chain's own name
  'san miguel beer',          // the brewery's own name
]);

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

  // v0.62.866 — the mirror of the rule above, and it was MISSING. The suite checked
  // Latin stranded in Cyrillic and CJK stranded in Latin, but never Cyrillic stranded
  // in Latin — so `de: 'Brataganз'` (a Cyrillic з on the end of a German word) sailed
  // through, and `de: 'Brathgans'` had already shipped to main at v0.62.862 beside it.
  // A guard that runs one direction only is a guard with a blind side.
  it('keeps Cyrillic out of the Latin-script locales', () => {
    const bad = [];
    for (const [k, v] of Object.entries(DISH_NAMES)) {
      for (const l of ['en', 'fr', 'id', 'de', 'es']) {
        if (v[l] && CYRILLIC.test(v[l])) bad.push(`${k}.${l} => ${v[l]}`);
      }
    }
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
      .filter(([k, v]) => !CJK.test(v.ja) && !LATIN_BRAND_OK.has(k))
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
    // Batch 3 — the Chinese family, whose `local` IS the Chinese name. `macau` is
    // mapped too and contributes nothing: Macanese food is Portuguese-Chinese and
    // carries no `local` at all, which is correct rather than an omission.
    chinese: 'zh', sichuan: 'zh', hunan: 'zh',
    'hong-kong': 'zh', northwestern: 'zh', hakka: 'zh', shanghainese: 'zh',
    northeastern: 'zh', macau: 'zh', taiwanese: 'zh', hokkien: 'zh',
    hainanese: 'zh', teochew: 'zh',
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

describe('the SECOND surface — /api/cuisine/dishes', () => {
  // Scoping batch 2 turned up a whole screen that was never wired. CITY_PLATES
  // covers 15 Asia-Pacific countries only, so `platesForCity` CANNOT reach Indian,
  // American or Italian cuisine — there is no Delhi, no Rome, no New York. Those
  // dishes reach a reader through the cuisine-keyed "Dishes" pop-up in
  // CuisineCategoryDrawer.jsx, fed by /api/cuisine/dishes?slug=…, which serves any
  // slug. Translating 118 names without wiring that endpoint would have shipped
  // dead strings — the same rectangular-vs-connected failure as the 17-dish miss at
  // v0.62.862, one level up.
  const DRAWER_SLUGS = [
    'italian', 'north-indian', 'south-indian', 'american',   // reachable ONLY here
    'japanese', 'singaporean',                               // also on the plate
    'chinese', 'sichuan', 'hunan',                           // batch 3
    'hong-kong', 'macau', 'taiwanese', 'hokkien', 'teochew', // batch 3 completed
    'vietnamese', 'filipino', 'burmese', 'goan', 'nepalese', // batch 4
  ];

  it.each(DRAWER_SLUGS)('resolves a name for every dish the endpoint serves for %s', (slug) => {
    const dishes = (NATION_OVERLAY[slug].iconicDishes || []).filter((d) => d && d.name);
    expect(dishes.length, `${slug} serves no dishes`).toBeGreaterThan(0);
    const missing = dishes.filter((d) => !namesFor(d.name)).map((d) => d.name);
    expect(missing, `${slug} would render English: ${missing.join(', ')}`).toEqual([]);
  });

  it('has no city plate for the batch-2 cuisines — so the check above is the only one', () => {
    // Pins the reason DRAWER_SLUGS exists. If a plate city is ever added for one of
    // these countries, this fails and whoever adds it also adds it to CITIES.
    const { CITY_PLATES } = require_('../city-plates.js');
    const countries = new Set(Object.values(CITY_PLATES).map((v) => v.country));
    for (const cc of ['IN', 'US', 'IT']) {
      expect(countries.has(cc), `${cc} now has a plate city — add it to CITIES too`).toBe(false);
    }
  });

  // The endpoint is a route closure inside index.js, not an exported function, so it
  // cannot be called from here without booting the bot. This reads the source
  // instead — a weaker check, and named as such — because the alternative is no
  // check at all on the line that makes 118 translations visible.
  it('index.js actually wires nameI18n into the endpoint', () => {
    const src = readFileSync(pathJoin(ROOT, 'index.js'), 'utf8');
    const route = src.slice(src.indexOf("app.get('/api/cuisine/dishes'"));
    const body = route.slice(0, route.indexOf('/api/cuisine/dishes failed'));
    expect(body, 'the endpoint no longer looks a dish name up').toMatch(/namesFor\(d\.name\)/);
    expect(body, 'the endpoint no longer attaches nameI18n').toMatch(/nameI18n:\s*names/);
  });

  it('the drawer renders the localised name, not the raw one', () => {
    const src = readFileSync(
      pathJoin(ROOT, 'web/cuisine/src/v2/components/CuisineCategoryDrawer.jsx'), 'utf8');
    expect(src, 'the drawer stopped importing the shared helpers')
      .toMatch(/import \{ dishDisplayName, localChip \} from '\.\/ArrivalPlate\.jsx'/);
    // The raw name must still be what the tap searches for.
    expect(src, 'the search key is no longer the raw English name')
      .toMatch(/onPickDish\?\.\(dishDetail\.name\)/);
  });
});

describe('Vietnamese — a Latin-script `local`, which is a new shape', () => {
  // Every curated `local` before batch 4 was CJK, and rule 3 said "reuse it for
  // zh". Vietnamese breaks that: its `local` is Vietnamese — Latin script with full
  // diacritics — so it is the right spelling for the FOUR LATIN LOCALES, not for zh.
  //
  // Measured: for 21 of 24 dishes the `local` is exactly the key with its accents
  // restored. `pho bo` is a degraded form of `Phở bò`, and a reader in French,
  // Indonesian, German or Spanish should see the real one.
  const LATIN = ['fr', 'id', 'de', 'es'];

  it('uses the accented `local`, not the accent-stripped key', () => {
    const wrong = [];
    let checked = 0;
    for (const d of NATION_OVERLAY.vietnamese.iconicDishes) {
      const mine = namesFor(d.name);
      if (!d.local || !mine) continue;
      checked += 1;
      for (const l of LATIN) {
        // `startsWith`, not equality: three keys carry a parenthetical gloss the
        // `local` does not — `cha gio (nem ran)` → `Chả giò` — and dropping
        // "(nem rán)" would lose the alternate name the key deliberately records.
        if (!mine[l].startsWith(d.local)) wrong.push(`${d.name}.${l}: ${mine[l]} vs ${d.local}`);
      }
    }
    expect(checked, 'no Vietnamese dish had both a local and an entry — the join broke')
      .toBeGreaterThan(20);
    expect(wrong, wrong.join(' | ')).toEqual([]);
  });

  it('actually carries diacritics — the failure mode unique to this batch', () => {
    // A wrong Vietnamese accent is invisible to every script check in this file:
    // it is still Latin, still not Cyrillic, still not CJK. Only the comparison
    // above catches it, so prove the fixture is not vacuous.
    const bare = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const accented = NATION_OVERLAY.vietnamese.iconicDishes
      .filter((d) => d.local && bare.test(d.local)).length;
    expect(accented, 'the Vietnamese overlay has no accented locals to check against')
      .toBeGreaterThan(15);
  });
});
