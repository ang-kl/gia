// translate-dishes.js — v0.62.854
//
// The "Try:" dish list, in the reader's language.
//
// Operator, on a Japanese card whose dish line wrapped to three lines:
//   *"i am concerns about having both english and japanese (translated) for dishes,
//    can we show dishes in translated rather than both to save line spacing"*
//
// REPLACE, DO NOT APPEND — and that is a real distinction, not just a space saving.
// The card now has three localised elements and they are NOT the same kind of thing:
//
//   venue name  → English + a guide.  You must be able to match the real name, and say it.
//   address     → English + a guide.  You need the Latin form to navigate or show a driver.
//   dishes      → REPLACED.           Descriptive prose. Nothing downstream depends on the
//                                     English words, so a second line would cost height and
//                                     buy nothing.
//
// The operator asked for the space; the reason it is safe to give is that last row.
//
// ICONIC NAMES SURVIVE, and that rule already existed. `prompt-locale.js` carries
// ICONIC_SG_DISHES and the instruction "keep iconic Singapore dish names in their ORIGINAL
// form, untranslated; translate the descriptive prose around them" — written for the
// narration prompts. The same rule is right here: "laksa" is a name, "steamed bamboo clams
// with glass noodles" is a description. Reusing it rather than inventing a second policy is
// the point; two rules about the same thing drift.
//
// COST — the operator capped this arc at "minimum token Gemini model call per venue per
// locale", and this comes in under that:
//   a. ICONIC DISHES NEVER REACH THE MODEL. They are returned as-is, free.
//   b. KEYED PER DISH, NOT PER VENUE. Dozens of venues serve chicken rice; one cached
//      answer covers all of them. A venue-keyed cache would re-buy it every time.
//   c. ONE BATCHED CALL for whatever is left after (a) and (b), 30-day TTL.
//   d. NOTHING RUNS FOR AN ENGLISH READER, and nothing runs when there is nothing to ask.

'use strict';

const { primaryTag } = require('./translate-review');
const { ICONIC_SG_DISHES, APP_LOCALES } = require('./prompt-locale');

// LITE first: high-volume, short strings. Mirrors pronounce-name.js's reordering — the
// shared chain is ordered for reliability, this one for price.
const CHAIN = require('./gemini-models').MODEL_CHAIN.slice();
const LITE = CHAIN.find((m) => /lite/.test(m));
const DISH_MODEL_CHAIN = LITE ? [LITE, ...CHAIN.filter((m) => m !== LITE)] : CHAIN;

const CACHE_TTL_S = 30 * 24 * 60 * 60;   // 30 days, matching the other translators
const MAX_DISH_CHARS = 80;
const MAX_PER_CALL = 40;

const ICONIC = new Set(
  String(ICONIC_SG_DISHES).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
);

/** Cache key. Per DISH, so venues sharing a dish share one paid answer. */
function dishKey(dish, lang) {
  return `dish-i18n:v1:${lang}:${String(dish).trim().toLowerCase().slice(0, MAX_DISH_CHARS)}`;
}

/**
 * True when the dish is an iconic name that must stay as written. Matched on the whole
 * string only: "laksa" is the dish, but "laksa-inspired pasta with prawns" is a
 * description that happens to contain it, and translating that is right.
 */
function isIconic(dish) {
  return ICONIC.has(String(dish || '').trim().toLowerCase());
}

/**
 * Translate `dishes` into `lang`. Returns a Map of original → translated, containing only
 * the entries that actually changed; callers can therefore leave anything absent alone.
 *
 * Fails open: on any error the map is returned as far as it got, so the card shows the
 * English dish rather than nothing.
 */
async function translateDishes(dishes, lang, { redis = null, _genAIFactory } = {}) {
  const out = new Map();
  const loc = primaryTag(lang) || '';
  if (!Array.isArray(dishes) || !dishes.length) return out;
  // English is the extraction language, so there is nothing to do; an unsupported locale
  // gets nothing rather than a guess.
  if (loc === 'en' || !APP_LOCALES.includes(loc)) return out;

  const clean = [...new Set(
    dishes.filter((d) => typeof d === 'string' && d.trim())
      .map((d) => d.trim().slice(0, MAX_DISH_CHARS)),
  )];
  if (!clean.length) return out;

  const ask = [];
  for (const d of clean) {
    if (isIconic(d)) continue;                       // (a) free, and correct
    if (redis && redis.isOpen) {
      try {
        const hit = await redis.get(dishKey(d, loc));
        if (typeof hit === 'string') { if (hit && hit !== d) out.set(d, hit); continue; }
      } catch { /* a cache miss is never fatal */ }
    }
    ask.push(d);
  }
  if (!ask.length) return out;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return out;
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  let genAI;
  try { genAI = factory(); } catch { return out; }

  const { langName } = require('./translate-review');
  const target = langName(loc) || 'English';
  const batch = ask.slice(0, MAX_PER_CALL);
  const prompt = [
    `Translate each dish name into ${target}.`,
    `Keep iconic Singapore/Malaysian dish names in their ORIGINAL form, untranslated (${ICONIC_SG_DISHES}).`,
    `Translate the descriptive prose around them. Keep it short — these are menu items on a card.`,
    `Return ONE line per input, in the SAME ORDER, no numbering, no quotes, no commentary.`,
    '',
    ...batch,
  ].join('\n');

  for (const model of DISH_MODEL_CHAIN) {
    try {
      const m = genAI.getGenerativeModel({ model });
      const r = await m.generateContent(prompt);
      try {
        require('./api-cost').recordGeminiUsage(redis, model, r?.response?.usageMetadata);
      } catch { /* accounting must never break the feature */ }
      const text = String(r?.response?.text?.() || '').trim();
      if (!text) continue;
      const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
      // Order-and-count is the contract. A short or long reply means the model dropped or
      // merged lines, and pairing them up anyway would attach the WRONG translation to a
      // dish — worse than showing English. Reject the whole batch instead.
      if (lines.length !== batch.length) continue;
      for (let i = 0; i < batch.length; i++) {
        const src = batch[i];
        const got = lines[i].replace(/^[-*\d.)\s]+/, '').trim().slice(0, 120);
        if (!got || got === src) continue;
        out.set(src, got);
        if (redis && redis.isOpen) {
          try { await redis.set(dishKey(src, loc), got, { EX: CACHE_TTL_S }); } catch { /* noop */ }
        }
      }
      break;
    } catch { /* try the next model in the chain */ }
  }
  return out;
}

/**
 * Replace `v.dishes` in place with the reader's language. Operator: show the translated
 * list "rather than both". Anything the translator did not return keeps its English, so a
 * partial answer degrades to a mixed list rather than to an empty one.
 */
async function localiseVenueDishes(venues, lang, { redis = null, _genAIFactory } = {}) {
  if (!Array.isArray(venues) || !venues.length) return;
  const loc = primaryTag(lang) || '';
  if (loc === 'en' || !APP_LOCALES.includes(loc)) return;
  const all = [];
  for (const v of venues) if (v && Array.isArray(v.dishes)) all.push(...v.dishes);
  if (!all.length) return;
  const map = await translateDishes(all, loc, { redis, _genAIFactory });
  if (!map.size) return;
  for (const v of venues) {
    if (!v || !Array.isArray(v.dishes)) continue;
    v.dishes = v.dishes.map((d) => (typeof d === 'string' && map.get(d.trim())) || d);
  }
}

module.exports = {
  DISH_MODEL_CHAIN,
  dishKey,
  isIconic,
  translateDishes,
  localiseVenueDishes,
};
