// nl-anchor.js — v0.62.941.
//
// Where an AI-read ("Tell Soleat") search happens, and what it searches for — shared
// by the Cuisine Mini App's AI route (/api/cuisine/nl-query) and the bot chat's
// question path.
//
// WHY THIS EXISTS. On 25-10 '26 the operator typed "What are the new eateries at
// Raffles City" into the Mini App's AI path and got twelve places from Lengkok Bahru
// to Sentosa. The route called Places with `radius: 50000` whether or not a place was
// named, and Places Text Search treats its circle as a BIAS, not a restriction — so
// even the right centre could not keep results near Raffles City. Operator, same day:
// "When the AI names a place, search within 1.5 km of it (same as the normal search)
// and show the place pill". So:
//   • planNlSearch narrows to NEARBY_RADIUS_M (1,500 m, place-detector.js — the
//     normal search's place radius) when the AI's place resolves;
//   • filterToAnchor holds results to that circle afterwards, nearest-first and never
//     empty (pool-floor.js), because the circle is only a bias upstream;
//   • with no place, nothing changes: the previous 50 km radius and no pill.
//
// The bot chat half: "a sentence its question guard declines is passed to the same AI
// reading instead of the 🍛 reply". answerQuestionWithTellGia runs that decision with
// every side effect injected, so __tests__/chat-question-to-ai.test.js can run it on
// the operator's own sentence; index.js only wires the real dependencies.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md (invariants I1, I3).

'use strict';

const { NEARBY_RADIUS_M } = require('./place-detector');
const { haversineMeters } = require('./location-mode');
const { demoteNeverEmpty } = require('./pool-floor');

const NL_DEFAULT_RADIUS_M = 50000;
// The AI route's long-standing acceptance box for a named place: SG + JB combined.
const SGJB_BOX = { latMin: 1.16, latMax: 1.55, lngMin: 103.6, lngMax: 104.05 };
const MAX_PLACE_DISTANCE_KM = 120;

// The rule the AI route has applied since v0.58.19, moved here unchanged: the place
// must sit in the SG/JB box and within 120 km of the user's fix. With no fix the
// Mini App route has always rejected (distance = Infinity); the chat may have no
// saved location yet, so it opts out of that one clause.
function acceptPlace(place, userLat, userLng, { requireUserFix = true } = {}) {
  if (!place || !Number.isFinite(place.lat) || !Number.isFinite(place.lng)) {
    return { ok: false, reason: 'no-coords', distKm: null };
  }
  const inBox = place.lat >= SGJB_BOX.latMin && place.lat <= SGJB_BOX.latMax
    && place.lng >= SGJB_BOX.lngMin && place.lng <= SGJB_BOX.lngMax;
  const hasFix = Number.isFinite(userLat) && Number.isFinite(userLng);
  const distKm = hasFix ? haversineMeters({ lat: userLat, lng: userLng }, place) / 1000 : Infinity;
  if (!inBox) return { ok: false, reason: 'outside-sgjb', distKm };
  if (!hasFix && !requireUserFix) return { ok: true, reason: null, distKm: null };
  if (distKm > MAX_PLACE_DISTANCE_KM) return { ok: false, reason: 'too-far', distKm };
  return { ok: true, reason: null, distKm };
}

function planNlSearch({ place = null, userLat, userLng } = {}) {
  if (place && Number.isFinite(place.lat) && Number.isFinite(place.lng)) {
    return {
      anchored: true,
      lat: place.lat,
      lng: place.lng,
      radius: NEARBY_RADIUS_M,
      placeAnchor: { name: place.name || '', lat: place.lat, lng: place.lng, kind: 'ai', source: place.source || 'tell-gia' },
      // v0.62.945 — 'building' | 'road' | null (building-scope.js). A building or road narrows the
      // results to what is inside it, then a 150 m ring (scopeToPlace).
      scope: place.scope === 'building' || place.scope === 'road' ? place.scope : null,
    };
  }
  return { anchored: false, lat: userLat, lng: userLng, radius: NL_DEFAULT_RADIUS_M, placeAnchor: null };
}

// v0.62.945 — operator, 26-10 '26: "if the query is building specify the AI should query within
// building". For a building or road, inside first, then 150 m, nothing farther, and an honest empty
// (scopeToPlace's `empty`). Anything else falls back to filterToAnchor's 1.5 km circle.
function scopeToPlace(venues, plan) {
  if (plan && plan.anchored && plan.scope) {
    const r = require('./building-scope').scopeVenues(venues, { name: plan.placeAnchor.name, lat: plan.lat, lng: plan.lng, scope: plan.scope });
    return { venues: r.venues, empty: r.empty, insideCount: r.insideCount, ringCount: r.ringCount };
  }
  return { venues: filterToAnchor(venues, plan), empty: false, insideCount: null, ringCount: null };
}

