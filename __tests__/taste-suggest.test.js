// __tests__/taste-suggest.test.js — v0.62.901
//
// Operator: *"find a way to learn about the pre-user taste vector without user-name or
// user-device, but include meal period, weather and location and time of search and free-text
// query (intepreted) that can be translate into good data algorithm for usage across 9 locales"*
// — surface: *"woven into the existing empty/idle states"*; aggregate: *"build it, gated, and say
// so plainly."*
//
// The privacy constraint is the first section below, because it is the one that would be a
// serious problem to get wrong: `/privacy` says *"No personal profile is created."* Everything
// here is asserted by CALLING, which is why the logic lives in root modules rather than in
// `index.js` — that file exports nothing.
//
// ⚠ TWO OF THESE TESTS EXIST BECAUSE RUNNING THE CODE PRODUCED A WRONG ANSWER, not because the
// design anticipated one. Both are marked. Neither would have failed anything.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const graph = require('../taste-graph.js');
const score = require('../taste-score.js');
const agg = require('../taste-aggregate.js');
const { buildContext, bucketIdFor, BUCKET_PERIODS, DAY_TYPES } = require('../taste-context.js');
const { buildWhy } = require('../taste-why.js');
const { suggestForContext, _seedFromQuery } = require('../taste-suggest.js');
const { NATION_OVERLAY } = require('../nation-overlay.js');
const { tn, SUPPORTED } = require('../i18n.js');

// A SYNTHETIC id, deliberately. The property under test — that no constructed key can carry a
// chat id — needs an id, not THE id, and a real one written into a public repo is a fact about
// a person added for no gain.
const CHAT = 987654321;
const AT = new Date('2026-09-02T11:00:00Z');   // 19:00 SGT, a Wednesday — dinner, weekday

describe('⚠ nothing here is keyed to a person', () => {
  it('no aggregate key can contain a chat id, a device id or a coordinate', () => {
    // The literal check, because "we did not put it in" is an intention and this is a property.
    for (const bucketId of BUCKET_PERIODS.flatMap((p) => DAY_TYPES.map((d) => bucketIdFor({ period: p, dayType: d })))) {
      for (const k of [agg.keyShown(bucketId), agg.keyKept(bucketId), agg.keyN(bucketId)]) {
        expect(k, `${k} carries a chat id`).not.toContain(String(CHAT));
        expect(k).toMatch(/^taste:(shown|kept|n):[a-z_]+:[a-z]+$/);
        expect(k, 'a coordinate leaked into the key').not.toMatch(/\d+\.\d+/);
      }
    }
  });

  it('the bucket space is 18 — period × day type, and nothing finer', () => {
    // 6 × 3. Zone and weather are deliberately out: 270 buckets against ~400 observations a week
    // would take nine months to warm one, and a neighbourhood-plus-hour bucket at 200 users edges
    // toward identifying somebody. Both stay in the SCORE instead.
    const all = new Set(BUCKET_PERIODS.flatMap((p) => DAY_TYPES.map((d) => bucketIdFor({ period: p, dayType: d }))));
    expect(all.size).toBe(18);
  });

  it('the context object carries no identifier at all', async () => {
    const ctx = await buildContext({ now: AT, lat: 1.3, lng: 103.8, queryText: 'laksa' });
    const json = JSON.stringify(ctx);
    expect(json).not.toContain(String(CHAT));
    expect(Object.keys(ctx).sort()).toEqual([
      'bucketId', 'dayType', 'holiday', 'lat', 'liveSignals', 'lng', 'mealLabel', 'period', 'queryText', 'weather',
    ]);
  });
});

