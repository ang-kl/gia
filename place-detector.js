// place-detector.js — v0.61.119
//
// Detects when free-text input names a Singapore PLACE (hawker centre,
// MRT/LRT station, mall, building, restaurant, food court, address)
// rather than a dish or cuisine. Used by the chat free-text path to
// pivot into a place-anchored Google Places search and (via a callback
// button) a wider "better-nearby" ranked list.
//
// Detection ladder (cheapest → most-general, first hit wins):
//
//   1. MRT/LRT station — exact whole-word match (with optional
//      `mrt` / `lrt` / `station` suffix stripped) against the keys of
//      data/mrt-coords.json (operational stations only). Cheapest +
//      most deterministic + no false positives — runs first. Ordered
//      ahead of hawker because the hawker fuzzy matcher's substring
//      score sometimes prefers an obscure block over an obvious
//      station (e.g. "Tanjong Pagar" → "Blk 6 Tanjong Pagar Plaza"
//      score 0.52 vs the Tanjong Pagar MRT station the user meant).
//      The MRT radius (400m) comfortably catches any hawker centre
//      adjacent to the station (Newton MRT covers Newton Food Centre,
//      Chinatown MRT covers Chinatown Complex, etc.).
//
//   2. Hawker centre — `hawker-vault.findByName(text)` (fuzzy: exact →
//      substring → edit-distance ≥ 0.75). Uses the centre's geocoded
//      lat/lng. Radius: HAWKER_RADIUS_M.
//
//   3. Geocode fallback — `vibe-suggest.geocodeQuery(text)` (Google
//      Places searchText with "Singapore" appended, maxResultCount=1).
//      Catches malls, buildings, restaurants, postal codes, etc.
//      Radius: GEOCODE_RADIUS_M.
//
// All branches return null when no confident hit. The caller treats
// null as "not a place — keep going down the free-text pipeline".
//
// IMPORTANT — what this MUST NOT match:
//   - dish names ("laksa", "chiffon cake", "carrot cake")
//   - cuisine words ("italian", "japanese", "western")
//   - cuisine browse queries ("western cuisine nearby" — see
//     v0.61.118 looksLikeCuisineBrowse in freetext-classify.js, which
//     fires BEFORE this detector in the chat handler)
//
// To keep the detector conservative, callers gate it AFTER the
// cuisine-browse whitelist AND after looksLikeQuestion / nation-overlay
// / R.E.D / misrep / cooking-method — so by the time we're here, the
// deterministic non-place classifiers have already had their say.

'use strict';

const fs = require('fs');
const path = require('path');

// Per-kind search radii (metres). Hawker stalls cluster inside a
// single footprint, MRT eateries spread up the street, geocoded
// places (malls, buildings, restaurants) sit somewhere between.
const HAWKER_RADIUS_M = 150;
const MRT_RADIUS_M = 400;
const GEOCODE_RADIUS_M = 300;

// Radius used when the user taps the "✨ Top eateries nearby" button.
// Wider than the per-kind anchored radius so the alternatives draw
// from a real surrounding area, not just the place's own block.
const NEARBY_RADIUS_M = 1500;

let _mrtCache = null;
function loadMrt() {
  if (_mrtCache) return _mrtCache;
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'data', 'mrt-coords.json'), 'utf8');
    const json = JSON.parse(raw);
    const out = {};
    for (const [name, val] of Object.entries(json)) {
      if (name === '_meta' || !val || typeof val.lat !== 'number' || typeof val.lng !== 'number') continue;
      // Only match against operational stations — future stations
      // (announced but not yet open) would mislead the user to an
      // address that doesn't exist as a food destination yet.
      if (val.status && val.status !== 'operational') continue;
      out[normalise(name)] = { name, lat: val.lat, lng: val.lng, codes: val.codes || [] };
    }
    _mrtCache = out;
  } catch (err) {
    console.warn('[place-detector] mrt-coords.json load failed:', err.message);
    _mrtCache = {};
  }
  return _mrtCache;
}

