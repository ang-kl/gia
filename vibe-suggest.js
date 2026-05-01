const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { withRetry, makeFlashFallback } = require('./gemini-retry');

const PLACES_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_DISTANCE_M = 200; // accept Place if within 200m of user
const SEARCH_RADIUS_M = 200; // walking radius from user-set centre

const CATEGORIES = {
  food: { label: null, hint: null }, // time-of-day branched in mealPeriodSGT
  drink: { label: 'drinks', hint: 'bars, coffee bars, tea spots, juice bars — solo-friendly counter seating' },
  groceries: { label: 'groceries', hint: 'supermarkets, fresh-market grocers, gourmet food stores within walking distance' },
  cuisine: { label: 'cuisine picks', hint: null } // hint composed at runtime from cuisineType
};

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function mealPeriodSGT(date = new Date()) {
  const sgt = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  const h = sgt.getHours();
  if (h >= 7 && h < 11)
    return { id: 'breakfast', label: 'breakfast', hint: 'breakfast spots — coffee, kaya toast, dim sum, bakeries' };
  if (h >= 11 && h < 15)
    return { id: 'lunch', label: 'lunch', hint: 'lunch spots — restaurants and cafés serving meals now' };
  if (h >= 15 && h < 17)
    return { id: 'afternoon', label: 'afternoon snack', hint: 'cafés, bakeries, tea houses, coffee bars, dessert spots' };
  if (h >= 17 && h < 21)
    return { id: 'dinner', label: 'dinner', hint: 'dinner spots — restaurants, omakase, hawker stalls' };
  if (h >= 21 || h < 3)
    return { id: 'supper', label: 'supper', hint: 'late-night supper — bars and restaurants still open' };
  return { id: 'night_supper', label: 'night supper', hint: 'anything still open after midnight' };
}

// Extract Google's "Summarized with Gemini" overview from a Place object.
// Safely handles missing field, region/place-type non-coverage, and the docs'
// inconsistent disclosureText vs disclaimerText naming.
function extractGenerativeSummary(place) {
  const g = place?.generativeSummary;
  const overview = g?.overview?.text?.trim();
  if (!overview) return null;
  const disclosure = (g?.disclosureText?.text || g?.disclaimerText?.text || 'Summarized with Gemini').trim();
  return {
    overview,
    disclosure,
    flagUri: g?.overviewFlagContentUri || ''
  };
}

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function geminiCandidates(meal, lat, lng) {
  if (!genAI) return [];
  const prompt = `You suggest "Sanctuary" venues for a solo female diner in Singapore.
Period: ${meal.label} (${meal.hint}).
User is near latitude ${lat}, longitude ${lng}.

Return EXACTLY a JSON array of 5 candidate venues open in this period
within 800m of that location. Each item has the keys:
  "name"   — the venue's exact common name
  "area"   — the street or building it sits on
  "vibe"   — one short phrase about why it suits a solo diner

Do NOT include lat/lng — those will be looked up authoritatively.
Return ONLY the JSON array, no preamble.`;

  try {
    const generationConfig = { responseMimeType: 'application/json' };
    const model = genAI.getGenerativeModel({ model: MODEL_NAME, generationConfig });
    const result = await withRetry(() => model.generateContent(prompt), {
      label: 'Vibe-Suggest',
      fallbackFn: makeFlashFallback(genAI, prompt, generationConfig)
    });
    const parsed = JSON.parse(result.response.text());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.name === 'string')
      .slice(0, 5);
  } catch (err) {
    console.error(`[Vibe-Suggest] Gemini call failed (model=${MODEL_NAME}):`, err.message);
    return [];
  }
}

const NEGATIVE_KEYWORDS = /\b(loud music|extremely (?:noisy|loud)|under construction|under renovation|renovation works?|closed for renovation|too crowded|over[-\s]?crowded|packed beyond)\b/i;
const RECENT_REVIEW_DAYS = 30;