describe('the graph — three defects in the data, handled once', () => {
  it('symmetrising leaves ZERO isolated slugs, so no hand-authored edge is needed', () => {
    // The eight that had in-degree 0 — hakka, scandinavian, uzbek, northeastern, northwestern,
    // goan, dessert, fusion — are all reachable after the union. Measured, not hoped.
    const isolated = [...graph.ADJ.entries()].filter(([, s]) => s.size === 0).map(([k]) => k);
    expect(isolated).toEqual([]);
    for (const s of ['hakka', 'scandinavian', 'uzbek', 'northeastern', 'northwestern', 'goan']) {
      expect(graph.degreeOf(s), `${s} is unreachable`).toBeGreaterThan(0);
    }
  });

  it('139 undirected edges and 19 dangling targets, both pinned', () => {
    expect(graph.UNDIRECTED_EDGES).toBe(139);
    expect(graph.DANGLING_SLUGS).toHaveLength(19);
    // Adding a `laotian` overlay entry SHOULD fail this — that failure is the reminder to drop it
    // from the list. Do not invent overlay entries to make it pass.
    expect(graph.DANGLING_SLUGS).toContain('laotian');
    for (const d of graph.DANGLING_SLUGS) expect(graph.ADJ.has(d), `${d} was not filtered out`).toBe(false);
  });

  it('⚠ hub damping — otherwise every walk lands on Singaporean', () => {
    // degree 16 against a mean of 4.21. Undamped, `singaporean` wins from every seed in the graph
    // and the feature becomes a Singaporean-dispenser in the one country where that is the default.
    expect(graph.degreeOf('singaporean')).toBe(16);
    expect(graph.proximity('teochew', 'hokkien')).toBeGreaterThan(graph.proximity('teochew', 'singaporean'));
    expect(graph.proximity('teochew', 'teochew')).toBe(1);
    expect(graph.proximity('teochew', 'french')).toBe(0);
  });
});

