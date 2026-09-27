// translate-name.js — v0.61.385
//
// For a venue whose NAME is in a script foreign to where the venue IS,
// produce a SHORT readable line that gives BOTH the venue's LOCAL language
// AND an English (app-locale) gloss in brackets, e.g. a Chinese-named
// restaurant in Osaka:
//   "丝绸之路 新疆菜" → "🔤 シルクロード 新疆料理 (Silk Road Xinjiang Cuisine)"
// The native name is KEPT as-is (identity + Google Maps search still work);
// this is an added subtitle, never a replacement.
//
// v0.61.385 — operator screenshot (Osaka search): a Chinese-named venue
// rendered its reading as PINYIN + English because v0.61.382 targeted the
// en/fr APP locale. Operator: "even though the name is in Chinese, it should
// read both in Japanese and English in the next line with brackets ()". So
// the reading is now two-part — the venue COUNTRY's local language
// (LOCAL_LANG_BY_CC[cc]) first, then the app-locale gloss in (). Gating is
// by the NAME's actual script (a Chinese name in Japan IS foreign there),
// not by country alone.
//
// Reuses Gemini (no Google Cloud Translate API), mirrors translate-review.js:
// same model chain, 30-day Redis cache, graceful (never throws; null when
// not needed). Server-side only — GEMINI_API_KEY never reaches the client.

'use strict';

const { primaryTag, langName } = require('./translate-review');
const { LOCAL_LANG_BY_CC, HAS_LOCAL_SCRIPT } = require('./local-name');

// v0.62.722 — was ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'].
// The last two are 404 at Google ("no longer available to new users"), so two of
// the three fallbacks were dead weight. Names now come from gemini-models.js.
const NAME_MODEL_CHAIN = require('./gemini-models').MODEL_CHAIN.slice();

const CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days
const MAX_INPUT_CHARS = 200;

const RE_HANGUL = /[가-힯]/;   // Korean
const RE_THAI   = /[฀-๿]/;   // Thai
// v0.62.824 — the kana range is written out rather than spanned ぀-ヿ, because that
// span contains U+30FB KATAKANA MIDDLE DOT (・), which is punctuation, not kana. A
// Latin restaurant name that uses it as a separator was therefore read as Japanese:
// "Suyab Courtyard・Pickmoon Gourmet" is a romanised Guangzhou name, and
// nameScriptLang returned 'ja' for it. In a CN search that is 'ja' !== 'zh', so it
// went to the LLM for a reading of a name the reader can already read — a paid call
// and a 🔤 line, both wrong. Measured at 1 row in the static corpus; the live Places
// path is not bounded by that, and ・ is common in JP/TW/HK listings.
// U+309D/U+309E (ゝゞ, iteration marks) are kept — 祇園 さゝ木 needs them.
const RE_KANA   = /[\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF]/;   // Japanese kana → Japanese
const RE_HAN    = /[一-鿿]/;   // CJK ideographs
const RE_CJK_THAI = /[\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF一-鿿가-힯฀-๿]/;

// Coarse "what language is this name's script?" — decides whether a name is
// foreign relative to where the venue is. Kana → Japanese; Hangul → Korean;
// Thai → Thai; bare Han (no kana) → treated as Chinese (a Japanese kanji-only
// name is the rare exception, harmless — it just gains an English gloss).
function nameScriptLang(name) {
  if (typeof name !== 'string') return null;
  if (RE_HANGUL.test(name)) return 'ko';
  if (RE_THAI.test(name)) return 'th';
  if (RE_KANA.test(name)) return 'ja';
  if (RE_HAN.test(name)) return 'zh';
  return null; // Latin / other → already readable, no reading needed
}

