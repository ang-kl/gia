// taste-score.js — v0.62.901
//
// WHAT SHOULD SOMEBODY EAT, GIVEN A CONTEXT AND NOTHING ABOUT THEM.
//
// Deterministic, pure, synchronous. No `Math.random` anywhere — the same context returns the same
// answer within a meal period, and a different period reshuffles. That is what makes the whole
// thing unit-testable by calling, and it is why ties break on a hash rather than a coin.
//
// ── THE RENORMALISATION RULE, which is the one idea here ──────────────────────────────────────
//
//     score = Σ(wᵢ · termᵢ) / Σ(wᵢ over terms that are LIVE)
//
// A term is LIVE only when its input actually exists. No seed cuisine → the graph term drops out
// of the numerator AND the denominator. Cold weather cache → weather drops. No taxonomy on a dish
// → weather drops for that dish alone.
//
// This is what makes cold start the PRIMARY path rather than a fallback branch: there is one code
// path, and a missing signal quietly shrinks the denominator instead of contributing a guessed
// zero — which would rank an unknown dish below a known-bad one. It is also why extending the
// dish taxonomy from its 1,177-of-1,697 rows improves results later with NO CODE CHANGE.
//
// ── THE WEIGHTS, AND WHY EACH NUMBER ──────────────────────────────────────────────────────────
//
// Every weight is a named constant with its reasoning attached, because a weight nobody can
// justify is a magic number. They are exported so the test asserts their ORDERING — the ordering
// is the claim; the exact values are not, and are expected to move once the aggregate can
// evaluate them (see taste-aggregate.js's header).

'use strict';

const crypto = require('crypto');
const { NATION_OVERLAY } = require('./nation-overlay');
const graph = require('./taste-graph');

// ── Stage A: which cuisine ────────────────────────────────────────────────────────────────────
const WEIGHTS_CUISINE = Object.freeze({
  // At ~200 users the failure mode is not a boring pick — it is a pick with ZERO venues inside
  // the radius. `populationInSG` is the only availability proxy that ships, and it is complete on
  // all 66. Highest single weight; not higher, or the answer is "Singaporean" every time.
  familiarity: 0.30,
  // The 234 hand-written edges are the only curated similarity data in the repo, and were dead
  // code until v0.62.901. Equal to familiarity so an explicit seed can overcome the safe pick.
  proximity: 0.30,
  // Stops monoculture. Reads the EXISTING identity-free `usage:cuisine` HASH — no new key.
  novelty: 0.20,
  // Weekend and public holidays. ⚠ THE FIRST DRAFT'S CLAIM HERE WAS FALSE and the plan repeated
  // it: "inverts familiarity … testable by flipping the day and asserting the ranking REVERSES".
  // Measured, it cannot reverse — a 0.10 term cannot overturn a 0.30 one, and the arithmetic is
  // two lines: on a leisure day a `high` cuisine still scores 0.60 against a `low`'s 0.30. Worse,
  // the draft's weekday branch set this term EQUAL to familiarity, which is exactly the parallel
  // double-count the comment denied — familiarity at an effective 0.40.
  // What it does, and all it does: on a leisure day it NARROWS the familiarity gap (0.5625 →
  // 0.30, measured), which widens the tied band and lets rarer cuisines into it. On a weekday it
  // is ABSENT, because a signal that says the same thing about every candidate is not a signal —
  // that is the renormalisation rule applied to itself.
  dayType: 0.10,
  // Comfort-adjacent, not comfort-identical. Reads the request's `lang`/`cc` arguments only.
  localeAffinity: 0.10,
});

// ── Stage B: which dish, within the winning cuisines ──────────────────────────────────────────
const WEIGHTS_DISH = Object.freeze({
  // 07:00 versus 21:00 is the most consequential axis, and the operator named it first.
  mealFit: 0.35,
  // What they typed beats what we inferred.
  queryFit: 0.30,
  // Live on the 99 typed dishes, INERT on the other 1,598 — not guessed.
  weatherFit: 0.15,
  // A dish we cannot explain in the reader's language scores lower. This makes the nine-locale
  // constraint a TERM OF THE OBJECTIVE rather than a filter applied after the fact.
  explainability: 0.10,
  // Layer 2. Live only once its bucket clears K_MIN, which at 200 users is about a week.
  rotation: 0.10,
});