describe('the scorer', () => {
  const ctxFor = (dayType) => ({ period: 'lunch', dayType, weather: 'unknown', bucketId: `lunch:${dayType}` });

  it('renormalises over LIVE terms only, so a missing signal costs a weight and not a guess', () => {
    const noSeed = score.scoreCuisines(ctxFor('weekday'), {});
    expect(noSeed[0].liveTerms).not.toContain('proximity');
    expect(noSeed[0].liveTerms).not.toContain('novelty');
    const seeded = score.scoreCuisines(ctxFor('weekday'), { seed: 'teochew', usageCounts: { thai: 10, korean: 4 } });
    expect(seeded[0].liveTerms).toContain('proximity');
    expect(seeded[0].liveTerms).toContain('novelty');
    // Every score stays in 0..1 whatever drops out — the denominator moves with the numerator.
    for (const r of [...noSeed, ...seeded]) expect(r.score).toBeGreaterThanOrEqual(0);
    for (const r of [...noSeed, ...seeded]) expect(r.score).toBeLessThanOrEqual(1.001);
  });

  it('⚠ the day type widens the ROTATION by one tier — it does not reverse the ranking', () => {
    // ⚠ THIS TEST FAILED ON ITS FIRST RUN AND THE DESIGN WAS WRONG, NOT THE TEST. The plan said
    // the day type "INVERTS familiarity … testable by flipping the day and asserting the ranking
    // reverses", and the first draft asserted exactly that: `famOf(we[0]) < 1.0`. It came back
    // `expected 1 to be less than 1`, and the arithmetic is two lines — a 0.10 term cannot
    // overturn a 0.30 one. Worse, the draft's weekday branch scored dayType EQUAL to familiarity,
    // the parallel double-count its own comment denied.
    //
    // Measuring what it did instead: nothing observable. Same 13-cuisine band on both days, every
    // member `high`. The fix was not to tune the weight until the assertion passed — it was to
    // put the effect where it can be seen, in the rotation band, and to measure the threshold
    // rather than pick one. See taste-score.js's ROTATION_EPSILON.
    const famOf = (s) => score.POP_SCORE[(NATION_OVERLAY[s] || {}).populationInSG];
    const tiers = (b) => new Set(b.band.map((x) => famOf(x.slug)));

    const wk = score.topBand(score.scoreCuisines(ctxFor('weekday'), {}), 'lunch:weekday', { widen: true });
    const we = score.topBand(score.scoreCuisines(ctxFor('weekend'), {}), 'lunch:weekend', { widen: true });
    const ho = score.topBand(score.scoreCuisines(ctxFor('holiday'), {}), 'lunch:holiday', { widen: true });

    // Weekday: the familiar tier alone. A weekday lunch is forty minutes and the pick has to exist
    // within walking distance — `populationInSG` is the only availability proxy that ships.
    expect([...tiers(wk)]).toEqual([1.0]);
    // Leisure: one tier further down, and NOT two. `low` sits 0.30 behind and stays out.
    expect(tiers(we).has(0.6), 'the medium tier never joins the weekend rotation').toBe(true);
    expect(tiers(we).has(0.25), 'the low tier should stay out — 0.30 behind').toBe(false);
    expect([...tiers(ho)].sort()).toEqual([...tiers(we)].sort());   // a holiday is a leisure day
    expect(we.bandSize).toBeGreaterThan(wk.bandSize);

    // And the reason it can widen: the familiarity gap halves on a leisure day. This is the real
    // effect of the term, stated as the number it actually produces.
    const gap = (r) => r[0].score - r.find((x) => famOf(x.slug) === 0.25).score;
    expect(gap(score.scoreCuisines(ctxFor('weekday'), {}))).toBeCloseTo(0.5625, 3);
    expect(gap(score.scoreCuisines(ctxFor('weekend'), {}))).toBeCloseTo(0.3000, 3);

    // On a weekday the term is ABSENT, not zero and not a copy of familiarity: a signal that says
    // the same thing about every candidate is not a signal.
    expect(score.scoreCuisines(ctxFor('weekday'), {})[0].liveTerms).not.toContain('dayType');
    expect(score.scoreCuisines(ctxFor('weekend'), {})[0].liveTerms).toContain('dayType');
  });

  it('⚠ a NAMED intent wins — found by running it, not by reading it', () => {
    // First draft weighted proximity at 0.30 and expected that to be enough. It was not: with
    // `seed = polish` (populationInSG low), an unrelated high-population cuisine outscored it
    // 0.625 to 0.40, because familiarity + dayType + localeAffinity outvote proximity. The
    // suggestion for "pierogi" came back Japanese gyudon — arithmetically defensible, useless.
    // The candidate set now narrows to the seed's neighbourhood BEFORE scoring.
    const ranked = score.scoreCuisines(ctxFor('weekday'), { seed: 'polish' });
    expect(ranked[0].slug).toBe('polish');
    expect(ranked.every((r) => r.slug === 'polish' || graph.proximity('polish', r.slug) > 0)).toBe(true);

    // ⚠ AND NARROWING WAS STILL NOT ENOUGH, found the same way — by running it. `polish` happens
    // to sit in a neighbourhood of equally low-population cuisines, so it led on score and the
    // fix looked complete. `mexican` does not: american scores 0.715 at proximity 0.55 against
    // mexican's 0.586 at proximity 1.00, because familiarity ranks `high` over `medium` whatever
    // the query said. "tacos" came back BBQ brisket. A test that only ever asked about polish
    // would still be green.
    const mex = score.scoreCuisines(ctxFor('weekday'), { seed: 'mexican' });
    expect(mex[0].slug, 'the RANKING is still availability-first, and that is correct').not.toBe('mexican');
    expect(mex.find((r) => r.slug === 'mexican')).toBeTruthy();
  });

  it('⚠ a ranking is not a choice — the seed is honoured where the pick is made', async () => {
    // The first fix pinned the seed inside scoreCuisines, which broke topBand: it reads element 0
    // as the best score, so a pinned first element that is not the maximum admits everything
    // ABOVE it into the band. "tacos" went from a wrong answer to a wrong answer with a four-wide
    // band. Ranking and choosing are different jobs; the seed is honoured in the second.
    const out = await suggestForContext({ lang: 'es', queryText: 'tacos', t: tn, now: AT, lat: 1.3, lng: 103.8 });
    expect(out.seed).toBe('mexican');
    expect(out.slug).toBe('mexican');
    expect(out.bandSize).toBe(1);
  });

  it('⚠ an exact dish name beats a substring — iteration order is not a ranking', () => {
    // Four cuisines list a dish whose name contains "dim sum"; exactly one calls it that. The
    // draft took the first CONTAINING match in NATION_OVERLAY order and seeded `singaporean`
    // (from "dim sum brunch"), so a Cantonese query was answered with a Singaporean brunch.
    expect(_seedFromQuery('dim sum')).toBe('cantonese');
    expect(_seedFromQuery('tacos')).toBe('mexican');
    expect(_seedFromQuery('pierogi')).toBe('polish');
    expect(_seedFromQuery('laksa')).toBe('malaysian');
    // Too short to be a claim about anything.
    expect(_seedFromQuery('ai')).toBe(null);
    expect(_seedFromQuery('')).toBe(null);
  });

  it('⚠ the tied band is NAMED, not resolved by a silent jitter', () => {
    // Measured: with no seed and no usage counts, 13 cuisines tie at exactly the top. The terms
    // are that coarse — three familiarity levels, two affinity levels — and presenting one of
    // thirteen as "the top pick" would be dressing a coin toss as a score.
    const ranked = score.scoreCuisines(ctxFor('weekday'), {});
    const band = score.topBand(ranked, 'lunch:weekday');
    expect(band.bandSize).toBeGreaterThan(1);
    expect(band.band.map((b) => b.slug)).toContain(band.pick.slug);
    // Deterministic within a bucket, different across buckets — rotation, not randomness.
    expect(score.topBand(ranked, 'lunch:weekday').pick.slug).toBe(band.pick.slug);
    const other = score.topBand(score.scoreCuisines(ctxFor('holiday'), {}), 'supper:holiday');
    expect(other.pick).toBeTruthy();
    // …and a seed collapses the band to the thing that was asked for. The widened rotation band
    // is deliberately NOT used when something was named — at 0.20 the Polish neighbourhood holds
    // five cuisines, and Ukrainian is a fine suggestion and a poor ANSWER to "pierogi".
    expect(score.topBand(score.scoreCuisines(ctxFor('weekday'), { seed: 'korean' }), 'x').bandSize).toBe(1);
    expect(score.topBand(score.scoreCuisines(ctxFor('weekday'), { seed: 'polish' }), 'x').pick.slug).toBe('polish');
  });

  it('⚠ the meal ladder answers by period — asserted on SCORES, because the top is a 40-way tie', () => {
    // ⚠ ALSO FAILED FIRST TIME, AND ALSO CORRECTLY. The draft asserted the top-ranked dish differs
    // between breakfast and dinner; it came back `'mee tai mak' not to be 'mee tai mak'`. Two
    // things were true at once: mee tai mak really is `mealTime: [breakfast, lunch, dinner]`, and
    // the score at all three is exactly 1.0000 — mealFit 1 and explainability 1 saturate while
    // every other term is absent, so dozens of dishes hold the top and the 1e-6 jitter was
    // choosing. Ranking by identity was reading a coin toss. The band is now named on the dish
    // side too (see taste-suggest.js), and the ladder is asserted where it is real: on the score.
    const sg = NATION_OVERLAY.singaporean.iconicDishes;
    const scoreOf = (name, p) => score.scoreDishes(sg, { period: p, weather: 'unknown', bucketId: `x:${p}` }, { lang: 'en', slug: 'singaporean' })
      .find((x) => x.dish === name).score;
    const typed = sg.filter((d) => Array.isArray(d.mealTime) && d.mealTime.length && !d.mealTime.includes('anytime'));
    expect(typed.length).toBeGreaterThan(50);
    // The property, over every typed dish: a period the dish claims outscores one it does not.
    for (const d of typed) {
      const inP = d.mealTime[0];
      const outP = ['breakfast', 'lunch', 'dinner', 'supper'].find((p) => !d.mealTime.includes(p));
      if (!outP) continue;
      expect(scoreOf(d.name, inP), `${d.name}: ${inP} should beat ${outP}`).toBeGreaterThan(scoreOf(d.name, outP));
    }
    // And where the tie genuinely breaks by period, the top DOES move: supper admits none of the
    // breakfast/lunch/dinner set, so a different dish leads.
    const at = (p) => score.scoreDishes(sg, { period: p, weather: 'unknown', bucketId: `x:${p}` }, { lang: 'en', slug: 'singaporean' })[0].dish;
    expect(at('breakfast')).not.toBe(at('supper'));
    // Rung 4: an untyped dish from a cuisine with no taxonomy is neutral, never absent — every
    // dish reaches that rung equally, so dropping the weight would move the denominator for
    // reasons unrelated to the dish.
    expect(score._mealFit({ name: 'x', kind: 'food' }, 'lunch')).toBe(0.5);
    expect(score._mealFit({ name: 'x', mealTime: ['lunch'] }, 'lunch')).toBe(1);
    expect(score._mealFit({ name: 'x', mealTime: ['lunch'] }, 'breakfast')).toBe(0.15);
  });

  it('weight ORDERING is the claim; the values are expected to move', () => {
    const c = score.WEIGHTS_CUISINE, d = score.WEIGHTS_DISH;
    expect(c.familiarity).toBe(c.proximity);
    expect(c.proximity).toBeGreaterThan(c.novelty);
    expect(c.novelty).toBeGreaterThan(c.dayType);
    expect(d.mealFit).toBeGreaterThan(d.queryFit);
    expect(d.queryFit).toBeGreaterThan(d.weatherFit);
    for (const w of [...Object.values(c), ...Object.values(d)]) expect(w).toBeGreaterThan(0);
  });
});