function isRecentReview(review, now = Date.now()) {
  const t = Date.parse(review?.publishTime ?? '');
  if (!Number.isFinite(t)) return false;
  return now - t <= RECENT_REVIEW_DAYS * 24 * 60 * 60 * 1000;
}

async function hasNegativeRecentReview(placeId) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey || !placeId) return false;
  try {
    const { data } = await axios.get(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: { 'X-Goog-Api-Key': mapsApiKey, 'X-Goog-FieldMask': 'reviews' },
      timeout: 6000
    });
    const all = data.reviews ?? [];
    // v0.26.0: persist the last-5 reviews to place-reviews:<placeId> for the
    // vault-index. Fire-and-forget — never block the validate flow on this.
    try {
      const { cacheReviews } = require('./vault-index');
      cacheReviews(null, placeId, all).catch(() => {});
    } catch { /* vault-index optional */ }

    const recent = all.filter(isRecentReview);
    const pool = recent.length ? recent : all.slice(0, 5);
    return pool.some((r) => {
      const text = `${r.text?.text ?? ''} ${r.originalText?.text ?? ''}`;
      return NEGATIVE_KEYWORDS.test(text);
    });
  } catch (err) {
    console.error(`[Vibe-Suggest] review keyword screen ${placeId} failed:`, err.message);
    return false; // do not block on transient errors
  }
}

async function validateWithPlaces(candidate, near, radiusM = SEARCH_RADIUS_M) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) return null;
  try {
    const { data } = await axios.post(
      PLACES_TEXT_URL,
      {
        textQuery: `${candidate.name} Singapore`,
        maxResultCount: 1,
        locationBias: {
          circle: { center: { latitude: near.lat, longitude: near.lng }, radius: radiusM }
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
            'places.googleMapsUri',
            'places.googleMapsLinks',
            'places.generativeSummary',
            'places.primaryType',
            'places.businessStatus',
            'places.currentOpeningHours.openNow'
          ].join(',')
        },
        timeout: 8000
      }
    );
    const place = (data.places ?? [])[0];
    if (!place?.location) return null;
    const placeCoord = { lat: place.location.latitude, lng: place.location.longitude };
    const distance = haversineMeters(near, placeCoord);
    if (distance > radiusM) return null;
    if ((place.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') return null;
    if (place.currentOpeningHours?.openNow === false) return null;
    if (await hasNegativeRecentReview(place.id)) return null;
    return {
      placeId: place.id,
      name: place.displayName?.text ?? candidate.name,
      area: place.formattedAddress ?? candidate.area ?? '',
      lat: placeCoord.lat,
      lng: placeCoord.lng,
      rating: place.rating ?? null,
      businessStatus: place.businessStatus ?? null,
      openNow: place.currentOpeningHours?.openNow ?? null,
      url: place.googleMapsLinks?.placeUri ?? place.googleMapsUri ?? '',
      directionsUri: place.googleMapsLinks?.directionsUri ?? '',
      reviewsUri: place.googleMapsLinks?.reviewsUri ?? '',
      photosUri: place.googleMapsLinks?.photosUri ?? '',
      primaryType: place.primaryType ?? 'restaurant',
      vibe: candidate.vibe ?? '',
      googleSummary: extractGenerativeSummary(place),
      source: 'gemini+places'
    };
  } catch (err) {
    console.error(`[Vibe-Suggest] Places validation for "${candidate.name}" failed:`, err.message);
    return null;
  }
}

