// social-profiles.js — v0.61.225
//
// Look up a restaurant's official social-media profile URLs (Instagram,
// TikTok, X, Facebook, YouTube, Threads) via a Gemini grounded Google
// Search call. Google Places API does not expose these fields — they
// live only in Google Search's Knowledge Panel — so we mirror the
// gemini-client.js fallback-chain pattern and ask Gemini to surface
// them via the `googleSearch` tool.
//
// Two safeguards against hallucinated URLs:
//   1. Prompt explicitly instructs Gemini to return null for any
//      platform it cannot verify via Search grounding.
//   2. Each returned URL is regex-validated against the expected
//      domain + path shape. Invalid URLs are dropped silently.
//
// Cached in Redis under `social:<placeId>` with a 30-day TTL. Empty
// results are cached too (same TTL) so we don't hammer the API for
// venues that genuinely have no public profiles.

const PRIORITY = ['instagram', 'tiktok', 'facebook', 'x', 'youtube', 'threads'];

// Per-platform URL shape. The patterns are deliberately strict — we'd
// rather drop a legitimate edge-case URL than render a hallucination.
const URL_PATTERNS = {
  instagram: /^https?:\/\/(?:www\.)?instagram\.com\/[A-Za-z0-9_.][A-Za-z0-9_.-]{0,29}\/?$/,
  tiktok:    /^https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.][A-Za-z0-9_.-]{0,23}\/?$/,
  facebook:  /^https?:\/\/(?:www\.|m\.|business\.)?facebook\.com\/[A-Za-z0-9.][A-Za-z0-9.\-]{0,49}\/?$/,
  x:         /^https?:\/\/(?:www\.)?(?:x|twitter)\.com\/[A-Za-z0-9_]{1,15}\/?$/,
  youtube:   /^https?:\/\/(?:www\.)?youtube\.com\/(?:@[A-Za-z0-9_.-]{1,30}|c\/[A-Za-z0-9_.-]+|channel\/[A-Za-z0-9_-]{20,30}|user\/[A-Za-z0-9_.-]+)\/?$/,
  threads:   /^https?:\/\/(?:www\.)?threads\.(?:net|com)\/@[A-Za-z0-9_.][A-Za-z0-9_.-]{0,29}\/?$/
};

const REDIS_KEY = (placeId) => `social:${placeId}`;
const REDIS_TTL_S = 30 * 24 * 60 * 60; // 30 days

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

// Per-attempt timeout — social lookups are simple grounded queries
// (one venue, one JSON object), so they should finish well under 15s.
// Anything longer means we're better off failing fast and rendering
// the venue without socials.
const PER_ATTEMPT_MS = 15_000;

function buildPrompt({ name, address, websiteUri }) {
  const lines = [
    `Find the OFFICIAL social-media profile URLs for this restaurant.`,
    ``,
    `Restaurant: ${name}`,
    address ? `Address: ${address}` : null,
    websiteUri ? `Website: ${websiteUri}` : null,
    ``,
    `Use Google Search to verify each URL. Return a JSON object with`,
    `keys: instagram, tiktok, facebook, x, youtube, threads.`,
    ``,
    `Rules:`,
    `1. Each value must be a FULL URL ending at the profile (e.g.`,
    `   "https://www.instagram.com/handle"), or null if you cannot`,
    `   verify an official profile for that platform.`,
    `2. Do NOT invent URLs. If Google Search does not confirm an`,
    `   official profile, return null for that platform.`,
    `3. Return ONLY the JSON object, no prose, no markdown fence.`,
    `4. Do not include profiles for unrelated venues with the same name.`,
    ``,
    `Example output (with some fields filled, others null):`,
    `{"instagram":"https://www.instagram.com/example","tiktok":null,"facebook":"https://www.facebook.com/example","x":null,"youtube":null,"threads":null}`
  ].filter(Boolean);
  return lines.join('\n');
}