describe('⚠ Layer 2 is inert, and the PR says so', () => {
  it('⚠ the thresholds are ABSOLUTE — a test written in terms of K_MIN cannot notice K_MIN moving', () => {
    // ⚠ THIS TEST EXISTS BECAUSE A MUTATION SURVIVED. Every assertion below was originally
    // written as `K_MIN - 1` / `K_MIN + 10`, so lowering K_MIN from 25 to 1 — the exact change
    // that would turn a single person's session into a "trusted" statistic about everybody —
    // left the suite green. The fixture moved with the constant. Same shape as the runSearch
    // census that passed while pinning one line of seventeen: a guard that cannot fail.
    //
    // The numbers, and where they come from: ~200 users × ~2 searches/week ≈ 400 observations a
    // week against 18 buckets is ~22 per bucket per week, so 25 is about one week of arrivals.
    // 5 would have been one person's session across 66 cuisines.
    expect(agg.K_MIN).toBe(25);
    expect(agg.CELL_MIN).toBe(5);
    expect(agg.TTL_S).toBe(90 * 24 * 60 * 60);
  });

  it('a bucket below K_MIN contributes exactly nothing', async () => {
    const fake = {
      isOpen: true,
      async get() { return '24'; },   // absolute, deliberately — see the test above
      async hGetAll() { return { 'thai::tom yum goong': '50' }; },
    };
    const b = await agg.readBucket(fake, 'lunch:weekday');
    expect(b.trusted).toBe(false);
    expect(b.rate('thai', 'tom yum goong')).toBeNull();
    // …and the dish scorer therefore does not list rotation as live.
    const s = score.scoreDishes([{ name: 'tom yum goong', kind: 'food' }], { period: 'lunch', bucketId: 'b' }, { bucket: b, slug: 'thai' });
    expect(s[0].liveTerms).not.toContain('rotation');
  });

  it('above K_MIN it becomes live, and a thin CELL still does not', async () => {
    const fake = {
      isOpen: true,
      async get() { return '35'; },   // absolute, deliberately — see the test above
      async hGetAll(k) {
        return k.startsWith('taste:shown')
          ? { 'thai::a': '20', 'thai::b': '4' }
          : { 'thai::a': '5' };
      },
    };
    const b = await agg.readBucket(fake, 'lunch:weekday');
    expect(b.trusted).toBe(true);
    expect(b.rate('thai', 'a')).toBeCloseTo(0.25, 5);
    expect(b.rate('thai', 'b'), 'a rate of 1/1 is not a rate').toBeNull();
  });

  it('every write and read fails soft — instrumentation must never break a reply', async () => {
    const dead = { isOpen: true, async hIncrBy() { throw new Error('down'); }, async get() { throw new Error('down'); }, async hGetAll() { throw new Error('down'); }, async incr() { throw new Error('down'); }, async expire() { throw new Error('down'); } };
    expect(await agg.recordShown(dead, 'lunch:weekday', 'thai', 'x')).toBe(false);
    expect(await agg.recordKept(dead, 'lunch:weekday', 'thai', 'x')).toBe(false);
    expect((await agg.readBucket(dead, 'lunch:weekday')).trusted).toBe(false);
    expect(await agg.recordShown(null, 'b', 's', 'd')).toBe(false);
  });
});

