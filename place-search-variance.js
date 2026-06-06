// place-search-variance.js — v0.61.213
//
// CommonJS module wrapper around the v0.61.212 scripts/place-search-
// variance runner so the /ver admin menu can fire it from chat instead
// of forcing the operator to terminal-into the repo and run node.
// Re-uses the same venues.json + typing-variants.js + scoring logic
// — produces an identical result shape.

'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateVariants } = require('./scripts/place-search-variance/typing-variants');

const VENUES_PATH = path.join(__dirname, 'scripts', 'place-search-variance', 'venues.json');
const REDIS_KEY = 'psv:latest';
const REDIS_TTL_S = 60 * 24 * 60 * 60; // 60 days
const RESULT_CAP = 6;
const CONCURRENCY = 6;
const BATCH_PAUSE_MS = 200;

function loadVenues() {
  const raw = JSON.parse(fs.readFileSync(VENUES_PATH, 'utf8'));
  return Array.isArray(raw?.venues) ? raw.venues : [];
}

// v0.61.218 — alias map. Operator types `KL` / `PJ` / `JB`; venues
// store `Kuala Lumpur` / `Petaling Jaya` / `Johor Bahru`. Without
// these expansions, substring/prefix match misses every short form.
const CITY_ALIASES = Object.freeze({
  'kl':  ['kuala lumpur'],
  'pj':  ['petaling jaya'],
  'sa':  ['shah alam'],
  'sj':  ['subang jaya'],
  'jb':  ['johor bahru'],
  'bkk': ['bangkok'],
  'kjg': ['kajang'],
  'klg': ['klang']
});

// v0.61.216 — buildTestSet now accepts `cities` (an array of
// lowercase city-name fragments matched as case-insensitive
// prefixes of `venue.city`) alongside the existing `country` filter.
// `cities` and `country` are AND-combined (e.g. country='JP' +
// cities=['osaka'] matches only Osaka venues). Pass cities as a
// list so `/training 500 Bali Jakarta` resolves to a single
// filter call.
function buildTestSet({ limit, country, cities } = {}) {
  const venues = loadVenues();
  // v0.61.218 — expand common short forms to their full venue.city
  // names. v0.61.217's `/training 100 KL Putrajaya` matched only
  // Putrajaya because "kuala lumpur".includes("kl") is false.
  const normCities = Array.isArray(cities) && cities.length
    ? cities.map((c) => String(c).toLowerCase().trim()).filter(Boolean).flatMap((c) => CITY_ALIASES[c] || [c])
    : null;
  // v0.61.218 — emit per-venue then round-robin by variant so a
  // small `limit` gives balanced coverage across all matched
  // cities. Previously a flat `for (venue) for (variant)` meant
  // `/training 100 KL Putrajaya` (with KL listed first) consumed
  // the cap on KL before reaching Putrajaya.
  const venueTests = [];
  for (const v of venues) {
    if (country && v.country !== country) continue;
    if (normCities) {
      const cityLower = String(v.city || '').toLowerCase();
      const matched = normCities.some((nc) => cityLower.includes(nc) || cityLower.startsWith(nc));
      if (!matched) continue;
    }
    const variants = [];
    for (const x of generateVariants(v)) {
      variants.push({
        venueId: v.id,
        country: v.country,
        city: v.city,
        expectedName: v.name,
        variant: x.variant,
        query: x.query
      });
    }
    if (variants.length) venueTests.push(variants);
  }
  // Interleave venues across cities so a small cap is balanced.
  // Group venueTests by city → transpose → flat list with cities
  // alternating: [KL1, PJ1, KL2, PJ2, ...].
  const byCity = new Map();
  for (const vt of venueTests) {
    const c = vt[0].city;
    if (!byCity.has(c)) byCity.set(c, []);
    byCity.get(c).push(vt);
  }
  const cityGroups = Array.from(byCity.values());
  const maxCityLen = Math.max(0, ...cityGroups.map((g) => g.length));
  const interleavedVenues = [];
  for (let i = 0; i < maxCityLen; i++) {
    for (const g of cityGroups) {
      if (i < g.length) interleavedVenues.push(g[i]);
    }
  }
  const tests = [];
  const maxVariantCount = Math.max(0, ...interleavedVenues.map((vt) => vt.length));
  for (let i = 0; i < maxVariantCount; i++) {
    for (const vt of interleavedVenues) {
      if (i < vt.length) tests.push(vt[i]);
    }
  }
  return limit ? tests.slice(0, limit) : tests;
}

