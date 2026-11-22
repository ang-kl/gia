// heritage-significance.js — v0.35.0 lazy-cached Gemini-generated
// heritage-significance line for `/heritage-food` cards.
//
// Each significance line is one short paragraph (1-2 sentences) describing:
//   - generation count if known (e.g. "third-generation")
//   - signature dish that anchors the heritage claim
//   - era / decade founded if known
//
// Cached per-placeId in Redis 30 days under `heritage:sig:<placeId>`.
// Cache key includes only placeId (not user/lang) so it's shareable
// across all queries.
//
// Designed to be optional: callers should never block delivery on this
// — if Gemini fails or the cache is empty, fall back to a generic
// "multi-generational" tag string.

const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');

const SIG_MODEL = process.env.ANTHROPIC_HERITAGE_MODEL || llm.HAIKU_MODEL;

const KEY_PREFIX = 'heritage:sig:';
const CACHE_TTL_S = 30 * 86400; // 30 d

function cacheKey(placeId) { return `${KEY_PREFIX}${placeId}`; }

async function getCached(redis, placeId) {
  if (!redis || !placeId) return null;
  try {
    const v = await redis.get(cacheKey(placeId));
    return v || null;
  } catch (err) {
    logger.warn({ err: { message: err.message } }, 'heritage cache read failed');
    return null;
  }
}

async function setCached(redis, placeId, text) {
  if (!redis || !placeId || !text) return;
  try {
    await redis.set(cacheKey(placeId), String(text).slice(0, 400), { EX: CACHE_TTL_S });
  } catch (err) {
    logger.warn({ err: { message: err.message } }, 'heritage cache write failed');
  }
}

function buildPrompt(venue) {
  const award = (venue.awards || []).find((a) => a) || {};
  const awardLine = award.category
    ? `${award.category}${award.year ? ` (${award.year})` : ''}`
    : '(no award)';
  return `You are a Singapore culinary historian.

Venue: "${venue.name}" at ${venue.address || 'Singapore'}.
Recognised as: ${awardLine}.
${award.notes ? `Note: ${award.notes}` : ''}

Write 1-2 short sentences (under 280 chars total) describing this venue's heritage significance for a hungry diner. Mention:
- Generation count if known (e.g. "third-generation").
- One signature traditional dish that anchors the heritage claim.
- Decade founded if you can recall it.

Constraints:
- Plain prose. No bullets. No emojis.
- If you don't know the generation/decade, OMIT — do NOT invent.
- DO NOT mention awards (the UI already shows those).
- Reply with ONLY the prose. No preamble, no quotes.`;
}

async function generateSignificance(venue) {
  if (!llm.isReady() || !venue?.name) return null;
  const prompt = buildPrompt(venue);
  try {
    const result = await withRetry(
      () => llm.generate({ prompt, model: SIG_MODEL, maxTokens: 256 }),
      { label: 'HeritageSig' }
    );
    const text = (result.response.text() || '').trim();
    return text ? text.slice(0, 400) : null;
  } catch (err) {
    logger.warn({ err: { message: err.message?.slice(0, 200) } }, 'heritage LLM failed');
    return null;
  }
}

// getOrGenerate — tries cache, falls through to Gemini, writes cache.
// Returns null if both fail; callers should handle gracefully.
async function getOrGenerate(redis, venue) {
  if (!venue?.placeId) return null;
  const hit = await getCached(redis, venue.placeId);
  if (hit) return hit;
  const sig = await generateSignificance(venue);
  if (sig) await setCached(redis, venue.placeId, sig);
  return sig;
}

module.exports = { getOrGenerate, generateSignificance, getCached, setCached };
