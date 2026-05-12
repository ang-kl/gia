// cuisine-family.js — v0.60.135
//
// Coarse "cuisine family" buckets so a dish-search result list can tell
// apart "places that plausibly serve this" from "places that just
// text-matched your search words". Google Places returns, e.g., a
// chinese_restaurant ("Hua Jie Dumpling") for "Czech guláš with bread
// dumplings" because a review mentioned "dumpling" — that venue does
// NOT serve guláš, so it belongs below the divider and must NOT carry
// the "🍽️ Try <dish>" line.
//
// Two lookups:
//   • restaurantFamily(primaryType)  — Google Places `primaryType`
//     (snake_case, e.g. "german_restaurant") → family | null
//   • cuisineFamily(cuisineName)     — a catalogue / R.E.D cuisine
//     label (e.g. "European", "Japanese") → family | null
//
// and one decision:
//   • isLikelyMismatch(primaryType, cuisineName) → bool
//     true ONLY when BOTH families are known and they differ. Generic
//     types (restaurant / cafe / pizza_restaurant / bar / …) and broad
//     cuisine umbrellas (fusion / international / western / asian) have
//     no family → never a mismatch → kept "above the line" (the
//     conservative default; we only demote on a confident contradiction).

'use strict';

const FAMILIES = {
  EAST_ASIAN: 'east-asian',
  SE_ASIAN: 'southeast-asian',
  SOUTH_ASIAN: 'south-asian',
  EUROPEAN: 'european',
  MIDDLE_EASTERN: 'middle-eastern',
  LATIN: 'latin',
  AMERICAN: 'american',
  AFRICAN: 'african',
};

// Google Places (New) v1 cuisine-specific restaurant primaryTypes →
// family. Non-cuisine types (cafe, bar, bakery, pizza_restaurant,
// hamburger_restaurant, seafood_restaurant, fine_dining_restaurant, …)
// are deliberately absent — they map to no family.
const RESTAURANT_TYPE_FAMILY = {
  chinese_restaurant: FAMILIES.EAST_ASIAN,
  cantonese_restaurant: FAMILIES.EAST_ASIAN,
  japanese_restaurant: FAMILIES.EAST_ASIAN,
  ramen_restaurant: FAMILIES.EAST_ASIAN,
  sushi_restaurant: FAMILIES.EAST_ASIAN,
  korean_restaurant: FAMILIES.EAST_ASIAN,
  mongolian_restaurant: FAMILIES.EAST_ASIAN,
  thai_restaurant: FAMILIES.SE_ASIAN,
  vietnamese_restaurant: FAMILIES.SE_ASIAN,
  indonesian_restaurant: FAMILIES.SE_ASIAN,
  filipino_restaurant: FAMILIES.SE_ASIAN,
  indian_restaurant: FAMILIES.SOUTH_ASIAN,
  pakistani_restaurant: FAMILIES.SOUTH_ASIAN,
  french_restaurant: FAMILIES.EUROPEAN,
  italian_restaurant: FAMILIES.EUROPEAN,
  spanish_restaurant: FAMILIES.EUROPEAN,
  greek_restaurant: FAMILIES.EUROPEAN,
  german_restaurant: FAMILIES.EUROPEAN,
  portuguese_restaurant: FAMILIES.EUROPEAN,
  mediterranean_restaurant: FAMILIES.EUROPEAN,
  eastern_european_restaurant: FAMILIES.EUROPEAN,
  turkish_restaurant: FAMILIES.MIDDLE_EASTERN,
  lebanese_restaurant: FAMILIES.MIDDLE_EASTERN,
  middle_eastern_restaurant: FAMILIES.MIDDLE_EASTERN,
  afghani_restaurant: FAMILIES.MIDDLE_EASTERN,
  mexican_restaurant: FAMILIES.LATIN,
  brazilian_restaurant: FAMILIES.LATIN,
  latin_american_restaurant: FAMILIES.LATIN,
  american_restaurant: FAMILIES.AMERICAN,
  african_restaurant: FAMILIES.AFRICAN,
};