function normalise(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// MRT-noise tokens that, when stripped from the user's query, leave
// a candidate station name. Bare "Orchard MRT" → "Orchard"; "tanjong
// pagar station" → "tanjong pagar".
const MRT_SUFFIX_WORDS = new Set(['mrt', 'lrt', 'station', 'stn', 'interchange']);

function stripMrtSuffix(text) {
  const tokens = normalise(text).split(/\s+/).filter(Boolean);
  while (tokens.length > 1 && MRT_SUFFIX_WORDS.has(tokens[tokens.length - 1])) tokens.pop();
  return tokens.join(' ');
}

function findMrt(text) {
  const candidate = stripMrtSuffix(text);
  if (!candidate || candidate.length < 3) return null;
  const idx = loadMrt();
  const hit = idx[candidate];
  if (!hit) return null;
  return {
    kind: 'mrt',
    name: hit.name + ' MRT',
    lat: hit.lat,
    lng: hit.lng,
    radius: MRT_RADIUS_M,
    source: 'mrt-coords'
  };
}

// v0.61.124 — STB precinct name match (whole-word, normalised). Lets
// runPlaceAnchoredSearch carry the `precinctId` + `polygon` through to
// the cached anchor so runNearbyAlternatives can do polygon-based
// exclusion ("Top eateries OUTSIDE Marina Bay" instead of generic
// "nearby"). Conservative: only fires on an exact normalised name
// match against precincts.getStbPrecincts(); doesn't fuzzy-match
// (the geocode fallback below handles "marina bay sands" etc.).
function findStbPrecinct(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.length < 3) return null;
  try {
    const precincts = require('./precincts');
    const norm = normalise(trimmed);
    if (!norm) return null;
    for (const p of precincts.getStbPrecincts()) {
      if (normalise(p.label) === norm) {
        return {
          kind: 'precinct',
          name: p.label,
          lat: p.lat,
          lng: p.lng,
          // STB precincts are zonal — use a wider 600m radius so the
          // anchored search sees most venues inside the polygon.
          radius: 600,
          source: 'stb-precinct',
          precinctId: p.id,
          polygon: p.polygon
        };
      }
    }
  } catch (err) {
    console.warn('[place-detector] STB precinct lookup failed:', err.message);
  }
  return null;
}

function findHawker(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.length < 3) return null;
  try {
    const hv = require('./hawker-vault');
    const hit = hv.findByName(trimmed);
    if (!hit || !hit.centre) return null;
    const c = hit.centre;
    // The centre needs coordinates for an anchored search.
    if (typeof c.lat !== 'number' || typeof c.lng !== 'number') return null;
    return {
      kind: 'hawker',
      name: c.name,
      lat: c.lat,
      lng: c.lng,
      radius: HAWKER_RADIUS_M,
      source: 'hawker-vault',
      _score: hit.score
    };
  } catch (err) {
    console.warn('[place-detector] hawker lookup failed:', err.message);
    return null;
  }
}

