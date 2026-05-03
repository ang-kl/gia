const axios = require('axios');
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');

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
    console.error(`[Vibe-Summary] Place Details for ${placeId} failed:`, err.message);
    return '';
  }
}

async function summarizeVibe(reviews) {
  if (!llm.isReady() || !reviews) return null;
  const prompt = `Read these Google reviews of a restaurant in Singapore's CBD. The reader is a solo diner looking for a "Sanctuary" — quiet, comfortable seating, welcoming vibe. Voice: polite, helpful, grounded.

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
    console.error(`[Vibe-Summary] LLM call failed (model=${MODEL_NAME}):`, err.message);
    return null;
  }
}

async function getOrCacheSummary(redis, placeId) {
  if (!placeId) return null;
  const cacheKey = `vibe:summary:${placeId}`;
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const reviewText = await fetchReviewText(placeId);
  if (!reviewText) return null;
  const summary = await summarizeVibe(reviewText);
  if (summary) {
    await redis.setEx(cacheKey, SUMMARY_TTL_SECONDS, summary);
  }
  return summary;
}

module.exports = { summarizeVibe, fetchReviewText, getOrCacheSummary };
