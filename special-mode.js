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

// v0.61.377 — operator: the special modes were keyworded from a SG/MY
// lens (EN + Malay + simplified Chinese), so a durian/fruit venue named
// only in Japanese / Korean / Thai / traditional-Chinese script was
// dropped by the relevance filter when searching JP / KR / TH / TW. The
// CORE durian word is now defined ONCE here and reused by the keyword
// loop, the strict-name gate (_nameHasDurian) and the recency review
// counter, so a local-script durian venue passes all three.
//   ja: ドリアン   ko: 두리안   th: ทุเรียน   zh-trad (TW/HK): 榴槤 / 榴蓮
const DURIAN_CORE_TERMS = Object.freeze([
  'durian', 'durians',          // Latin (also Indonesian/Malay)
  '榴莲', '榴梿',                  // Chinese (simplified + variant)
  '榴槤', '榴蓮',                  // Chinese (traditional — Taiwan / Hong Kong)
  'ドリアン',                      // Japanese
  '두리안',                        // Korean
  'ทุเรียน'                        // Thai
]);

// Per-mode relevance keywords (lowercased). A venue is considered
// "relevant" when its name, primaryType, area/address, editorial
// summary, OR a review snippet contains at least one of these.
// Includes Malay + Chinese + (v0.61.377) JP/KR/TH/TW terms per spec.
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
    '水果', '果汁', '鲜果', '鲜榨', '果园',
    // v0.61.377 — Japanese / Korean / Thai "fruit"
    'フルーツ', '果物',             // ja: furūtsu / kudamono
    '과일',                         // ko: gwail
    'ผลไม้'                         // th: phonlamai
  ],
  // v0.61.229 — DURIAN now matches via:
  //   (a) primaryType ∈ ACCEPT_PRIMARY_TYPES_DURIAN (operator's positive
  //       list — see below), AND
  //   (b) the venue's name/area/address/review contains a CORE durian
  //       term (the word "durian" in any script, or one of the small set
  //       of stall-style modifiers).
  // The 41-variety catalogue moved OUT of KEYWORDS and into
  // DURIAN_VARIETY_TERMS (exported below) — those names are for
  // post-match review-snippet extraction (operator: "i gave you the
  // list of durian varieties … for extract google reviews"), NOT
  // primary inclusion. Old behaviour (v0.61.225) caused a French /
  // Italian restaurant whose review mentioned "Mao Shan Wang reduction"
  // to surface under DURIAN.
  // v0.61.377 — the core durian word across all supported locales
  // (EN / zh-simp / zh-trad / ja / ko / th). Single source of truth.
  [SPECIAL_MODES.DURIAN]: [...DURIAN_CORE_TERMS],
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
    '猫山王', '金凤', '红虾',
    // v0.61.377 — local-script CORE durian word (JP/KR/TH/TW). The
    // pastry/bakery accept-type already constrains "is it a dessert
    // shop"; this lets a durian-pastry venue named only in local
    // script (e.g. ドリアンケーキ / 두리안 케이크 / 榴槤泡芙) survive the
    // filter. Generic local "cake/pastry" words are deliberately NOT
    // added — they'd match non-durian desserts.
    '榴槤', '榴蓮', 'ドリアン', '두리안', 'ทุเรียน'
  ]
};

