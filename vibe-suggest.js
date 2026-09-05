const axios = require('axios');
const llm = require('./llm-client');
const { withRetry } = require('./gemini-retry');
const { logger } = require('./logger');
const { googleMapsUrl } = require('./maps-url');

const PLACES_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const MODEL_NAME = llm.DEFAULT_MODEL;
const MAX_DISTANCE_M = 200; // accept Place if within 200m of user
const SEARCH_RADIUS_M = 200; // walking radius from user-set centre

const CATEGORIES = {
  food: { label: null, hint: null }, // time-of-day branched in mealPeriodSGT
  drink: { label: 'drinks', hint: 'bars, coffee bars, tea spots, juice bars — solo-friendly counter seating' },
  groceries: { label: 'groceries', hint: 'supermarkets, fresh-market grocers, gourmet food stores within walking distance' },
  cuisine: { label: 'cuisine picks', hint: null } // hint composed at runtime from cuisineType
};

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
  if (!llm.isReady()) return [];
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
    const result = await withRetry(
      () => llm.generate({ prompt, model: MODEL_NAME, json: true, jsonShape: 'array', maxTokens: 1024 }),
      { label: 'Vibe-Suggest' }
    );
    const parsed = JSON.parse(result.response.text());
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c) => c && typeof c.name === 'string')
      .slice(0, 5);
  } catch (err) {
    logger.error({ model: MODEL_NAME, err: { message: err.message } }, 'vibe-suggest LLM call failed');
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
    logger.error({ placeId, err: { message: err.message } }, 'vibe-suggest review keyword screen failed');
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
            'places.primaryTypeDisplayName',     // v0.60.45 — for restaurantType render line
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
      url: googleMapsUrl(place) ?? '',
      directionsUri: place.googleMapsLinks?.directionsUri ?? '',
      reviewsUri: place.googleMapsLinks?.reviewsUri ?? '',
      photosUri: place.googleMapsLinks?.photosUri ?? '',
      primaryType: place.primaryType ?? 'restaurant',
      // v0.60.45 — humanised cuisine label for the new `🍽️` line below
      // the venue name in formatVenueBlock. Strips trailing "restaurant".
      restaurantType: (() => {
        const t = place.primaryTypeDisplayName?.text || '';
        let s = t || (place.primaryType || '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        return s.replace(/\s+restaurant$/i, '').replace(/^restaurant\s+/i, '').trim();
      })(),
      vibe: candidate.vibe ?? '',
      googleSummary: extractGenerativeSummary(place),
      source: 'gemini+places'
    };
  } catch (err) {
    logger.error({ candidate: candidate.name, err: { message: err.message } }, 'vibe-suggest Places validation failed');
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
    logger.error({ err: { message: err.message } }, 'vibe-suggest rankByWalkingTime failed');
    return venues;
  }
}

const RADIAL_EXPANSION_M = [200, 500, 1000, 2000];

// v0.46.0: Places-first inverted path for /eat /drink /groceries.
// Mirrors the v0.41.0 inversion that fixed /cuisine — Google Places
// returns 20 real candidates → Claude picks N best → rank by walking
// time. Eliminates the hallucinate-then-validate failure class that
// caused "Gia couldn't find a sanctuary within 200m" on non-CBD anchors.
//
// Maps category → discover() inputs:
//   food      → empty cuisines → discover uses searchNearby with broad
//               food types (restaurant, cafe, bar, meal_takeaway,
//               food_court, bakery)
//   drink     → cuisines: ['bar', 'coffee', 'tea', 'cocktail']
//               → discover uses searchText with these keywords
//   groceries → cuisines: ['supermarket', 'grocery store']
//               → discover uses searchText
//   cuisine   → cuisines: [opts.cuisineType]
//
// Radial expansion: 500m → 1000m → 2000m (was 200/500/1000/2000 in
// legacy). 200m was unrealistic outside CBD; the legacy value caused
// the empty-result reports. discover() with locationBias to a 500m
// circle is still tight enough to be "near you" but wide enough that
// most SG anchors return results.
async function pickValidatedInverted(lat, lng, count, opts, meal, redis = null) {
  const pipeline = require('./pipeline');
  const category = opts.category || 'food';

  let cuisines = [];
  if (category === 'drink') cuisines = ['bar', 'coffee', 'tea', 'cocktail'];
  else if (category === 'groceries') cuisines = ['supermarket', 'grocery store'];
  else if (category === 'cuisine' && opts.cuisineType) cuisines = [String(opts.cuisineType).trim()];
  // food: leave empty → discover uses searchNearby with broad food types.

  for (const r of [500, 1000, 2000]) {
    const candidates = await pipeline.discover({
      redis,
      lat,
      lng,
      cuisines,
      radius: r,
      mealPeriod: meal.label,
      maxResults: 20
    });
    if (!candidates.length) continue;

    const narrated = await pipeline.rankAndNarrate({
      candidates,
      query: {
        cuisines,
        label: meal.label,
        detail: meal.hint,
        specialRequest: opts.specialRequest || ''
      },
      snapshot: { vault: [], summaries: {}, reviews: {} },
      count
    });
    if (!narrated.length) continue;

    const ranked = await rankByWalkingTime(lat, lng, narrated);
    return { meal, venues: ranked, activeRadius: r };
  }
  return { meal, venues: [] };
}