// Cheap JSON extraction. The prompt asks for a bare JSON object but
// Gemini sometimes wraps in fences anyway — accept either shape.
function parseJsonResponse(text) {
  if (!text || typeof text !== 'string') return null;
  let body = text.trim();
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) body = fenced[1].trim();
  const braceStart = body.indexOf('{');
  const braceEnd = body.lastIndexOf('}');
  if (braceStart < 0 || braceEnd <= braceStart) return null;
  try {
    return JSON.parse(body.slice(braceStart, braceEnd + 1));
  } catch {
    return null;
  }
}

function validateProfiles(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  for (const key of PRIORITY) {
    const v = raw[key];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const pattern = URL_PATTERNS[key];
    if (!pattern.test(trimmed)) continue;
    out[key] = trimmed;
  }
  return out;
}

function searchToolForModel(model) {
  const m = String(model || '');
  if (/-latest\b/i.test(m)) return { googleSearch: {} };
  if (/^gemini-([2-9]|\d{2,})/i.test(m)) return { googleSearch: {} };
  return { googleSearchRetrieval: {} };
}

const FALLBACK_CHAIN = [
  { model: 'gemini-flash-latest',   tool: { googleSearch: {} } },
  { model: 'gemini-2.5-flash',      tool: { googleSearch: {} } },
  { model: 'gemini-2.5-flash-lite', tool: { googleSearch: {} } }
];

