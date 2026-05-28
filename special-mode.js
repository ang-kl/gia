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

// v0.61.141 — DURIAN_PASTRY added per operator request. The previous
// DURIAN mode mixed durian-fruit sellers and durian-pastry shops in a
// single bucket (the v0.61.126 keyword list included puff/mochi/
// pancake/crepe alongside the fruit terms). Splitting:
//   DURIAN          → durian-fruit only (pastry keywords moved to the
//                     new DURIAN_PASTRY bucket).
//   DURIAN_PASTRY   → durian puffs / mochi / pancakes / crepes / cakes.
// Slug 'durian-pastry' matches what cuisines-vault.js's slugify()
// produces for the new "Durian Pastry" cuisine entry, so the chip-tap
// → request payload → specialMode dispatch chain just works.
const SPECIAL_MODES = Object.freeze({
  FRUITS: 'fruits',
  DURIAN: 'durian',
  DURIAN_PASTRY: 'durian-pastry'
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
  ],
  // v0.61.141 — durian-pastry seeds. Targets bakery + dessert-shop
  // queries that surface durian puffs / mochi / pancakes / cakes,
  // not fruit sellers.
  [SPECIAL_MODES.DURIAN_PASTRY]: [
    'durian puff',
    'durian pastry',
    'durian mochi',
    'durian cake',
    'durian dessert bakery'
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
  // v0.61.225 — DURIAN keyword list expanded to the operator's full 41-
  // variety catalogue (was 8 aliases). Each "X or Y" alias is split into
  // both names so a Google review that uses either form surfaces the
  // venue. Lowercased; matched as substrings against `_haystack`.
  [SPECIAL_MODES.DURIAN]: [
    // Latin / English — fruit sellers + raw product
    'durian', 'durians', 'durian seller', 'durian stall', 'durian shop',
    'durian specialist', 'durian delivery', 'durian puree',
    // Variety catalogue (operator-supplied, v0.61.225). 41 entries —
    // every "X or Y" alias broken into both names. Lower-cased.
    'mao shan wang', 'musang king', 'msw', 'super msw', 'old tree msw',
    'black thorn', 'black thorn johor',
    'd24', 'sultan',
    'red prawn', 'udang merah',
    'golden phoenix', 'jin feng', 'd198', 'golden phoenix johor',
    'xo', 'xo durian',
    'd101', 'd168', '101 johor',
    'black pearl', 'green bamboo', 'tekka',
    'golden pillow', 'mon thong',
    'kasap', 'butter king',
    'd13', 'd1', 'd17', 'd88', 'd2', 'd22', 'd78', 'd144', 'd200',
    'ganghai', 's17',
    'hor lor', 'd163', 'hor lor penang',
    'd162',
    'd175', 'red flesh',
    'kampung durian', 'kampung',
    'tawa', 'mdur88',
    'd160', 'lohat',
    'kanyao', 'chanee',
    'jiang hai', 'lao tai po',
    'tupai king', 'squirrel king',
    // Chinese — fruit
    '榴莲', '榴梿', '猫山王', '红虾', '金凤'
  ],
  // v0.61.225 — DURIAN_PASTRY keyword list expanded to the operator's
  // full 41-dessert catalogue (was 12 entries). Mirrors the fruit-
  // catalogue split: each operator entry becomes a lower-cased keyword.
  [SPECIAL_MODES.DURIAN_PASTRY]: [
    // Pastry-specific (operator-supplied, v0.61.225). 41 entries.
    'durian mousse', 'durian puff', 'durian puffs', 'durian crepe',
    'durian crepes', 'durian ice cream', 'durian chendol', 'durian cake',
    'durian mochi', 'durian pengat', 'durian mooncake',
    'durian swiss roll', 'durian tart', 'durian pizza',
    'durian ice kacang', 'durian milkshake', 'durian smoothie',
    'durian coffee', 'durian macarons', 'durian kueh lapis',
    'durian waffles', 'durian strudel', 'durian souffle',
    'durian pudding', 'durian coconut shake', 'durian egg tart',
    'durian basque burnt cheesecake', 'durian choux pastry',
    'durian croissant', 'durian kaya toast', 'durian goreng',
    'fried durian', 'durian bingsoo', 'durian soft serve',
    'durian swiss roll ice cream', 'durian crème brûlée',
    'durian creme brulee', 'durian mille crepe', 'durian mille crepe cake',
    'durian snowy mooncake', 'durian milk tea', 'durian sago',
    'durian sticky rice', 'durian swiss tart', 'durian éclair',
    'durian eclair', 'durian pancake', 'durian frappuccino',
    'durian frappucci',
    // Generic pastry / bakery markers (v0.61.141 baseline)
    'durian pastry', 'durian pastries', 'durian roll', 'durian cream puff',
    // Variety aliases (review signal — pairs variety + pastry word)
    'mao shan wang', 'musang king', 'msw', 'd24', 'red prawn',
    'black thorn', 'golden phoenix', 'jin feng',
    // Chinese — pastry / cake variants + variety
    '榴莲泡芙', '榴莲蛋糕', '榴莲麻糬', '榴莲班戟',
    '猫山王', '金凤', '红虾'
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
// v0.61.141 — DURIAN_PASTRY uses the FRUITS reject list (no carve-out
// for meal_takeaway): pastry sellers are typically dine-in bakeries or
// `bakery` / `cafe` primaryType Places venues, not delivery-only
// specialists.
const REJECT_PRIMARY_TYPES_FRUITS = REJECT_PRIMARY_TYPES;
const REJECT_PRIMARY_TYPES_DURIAN = new Set(
  [...REJECT_PRIMARY_TYPES].filter((t) => t !== 'meal_takeaway')
);
const REJECT_PRIMARY_TYPES_DURIAN_PASTRY = REJECT_PRIMARY_TYPES;

function _rejectTypesFor(mode) {
  if (mode === SPECIAL_MODES.DURIAN) return REJECT_PRIMARY_TYPES_DURIAN;
  if (mode === SPECIAL_MODES.DURIAN_PASTRY) return REJECT_PRIMARY_TYPES_DURIAN_PASTRY;
  return REJECT_PRIMARY_TYPES_FRUITS;
}

// v0.61.141 — name-token reject patterns. Used to enforce the operator
// spec that DURIAN means "durian fruit only" — a venue whose name
// carries a pastry signal ("durian puff", "durian cake", …) is
// rejected from the DURIAN mode even though the bare word "durian"
// matches the keyword list. DURIAN_PASTRY has its own keyword + seed
// list; FRUITS doesn't share the durian / pastry vocabulary so its
// reject list is empty.
// v0.61.225 — DURIAN name-reject patterns extended to cover every
// pastry / dessert form in the operator's DURIAN_PASTRY catalogue, so a
// venue named e.g. "Durian Mousse Bar" or "Durian Bingsoo Cafe" cannot
// satisfy DURIAN-mode (fruit-only) on the basis of the bare "durian"
// keyword.
const NAME_REJECT_PATTERNS = {
  [SPECIAL_MODES.FRUITS]: [],
  [SPECIAL_MODES.DURIAN]: [
    // v0.61.141 baseline
    /\bpuff\b/i, /\bpuffs\b/i,
    /\bmochi\b/i,
    /\bpancake\b/i, /\bpancakes\b/i,
    /\bcrepe\b/i, /\bcrepes\b/i,
    /\bcake\b/i, /\bcakes\b/i,
    /\bpastry\b/i, /\bpastries\b/i,
    /\btart\b/i, /\btarts\b/i,
    /\bbakery\b/i, /\bbakeries\b/i,
    /\béclair\b/i, /\béclairs\b/i, /\beclair\b/i, /\beclairs\b/i,
    /\bcream puff\b/i,
    /\bdessert\b/i,
    // v0.61.225 — operator's DURIAN_PASTRY catalogue
    /\bmousse\b/i,
    /\bice cream\b/i, /\bsoft serve\b/i, /\bbingsoo\b/i, /\bbingsu\b/i,
    /\bchendol\b/i, /\bcendol\b/i, /\bice kacang\b/i, /\bpengat\b/i,
    /\bmooncake\b/i, /\bsnowy mooncake\b/i,
    /\bswiss roll\b/i, /\broll\b/i, /\bswiss tart\b/i,
    /\bpizza\b/i,
    /\bmilkshake\b/i, /\bsmoothie\b/i, /\bcoconut shake\b/i,
    /\bcoffee\b/i, /\bmilk tea\b/i, /\bfrappucci(no)?\b/i, /\bfrappuccino\b/i,
    /\bmacarons?\b/i, /\bkueh lapis\b/i,
    /\bwaffles?\b/i, /\bstrudel\b/i, /\bsouffl(é|e)\b/i, /\bpudding\b/i,
    /\begg tart\b/i, /\bbasque\b/i, /\bcheesecake\b/i,
    /\bchoux\b/i, /\bcroissant\b/i, /\bkaya toast\b/i,
    /\bgoreng\b/i, /\bfried durian\b/i,
    /\bcr(è|e)me br(û|u)l(é|e)e?\b/i,
    /\bmille crepe\b/i, /\bmille-crepe\b/i, /\bmille feuille\b/i,
    /\bsago\b/i, /\bsticky rice\b/i
  ],
  [SPECIAL_MODES.DURIAN_PASTRY]: []
};

function _rejectNamesFor(mode) {
  return NAME_REJECT_PATTERNS[mode] || [];
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
  // v0.61.141 — name-token reject (DURIAN only). A venue whose name
  // carries a pastry signal ("durian puff", "durian cake", …) is NOT
  // a fruit seller; the operator wants those routed to DURIAN_PASTRY
  // instead. The bare-name reject check fires BEFORE the keyword
  // loop so a venue like "Combat Durian Puff" doesn't slip in via
  // the broad "durian" keyword match.
  const nameLc = String(venue.name || '').toLowerCase();
  if (nameLc) {
    for (const re of _rejectNamesFor(mode)) {
      if (re.test(nameLc)) return false;
    }
  }
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
