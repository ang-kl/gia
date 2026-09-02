// dish-taxonomy.test.js — v0.62.903
//
// The dish taxonomy (`nation-overlay-taxonomy.generated.js`) is about to grow from 99 rows to
// 1,697. This file is what makes that safe to do a batch at a time.
//
// ⚠ IT EXISTS BECAUSE OF A DEFECT NO EXISTING TEST COULD SEE, and the shape of that defect is the
// shape of the guard. The drafting enum offered five `mealTime` values while `mealPeriodSGT` asks
// about six periods, so `afternoon`, `supper` and `night_supper` had ZERO exact-match dishes and
// `snack` matched no period at all — half the periods inert even where the taxonomy existed.
// Every row was individually valid. The table was internally consistent. What was wrong was the
// relationship between two vocabularies that no single row can express, which is why the
// load-bearing check below is REACHABILITY: not "is this row well-formed" but "can this period
// ever be answered".
//
// Asserted by CALLING `_mealFit` rather than by reading the array, because the question is what
// the scorer does, and `snack` → `afternoon` happens inside it.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const TAXONOMY = require('../nation-overlay-taxonomy.generated.js');
const { NATION_OVERLAY } = require('../nation-overlay.js');
const score = require('../taste-score.js');
const { BUCKET_PERIODS } = require('../taste-context.js');

// The declared enums, read from the drafter so the two cannot drift apart silently.
const SCRIPT = require('fs').readFileSync(require('path').join(__dirname, '..', 'scripts/draft-dish-taxonomy.mjs'), 'utf8');
const enumOf = (name) => {
  const m = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(SCRIPT);
  if (!m) throw new Error(`${name} is gone from draft-dish-taxonomy.mjs`);
  return m[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean);
};
const TYPES = enumOf('TYPES');
const MEAL_TIMES = enumOf('MEAL_TIMES');
const DIETARY = enumOf('DIETARY');
const COURSES = enumOf('COURSES');
const MEAL_ACCEPTED = [...MEAL_TIMES, 'snack'];