// Cuisine label / slug substrings → family. Order matters only in that
// the first substring hit wins; keep specific demonyms before broad
// umbrellas. A small set of umbrellas ("fusion", "western", "asian",
// "international", "modern", "contemporary", "continental", "halal")
// deliberately maps to nothing.
const CUISINE_FAMILY_RULES = [
  // East Asian
  [['chinese', 'cantonese', 'teochew', 'hokkien', 'hakka', 'sichuan', 'szechuan', 'hunan', 'shanghai', 'beijing', 'dongbei', 'yunnan', 'fujian', 'jiangsu', 'taiwan', 'hong kong', 'hongkong', 'japanese', 'japan', 'korean', 'korea', 'macanese'], FAMILIES.EAST_ASIAN],
  // South-East Asian
  [['thai', 'vietnam', 'indonesian', 'indonesia', 'filipino', 'philippine', 'malay', 'singaporean', 'singapore', 'peranakan', 'nyonya', 'burmese', 'burma', 'myanmar', 'cambodia', 'khmer', 'lao', 'laotian', 'bruneian'], FAMILIES.SE_ASIAN],
  // South Asian
  [['indian', 'india', 'south indian', 'north indian', 'punjabi', 'gujarati', 'bengali', 'kerala', 'tamil', 'pakistan', 'bangladesh', 'sri lankan', 'sri lanka', 'nepal', 'tibet', 'bhutan', 'maldiv'], FAMILIES.SOUTH_ASIAN],
  // Middle Eastern / Caucasus / North African
  [['turkish', 'turkey', 'lebanese', 'lebanon', 'middle eastern', 'middle-eastern', 'persian', 'iranian', 'iran', 'israeli', 'israel', 'syrian', 'syria', 'jordanian', 'egyptian', 'egypt', 'moroccan', 'morocco', 'tunisian', 'algerian', 'afghan', 'iraqi', 'palestinian', 'kurdish', 'arab', 'arabic', 'georgian', 'armenian', 'azerbaijan', 'yemen', 'emirati', 'saudi'], FAMILIES.MIDDLE_EASTERN],
  // Latin America / Caribbean
  [['mexican', 'mexico', 'brazil', 'argentin', 'peruvian', 'peru', 'colombian', 'chilean', 'cuban', 'venezuel', 'bolivian', 'ecuador', 'uruguay', 'paraguay', 'latin american', 'latin-american', 'latino', 'caribbean', 'jamaican', 'puerto rican', 'dominican', 'tex-mex', 'texmex'], FAMILIES.LATIN],
  // Sub-Saharan African
  [['african', 'ethiopian', 'eritrean', 'nigerian', 'ghanaian', 'senegalese', 'south african', 'kenyan', 'somali', 'tanzanian', 'ugandan', 'cameroonian', 'congolese'], FAMILIES.AFRICAN],
  // North America (kept last among "western" so e.g. "italian-american" → European wins above)
  [['american (new)', 'american (traditional)', 'cajun', 'creole', 'soul food', 'southern us', 'hawaiian', 'pacific northwest'], FAMILIES.AMERICAN],
  // Europe (broad — includes Slavic / Central / Nordic / British Isles)
  [['french', 'france', 'italian', 'italy', 'spanish', 'spain', 'portuguese', 'portugal', 'greek', 'greece', 'german', 'germany', 'austrian', 'austria', 'swiss', 'switzerland', 'belgian', 'dutch', 'netherlands', 'british', 'english', 'irish', 'scottish', 'welsh', 'scandinavian', 'nordic', 'swedish', 'danish', 'norwegian', 'finnish', 'icelandic', 'russian', 'russia', 'ukrainian', 'ukraine', 'polish', 'poland', 'czech', 'slovak', 'hungarian', 'hungary', 'romanian', 'bulgarian', 'croatian', 'serbian', 'bosnian', 'slovenian', 'baltic', 'lithuanian', 'latvian', 'estonian', 'european', 'eastern european', 'central european', 'mediterranean', 'balkan', 'slavic', 'bohemian', 'bavarian', 'sicilian', 'tuscan', 'catalan', 'basque', 'andalusian', 'maltese', 'cypriot'], FAMILIES.EUROPEAN],
  // American — last broad bucket (so "italian-american" / "chinese-american" resolve to the leading cuisine above)
  [['american', 'usa', 'united states', 'new american'], FAMILIES.AMERICAN],
];

