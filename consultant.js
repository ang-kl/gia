// consultant.js — Negative Feedback Intelligence (Hidden Sanctuary).
//
// Triggered when pickValidated returns zero venues. Fans out to a
// broader Places searchNearby (any operational venue), pulls reviews
// for the closest candidate, and asks Gemini whether reviews suggest
// a quiet "sanctuary" feel. If yes, returns it as a Hidden Sanctuary.

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const PLACES_DETAILS_URL = (id) => `https://places.googleapis.com/v1/places/${id}`;
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-pro';
const RADIUS_M = 300;
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

async function nearbyAnyOperational(lat, lng) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) return [];
  try {
    const { data } = await axios.post(
      PLACES_NEARBY_URL,
      {
        includedTypes: ['restaurant', 'cafe', 'coffee_shop', 'tea_house', 'bar', 'bakery', 'food_court', 'meal_takeaway'],
        maxResultCount: 5,
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: RADIUS_M } },
        rankPreference: 'DISTANCE'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          'X-Goog-FieldMask': [
            'places.id',
            'places.displayName',
            'places.formattedAddress',
            'places.location',
            'places.rating',
            'places.googleMapsUri',
            'places.primaryType',
            'places.businessStatus',
            'places.currentOpeningHours.openNow'
          ].join(',')
        },
        timeout: 8000
      }
    );
    return (data.places ?? [])
      .filter((p) => (p.businessStatus ?? 'OPERATIONAL') === 'OPERATIONAL')
      .filter((p) => p.currentOpeningHours?.openNow !== false);
  } catch (err) {
    console.error('[Consultant] searchNearby failed:', err.message);
    return [];
  }
}

async function fetchReviews(placeId) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) return [];
  try {
    const { data } = await axios.get(PLACES_DETAILS_URL(placeId), {
      headers: { 'X-Goog-Api-Key': mapsApiKey, 'X-Goog-FieldMask': 'reviews' },
      timeout: 8000
    });
    return (data.reviews ?? []).slice(0, 3);
  } catch (err) {
    console.error(`[Consultant] reviews ${placeId} failed:`, err.message);
    return [];
  }
}

async function geminiSanctuaryRead(name, reviews) {
  if (!genAI || !reviews.length) return null;
  const reviewText = reviews
    .map((r) => r.text?.text ?? r.originalText?.text ?? '')
    .filter(Boolean)
    .slice(0, 3)
    .join('\n---\n');
  if (!reviewText.trim()) return null;
  const prompt = `Reviews of "${name}" in Singapore. Read for these specific keywords/themes: quiet, study, afternoon, coffee, sanctuary, solo-friendly, calm, peaceful, work, single-seat, bar-seat, comfortable for one.

Determine if it can serve as a makeshift Sanctuary for a solo diner — based on whether recent reviews mention these themes positively.

Also extract any building-level navigation cue if mentioned (e.g. "level 3 of Marina One Tower B", "side entrance on Boon Tat Street", "tucked behind the lobby"). Return null in approach if no such cue is mentioned.

Return ONLY a JSON object:
  {"is_sanctuary": <bool>, "reason": "<one short phrase quoting or paraphrasing the relevant review signal>", "approach": <string or null>}.

Reviews:
${reviewText}`;
  try {
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await model.generateContent(prompt);
    const parsed = JSON.parse(result.response.text());
    if (typeof parsed.is_sanctuary === 'boolean' && typeof parsed.reason === 'string') {
      return { is_sanctuary: parsed.is_sanctuary, reason: parsed.reason, approach: typeof parsed.approach === 'string' ? parsed.approach : null };
    }
  } catch (err) {
    console.error('[Consultant] gemini analyze failed:', err.message);
  }
  return null;
}

async function findHiddenSanctuary(lat, lng) {
  const candidates = await nearbyAnyOperational(lat, lng);
  if (!candidates.length) return null;
  for (const place of candidates) {
    const name = place.displayName?.text ?? '';
    if (!name) continue;
    const reviews = await fetchReviews(place.id);
    if (!reviews.length) continue;
    const verdict = await geminiSanctuaryRead(name, reviews);
    if (verdict?.is_sanctuary) {
      return {
        placeId: place.id,
        name,
        area: place.formattedAddress ?? '',
        lat: place.location?.latitude ?? null,
        lng: place.location?.longitude ?? null,
        rating: place.rating ?? null,
        primaryType: place.primaryType ?? 'restaurant',
        url: place.googleMapsUri ?? '',
        openNow: place.currentOpeningHours?.openNow ?? null,
        vibe: verdict.reason,
        approach: verdict.approach || null,
        source: 'hidden-sanctuary'
      };
    }
  }
  return null;
}

module.exports = { findHiddenSanctuary, nearbyAnyOperational, fetchReviews, geminiSanctuaryRead };
