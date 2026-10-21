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

async function fetchReviewText(placeId) {
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

async function summarizeVibe(reviews, lang = 'en') {
  if (!llm.isReady() || !reviews) return null;
  const prompt = lang === 'fr'
    ? `Lisez ces avis Google d’un restaurant au CBD de Singapour. Le lecteur dîne seul et cherche un "Sanctuaire" — calme, places confortables, ambiance accueillante. Voix : polie, utile, ancrée.

Renvoyez EXACTEMENT quatre puces courtes, sans préambule ni conclusion :
• Calme : <une phrase courte>
• Places : <une phrase courte sur le bar/places solo/communales>
• Ambiance : <une phrase courte sur le personnel et le ressenti pour dîner seul>
• Accès : <indice de navigation niveau-bâtiment si mentionné — entrée, étage, ruelle, planqué-derrière, etc. Sinon, le seul mot : "—">

IMPORTANT : conservez les noms de plats SG iconiques tels quels ${SG_ICONIC_DISHES} ; ne les traduisez pas en français.

Avis :
${reviews}`
    : `Read these Google reviews of a restaurant in Singapore's CBD. The reader is a solo diner looking for a "Sanctuary" — quiet, comfortable seating, welcoming vibe. Voice: polite, helpful, grounded.

Return EXACTLY four short bullets, no preamble, no closing line:
• Quiet: <one short phrase>
• Seating: <one short phrase about bar/single/communal options>
• Vibe: <one short phrase about staff and overall feel for solo dining>
• Approach: <building-level navigation cue if reviewers mention one — entrance, floor, alley, tucked-behind, etc. Otherwise the single word: "—">

Reviews:
${reviews}`;
  try {
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, maxTokens: 512 }),
      { label: 'Vibe-Summary' }
    );
    return result.response.text().trim();
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
  const cacheKey = `vibe:summary:${placeId}:${safeLang}`;
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const reviewText = await fetchReviewText(placeId);
  if (!reviewText) return null;
  const summary = await summarizeVibe(reviewText, safeLang);
  if (summary) {
    await redis.setEx(cacheKey, SUMMARY_TTL_SECONDS, summary);
  }
  return summary;
}

module.exports = { summarizeVibe, fetchReviewText, getOrCacheSummary };