const UMBRELLA_NO_FAMILY = new Set([
  'fusion', 'modern', 'contemporary', 'international', 'western', 'asian',
  'continental', 'halal', 'eclectic', 'global', 'pan-asian', 'pan asian',
]);

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[_\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Google Places `primaryType` (e.g. "german_restaurant") → family | null.
function restaurantFamily(primaryType) {
  if (!primaryType) return null;
  const key = String(primaryType).toLowerCase().trim();
  return RESTAURANT_TYPE_FAMILY[key] || null;
}

// A cuisine label / slug (e.g. "European", "east-asian", "Sichuanese")
// → family | null. Substring match on a normalised form.
function cuisineFamily(cuisineName) {
  const n = norm(cuisineName);
  if (!n) return null;
  if (UMBRELLA_NO_FAMILY.has(n)) return null;
  // direct family-token (e.g. someone already passed "east-asian")
  for (const fam of Object.values(FAMILIES)) {
    if (n === fam || n === fam.replace(/-/g, ' ')) return fam;
  }
  for (const [needles, fam] of CUISINE_FAMILY_RULES) {
    for (const needle of needles) {
      if (n === needle || n.includes(needle)) return fam;
    }
  }
  return null;
}

// true ONLY when both families are known and they differ — i.e. a
// confident "this venue's cuisine contradicts the dish's cuisine".
function isLikelyMismatch(primaryType, cuisineName) {
  const a = restaurantFamily(primaryType);
  if (!a) return false;
  const b = cuisineFamily(cuisineName);
  if (!b) return false;
  return a !== b;
}

// ── v0.60.136 — "does this venue plausibly serve the dish?" ──────────
// `isLikelyMismatch` only fires on a CONFIDENT cuisine-type contradiction,
// so it misses the common case where Google tags an obviously off-cuisine
// place with a generic `restaurant`/`food` primaryType — e.g. "Hua Jie
// Dumpling" / "Dumpling Darlings" surfaced for "Czech guláš with bread
// dumplings" (they matched the generic word "dumpling"). So below we
// use a POSITIVE-signal test on the venue *name*: a venue is "above the
// line" only if its name carries some evidence it serves the dish.

// generic food / prep / boilerplate words — a venue name matching ONE
// of these alone (because the search phrase contains it) is NOT evidence
// it serves the specific dish. Distinctive words ("czech", "guláš",
// "schnitzel", "laksa", "rendang", …) are everything else, ≥ 3 chars.
const GENERIC_DISH_WORDS = new Set([
  // generic food nouns
  'bread', 'dumpling', 'dumplings', 'rice', 'noodle', 'noodles', 'soup', 'stew',
  'salad', 'cake', 'cakes', 'pie', 'pies', 'tart', 'tarts', 'bun', 'buns', 'roll',
  'rolls', 'toast', 'sandwich', 'wrap', 'wraps', 'pasta', 'pizza', 'curry', 'porridge',
  'congee', 'egg', 'eggs', 'meat', 'fish', 'beef', 'pork', 'chicken', 'duck', 'lamb',
  'tofu', 'sauce', 'gravy', 'broth', 'stock', 'pancake', 'pancakes', 'waffle', 'waffles',
  // generic prep / method words
  'frying', 'fried', 'grilling', 'grilled', 'steaming', 'steamed', 'braising', 'braised',
  'baking', 'baked', 'roasting', 'roasted', 'stewing', 'simmering', 'simmered', 'cooking',
  'smoking', 'smoked', 'boiling', 'boiled', 'poaching', 'poached', 'sauteing', 'searing',
  'reduction', 'glazing', 'crusting', 'tempering', 'building', 'emulsifying', 'pounding',
  'tossing', 'wokking', 'crackling', 'softening', 'layering', 'curing', 'skewering',
  // search boilerplate
  'with', 'and', 'the', 'for', 'near', 'best', 'authentic', 'style', 'styled', 'dish',
  'food', 'restaurant', 'singapore', 'cuisine', 'eatery', 'place', 'house', 'kitchen',
  'cafe', 'bar', 'bistro', 'shop', 'stall', 'corner', 'traditional', 'classic', 'home',
  'cooked', 'fresh', 'real', 'original', 'famous', 'good', 'great', 'special',
]);

// demonym / regional words per family, derived from CUISINE_FAMILY_RULES
// (≥ 4 chars, dropping the "american (new)" parenthetical entries).
const FAMILY_DEMONYMS = (() => {
  const out = {};
  for (const fam of Object.values(FAMILIES)) out[fam] = [];
  for (const [needles, fam] of CUISINE_FAMILY_RULES) {
    for (const n of needles) {
      if (n.length >= 4 && !n.includes('(')) out[fam].push(n);
    }
  }
  return out;
})();

function familyDemonyms(family) {
  return FAMILY_DEMONYMS[family] || [];
}

// distinctive (non-generic) tokens from a dish phrase — normalised,
// ≥ 3 chars, not in GENERIC_DISH_WORDS.
function distinctiveDishWords(dishPhrase) {
  return norm(dishPhrase)
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC_DISH_WORDS.has(w));
}

// Does `venue` carry any positive signal that it plausibly serves the
// dish? Conservative: when the dish's cuisine has no known family (an
// umbrella like "Fusion"/null) we can't confidently demote anything, so
// returns true. Otherwise true iff the venue NAME contains the cuisine
// name, a distinctive dish word, or a demonym of the dish's cuisine
// family — OR the venue's Google primaryType is in that same family.
function venuePlausiblyServes(venue, { cuisineName, dishPhrase } = {}) {
  const fam = cuisineFamily(cuisineName);
  if (!fam) return true;                                  // umbrella / unknown dish cuisine → don't demote
  const name = norm(venue && venue.name);
  const cn = norm(cuisineName);
  if (cn && cn.length >= 4 && name.includes(cn)) return true;
  for (const w of distinctiveDishWords(dishPhrase || '')) { if (name.includes(w)) return true; }
  if (restaurantFamily(venue && venue.primaryType) === fam) return true;
  for (const d of familyDemonyms(fam)) { if (d.length >= 4 && name.includes(d)) return true; }
  return false;
}

module.exports = {
  FAMILIES,
  restaurantFamily,
  cuisineFamily,
  isLikelyMismatch,
  familyDemonyms,
  distinctiveDishWords,
  venuePlausiblyServes,
  _norm: norm,
  _GENERIC_DISH_WORDS: GENERIC_DISH_WORDS,
};