async function callGemini({ name, address, websiteUri, _genAIFactory }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey && !_genAIFactory) throw new Error('GEMINI_API_KEY unset');
  const factory = _genAIFactory || (() => {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    return new GoogleGenerativeAI(apiKey);
  });
  const genAI = factory();
  const prompt = buildPrompt({ name, address, websiteUri });
  const primaryTool = searchToolForModel(DEFAULT_MODEL);
  const oppositeTool = primaryTool.googleSearch
    ? { googleSearchRetrieval: {} }
    : { googleSearch: {} };
  const attempts = [
    { model: DEFAULT_MODEL, tool: primaryTool },
    { model: DEFAULT_MODEL, tool: oppositeTool },
    ...FALLBACK_CHAIN
  ];
  const seen = new Set();
  const deduped = attempts.filter((a) => {
    const k = `${a.model}|${Object.keys(a.tool)[0]}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const errors = [];
  for (const attempt of deduped) {
    try {
      const m = genAI.getGenerativeModel({
        model: attempt.model,
        tools: [attempt.tool],
        generationConfig: {
          temperature: 0.1,
          topP: 0.8,
          maxOutputTokens: 512,
          thinkingConfig: { thinkingBudget: 0 }
        }
      });
      const text = await Promise.race([
        (async () => {
          const r = await m.generateContent(prompt);
          const t = (r.response && typeof r.response.text === 'function') ? r.response.text() : '';
          if (!t || !t.trim()) throw new Error('empty response');
          return t;
        })(),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error(`per-attempt timeout ${PER_ATTEMPT_MS / 1000}s`)),
          PER_ATTEMPT_MS
        ))
      ]);
      return text;
    } catch (err) {
      errors.push(`${attempt.model}/${Object.keys(attempt.tool)[0]}: ${err.message}`);
    }
  }
  const e = new Error(`social-profiles: all ${deduped.length} Gemini attempts failed | ${errors.join(' | ')}`);
  e.attemptErrors = errors;
  throw e;
}

async function readCache(redis, placeId) {
  if (!redis || !placeId) return null;
  try {
    const raw = await redis.get(REDIS_KEY(placeId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

async function writeCache(redis, placeId, profiles) {
  if (!redis || !placeId) return;
  try {
    const payload = JSON.stringify({
      ...profiles,
      _fetchedAt: new Date().toISOString()
    });
    if (typeof redis.setEx === 'function') {
      await redis.setEx(REDIS_KEY(placeId), REDIS_TTL_S, payload);
    } else if (typeof redis.set === 'function') {
      await redis.set(REDIS_KEY(placeId), payload, { EX: REDIS_TTL_S });
    }
  } catch (err) {
    console.warn('[social-profiles] cache write failed:', err.message);
  }
}

// Strip cache-only fields before returning to callers.
function stripMeta(cached) {
  if (!cached) return {};
  const { _fetchedAt: _ignored, ...rest } = cached;
  return rest;
}

// Public — single venue. Returns an object that may be empty {} (which
// is a perfectly valid "no profiles found" result, also cached).
async function getSocialProfiles(redis, { placeId, name, address, websiteUri, _genAIFactory } = {}) {
  if (!name) return {};
  if (placeId) {
    const cached = await readCache(redis, placeId);
    if (cached) return stripMeta(cached);
  }
  let raw = null;
  try {
    const text = await callGemini({ name, address, websiteUri, _genAIFactory });
    raw = parseJsonResponse(text);
  } catch (err) {
    console.warn(`[social-profiles] lookup "${String(name).slice(0, 60)}" failed:`, err.message);
    // Don't cache transient failures — let the next call retry.
    return {};
  }
  const validated = validateProfiles(raw);
  if (placeId) await writeCache(redis, placeId, validated);
  return validated;
}

// Public — fan-out helper. Resolves to an array of profile objects in
// the same order as `venues`. Caps in-flight Gemini calls at
// `concurrency` to keep latency + spend bounded under /copy-all and
// the /s technique fan-out (12 venues × ~1.5s ≈ 4.5s wall-clock at
// concurrency 4).
async function fetchSocialProfilesForVenues(redis, venues, { concurrency = 4, _genAIFactory } = {}) {
  if (!Array.isArray(venues) || !venues.length) return [];
  const out = new Array(venues.length);
  let cursor = 0;
  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= venues.length) return;
      const v = venues[i] || {};
      out[i] = await getSocialProfiles(redis, {
        placeId: v.placeId || v.id,
        name: v.name || v.displayName?.text,
        address: v.area || v.formattedAddress,
        websiteUri: v.websiteUri,
        _genAIFactory
      });
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, venues.length) }, worker);
  await Promise.all(workers);
  return out;
}

// Public — fetch socials for an array of venues and attach the result
// to each venue as `venue.socialProfiles` (an array of full URL
// strings, priority-ordered, capped at `max`). Errors are swallowed
// per-venue: a failed lookup leaves `socialProfiles` unset, and the
// templates' `Array.isArray && length` guard skips the 📱 row.
async function attachSocialsToVenues(redis, venues, { concurrency = 4, max = 6, _genAIFactory } = {}) {
  if (!Array.isArray(venues) || !venues.length) return;
  try {
    const all = await fetchSocialProfilesForVenues(redis, venues, { concurrency, _genAIFactory });
    venues.forEach((v, i) => {
      if (!v) return;
      const top = pickTopProfiles(all[i], max).map((p) => p.url);
      if (top.length) v.socialProfiles = top;
    });
  } catch (err) {
    console.warn('[social-profiles] attachSocialsToVenues failed:', err.message);
  }
}

// Public — pick top-N priority-ordered URLs from a profiles object.
// Used by the TMA card (max 3 brand buttons) and as a sort helper for
// the chat templates (no cap, but consistent order).
function pickTopProfiles(profiles, max = Infinity) {
  if (!profiles || typeof profiles !== 'object') return [];
  const out = [];
  for (const key of PRIORITY) {
    if (profiles[key]) out.push({ network: key, url: profiles[key] });
    if (out.length >= max) break;
  }
  return out;
}

module.exports = {
  getSocialProfiles,
  fetchSocialProfilesForVenues,
  attachSocialsToVenues,
  pickTopProfiles,
  // Exposed for tests.
  _internal: {
    PRIORITY,
    URL_PATTERNS,
    REDIS_KEY,
    REDIS_TTL_S,
    buildPrompt,
    parseJsonResponse,
    validateProfiles
  }
};