// v0.62.945 — one log line per AI reading, so a case like 25-10's ("New eateries in Raffles City"
// searched 50 km) is answerable from the log: where the reading came from (the model, the keyword
// fallback or the 60 s cache), the place and how it was found, "new", the cuisines and the radius.
// No chat id: the same identity-free rule as freetext-log.js.
function readingLine({ route, source, place, placeVia, scope, newlyOpened, cuisines, radius, count } = {}) {
  const q = (s) => JSON.stringify(String(s == null ? '' : s).slice(0, 60));
  return `[${route || 'AI'}] D769 reading source=${source || '?'} place=${q(place)} via=${placeVia || 'none'}`
    + ` scope=${scope || 'none'} new=${newlyOpened === true} cuisines=${JSON.stringify(Array.isArray(cuisines) ? cuisines.slice(0, 5) : [])}`
    + ` radius=${Number.isFinite(radius) ? radius : '?'}m${Number.isFinite(count) ? ` results=${count}` : ''}`;
}

function filterToAnchor(venues, plan) {
  const pool = Array.isArray(venues) ? venues : [];
  if (!plan || !plan.anchored) return pool;
  const centre = { lat: plan.lat, lng: plan.lng };
  const dist = (v) => (Number.isFinite(v?.lat) && Number.isFinite(v?.lng) ? haversineMeters(centre, v) : null);
  // A venue with no coordinates is kept rather than guessed about.
  const inside = pool.filter((v) => { const d = dist(v); return d == null || d <= plan.radius; });
  const nearestFirst = pool.slice().sort((a, b) => (dist(a) ?? Infinity) - (dist(b) ?? Infinity));
  return demoteNeverEmpty(inside, nearestFirst);
}

// The AI route's query building (v0.57.2 modifiers, v0.58.32 brand passthrough,
// v0.62.94 dish aliases), moved out of the route unchanged so the chat builds the
// same queries. nl-anchor.test.js compares it with a verbatim copy of the old code.
function buildNlQueries({ text, cuisineNames = [], merged = {} }) {
  const modifiers = [];
  if (merged.newlyOpened) modifiers.push('newly opened');
  if (merged.halal) modifiers.push('halal');
  if (merged.vegetarian) modifiers.push('vegetarian');
  let cuisineQueries;
  if (modifiers.length && cuisineNames.length) {
    cuisineQueries = cuisineNames.map((n) => `${modifiers.join(' ')} ${n}`);
  } else if (modifiers.length) {
    cuisineQueries = [modifiers.join(' ')];
  } else {
    cuisineQueries = cuisineNames;
  }
  // v0.58.32: brand-name passthrough — "sushi tei" must not collapse to "japanese".
  if (typeof text === 'string') {
    const trimmed = text.trim();
    const looksBrand = trimmed.length >= 3 && trimmed.length <= 40
      && /[a-z]/i.test(trimmed)
      && trimmed.split(/\s+/).length <= 4;
    if (looksBrand && !cuisineQueries.some((q) => q && q.toLowerCase().includes(trimmed.toLowerCase()))) {
      cuisineQueries = [trimmed, ...cuisineQueries];
      console.log(`[NL-Query] D772 brand-name prepended — "${trimmed}" + ${JSON.stringify(cuisineNames)}`);
    }
  }
  // v0.62.94 — colloquial dish aliases ("dai lok" → Hokkien mee); the alias replaces
  // the ambiguous verbatim query the brand passthrough may have prepended.
  try {
    const { expandDishAliases } = require('./dish-aliases');
    const alias = expandDishAliases(text);
    if (alias) {
      const trimmedLC = typeof text === 'string' ? text.trim().toLowerCase() : '';
      cuisineQueries = cuisineQueries.filter((q) => q && q.toLowerCase() !== trimmedLC);
      const fresh = alias.terms.filter(
        (t) => !cuisineQueries.some((q) => q && q.toLowerCase() === t.toLowerCase())
      );
      cuisineQueries = [...fresh, ...cuisineQueries];
      console.log(`[NL-Query] D774 dish-alias ${alias.label} → queries ${JSON.stringify(cuisineQueries.slice(0, 4))}…`);
    }
  } catch (err) {
    console.warn(`[NL-Query] dish-alias skipped: ${err.message}`);
  }
  return cuisineQueries;
}