async function pickValidated(lat, lng, count = 3, _fallbackList = [], opts = {}, redis = null) {
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

  // v0.46.0: Places-first inverted pipeline by default. Set
  // EAT_INVERSION_ENABLED=false in Railway env to revert to v0.45.x
  // legacy hallucinate-then-validate behaviour.
  if (process.env.EAT_INVERSION_ENABLED !== 'false') {
    const inverted = await pickValidatedInverted(lat, lng, count, opts, meal, redis);
    if (inverted.venues.length) return inverted;
    // Defensive: if Places returns nothing at all radii (extremely
    // rural anchor, or Places API outage), fall through to legacy
    // path so the consultant / hidden-sanctuary fallbacks in runFlow
    // still run with the legacy candidates as input.
    logger.warn(
      { category, lat: Math.round(lat * 1000) / 1000, lng: Math.round(lng * 1000) / 1000 },
      'pickValidated inverted path returned empty; falling through to legacy'
    );
  }

  // Legacy path (v0.45.x and earlier — radial expansion 200m → 500m →
  // 1000m → 2000m, Claude invents → Places validates).
  // Radial expansion policy (v0.19.0):
  //   Try ALL Gemini candidates at 200 m. If any validate, use those
  //   (no expansion needed). If 0 validate at 200 m, try all candidates
  //   at 500 m, then 1000 m, then 2000 m.
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
    logger.error({ text, err: { message: err.message } }, 'vibe-suggest geocodeQuery failed');
    return null;
  }
}

// v0.61.125 — region-aware geocode. When the user has anchored to a
// Malaysia precinct ('JB' or 'MY-PUT'), `geocodeQuery` returned the
// Singapore namesake (e.g. typing "Sheraton Hotel" with a JB anchor
// resolved to Sheraton Towers Orchard) because the textQuery hardcoded
// " Singapore". This variant accepts an optional `region` ('SG' | 'JB'
// | 'MY-PUT' | null) + `biasCenter` ({ lat, lng } | null) and:
//   - changes the textQuery suffix (Singapore vs Johor Bahru, Malaysia
//     vs Putrajaya, Malaysia)
//   - sends a `locationBias` circle around the anchor (50 km JB / 15 km
//     Putrajaya / 25 km SG default) so the Places API ranks nearby
//     candidates higher
//   - filters out hits outside the expected country bbox so a stray
//     SG fallback can't bleed in when the user's MY anchor finds
//     nothing local.
const SG_BBOX = { lat: [1.15, 1.55], lng: [103.55, 104.10] };
const MY_BBOX = { lat: [1.20, 6.80],  lng: [99.50, 105.00] };  // West Malaysia + east coast bias zone