describe('the dish taxonomy overlay', () => {
  const rows = Object.entries(TAXONOMY);

  it('every key resolves to a dish that still exists', () => {
    // A renamed dish silently drops its taxonomy today — the fold in nation-overlay.js is a
    // lookup by `${slug}::${name}` with no complaint when it misses. An orphan row is invisible
    // work: authored, committed, and never read.
    const orphans = [];
    for (const [key] of rows) {
      const i = key.indexOf('::');
      expect(i, `${key} is not slug::dish`).toBeGreaterThan(0);
      const slug = key.slice(0, i), dish = key.slice(i + 2);
      const entry = NATION_OVERLAY[slug];
      if (!entry) { orphans.push(`${key} (no such cuisine)`); continue; }
      const hit = (entry.iconicDishes || []).some((d) => String(d.name).toLowerCase() === dish);
      if (!hit) orphans.push(key);
    }
    expect(orphans, 'these rows point at dishes that no longer exist').toEqual([]);
  });

  it('every value is in the declared enum', () => {
    const bad = [];
    for (const [key, v] of rows) {
      if (!TYPES.includes(v.type)) bad.push(`${key}: type=${v.type}`);
      if (!Array.isArray(v.mealTime) || !v.mealTime.length) bad.push(`${key}: no mealTime`);
      else for (const m of v.mealTime) if (!MEAL_ACCEPTED.includes(m)) bad.push(`${key}: mealTime=${m}`);
      if (!DIETARY.includes(v.dietary)) bad.push(`${key}: dietary=${v.dietary}`);
      if (v.course && !COURSES.includes(v.course)) bad.push(`${key}: course=${v.course}`);
    }
    expect(bad).toEqual([]);
  });

  it('⚠ every meal period is REACHABLE — the check that would have caught the defect', () => {
    // Measured before v0.62.903, over the same 99 rows: afternoon 0, supper 0, night_supper 0.
    // Zero is the number this test exists to refuse. A floor of 1 rather than a pinned count,
    // because the counts will move on every batch and the property will not.
    const typed = [];
    for (const e of Object.values(NATION_OVERLAY)) {
      for (const d of (e.iconicDishes || [])) if (Array.isArray(d.mealTime) && d.mealTime.length) typed.push(d);
    }
    expect(typed.length, 'nothing is classified at all').toBeGreaterThan(50);
    const unreachable = BUCKET_PERIODS.filter((p) => typed.filter((d) => score._mealFit(d, p) === 1).length === 0);
    expect(unreachable, 'no dish can ever exact-match these periods').toEqual([]);
  });

  it('the legacy `snack` value is aliased, not offered', () => {
    // AU-1: the 20 rows that carry it are kept rather than rewritten. What changed is that it now
    // resolves — to `afternoon`, which is what mealPeriodSGT calls that window (vibe-suggest.js).
    expect(score._mealFit({ name: 'x', mealTime: ['snack'] }, 'afternoon')).toBe(1);
    expect(score._mealFit({ name: 'x', mealTime: ['snack'] }, 'supper')).toBe(0.15);
    expect(MEAL_TIMES, 'snack is being offered to the drafter again').not.toContain('snack');
    const legacy = rows.filter(([, v]) => v.mealTime.includes('snack')).length;
    // Pinned: new rows use period ids. A bump here means somebody authored the legacy value.
    expect(legacy, 'a NEW row used the legacy `snack` value').toBe(20);
  });

  it('⚠ no shipped row gives a drink a course — the batch validator cannot see the file', () => {
    // ⚠ A MUTATION SURVIVED. Adding `course: "dessert"` to `mexican::mezcal` in the overlay left
    // the suite green: the drink/course rule lived only in the BATCH validator, which runs over a
    // batch before insertion and never over the shipped table. So a row could reach the overlay
    // carrying a course it should not have — by a hand edit, a bad merge, or a batch that skipped
    // validation. A rule enforced only on the way in is not enforced on what is there.
    const bad = rows.filter(([, v]) => ['drink', 'hot-drink', 'cold-drink'].includes(v.type) && v.course);
    expect(bad.map(([k]) => k), 'these drink rows carry a course').toEqual([]);
    // …and the mirror: a food row without one. Same rule, other direction, same blind spot.
    const noCourse = rows.filter(([, v]) => !['drink', 'hot-drink', 'cold-drink'].includes(v.type) && !v.course);
    expect(noCourse.map(([k]) => k), 'these food rows have no course').toEqual([]);
  });

  it('the drink split reaches the weather term', () => {
    // 91 unclassified dishes are `kind: 'drink'`, and neither weather set knew the type.
    expect(score.WET_TYPES.has('hot-drink')).toBe(true);
    expect(score.DRY_TYPES.has('cold-drink')).toBe(true);
    // A drink served both ways stays neutral rather than guessed — absent, not zero.
    expect(score.WET_TYPES.has('drink')).toBe(false);
    expect(score.DRY_TYPES.has('drink')).toBe(false);
    for (const t of ['hot-drink', 'cold-drink', 'drink']) expect(TYPES).toContain(t);
  });

  it('every rendered enum value has all nine locales', () => {
    // The drawer renders mealTime / dietary / course. `type` is not rendered and is not required
    // here — a translation nothing displays is dead weight, and saying so is the exemption.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'web/cuisine/src/v2/lib/i18n.js'), 'utf8');
    const LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];
    const missing = [];
    for (const [field, values] of [['mealTime', MEAL_ACCEPTED], ['dietary', DIETARY], ['course', COURSES]]) {
      for (const v of values) {
        const key = `taxonomy.${field}.${v}`;
        // en+fr live in the base table as one entry; the other seven are flat overlay rows.
        if (!src.includes(`'${key}':`)) { missing.push(`${key} (base)`); continue; }
        for (const l of LOCALES.slice(2)) {
          if (!new RegExp(`"${key.replace(/\./g, '\\.')}": "`).test(src)) { missing.push(`${key} (${l})`); break; }
        }
      }
    }
    expect(missing, 'these chip labels would render in English').toEqual([]);
    // Counted, not assumed: 18 labels, and the two-locale base plus seven overlays.
    const n = [...src.matchAll(/'taxonomy\.[a-zA-Z_.]+':/g)].length;
    expect(n, 'the base table gained or lost a taxonomy label').toBe(18);
    const flat = [...src.matchAll(/"taxonomy\.[a-zA-Z_.]+":/g)].length;
    expect(flat, '18 labels × 7 overlay locales').toBe(18 * 7);
  });

  it('⚠ the three chips actually CALL the label lookup — a mutation survived proving they need not', () => {
    // ⚠ THIS TEST EXISTS BECAUSE A MUTATION SURVIVED. Reverting the mealTime chip to render the raw
    // `{m}` left the suite green: the nine-locale check below asserts the KEYS EXIST in i18n.js,
    // which is a fact about the string table and says nothing about whether anything reads it.
    // 162 authored cells and a chip rendering `night_supper` in Latin script would both be true at
    // once. Same shape as the K_MIN fixture that moved with its constant, and the runSearch census
    // that pinned one line of seventeen: a guard measuring the wrong side of the join.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'web/cuisine/src/v2/components/CuisineCategoryDrawer.jsx'), 'utf8');
    for (const call of ["taxLabel('mealTime', m, lang)",
                        "taxLabel('dietary', dishDetail.dietary, lang)",
                        "taxLabel('course', dishDetail.course, lang)"]) {
      expect(src, `this chip renders a raw enum value again: ${call}`).toContain(call);
    }
    // …and the fallback is what keeps an untranslated term from rendering blank.
    expect(src).toMatch(/return out && out !== key \? out : String\(value\);/);
  });

  it('the chips no longer force title case on a phrase', () => {
    // CSS `capitalize` upper-cases every word: correct for a single English enum value, wrong for
    // `plat principal` / `fruits de mer` / `à toute heure`. Removed from these three chips only.
    const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'web/cuisine/src/v2/components/CuisineCategoryDrawer.jsx'), 'utf8');
    const i = src.indexOf("dishDetail.mealTime.map((m) => (");
    const j = src.indexOf("taxLabel('course', dishDetail.course, lang)");
    expect(i).toBeGreaterThan(-1); expect(j).toBeGreaterThan(i);
    expect(src.slice(i, j), 'a taxonomy chip is title-casing a phrase again').not.toContain(' capitalize"');
  });

  it('⚠ the backfill CHANGES THE ANSWER — the point of the whole arc', () => {
    // The reachability check above says a period CAN be matched. This says the taxonomy actually
    // discriminates: on a cuisine batch 1 classified, the top dish must differ across periods.
    //
    // Before batch 1, `japanese` had no typed dish at all, so every period returned the same
    // answer chosen by a 1e-6 jitter over a flat field — `[AMD-165]` recorded that as a forty-way
    // tie at exactly 1.0000. A guard that only counted rows would have been green either way.
    for (const slug of ['japanese', 'cantonese', 'american', 'korean', 'french', 'thai', 'mexican', 'south-indian', 'british']) {
      const dishes = NATION_OVERLAY[slug].iconicDishes;
      const top = (p) => score.scoreDishes(dishes, { period: p, weather: 'unknown', bucketId: `x:${p}` },
        { lang: 'en', slug })[0];
      const picks = new Set(['breakfast', 'afternoon', 'dinner', 'supper'].map((p) => top(p).dish));
      expect(picks.size, `${slug} answers the same dish at every period`).toBeGreaterThan(2);

      // ⚠ AND THE DIFFERENCE MUST COME FROM SCORING, NOT FROM THE TIE-BREAK. A mutation flattening
      // every `thai` row to `mealTime: ["anytime"]` SURVIVED the assertion above: `anytime` scores
      // 0.7 everywhere, so every dish ties, and the jitter — which is keyed on the bucketId, and
      // the bucketId differs per period — still returned a different dish at each. The test was
      // satisfied by randomness, which is the exact defect it was written to catch, one level in.
      //
      // So: at three of the four periods the winner must EXACT-MATCH that period, which only the
      // taxonomy can produce. Three of four rather than four, because a cuisine with no breakfast
      // trade should not be pushed into inventing one.
      const exact = ['breakfast', 'afternoon', 'dinner', 'supper']
        .filter((p) => score._mealFit(NATION_OVERLAY[slug].iconicDishes.find((d) => d.name === top(p).dish), p) === 1);
      expect(exact.length, `${slug}'s top dishes are tied, not chosen — the jitter is doing the work`)
        .toBeGreaterThanOrEqual(3);
    }
    // And the tie band shrinks from saturated to merely wide: many dishes genuinely ARE
    // lunch-and-dinner dishes, so a floor is the honest assertion, not a small exact number.
    const jp = NATION_OVERLAY.japanese.iconicDishes;
    const band = (p) => {
      const r = score.scoreDishes(jp, { period: p, weather: 'unknown', bucketId: `x:${p}` }, { lang: 'en', slug: 'japanese' });
      return r.filter((x) => r[0].score - x.score <= 0.01).length;
    };
    expect(band('breakfast'), 'breakfast is saturated again').toBeLessThan(10);
    expect(band('afternoon'), 'afternoon is saturated again').toBeLessThan(10);
  });

  it('⚠ `night_supper` draws on more than one cuisine', () => {
    // ⚠ THIS EXISTS BECAUSE A FIGURE I WROTE WAS WRONG. [AMD-170] said night_supper "rests on 13
    // dishes, eleven of them Singaporean". Measured, it was THIRTEEN of thirteen — one cuisine,
    // not two — written from memory rather than from a count, in a paragraph whose whole purpose
    // was to state the gap honestly. A period that exists but can only ever answer one cuisine
    // passes every other check in this file: the rows are valid, the enum is respected, and
    // reachability is satisfied by a single dish.
    //
    // A FLOOR, not a ratio. The right ratio is not knowable, and a floor rises naturally as
    // batches land — 1 → 3 with batch 2 (korean and malaysian, the two cuisines there with real
    // 24-hour trade in Singapore), then 3 → 5 with batch 4, which added south-indian (the 24-hour
    // prata and dosa shops, six rows) and chinese (jianbing and baozi from pre-dawn carts).
    //
    // ⚠ RATCHETED, because a floor that never moves has stopped being one. The Singaporean share
    // of the period went 100 % → 62 % → 45 % across those two batches; the floor is what stops it
    // sliding back. Raise it again when a batch earns it.
    const by = new Map();
    for (const [slug, e] of Object.entries(NATION_OVERLAY)) {
      for (const d of (e.iconicDishes || [])) {
        if (Array.isArray(d.mealTime) && d.mealTime.includes('night_supper')) by.set(slug, (by.get(slug) || 0) + 1);
      }
    }
    expect(by.size, 'night_supper lost cuisines — a 4am suggestion is narrowing again').toBeGreaterThan(3);
  });

  it('the completeness count is pinned, so a dropped batch cannot pass quietly', () => {
    let dishes = 0;
    for (const e of Object.values(NATION_OVERLAY)) dishes += (e.iconicDishes || []).length;
    expect(dishes, 'the dish catalogue changed size').toBe(1697);
    // Bumped by every backfill batch. 99 today; the arc ends at 1,697.
    // Batch 4 (v0.62.907): +162 — south-indian, german, british, sichuan, chinese, filipino.
    // 551 → 713, past 40 % of the 1,697.
    // Batch 3 (v0.62.906): +147 — spanish, mexican, peranakan, indonesian, thai. 404 → 551.
    // Batch 2 (v0.62.905): +150 — korean, malaysian, north-indian, italian, french. 254 → 404.
    // Batch 1 (v0.62.904): +155 — the 64 remaining singaporean rows plus american, cantonese and
    // japanese in full. 99 → 254. Seven batches to go; the arc ends at 1,697.
    expect(rows.length, 'a batch landed or vanished — bump this deliberately').toBe(713);
  });
});