const POP_SCORE = Object.freeze({ high: 1.0, medium: 0.6, low: 0.25 });
const LEISURE_DAYS = new Set(['weekend', 'holiday']);
// ⚠ AND `drink` WAS A TYPE THE WEATHER TERM DID NOT KNOW. 91 of the 1,598 unclassified dishes are
// `kind: 'drink'`, the drafting enum lists `type: drink`, and neither set below mentioned it — so
// every drink landed in the neutral bucket. A hot drink on a wet day is the clearest case this
// term exists for, and it was the one case it could not answer.
//
// Split rather than lumped: `hot-drink` and `cold-drink` are separate authored values, and a
// drink genuinely served both ways stays `drink` and stays neutral. Guessing which way a teh
// tarik is drunk would be worse than saying nothing, which is the rule the whole scorer runs on.
const WET_TYPES = new Set(['soup', 'stew-curry', 'hot-drink']);
const DRY_TYPES = new Set(['grilled', 'snack', 'seafood', 'cold-drink']);

/** Sum only the live terms, then divide by their weight. See the header. */
function _blend(terms) {
  let num = 0, den = 0;
  const live = [];
  for (const [name, { w, v }] of Object.entries(terms)) {
    if (v === null || v === undefined) continue;
    num += w * v;
    den += w;
    live.push(name);
  }
  return { score: den > 0 ? num / den : 0, liveTerms: live, weight: den };
}

// Deterministic tie-break. A hash rather than a coin, so the same context is the same answer.
function _jitter(key) {
  return parseInt(crypto.createHash('sha256').update(key).digest('hex').slice(0, 8), 16) / 0xffffffff;
}

/**
 * @param {object} ctx        from taste-context.buildContext
 * @param {object} opts
 * @param {string|null} opts.seed        a cuisine slug the query named, or null
 * @param {object} opts.usageCounts      slug → count, from the existing usage:cuisine HASH
 * @param {string} opts.countryCode
 * @returns {Array<{slug, score, liveTerms, terms}>} every walkable slug, best first
 */
