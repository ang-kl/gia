// special-mode.js — v0.61.126
//
// Implements the exclusive "Fruits" + "Durian" search modes from
// scripts/Create_2_buttons.MD. When the Cuisine TMA has one of these
// modes ON, the chat free-text + `/api/cuisine/search` paths drop the
// normal cuisine / Michelin / dessert seeds and search only for
// fruit-related or durian-related sellers, then post-filter the Places
// results by mode-specific keyword signals (Latin + Malay + Chinese).
//
// Single source of truth for:
//   - SPECIAL_MODES: the canonical mode ids
//   - per-mode Places searchText seeds (used as `cuisines` overrides)
//   - per-mode keyword signals (used by `filterByMode` to drop
//     irrelevant matches the Places fuzzy-text returned)
//   - `buildSeeds(mode, opts)`: returns the cuisines array
//   - `filterByMode(venues, mode)`: returns the subset whose name /
//     types / address / editorial summary / reviews carry a strong
//     mode signal
//   - `isSpecialMode(mode)`: type guard

'use strict';

const SPECIAL_MODES = Object.freeze({
  FRUITS: 'fruits',
  DURIAN: 'durian'
});

const SPECIAL_MODE_VALUES = new Set(Object.values(SPECIAL_MODES));

function isSpecialMode(mode) {
  return typeof mode === 'string' && SPECIAL_MODE_VALUES.has(mode);
}

// Places searchText seeds — per mode. Multiple seeds let
// pipeline.discover fan out across complementary queries so a single
// narrow term doesn't miss the local market stalls / kopitiam-style
// juice corners / specialist durian shops. The trailing region word
// is appended at call time by the caller (default "Singapore"; the
// caller swaps to "Johor Bahru Malaysia" / "Putrajaya Malaysia" when
// the user is anchored across the Causeway).
const SEED_TEMPLATES = {
  [SPECIAL_MODES.FRUITS]: [
    'fruit shop',
    'fresh fruit stall',
    'fruit juice stall',
    'fresh fruit market',
    'fruit seller'
  ],
  [SPECIAL_MODES.DURIAN]: [
    'durian shop',
    'durian stall',
    'durian seller',
    'durian delivery',
    'durian specialist'
  ]
};

// Per-mode relevance keywords (lowercased). A venue is considered
// "relevant" when its name, primaryType, area/address, editorial
// summary, OR a review snippet contains at least one of these.
// Includes Malay + Chinese terms per spec.
const KEYWORDS = {
  [SPECIAL_MODES.FRUITS]: [
    // Latin / English
    'fruit', 'fruits', 'fresh fruit', 'fruit juice', 'fruit shop',
    'fruit stall', 'fruit market', 'fruit seller', 'juice', 'juices',
    'smoothie', 'smoothies', 'blended', 'cold-pressed', 'cold pressed',
    'mango', 'papaya', 'watermelon', 'guava', 'rambutan', 'lychee',
    'longan', 'mangosteen', 'starfruit', 'pineapple', 'banana',
    'coconut', 'jackfruit', 'pomelo',
    // Malay
    'buah', 'jus buah', 'buah-buahan', 'pasar buah',
    // Chinese
    '水果', '果汁', '鲜果', '鲜榨', '果园'
  ],
  [SPECIAL_MODES.DURIAN]: [
    // Latin / English
    'durian', 'durians', 'durian seller', 'durian stall', 'durian shop',
    'durian specialist', 'durian delivery', 'durian puree', 'durian puff',
    'durian mochi', 'durian pancake', 'durian crepe',
    // Specific varieties
    'mao shan wang', 'msw', 'd24', 'red prawn', 'black thorn',
    'xo durian', 'jin feng', 'sultan', 'kampung',
    // Chinese
    '榴莲', '榴梿', '猫山王', '红虾'
  ]
};

