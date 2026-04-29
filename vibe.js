const axios = require('axios');

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const RAFFLES_PLACE = { latitude: 1.2839, longitude: 103.8517 };
const SEARCH_RADIUS_M = 500;
const MIN_RATING = 4.0;
const MAX_LISTINGS = 25;

const FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryType',
  'places.businessStatus',
  'places.currentOpeningHours.openNow',
  'places.priceLevel'
].join(',');

const SEED_LISTINGS = [
  { id: null, name: 'Lau Pa Sat', area: '18 Raffles Quay', lat: 1.2806, lng: 103.8504, rating: 4.2, ratingCount: null, openNow: null, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', url: 'https://www.laupasat.sg/', source: 'seed' },
  { id: null, name: 'Amoy Street Food Centre', area: '7 Maxwell Road', lat: 1.2802, lng: 103.8470, rating: 4.4, ratingCount: null, openNow: null, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', url: 'https://maps.google.com/?q=Amoy+Street+Food+Centre', source: 'seed' },
  { id: null, name: 'Maxwell Food Centre', area: '1 Kadayanallur Street', lat: 1.2802, lng: 103.8444, rating: 4.3, ratingCount: null, openNow: null, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', url: 'https://maps.google.com/?q=Maxwell+Food+Centre', source: 'seed' },
  { id: null, name: 'Telok Ayer Hawker Centre', area: '2 Telok Ayer Street', lat: 1.2811, lng: 103.8477, rating: 4.1, ratingCount: null, openNow: null, priceLevel: 'PRICE_LEVEL_INEXPENSIVE', url: 'https://maps.google.com/?q=Telok+Ayer+Hawker+Centre', source: 'seed' },
  { id: null, name: 'Far East Square', area: '45 Pekin Street', lat: 1.2832, lng: 103.8478, rating: 4.0, ratingCount: null, openNow: null, priceLevel: 'PRICE_LEVEL_MODERATE', url: 'https://maps.google.com/?q=Far+East+Square+Singapore', source: 'seed' }
];

async function fetchPlaces(apiKey, opts = {}) {
  const center = opts.center ?? RAFFLES_PLACE;
  const radius = opts.radius ?? SEARCH_RADIUS_M;
  const includedTypes = opts.types ?? ['restaurant', 'cafe'];
  const { data } = await axios.post(PLACES_URL, {
    includedTypes,
    maxResultCount: 20,
    locationRestriction: {
      circle: { center, radius }
    },
    rankPreference: 'POPULARITY'
  }, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': FIELD_MASK
    },
    timeout: 10000
  });

  return (data.places ?? [])
    .filter((p) => (p.businessStatus ?? 'OPERATIONAL') === 'OPERATIONAL')
    .filter((p) => p.currentOpeningHours?.openNow !== false)
    .map((p) => ({
      id: p.id ?? null,
      name: p.displayName?.text ?? 'Unknown',
      area: p.formattedAddress ?? '',
      lat: p.location?.latitude ?? null,
      lng: p.location?.longitude ?? null,
      rating: p.rating ?? null,
      ratingCount: p.userRatingCount ?? null,
      openNow: p.currentOpeningHours?.openNow ?? null,
      businessStatus: p.businessStatus ?? null,
      priceLevel: p.priceLevel ?? null,
      url: p.googleMapsUri ?? '',
      primaryType: p.primaryType ?? 'restaurant',
      source: 'GoogleMaps'
    }));
}

async function refreshVibeListings(redis) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  const writeFallback = async (reason) => {
    if (!redis.isOpen) await redis.connect();
    await redis.set('vibe:listings', JSON.stringify(SEED_LISTINGS));
    console.log(`[Vibe] Using seed fallback (${reason}).`);
  };

  if (!apiKey) {
    await writeFallback('no GOOGLE_MAPS_API_KEY');
    return;
  }

  try {
    const all = await fetchPlaces(apiKey);
    const filtered = all
      .filter((p) => (p.rating ?? 0) >= MIN_RATING)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, MAX_LISTINGS);

    if (!filtered.length) {
      await writeFallback('no places matched filter');
      return;
    }

    if (!redis.isOpen) await redis.connect();
    await redis.set('vibe:listings', JSON.stringify(filtered));
    console.log(`[Vibe] Cached ${filtered.length} live places (Google Maps).`);
  } catch (err) {
    console.error('[Vibe] Places fetch failed:', err.message);
    await writeFallback('Places fetch failed');
  }
}

async function pickLunch(redis, count = 3) {
  if (!redis.isOpen) await redis.connect();
  const cached = await redis.get('vibe:listings');
  const all = cached ? JSON.parse(cached) : SEED_LISTINGS;
  const pool = [...all];
  const picks = [];
  while (picks.length < Math.min(count, pool.length)) {
    const idx = Math.floor(Math.random() * pool.length);
    picks.push(pool.splice(idx, 1)[0]);
  }
  return picks;
}

module.exports = { refreshVibeListings, pickLunch, SEED_LISTINGS };
