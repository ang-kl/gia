// cuisine-review-language.js — v0.61.151
//
// Maps cuisine slugs to the language code most likely spoken by
// natives of that nationality. Used by `/api/cuisine/search` to
// PREFER a high-rated Google Maps review written in that language,
// so a user searching Italian sees the Italian-speaker review
// quoted on the card (instead of generic English).
//
// Operator spec (v0.61.151):
//   "if the cuisine is the nationalities type, give priority for
//   >3.8 google map review that mentions in the language of the
//   cuisine nationality. tag the review quoted in cuisine TMA
//   result or free chat result, at the end as
//   '(' + spacing + <flag of nationality> + spacing + 'translated)'"
//
// Slugs match the cuisines-vault.js slugify output. Languages that
// the operator's nationality list doesn't have a clear mapping for
// (Eurasian, Singaporean, Australasia, generic European, generic
// African) are intentionally NOT in the map — those slugs fall
// through to the existing English-only review selection.
//
// Public surface:
//   SLUG_TO_LANGUAGE     — the raw map (slug → BCP-47 primary tag)
//   SLUG_TO_FLAG         — slug → flag emoji (mirrored from
//                          cuisines-vault.FLAG_BY_SLUG so the chat
//                          layer can render without re-importing
//                          the vault)
//   getLanguageForCuisines(slugs) → first matching language, or null
//   getFlagForCuisines(slugs)     → first matching flag, or null
//   pickPreferredReview(reviews, language, minRating=3.8)
//                                  → first review in `language`
//                                    with rating > minRating, or null
//   isNationalityCuisine(slug)    → true when SLUG_TO_LANGUAGE has slug

'use strict';

// BCP-47 primary tag for each nationality cuisine. Conservative — only
// includes slugs where the country has ONE dominant native language.
// Multilingual SG/Asian (Peranakan, Eurasian, Singaporean), regional
// EU (Slavic-Eastern-European, generic European, Mediterranean), and
// the African catch-all are intentionally omitted: their reviews on
// Places will be a mix of languages and the "translate" tag would
// mis-signal.
const SLUG_TO_LANGUAGE = Object.freeze({
  // Common Here (where the cuisine has a single dominant language)
  'south-indian':   'ta',   // Tamil — most South Indian SG restaurants are Tamil-owned
  'north-indian':   'hi',   // Hindi
  'malaysian':      'ms',   // Malay
  'indonesian':     'id',   // Indonesian
  'thai':           'th',
  'filipino':       'tl',   // Tagalog
  'vietnamese':     'vi',
  'japanese':       'ja',
  'chinese':        'zh',   // Standard Chinese
  'korean':         'ko',
  'taiwanese':      'zh',   // Mandarin (also Taiwanese Hokkien — Mandarin is the broader match)
  'burmese':        'my',
  // Southeast Asian
  'laotian':        'lo',
  'timorese':       'pt',   // East Timor uses Portuguese as official
  // China-regional — all default to zh
  'sichuan':        'zh',
  'shanghainese':   'zh',
  'cantonese':      'zh',
  'hunan':          'zh',
  'hokkien':        'zh',
  'teochew':        'zh',
  'hainanese':      'zh',
  'hakka':          'zh',
  'northeastern':   'zh',
  'northwestern':   'zh',
  'hong-kong':      'zh',
  'macau':          'zh',
  // South Asian
  'bengali':        'bn',
  'gujarati':       'gu',
  'goan':           'kok',  // Konkani
  'nepalese':       'ne',
  'sri-lankan':     'si',   // Sinhala
  'pakistani':      'ur',   // Urdu
  // Middle Eastern + Central Asian
  'lebanese':       'ar',
  'turkish':        'tr',
  'persian':        'fa',
  'moroccan':       'ar',
  'egyptian':       'ar',
  'jordanian':      'ar',
  'israeli':        'he',
  'uzbek':          'uz',
  'georgian':       'ka',
  // European
  'italian':        'it',
  'spanish':        'es',
  'greek':          'el',
  'french':         'fr',
  'german':         'de',
  'austrian':       'de',
  'swiss':          'de',
  'portuguese':     'pt',
  'russian':        'ru',
  'ukrainian':      'uk',
  'polish':         'pl',
  'scandinavian':   'sv',   // Swedish proxy
  // Americas
  'mexican':        'es',
  'brazilian':      'pt',
  'argentinian':    'es',
  // African (only South African; the African catch-all is multilingual)
  'south-african':  'en'
});

