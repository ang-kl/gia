// translate-review.js — v0.61.152
//
// Translates a Google Maps review text into the user's device
// language for display in the venue card. Pairs with
// `cuisine-review-language.js` — that module picks a high-rated
// review written in the cuisine's nationality language; this one
// renders it in the user's locale so the "( <flag> translated)"
// suffix is literal (the quote is NOT shown raw in Italian).
//
// Operator spec (v0.61.152):
//   "the review quoted should be in the device language (either
//    English or French or device (preferred) language) —
//    {EN text} ( 🇮🇹 translated)"
//
// Public surface:
//   translateReview({ text, sourceLang, targetLang, placeId,
//                     reviewIdx = 0, redis = null,
//                     _genAIFactory } = {})
//     → translated text string, or the original text on failure /
//       when sourceLang === targetLang.
//
// Behaviour:
//   - Short-circuits when sourceLang === targetLang (primary tag
//     comparison after BCP-47 normalisation), returning the text
//     unchanged with no API call.
//   - Caches translations in Redis under
//     `translate-review:v1:<placeId>:<reviewIdx>:<src>:<tgt>` with
//     a 30-day TTL. Cache hits skip the Gemini call entirely.
//   - On any Gemini error (network, quota, parse), returns the
//     ORIGINAL text rather than throwing. The caller can decide
//     whether to still surface the "translated" suffix; the
//     /api/cuisine/search loop only surfaces it when the helper
//     reports the swap was honoured (see `recentReview*` flags).
//   - Cap input at 1000 chars (the surfaced snippet is already
//     capped at 200, so this is a defensive ceiling).

'use strict';

const SEARCH_INTENT_MODEL_CHAIN = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

const CACHE_TTL_S = 30 * 24 * 60 * 60;    // 30 days
const MAX_INPUT_CHARS = 1000;

// BCP-47 primary tag. Normalises 'zh-Hans' / 'zh-CN' → 'zh',
// 'en-US' → 'en', etc. Returns '' for non-strings.
function primaryTag(s) {
  if (typeof s !== 'string' || !s) return '';
  return s.toLowerCase().split(/[-_]/)[0];
}

// Built from primary tags. Used only for the prompt's "Translate
// from <X> to <Y>" framing — the Gemini model itself handles any
// BCP-47 input fine. Missing-from-map → falls back to the BCP-47
// code so the prompt still reads.
const LANG_NAME = Object.freeze({
  en: 'English', fr: 'French',
  it: 'Italian', es: 'Spanish', pt: 'Portuguese', de: 'German',
  el: 'Greek', ru: 'Russian', uk: 'Ukrainian', pl: 'Polish',
  sv: 'Swedish', tr: 'Turkish',
  ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
  vi: 'Vietnamese', th: 'Thai', id: 'Indonesian', ms: 'Malay',
  tl: 'Tagalog', my: 'Burmese', lo: 'Lao',
  hi: 'Hindi', ta: 'Tamil', bn: 'Bengali', gu: 'Gujarati',
  kok: 'Konkani', ne: 'Nepali', si: 'Sinhala', ur: 'Urdu',
  ar: 'Arabic', he: 'Hebrew', fa: 'Persian',
  uz: 'Uzbek', ka: 'Georgian'
});

function langName(code) {
  const p = primaryTag(code);
  return LANG_NAME[p] || (p ? p.toUpperCase() : '');
}

async function translateReview({
  text,
  sourceLang,
  targetLang,
  placeId,
  reviewIdx = 0,
  redis = null,
  _genAIFactory
} = {}) {
  const original = typeof text === 'string' ? text.trim() : '';
  if (!original) return '';
  const src = primaryTag(sourceLang);
  const tgt = primaryTag(targetLang);
  // No source language declared, or already in target → no-op.
  if (!tgt) return original;
  if (src && src === tgt) return original;

  const cacheKey = (typeof placeId === 'string' && placeId)
    ? `translate-review:v1:${placeId}:${reviewIdx}:${src || 'auto'}:${tgt}`
    : null;

  // Redis cache lookup.
  if (cacheKey && redis && redis.isOpen) {
    try {
      const cached = await redis.get(cacheKey);
      if (typeof cached === 'string' && cached.trim()) return cached;
    } catch { /* cache miss is non-fatal */ }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return original;

  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });

  let genAI;
  try { genAI = factory(); } catch { return original; }

  const capped = original.slice(0, MAX_INPUT_CHARS);
  const fromName = langName(src) || 'the source language';
  const toName = langName(tgt) || tgt.toUpperCase();
  const prompt = [
    `Translate the following restaurant review from ${fromName} to ${toName}.`,
    'Output ONLY the translated text. No preamble, no quotes, no markdown.',
    'Preserve the original meaning and tone. Keep dish / place names in their common Romanised form where appropriate.',
    '',
    'REVIEW:',
    capped
  ].join('\n');

  const candidates = SEARCH_INTENT_MODEL_CHAIN.slice();
  for (const candidate of candidates) {
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await m.generateContent(prompt);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; } catch { continue; }
      const cleaned = String(raw).trim()
        .replace(/^```(?:[a-z]+)?\s*|```$/g, '')
        .trim()
        .replace(/^["']+|["']+$/g, '')
        .trim();
      if (!cleaned) continue;
      if (cacheKey && redis && redis.isOpen) {
        try { await redis.set(cacheKey, cleaned, { EX: CACHE_TTL_S }); }
        catch { /* non-fatal */ }
      }
      return cleaned;
    } catch (err) {
      console.warn(`[Translate-Review] ${candidate} failed: ${err.message}`);
      continue;
    }
  }
  return original;
}

module.exports = {
  translateReview,
  primaryTag,
  langName,
  LANG_NAME,
  CACHE_TTL_S
};
