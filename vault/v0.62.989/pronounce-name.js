// pronounce-name.js — v0.62.840
//
// A SECOND LINE under a venue name that tells the reader HOW TO SAY IT.
//
// Operator, across three messages: *"the restaurant name's second line should have
// the japanese way to pronounce the foreign resturant name"*, then *"use minimum
// token Gemini model call per venue per locale, including train line name, hawker
// centre"*, then the one that fixed the definition:
//
//   *"remember to help foreigner to pronoun. same for English or french speaker
//    who searching Malaysia eateries, learn to pronounce the restaurant name"*
//
// PRONUNCIATION, NOT TRANSLATION — and the difference is the whole design.
// `translate-name.js` (v0.61.385) answers "what does this name MEAN, and how would
// a reader of the venue's own country read it". This answers "how do I SAY this",
// for the reader, wherever they are. Two consequences follow that a translation
// module does not have:
//
//   1. IT IS SYMMETRIC. A Japanese reader seeing "White Bird Restaurant" wants
//      katakana. An English or French reader seeing "Restoran Sri Nirwana Maju"
//      wants a phonetic guide — and that name is already in Latin script, so any
//      script-based gate would skip it. Script is the wrong test; the right one is
//      "would a speaker of the reader's language say this correctly on sight".
//   2. A NULL ANSWER IS A CORRECT ANSWER. "Pizza Hut" needs no guide for an English
//      reader. The model is told to return NONE, and NONE is cached like any other
//      result — an empty second line is the right render, and re-asking every time
//      would be the expensive mistake.
//
// COST, WHICH THE OPERATOR CAPPED EXPLICITLY.
// -------------------------------------------
// "use minimum token Gemini model" is honoured three ways, in this order:
//
//   a. CURATED FIRST, ALWAYS. The government register already gives Chinese and
//      Malay names for all 123 hawker centres, 193 MRT/LRT stations and the MRT
//      lines — free, official, and better than anything a model would produce. A
//      zh or id reader must never cost a call for those. Only ja/es/de/ru/fr, which
//      the register does not cover, reach the model at all.
//   b. LITE-FIRST CHAIN. `gemini-models.js` exports [LATEST, FLASH, LITE]; this
//      module reorders it to put LITE first, so the cheapest model is tried first
//      and the others exist only as fallbacks when a name is retired.
//   c. ONE CALL PER (NAME, READER LOCALE), CACHED 30 DAYS — including the NONEs.
//
// Cost is recorded through `recordGeminiUsage` exactly as the other callers do, so
// this shows up in the existing audit rather than being invisible new spend.

'use strict';

const { primaryTag, langName } = require('./translate-review');

// LITE first. The shared chain is ordered for reliability (LATEST is the only name
// with live proof it resolves); this one is ordered for price, because the operator
// asked for the minimum-token model and these calls are high-volume by design.
const CHAIN = require('./gemini-models').MODEL_CHAIN.slice();
const LITE = CHAIN.find((m) => /lite/.test(m));
const PRONOUNCE_MODEL_CHAIN = LITE ? [LITE, ...CHAIN.filter((m) => m !== LITE)] : CHAIN;

const CACHE_TTL_S = 30 * 24 * 60 * 60;   // 30 days, matching translate-name
const MAX_INPUT_CHARS = 120;             // a venue name; anything longer is not one
const NONE = 'NONE';                     // the model's "no guide needed" sentinel

// The locales the app ships. A reader outside this set gets nothing rather than a
// guess — the same lesson as prompt-locale.js, where gating on `langName()` being
// truthy would have asked the model to write in "KR".
const APP_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko'];

/**
 * Cache key. Keyed on the NAME, not the placeId: two venues called
 * "Nasi Kandar Pelita" have the same pronunciation, and keying on placeId would
 * pay for it twice. Lower-cased so casing variants share one entry.
 */
function cacheKey(name, lang) {
  return `name-say:v1:${lang}:${String(name).trim().toLowerCase().slice(0, MAX_INPUT_CHARS)}`;
}

/**
 * A guide must not echo the original, must not be model meta-talk, and must not be
 * the sentinel. Mirrors translate-name.js's isValidReading, which exists because a
 * model that cannot comply tends to apologise in prose rather than fail.
 */