describe('⚠ the nine-locale why never renders the English-only `reason`', () => {
  it('the sentinel appears in no output field, across every slug × every locale', () => {
    // `neighboringCuisines[].reason` is 234 English strings — 1,872 cells to translate for a
    // field nobody asked to see. "We intend not to render it" is not a property; this is.
    const SENTINEL = 'SENTINEL_REASON_MUST_NOT_RENDER';
    const original = new Map();
    for (const [slug, e] of Object.entries(NATION_OVERLAY)) {
      if (!Array.isArray(e.neighboringCuisines)) continue;
      original.set(slug, e.neighboringCuisines.map((n) => n.reason));
      for (const n of e.neighboringCuisines) n.reason = SENTINEL;
    }
    try {
      for (const slug of graph.walkableSlugs()) {
        const d = (NATION_OVERLAY[slug].iconicDishes || [])[0];
        if (!d) continue;
        for (const lang of SUPPORTED) {
          const why = buildWhy({ slug, dish: d.name, ctx: { period: 'dinner' }, lang, seed: 'thai', t: tn, cuisineNameFn: (s, en) => en || s });
          expect(JSON.stringify(why), `${slug}/${lang} rendered a reason`).not.toContain(SENTINEL);
        }
      }
    } finally {
      for (const [slug, reasons] of original) NATION_OVERLAY[slug].neighboringCuisines.forEach((n, i) => { n.reason = reasons[i]; });
    }
  });

  it('the body always comes from something already translated', () => {
    const missing = [];
    for (const slug of graph.walkableSlugs()) {
      const d = (NATION_OVERLAY[slug].iconicDishes || [])[0];
      if (!d) continue;
      for (const lang of SUPPORTED) {
        const why = buildWhy({ slug, dish: d.name, ctx: { period: 'dinner' }, lang, t: tn, cuisineNameFn: (s, en) => en || s });
        if (!['dish-note', 'tourist-explainer'].includes(why.bodySource) || !why.body) missing.push(`${slug}/${lang}`);
        expect(why.headline, `${slug}/${lang} headline unresolved`).not.toMatch(/^taste\./);
      }
    }
    expect(missing, 'these have no translated body in the reader language').toEqual([]);
  });
});