// v0.61.216 — anchor → curated city. Given the user's cached
// anchor (lat/lng), find the venues' city with the smallest
// haversine distance to any of its venues. Used by the "Smoke
// (current location)" button. Returns null when no anchor
// available or no venue has coords (none do in v0.61.212 — the
// curated venues.json has no lat/lng yet so this helper returns
// the country's first city by default).
function _haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// City-centroid table — coarse but sufficient to pick the right
// city for a "Smoke (current location)" run. Coords are city
// centres of the 14 cities we curate venues for.
// v0.61.352 — replaced the legacy 19-row inline table with the geocoded
// 139-city centroid table (city-centroids.js). nearestCityForAnchor reads
// each entry's lat/lng exactly as before; the richer fields (zoom, label,
// labelLocal, radiusM, source, fallback) feed the TMA location-state model.
const { CITY_CENTROIDS } = require('./city-centroids');

function nearestCityForAnchor(lat, lng) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let best = null;
  for (const [city, c] of Object.entries(CITY_CENTROIDS)) {
    const d = _haversineKm({ lat, lng }, c);
    if (!best || d < best.distanceKm) best = { city, distanceKm: d };
  }
  return best;
}

async function fetchPlaces(apiKey, query, cc) {
  // v0.61.217 — v0.61.216 smoke surfaced Google's real error:
  // "Invalid JSON payload received. Unknown name 'includedRegionCodes'".
  // That field is Autocomplete-only — searchText (New) accepts
  // `regionCode` as the country-bias hint. Dropping the unknown name
  // is the actual fix for the 50/50 Places fails. Same patch applied
  // to index.js:2140 (the live OTHER picker, which had been silently
  // failing 400 + showing "Sorry, geocoding hit an error").
  const body = {
    textQuery: query,
    regionCode: cc,
    pageSize: RESULT_CAP,
    languageCode: 'en'
  };
  try {
    const r = await axios.post(
      'https://places.googleapis.com/v1/places:searchText',
      body,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
          // v0.61.215 — match v0.61.201's live endpoint field mask
          // (Essentials tier only). The original v0.61.213 runner
          // also asked for rating/userRatingCount/types/primaryType
          // which are Pro-tier fields; if the project's billing is
          // Essentials-only, requesting them returns 400 every call.
          // Operator's smoke test showed Places 50/50 fail from this
          // exact cause.
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location'
        },
        timeout: 10000
      }
    );
    const data = r.data;
    const results = (Array.isArray(data?.places) ? data.places : []).map((p) => ({
      placeId: p?.id || '',
      displayName: p?.displayName?.text || '',
      formattedAddress: p?.formattedAddress || '',
      lat: p?.location?.latitude ?? null,
      lng: p?.location?.longitude ?? null,
      rating: null,
      userRatingCount: null,
      primaryType: null,
      types: [],
      source: 'places'
    }));
    return { ok: true, results };
  } catch (err) {
    // v0.61.216 — capture Google's actual error.message
    // (err.response.data.error.message) instead of axios's generic
    // "Request failed with status code 400". Without this the chat
    // summary just shows the status; we can't tell WHY.
    const googleMsg = err.response?.data?.error?.message;
    return {
      ok: false,
      status: err.response?.status ?? 'network',
      error: String(googleMsg || err.message || err).slice(0, 300),
      results: []
    };
  }
}

