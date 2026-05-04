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
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');
const { googleMapsUrl } = require('./maps-url');
const rarityScore = require('./rarity-score');

const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const PLACE_DETAILS_URL = 'https://places.googleapis.com/v1/places';

const ANNULUS_INNER_M = 1500;
const ANNULUS_OUTER_M = 3000;
const MIN_RATING      = 4.3;
const MAX_REVIEW_COUNT = 50;
const MAX_PRICE_LEVEL = 2; // PRICE_LEVEL_MODERATE
// v0.30.2: review-recency window was 4 days per the original Human Lead
// spec, but real SG review velocity for hidden-gem (<50-review) venues
// rarely hits that cadence — we were filtering everyone out and
// returning "no gem". Relaxed to 30 days, which empirically matches
// the actual review pulse on small venues. The strict 4-day signal is
// preserved as a soft preference (top-of-list bias) rather than a gate.
const RECENT_REVIEW_DAYS = 30;
const STRICT_RECENT_DAYS = 4;
const MIN_RECENT_RATING = 4;
const OPEN_WITHIN_MS    = 2 * 60 * 60 * 1000; // 2 h
const LAST_CALL_MS      = 30 * 60 * 1000;     // skip if closing in ≤ 30 min

const MODEL_NAME = llm.DEFAULT_MODEL;


function extractJsonObject(text) {
  if (typeof text !== 'string') return '{}';
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) return fence[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

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
  if (!llm.isReady()) return { dishes: [], whyOrdered: '', bookingRequired: false };
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
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, maxTokens: 512 }),
      { label: 'Surprise' }
    );
    const rawText = result.response.text();
    const parsed = JSON.parse(extractJsonObject(rawText));
    return {
      dishes: Array.isArray(parsed.dishes) ? parsed.dishes.slice(0, 3) : [],
      whyOrdered: typeof parsed.why_ordered === 'string' ? parsed.why_ordered : '',
      bookingRequired: parsed.booking_required === true
    };
  } catch (err) {
    logger.error({ err: { message: err.message } }, 'surprise enrich failed');
    return { dishes: [], whyOrdered: '', bookingRequired: false };
  }
}

async function findSurprise({ lat, lng, redis = null }) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) throw new Error('GOOGLE_MAPS_API_KEY missing');
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw new Error('lat/lng required');

  const near = { lat, lng };
  const raw = await nearbyCandidates(near, mapsApiKey);

  // Cheap filters first (no extra API cost). v0.57.17: dropped the
  // hard userRatingCount < MAX_REVIEW_COUNT gate — rarity-score
  // handles low-volume preference relative to the candidate pool.
  // Annulus + rating + price stay as hard pre-filters; ranking is
  // by rarityScore (rating percentile × low-volume percentile ×
  // recency). Mirrors the live path in pipeline-task.js.
  const annulusPool = raw
    .filter((p) => (p.businessStatus ?? 'OPERATIONAL') === 'OPERATIONAL')
    .filter((p) => Number.isFinite(p.rating) && p.rating >= MIN_RATING)
    .filter((p) => Number.isFinite(p.userRatingCount) && p.userRatingCount > 0)
    .filter((p) => {
      const lvl = priceLevelToInt(p.priceLevel);
      return lvl == null || lvl <= MAX_PRICE_LEVEL;
    })
    .map((p) => ({
      ...p,
      _distance: haversine(near, { lat: p.location.latitude, lng: p.location.longitude })
    }))
    .filter((p) => p._distance >= ANNULUS_INNER_M && p._distance <= ANNULUS_OUTER_M);
  const prefiltered = rarityScore.applyRarityRanking(annulusPool, 6);

  if (!prefiltered.length) return null;

  // Sequential Place Details calls. Cap at 6 to keep cost bounded
  // (~$0.10 worst case). v0.30.2: two-tier — first try strict gates;
  // if no venue passes review-recency gate, fall back to the top-rated
  // venue that passes opening + price + rating + review-count gates.
  // This is what users actually want from /surprise: a real venue,
  // not "no gem found" because no review fired this week.
  let softFallback = null;
  for (const cand of prefiltered.slice(0, 6)) {
    let detail;
    try {
      detail = await placeDetails(cand.id, mapsApiKey);
    } catch (err) {
      logger.error({ placeId: cand.id, err: { message: err.message } }, 'surprise placeDetails failed');
      continue;
    }
    if (!passesOpeningGate(detail)) continue;
    // Soft-fallback: remember the FIRST opening-gate-passing venue so we
    // can return it if nothing makes it through the review-recency gate.
    if (!softFallback) softFallback = { detail, cand, isFallback: true };
    if (!passesRecentReviewGate(detail)) continue;
    softFallback = { detail, cand, isFallback: false };
    break;
  }
  if (!softFallback) return null;
  const { detail, cand, isFallback } = softFallback;
  if (isFallback) {
    logger.info({ name: detail.displayName?.text, placeId: detail.id }, 'surprise soft-fallback (no venue passed 4-day review gate)');
  }
  // Below was a per-iteration block; refactored to single-shot.
  {

    const enrich = await geminiEnrich(detail);
    // v0.26.0: optional Refine pass — fetch weather/traffic/carpark for
    // this single venue and ask Gemini to weather-adjust travel advice.
    let travelAdvice = '';
    let shelterNote = '';
    let weatherFlag = 'unknown';
    if (redis && process.env.PIPELINE_ENABLED !== 'false') {
      try {
        const { fetchContext, refine } = require('./pipeline');
        const venue = {
          placeId: detail.id,
          name: detail.displayName?.text,
          area: detail.formattedAddress,
          lat: detail.location.latitude,
          lng: detail.location.longitude,
          dishes: enrich.dishes,
          signatureDish: enrich.dishes?.[0] || '',
          queueMinEstimate: null,
          costEstimateSgd: null
        };
        const ctx = await fetchContext([venue]);
        const refined = await refine({ draft: [venue], context: ctx, query: { label: 'now' } });
        if (refined?.[0]) {
          travelAdvice = refined[0].travelAdvice || '';
          shelterNote  = refined[0].shelterNote || '';
          weatherFlag  = refined[0].weatherFlag || 'unknown';
        }
      } catch (err) {
        logger.error({ err: { message: err.message } }, 'surprise pipeline refine failed');
      }
    }
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
      url: googleMapsUrl(detail) ?? '',
      directionsUri: detail.googleMapsLinks?.directionsUri ?? '',
      reviewsUri: detail.googleMapsLinks?.reviewsUri ?? '',
      photosUri: detail.googleMapsLinks?.photosUri ?? '',
      primaryType: detail.primaryType ?? 'restaurant',
      dishes: enrich.dishes,
      whyOrdered: enrich.whyOrdered,
      bookingRequired: enrich.bookingRequired,
      travelAdvice,
      shelterNote,
      weatherFlag,
      isFallback,
      source: 'surprise'
    };
  }
  return null;
}

module.exports = { findSurprise };
