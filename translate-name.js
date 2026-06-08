// translate-name.js — v0.61.382
//
// For a venue whose NAME is in a script the reader can't read (CJK /
// Hangul / Thai), produce a SHORT readable line in the user's device
// language: a romanisation + an optional brief gloss, e.g.
//   "종로은행나무집 시청점" → "Jongno Eunhaengnamu-jip (City Hall branch)"
// The native name is KEPT as-is (identity + Google Maps search still
// work); this is an added subtitle, never a replacement.
//
// Operator spec (08-06 '26): foreign-script names should be readable in
// the device language. Decisions: reuse Gemini (no Google Cloud Translate
// API — we just removed paid Google APIs); keep native + add a reading.
//
// Mirrors translate-review.js deliberately: same Gemini model chain,
// 30-day Redis cache, graceful — never throws; returns null when no
// reading is needed (already readable) or on any failure. Gating reuses
// local-name.js (country → local script + RULE B redundancy) so a Korean
// user viewing a Korean name gets no redundant reading.
//
// Server-side only: the GEMINI_API_KEY never leaves the server — this is
// the "secure proxy" answer (the client renders `nameReading`, it never
// calls an API).

'use strict';

const { primaryTag, langName } = require('./translate-review');
const { localLangForCountry, HAS_LOCAL_SCRIPT } = require('./local-name');

const NAME_MODEL_CHAIN = [
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-1.5-flash'
];

const CACHE_TTL_S = 30 * 24 * 60 * 60; // 30 days
const MAX_INPUT_CHARS = 200;

// A good reading is romanised (mostly Latin). Reject output that is still
// the same foreign script, an unchanged echo, or model meta-talk — so a
// failure leaves the card showing only the native name, never garbage.
function isValidReading(reading, original) {
  if (typeof reading !== 'string') return false;
  const t = reading.trim();
  if (!t || t === original) return false;
  if (HAS_LOCAL_SCRIPT.test(t)) return false; // not actually romanised
  if (/\b(I (do not|don'?t|cannot|can'?t)|as an AI|unable to|cannot (romani|translat)|here(?:'s| is) the)\b/i.test(t)) return false;
  return true;
}

async function translateName({
  name,
  targetLang,
  placeId,
  redis = null,
  _genAIFactory
} = {}) {
  const original = typeof name === 'string' ? name.trim() : '';
  // Already readable (no foreign script) → nothing to do.
  if (!original || !HAS_LOCAL_SCRIPT.test(original)) return null;

  const tgt = primaryTag(targetLang) || 'en';
  const cacheKey = (typeof placeId === 'string' && placeId)
    ? `name-reading:v1:${placeId}:${tgt}`
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

  const toName = langName(tgt) || 'English';
  const capped = original.slice(0, MAX_INPUT_CHARS);
  const prompt = [
    `A restaurant is named "${capped}".`,
    `Give a SHORT readable version of that name for a ${toName} speaker who cannot read the original script.`,
    `Output ONLY one line: the romanised / transliterated name, optionally followed by a 2–4 word plain-${toName} gloss in parentheses if it genuinely adds clarity.`,
    `Do NOT include the original script, quotes, preamble, or any explanation.`,
    `Example: Jongno Eunhaengnamu-jip (City Hall branch)`
  ].join('\n');

  for (const candidate of NAME_MODEL_CHAIN) {
    try {
      const m = genAI.getGenerativeModel({ model: candidate });
      const r = await m.generateContent(prompt);
      let raw = '';
      try { raw = r?.response?.text?.() || ''; } catch { continue; }
      const cleaned = String(raw).trim()
        .replace(/^```(?:[a-z]+)?\s*|```$/g, '')
        .trim()
        .split('\n')[0]                 // first line only
        .replace(/^["']+|["']+$/g, '')
        .trim();
      if (!isValidReading(cleaned, original)) continue;
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

// Attach `nameReading` (device-language romanisation) to each venue whose
// name is in a foreign script the user can't read. Gating mirrors
// local-name.js: `localLangForCountry(cc, displayLang)` is null when the
// country has no foreign script OR when the local script IS the user's
// display language (RULE B) → in both cases we skip entirely (no Gemini
// calls). Non-fatal throughout.
async function attachNameReadings(venues, cc, displayLang, redis, _genAIFactory) {
  const local = localLangForCountry(cc, displayLang);
  if (!local || !Array.isArray(venues) || !venues.length) return;
  const tgt = primaryTag(displayLang) || 'en';
  await Promise.all(venues.map(async (v) => {
    if (!v || v.nameReading || typeof v.name !== 'string') return;
    if (!HAS_LOCAL_SCRIPT.test(v.name)) return; // name already readable
    try {
      const reading = await translateName({ name: v.name, targetLang: tgt, placeId: v.placeId, redis, _genAIFactory });
      if (reading) v.nameReading = reading;
    } catch { /* leave the native name alone */ }
  }));
}

module.exports = { translateName, attachNameReadings, isValidReading };