// v0.62.930 — `ctx` carries the reader's SET LOCATION: { lat, lng, countryCode }.
//
// ⚠ WITHOUT IT THIS FUNCTION IS SINGAPORE-ONLY BY CONSTRUCTION, and that was the
// bug. It called `geocodeQuery`, which glues " Singapore" onto the query, and then
// dropped anything outside a hardcoded SG bounding box. A reader with the location
// set to Tokyo typing 銀座 いしだや got "銀座 いしだや Singapore" sent to Places, and
// whatever came back was either nothing or a Singapore namesake — which, being
// inside the box, was accepted and anchored the search in Singapore. The box could
// not have let Ginza through; no coordinate in Japan satisfies it.
//
// With `ctx`, the country is passed to Places as a regionCode with a bias circle at
// the set location, and a hit is judged by DISTANCE FROM THAT LOCATION. Called
// without `ctx`, every line below behaves exactly as it did.
async function findGeocoded(text, ctx = null) {
  const trimmed = String(text || '').trim();
  if (!trimmed || trimmed.length < 3) return null;
  try {
    const vs = (ctx && typeof ctx._geocoder === 'object' && ctx._geocoder)
      ? ctx._geocoder                      // test seam: a network call needs one
      : require('./vibe-suggest');
    const cc = (ctx && typeof ctx.countryCode === 'string' && /^[A-Z]{2}$/i.test(ctx.countryCode))
      ? ctx.countryCode.toUpperCase() : null;
    const centre = (ctx && Number.isFinite(ctx.lat) && Number.isFinite(ctx.lng))
      ? { lat: ctx.lat, lng: ctx.lng } : null;

    if (cc && cc !== 'SG') {
      const r = await vs.geocodeQueryRegion(trimmed, {
        countryCode: cc,
        biasCenter: centre,
        biasRadiusM: Number.isFinite(ctx.biasRadiusM) ? ctx.biasRadiusM : 30000,
        maxDistanceM: Number.isFinite(ctx.maxDistanceM) ? ctx.maxDistanceM : 150000
      });
      if (!r || typeof r.lat !== 'number' || typeof r.lng !== 'number') return null;
      return {
        kind: 'geocoded',
        name: r.name || trimmed,
        lat: r.lat,
        lng: r.lng,
        radius: GEOCODE_RADIUS_M,
        source: 'geocode',
        placeId: r.placeId || null,
        address: r.address || null
      };
    }

    const r = await vs.geocodeQuery(trimmed);
    if (!r || typeof r.lat !== 'number' || typeof r.lng !== 'number') return null;
    // SG bounding box sanity check — Places sometimes ignores the
    // " Singapore" suffix and returns a foreign match for an
    // ambiguous string. Drop hits outside SG/JB so we don't anchor
    // the user's search in Indonesia.
    if (!(r.lat >= 1.15 && r.lat <= 1.55 && r.lng >= 103.55 && r.lng <= 104.10)) return null;
    return {
      kind: 'geocoded',
      name: r.name || trimmed,
      lat: r.lat,
      lng: r.lng,
      radius: GEOCODE_RADIUS_M,
      source: 'geocode',
      placeId: r.placeId || null,
      address: r.address || null
    };
  } catch (err) {
    console.warn('[place-detector] geocode lookup failed:', err.message);
    return null;
  }
}

// Async because geocode fallback is a Google Places call. The first
// two ladder steps are sync; the third only runs when the cheaper
// branches missed.
async function detectPlaceName(text, ctx = null) {
  const raw = String(text || '').trim();
  if (!raw || raw.length < 3) return null;
  // v0.62.930 — the first three rungs of this ladder are SINGAPORE DATA: STB
  // precincts, the MRT station table, and the hawker vault. Abroad they can only
  // return a wrong answer, and a fuzzy one at that — the hawker matcher accepts an
  // edit-distance score of 0.75, so a foreign name that half-rhymes with a Singapore
  // block would anchor a Tokyo search in Singapore. Skip them when the reader's set
  // country is not SG and go straight to the geocode, which now knows the country.
  const ccIn = (ctx && typeof ctx.countryCode === 'string' && /^[A-Z]{2}$/i.test(ctx.countryCode))
    ? ctx.countryCode.toUpperCase() : null;
  if (ccIn && ccIn !== 'SG') return await findGeocoded(raw, ctx);
  // v0.61.124 — STB precinct first. An exact name match ("Marina Bay",
  // "Chinatown", "Joo Chiat and Katong") returns a precinct hit with
  // polygon + precinctId so downstream callers can do polygon-based
  // exclusion when the user asks for "top eateries nearby".
  const precinct = findStbPrecinct(raw);
  if (precinct) return precinct;
  const mrt = findMrt(raw);
  if (mrt) return mrt;
  const hawker = findHawker(raw);
  if (hawker) return hawker;
  return await findGeocoded(raw, ctx);
}

module.exports = {
  detectPlaceName,
  findStbPrecinct,
  findHawker,
  findMrt,
  findGeocoded,
  HAWKER_RADIUS_M,
  MRT_RADIUS_M,
  GEOCODE_RADIUS_M,
  NEARBY_RADIUS_M,
  _normalise: normalise,
  _stripMrtSuffix: stripMrtSuffix,
  _resetCache: () => { _mrtCache = null; }
};