function scoreCuisines(ctx = {}, { seed = null, usageCounts = {}, countryCode = 'SG' } = {}) {
  let slugs = graph.walkableSlugs();

  // ⚠ WHEN SOMEBODY NAMED SOMETHING, ANSWER WITH THAT. The candidate set narrows to the seed and
  // its ≤2-hop neighbourhood before any scoring happens.
  //
  // Weighting alone does NOT achieve this, which the first draft proved: with `seed = polish`,
  // proximity 1.0 at w=0.30 scored ~0.40 against an unrelated `high`-population cuisine's 0.625,
  // because familiarity (0.30) plus dayType (0.10) plus localeAffinity (0.10) outvote it. The
  // suggestion for "pierogi" came back Japanese gyudon — arithmetically defensible and a useless
  // answer to the question asked. Found by running it, not by reading it.
  //
  // Narrowing rather than reweighting is also the truer model: familiarity then ranks WITHIN the
  // neighbourhood, which says "you asked for Polish; here is Polish, or its nearest relatives if
  // Polish is thin on the ground here" — instead of "you asked for Polish, have some ramen".
  if (seed) {
    const near = slugs.filter((s) => s === seed || graph.proximity(seed, s) > 0);
    // Only if the seed actually has a neighbourhood. A seed with no edges would otherwise narrow
    // the field to one and stop being a suggestion at all.
    if (near.length >= 2) slugs = near;
  }
  const counts = Object.values(usageCounts || {}).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  // p95 rather than max: one runaway cuisine would otherwise flatten every other novelty score.
  const p95 = counts.length ? counts[Math.min(counts.length - 1, Math.floor(counts.length * 0.95))] : 0;

  let isUnfamiliar = null;
  try { ({ isUnfamiliar } = require('./cuisine-family')); } catch { /* term stays absent */ }

  const out = slugs.map((slug) => {
    const entry = NATION_OVERLAY[slug] || {};
    const fam = POP_SCORE[entry.populationInSG] ?? null;

    const terms = {
      familiarity: { w: WEIGHTS_CUISINE.familiarity, v: fam },
      // Absent, not zero, when nothing seeded the walk — otherwise every slug would be punished
      // equally for a signal that does not exist, which is the same as no signal but with a
      // smaller denominator.
      proximity: { w: WEIGHTS_CUISINE.proximity, v: seed ? graph.proximity(seed, slug) : null },
      novelty: { w: WEIGHTS_CUISINE.novelty, v: p95 > 0 ? 1 - Math.min(1, (Number(usageCounts[slug]) || 0) / p95) : null },
      // On a leisure day, unfamiliar scores HIGH — people range further when they are not
      // squeezing lunch into forty minutes. On a weekday: ABSENT. The first draft returned `fam`
      // here, i.e. a verbatim copy of the familiarity term, which shifts no ranking and inflates
      // familiarity's effective weight to 0.40 while the comment above claimed the opposite.
      dayType: {
        w: WEIGHTS_CUISINE.dayType,
        v: (fam === null || !LEISURE_DAYS.has(ctx.dayType)) ? null : 1 - fam,
      },
      localeAffinity: {
        w: WEIGHTS_CUISINE.localeAffinity,
        v: isUnfamiliar ? (isUnfamiliar(slug, countryCode) ? 0.35 : 1) : null,
      },
    };
    const { score, liveTerms } = _blend(terms);
    // 1e-6 — enough to order equal scores stably, far too small to reorder unequal ones.
    return { slug, score: score + _jitter(`${slug}|${ctx.bucketId || ''}`) * 1e-6, liveTerms, terms };
  });
  // Descending, always — `topBand` reads element 0 as the best score, and a pinned first element
  // that is NOT the maximum silently admits everything above it into the band. That is not a
  // hypothetical: the first attempt at honouring a named seed pinned it here, and "tacos" went
  // from a wrong answer to a wrong answer with a four-wide band. The seed is honoured in
  // taste-suggest.js, where the CHOICE is made; this function stays a ranking.
  return out.sort((a, b) => b.score - a.score);
}

// ⚠ THE AUTHORED VOCABULARY AND THE SCORER'S PERIODS WERE NOT THE SAME VOCABULARY, and nothing
// said so. `mealPeriodSGT` has six ids; the taxonomy's drafting enum
// (scripts/draft-dish-taxonomy.mjs) had five, three of which are periods and two of which are not:
//
//     authored   breakfast · lunch · dinner · snack · anytime
//     periods    breakfast · lunch · afternoon · dinner · supper · night_supper
//
// Measured over the 99 rows that exist, exact-match dishes per period: breakfast 21, lunch 87,
// dinner 83, **afternoon 0, supper 0, night_supper 0**. At half the periods the taxonomy was
// inert EVEN WHERE IT EXISTED — and those are the periods a suggestion helps most, because at
// 3pm or 4am the question "what is even open, and what do people eat now" is the whole question.
// `snack` matched nothing at all: it is a `type` word that ended up in the `mealTime` field.
//
// Found while sizing the 1,598-row backfill, which would have multiplied it sixteenfold.
//
// The fix is an ALIAS, not a rewrite of the 20 legacy rows (AU-1: add, never compress). `snack`
// resolves to `afternoon` and only `afternoon` — `mealPeriodSGT` labels that window "afternoon
// snack" in so many words (15:00-17:00, vibe-suggest.js:26), so the mapping is the source's own
// wording rather than a judgement of mine. Extending it to `supper` as well would be
// over-claiming: bak kwa at 11pm is fine, but that is not what the value meant.
const MEALTIME_ALIAS = Object.freeze({ snack: ['afternoon'] });

/** The authored array resolved into period ids. Legacy values expand; unknown ones pass through. */
function _periodsOf(mealTime) {
  const out = new Set();
  for (const m of mealTime) {
    const alias = MEALTIME_ALIAS[m];
    if (alias) { for (const a of alias) out.add(a); } else out.add(m);
  }
  return out;
}