// v0.61.229 — POSITIVE primaryType accept lists per mode. Operator
// (28-05 '26): the v0.61.141 REJECT-list approach let too many
// non-durian-fruit venues through because anything outside the
// hard-coded reject set passed. Operator-supplied accept lists:
//
//   DURIAN (fruit):     fruit and vegetable shop / store, fruits
//                       wholesaler, wholesaler, produce market,
//                       grocery store, bakery, cafe (selling whole
//                       fruit), juice, dessert, fruit parlor.
//   DURIAN_PASTRY:      cafe, bakery, ice cream shop, dessert,
//                       fruit parlor, juice, hawker, wholesaler,
//                       produce market.
//
// When the venue's primaryType is set AND not in the mode's accept
// list, it's rejected before keyword matching. When primaryType is
// absent (Places didn't return one), accept-list is bypassed —
// rely on keyword match. `meal_takeaway` is kept for DURIAN
// (delivery-only specialists, v0.61.141 rationale).
// v0.61.235 — accept lists widened based on the operator-run
// scripts/durian-variance.js (28-05 '26). The fruit run logged
// primaryType frequencies across SG/JB/Putrajaya × 12 languages.
// Real durian sellers were being rejected because Places assigned
// them generic types like 'food' (JB:15, PUT:12 — venues like
// "99 Old Trees Durian", "Hey!Durian 榴莲说"), 'market' (JB:11),
// 'farm' (JB:5 — durian orchards), 'coffee_shop' / 'general_store'
// / 'farmers_market' / 'garden'. Adding them honestly broadens the
// keep-rate while the name-reject patterns + keyword loop continue
// to drop non-durian noise.
const ACCEPT_PRIMARY_TYPES_DURIAN = new Set([
  'fruit_and_vegetable_store', 'fruit_and_vegetable_shop',
  'grocery_store', 'supermarket',
  'produce_market', 'food_market',
  'wholesaler', 'wholesale_business', 'wholesale_supplier',
  'fruit_parlor', 'fresh_fruit_store',
  'bakery', 'cafe',
  'juice_shop', 'juice_bar',
  'dessert_shop',
  'meal_takeaway',  // v0.61.141 carve-out — small specialist sellers
  'meal_delivery',
  'store', 'food_store',
  // v0.61.235 additions (variance data)
  'food',           // very common — Places' generic food type
  'market', 'farmers_market',
  'farm', 'garden', // durian orchards (Thai สวน, Malay kebun)
  'coffee_shop',
  'general_store',
  // v0.61.262 — operator's 29-05 '26 variance run flagged 15 real
  // durian sellers classed as restaurant / asian_restaurant /
  // chinese_restaurant / diner (e.g. "皇后镇榴莲档 Durian Stall",
  // "Durian Power Food Stall", "Gerai Durian Kubur Cina"). These
  // types are accepted ONLY via the v0.61.257 STRICT_NAME gate so
  // they're required to have "durian" in the name — cuisine-
  // specific restaurants (italian/japanese/french/etc.) remain
  // OUT of the accept list so "Durian Pasta Bistro" still rejects.
  'restaurant', 'asian_restaurant', 'chinese_restaurant', 'diner'
]);

// v0.61.235 — same variance source. Durian PASTRY venues are widely
// classified as 'cake_shop' (SG:19, JB:12, PUT:13 — Emicakes,
// Temptations Cakes, Delcie's Desserts), 'pastry_shop' (SG:3, JB:5,
// PUT:8 — Bánh sầu riêng…), 'food' (SG:24!), 'dessert_restaurant'
// (JB:7, PUT:5), 'meal_delivery' (SG:6), 'snack_bar' (JB:2),
// 'grocery_store' (PUT:5). All four were rejected pre-fix.
const ACCEPT_PRIMARY_TYPES_DURIAN_PASTRY = new Set([
  'bakery', 'cafe',
  'ice_cream_shop',
  'dessert_shop',
  'food_court', 'hawker_centre', 'hawker',
  'fruit_parlor',
  'juice_shop', 'juice_bar',
  'wholesaler', 'wholesale_business',
  'produce_market', 'food_market',
  'restaurant',  // generic — caught by name reject if it's actually a non-pastry venue
  'store', 'food_store',
  // v0.61.235 additions (variance data)
  'cake_shop',       // SG:19 / JB:12 / PUT:13 — Emicakes etc.
  'pastry_shop',     // SG:3 / JB:5 / PUT:8
  'food',            // SG:24 generic
  'dessert_restaurant',
  'meal_delivery',
  'snack_bar',
  'grocery_store'
]);

