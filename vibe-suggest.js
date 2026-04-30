const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const PLACES_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3-flash';
const MAX_DISTANCE_M = 200; // accept Place if within 200m of user
const SEARCH_RADIUS_M = 200; // walking radius from user-set centre

const CATEGORIES = {
  food: { label: null, hint: null }, // time-of-day branched in mealPeriodSGT
  drink: { label: 'drinks', hint: 'bars, coffee bars, tea spots, juice bars — solo-friendly counter seating' },
  groceries: { label: 'groceries', hint: 'supermarkets, fresh-market grocers, gourmet food stores within walking distance' }
};

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function mealPeriodSGT(date = new Date()) {
  const sgt = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Singapore' }));
  const h = sgt.getHours();
  if (h >= 7 && h < 11)
    return { id: 'breakfast', label: 'breakfast', hint: 'breakfast spots — coffee, kaya toast, dim sum, bakeries' };
  if (h >= 11 && h < 15)
    return { id: 'lunch', label: 'lunch', hint: 'lunch spots — restaurants and cafés serving meals now' };
  if (h >= 15 && h < 17)
    return { id: 'afternoon', label: 'afternoon snack', hint: 'desserts, cafés, coffee, tea spots' };
  if (h >= 17 && h < 21)
    return { id: 'dinner', label: 'dinner', hint: 'dinner spots — restaurants, omakase, hawker stalls' };
  if (h >= 21 || h < 3)
    return { id: 'supper', label: 'supper', hint: 'late-night supper — bars and restaurants still open' };
  return { id: 'night_supper', label: 'night supper', hint: 'anything still open after midnight' };
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
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: { responseMimeType: 'application/json' }
    });
    const result = await model.generateContent(prompt);
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

async function validateWithPlaces(candidate, near) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey) return null;
  try {
    const { data } = await axios.post(
      PLACES_TEXT_URL,
      {
        textQuery: `${candidate.name} Singapore`,
        maxResultCount: 1,
        locationBias: {
          circle: { center: { latitude: near.lat, longitude: near.lng }, radius: SEARCH_RADIUS_M }
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
    if (distance > MAX_DISTANCE_M) return null;
    if ((place.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') return null;
    if (place.currentOpeningHours?.openNow === false) return null;
    return {
      placeId: place.id,
      name: place.displayName?.text ?? candidate.name,
      area: place.formattedAddress ?? candidate.area ?? '',
      lat: placeCoord.lat,
      lng: placeCoord.lng,
      rating: place.rating ?? null,
      businessStatus: place.businessStatus ?? null,
      openNow: place.currentOpeningHours?.openNow ?? null,
      url: place.googleMapsUri ?? '',
      primaryType: place.primaryType ?? 'restaurant',
      vibe: candidate.vibe ?? '',
      source: 'gemini+places'
    };
  } catch (err) {
    console.error(`[Vibe-Suggest] Places validation for "${candidate.name}" failed:`, err.message);
    return null;
  }
}

async function pickValidated(lat, lng, count = 3, fallbackList = [], opts = {}) {
  const category = opts.category || 'food';
  const override = CATEGORIES[category] ?? CATEGORIES.food;
  const meal = override.hint
    ? { id: category, label: override.label, hint: override.hint }
    : mealPeriodSGT();
  const candidates = await geminiCandidates(meal, lat, lng);
  const validated = [];
  for (const candidate of candidates) {
    if (validated.length >= count) break;
    const v = await validateWithPlaces(candidate, { lat, lng });
    if (v) validated.push(v);
  }
  if (validated.length < count && fallbackList.length) {
    for (const item of fallbackList) {
      if (validated.length >= count) break;
      if (item.lat == null || item.lng == null) continue;
      validated.push({ ...item, vibe: '', source: 'fallback' });
    }
  }
  return { meal, venues: validated.slice(0, count) };
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

module.exports = { mealPeriodSGT, geminiCandidates, validateWithPlaces, pickValidated, geocodeQuery };