// Mirror of cuisines-vault.FLAG_BY_SLUG for the slugs that have a
// language mapping above. Kept in-file so the chat layer can resolve
// flag + language without two requires.
const SLUG_TO_FLAG = Object.freeze({
  'south-indian':   '🇮🇳',
  'north-indian':   '🇮🇳',
  'malaysian':      '🇲🇾',
  'indonesian':     '🇮🇩',
  'thai':           '🇹🇭',
  'filipino':       '🇵🇭',
  'vietnamese':     '🇻🇳',
  'japanese':       '🇯🇵',
  'chinese':        '🇨🇳',
  'korean':         '🇰🇷',
  'taiwanese':      '🇹🇼',
  'burmese':        '🇲🇲',
  'laotian':        '🇱🇦',
  'timorese':       '🇹🇱',
  'sichuan':        '🇨🇳',
  'shanghainese':   '🇨🇳',
  'cantonese':      '🇨🇳',
  'hunan':          '🇨🇳',
  'hokkien':        '🇨🇳',
  'teochew':        '🇨🇳',
  'hainanese':      '🇨🇳',
  'hakka':          '🇨🇳',
  'northeastern':   '🇨🇳',
  'northwestern':   '🇨🇳',
  'hong-kong':      '🇭🇰',
  'macau':          '🇲🇴',
  'bengali':        '🇧🇩',
  'gujarati':       '🇮🇳',
  'goan':           '🇮🇳',
  'nepalese':       '🇳🇵',
  'sri-lankan':     '🇱🇰',
  'pakistani':      '🇵🇰',
  'lebanese':       '🇱🇧',
  'turkish':        '🇹🇷',
  'persian':        '🇮🇷',
  'moroccan':       '🇲🇦',
  'egyptian':       '🇪🇬',
  'jordanian':      '🇯🇴',
  'israeli':        '🇮🇱',
  'uzbek':          '🇺🇿',
  'georgian':       '🇬🇪',
  'italian':        '🇮🇹',
  'spanish':        '🇪🇸',
  'greek':          '🇬🇷',
  'french':         '🇫🇷',
  'german':         '🇩🇪',
  'austrian':       '🇦🇹',
  'swiss':          '🇨🇭',
  'portuguese':     '🇵🇹',
  'russian':        '🇷🇺',
  'ukrainian':      '🇺🇦',
  'polish':         '🇵🇱',
  'scandinavian':   '🇸🇪',
  'mexican':        '🇲🇽',
  'brazilian':      '🇧🇷',
  'argentinian':    '🇦🇷',
  'south-african':  '🇿🇦'
});

function isNationalityCuisine(slug) {
  return typeof slug === 'string' && Object.prototype.hasOwnProperty.call(SLUG_TO_LANGUAGE, slug);
}

// For multi-cuisine selections, returns the language for the FIRST
// slug in the input that has a mapping. Returns null for empty inputs,
// non-arrays, or selections with no nationality slugs (e.g. all
// special-mode, Dessert + Fusion).
function getLanguageForCuisines(slugs) {
  if (!Array.isArray(slugs)) return null;
  for (const s of slugs) {
    if (typeof s === 'string' && SLUG_TO_LANGUAGE[s]) return SLUG_TO_LANGUAGE[s];
  }
  return null;
}

// Returns the matching nationality flag for the first nationality
// slug. Pairs with getLanguageForCuisines — if that returns a
// language, this returns its flag.
function getFlagForCuisines(slugs) {
  if (!Array.isArray(slugs)) return null;
  for (const s of slugs) {
    if (typeof s === 'string' && SLUG_TO_FLAG[s]) return SLUG_TO_FLAG[s];
  }
  return null;
}