// Fruits mode has no operator-supplied accept list, so it keeps the
// v0.61.126 / v0.61.141 REJECT-list approach (only the restaurant /
// bar set is dropped; everything else passes). Operator-requested
// accept lists are scoped to DURIAN + DURIAN_PASTRY where the bug
// reports came from.
const ACCEPT_PRIMARY_TYPES_FRUITS = null;
const REJECT_PRIMARY_TYPES_FRUITS = new Set([
  'fine_dining_restaurant', 'chinese_restaurant', 'italian_restaurant',
  'japanese_restaurant', 'french_restaurant', 'korean_restaurant',
  'indian_restaurant', 'thai_restaurant', 'mexican_restaurant',
  'pizza_restaurant', 'sushi_restaurant', 'ramen_restaurant',
  'steak_house', 'seafood_restaurant', 'bar', 'night_club',
  'hamburger_restaurant', 'meal_takeaway'  // fruits mode keeps the
                                           // takeaway reject (juice
                                           // stalls are dine-in/counter)
]);

function _acceptTypesFor(mode) {
  if (mode === SPECIAL_MODES.DURIAN) return ACCEPT_PRIMARY_TYPES_DURIAN;
  if (mode === SPECIAL_MODES.DURIAN_PASTRY) return ACCEPT_PRIMARY_TYPES_DURIAN_PASTRY;
  return ACCEPT_PRIMARY_TYPES_FRUITS;   // null → fall back to REJECT
}

function _rejectTypesFor(mode) {
  if (mode === SPECIAL_MODES.FRUITS) return REJECT_PRIMARY_TYPES_FRUITS;
  return null;
}

// v0.61.229 — durian VARIETY catalogue, exported separately from
// KEYWORDS so callers can extract "review mentions: Mao Shan Wang"
// snippets post-match without these names contributing to the
// inclusion filter. Operator-supplied 41 fruit varieties + every
// "X or Y" alias split into both names. Lower-cased.
const DURIAN_VARIETY_TERMS = Object.freeze([
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
  'd162', 'd175', 'red flesh',
  'kampung durian',
  'tawa', 'mdur88',
  'd160', 'lohat',
  'kanyao', 'chanee',
  'jiang hai', 'lao tai po',
  'tupai king', 'squirrel king',
  // Chinese
  '猫山王', '红虾', '金凤'
]);