function _mealFit(dish, period) {
  // Rung 1 — the taxonomy, exact, on 1,177 of 1,697 dishes across 40 cuisines (v0.62.918).
  // ⚠ THE `anytime` BRANCH BELOW SHORT-CIRCUITS, and that is load-bearing: a row authored
  // `["breakfast","snack","anytime"]` never reaches the period test, so its real periods are
  // dead. Five rows were in that state until v0.62.919; `__tests__/dish-taxonomy.test.js`
  // now forbids the mix over the SHIPPED table, not just on the way in.
  if (Array.isArray(dish.mealTime) && dish.mealTime.length) {
    if (dish.mealTime.includes('anytime')) return 0.7;
    return _periodsOf(dish.mealTime).has(period) ? 1 : 0.15;
  }
  // Rung 2 — drinks, which every cuisine has and which read clearly by period.
  if (dish.kind === 'drink') {
    return (period === 'breakfast' || period === 'afternoon' || period === 'supper') ? 0.85 : 0.35;
  }
  // Rung 3 — the regex food-group fallback. Its vocabulary is SG/Malay-hawker, so it answers for
  // a minority of the catalogue and returns null elsewhere rather than guessing.
  try {
    const { foodGroupFor } = require('./dish-food-group');
    const g = foodGroupFor(dish.name, dish.kind);
    if (g && g !== 'other') {
      const table = {
        rice: ['lunch', 'dinner'], noodles: ['lunch', 'dinner'], soup: ['dinner', 'supper'],
        grilled: ['dinner', 'supper'], seafood: ['dinner'], sweet: ['afternoon', 'supper'],
        snack: ['afternoon', 'supper'], 'bread-dumpling': ['breakfast', 'afternoon'],
      };
      const want = table[g];
      if (want) return want.includes(period) ? 0.9 : 0.25;
    }
  } catch { /* fall through */ }
  // Rung 4 — nothing known. Neutral rather than absent: every dish reaches this rung equally, so
  // dropping the weight here would change the denominator for reasons unrelated to the dish.
  return 0.5;
}

/**
 * @param {Array} dishes    iconicDishes[] of one cuisine
 * @param {object} ctx
 * @param {object} opts     { lang, queryTerms[], bucket }  bucket from taste-aggregate.readBucket
 */
function scoreDishes(dishes, ctx = {}, { lang = 'en', queryTerms = [], bucket = null, slug = '' } = {}) {
  const terms = (queryTerms || []).map((t) => String(t).toLowerCase()).filter((t) => t.length >= 3);
  const out = (dishes || []).filter((d) => d && d.name).map((dish) => {
    const hay = `${dish.name} ${(dish.note && dish.note.en) || ''}`.toLowerCase();
    const hits = terms.length ? terms.filter((t) => hay.includes(t)).length : 0;

    const t = {
      mealFit: { w: WEIGHTS_DISH.mealFit, v: _mealFit(dish, ctx.period) },
      queryFit: { w: WEIGHTS_DISH.queryFit, v: terms.length ? Math.min(1, hits / terms.length) : null },
      weatherFit: {
        w: WEIGHTS_DISH.weatherFit,
        // Inert without the taxonomy, and inert when the weather cache was cold — two separate
        // reasons for the same honest absence.
        v: (!dish.type || ctx.weather === 'unknown' || !ctx.weather) ? null
          : (ctx.weather === 'wet' ? (WET_TYPES.has(dish.type) ? 1 : 0.3)
            : (DRY_TYPES.has(dish.type) ? 1 : 0.5)),
      },
      explainability: { w: WEIGHTS_DISH.explainability, v: (dish.note && dish.note[lang]) ? 1 : 0.3 },
      rotation: {
        w: WEIGHTS_DISH.rotation,
        // Layer 2, and null until its bucket clears K_MIN — see taste-aggregate.js.
        v: bucket && bucket.trusted ? bucket.rate(slug, dish.name) : null,
      },
    };
    const { score, liveTerms } = _blend(t);
    return { dish: dish.name, score: score + _jitter(`${slug}::${dish.name}|${ctx.bucketId || ''}`) * 1e-6, liveTerms, terms: t };
  });
  return out.sort((a, b) => b.score - a.score);
}