function isValidGuide(guide, original) {
  if (typeof guide !== 'string') return false;
  const t = guide.trim();
  if (!t || t === NONE) return false;
  if (t.toLowerCase() === String(original).trim().toLowerCase()) return false;
  if (t.length > 120) return false;
  if (/\b(I (do not|don'?t|cannot|can'?t)|as an AI|unable to|here(?:'s| is) the|sorry)\b/i.test(t)) return false;
  return true;
}

/**
 * How to say `name`, for a reader of `lang`. Resolves to a short string, or null
 * when no guide is needed or none could be produced.
 *
 * `curated` lets a caller hand in the free answer it already has (the government
 * register's Chinese or Malay name), so the model is never asked for something the
 * repo already knows.
 */
async function pronounceName({
  name,
  lang,
  curated = null,
  redis = null,
  _genAIFactory,
} = {}) {
  const original = typeof name === 'string' ? name.trim() : '';
  const loc = primaryTag(lang) || '';
  if (!original || !APP_LOCALES.includes(loc)) return null;

  // (a) Curated wins outright — free, official, and not a guess.
  if (typeof curated === 'string' && curated.trim() && curated.trim() !== original) {
    return curated.trim();
  }

  const key = cacheKey(original, loc);
  if (redis && redis.isOpen) {
    try {
      const hit = await redis.get(key);
      // NONE is a real answer and is cached: re-asking for "Pizza Hut" in English
      // every time is exactly the spend this module is supposed to avoid.
      if (typeof hit === 'string') return hit === NONE ? null : hit;
    } catch { /* a cache miss is never fatal */ }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return null;

  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  let genAI;
  try { genAI = factory(); } catch { return null; }

  const readerLang = langName(loc) || 'English';
  const prompt = [
    // "Place name", not "Restaurant name". v0.62.840 wrote the latter because venues
    // were the only caller; since then hawker centres, MRT lines and now stations use
    // the same path, and telling the model that "Bras Basah" is a restaurant is a false
    // premise it has to work around. The CACHE KEY is deliberately NOT bumped to v2:
    // the answer to "how is this said aloud" does not depend on the category word, and
    // a version bump would discard every guide already paid for to fix a label.
    `Place name: "${original.slice(0, MAX_INPUT_CHARS)}"`,
    `Reader's language: ${readerLang}.`,
    `Write ONLY how a ${readerLang} speaker should SAY this name aloud, in ${readerLang}'s own script.`,
    `If a ${readerLang} speaker would already say it correctly on sight, output exactly: ${NONE}`,
    `No quotes, no explanation, no translation of the meaning — the sound only. One short line.`,
  ].join('\n');

  let out = null;
  for (const model of PRONOUNCE_MODEL_CHAIN) {
    try {
      const m = genAI.getGenerativeModel({ model });
      const r = await m.generateContent(prompt);
      try {
        require('./api-cost').recordGeminiUsage(redis, model, r?.response?.usageMetadata);
      } catch { /* accounting must never break the feature */ }
      const text = String(r?.response?.text?.() || '').trim();
      if (text) { out = text; break; }
    } catch { /* try the next model in the chain */ }
  }
  if (out === null) return null;

  const guide = isValidGuide(out, original) ? out : null;
  if (redis && redis.isOpen) {
    try { await redis.set(key, guide === null ? NONE : guide, { EX: CACHE_TTL_S }); }
    catch { /* an uncached answer is still an answer */ }
  }
  return guide;
}

/**
 * Attach `namePronounce` to each item, in parallel, skipping any that already have
 * one. `curatedFor(item)` supplies the free answer where the repo has it.
 */
async function attachPronunciations(items, lang, { redis = null, curatedFor = null, _genAIFactory } = {}) {
  if (!Array.isArray(items) || !items.length) return;
  const loc = primaryTag(lang) || '';
  if (!APP_LOCALES.includes(loc)) return;
  await Promise.all(items.map(async (it) => {
    if (!it || it.namePronounce || typeof it.name !== 'string') return;
    try {
      const curated = typeof curatedFor === 'function' ? curatedFor(it, loc) : null;
      const say = await pronounceName({ name: it.name, lang: loc, curated, redis, _genAIFactory });
      if (say) it.namePronounce = say;
    } catch { /* a missing guide is never worth failing a search over */ }
  }));
}

module.exports = {
  APP_LOCALES,
  PRONOUNCE_MODEL_CHAIN,
  NONE,
  cacheKey,
  isValidGuide,
  pronounceName,
  attachPronunciations,
};