// v0.62.930 — resolve a place INSIDE a named country, biased to the reader's set
// location, and judged by distance from it.
//
// The Places call carries `regionCode` (ISO-3166-1 alpha-2) and a `locationBias`
// circle instead of a country name glued onto the query string. That matters for
// a non-Latin query: "銀座 いしだや Singapore" is a different search from
// "銀座 いしだや" biased to (35.68, 139.77) with regionCode JP, and only the second
// can find a Ginza izakaya.
//
// Acceptance is by DISTANCE from the bias centre, not by a bounding box. A box has
// to be authored per country and silently rejects everything nobody thought to add
// — which is exactly how the SG box in `place-detector` rejected all of Japan.
async function geocodeQueryByCountry(text, opts = {}) {
  const { countryCode, biasCenter, biasRadiusM, maxDistanceM, mapsApiKey } = opts || {};
  if (!mapsApiKey || !text || !String(text).trim() || !countryCode) return null;
  const body = {
    textQuery: String(text).trim(),
    regionCode: countryCode,
    maxResultCount: 5   // several candidates so the distance filter has something to choose from
  };
  if (biasCenter && Number.isFinite(biasCenter.lat) && Number.isFinite(biasCenter.lng)) {
    body.locationBias = {
      circle: {
        center: { latitude: biasCenter.lat, longitude: biasCenter.lng },
        radius: Number.isFinite(biasRadiusM) ? biasRadiusM : 30000
      }
    };
  }
  try {
    const { data } = await axios.post(PLACES_TEXT_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask': [
          'places.id', 'places.displayName', 'places.location',
          'places.formattedAddress', 'places.addressComponents'
        ].join(',')
      },
      timeout: 8000
    });
    const candidates = data?.places ?? [];
    const place = pickNearestInRange(candidates, biasCenter, maxDistanceM);
    if (!place?.location) return null;
    const parsed = parseAddressComponents(place.addressComponents);
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      name: place.displayName?.text ?? String(text).trim(),
      address: place.formattedAddress ?? '',
      placeId: place.id ?? null,
      region: 'OTHER',
      countryCode,
      ...(parsed || {})
    };
  } catch (err) {
    logger.error({ text, countryCode, err: { message: err.message } }, 'geocodeQueryByCountry failed');
    return null;
  }
}

// Nearest candidate within `maxDistanceM` of the bias centre; null when every hit
// is too far. With no centre or no limit, the first candidate stands — the caller
// then has the same "trust Places" behaviour it had before.
function pickNearestInRange(candidates, centre, maxDistanceM) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (list.length === 0) return null;
  const haveCentre = centre && Number.isFinite(centre.lat) && Number.isFinite(centre.lng);
  if (!haveCentre || !Number.isFinite(maxDistanceM)) return list[0] || null;
  let best = null, bestD = Infinity;
  for (const p of list) {
    const lat = p?.location?.latitude, lng = p?.location?.longitude;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const d = haversineM(centre.lat, centre.lng, lat, lng);
    if (d <= maxDistanceM && d < bestD) { best = p; bestD = d; }
  }
  return best;
}