// A reading must differ from the original, not be model meta-talk, and be
// readable in `localLang` (its leading script). The English/app-locale gloss
// in brackets adds Latin, which is fine for every CJK/Thai local language.
function isValidReading(reading, original, localLang) {
  if (typeof reading !== 'string') return false;
  const t = reading.trim();
  if (!t || t === original) return false;
  if (/\b(I (do not|don'?t|cannot|can'?t)|as an AI|unable to|cannot (romani|translat)|here(?:'s| is) the)\b/i.test(t)) return false;
  const loc = primaryTag(localLang) || 'en';
  if (loc === 'ja') return !(RE_HANGUL.test(t) || RE_THAI.test(t));
  if (loc === 'ko') return !(RE_KANA.test(t) || RE_THAI.test(t));
  if (loc === 'zh') return !(RE_HANGUL.test(t) || RE_KANA.test(t) || RE_THAI.test(t));
  if (loc === 'th') return !(RE_HANGUL.test(t) || RE_KANA.test(t) || RE_HAN.test(t));
  return !RE_CJK_THAI.test(t); // a Latin local language → must be romanised
}

// Produce a reading for `name`: "<localLang> (<glossLang>)" when glossLang is
// given and differs from localLang, else just the localLang reading.
async function translateName({
  name,
  localLang,
  glossLang = null,
  placeId,
  redis = null,
  _genAIFactory,
  targetLang // back-compat alias for localLang
} = {}) {
  const original = typeof name === 'string' ? name.trim() : '';
  if (!original || !HAS_LOCAL_SCRIPT.test(original)) return null;

  const loc = primaryTag(localLang || targetLang) || 'en';
  const gloss = primaryTag(glossLang);
  const twoPart = gloss && gloss !== loc;
  const cacheKey = (typeof placeId === 'string' && placeId)
    ? `name-reading:v3:${placeId}:${loc}:${twoPart ? gloss : '-'}`
    : null;

  if (cacheKey && redis && redis.isOpen) {
    try {
      const cached = await redis.get(cacheKey);
      if (typeof cached === 'string' && cached.trim()) return cached;
    } catch { /* cache miss is non-fatal */ }
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) return null;

  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });

  let genAI;
  try { genAI = factory(); } catch { return null; }

  const localName = langName(loc) || 'the local language';
  const glossName = langName(gloss) || 'English';
  const capped = original.slice(0, MAX_INPUT_CHARS);
  const prompt = twoPart
    ? [
        `A restaurant is named "${capped}".`,
        `Output ONE line in EXACTLY this format: <name in ${localName}> (<name in ${glossName}>)`,
        `• First part: the name written or transliterated so a ${localName} reader can read it.`,
        `• In the brackets: the name or its meaning in ${glossName}.`,
        `No preamble, no quotes, no explanation — just that one line.`,
        `Example (Chinese name → Japanese + English): シルクロード 新疆料理 (Silk Road Xinjiang Cuisine)`
      ].join('\n')
    : [
        `A restaurant is named "${capped}".`,
        `Give a SHORT version a ${localName} reader can read: translate or transliterate the name into ${localName}, optionally + a 2–4 word ${localName} gloss in parentheses.`,
        `Output ONLY one line. No quotes, no preamble, no explanation.`,
        `Example: Jongno Eunhaengnamu-jip (City Hall branch)`
      ].join('\n');

  for (const candidate of NAME_MODEL_CHAIN) {
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await m.generateContent(prompt);
      require('./api-cost').recordGeminiUsage(redis, candidate, r?.response?.usageMetadata);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; } catch { continue; }
      const cleaned = String(raw).trim()
        .replace(/^```(?:[a-z]+)?\s*|```$/g, '')
        .trim()
        .split('\n')[0]                 // first line only
        .replace(/^["']+|["']+$/g, '')
        .trim();
      if (!isValidReading(cleaned, original, loc)) continue;
      if (cacheKey && redis && redis.isOpen) {
        try { await redis.set(cacheKey, cleaned, { EX: CACHE_TTL_S }); }
        catch { /* non-fatal */ }
      }
      return cleaned;
    } catch (err) {
      console.warn(`[Translate-Name] ${candidate} failed: ${err.message}`);
      continue;
    }
  }
  return null;
}

// Attach `nameReading` to each venue whose name is in a script foreign to the
// venue's country: "<local language> (<app-locale>)". e.g. a Chinese-named
// restaurant in Japan → "シルクロード 新疆料理 (Silk Road Xinjiang Cuisine)".
//
// localLang = LOCAL_LANG_BY_CC[cc] (JP→ja, KR→ko, CN/TW/HK/MO→zh, TH→th);
// glossLang = the user's DEVICE language (en/fr/…) for the bracket, defaulting
// to English when unknown. Skip countries with no foreign script. Per venue:
// skip when the name is already in the local script, has no foreign script
// (Latin), or already has `nameLocal`.
async function attachNameReadings(venues, cc, deviceLang, redis, _genAIFactory) {
  const localLang = LOCAL_LANG_BY_CC[String(cc || '').toUpperCase()];
  if (!localLang || !Array.isArray(venues) || !venues.length) return;
  const loc = primaryTag(localLang);
  const glossLang = primaryTag(deviceLang) || 'en';
  await Promise.all(venues.map(async (v) => {
    if (!v || v.nameReading || v.nameLocal || typeof v.name !== 'string') return;
    const nameLang = nameScriptLang(v.name);
    if (!nameLang || nameLang === loc) return; // Latin, or already in the local script
    try {
      const reading = await translateName({ name: v.name, localLang: loc, glossLang, placeId: v.placeId, redis, _genAIFactory });
      if (reading) v.nameReading = reading;
    } catch { /* leave the native name alone */ }
  }));
}

module.exports = { translateName, attachNameReadings, isValidReading, nameScriptLang };
