const axios = require('axios');
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');

const PLACES_DETAILS_URL = (placeId) => `https://places.googleapis.com/v1/places/${placeId}`;
const REVIEWS_FIELD_MASK = 'reviews';
const SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const REVIEW_RECENCY_DAYS = 30;
const MODEL_NAME = llm.HAIKU_MODEL;

function isRecentReview(review, now = Date.now()) {
  const publishTime = review?.publishTime ?? review?.relativePublishTimeDescription;
  if (!publishTime) return true; // unknown → don't drop
  const t = Date.parse(publishTime);
  if (Number.isNaN(t)) return true;
  return now - t <= REVIEW_RECENCY_DAYS * 24 * 60 * 60 * 1000;
}

async function fetchReviewText(placeId, redis = null) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey || !placeId) return '';
  try {
    const { data } = await axios.get(PLACES_DETAILS_URL(placeId), {
      headers: {
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask': REVIEWS_FIELD_MASK
      },
      timeout: 8000
    });
    require('./api-cost').recordMapsCall(redis, 'placeDetails');
    const recent = (data.reviews ?? []).filter(isRecentReview);
    const pool = recent.length ? recent : (data.reviews ?? []); // recent-only, fall back to all if empty
    return pool
      .map((r) => r.text?.text ?? r.originalText?.text ?? '')
      .filter(Boolean)
      .slice(0, 8)
      .join('\n---\n');
  } catch (err) {
    logger.error({ placeId, err: { message: err.message } }, 'vibe-summary placeDetails failed');
    return '';
  }
}

// v0.59.0: lang-aware sanctuary read. EN keeps the v0.58.x prompt
// verbatim. FR uses a parallel French prompt with the same four-bullet
// structure. Iconic SG dish names (laksa, char kway teow, kopi-o,
// kaya toast, mee siam, satay, hokkien mee, popiah, rojak, prata,
// nasi lemak, otah, kueh, chendol, ice kachang) MUST stay in their
// original form even in French — that's how French-speaking SG
// residents refer to them.
const SG_ICONIC_DISHES = '(e.g. laksa, char kway teow, kopi-o, kaya toast, mee siam, satay, hokkien mee, popiah, rojak, prata, roti john, nasi lemak, otah, kueh, chendol, ice kachang, kway teow, char siew, teh tarik)';

// v0.61.381 — a valid sanctuary read is the two 🌿 lines we demanded
// (EN and FR prompts both prefix every line with 🌿). When the model
// has no usable reviews it answers conversationally instead ("I don't
// have any reviews… share the actual Google reviews… the two lines
// you requested") — that refusal must NEVER be cached or rendered.
// This used to leak onto overseas cards (e.g. a Seoul venue, whose
// reviews don't fit the old "restaurant in Singapore's CBD" framing).
// Drop anything that lacks the 🌿 marker or reads as model meta-talk.
function isValidVibe(text) {
  if (typeof text !== 'string') return false;
  const t = text.trim();
  if (!t || !t.includes('🌿')) return false;
  if (/\b(I (do not|don'?t|cannot|can'?t)|as an AI|share the actual|the two lines|placeholder text|provide the (two )?lines)\b/i.test(t)) return false;
  return true;
}

async function summarizeVibe(reviews, lang = 'en') {
  if (!llm.isReady() || !reviews) return null;
  const prompt = lang === 'fr'
    ? `Lisez ces avis Google d’un restaurant. Le lecteur dîne seul et cherche un "Sanctuaire" — calme, places confortables, ambiance accueillante. Voix : polie, utile, ancrée.

Renvoyez EXACTEMENT deux lignes courtes, sans préambule ni conclusion :
🌿 Calme : <une phrase courte>
🌿 Places : <une phrase courte sur le bar/places solo/communales>

IMPORTANT : conservez les noms de plats SG iconiques tels quels ${SG_ICONIC_DISHES} ; ne les traduisez pas en français.

Avis :
${reviews}`
    : `Read these Google reviews of a restaurant. The reader is a solo diner looking for a "Sanctuary" — quiet, comfortable seating, welcoming vibe. Voice: polite, helpful, grounded.

Return EXACTLY two short lines, no preamble, no closing line:
🌿 Quiet: <one short phrase>
🌿 Seating: <one short phrase about bar/single/communal options>

Reviews:
${reviews}`;
  try {
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, maxTokens: 512 }),
      { label: 'Vibe-Summary' }
    );
    const out = result.response.text().trim();
    // v0.61.381 — only the demanded 🌿 two-line shape may pass; a chatty
    // refusal / apology / placeholder echo is dropped to null (never
    // cached, never rendered — the card simply omits the sanctuary line).
    return isValidVibe(out) ? out : null;
  } catch (err) {
    logger.error({ model: MODEL_NAME, err: { message: err.message } }, 'vibe-summary LLM call failed');
    return null;
  }
}

async function getOrCacheSummary(redis, placeId, lang = 'en') {
  if (!placeId) return null;
  // v0.59.0: lang dimension on the cache key. EN and FR sanctuary
  // reads coexist for the same venue.
  const safeLang = lang === 'fr' ? 'fr' : 'en';
  // v0.60.209 — `v2` key namespace: the prompt changed from the
  // 4-bullet `• Quiet/Seating/Vibe/Approach` shape to the 2-line
  // `🌿 Quiet/Seating` shape. Bumping the key avoids serving stale
  // 4-bullet summaries from the 7-day cache after this deploy.
  // v0.61.381 — `v3`: flush any refusal/apology text the pre-guard build
  // cached (7-day TTL) for foreign venues; the prompt also dropped its
  // "Singapore's CBD" framing, so old keys are stale regardless.
  const cacheKey = `vibe:summary:v3:${placeId}:${safeLang}`;
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const reviewText = await fetchReviewText(placeId, redis);
  if (!reviewText) return null;
  const summary = await summarizeVibe(reviewText, safeLang);
  if (summary) {
    await redis.setEx(cacheKey, SUMMARY_TTL_SECONDS, summary);
  }
  return summary;
}

module.exports = { summarizeVibe, fetchReviewText, getOrCacheSummary, isValidVibe };
