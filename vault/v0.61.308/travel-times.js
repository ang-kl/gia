// travel-times.js — v0.58.52
//
// Best-effort enrichment that fetches Google Routes API durations
// for two travel modes — TRANSIT (🚊/🚍) and DRIVE (🚘) — from the
// user's anchor to each candidate venue. Mirrors the existing
// `vibe-suggest.rankByWalkingTime` pattern (which handles WALK).
//
// On success, populates each venue with:
//   transitMinutes  — integer, rounded; null/undefined when route fails
//   driveMinutes    — integer, rounded; null/undefined when route fails
//
// On any failure (no API key, Routes 5xx, parse error, single-route
// FAIL condition), the helper logs and returns the venues unchanged.
// Downstream rendering treats missing fields as "no data" and omits
// the row.

const axios = require('axios');

const ROUTES_URL = 'https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix';

// One mode at a time — Routes API requires a single travelMode per
// computeRouteMatrix call. We launch TRANSIT and DRIVE in parallel.
async function fetchModeMatrix(apiKey, originLat, originLng, candidates, travelMode) {
  const body = {
    origins: [{ waypoint: { location: { latLng: { latitude: originLat, longitude: originLng } } } }],
    destinations: candidates.map((v) => ({
      waypoint: { location: { latLng: { latitude: v.lat, longitude: v.lng } } }
    })),
    travelMode
    // No routingPreference for TRANSIT/DRIVE — Routes API rejects
    // TRAFFIC_AWARE / TRAFFIC_AWARE_OPTIMAL for TRANSIT mode and
    // we don't need traffic-tuned drive estimates for "rough min".
  };
  const { data } = await axios.post(ROUTES_URL, body, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'originIndex,destinationIndex,duration,condition'
    },
    timeout: 8000
  });
  // Routes API returns either a flat array of elements or {elements: [...]}
  // depending on which version of the gateway. Handle both.
  return Array.isArray(data) ? data : (Array.isArray(data?.elements) ? data.elements : []);
}

// Entry point. Mutates the venues array in place AND returns it.
// `userLat` / `userLng` are the search anchor (typically the cached
// user location for /cuisine and free-text; the override anchor for NL).
async function enrichTravelTimes(userLat, userLng, venues) {
  if (!Array.isArray(venues) || !venues.length) return venues;
  if (!Number.isFinite(userLat) || !Number.isFinite(userLng)) return venues;
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return venues;
  const candidates = venues.filter((v) => Number.isFinite(v.lat) && Number.isFinite(v.lng));
  if (!candidates.length) return venues;

  // Fan out both modes in parallel. Routes API is rate-limited but
  // these two parallel requests are well within free tier.
  const [transitElems, driveElems] = await Promise.all([
    fetchModeMatrix(apiKey, userLat, userLng, candidates, 'TRANSIT').catch((err) => {
      console.warn('[travel-times] TRANSIT matrix failed:', err.message);
      return [];
    }),
    fetchModeMatrix(apiKey, userLat, userLng, candidates, 'DRIVE').catch((err) => {
      console.warn('[travel-times] DRIVE matrix failed:', err.message);
      return [];
    })
  ]);

  candidates.forEach((v, i) => {
    const tElem = transitElems.find((e) => e.destinationIndex === i && e.originIndex === 0);
    if (tElem && tElem.condition === 'ROUTE_EXISTS' && tElem.duration) {
      const seconds = parseInt(String(tElem.duration).replace(/s$/, ''), 10);
      if (Number.isFinite(seconds)) v.transitMinutes = Math.max(1, Math.round(seconds / 60));
    }
    const dElem = driveElems.find((e) => e.destinationIndex === i && e.originIndex === 0);
    if (dElem && dElem.condition === 'ROUTE_EXISTS' && dElem.duration) {
      const seconds = parseInt(String(dElem.duration).replace(/s$/, ''), 10);
      if (Number.isFinite(seconds)) v.driveMinutes = Math.max(1, Math.round(seconds / 60));
    }
  });

  return venues;
}

module.exports = { enrichTravelTimes };
