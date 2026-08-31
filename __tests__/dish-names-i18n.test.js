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
  // v0.62.869 — batch 5a: the European set where the key already IS the home
  // language. `portuguese` is in for coverage but out of HOME_LOCALE below.
  'french', 'spanish', 'german', 'austrian', 'swiss', 'portuguese',
  // v0.62.870 — batch 5b: the European set where the key is a TRANSLITERATION
  // rather than the name. None of these 138 dishes carries a curated `local`.
  'british', 'greek', 'russian', 'ukrainian', 'scandinavian', 'polish',
  // v0.62.871 — batch 6a: the first set with NO home locale at all. Turkish,
  // Arabic, Hebrew and Persian are none of them app locales.
  'turkish', 'lebanese', 'persian', 'moroccan', 'israeli', 'egyptian', 'jordanian',
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

  // A qualified key that names a slug which does not serve that dish is dead weight
  // that looks like a fix — the exact shape of the bug it was added to solve.
  it('every cuisine-qualified key names a real slug AND a dish that slug serves', () => {
    const bad = [];
    for (const k of Object.keys(DISH_NAMES)) {
      if (!k.includes('::')) continue;
      const [slug, name] = k.split('::');
      const overlay = NATION_OVERLAY[slug];
      if (!overlay) { bad.push(`${k}: no such cuisine`); continue; }
      const serves = (overlay.iconicDishes || []).some((d) => d.name.toLowerCase() === name);
      if (!serves) bad.push(`${k}: ${slug} does not serve that dish`);
    }
    expect(bad, bad.join(' | ')).toEqual([]);
  });

  it('has no key that is not a real dish (a typo’d key is silently dead)', () => {
    // v0.62.868 — a key may now be cuisine-qualified (`slug::name`). Those are
    // validated harder, just below: the slug must be real AND must actually serve
    // that dish. Here we only exclude them from the bare-name check.
    const known = new Set(COVERED.flatMap(distinctDishes));
    const orphans = Object.keys(DISH_NAMES)
      .filter((k) => !k.includes('::'))
      .filter((k) => !known.has(k));
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

describe('batch 5a — the key already IS the home language', () => {
  // For these five the dish is CALLED the key: `soupe à l'oignon`, `spätzle`,
  // `sachertorte`. Writing "Zwiebelsuppe" where the dish is `soupe à l'oignon`
  // would be a regression, not a localisation — so the home locale's value must
  // still start with the key. `portuguese` is deliberately absent: Portuguese is
  // not an app locale, so there is no home-locale claim to make about it.
  const HOME_LOCALE = {
    french: 'fr', spanish: 'es', german: 'de', austrian: 'de', swiss: 'de',
  };

  // Compare folded, not raw. Measured against the real table: a raw startsWith
  // fails 20 of 130, and SEVEN of those are the key flattening orthography the
  // value restores — `boeuf`→`Bœuf`, `weisswurst`→`Weißwurst`, `sangria`→`Sangría`,
  // `croque monsieur`→`Croque-monsieur`, `selch fleisch`→`Selchfleisch`. Those are
  // the home-language name, spelled the way nation-overlay.js keys it. Folding
  // passes them while a genuine translation still fails: `Zwiebelsuppe` does not
  // start with `soupeloignon` under any normalisation.
  const fold = (s) => s.toLowerCase().replace(/œ/g, 'oe').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  // The other THIRTEEN are keys that are genuinely English, correctly translated
  // under rule 1. Each is listed by hand with its reason, so an exemption is a
  // deliberate line in a diff rather than a silently widened regex.
  const HOME_LOCALE_EXEMPT = new Set([
    'duck confit',                    // English key; the dish is `confit de canard`
    'black forest cake',              // English key; `Schwarzwälder Kirschtorte`
    'pretzels',                       // English plural; `Brezeln`
    'rye bread',                      // English descriptive; `Roggenbrot`
    'german beer',                    // English descriptive; `Deutsches Bier`
    'riesling wine',                  // key appends "wine"; the drink is `Riesling`
    'döner kebab german',             // key carries the nation as a disambiguator
    'goulash austrian',               // same, and `Österreichisches Gulasch` leads
    'chocolate swiss',                // same shape; `Schweizer Schokolade`
    'emmentaler cheese',              // key appends "cheese"; the cheese is `Emmentaler`
    'appenzeller cheese',             // same
    'pizzoccheri ticino',             // Ticino is the Italian name, Tessin the German
    'älplermagronen with apfelmus',   // English "with"; German is `mit`
  ]);

  it('never translates a home-language dish name into its own language', () => {
    let checked = 0;
    const wrong = [];
    for (const [slug, locale] of Object.entries(HOME_LOCALE)) {
      for (const name of new Set(NATION_OVERLAY[slug].iconicDishes.map((d) => d.name))) {
        const v = namesFor(name, slug);
        if (!v || HOME_LOCALE_EXEMPT.has(name.toLowerCase())) continue;
        checked += 1;
        if (!fold(v[locale]).startsWith(fold(name))) {
          wrong.push(`${slug}/${name}: ${locale} is "${v[locale]}", not the dish's own name`);
        }
      }
    }
    // Non-vacuity, both directions. A map that silently matches nothing has
    // already happened once in this suite's history; an exemption list that grows
    // until it swallows the assertion would be the same failure, slower.
    expect(checked, 'the home-locale join matched nothing').toBeGreaterThan(100);
    expect(HOME_LOCALE_EXEMPT.size, 'exemptions are outgrowing the rule')
      .toBeLessThanOrEqual(15);
    expect(wrong, wrong.join(' | ')).toEqual([]);
  });

  it('every exemption names a dish one of these five nations actually serves', () => {
    // An exemption for a dish nobody serves is dead weight that looks like care.
    const served = new Set(Object.keys(HOME_LOCALE)
      .flatMap((s) => NATION_OVERLAY[s].iconicDishes.map((d) => d.name.toLowerCase())));
    const dead = [...HOME_LOCALE_EXEMPT].filter((n) => !served.has(n));
    expect(dead, `exempt but not served: ${dead.join(', ')}`).toEqual([]);
  });
});

describe('batch 5b — the key is a transliteration, not the name', () => {
  // 5a could assert that the home locale's value STARTS WITH the key, because the
  // dish was called the key. Here it cannot: `borscht` is how English writes Борщ,
  // so key and value share no characters at all. The analogue that does hold is
  // SCRIPT — for these two nations `ru` is the home language, and a `ru` value
  // still in Latin letters means the transliteration was copied through
  // untranslated.
  //
  // No existing guard catches that. The mixed-script check fires only when
  // Cyrillic AND Latin both appear in one value, so a purely Latin `ru` sails
  // through it. And unlike every batch before this one, NONE of these 138 dishes
  // carries a curated `local` — so there is no fixture to compare against and
  // script is the only handle there is.
  const HOME_SCRIPT = { russian: 'ru', ukrainian: 'ru' };
  const CYRILLIC_RE = /[Ѐ-ӿ]/;

  it('never leaves a transliteration where the home language belongs', () => {
    let checked = 0;
    const untranslated = [];
    for (const [slug, locale] of Object.entries(HOME_SCRIPT)) {
      for (const name of new Set(NATION_OVERLAY[slug].iconicDishes.map((d) => d.name))) {
        const v = namesFor(name, slug);
        if (!v) continue;
        checked += 1;
        if (!CYRILLIC_RE.test(v[locale])) {
          untranslated.push(`${slug}/${name}: ${locale} is "${v[locale]}" — Latin, not Cyrillic`);
        }
      }
    }
    // Non-vacuity. A map that silently matches nothing has happened here before.
    expect(checked, 'the home-script join matched nothing').toBeGreaterThanOrEqual(40);
    expect(untranslated, untranslated.join(' | ')).toEqual([]);
  });

  // ⚠ Ukrainian is not Russian. The overlay spells six pairs differently ON
  // PURPOSE, and the careless failure is to write the Russian form into the
  // Ukrainian rows — invisible to every script check, because both are Cyrillic.
  // The Latin columns follow the Ukrainian original the key already uses.
  it('keeps the Ukrainian spelling in the Latin locales, not the Russian one', () => {
    const pairs = [
      ['varenyky', 'vareniki', ['fr', 'id', 'de', 'es']],
      ['syrniky', 'syrniki', ['fr', 'id', 'de', 'es']],
      ['holubtsi', 'golubtsy', ['fr', 'id', 'de', 'es']],
    ];
    for (const [ua, ru, locales] of pairs) {
      const u = namesFor(ua, 'ukrainian');
      const r = namesFor(ru, 'russian');
      expect(u, `${ua} is missing`).toBeTruthy();
      expect(r, `${ru} is missing`).toBeTruthy();
      for (const l of locales) {
        expect(u[l], `${ua}.${l} took the Russian spelling`).not.toBe(r[l]);
      }
    }
  });

  // `pierogi ruskie` is Ruthenian, not Russian — Red Ruthenia, not Russia. Reading
  // it as "Russian" would repeat, in mirror image, the conflation the rows above
  // exist to avoid. Pinned because it is exactly the kind of thing a later edit
  // "corrects" into being wrong.
  it('pierogi ruskie is Ruthenian, not Russian', () => {
    expect(namesFor('pierogi ruskie').ru).not.toMatch(/русск/i);
  });
});

describe('batch 6a — no home locale at all', () => {
  // Turkish, Arabic, Hebrew and Persian are none of them app locales, so there is
  // no column to assert a prefix on (5a) and no script to require (5b) — and
  // measured, zero of these 154 dishes carries a curated `local`, so rule 3 gives
  // nothing either. What Turkish does bring is orthography that must not be
  // flattened.
  //
  // ⚠ 5a's FOLDING comparison would actively HIDE the failure here. Folding maps
  // ı→i, so `Manti` and `Mantı` compare equal — and ı is a different LETTER in
  // Turkish, not an accent. So this assertion is the opposite of 5a's: the
  // ASCII-degraded spelling is forbidden, not tolerated.
  const TURKISH_LETTERS = /[ışğçöüİ]/;
  const degrade = (s) => s.replace(/ı/g, 'i').replace(/İ/g, 'I')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  it('never flattens Turkish orthography in a Latin locale', () => {
    const keys = [...new Set(NATION_OVERLAY.turkish.iconicDishes.map((d) => d.name))]
      .filter((n) => TURKISH_LETTERS.test(n));
    // Non-vacuity, pinned to the measured count: an overlay edit that strips the
    // diacritics empties this guard silently, and that must fail here instead.
    expect(keys.length, 'the Turkish diacritic fixture changed size').toBe(10);

    const flattened = [];
    for (const name of keys) {
      const v = namesFor(name, 'turkish');
      for (const l of ['fr', 'id', 'de', 'es']) {
        // The value may legitimately be a real translation ("Loukoum" for turkish
        // delight). What it may never be is the key with its Turkish letters
        // stripped — that is a degraded spelling masquerading as the name.
        if (v[l].toLowerCase() === degrade(name).toLowerCase()) {
          flattened.push(`${name}.${l} = "${v[l]}" — the key with its Turkish letters stripped`);
        }
      }
    }
    expect(flattened, flattened.join(' | ')).toEqual([]);
  });

  // ⚠ The degradation is not hypothetical: `nation-overlay.js` lists BOTH `manti`
  // and `mantı` as separate Turkish dishes, with notes that are word-for-word
  // identical apart from that one character. Same dish, keyed twice. Both are
  // translated because coverage requires it, and they are pinned equal so a later
  // edit cannot drift them into two spellings of one dish saying different things.
  // Fixing the overlay is a separate change — it alters what the app serves.
  it('the duplicated manti/mantı keys say the same thing', () => {
    const a = namesFor('manti', 'turkish');
    const b = namesFor('mantı', 'turkish');
    expect(a, 'manti is missing').toBeTruthy();
    expect(b, 'mantı is missing').toBeTruthy();
    expect(a).toEqual(b);
  });

  // Caught a real slip in this batch's own draft (`水börek千层`). One legitimate
  // exception: the biáng glyph 𰻞 is absent from most fonts, so pinyin is the
  // standard workaround rather than a lapse. Named, so it reads as a judgement
  // that was made rather than a threshold that happened to pass.
  const LATIN_IN_ZH_OK = new Set(['biang biang noodles']);

  it('no Chinese value carries stray Latin letters', () => {
    const bad = Object.entries(DISH_NAMES)
      .filter(([k, v]) => !LATIN_IN_ZH_OK.has(k) && CJK.test(v.zh) && LATIN.test(v.zh))
      .map(([k, v]) => `${k}.zh = ${v.zh}`);
    expect(bad, bad.join(' | ')).toEqual([]);
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
    'french', 'spanish', 'german', 'austrian', 'swiss',      // batch 5a
    'portuguese',
    'british', 'greek', 'russian', 'ukrainian',                // batch 5b
    'scandinavian', 'polish',
    'turkish', 'lebanese', 'persian', 'moroccan',              // batch 6a
    'israeli', 'egyptian', 'jordanian',
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
    // Must pass the SLUG too — without it the lookup is bare-name again and the
    // lapsi collision returns.
    expect(body, 'the endpoint no longer looks a dish name up')
      .toMatch(/namesFor\(d\.name,\s*slug\)/);
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

describe('one name, two foods — the collision Codex found on #1808', () => {
  // A dish NAME is not unique across cuisines. `lapsi` is a broken-wheat pudding in
  // Gujarat and a sour hog-plum FRUIT in Nepal, so the bare-name lookup served the
  // Gujarati translation to readers of the Nepalese list. Codex caught that one.
  //
  // Chasing the shape found a SECOND: `ti kway / png kueh` is a Teochew peach-shaped
  // glutinous dumpling (红桃粿) in the Singapore overlay and nian gao, a sweet sticky
  // rice cake (饭粿), in the Hokkien one — and the repo had said so twice, in the
  // disagreeing `local` values and in notes that share almost no words.
  //
  // So this is a GUARD, not two spot-fixes: it re-runs the detection over every
  // shared name, and a future batch that introduces a third collision fails here
  // instead of shipping the wrong food to a reader.
  const notesMod = require_('../nation-overlay-dishnotes.generated.js');
  const NOTES = notesMod.NOTES || notesMod.DISH_NOTES || notesMod;

  const STOP = new Set(('a an the is are and or of in with from for on to it its this that also known as'
    + ' often made dish traditional popular served usually typically be been which while but their they'
    + ' them style dishes food cuisine other others most very more some any not no can may').split(/\s+/));
  const words = (s) => new Set(String(s || '').toLowerCase().replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
  const noteOf = (slug, name) => {
    const e = NOTES[`${slug}::${name.toLowerCase()}`];
    return e ? (typeof e === 'string' ? e : e.en) : null;
  };

  // Pairs that score low but are the SAME dish described regionally. Listed by name
  // with a reason, so a reader sees a judgement that was made rather than a threshold
  // that happened to pass.
  const KNOWN_SAME_DISH = new Set([
    'hainanese chicken cutlet',  // both a fried cutlet; the notes differ on sauce vs cracker crumb
    'roast duck',                // both roast duck; one note adds Cantonese aromatics
    'sliced fish soup',          // both sliced fish in broth; one note adds the milky variant
  ]);

  const pairs = () => {
    const byName = new Map();
    for (const [slug, v] of Object.entries(NATION_OVERLAY)) {
      for (const d of (v.iconicDishes || [])) {
        if (!namesFor(d.name)) continue;
        const k = d.name.toLowerCase();
        if (!byName.has(k)) byName.set(k, new Set());
        byName.get(k).add(slug);
      }
    }
    const out = [];
    for (const [name, slugs] of byName) {
      if (slugs.size < 2) continue;
      const notes = [...slugs].map((s) => [s, noteOf(s, name)]).filter(([, n]) => n);
      const nameWords = words(name);
      for (let i = 0; i < notes.length; i += 1) {
        for (let j = i + 1; j < notes.length; j += 1) {
          const A = words(notes[i][1]); const B = words(notes[j][1]);
          for (const w of nameWords) { A.delete(w); B.delete(w); }
          const overlap = [...A].filter((w) => B.has(w)).length
            / Math.max(1, new Set([...A, ...B]).size);
          out.push({ name, a: notes[i][0], b: notes[j][0], overlap });
        }
      }
    }
    return out;
  };

  it('finds shared names to check — the fixture is not vacuous', () => {
    const all = pairs();
    expect(all.length, 'no shared dish names at all — the join broke').toBeGreaterThan(30);
  });

  it('every near-zero-overlap pair is either qualified or explicitly a same-dish call', () => {
    const suspect = pairs()
      .filter((p) => p.overlap < 0.09)
      .filter((p) => !KNOWN_SAME_DISH.has(p.name))
      // a collision is resolved once EITHER cuisine has its own qualified entry
      .filter((p) => !namesFor(p.name, p.a) || !namesFor(p.name, p.b)
        || namesFor(p.name, p.a) === namesFor(p.name, p.b));
    const msg = suspect.map((p) => `${p.name} [${p.a} vs ${p.b}] overlap=${p.overlap.toFixed(2)}`);
    expect(suspect, `unresolved collisions: ${msg.join(' | ')}`).toEqual([]);
  });

  it('serves the right food to each cuisine for both known collisions', () => {
    expect(namesFor('lapsi', 'gujarati').zh).toBe('碎麦甜粥');          // broken-wheat pudding
    expect(namesFor('lapsi', 'nepalese').zh).toBe('尼泊尔酸橄榄');       // hog-plum fruit
    expect(namesFor('lapsi', 'nepalese')).not.toBe(namesFor('lapsi', 'gujarati'));

    expect(namesFor('ti kway / png kueh', 'singaporean').zh).toBe('红桃粿');
    expect(namesFor('ti kway / png kueh', 'hokkien').zh).toBe('饭粿');
  });

  it('falls back to the bare name when no qualified entry exists', () => {
    expect(namesFor('laksa', 'singaporean')).toBe(namesFor('laksa'));
    expect(namesFor('lapsi', 'no-such-cuisine')).toBe(namesFor('lapsi'));
    expect(namesFor('lapsi', null)).toBe(namesFor('lapsi'));
  });
});

describe('the two ingredient errors Codex caught', () => {
  // "Which ingredient" is exactly what a later edit can quietly undo, and the reader
  // has no way to tell. Both are pinned against the repo's own curated note.
  it('khaman is gram/chickpea flour, not soybean', () => {
    expect(namesFor('khaman').zh).toBe('鹰嘴豆蒸糕');
    expect(namesFor('khaman').zh).not.toMatch(/黄豆/);
  });

  it('chickpea tofu is chickpea in Indonesian too, not green beans', () => {
    expect(namesFor('chickpea tofu').id).toBe('Tahu kacang arab');
    expect(namesFor('chickpea tofu').id).not.toMatch(/buncis/);
  });
});
