// dish-search-gate.js — v0.62.x
//
// Relevance gate for a TAPPED-DISH search (operator item 10). Tapping a
// curated dish (e.g. a Georgian dish in Singapore) folds the dish into a
// Google Places text query; Places treats the location bias as a soft hint
// and, for a rare cuisine with ~no local matches, RELAXES it — returning a
// Georgian restaurant in Bangkok (986 km) plus unrelated nearby venues (a
// Chinese noodle shop, a generic grill). The old code only RANKED by dish
// evidence; it never FILTERED, so the noise was shown.
//
// This gate, given venues already tagged with `dishEvidence` ('name' |
// 'reviews' | null) and a per-venue `_distKm` (straight-line km from the
// search anchor), drops the two provable-noise classes and orders the rest
// evidence-first:
//
//   • FAR        — `_distKm` beyond the cap (kills the Bangkok class).
//   • OFF-CUISINE — no dish evidence AND the venue's Google `primaryType`
//                   is a DIFFERENT specific cuisine (chinese_restaurant for a
//                   Georgian search → the noodle shop), OR — when the searched
//                   cuisine has no Google type at all (e.g. Georgian) — a
//                   generic restaurant with no dish evidence (pure noise).
//
// Kept venues get a `dishTier`: name > reviews > cuisine > weak. When nothing
// survives the gate returns `empty:true` so the caller can show an HONEST
// "no verified spot serving {dish} near {city}" instead of padding with noise.
//
// Pure (no IO) → unit-testable. Conservative by design: it only drops what it
// can PROVE is off-cuisine, so legitimate generic venues for a known cuisine
// stay (as the lowest 'weak' tier) rather than over-emptying common searches.

'use strict';

// Google Places `primaryType` tokens, keyed by our cuisine slug. Only cuisines
// Google actually tags get an entry. Absent slugs (e.g. 'georgian') have no
// positive token — on-cuisine can't be confirmed, but a venue that declares
// some OTHER specific cuisine is still recognised as off-cuisine.
const CUISINE_PLACE_TYPES = {
  chinese: ['chinese_restaurant'], cantonese: ['chinese_restaurant'], teochew: ['chinese_restaurant'],
  hokkien: ['chinese_restaurant'], hainanese: ['chinese_restaurant'], sichuan: ['chinese_restaurant'],
  hunan: ['chinese_restaurant'], shanghainese: ['chinese_restaurant'],
  japanese: ['japanese_restaurant', 'sushi_restaurant', 'ramen_restaurant'],
  korean: ['korean_restaurant'], thai: ['thai_restaurant'], vietnamese: ['vietnamese_restaurant'],
  indian: ['indian_restaurant'], 'north-indian': ['indian_restaurant'], 'south-indian': ['indian_restaurant'],
  french: ['french_restaurant'], italian: ['italian_restaurant', 'pizza_restaurant'],
  mexican: ['mexican_restaurant'], spanish: ['spanish_restaurant'], greek: ['greek_restaurant'],
  turkish: ['turkish_restaurant'], lebanese: ['lebanese_restaurant', 'middle_eastern_restaurant'],
  'middle-eastern': ['middle_eastern_restaurant'], indonesian: ['indonesian_restaurant'],
  american: ['american_restaurant', 'hamburger_restaurant', 'steak_house'],
  brazilian: ['brazilian_restaurant'], afghani: ['afghani_restaurant'], seafood: ['seafood_restaurant'],
};

// Every specific cuisine token we know — for off-cuisine detection.
const ALL_CUISINE_TYPES = new Set(Object.values(CUISINE_PLACE_TYPES).flat());

// Restaurant primaryTypes that DON'T prove a cuisine (so they're never treated
// as "off-cuisine" on their own — only the absence of any cuisine signal).
const GENERIC_TYPES = new Set([
  'restaurant', 'fast_food_restaurant', 'cafe', 'bar', 'meal_takeaway',
  'meal_delivery', 'food_court', 'bakery', 'dessert_restaurant', 'buffet_restaurant',
  'brunch_restaurant', 'breakfast_restaurant', 'fine_dining_restaurant', 'diner', '',
]);

function _wantedTypes(cuisineSlugs) {
  const out = new Set();
  for (const s of cuisineSlugs || []) {
    const ts = CUISINE_PLACE_TYPES[String(s || '').toLowerCase()];
    if (ts) for (const t of ts) out.add(t);
  }
  return out;
}

function _primaryType(v) {
  return String((v && v.primaryType) || '').toLowerCase();
}

function _isGeneric(v) {
  return GENERIC_TYPES.has(_primaryType(v));
}

// True when the venue's primaryType is a specific cuisine that is NOT one of
// the wanted ones. An unknown specific type (not in our map) is NOT judged.
function _isOffCuisine(v, wanted) {
  const pt = _primaryType(v);
  if (!pt || GENERIC_TYPES.has(pt) || !ALL_CUISINE_TYPES.has(pt)) return false;
  return !wanted.has(pt);
}

function _isOnCuisine(v, wanted) {
  if (!wanted.size) return false;
  return wanted.has(_primaryType(v));
}

// gateDishVenues(venues, { cuisineSlugs, maxKm })
//   venues: [{ dishEvidence:'name'|'reviews'|null, primaryType?, _distKm? }]
//   → { kept:[…with .dishTier], droppedFar, droppedCuisine, empty }
function gateDishVenues(venues, { cuisineSlugs = [], maxKm = Infinity } = {}) {
  const list = Array.isArray(venues) ? venues : [];
  const searchingSpecific = (cuisineSlugs || []).some(
    (s) => s && String(s).toLowerCase() !== 'michelin'
  );
  const wanted = _wantedTypes(cuisineSlugs);
  const kept = [];
  let droppedFar = 0;
  let droppedCuisine = 0;
  for (const v of list) {
    if (!v) continue;
    if (Number.isFinite(v._distKm) && v._distKm > maxKm) { droppedFar++; continue; }
    const ev = v.dishEvidence;
    if (ev === 'name' || ev === 'reviews') { v.dishTier = ev; kept.push(v); continue; }
    // No dish-name / review evidence — gate on cuisine.
    if (searchingSpecific) {
      if (_isOffCuisine(v, wanted)) { droppedCuisine++; continue; }
      // Searched cuisine has NO Google type (e.g. Georgian) → a generic venue
      // carries zero positive cuisine signal, so it's pure noise → drop.
      if (wanted.size === 0 && _isGeneric(v)) { droppedCuisine++; continue; }
    }
    v.dishTier = _isOnCuisine(v, wanted) ? 'cuisine' : 'weak';
    kept.push(v);
  }
  const rankOf = (v) => ({ name: 0, reviews: 1, cuisine: 2, weak: 3 }[v.dishTier] ?? 3);
  kept.sort((a, b) => rankOf(a) - rankOf(b));
  return { kept, droppedFar, droppedCuisine, empty: kept.length === 0 };
}

module.exports = { gateDishVenues, CUISINE_PLACE_TYPES };
