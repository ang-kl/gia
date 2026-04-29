const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PLACES_DETAILS_URL = (placeId) => `https://places.googleapis.com/v1/places/${placeId}`;
const REVIEWS_FIELD_MASK = 'reviews';
const SUMMARY_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3-flash';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

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
    return (data.reviews ?? [])
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
  if (!genAI || !reviews) return null;
  const prompt = `Read these Google reviews of a restaurant in Singapore's CBD. The reader is a solo female diner looking for a "Sanctuary" — quiet, comfortable seating, welcoming vibe.

Return EXACTLY three short bullets, no preamble, no closing line:
• Quiet: <one short phrase>
• Seating: <one short phrase about bar/single/communal options>
• Vibe: <one short phrase about staff and overall feel for solo dining>

Reviews:
${reviews}`;
  try {
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    return result.response.text().trim();
  } catch (err) {
    console.error(`[Vibe-Summary] Gemini call failed (model=${MODEL_NAME}):`, err.message);
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
