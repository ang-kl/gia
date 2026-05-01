// surprise.js — backend for the /surprise command (v0.24.0).
//
// Spec: serve ONE genuinely surprising sanctuary, away from where the
// user normally walks, with strong recent signal of quality.
//
//   Geometry      annulus 1.5 km–3 km from current location
//   Rating        ≥ 4.3
//   "Hidden"      < 50 Google reviews
//   Price band    ~ $10–$30 entrée → priceLevel ≤ 2 proxy
//   Time gate     openNow OR opens within 2 h, not within last-call window
//   Quality gate  ≥ 1 review in the last 4 days with rating ≥ 4
//   Output        1–3 special dishes + why people order + booking_required
//
// The annulus is enforced by post-filtering haversine distance after a
// 3 km Places Nearby Search; this is cheaper than running multiple
// circle searches around the annulus mid-radius.

const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withRetry } = require('./gemini-retry');

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';

const ANNULUS_INNER_M = 1500;
const ANNULUS_OUTER_M = 3000;
const MIN_RATING      = 4.3;
const MAX_REVIEW_COUNT = 50;
const MAX_PRICE_LEVEL = 2; // PRICE_LEVEL_MODERATE
const RECENT_REVIEW_DAYS = 4;
const MIN_RECENT_RATING = 4;
const OPEN_WITHIN_MS    = 2 * 60 * 60 * 1000; // 2 h
const LAST_CALL_MS      = 30 * 60 * 1000;     // skip if closing in ≤ 30 min

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function priceLevelToInt(p) {
  // Places API v1 returns string enums: PRICE_LEVEL_FREE..PRICE_LEVEL_VERY_EXPENSIVE.
  if (typeof p === 'number') return p;
  const map = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };
  return map[p] ?? null;
}

async function nearbyCandidates(near, mapsApiKey) {
  const { data } = await axios.post(
    PLACES_NEARBY_URL,
    {
      includedTypes: ['restaurant', 'cafe', 'bar', 'meal_takeaway'],
      maxResultCount: 20,
      locationRestriction: {
        circle: {
          center: { latitude: near.lat, longitude: near.lng },
          radius: ANNULUS_OUTER_M
        }
      }
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
          'places.userRatingCount',
          'places.priceLevel',
          'places.businessStatus',
          'places.primaryType'
        ].join(',')
      },
      timeout: 8000
    }
  );
  return data.places ?? [];
}

async function placeDetails(placeId, mapsApiKey) {
  const { data } = await axios.get(`${PLACE_DETAILS_URL}/${placeId}`, {
    headers: {
      'X-Goog-Api-Key': mapsApiKey,
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'priceLevel',
        'googleMapsUri',
        'googleMapsLinks',
        'currentOpeningHours',
        'regularOpeningHours',
        'reviews',
        'primaryType',
        'businessStatus'
      ].join(',')
    },
    timeout: 8000
  });
  return data;
}

