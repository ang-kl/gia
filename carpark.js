// carpark.js — LTA CarParkAvailabilityv2.
// Returns nearest 5 carparks with available lots from user coords.

const axios = require('axios');

const LTA_CARPARK = 'https://datamall2.mytransport.sg/ltaodataservice/CarParkAvailabilityv2';
const PAGE_SIZE = 500; // LTA pagination size

function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function parseLocation(loc) {
  if (!loc || typeof loc !== 'string') return null;
  const parts = loc.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const lat = parseFloat(parts[0]);
  const lng = parseFloat(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

async function fetchAll() {
  const apiKey = process.env.LTA_ACCOUNT_KEY;
  if (!apiKey) throw new Error('LTA_ACCOUNT_KEY not set');
  const out = [];
  let skip = 0;
  for (let page = 0; page < 10; page++) {
    const { data } = await axios.get(LTA_CARPARK, {
      headers: { AccountKey: apiKey },
      params: { $skip: skip },
      timeout: 8000
    });
    const batch = data?.value ?? [];
    out.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    skip += batch.length;
  }
  return out;
}

async function nearest(lat, lng, count = 5) {
  const all = await fetchAll();
  const enriched = all
    .map((cp) => {
      const coord = parseLocation(cp.Location);
      if (!coord) return null;
      const distance = haversineMeters({ lat, lng }, coord);
      const lots = Number(cp.AvailableLots);
      return {
        id: cp.CarParkID,
        development: cp.Development || cp.Area || cp.CarParkID,
        agency: cp.Agency || '',
        lat: coord.lat,
        lng: coord.lng,
        distanceM: Math.round(distance),
        availableLots: Number.isFinite(lots) ? lots : null,
        lotType: cp.LotType || ''
      };
    })
    .filter((x) => x && x.availableLots !== null && x.availableLots > 0)
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, count);
  return enriched;
}

// v0.61.158 — rule §2.8: outside-SG carpark search via Google Places
// New API. LTA's CarParkAvailability feed is SG-only, so for any
// non-SG fix the cuisine overlay + the /carpark command have to
// source carparks elsewhere. Places' `parking` includedType returns
// public carparks within the requested radius (default 5 km per the
// operator's spec). The response shape mirrors `nearest()` for a
// uniform caller contract — except `availableLots` is `null`
// (Places doesn't expose live occupancy) and `agency` is `'Places'`.
const PLACES_NEARBY_URL = 'https://places.googleapis.com/v1/places:searchNearby';

async function nearestPlaces(lat, lng, count = 5, radiusM = 5000, redis = null) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return [];
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn('[carpark.nearestPlaces] GOOGLE_MAPS_API_KEY missing');
    return [];
  }
  const body = {
    includedTypes: ['parking'],
    maxResultCount: Math.max(1, Math.min(Number(count) || 5, 20)),
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: Math.max(1, Math.min(Number(radiusM) || 5000, 50000))
      }
    }
  };
  try {
    const { data } = await axios.post(PLACES_NEARBY_URL, body, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.location,places.formattedAddress,places.id'
      },
      timeout: 8000
    });
    require('./api-cost').recordMapsCall(redis, 'searchNearby');
    const places = Array.isArray(data?.places) ? data.places : [];
    return places
      .map((p) => {
        const la = p?.location?.latitude;
        const lo = p?.location?.longitude;
        if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
        return {
          id: p.id || '',
          development: p.displayName?.text || p.formattedAddress || 'Carpark',
          agency: 'Places',
          lat: la,
          lng: lo,
          distanceM: Math.round(haversineMeters({ lat, lng }, { lat: la, lng: lo })),
          availableLots: null,
          lotType: ''
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.distanceM - b.distanceM)
      .slice(0, count);
  } catch (err) {
    console.warn('[carpark.nearestPlaces] Places call failed:', err.message);
    return [];
  }
}

// v0.61.158 — mode-aware dispatcher. SG mode uses LTA (live lots);
// JB / OTHER use Places (no live-lots data, but at least a list of
// known carparks within 5 km). Caller passes the locale mode from
// location-locale.getUserLocale; null/undefined defaults to LTA so
// pre-registration users keep the SG behaviour.
async function nearestForMode(mode, lat, lng, count = 5, opts = {}) {
  const m = (mode === 'JB' || mode === 'OTHER') ? mode : 'SG';
  if (m === 'SG') {
    return nearest(lat, lng, count);
  }
  return nearestPlaces(lat, lng, count, opts.radiusM || 5000, opts.redis);
}

// v0.63.0 — all carparks as overlay-layer points (every carpark with a
// parseable location, regardless of available lots), for the TMA map
// "🅿 Carpark" layer served by GET /api/geo/carpark.
async function allPoints() {
  const all = await fetchAll();
  return all
    .map((cp) => {
      const coord = parseLocation(cp.Location);
      if (!coord) return null;
      const lots = Number(cp.AvailableLots);
      return {
        name: cp.Development || cp.Area || cp.CarParkID || 'Carpark',
        lat: coord.lat,
        lng: coord.lng,
        availableLots: Number.isFinite(lots) ? lots : null,
        lotType: cp.LotType || ''
      };
    })
    .filter(Boolean);
}

module.exports = { nearest, nearestPlaces, nearestForMode, fetchAll, allPoints };
