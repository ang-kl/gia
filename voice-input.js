// voice-input.js — v0.30.8
//
// Telegram delivers voice notes as OGG/Opus. Gemini 2.5 Flash supports
// audio inline-data input — we transcribe + classify intent in a single
// model call (no separate ASR), then route into the same NL pipeline
// the chat-text handler uses.
//
// Round trip: voice arrives → bot.getFileLink → axios fetch → base64 →
// Gemini Flash with audio + classifier prompt → returns same JSON shape
// as nl-intent.classifyIntent. Cached per file_unique_id (24 h) in case
// the user re-sends the same clip.

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withRetry, makeFlashFallback } = require('./gemini-retry');
const { CUISINE_CATALOGUE } = require('./nl-intent');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const CACHE_TTL_S = 24 * 60 * 60;
const KEY_PREFIX = 'voice-intent:';
const MIN_CONFIDENCE = 0.6;

// Telegram-recorded voices are typically <60s. Hard cap to keep Gemini
// payloads bounded — we bail out cleanly on longer clips.
const MAX_DURATION_S = 90;

async function downloadVoice(bot, fileId) {
  // node-telegram-bot-api: getFileLink → public URL with Bot-Token in
  // path; only valid for ~1 hour. Stream into memory; voices small.
  const url = await bot.getFileLink(fileId);
  const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 8000 });
  return Buffer.from(res.data);
}

function buildVoicePrompt() {
  return `You are an intent classifier for a Singapore food/drinks/groceries concierge bot. The user sent a VOICE MESSAGE in any language. Transcribe it, classify it, and extract structured params.

Return JSON exactly:
{
  "transcript": "<verbatim transcription of what the user said, in the language they spoke>",
  "intent": "food" | "drinks" | "groceries" | "update-location" | "other",
  "confidence": <float 0..1>,
  "cuisines": [<canonical English cuisine names from this catalogue if mentioned/implied; empty if generic — pick from: ${CUISINE_CATALOGUE.join(', ')}>],
  "special_request": "<distinctive qualifier in English: 'Michelin-starred', 'halal', 'vegetarian', 'romantic dinner', 'kid-friendly', 'late-night', 'outdoor seating', 'budget under $20', etc.; empty if none>",
  "location_override": "<Singapore place name explicitly mentioned to anchor the search — e.g. 'Tanjong Pagar MRT', 'Bishan'. Empty if not specified.>",
  "lang": "<ISO 639-1 two-letter code of the spoken language>",
  "ack_text": "<short acknowledgement IN THE SAME LANGUAGE the user spoke>"
}

Intent definitions:
  "food"            — wants restaurant / dish / cuisine recommendations
  "drinks"          — wants bars / coffee / tea / juice
  "groceries"       — wants supermarkets / fresh markets
  "update-location" — wants to change/refresh stored location
  "other"           — greetings, off-topic, sensitive

Return ONLY the JSON object. The audio is the user's input.`;
}

async function classifyVoice({ bot, voice, redis = null }) {
  if (!genAI) return null;
  if (!voice?.file_id) return null;
  if (voice.duration && voice.duration > MAX_DURATION_S) {
    console.warn(`[Voice] clip too long (${voice.duration}s > ${MAX_DURATION_S}s) — skipping`);
    return { error: 'clip_too_long', duration: voice.duration };
  }

  // Cache lookup by file_unique_id (stable across resends).
  let cacheKey = null;
  if (redis && voice.file_unique_id) {
    try {
      cacheKey = `${KEY_PREFIX}${voice.file_unique_id}`;
      if (!redis.isOpen) await redis.connect();
      const cached = await redis.get(cacheKey);
      if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
      }
    } catch (err) {
      console.warn('[Voice] cache read failed:', err.message);
    }
  }

  let buffer;
  try {
    buffer = await downloadVoice(bot, voice.file_id);
    console.log(`[Voice] downloaded ${buffer.length} bytes (mime=${voice.mime_type || 'audio/ogg'})`);
  } catch (err) {
    console.error('[Voice] download failed:', err.message);
    return { error: 'download_failed', message: err.message };
  }

  const prompt = buildVoicePrompt();
  const generationConfig = { responseMimeType: 'application/json' };
  const audioPart = {
    inlineData: {
      data: buffer.toString('base64'),
      mimeType: voice.mime_type || 'audio/ogg'
    }
  };

  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig });
    const fallbackFn = (() => {
      if (!makeFlashFallback(genAI, prompt, generationConfig)) return null;
      return async () => {
        const flash = genAI.getGenerativeModel({ model: 'gemini-2.5-flash', generationConfig });
        return flash.generateContent([audioPart, prompt]);
      };
    })();
    const result = await withRetry(
      () => model.generateContent([audioPart, prompt]),
      { label: 'Voice-Intent', fallbackFn }
    );
    const parsed = JSON.parse(result.response.text());
    const out = {
      transcript: typeof parsed.transcript === 'string' ? parsed.transcript.slice(0, 600) : '',
      intent: ['food', 'drinks', 'groceries', 'update-location', 'other'].includes(parsed.intent) ? parsed.intent : 'other',
      confidence: Number(parsed.confidence) || 0,
      cuisines: Array.isArray(parsed.cuisines)
        ? parsed.cuisines.filter((c) => CUISINE_CATALOGUE.includes(c)).slice(0, 5)
        : [],
      special_request: typeof parsed.special_request === 'string' ? parsed.special_request.slice(0, 200) : '',
      location_override: typeof parsed.location_override === 'string' ? parsed.location_override.slice(0, 100).trim() : '',
      lang: typeof parsed.lang === 'string' ? parsed.lang.slice(0, 2).toLowerCase() : 'en',
      ack_text: typeof parsed.ack_text === 'string' ? parsed.ack_text.slice(0, 240) : '🎙 Heard you out…'
    };
    console.log(`[Voice] transcript="${out.transcript.slice(0, 80)}" intent=${out.intent} conf=${out.confidence} cuisines=${out.cuisines.join('|')} loc="${out.location_override}" lang=${out.lang}`);
    if (cacheKey && redis) {
      redis.set(cacheKey, JSON.stringify(out), { EX: CACHE_TTL_S }).catch(() => {});
    }
    return out;
  } catch (err) {
    console.error('[Voice] classify failed:', err.message);
    return { error: 'classify_failed', message: err.message };
  }
}

module.exports = { classifyVoice, MIN_CONFIDENCE, MAX_DURATION_S };