function haversineM(aLat, aLng, bLat, bLng) {
  const R = 6371000, r = (x) => (x * Math.PI) / 180;
  const dLat = r(bLat - aLat), dLng = r(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2
    + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

async function geocodeQueryRegion(text, opts = {}) {
  const mapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!mapsApiKey || !text || !text.trim()) return null;
  const region = (opts && typeof opts.region === 'string') ? opts.region : null;
  const bias = (opts && opts.biasCenter && Number.isFinite(opts.biasCenter.lat) && Number.isFinite(opts.biasCenter.lng))
    ? opts.biasCenter : null;
  // v0.62.930 — COUNTRY-GENERIC BRANCH, and the reason it exists.
  //
  // Everything below this block resolves a place by APPENDING A COUNTRY NAME to
  // the query — ' Singapore', ' Johor Bahru, Malaysia', ' Putrajaya, Malaysia'.
  // That is the whole geographic model, and the branch immediately below says so
  // in its own comment: *"if other-country OTHER anchors are added, this branch
  // will need precinct-specific suffixes."* They were added — `city-centroids.js`
  // carries 19 countries and 11 Japanese cities — and the suffix stayed.
  //
  // So a reader in Tokyo typing 銀座 いしだや had it sent to Places as
  // "銀座 いしだや Putrajaya, Malaysia" (region OTHER), or as
  // "銀座 いしだや Singapore" through the plain `geocodeQuery` that
  // `place-detector` actually calls. Neither can resolve, and an SG namesake
  // that does resolve then anchors the search in Singapore.
  //
  // The fix is the one the bot's /l path has used since v0.60: give Places the
  // ISO regionCode and a locationBias circle at the set location, and judge the
  // result by DISTANCE FROM THAT LOCATION rather than by a hardcoded bbox. Opt-in
  // by `countryCode`, so every existing caller keeps today's behaviour exactly.
  const ccRaw = (opts && typeof opts.countryCode === 'string') ? opts.countryCode.toUpperCase() : '';
  const cc = /^[A-Z]{2}$/.test(ccRaw) ? ccRaw : null;
  if (cc && cc !== 'SG') {
    return await geocodeQueryByCountry(text, {
      countryCode: cc,
      biasCenter: bias,
      biasRadiusM: Number.isFinite(opts?.biasRadiusM) ? opts.biasRadiusM : 30000,
      maxDistanceM: Number.isFinite(opts?.maxDistanceM) ? opts.maxDistanceM : 150000,
      mapsApiKey
    });
  }

  // Suffix + bbox per region (defaults to Singapore-only behaviour).
  let suffix = ' Singapore';
  let bbox = SG_BBOX;
  let biasRadiusM = 25000;
  if (region === 'JB') {
    suffix = ' Johor Bahru, Malaysia';
    bbox = MY_BBOX;
    biasRadiusM = 50000;
  } else if (region === 'MY-PUT' || region === 'OTHER') {
    // v0.61.185 — region renamed MY-PUT → OTHER. The Putrajaya anchor
    // is now ONE of several OTHER anchors (KL / Penang / Batam in
    // future); biasRadiusM bumped 15 km → 20 km to match the v0.61.185
    // precincts.js cap. Suffix still 'Putrajaya, Malaysia' for the
    // IOI Resort anchor specifically; if other-country OTHER anchors
    // are added, this branch will need precinct-specific suffixes.
    suffix = ' Putrajaya, Malaysia';
    bbox = MY_BBOX;
    biasRadiusM = 20000;
  }
  const body = {
    textQuery: `${text.trim()}${suffix}`,
    maxResultCount: 3   // a few candidates so the bbox filter can pick the in-region one
  };
  if (bias) {
    body.locationBias = {
      circle: {
        center: { latitude: bias.lat, longitude: bias.lng },
        radius: biasRadiusM
      }
    };
  }
  try {
    const { data } = await axios.post(
      PLACES_TEXT_URL,
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': mapsApiKey,
          // v0.61.139 — addressComponents lets the Menu TMA render the
          // anchor as "<street> + <building, if any> + (<postal>)" per
          // operator spec, instead of just the Places displayName which
          // for shops-in-malls reads as the shop name only ("Heavenly
          // Wang") without any geographic context. Parser below.
          'X-Goog-FieldMask': [
            'places.id', 'places.displayName', 'places.location',
            'places.formattedAddress', 'places.addressComponents'
          ].join(',')
        },
        timeout: 8000
      }
    );
    const candidates = data?.places ?? [];
    // Prefer the first in-bbox candidate; fall through to the first
    // result if none match (rare — Places usually respects the suffix).
    let place = candidates.find((p) => {
      const lat = p?.location?.latitude;
      const lng = p?.location?.longitude;
      return Number.isFinite(lat) && Number.isFinite(lng)
        && lat >= bbox.lat[0] && lat <= bbox.lat[1]
        && lng >= bbox.lng[0] && lng <= bbox.lng[1];
    });
    if (!place) place = candidates[0];
    if (!place?.location) return null;
    const parsed = parseAddressComponents(place.addressComponents);
    return {
      lat: place.location.latitude,
      lng: place.location.longitude,
      name: place.displayName?.text ?? text.trim(),
      address: place.formattedAddress ?? '',
      placeId: place.id ?? null,
      region: region || 'SG',  // echo the region hint so the caller knows what context was used
      // v0.61.139 — structured address components for the Menu TMA's
      // "Anchored at <street>, <building> (<postal>)" rendering. Any
      // field may be null when Places didn't tag a component (e.g. a
      // residential address often has no `premise`; a road junction
      // pin has no `postal_code`). Caller must tolerate nulls.
      street: parsed?.street || null,
      building: parsed?.building || null,
      postal: parsed?.postal || null
    };
  } catch (err) {
    logger.error({ text, region, err: { message: err.message } }, 'vibe-suggest geocodeQueryRegion failed');
    return null;
  }
}

// v0.61.139 — parseAddressComponents moved to places-address-parser.js
// so unit tests can require it without transitively loading axios
// (vibe-suggest.js imports axios at the top, which breaks under the
// O-22 iCloud-corrupted node_modules/axios/package.json mode). Re-
// exported below for back-compat callers.
const { parseAddressComponents } = require('./places-address-parser');

module.exports = { mealPeriodSGT, geminiCandidates, validateWithPlaces, pickValidated, pickValidatedInverted, geocodeQuery, geocodeQueryRegion, geocodeQueryByCountry, rankByWalkingTime, parseAddressComponents, _pickNearestInRange: pickNearestInRange };