// Primary-type rejection list — these Google Places `primaryType`
// values are NEVER kept under a special mode, regardless of keyword
// hits in the review text. Catches the "fine_dining_restaurant whose
// review says 'we serve fresh fruit'" false positive that the spec
// explicitly forbids.
const REJECT_PRIMARY_TYPES = new Set([
  'fine_dining_restaurant', 'chinese_restaurant', 'italian_restaurant',
  'japanese_restaurant', 'french_restaurant', 'korean_restaurant',
  'indian_restaurant', 'thai_restaurant', 'mexican_restaurant',
  'pizza_restaurant', 'sushi_restaurant', 'ramen_restaurant',
  'steak_house', 'seafood_restaurant', 'bar', 'night_club',
  'hamburger_restaurant', 'meal_takeaway'  // takeaway-only is allowed for durian; carve-out below
]);

// Durian carve-out — `meal_takeaway` (the Places type for delivery-
// only sellers) IS legitimate for durian, and is the most common type
// for the small JB / SG specialist sellers. Don't reject it.
const REJECT_PRIMARY_TYPES_FRUITS = REJECT_PRIMARY_TYPES;
const REJECT_PRIMARY_TYPES_DURIAN = new Set(
  [...REJECT_PRIMARY_TYPES].filter((t) => t !== 'meal_takeaway')
);

function _rejectTypesFor(mode) {
  return mode === SPECIAL_MODES.DURIAN ? REJECT_PRIMARY_TYPES_DURIAN : REJECT_PRIMARY_TYPES_FRUITS;
}

// Build the cuisines array for pipeline.discover when a special mode
// is active. opts.regionSuffix lets the caller append " Johor Bahru
// Malaysia" / " Putrajaya Malaysia" / " Singapore" so Places searchText
// disambiguates correctly.
function buildSeeds(mode, opts = {}) {
  if (!isSpecialMode(mode)) return [];
  const tmpl = SEED_TEMPLATES[mode];
  const suffix = (opts && typeof opts.regionSuffix === 'string' && opts.regionSuffix.trim())
    ? ` ${opts.regionSuffix.trim()}`
    : ' Singapore';
  return tmpl.map((s) => `${s}${suffix}`);
}

function _haystack(v) {
  const reviewText = Array.isArray(v?.reviews)
    ? v.reviews.map((r) => String(r?.text || '')).join(' ')
    : '';
  return [
    v?.name || '',
    v?.area || '',
    v?.formattedAddress || '',
    v?.primaryType || '',
    v?.googleSummary?.overview || '',
    reviewText
  ].join(' ').toLowerCase();
}

// Per-spec relevance check. A venue passes when (a) its primaryType
// isn't in the reject list AND (b) at least one mode keyword is found
// in its haystack. The reject-list check is what guards against
// "Italian restaurant whose review mentions fresh fruit dessert" — the
// spec explicitly rejects those.
function isRelevant(venue, mode) {
  if (!venue || !isSpecialMode(mode)) return false;
  const pt = String(venue.primaryType || '').toLowerCase();
  if (pt && _rejectTypesFor(mode).has(pt)) return false;
  const kws = KEYWORDS[mode];
  const hay = _haystack(venue);
  for (const kw of kws) {
    if (kw && hay.includes(kw.toLowerCase())) return true;
  }
  return false;
}

// Public: filter a venue list down to the subset relevant for `mode`.
// Returns a NEW array; never mutates input. When mode is invalid /
// null, returns the input unchanged (lets callers pass through when
// no special mode is active).
function filterByMode(venues, mode) {
  if (!isSpecialMode(mode)) return Array.isArray(venues) ? venues.slice() : [];
  if (!Array.isArray(venues)) return [];
  return venues.filter((v) => isRelevant(v, mode));
}

module.exports = {
  SPECIAL_MODES,
  isSpecialMode,
  buildSeeds,
  filterByMode,
  isRelevant,
  // exposed for tests
  KEYWORDS,
  SEED_TEMPLATES,
  _rejectTypesFor
};
