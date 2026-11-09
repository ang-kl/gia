// review-refresh.js — v0.62.900
//
// RE-READ ONE REVIEW IN THE LANGUAGE THE READER HAS SET NOW.
//
// Operator: *"can we have a ↻ icon below the 💬 to allow user to refresh it into new language,
// first the language of the review text is already the same as the language set, then fire new
// review"*. Two instructions in one sentence, and the FIRST one is the important half: check
// before you spend.
//
// ⚠ WHY THIS CANNOT SIMPLY RE-TRANSLATE WHAT IS ON SCREEN. `cuisine-enrich.js` translates the
// review INTO the reader's locale at search time and assigns the result back onto
// `v.recentReview` — the original is overwritten in place, and there is no `recentReviewOriginal`
// field anywhere in the repo. `cuisine-enrich.js` then deletes `v.reviews` before the payload
// ships. So the client holds a translation and calls it the review. A ↻ that re-translated it
// would be translating a translation, and by the third language switch the text would be a
// game of telephone that still renders as a quotation.
//
// THE ORIGINAL SURVIVES IN `place-reviews:<placeId>`, written by `vault-index.js` with Google's
// own `languageCode` on each entry, TTL 24 h. That is the only honest source, so this module
// reads from there and reports `unavailable` when it has expired rather than falling back to the
// on-screen text. Refusing is the correct answer; a plausible one built from a translation is not.
//
// WHAT THE "ALREADY IN THAT LANGUAGE" CHECK CAN AND CANNOT DO, said here rather than discovered
// later. `reviewLanguagePrimary` answers from Google's declared `languageCode` when present, and
// otherwise falls back to SCRIPT detection which only distinguishes Hangul, Thai, kana and Han —
// every Latin-script language returns null. So a French review with no `languageCode` is
// indistinguishable from an English one, and asking to refresh it into English will return the
// French text marked `already`. That is a wrong answer, and it is the one wrong answer this
// design accepts: the alternative is to translate on every tap and bill the operator for it,
// which is what they explicitly asked to avoid.
//
// `reviewIdx` DEFAULTS TO 0 AND MUST STAY THERE. `cuisine-enrich.js:400` hardcodes `reviewIdx: 0`
// in the cache key for text that came from `extractDishes`' pool[0] — which is the first RECENT
// non-empty review, not necessarily `reviews[0]`. The key therefore already claims index 0 for
// text that may be index 2. Computing a "true" index here would be more correct and would MISS
// the cache the enrichment populated, re-spending on every tap. Matching the existing convention
// beats correcting it.

'use strict';

const REVIEWS_KEY_PREFIX = 'place-reviews:';

/** Outcome codes, exported so callers and tests name the same things. */
const OUTCOME = Object.freeze({
  ALREADY: 'already',           // the original is already in the reader's language — no spend
  TRANSLATED: 'translated',     // freshly translated (possibly served from the 30-day cache)
  UNAVAILABLE: 'unavailable',   // the original has expired out of place-reviews:
  INVALID: 'invalid',           // bad input
});

/**
 * @param {object}   o
 * @param {object}   o.redis
 * @param {string}   o.placeId
 * @param {string}   o.lang        the locale the reader has set NOW
 * @param {number}  [o.reviewIdx]  keep at 0 — see the header
 * @param {object}  [o.deps]       injected for tests: { detectLang, translate }
 * @returns {Promise<{outcome:string, text?:string, sourceLang?:string|null}>}
 */
async function refreshReviewForLocale({ redis, placeId, lang, reviewIdx = 0, deps = {} } = {}) {
  if (!placeId || typeof placeId !== 'string' || !lang || typeof lang !== 'string') {
    return { outcome: OUTCOME.INVALID };
  }
  if (!redis || !redis.isOpen) return { outcome: OUTCOME.UNAVAILABLE };

  const detectLang = deps.detectLang
    || ((review) => require('./cuisine-review-language').reviewLanguagePrimary(review));
  const translate = deps.translate
    || ((args) => require('./translate-review').translateReview(args));

  let originals = null;
  try {
    const raw = await redis.get(`${REVIEWS_KEY_PREFIX}${placeId}`);
    if (raw) originals = JSON.parse(raw);
  } catch { /* a malformed or missing blob is the same as an expired one */ }
  if (!Array.isArray(originals) || !originals.length) return { outcome: OUTCOME.UNAVAILABLE };

  const review = originals[reviewIdx] || originals[0];
  const text = review && typeof review.text === 'string' ? review.text.trim() : '';
  if (!text) return { outcome: OUTCOME.UNAVAILABLE };

  const sourceLang = detectLang(review) || null;

  // THE OPERATOR'S FIRST INSTRUCTION. Spend nothing when there is nothing to do — and return the
  // ORIGINAL rather than leaving whatever translation is on screen, because "already in your
  // language" and "still showing the last language" look identical to a reader and are not.
  if (sourceLang && sourceLang === lang) {
    return { outcome: OUTCOME.ALREADY, text, sourceLang };
  }

  const out = await translate({
    text,
    sourceLang: sourceLang || 'en',
    targetLang: lang,
    placeId,
    reviewIdx: 0,   // see the header — matches cuisine-enrich.js so the 30-day cache is shared
    redis,
  });
  const cleaned = (typeof out === 'string' && out.trim()) ? out.trim() : '';
  // `translateReview` returns the ORIGINAL on any failure, never throws. An unchanged string
  // therefore means "nothing happened", which is reported as `already` rather than dressed up as
  // a successful translation — the reader sees the same words either way and deserves the truth
  // about why.
  if (!cleaned || cleaned === text) return { outcome: OUTCOME.ALREADY, text, sourceLang };
  return { outcome: OUTCOME.TRANSLATED, text: cleaned, sourceLang };
}

module.exports = { refreshReviewForLocale, OUTCOME, REVIEWS_KEY_PREFIX };