async function fetchGeocoding(apiKey, query, cc) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:${cc}&key=${apiKey}`;
  try {
    const r = await axios.get(url, { timeout: 8000 });
    const data = r.data;
    if (data?.status && data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      return {
        ok: false,
        status: data.status,
        error: String(data.error_message || '').slice(0, 300),
        results: []
      };
    }
    const arr = Array.isArray(data?.results) ? data.results : [];
    const results = arr.map((g) => ({
      placeId: g.place_id || '',
      displayName: '',
      formattedAddress: g.formatted_address || '',
      lat: g.geometry?.location?.lat ?? null,
      lng: g.geometry?.location?.lng ?? null,
      rating: null,
      userRatingCount: null,
      primaryType: null,
      types: g.types || [],
      source: 'geocode'
    }));
    return { ok: true, results };
  } catch (err) {
    return {
      ok: false,
      status: err.response?.status ?? 'network',
      error: String(err.message || err).slice(0, 300),
      results: []
    };
  }
}

function mergeResults(p, g) {
  const seenIds = new Set();
  const seenCoords = new Set();
  const out = [];
  for (const list of [p, g]) {
    for (const x of list) {
      if (out.length >= RESULT_CAP) break;
      const id = x.placeId || '';
      const coordKey = `${(x.lat ?? 0).toFixed(4)}|${(x.lng ?? 0).toFixed(4)}`;
      if (id && seenIds.has(id)) continue;
      if (seenCoords.has(coordKey)) continue;
      if (id) seenIds.add(id);
      seenCoords.add(coordKey);
      out.push(x);
    }
    if (out.length >= RESULT_CAP) break;
  }
  return out;
}

const NAME_STOPWORDS = new Set([
  'the', 'of', 'and', 'at', 'in', 'a', 'an',
  'mall', 'plaza', 'shopping', 'centre', 'center', 'mart'
]);

function nameTokens(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

function isMatch(expectedName, candidate) {
  const expTok = nameTokens(expectedName);
  if (expTok.length === 0) return false;
  const hay = `${candidate.displayName} ${candidate.formattedAddress}`.toLowerCase();
  let hits = 0;
  for (const t of expTok) if (hay.includes(t)) hits++;
  return hits / expTok.length >= 0.5;
}

async function runOne(apiKey, t) {
  const [pRes, gRes] = await Promise.all([
    fetchPlaces(apiKey, t.query, t.country),
    fetchGeocoding(apiKey, t.query, t.country)
  ]);
  const merged = mergeResults(pRes.results, gRes.results);
  const top1 = merged[0] || null;
  const top1Hit = top1 ? isMatch(t.expectedName, top1) : false;
  const top6HitIdx = merged.findIndex((c) => isMatch(t.expectedName, c));
  return {
    ...t,
    placesOk: pRes.ok,
    placesStatus: pRes.status,
    placesError: pRes.error,
    geocodeOk: gRes.ok,
    geocodeStatus: gRes.status,
    geocodeError: gRes.error,
    placesCount: pRes.results.length,
    geocodeCount: gRes.results.length,
    mergedCount: merged.length,
    top1: top1 ? {
      placeId: top1.placeId,
      displayName: top1.displayName,
      formattedAddress: top1.formattedAddress,
      rating: top1.rating,
      userRatingCount: top1.userRatingCount,
      source: top1.source
    } : null,
    top1Hit,
    top6Hit: top6HitIdx >= 0,
    top6HitIdx
  };
}

function summarise(results) {
  const total = results.length;
  const top1Hits = results.filter((r) => r.top1Hit).length;
  const top6Hits = results.filter((r) => r.top6Hit).length;
  const placesFails = results.filter((r) => !r.placesOk).length;
  const geocodeFails = results.filter((r) => !r.geocodeOk).length;
  const bothEmpty = results.filter((r) => r.mergedCount === 0).length;
  const byVariant = {};
  const byCountry = {};
  const byCity = {};
  // v0.61.215 — top error sample so the chat summary shows WHY
  // an API is failing without needing server-log access.
  const errSamples = { places: new Map(), geocode: new Map() };
  function tallyErr(map, statusCode, msg) {
    const key = `${statusCode || '?'}: ${(msg || '').slice(0, 80)}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  for (const r of results) {
    if (!byVariant[r.variant]) byVariant[r.variant] = { n: 0, top1: 0, top6: 0 };
    byVariant[r.variant].n++;
    if (r.top1Hit) byVariant[r.variant].top1++;
    if (r.top6Hit) byVariant[r.variant].top6++;
    if (!byCountry[r.country]) byCountry[r.country] = { n: 0, top1: 0, top6: 0 };
    byCountry[r.country].n++;
    if (r.top1Hit) byCountry[r.country].top1++;
    if (r.top6Hit) byCountry[r.country].top6++;
    const key = `${r.country}/${r.city}`;
    if (!byCity[key]) byCity[key] = { n: 0, top1: 0, top6: 0 };
    byCity[key].n++;
    if (r.top1Hit) byCity[key].top1++;
    if (r.top6Hit) byCity[key].top6++;
    if (!r.placesOk) tallyErr(errSamples.places, r.placesStatus, r.placesError);
    if (!r.geocodeOk) tallyErr(errSamples.geocode, r.geocodeStatus, r.geocodeError);
  }
  // Top error per source (most-common).
  const topErr = (m) => {
    if (m.size === 0) return null;
    let max = null;
    for (const [k, n] of m.entries()) {
      if (!max || n > max.n) max = { key: k, n };
    }
    return max;
  };
  return {
    total, top1Hits, top6Hits, placesFails, geocodeFails, bothEmpty,
    byVariant, byCountry, byCity,
    topPlacesError: topErr(errSamples.places),
    topGeocodeError: topErr(errSamples.geocode)
  };
}