describe('end to end', () => {
  it('⚠ a DISH query seeds the cuisine that serves it — the first draft only handled cuisines', () => {
    // "laksa" named no cuisine alias, so the walk ran unseeded and answered Japanese gyudon.
    expect(_seedFromQuery('laksa')).toBe('malaysian');
    expect(_seedFromQuery('bibimbap')).toBe('korean');
    expect(_seedFromQuery('pierogi')).toBe('polish');
    expect(_seedFromQuery('thai')).toBe('thai');
    expect(_seedFromQuery('zzzzzz')).toBeNull();
    expect(_seedFromQuery('')).toBeNull();
  });

  it('answers in every locale, with no redis at all', async () => {
    for (const lang of SUPPORTED) {
      const s = await suggestForContext({ redis: null, now: AT, lat: 1.3, lng: 103.8, lang, queryText: 'bibimbap', t: tn });
      expect(s, `${lang} returned nothing`).toBeTruthy();
      expect(s.slug).toBe('korean');
      expect(s.headline).toBeTruthy();
      expect(s.body).toBeTruthy();
      expect(s.bandSize).toBe(1);
      // Cold everything: no weather cache, no usage counts, no bucket — and it still answers.
      expect(s.liveSignals).not.toContain('weather');
    }
  });

  it('⚠ the dish tie is REPORTED, not hidden behind a [0]', async () => {
    // Measured on `singaporean`: at breakfast, lunch and dinner the top dish score is exactly
    // 1.0000 and dozens hold it — mealFit and explainability both saturate while every other
    // term is absent. `scoredDishes[0]` was the 1e-6 jitter choosing, dressed as a ranking.
    // Naming the band does not make the answer better; it makes the answer honest, and it is why
    // extending the dish taxonomy from 99 of 1,697 is the highest-leverage follow-up.
    const s = await suggestForContext({ redis: null, now: AT, lat: 1.3, lng: 103.8, lang: 'en', t: tn });
    expect(s.dishBandSize).toBeGreaterThan(1);
    // Deterministic inside a bucket — rotation, not randomness.
    const again = await suggestForContext({ redis: null, now: AT, lat: 1.3, lng: 103.8, lang: 'en', t: tn });
    expect(again.dish).toBe(s.dish);
    // A different meal period reshuffles both bands.
    const later = await suggestForContext({ redis: null, now: new Date('2026-09-02T00:30:00Z'), lat: 1.3, lng: 103.8, lang: 'en', t: tn });
    expect(later.bucketId).not.toBe(s.bucketId);
  });

  it('never throws — a broken redis, absurd input, nothing at all', async () => {
    const hostile = { isOpen: true, get() { throw new Error('x'); }, hGetAll() { throw new Error('x'); } };
    for (const args of [
      { redis: hostile, lang: 'ko', t: tn },
      { lat: NaN, lng: NaN, lang: 'xx', queryText: ' '.repeat(50), t: tn },
      {},
    ]) {
      const out = await suggestForContext(args);
      expect(out === null || typeof out.slug === 'string').toBe(true);
    }
  });
});