// Find every variety mentioned in a venue's haystack. Used to render
// "Review mentions: Mao Shan Wang, D24" lines on the result card.
// Returns a deduplicated array of canonical variety names.
//
// Word-bounded match for Latin terms so "d2" doesn't accidentally
// match "d24" (and vice-versa). CJK terms are matched as substrings
// since regex word boundaries don't work the same way for ideographs.
function _isCjk(s) {
  return /[一-鿿぀-ヿ가-힯]/.test(String(s || ''));
}
function _escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function extractVarietyMentions(venue) {
  if (!venue) return [];
  const hay = _haystack(venue);
  if (!hay) return [];
  const found = new Set();
  for (const term of DURIAN_VARIETY_TERMS) {
    if (_isCjk(term)) {
      if (hay.includes(term)) found.add(term);
    } else {
      const re = new RegExp('\\b' + _escapeRe(term) + '\\b', 'i');
      if (re.test(hay)) found.add(term);
    }
  }
  return [...found];
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

// v0.61.257 — STRICT name-required types. Operator (29-05 '26): "<20%
// right for each results in singapore, johor bahru, Kuala Lumpur,
// Putrajaya" on Durian + Durian Pastry. Root cause investigation:
// v0.61.235 widened the accept lists to catch real durian sellers
// that Places mis-typed (food, market, farm, etc.), but the keyword
// match runs over the FULL haystack (including reviews +
// googleSummary). A generic cafe whose primaryType is 'food' and
// whose reviews mention "durian" ONCE passed the filter — pollution
// dominated. These broad types are now gated on "venue name must
// contain a durian keyword" (the v0.61.235 mistyped-venue argument
// only holds when the name itself signals durian — e.g. "99 Old
// Trees Durian", "Hey!Durian"). Canonical durian types
// (fruit_and_vegetable_store, produce_market, fruit_parlor, etc.)
// still pass via the standard haystack check below — they're
// dedicated durian-shaped businesses by type.
const STRICT_NAME_TYPES_DURIAN = new Set([
  'food', 'food_store', 'store', 'general_store',
  'market', 'farm', 'garden', 'farmers_market',
  'coffee_shop', 'grocery_store',
  'meal_takeaway', 'meal_delivery',
  'bakery', 'cafe',   // bakery/cafe also need "durian" in name —
                      // most bakeries don't specialise in durian
                      // (cake shops in DURIAN_PASTRY do).
  // v0.61.262 — restaurant family added to DURIAN accept above;
  // strict-name gate keeps them name-required so the Italian /
  // sushi / etc. reject patterns also still apply (those types
  // aren't in the accept list at all → rejected upstream).
  'restaurant', 'asian_restaurant', 'chinese_restaurant', 'diner'
]);
const STRICT_NAME_TYPES_DURIAN_PASTRY = new Set([
  'food', 'meal_delivery', 'snack_bar', 'grocery_store',
  'food_court', 'hawker_centre', 'hawker', 'restaurant',
  'store', 'food_store',
  'produce_market', 'food_market',
  'wholesaler', 'wholesale_business',
  'juice_shop', 'juice_bar',
  'fruit_parlor'
]);
function _strictNameTypesFor(mode) {
  if (mode === SPECIAL_MODES.DURIAN) return STRICT_NAME_TYPES_DURIAN;
  if (mode === SPECIAL_MODES.DURIAN_PASTRY) return STRICT_NAME_TYPES_DURIAN_PASTRY;
  return null;
}

// v0.61.257 — STRONG-signal haystack: name + area + formattedAddress
// + primaryType. Drops the v0.61.229 reviews + googleSummary fields
// from the keyword check. Reviews are noisy ("we tried their durian
// once" → false-positive accept); googleSummary is AI-generated and
// often mentions durian without the venue being durian-focused.
// Strong signals only.
function _strongHaystack(v) {
  return [
    v?.name || '',
    v?.area || '',
    v?.formattedAddress || '',
    v?.primaryType || ''
  ].join(' ').toLowerCase();
}

// Cheap "name contains durian" test — used by the v0.61.257 strict-
// name gate for broad accept types. Covers Latin + Chinese scripts;
// extend later if Korean/Japanese transliterations need first-class
// support.
function _nameHasDurian(venue) {
  const n = String(venue?.name || '').toLowerCase();
  // v0.61.377 — all supported locales (EN/zh/ja/ko/th), shared with the
  // keyword loop + recency counter via DURIAN_CORE_TERMS.
  return DURIAN_CORE_TERMS.some((t) => n.includes(t.toLowerCase()));
}

// v0.61.377 — single regex of the core durian word across locales, used
// by the recency review counter. Built from DURIAN_CORE_TERMS so the
// three durian-detection sites can never drift apart.
const DURIAN_CORE_RE = new RegExp(DURIAN_CORE_TERMS.map((t) => t.toLowerCase()).join('|'), 'g');

// v0.61.262 — recency-filtered review signal. Operator (29-05 '26):
// *"did you accurately check reviews (last 24 months) as durian are
// seasonal."* Counts "durian" / 榴莲 / 榴梿 mentions across reviews
// whose `publishTime` falls within the last 24 months. Reviews
// without a publishTime are ignored (defensive — Places usually
// includes it). Returns the total mention count across all qualifying
// reviews; the relevance check uses a >= 2 threshold so a single
// stale-feeling mention doesn't promote a non-durian venue.
const REVIEW_RECENCY_MS = 24 * 30 * 24 * 60 * 60 * 1000;
function _countRecentDurianMentions(venue) {
  const reviews = Array.isArray(venue?.reviews) ? venue.reviews : [];
  if (!reviews.length) return 0;
  const now = Date.now();
  let count = 0;
  for (const r of reviews) {
    if (!r) continue;
    const pubMs = r.publishTime ? Date.parse(r.publishTime) : NaN;
    if (!Number.isFinite(pubMs)) continue;
    if (now - pubMs > REVIEW_RECENCY_MS) continue;
    const text = String(r.text || '').toLowerCase();
    // v0.61.377 — match the core durian word in any supported locale
    // (String.match with a /g regex returns all hits; it doesn't use
    // lastIndex, so reusing DURIAN_CORE_RE here is safe).
    const matches = text.match(DURIAN_CORE_RE);
    if (matches) count += matches.length;
  }
  return count;
}

// v0.61.262 — CANONICAL durian primary types (a strict subset of
// ACCEPT_PRIMARY_TYPES_DURIAN). These are the types where a venue
// is clearly durian-shaped by business category, so a recent-reviews
// signal alone is enough to keep them even when the name doesn't
// explicitly say "durian". Restaurants / cafes / coffee shops are
// NOT canonical here — they need the name-override path instead.
const CANONICAL_TYPES_DURIAN_FOR_REVIEWS = new Set([
  'fruit_and_vegetable_store', 'fruit_and_vegetable_shop',
  'produce_market', 'food_market', 'farmers_market',
  'fruit_parlor', 'fresh_fruit_store',
  'wholesaler', 'wholesale_business', 'wholesale_supplier',
  'food_store'
]);
const CANONICAL_TYPES_DURIAN_PASTRY_FOR_REVIEWS = new Set([
  'bakery', 'cake_shop', 'pastry_shop',
  'dessert_shop', 'dessert_restaurant',
  'ice_cream_shop'
]);
function _canonicalForReviews(mode) {
  if (mode === SPECIAL_MODES.DURIAN) return CANONICAL_TYPES_DURIAN_FOR_REVIEWS;
  if (mode === SPECIAL_MODES.DURIAN_PASTRY) return CANONICAL_TYPES_DURIAN_PASTRY_FOR_REVIEWS;
  return null;
}

// Build the cuisines array for pipeline.discover when a special mode
// is active. opts.regionSuffix lets the caller append " Johor Bahru
// Malaysia" / " Putrajaya Malaysia" / " Singapore" so Places searchText
// disambiguates correctly.
// v0.61.271 — Phase 3 fix (audit ledger item C3): pre-v0.61.271 the
// suffix DEFAULTED to ' Singapore' when callers passed nothing, so
// every durian/durian-pastry/fruits search outside SG silently
// appended ' Singapore' to the query — masquerading as a hidden
// geofence leak. The default is now '' (no suffix); country bias
// MUST come from the Places API's `regionCode` + `includedRegionCodes`
// parameters, which the v0.61.267 pipeline already plumbs. Callers
// that explicitly want a textual suffix (e.g. " Johor Bahru Malaysia"
// for very specific Places disambiguation) keep doing so.
function buildSeeds(mode, opts = {}) {
  if (!isSpecialMode(mode)) return [];
  const tmpl = SEED_TEMPLATES[mode];
  const raw = (opts && typeof opts.regionSuffix === 'string') ? opts.regionSuffix.trim() : '';
  const suffix = raw ? ` ${raw}` : '';
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
  const nameLc = String(venue.name || '').toLowerCase();

  // v0.61.229 — POSITIVE primaryType accept-list (DURIAN /
  // DURIAN_PASTRY) OR negative REJECT list (FRUITS). When a venue
  // has a primaryType AND the mode has an accept list AND the type
  // is not in it → reject. When the mode has a reject list AND the
  // type is in it → reject. When primaryType is absent (Places
  // returned no type), fall through to name / keyword matching.
  if (pt) {
    const accepts = _acceptTypesFor(mode);
    if (accepts && accepts.size > 0) {
      if (!accepts.has(pt)) return false;
    } else {
      const rejects = _rejectTypesFor(mode);
      if (rejects && rejects.has(pt)) return false;
    }
  }
  // v0.61.141 — name-token reject (DURIAN only). A venue whose name
  // carries a pastry signal ("durian puff", "durian cake", …) is NOT
  // a fruit seller; the operator wants those routed to DURIAN_PASTRY
  // instead. The bare-name reject check fires BEFORE the keyword
  // loop so a venue like "Combat Durian Puff" doesn't slip in via
  // the broad "durian" keyword match.
  if (nameLc) {
    for (const re of _rejectNamesFor(mode)) {
      if (re.test(nameLc)) return false;
    }
  }
  // v0.61.262 — RECENCY-FILTERED REVIEW signal (operator: "did you
  // accurately check reviews (last 24 months) as durian are
  // seasonal"). When the venue is on a CANONICAL durian-shaped type
  // for the mode (fruit_and_vegetable_store, produce_market,
  // food_store, etc. for DURIAN; bakery, cake_shop, pastry_shop,
  // etc. for DURIAN_PASTRY) AND its reviews from the last 24 months
  // mention durian ≥ 2 times, accept — this catches real durian
  // shops whose name is a variety only (e.g. "Mao Shan Wang Stall")
  // without re-introducing the v0.61.229 review-noise loophole on
  // broad types like cafe / coffee_shop / restaurant. Threshold 2
  // because a single review mention is the noise mode; two
  // independent reviewers separately calling out durian is much
  // stronger evidence. Runs BEFORE the v0.61.257 strict-name gate
  // because some canonical types (food_store) are ALSO in the
  // strict-name set — the recency signal needs first crack at
  // them.
  const canonicalForReviews = _canonicalForReviews(mode);
  if (pt && canonicalForReviews && canonicalForReviews.has(pt)) {
    const recent = _countRecentDurianMentions(venue);
    if (recent >= 2) return true;
  }
  // v0.61.257 — STRICT name-required gate for broad accept types.
  // When the venue's primaryType is one of the v0.61.235 generic
  // additions (food, market, farm, coffee_shop, grocery_store, …),
  // require the venue NAME to contain a durian keyword. Stops
  // generic cafes / supermarkets with a single review mention from
  // polluting the result list.
  const strictNameTypes = _strictNameTypesFor(mode);
  if (pt && strictNameTypes && strictNameTypes.has(pt)) {
    if (!_nameHasDurian(venue)) return false;
  }
  // v0.61.257 — DURIAN + DURIAN_PASTRY keyword check restricted to
  // STRONG signals only (name + area + formattedAddress +
  // primaryType). The v0.61.229 full haystack with reviews +
  // googleSummary was the major false-positive vector — operator
  // measured <20% accuracy across SG / JB / KL / Putrajaya. Reviews
  // / AI summaries can mention durian once without the venue being
  // durian-focused. FRUITS mode still uses the full haystack (the
  // test suite pins matches in googleSummary.overview '果汁' and
  // review text 'fresh fruit juice'; durian's keyword set is
  // tighter so the same loophole doesn't apply).
  const kws = KEYWORDS[mode];
  const useStrong = (mode === SPECIAL_MODES.DURIAN || mode === SPECIAL_MODES.DURIAN_PASTRY);
  const hay = useStrong ? _strongHaystack(venue) : _haystack(venue);
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
  // v0.61.229 — variety / accept-list exports for review-snippet
  // extraction (UI side) and tests.
  DURIAN_VARIETY_TERMS,
  extractVarietyMentions,
  ACCEPT_PRIMARY_TYPES_DURIAN,
  ACCEPT_PRIMARY_TYPES_DURIAN_PASTRY,
  ACCEPT_PRIMARY_TYPES_FRUITS,
  REJECT_PRIMARY_TYPES_FRUITS,
  // exposed for tests
  KEYWORDS,
  SEED_TEMPLATES,
  _acceptTypesFor,
  _rejectTypesFor
};