async function runVarianceTest({ limit, country, cities, apiKey, onProgress } = {}) {
  if (!apiKey) throw new Error('apiKey is required');
  const tests = buildTestSet({ limit, country, cities });
  if (tests.length === 0) return { summary: summarise([]), results: [], durationMs: 0, total: 0 };
  const startedAt = Date.now();
  const results = [];
  for (let i = 0; i < tests.length; i += CONCURRENCY) {
    const batch = tests.slice(i, i + CONCURRENCY);
    const batchRes = await Promise.all(batch.map((t) => runOne(apiKey, t)));
    results.push(...batchRes);
    if (typeof onProgress === 'function') {
      const top1So = results.filter((r) => r.top1Hit).length;
      try { await onProgress({ done: results.length, total: tests.length, top1So }); } catch { /* */ }
    }
    if (i + CONCURRENCY < tests.length) await new Promise((r) => setTimeout(r, BATCH_PAUSE_MS));
  }
  const durationMs = Date.now() - startedAt;
  return {
    summary: summarise(results),
    results,
    durationMs,
    total: results.length,
    countryFilter: country || null,
    cityFilter: Array.isArray(cities) && cities.length ? cities.slice() : null,
    limit: limit || null,
    startedAt
  };
}

async function persistToRedis(redis, payload) {
  if (!redis || typeof payload !== 'object') return false;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.setEx(REDIS_KEY, REDIS_TTL_S, JSON.stringify({
      ts: Date.now(),
      summary: payload.summary,
      total: payload.total,
      durationMs: payload.durationMs,
      countryFilter: payload.countryFilter,
      cityFilter: payload.cityFilter || null,
      limit: payload.limit
    }));
    return true;
  } catch (err) {
    return false;
  }
}

async function loadFromRedis(redis) {
  if (!redis) return null;
  try {
    if (!redis.isOpen) await redis.connect();
    const raw = await redis.get(REDIS_KEY).catch(() => null);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

module.exports = {
  REDIS_KEY,
  REDIS_TTL_S,
  CITY_CENTROIDS,
  loadVenues,
  buildTestSet,
  runVarianceTest,
  persistToRedis,
  loadFromRedis,
  nearestCityForAnchor
};