// Returns true if the venue is open right now OR will open within
// OPEN_WITHIN_MS, AND won't close within LAST_CALL_MS of "now".
function passesOpeningGate(detail, now = new Date()) {
  if ((detail.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') return false;
  const openNow = detail.currentOpeningHours?.openNow;
  // If Places says open right now, additionally check it's not within last-call.
  if (openNow === true) {
    const closeAt = nextCloseTime(detail.regularOpeningHours, now);
    if (closeAt && closeAt - now.getTime() <= LAST_CALL_MS) return false;
    return true;
  }
  if (openNow === false) {
    const opensAt = nextOpenTime(detail.regularOpeningHours, now);
    if (!opensAt) return false;
    const delta = opensAt - now.getTime();
    return delta > 0 && delta <= OPEN_WITHIN_MS;
  }
  // Unknown openNow → fall back to letting it through (conservative).
  return true;
}

// Compute the next open or close epoch ms from regularOpeningHours.periods.
// periods is an array of {open: {day, hour, minute}, close: {day, hour, minute}}
// where `day` is 0=Sunday..6=Saturday in the venue's local timezone (SGT here).
function nextOpenTime(hours, now) {
  return nextBoundary(hours, now, 'open');
}
function nextCloseTime(hours, now) {
  return nextBoundary(hours, now, 'close');
}
function nextBoundary(hours, now, kind) {
  const periods = hours?.periods ?? [];
  if (!periods.length) return null;
  // Treat clock as SGT (UTC+8) — Places returns local time for SG venues.
  const sgtNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const sgtDay = sgtNow.getUTCDay();
  const sgtMs = sgtNow.getUTCHours() * 3600000 + sgtNow.getUTCMinutes() * 60000;
  let best = Infinity;
  for (const period of periods) {
    const t = period[kind];
    if (!t) continue;
    const dayDelta = (t.day - sgtDay + 7) % 7;
    const ms = (t.hour ?? 0) * 3600000 + (t.minute ?? 0) * 60000;
    let abs = dayDelta * 86400000 + ms - sgtMs;
    if (abs < 0) abs += 7 * 86400000;
    if (abs < best) best = abs;
  }
  return best === Infinity ? null : now.getTime() + best;
}

function passesRecentReviewGate(detail, now = Date.now()) {
  const reviews = detail.reviews ?? [];
  if (!reviews.length) return false;
  const cutoff = now - RECENT_REVIEW_DAYS * 24 * 60 * 60 * 1000;
  return reviews.some((r) => {
    const t = Date.parse(r.publishTime ?? '');
    return Number.isFinite(t) && t >= cutoff && (r.rating ?? 0) >= MIN_RECENT_RATING;
  });
}

async function geminiEnrich(detail) {
  if (!genAI) return { dishes: [], whyOrdered: '', bookingRequired: false };
  try {
    const prompt = `You are Gia, a Singapore food concierge. The user is being shown ONE surprise venue tonight:
  "${detail.displayName?.text}" at ${detail.formattedAddress ?? ''} (rating ${detail.rating}, ${detail.userRatingCount} reviews, primary type ${detail.primaryType}).

Return JSON exactly:
{
  "dishes": ["1-3 specific dishes/items the venue is locally known for"],
  "why_ordered": "one or two sentences on why diners go for those dishes here",
  "booking_required": true|false
}

Return ONLY the JSON object.`;
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await withRetry(() => model.generateContent(prompt), { label: 'Surprise' });
    const parsed = JSON.parse(result.response.text());
    return {
      dishes: Array.isArray(parsed.dishes) ? parsed.dishes.slice(0, 3) : [],
      whyOrdered: typeof parsed.why_ordered === 'string' ? parsed.why_ordered : '',
      bookingRequired: parsed.booking_required === true
    };
  } catch (err) {
    console.error('[Surprise] Gemini enrich failed:', err.message);
    return { dishes: [], whyOrdered: '', bookingRequired: false };
  }
}

async function findSurprise({ lat, lng }) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) throw new Error('GOOGLE_MAPS_API_KEY missing');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('lat/lng required');

  const near = { lat, lng };
  const raw = await nearbyCandidates(near, mapsApiKey);

  // Cheap filters first (no extra API cost).
  const prefiltered = raw
    .filter((p) => (p.businessStatus ?? 'OPERATIONAL') === 'OPERATIONAL')
    .filter((p) => Number.isFinite(p.rating) && p.rating >= MIN_RATING)
    .filter((p) => Number.isFinite(p.userRatingCount) && p.userRatingCount > 0 && p.userRatingCount < MAX_REVIEW_COUNT)
    .filter((p) => {
      const lvl = priceLevelToInt(p.priceLevel);
      return lvl == null || lvl <= MAX_PRICE_LEVEL;
    })
    .map((p) => ({
      ...p,
      _distance: haversine(near, { lat: p.location.latitude, lng: p.location.longitude })
    }))
    .filter((p) => p._distance >= ANNULUS_INNER_M && p._distance <= ANNULUS_OUTER_M)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  if (!prefiltered.length) return null;

  // Sequential Place Details calls, break on first venue passing all gates.
  // Cap at 6 to keep cost bounded (~$0.10 worst case).
  for (const cand of prefiltered.slice(0, 6)) {
    let detail;
    try {
      detail = await placeDetails(cand.id, mapsApiKey);
    } catch (err) {
      console.error(`[Surprise] Place Details ${cand.id} failed:`, err.message);
      continue;
    }
    if (!passesOpeningGate(detail)) continue;
    if (!passesRecentReviewGate(detail)) continue;

    const enrich = await geminiEnrich(detail);
    return {
      placeId: detail.id,
      name: detail.displayName?.text ?? cand.displayName?.text ?? 'venue',
      area: detail.formattedAddress ?? '',
      lat: detail.location.latitude,
      lng: detail.location.longitude,
      rating: detail.rating ?? null,
      userRatingCount: detail.userRatingCount ?? null,
      priceLevel: priceLevelToInt(detail.priceLevel),
      distanceM: Math.round(cand._distance),
      openNow: detail.currentOpeningHours?.openNow ?? null,
      url: detail.googleMapsLinks?.placeUri ?? detail.googleMapsUri ?? '',
      directionsUri: detail.googleMapsLinks?.directionsUri ?? '',
      reviewsUri: detail.googleMapsLinks?.reviewsUri ?? '',
      photosUri: detail.googleMapsLinks?.photosUri ?? '',
      primaryType: detail.primaryType ?? 'restaurant',
      dishes: enrich.dishes,
      whyOrdered: enrich.whyOrdered,
      bookingRequired: enrich.bookingRequired,
      source: 'surprise'
    };
  }
  return null;
}

module.exports = { findSurprise };
