const axios = require('axios');

const PLACES_BASE = 'https://places.googleapis.com/v1/places';
const VAULT_GEO_KEY = 'gia:vault';
const VAULT_HASH_PREFIX = 'gia:place:';
const DEFAULT_RADIUS_M = 500;
const FUZZY_BUFFER_M = 50; // tolerate GPS / coord drift between live tap and stored Vault entry

async function queryVault(redis, lat, lng, radiusM = DEFAULT_RADIUS_M) {
  if (!redis.isOpen) await redis.connect();
  let hits;
  const effectiveRadius = radiusM + FUZZY_BUFFER_M;
  try {
    hits = await redis.sendCommand([
      'GEOSEARCH', VAULT_GEO_KEY,
      'FROMLONLAT', String(lng), String(lat),
      'BYRADIUS', String(effectiveRadius), 'm',
      'ASC',
      'WITHCOORD', 'WITHDIST'
    ]);
  } catch (err) {
    console.error('[Vault] GEOSEARCH failed:', err.message);
    return [];
  }
  if (!Array.isArray(hits) || !hits.length) return [];

  const enriched = [];
  for (const row of hits) {
    // row format with WITHCOORD WITHDIST: [name, distance, [lng, lat]]
    const placeId = Array.isArray(row) ? row[0] : row;
    const distance = Array.isArray(row) ? Number(row[1]) : null;
    const coord = Array.isArray(row) && Array.isArray(row[2]) ? row[2] : null;
    const meta = await redis.hGetAll(`${VAULT_HASH_PREFIX}${placeId}`).catch(() => ({}));
    if (!meta || !meta.name) continue;
    const summaryOverview = (meta.generativeOverview || '').trim();
    enriched.push({
      placeId,
      name: meta.name,
      address: meta.address || '',
      primaryType: meta.primaryType || 'restaurant',
      hours: safeParseJson(meta.hours),
      businessStatus: meta.businessStatus || null,
      lng: coord ? Number(coord[0]) : null,
      lat: coord ? Number(coord[1]) : null,
      walkMeters: Number.isFinite(distance) ? Math.round(distance) : null,
      placeUri: meta.placeUri || '',
      directionsUri: meta.directionsUri || '',
      reviewsUri: meta.reviewsUri || '',
      photosUri: meta.photosUri || '',
      googleSummary: summaryOverview
        ? { overview: summaryOverview, disclosure: meta.generativeDisclosure || 'Summarized with Gemini', flagUri: meta.generativeFlagUri || '' }
        : null,
      source: 'vault'
    });
  }
  return enriched;
}

function safeParseJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return null; }
}

async function verifyOpenNow(placeId) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey || !placeId) return null;
  try {
    const { data } = await axios.get(`${PLACES_BASE}/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'currentOpeningHours.openNow,businessStatus,googleMapsUri,googleMapsLinks,generativeSummary,rating'
      },
      timeout: 6000
    });
    const g = data?.generativeSummary;
    const overview = g?.overview?.text?.trim() || '';
    const disclosure = (g?.disclosureText?.text || g?.disclaimerText?.text || (overview ? 'Summarized with Gemini' : '')).trim();
    return {
      openNow: data?.currentOpeningHours?.openNow ?? null,
      businessStatus: data?.businessStatus ?? null,
      url: data?.googleMapsLinks?.placeUri ?? data?.googleMapsUri ?? '',
      directionsUri: data?.googleMapsLinks?.directionsUri ?? '',
      reviewsUri: data?.googleMapsLinks?.reviewsUri ?? '',
      photosUri: data?.googleMapsLinks?.photosUri ?? '',
      googleSummary: overview ? { overview, disclosure, flagUri: g?.overviewFlagContentUri || '' } : null,
      rating: typeof data?.rating === 'number' ? data.rating : null
    };
  } catch (err) {
    console.error(`[Vault] verifyOpenNow ${placeId} failed:`, err.message);
    return null;
  }
}

async function fetchOpenVaultPicks(redis, lat, lng, radiusM = DEFAULT_RADIUS_M, count = 3) {
  const candidates = await queryVault(redis, lat, lng, radiusM);
  if (!candidates.length) return [];
  const open = [];
  for (const c of candidates) {
    if (open.length >= count) break;
    const live = await verifyOpenNow(c.placeId);
    if (!live) continue;
    if ((live.businessStatus ?? 'OPERATIONAL') !== 'OPERATIONAL') continue;
    if (live.openNow === false) continue;
    open.push({
      ...c,
      openNow: live.openNow ?? null,
      url: live.url || `https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(c.placeId)}`,
      directionsUri: live.directionsUri || '',
      reviewsUri: live.reviewsUri || '',
      photosUri: live.photosUri || '',
      googleSummary: live.googleSummary || c.googleSummary || null,
      rating: live.rating ?? null,
      vibe: ''
    });
  }
  return open;
}

module.exports = { queryVault, verifyOpenNow, fetchOpenVaultPicks, VAULT_GEO_KEY, VAULT_HASH_PREFIX };
