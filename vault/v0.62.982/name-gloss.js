// name-gloss.js — v0.62.x (operator item 7)
//
// For a venue whose NAME is in a foreign LANGUAGE written in LATIN script
// (so translate-name.js's script-transliteration doesn't fire), attach a
// SHORT device-language gloss of the name's MEANING, rendered on the next
// line in brackets. Operator screenshot (Hanoi): "Tầm vị" → "(seeking
// flavour)", "Mr Bảy Miền Tây - Bánh Xèo" → "(Mr Bay, western-region —
// savoury crepe)". The native name is KEPT as-is (identity + Maps search);
// this is an added subtitle.
//
// Distinct from translate-name.js (which transliterates a foreign SCRIPT —
// CJK/Thai — so a reader can pronounce it). Vietnamese is already readable;
// what's missing is the MEANING. Same posture: Gemini (no Cloud Translate),
// 30-day Redis cache, model-chain fallback, fail-open (no gloss → native
// name renders alone). G4 paid call — operator-authorised for this feature.

'use strict';

// v0.62.722 — was ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'],
// two of which Google now 404s. git treats this file as binary (it holds raw CJK
// gloss data), so the sweep that found the other ten copies silently skipped it —
// the invariant test in __tests__/gemini-models.test.js is what surfaced it.
const NAME_MODEL_CHAIN = require('./gemini-models').MODEL_CHAIN.slice();
const CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days
const MAX_INPUT_CHARS = 200;

// Foreign-LANGUAGE (Latin-script) countries whose venue names are worth a
// meaning-gloss. Keyed by ISO-3166 alpha-2 → { lang, label, re }. `re`
// recognises that language's diacritics so we don't gloss already-English
// names ("Pizza 4P's" in VN stays as-is). Extensible; VN ships first.
const VN_DIACRITICS = /[đĐ]|[ăâêôơưĂÂÊÔƠƯ]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệịỉĩọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const FOREIGN_NAME_LANG = {
  VN: { lang: 'vi', label: 'Vietnamese', re: VN_DIACRITICS },
};

const baseLang = (l) => String(l || '').toLowerCase().split('-')[0];

// True when `name` is worth glossing for country `cc` given the device lang:
// the country has a foreign-name language, the device language differs from
// it, and the name actually carries that language's diacritics.
function shouldGloss(name, cc, deviceLang) {
  if (typeof name !== 'string' || !name.trim()) return false;
  const spec = FOREIGN_NAME_LANG[String(cc || '').toUpperCase()];
  if (!spec) return false;
  if (baseLang(deviceLang) === spec.lang) return false; // device already in that language
  return spec.re.test(name);
}

// Gloss one venue name's MEANING into `deviceLang`. Returns the gloss string,
// or null (no meaning / proper name / model failure). Cached by placeId.
async function glossVenueName({ name, cc, deviceLang = 'en', placeId, redis = null, _genAIFactory } = {}) {
  const original = typeof name === 'string' ? name.trim() : '';
  const spec = FOREIGN_NAME_LANG[String(cc || '').toUpperCase()];
  if (!original || !spec) return null;

  const dev = baseLang(deviceLang) || 'en';
  // v0.62.857 — THE GLOSS WAS ONLY EVER WRITTEN IN ENGLISH OR FRENCH. This line read
  // `dev === 'fr' ? 'French' : 'English'`, written when the app had two locales and never
  // revisited when it reached eight — so a Japanese reader was told, in English, what a
  // Vietnamese name means. Exactly the defect class AMD-62 swept out of the narration
  // prompts (`lang === 'fr' ? … : ''`), surviving here because this file was not one of the
  // seven it touched. `langName` already maps all eight, and the locale list is imported
  // rather than retyped so this cannot become a ninth hand-copied copy.
  const { APP_LOCALES } = require('./prompt-locale');
  const { langName } = require('./translate-review');
  const devName = (APP_LOCALES.includes(dev) && langName(dev)) || 'English';
  // CACHE VERSION, SPLIT DELIBERATELY. The key already carried the locale, so en and fr
  // entries hold correct answers and stay on v1 — bumping everything would re-buy the two
  // highest-volume locales to fix six others. The remaining six hold English text under a
  // non-English key, which is worse than a miss because it looks like a hit, so they move
  // to v2 and the bad entries are abandoned rather than served.
  const ver = (dev === 'en' || dev === 'fr') ? 'v1' : 'v2';
  const cacheKey = (typeof placeId === 'string' && placeId)
    ? `name-gloss:${ver}:${placeId}:${dev}` : null;

  if (cacheKey && redis && redis.isOpen) {
    try {
      const cached = await redis.get(cacheKey);
      if (typeof cached === 'string') return cached === '\u0000' ? null : (cached.trim() || null);
    } catch { /* miss is non-fatal */ }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return null;
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  let genAI;
  try { genAI = factory(); } catch { return null; }

  const capped = original.slice(0, MAX_INPUT_CHARS);
  const prompt = [
    `A restaurant in ${spec.label}-speaking context is named "${capped}".`,
    `Give the MEANING of the name in ${devName}, 2–6 words, keeping any personal name as-is.`,
    `If the name is purely a personal or brand name with no translatable meaning, output exactly: NONE`,
    `Output ONLY the gloss (or NONE). No quotes, no preamble, no explanation.`,
    `Example (Vietnamese → English): "Tầm vị" → seeking flavour`,
  ].join('\n');

  for (const candidate of NAME_MODEL_CHAIN) {
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await m.generateContent(prompt);
      require('./api-cost').recordGeminiUsage(redis, candidate, r?.response?.usageMetadata);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; } catch { continue; }
      const cleaned = String(raw).trim()
        .replace(/^```(?:[a-z]+)?\s*|```$/g, '').trim()
        .split('\n')[0]
        .replace(/^["']+|["']+$/g, '')
        .trim();
      const result = (!cleaned || /^none$/i.test(cleaned) || cleaned === original) ? null : cleaned;
      if (cacheKey && redis && redis.isOpen) {
        try { await redis.set(cacheKey, result == null ? '\u0000' : result, { EX: CACHE_TTL_S }); }
        catch { /* non-fatal */ }
      }
      return result;
    } catch (err) {
      console.warn(`[Name-Gloss] ${candidate} failed: ${err.message}`);
      continue;
    }
  }
  return null;
}

// Attach `nameGloss` to each venue whose Latin-script name is in the country's
// foreign language. Skips venues already glossed or without the diacritics.
async function attachNameGloss(venues, cc, deviceLang, redis, _genAIFactory) {
  if (!Array.isArray(venues) || !venues.length) return;
  if (!FOREIGN_NAME_LANG[String(cc || '').toUpperCase()]) return;
  await Promise.all(venues.map(async (v) => {
    if (!v || v.nameGloss || typeof v.name !== 'string') return;
    if (!shouldGloss(v.name, cc, deviceLang)) return;
    try {
      const gloss = await glossVenueName({ name: v.name, cc, deviceLang, placeId: v.placeId, redis, _genAIFactory });
      if (gloss) v.nameGloss = gloss;
    } catch { /* leave the native name alone */ }
  }));
}

module.exports = { glossVenueName, attachNameGloss, shouldGloss, FOREIGN_NAME_LANG };