// Lifted verbatim from bot-ternary-sweep.test.js. Every source pin in this repo has eventually
// tripped over a comment describing the pattern it forbids — this is the ninth.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

describe('the empty state it lands in', () => {
  const src = require('fs').readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');

  it('handleNoResults is localised, and the false "200m" is gone', () => {
    // A source pin, and named as one — index.js exports nothing. It was a hardcoded English
    // template literal claiming a 200 m radius the code never uses (500/1000/2000 m, and the
    // cuisine ladder reaches 60 km).
    expect(src, 'the hardcoded English decline is back').not.toContain("Soleat couldn't find a ");
    expect(src, 'the false radius is back').not.toMatch(/within 200m of you/);
    expect(src).toMatch(/tn\('taste\.noResults', lang, \{ meal: mealLabel/);
  });

  it('⚠ deliverPicks renders in the reader\'s locale from every one of its call sites', () => {
    // ⚠ THIS TEST FOUND MORE THAN IT WAS WRITTEN TO FIND, and the first version of it was wrong
    // twice. It scanned the whole file for the fr-or-en collapse and failed — on the COMMENT four
    // lines above the fix, which quotes the pattern it replaced. Ninth self-referential comment
    // trap in this arc, so the mask is lifted verbatim from bot-ternary-sweep.test.js.
    //
    // Masked, it still failed, and that failure was real: runFreeTextSearch and
    // runPlaceAnchoredSearch each narrowed `opts.lang` to fr-or-en and then passed the result
    // INTO deliverPicks, so widening the allow-list inside deliverPicks changed nothing on the
    // three paths that pass a lang at all. The other eleven call sites pass none. runCuisineFlow
    // resolves the locale twice — to translate the reviews and to write the fun fact — and then
    // delivered the cards around that Korean review in English.
    //
    // Fifth instance of the shape this arc: one datum, several call sites, only one asked.
    const masked = maskComments(src);
    expect(masked, 'the fr-or-en collapse is back on a path that feeds deliverPicks')
      .not.toMatch(/\['en','fr'\]\.includes\(opts\.lang\)/);
    // Resolved at the layer that holds the chatId, not at fourteen call sites.
    expect(masked).toMatch(/dpLang = await resolveLang\(redis, chatId, null\)/);
    // A census, not a spot check: every deliverPicks call still routes through that one resolution.
    // ⚠ AND IT IS RESOLVED BEFORE THE EMPTY-PICKS BRANCH, not after. The first placement put the
    // resolution below it, so the one path this release exists to improve still received an
    // undefined lang and still declined in English. A fix after the early return is not a fix,
    // and nothing but an ordering assertion can see that.
    const fn = /async function deliverPicks[\s\S]*?\n\}/.exec(masked)[0];
    expect(fn.indexOf('resolveLang'), 'deliverPicks no longer resolves a locale').toBeGreaterThan(-1);
    expect(fn.indexOf('resolveLang')).toBeLessThan(fn.indexOf('handleNoResults('));
    expect(fn).toMatch(/handleNoResults\(chatId, mealLabel, \{\s*\n\s*lang: dpLang,/);

    // `await` excludes the declaration; 15 occurrences, 14 of them calls.
    const calls = [...masked.matchAll(/await deliverPicks\(/g)].length;
    expect(calls, 'call sites moved — re-read the resolution above before changing this number').toBe(14);
    expect([...masked.matchAll(/\bdeliverPicks\(/g)].length).toBe(calls + 1);
  });

  it('every interpolated value is escaped before it reaches parse_mode HTML', () => {
    // dish notes are curated prose full of apostrophes and dashes. This is the exact
    // unescaped-text-in-HTML failure the gia-preflight skill exists to catch.
    const body = /async function handleNoResults[\s\S]*?\n\}/.exec(src)[0];
    expect(body).toContain('escapeHtml');
    for (const v of ['decline', 'suggestion.headline', 'suggestion.body']) {
      expect(body, `${v} reaches HTML unescaped`).toMatch(new RegExp(`escapeHtml\\(${v.replace('.', '\\.')}\\)`));
    }
  });
});