// tell-gia returns an all-empty reading for text that is not about food.
function isEmptyReading(inferred) {
  if (!inferred || typeof inferred !== 'object') return true;
  const f = inferred.filters || {};
  const anyFlag = ['newlyOpened', 'openNow', 'halal', 'vegetarian', 'homeBased'].some((k) => f[k] === true);
  const anyPrice = Array.isArray(f.prices) && f.prices.length > 0;
  const anyCuisine = Array.isArray(inferred.cuisines) && inferred.cuisines.length > 0;
  const anyPlace = typeof inferred.location_override === 'string' && inferred.location_override.trim() !== '';
  return !(anyFlag || anyPrice || anyCuisine || anyPlace);
}

// The chat's question path. Returns one of:
//   { kind: 'delivered', count } | { kind: 'askedLocation' } | { kind: 'declined', reason }
// 'declined' means the caller sends today's 🍛 reply. Throws only if a dependency
// throws; the caller treats that as 'declined' too.
async function answerQuestionWithTellGia({ text, deps }) {
  const d = deps;
  if (!(await d.consumeQuota())) return { kind: 'declined', reason: 'quota' };
  const inferred = await d.infer(text);
  if (isEmptyReading(inferred)) return { kind: 'declined', reason: 'not-food' };

  const loc = await d.getUserLocation();
  const userLat = loc && Number.isFinite(loc.lat) ? loc.lat : undefined;
  const userLng = loc && Number.isFinite(loc.lng) ? loc.lng : undefined;

  let place = null;
  let placeVia = 'none';
  const override = typeof inferred.location_override === 'string' ? inferred.location_override.trim() : '';
  if (override) {
    const g = await d.geocode(override);
    if (g && acceptPlace(g, userLat, userLng, { requireUserFix: false }).ok) { place = g; placeVia = 'model'; }
  }
  // v0.62.945 — the model named no place (or one that failed acceptPlace): ask the normal search's
  // place detector, which reads "Raffles City" out of the text whether the model dropped it or never
  // ran. Optional dependency, so a caller without one behaves exactly as before.
  if (!place && typeof d.detectPlace === 'function') {
    const g = await d.detectPlace(text);
    if (g && acceptPlace(g, userLat, userLng, { requireUserFix: false }).ok) { place = g; placeVia = 'detector'; }
  }
  if (!place && userLat === undefined) {
    await d.askLocation(inferred);
    return { kind: 'askedLocation' };
  }

  const plan = planNlSearch({ place, userLat, userLng });
  const filters = inferred.filters || {};
  const queries = buildNlQueries({ text, cuisineNames: d.cuisineNames(inferred.cuisines || []), merged: filters });
  let venues = await d.discover({
    lat: plan.lat, lng: plan.lng, radius: plan.radius, cuisines: queries,
    regionCode: d.regionCodeFor(loc, place),
  });
  venues = (Array.isArray(venues) ? venues : []).filter(d.passesVenueFilter);
  // Narrowed before the newness check so it pays for no Places call on a venue it would drop, and
  // again after, because applyNewness can add curated venues from anywhere in the 1.5 km plan
  // (v0.62.944). Scoping is idempotent.
  venues = scopeToPlace(venues, plan).venues;
  const newlyOpened = filters.newlyOpened === true;
  let noProvenNew = false;
  if (newlyOpened) ({ venues, noProvenNew } = await d.applyNewness(venues));
  venues = await d.applyRatingFloor(venues, { newlyOpened });
  const scoped = scopeToPlace(venues, plan);
  venues = scoped.venues;
  if (typeof d.log === 'function') {
    d.log(readingLine({
      route: 'Chat-Question', source: inferred.source, place: plan.placeAnchor?.name, placeVia, scope: plan.scope,
      newlyOpened, cuisines: inferred.cuisines, radius: plan.radius, count: venues.length,
    }));
  }
  await d.deliver({ venues, placeAnchor: plan.placeAnchor, plan, noProvenNew, inferred, placeEmpty: scoped.empty ? plan.placeAnchor?.name : null });
  return { kind: 'delivered', count: venues.length };
}

module.exports = {
  NEARBY_RADIUS_M,
  NL_DEFAULT_RADIUS_M,
  acceptPlace,
  planNlSearch,
  filterToAnchor,
  scopeToPlace,
  readingLine,
  buildNlQueries,
  isEmptyReading,
  answerQuestionWithTellGia,
};
