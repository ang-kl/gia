// taste-why.js — v0.62.901
//
// WHY THIS DISH, IN THE READER'S LANGUAGE — without translating anything.
//
// Operator: the whole feature had to be *"translate into good data algorithm for usage across
// 9 locales"*. The obvious source for "why" is `neighboringCuisines[].reason`, which is exactly
// what you want ("Isaan (NE Thai) cuisine is essentially Lao") and is **ENGLISH ONLY** — 234
// hand-written strings, 1,872 cells to translate for a field nobody asked to see.
//
// ⚠ SO `reason` NEVER REACHES A RENDER PATH. It stays a build- and match-time input. There is a
// test that runs this module over a fixture whose every `reason` is a sentinel and asserts the
// sentinel appears in no output field, across 66 slugs × 9 locales — because "we intend not to
// render it" is not a property, and this is.
//
// THE COPY IS COMPOSED FROM THINGS ALREADY TRANSLATED, measured on current main:
//
//   frame   13 new i18n keys, authored in all nine locales
//   slots   cuisineName()  — 95 slugs × 8 non-EN, complete since v0.62.896
//           namesFor()     — dish-names-i18n.js, root CJS, returns null for an unknown dish
//           period label   — taste.period.* keys
//   body    dish.note[lang]              — 1,682 of 1,697 dishes, COMPLETE in all nine locales
//           touristExplainer[lang]       — 66 of 66, complete in all nine (since v0.62.897)
//
// The body fallback exists for exactly the 15 dishes with no note. Both sources were counted, not
// assumed: `{en:1682, fr:1682, id:1682, ru:1682, de:1682, zh:1682, ja:1682, es:1682, ko:1682}`.
//
// PURE AND SYNCHRONOUS, with the cuisine-name lookup INJECTED. The shared name table lives in
// `web/_shared/lib/cuisine-i18n.js` and is ESM; the bot is CommonJS. Rather than keep a root copy
// — which is precisely the defect #1834 fixed, when the clipboard's hand-kept copy sat three
// locales and one whole table behind — the orchestrator does one `await import()` and passes the
// function in. One table, two module systems, no second copy.

'use strict';

const { NATION_OVERLAY } = require('./nation-overlay');

// `mealPeriodSGT`'s six ids → the i18n key suffix. `night_supper` is the only one that is not a
// straight pass-through, and it is spelled out rather than derived so a rename fails loudly.
const PERIOD_KEY = Object.freeze({
  breakfast: 'taste.period.breakfast',
  lunch: 'taste.period.lunch',
  afternoon: 'taste.period.afternoon',
  dinner: 'taste.period.dinner',
  supper: 'taste.period.supper',
  night_supper: 'taste.period.nightSupper',
});

/**
 * @param {object} o
 * @param {string} o.slug
 * @param {string} o.dish            the English dish name, as it appears in iconicDishes
 * @param {object} o.ctx             from taste-context.buildContext
 * @param {string} o.lang
 * @param {string|null} o.seed       the cuisine the query named, if any
 * @param {function} o.t             tn(key, lang, vars) from i18n.js
 * @param {function} o.cuisineNameFn (slug, englishFallback, lang) → string
 * @returns {{headline:string, body:string, bodySource:string, frameKey:string, dishLabel:string, cuisineLabel:string}}
 */
function buildWhy({ slug, dish, ctx = {}, lang = 'en', seed = null, t, cuisineNameFn } = {}) {
  const entry = NATION_OVERLAY[slug] || {};
  const tn = typeof t === 'function' ? t : ((k) => k);
  const nameOf = typeof cuisineNameFn === 'function' ? cuisineNameFn : ((s, en) => en || s);

  const cuisineLabel = nameOf(slug, slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), lang);

  let dishLabel = dish;
  try {
    const { namesFor } = require('./dish-names-i18n');
    const n = namesFor(dish, slug);
    if (n && n[lang]) dishLabel = n[lang];
  } catch { /* the English name is a correct answer, just not a localised one */ }

  // The frame, in priority order. Only one renders — a headline that says four things says none.
  let frameKey = 'taste.why.local';
  const vars = { cuisine: cuisineLabel, dish: dishLabel };
  if (seed && seed !== slug) {
    frameKey = 'taste.why.neighbour';
    vars.seed = nameOf(seed, seed.replace(/-/g, ' '), lang);
  } else if (ctx.weather === 'wet') {
    frameKey = 'taste.why.rain';
  } else if (entry.populationInSG === 'low') {
    frameKey = 'taste.why.rare';
  } else if (PERIOD_KEY[ctx.period]) {
    frameKey = 'taste.why.period';
    vars.period = tn(PERIOD_KEY[ctx.period], lang);
  }

  // The body. `note` first because it is about THIS dish; the explainer is about the cuisine and
  // is the fallback for the 15 dishes without one.
  let body = '';
  let bodySource = 'none';
  const d = (entry.iconicDishes || []).find((x) => x && x.name === dish);
  if (d && d.note && typeof d.note[lang] === 'string' && d.note[lang].trim()) {
    body = d.note[lang].trim();
    bodySource = 'dish-note';
  } else if (entry.touristExplainer && typeof entry.touristExplainer[lang] === 'string' && entry.touristExplainer[lang].trim()) {
    body = entry.touristExplainer[lang].trim();
    bodySource = 'tourist-explainer';
  }

  return { headline: tn(frameKey, lang, vars), body, bodySource, frameKey, dishLabel, cuisineLabel };
}

module.exports = { buildWhy, PERIOD_KEY };
