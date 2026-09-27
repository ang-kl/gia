// taste-suggest.js — v0.62.901
//
// The one async orchestrator for §2,911·C. Everything below it is pure and unit-tested by
// calling; this file exists to do the IO and hand the pure parts their inputs.
//
//   taste-context   what the context IS          (period, day type, weather, no identity)
//   taste-graph     which cuisines are adjacent  (234 curated edges, symmetrised, hub-damped)
//   taste-score     which one, and which dish    (renormalised over live terms only)
//   taste-why       how to say it in nine locales (frames + already-translated bodies)
//   taste-aggregate what everyone else did       (18 buckets, k-anonymous, inert for now)
//
// IT NEVER THROWS AND NEVER BLOCKS. Its only caller is `handleNoResults` — the moment somebody
// asked for food and got none. Turning that into an error, or into a wait, would be worse than
// the empty answer it is trying to improve on. Every failure path returns null and the caller
// sends the plain localised decline.
//
// NO LLM, NO PLACES CALL, NO NEW NETWORK IO. The suggestion is a lookup over data already on
// disk, so there is no `spend-guard` shed name and no `api-cost` entry — and, deliberately, no
// reason for either. If that ever changes, both become required.

'use strict';

const { NATION_OVERLAY } = require('./nation-overlay');
const { buildContext } = require('./taste-context');
const { scoreCuisines, scoreDishes, topBand } = require('./taste-score');
const { buildWhy } = require('./taste-why');
const aggregate = require('./taste-aggregate');

// One dynamic import, memoised. The shared cuisine-name table is ESM and this file is CommonJS —
// and a root CJS copy is exactly the defect #1834 fixed, when the clipboard's hand-kept copy sat
// three locales and one whole table behind. The table has no imports of its own, so it resolves
// from the repo root; `map-and-chrome-i18n.test.js` already crosses this boundary.
let _cuisineNameFn = null;
async function _loadCuisineName() {
  if (_cuisineNameFn) return _cuisineNameFn;
  try {
    const m = await import('./web/_shared/lib/cuisine-i18n.js');
    _cuisineNameFn = m.cuisineName;
  } catch {
    _cuisineNameFn = (slug, en) => en || slug;   // English is a correct answer, just not localised
  }
  return _cuisineNameFn;
}

/** Read the EXISTING identity-free usage HASH, folded onto slugs. Never throws. */
async function _usageCounts(redis) {
  if (!redis || !redis.isOpen) return {};
  try {
    const raw = await redis.hGetAll('usage:cuisine');
    if (!raw) return {};
    const { slugify } = require('./cuisines-vault');
    const out = {};
    for (const [name, n] of Object.entries(raw)) {
      const s = slugify(name);
      if (!s) continue;
      out[s] = (out[s] || 0) + (Number(n) || 0);
    }
    return out;
  } catch { return {}; }
}

/**
 * What the free text points at, as a graph SEED rather than a scoring term — intent must
 * dominate, and a 0.10 weight cannot dominate.
 *
 * ⚠ TWO WAYS IN, AND THE SECOND WAS MISSING ON THE FIRST DRAFT. A query naming a cuisine
 * ("thai") seeds directly. A query naming a DISH ("laksa") named nothing, so the walk ran
 * unseeded and the suggestion came back Japanese gyudon — a defensible score and a useless
 * answer. Caught by running it, not by reading it. A dish now seeds the cuisine that serves it,
 * which is the whole point of the operator's *"free-text query (intepreted)"*.
 */
function _seedFromQuery(queryText) {
  const q = String(queryText || '').trim();
  if (!q) return null;
  try {
    const { findNationByAlias } = require('./nation-overlay');
    const hit = findNationByAlias(q);
    if (hit && hit.slug && NATION_OVERLAY[hit.slug]) return hit.slug;
  } catch { /* fall through to the dish route */ }
  try {
    const needle = q.toLowerCase();
    if (needle.length < 4) return null;
    // ⚠ TWO PASSES, AND THE ONE-PASS VERSION PICKED THE WRONG CUISINE. The draft took the first
    // dish whose name CONTAINED the query, and iteration order over NATION_OVERLAY decided the
    // rest: "dim sum" matched `singaporean/dim sum brunch` before it ever reached
    // `cantonese/dim sum`, so a Cantonese query was answered with a Singaporean brunch. Four
    // cuisines list a dish containing that string; exactly one calls it that. An exact name is a
    // stronger claim than a substring, so it goes first — the same reason the anchor rules
    // elsewhere in this repo prefer the landmark to the line number.
    let contains = null;
    for (const [slug, entry] of Object.entries(NATION_OVERLAY)) {
      for (const d of (entry.iconicDishes || [])) {
        const n = String(d && d.name || '').toLowerCase();
        if (!n) continue;
        if (n === needle) return slug;
        if (!contains && n.includes(needle)) contains = slug;
      }
    }
    if (contains) return contains;
  } catch { /* no seed */ }
  return null;
}