// Returns the BCP-47 primary tag (or null) from a review's text
// envelope. Places New API: review.text is `{ text, languageCode }`;
// older shapes may use review.languageCode directly. Normalises to
// the primary tag — 'zh-Hant' / 'zh-CN' / 'zh-Hans' all → 'zh'.
function reviewLanguagePrimary(review) {
  if (!review) return null;
  const raw = (review.text && typeof review.text === 'object' && review.text.languageCode)
    || review.languageCode
    || '';
  if (typeof raw === 'string' && raw) {
    const primary = raw.toLowerCase().split(/[-_]/)[0];
    if (primary) return primary;
  }
  // v0.62.861 — FALL BACK TO THE SCRIPT. A review cached by `vault-index.js` before that
  // file learned to keep `languageCode` has none, and returning null here made the caller
  // default to 'en' — which is how a Japanese review reached a French reader untranslated.
  //
  // This heals those entries IMMEDIATELY rather than waiting out their 24-hour TTL, and it
  // costs nothing: `nameScriptLang` is already the server's authority on this question and
  // is already CommonJS. Bumping the cache key instead would have re-fetched every venue's
  // reviews from Places to fix a field we can read off the text.
  //
  // It answers only for CJK/Hangul/Thai. A French review with no languageCode still reads
  // as unknown — stated as a limit rather than papered over, because the alternative is a
  // language guesser, and a WRONG language is worse than none: it tells the translator to
  // convert from a language the text is not in.
  const text = (review.text && typeof review.text === 'object')
    ? review.text.text
    : review.text;
  if (typeof text !== 'string' || !text.trim()) return null;
  try {
    const { nameScriptLang } = require('./translate-name');
    return nameScriptLang(text) || null;
  } catch { return null; }
}

// Picks the FIRST review whose primary language matches `language`
// AND whose rating > minRating (default 3.8 per operator spec).
// Returns the review object or null. Defensive against missing
// fields (rating may be missing, language may be empty).
function pickPreferredReview(reviews, language, minRating = 3.8) {
  if (!Array.isArray(reviews) || !language || typeof language !== 'string') return null;
  const target = language.toLowerCase().split(/[-_]/)[0];
  for (const r of reviews) {
    if (!r) continue;
    const rating = Number(r.rating);
    if (!Number.isFinite(rating) || rating <= minRating) continue;
    const lang = reviewLanguagePrimary(r);
    if (lang === target) return r;
  }
  return null;
}