async function rankByWalkingTime(userLat, userLng, venues) {
  if (!venues.length) return venues;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return venues;
  const candidates = venues.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
  if (!candidates.length) return venues;
  try {
    const body = {
      origins: [{ waypoint: { location: { latLng: { latitude: userLat, longitude: userLng } } } }],
      destinations: candidates.map((v) => ({
        waypoint: { location: { latLng: { latitude: v.lat, longitude: v.lng } } }
      })),
      travelMode: 'WALK'
    };
    const { data } = await axios.post(
      'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,distanceMeters,condition'
        },
        timeout: 8000
      }
    );
    const elems = Array.isArray(data) ? data : [];
    candidates.forEach((v, i) => {
      const elem = elems.find((e) => e.destinationIndex === i && e.originIndex === 0);
      if (!elem || !elem.duration) return;
      const seconds = parseInt(String(elem.duration).replace(/s$/, ''), 10);
      if (!Number.isFinite(seconds)) return;
      v.walkSeconds = seconds;
      v.walkMinutes = Math.max(1, Math.round(seconds / 60));
      v.walkMeters = Number.isFinite(elem.distanceMeters) ? elem.distanceMeters : null;
    });
    return [...venues].sort((a, b) => {
      const av = a.walkSeconds ?? Number.POSITIVE_INFINITY;
      const bv = b.walkSeconds ?? Number.POSITIVE_INFINITY;
      return av - bv;
    });
  } catch (err) {
    console.error('[Vibe-Suggest] rankByWalkingTime failed:', err.message);
    return venues;
  }
}

const RADIAL_EXPANSION_M = [200, 500, 1000, 2000];

async function pickValidated(lat, lng, count = 3, _fallbackList = [], opts = {}) {
  // Radial expansion policy (v0.19.0, supersedes v0.11.0 first-candidate-radial):
  //   Try ALL Gemini candidates at 200 m. If any validate, use those
  //   (no expansion needed). If 0 validate at 200 m, try all candidates
  //   at 500 m, then 1000 m, then 2000 m. This maximizes 200 m hit rate
  //   instead of locking the active radius to wherever candidates[0]
  //   first succeeded.
  const category = opts.category || 'food';
  const override = CATEGORIES[category] ?? CATEGORIES.food;
  let meal;
  if (category === 'cuisine' && opts.cuisineType) {
    const c = String(opts.cuisineType).trim();
    meal = {
      id: 'cuisine',
      label: `${c} cuisine`,
      hint: `${c} restaurants and cafés serving authentic ${c} food, suitable for a solo diner`
    };
  } else if (override.hint) {
    meal = { id: category, label: override.label, hint: override.hint };
  } else {
    meal = mealPeriodSGT();
  }
  const candidates = await geminiCandidates(meal, lat, lng);
  if (!candidates.length) return { meal, venues: [] };

  let validated = [];
  let activeRadius = RADIAL_EXPANSION_M[0];
  for (const r of RADIAL_EXPANSION_M) {
    const acc = [];
    for (const candidate of candidates) {
      if (acc.length >= count) break;
      const v = await validateWithPlaces(candidate, { lat, lng }, r);
      if (v) acc.push(v);
    }
    if (acc.length) {
      validated = acc;
      activeRadius = r;
      break; // first radius with any hits wins; tighter is better
    }
  }
  if (!validated.length) return { meal, venues: [] };

  const ranked = await rankByWalkingTime(lat, lng, validated.slice(0, count));
  return { meal, venues: ranked, activeRadius };
}

async function geocodeQuery(text) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey || !text || !text.trim()) return null;
  try {
    const { data } = await axios.post(
      PLACES_TEXT_URL,
      {
        textQuery: `${text.trim()} Singapore`,
        maxResultCount: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          'X-Goog-FieldMask': ['places.id', 'places.displayName', 'places.location', 'places.formattedAddress'].join(',')
        },
        timeout: 8000
      }
    );
    const place = (data.places ?? [])[0];
    if (!place?.location) return null;
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      name: place.displayName?.text ?? text.trim(),
      address: place.formattedAddress ?? '',
      placeId: place.id ?? null
    };
  } catch (err) {
    console.error(`[Vibe-Suggest] geocodeQuery for "${text}" failed:`, err.message);
    return null;
  }
}

module.exports = { mealPeriodSGT, geminiCandidates, validateWithPlaces, pickValidated, geocodeQuery, rankByWalkingTime };