function _queryTerms(queryText) {
  const q = String(queryText || '').trim();
  if (!q) return [];
  try {
    const { distinctiveDishWords } = require('./cuisine-family');
    return distinctiveDishWords(q) || [];
  } catch { return []; }
}

/**
 * @returns {Promise<null | {slug, dish, headline, body, bodySource, bucketId, bandSize, dishBandSize, liveSignals, seed}>}
 */
async function suggestForContext({ redis = null, now = new Date(), lat = null, lng = null, lang = 'en', queryText = '', countryCode = 'SG', t } = {}) {
  try {
    const ctx = await buildContext({ now, lat, lng, redis, queryText });
    const seed = _seedFromQuery(queryText);
    const usageCounts = await _usageCounts(redis);

    const ranked = scoreCuisines(ctx, { seed, usageCounts, countryCode });

    // ⚠ A CUISINE SOMEBODY NAMED IS AN ANSWER, NOT A CANDIDATE — and neither weighting nor
    // narrowing the candidate set achieved that. Measured with `seed = mexican`: the
    // neighbourhood was right and the order inside it was not, american scoring 0.715 at
    // proximity 0.55 against mexican's 0.586 at proximity 1.00, because familiarity ranks `high`
    // over `medium` whatever the query said. "tacos" came back BBQ brisket — the pierogi defect
    // a second time, wearing the first fix as a disguise.
    //
    // The neighbourhood still earns its keep: it answers when the named cuisine CANNOT be served
    // — excluded from the walk, or carrying no dishes — and that is the only case in which
    // `taste.why.neighbour` tells the truth.
    const servable = (s) => !!(NATION_OVERLAY[s] && (NATION_OVERLAY[s].iconicDishes || []).length);
    const seedRow = seed && servable(seed) ? ranked.find((r) => r.slug === seed) : null;
    // Widen only when nothing was named. See taste-score.js's ROTATION_EPSILON: with a seed the
    // band is the tie band, because a query that says "pierogi" is answered, not rotated.
    const { pick, bandSize } = seedRow
      ? { pick: seedRow, bandSize: 1 }
      : topBand(ranked, ctx.bucketId, { widen: !seed });
    if (!pick) return null;

    const entry = NATION_OVERLAY[pick.slug];
    const dishes = (entry && entry.iconicDishes) || [];
    if (!dishes.length) return null;

    const bucket = await aggregate.readBucket(redis, ctx.bucketId);
    const scoredDishes = scoreDishes(dishes, ctx, {
      lang, queryTerms: _queryTerms(queryText), bucket, slug: pick.slug,
    });
    if (!scoredDishes.length) return null;
    // ⚠ THE DISH SIDE TIES HARDER THAN THE CUISINE SIDE, and taking [0] hid it. Measured on
    // `singaporean`: at breakfast, at lunch and at dinner the top score is exactly 1.0000 and
    // dozens of dishes hold it — mealFit 1 and explainability 1 saturate, and everything else is
    // absent. `scoredDishes[0]` was therefore the 1e-6 jitter picking, presented as a ranking.
    // Same treatment as the cuisine band: name it, rotate on the bucket hash, and return the size
    // so the caller can say how much of the answer was scoring.
    const dishBand = topBand(scoredDishes, `${ctx.bucketId}|${pick.slug}`);
    const dish = dishBand.pick.dish;

    const cuisineNameFn = await _loadCuisineName();
    const why = buildWhy({ slug: pick.slug, dish, ctx, lang, seed, t, cuisineNameFn });

    // Fire-and-forget: an impression is worth recording, and is never worth delaying a reply for.
    aggregate.recordShown(redis, ctx.bucketId, pick.slug, dish).catch(() => {});

    return {
      slug: pick.slug,
      dish,
      headline: why.headline,
      body: why.body,
      bodySource: why.bodySource,
      dishLabel: why.dishLabel,
      bucketId: ctx.bucketId,
      // Surfaced so a caller — and the PR — can say how much of the answer was scoring and how
      // much was rotation inside a tied band. See taste-score.js's `topBand`.
      bandSize,
      dishBandSize: dishBand.bandSize,
      liveSignals: ctx.liveSignals,
      seed,
    };
  } catch (err) {
    console.warn('[taste-suggest] suppressed:', err && err.message);
    return null;
  }
}

module.exports = { suggestForContext, _seedFromQuery, _queryTerms, _usageCounts };