// v0.61.152 — picks a preferred review AND translates it into the
// caller's device language. Returns { text, sourceLang, translated }
// or null when no qualifying review exists.
//   text         — translated text (or original when src===tgt or
//                  the translate helper fell back to original)
//   sourceLang   — primary tag of the picked review's language
//   translated   — true when the text was actually swapped via the
//                  translate helper; false when it is the original
//                  (e.g. src===tgt short-circuit, API failure)
//
// Args:
//   reviews            — the review array from Places New API
//   nationalityLang    — language we want to match in the picker
//                        (Italian-cuisine search → 'it')
//   targetLang         — user device language for the rendered quote
//                        (e.g. 'en', 'fr', or the raw BCP-47 from
//                        Telegram's user.language_code)
//   placeId            — used as the translate cache key
//   reviewIdx          — index of the picked review in the array
//                        (defaults to 0 so the cache stays coherent
//                        if the caller doesn't know)
//   redis              — Redis client (optional; cache is a fast-path)
//   minRating          — threshold for pickPreferredReview
//   translateFn        — injected for tests; defaults to the
//                        translate-review module's translateReview
async function pickAndTranslateReview({
  reviews,
  nationalityLang,
  targetLang,
  placeId = null,
  reviewIdx = null,
  redis = null,
  minRating = 3.8,
  translateFn = null
} = {}) {
  if (!Array.isArray(reviews) || !nationalityLang) return null;
  const picker = (typeof reviewIdx === 'number' && reviewIdx >= 0)
    ? reviews[reviewIdx]
    : null;
  // Honour explicit reviewIdx when provided AND it passes the
  // language/rating gate; otherwise scan.
  let chosen = null;
  let chosenIdx = -1;
  if (picker) {
    const rating = Number(picker.rating);
    const lang = reviewLanguagePrimary(picker);
    if (Number.isFinite(rating) && rating > minRating
        && lang === nationalityLang.toLowerCase().split(/[-_]/)[0]) {
      chosen = picker;
      chosenIdx = reviewIdx;
    }
  }
  if (!chosen) {
    const target = nationalityLang.toLowerCase().split(/[-_]/)[0];
    for (let i = 0; i < reviews.length; i++) {
      const r = reviews[i];
      if (!r) continue;
      const rating = Number(r.rating);
      if (!Number.isFinite(rating) || rating <= minRating) continue;
      if (reviewLanguagePrimary(r) === target) {
        chosen = r;
        chosenIdx = i;
        break;
      }
    }
  }
  if (!chosen) return null;

  const sourceLang = reviewLanguagePrimary(chosen);
  const rawText = (chosen.text && typeof chosen.text === 'object' && chosen.text.text)
    || chosen.text
    || chosen.originalText?.text
    || '';
  const cleaned = String(rawText || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return null;

  const fn = translateFn || (() => {
    const mod = require('./translate-review');
    return mod.translateReview;
  })();

  let translatedText = cleaned;
  let translated = false;
  const srcPrimary = (sourceLang || '').toLowerCase().split(/[-_]/)[0];
  const tgtPrimary = (targetLang || '').toLowerCase().split(/[-_]/)[0];
  if (tgtPrimary && srcPrimary && srcPrimary !== tgtPrimary) {
    try {
      const out = await fn({
        text: cleaned,
        sourceLang: srcPrimary,
        targetLang: tgtPrimary,
        placeId,
        reviewIdx: chosenIdx >= 0 ? chosenIdx : 0,
        redis
      });
      if (typeof out === 'string' && out.trim() && out.trim() !== cleaned) {
        translatedText = out.trim();
        translated = true;
      }
    } catch {
      // fall back to original — translated stays false
    }
  }

  return {
    text: translatedText,
    sourceLang: srcPrimary,
    translated
  };
}

// v0.61.154 — convenience wrapper that resolves nationality from a
// cuisine slug list and applies pickAndTranslateReview to every
// venue in the array (parallel). Used by /api/cuisine/search,
// runFreeTextSearch's main branch, handleMichelinSearch, and the
// chat /cuisine command — same pattern was inline at each site
// pre-v0.61.154; factored here for DRY + tests.
//
// Mutates each venue in place:
//   v.recentReview            ← translated text (≤ capChars)
//   v.recentReviewTranslatedFlag ← the nationality flag emoji
//   v.recentReviewLanguage    ← the nationality BCP-47 primary tag
//   v.recentReviewSourceLang  ← the review's source primary tag
//
// No-op when:
//   - venues is empty / not an array
//   - cuisineSlugs has no nationality slug (e.g. ['dessert'])
//   - a given venue has no reviews
async function enrichVenuesWithTranslatedReview({
  venues,
  cuisineSlugs,
  targetLang,
  redis = null,
  minRating = 3.8,
  capChars = 200
} = {}) {
  if (!Array.isArray(venues) || !venues.length) return;
  const nationalityLang = getLanguageForCuisines(cuisineSlugs || []);
  if (!nationalityLang) return;
  const nationalityFlag = getFlagForCuisines(cuisineSlugs || []);
  await Promise.all(venues.map(async (v) => {
    if (!v || !Array.isArray(v.reviews) || !v.reviews.length) return;
    try {
      const picked = await pickAndTranslateReview({
        reviews: v.reviews,
        nationalityLang,
        targetLang,
        placeId: v.placeId || null,
        redis: redis && redis.isOpen ? redis : null,
        minRating
      });
      if (picked && picked.text) {
        v.recentReview = picked.text.slice(0, capChars);
        v.recentReviewTranslatedFlag = nationalityFlag;
        v.recentReviewLanguage = nationalityLang;
        v.recentReviewSourceLang = picked.sourceLang;
      }
    } catch {
      // per-venue best-effort; a single Gemini hiccup must not abort
      // the whole batch.
    }
  }));
}

module.exports = {
  SLUG_TO_LANGUAGE,
  SLUG_TO_FLAG,
  isNationalityCuisine,
  getLanguageForCuisines,
  getFlagForCuisines,
  reviewLanguagePrimary,
  pickPreferredReview,
  pickAndTranslateReview,
  enrichVenuesWithTranslatedReview
};