// ⚠ THE TERMS ARE COARSE, AND PRETENDING OTHERWISE WOULD BE THE LIE.
//
// Measured on this data: with no seed and no usage counts, **13 cuisines tie at exactly the top
// score**; with realistic usage counts, 6 do. That is not a bug in the arithmetic — it is what
// happens when `populationInSG` has three levels, `localeAffinity` has two, and `dayType` is
// derived from familiarity. When the context genuinely does not discriminate, it does not
// discriminate, and a 1e-6 jitter silently picking one of thirteen and presenting it as "the top
// pick" would be dressing a coin toss as a score.
//
// So the band is NAMED and the choice inside it is deliberate: take everything within EPSILON of
// the best score, and rotate within it on the bucket hash. Same bucket, same answer; a different
// meal period or day type reshuffles. That turns an accident of floating-point into a stated
// design — and `bandSize` is returned so a caller (and the PR) can say how much of the answer was
// scoring and how much was rotation.
const BAND_EPSILON = 0.01;

// ⚠ AND THE ROTATION BAND IS WHERE THE DAY TYPE ACTUALLY DOES SOMETHING. The first draft scored
// the day type into the answer and I asserted the ranking would reverse. Running it showed the
// term changed NOTHING observable: same 13-cuisine band, every member `high`, on a weekday and a
// weekend alike. It moved the numbers and not the output — a weight that cannot change an answer.
//
// Measured gaps from the top score, by familiarity tier:
//
//                weekday        leisure day
//     high         0.0000          0.0000
//     medium       0.3000          0.1600
//     low          0.5625          0.3000
//
// So ONE threshold, 0.20, does the whole job: on a weekday it admits the high tier alone (medium
// sits 0.30 back); on a weekend or a public holiday the inversion pulls medium to 0.16 and it
// comes into the rotation, while low stays out at 0.30. The behaviour the plan wanted — "people
// range further when they are not squeezing lunch into forty minutes" — is real, is one tier
// wide, and is a consequence of the score rather than a second rule bolted beside it. Band sizes,
// measured: 15 on a weekday, 24 on a weekend.
//
// 0.20 is the midpoint of a measured interval, not a taste: anything in (0.16, 0.30) produces
// exactly this partition, and the arc has been bitten twice by thresholds picked before the
// distribution was looked at (the anchor tolerance sized to a 45-minute outlier, the review
// length band that passed both a truncated and a doubled cell).
const ROTATION_EPSILON = 0.20;

/**
 * @param {Array} scored
 * @param {string} bucketId
 * @param {object} opts
 * @param {boolean} opts.widen  rotate across the leisure band instead of the tie band. TRUE only
 *                              when nothing was named: a query that says "pierogi" is answered,
 *                              not rotated, and at 0.20 the Polish neighbourhood alone holds five
 *                              cuisines — Ukrainian is a fine suggestion and a poor ANSWER.
 */
function topBand(scored, bucketId = '', { widen = false } = {}) {
  if (!Array.isArray(scored) || !scored.length) return { pick: null, band: [], bandSize: 0 };
  const best = scored[0].score;
  const eps = widen ? ROTATION_EPSILON : BAND_EPSILON;
  const band = scored.filter((x) => best - x.score <= eps);
  const idx = Math.floor(_jitter(`band|${bucketId}`) * band.length) % band.length;
  return { pick: band[idx], band, bandSize: band.length };
}

module.exports = {
  scoreCuisines, scoreDishes, topBand,
  WEIGHTS_CUISINE, WEIGHTS_DISH, POP_SCORE, BAND_EPSILON, ROTATION_EPSILON, LEISURE_DAYS,
  _blend, _mealFit, _jitter, _periodsOf, MEALTIME_ALIAS, WET_TYPES, DRY_TYPES,
};
