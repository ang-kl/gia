// dessert-drink-keywords.js — v0.60.131
//
// A keyword layer so a free-text query that names a dessert or drink
// (e.g. "chiffon cake", "ondeh ondeh", "milo dinosaur", "kopi") is
// steered toward bakeries / cafés / dessert shops / kopitiams instead
// of dumping a generic "restaurants near you, by rating" list.
//
// Two ways a query matches:
//   1. it's in DESSERT_DRINK_TERMS (a curated, mostly-SG list — seeded
//      here; extend it from the backend free-text log over time), or
//   2. it ends with / contains a dessert-or-drink shape word
//      (…cake, …tart, …pie, …pudding, …waffle, …pancake, …latte,
//       bubble tea, ice cream, kueh, …).
//
// On a match `looksLikeDessertOrDrink(text)` returns
//   { term, kind: 'dessert' | 'drink', venueKeywords, primaryTypes }
// — `venueKeywords` are name-fragments that mark a venue as "the right
// kind of place" (above the relevance line); `primaryTypes` are the
// Google Places `primaryType` values that count the same way; both
// also seed a query hint (built by `dessertDrinkQuery`).

'use strict';

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Curated dessert / drink dish names (normalised on read) ──────────
const DESSERT_TERMS = [
  // bakes / cakes
  'chiffon cake', 'pandan chiffon cake', 'butter cake', 'swiss roll', 'kueh lapis', 'lapis sagu',
  'sponge cake', 'castella', 'pound cake', 'cheesecake', 'basque cheesecake', 'burnt cheesecake',
  'fruit cake', 'carrot cake', 'red velvet cake', 'tiramisu', 'opera cake', 'mille crepe', 'crepe cake',
  'lava cake', 'mooncake', 'snowskin mooncake', 'pineapple tart', 'egg tart', 'portuguese egg tart',
  'kaya cake', 'orh nee', 'or nee', 'pulut hitam', 'bubur cha cha', 'bubor cha cha',
  // nyonya / local kueh
  'kueh', 'kuih', 'ang ku kueh', 'ondeh ondeh', 'onde onde', 'kueh salat', 'kueh dadar', 'kueh tutu',
  'kueh ko swee', 'kueh bingka', 'kueh bahulu', 'kueh lopis', 'kueh bangkit', 'putu piring', 'putu mayam',
  'apom', 'apam balik', 'min jiang kueh', 'mee chiang kueh', 'tau sar piah', 'tutu kueh', 'soon kueh',
  // hot / cold local desserts
  'chendol', 'cendol', 'ice kacang', 'ais kacang', 'ice cream', 'ice cream sandwich', 'ice gem biscuit',
  'tau huay', 'tau hway', 'dou hua', 'beancurd', 'soya beancurd', 'tau suan', 'cheng tng', 'ching tng',
  'mango sago', 'mango pomelo sago', 'sago pudding', 'grass jelly', 'chin chow', 'longan red bean',
  'pulut tai tai', 'glutinous rice ball', 'tang yuan', 'muah chee', 'mochi', 'snow ice', 'bingsu',
  'kakigori', 'shaved ice', 'durian puff', 'durian crepe', 'durian mochi', 'durian cake',
  // western / café desserts
  'gelato', 'sorbet', 'sundae', 'affogato', 'creme brulee', 'panna cotta', 'churros', 'waffle', 'waffles',
  'pancake', 'pancakes', 'souffle pancake', 'crepe', 'crepes', 'donut', 'doughnut', 'croissant', 'cruffin',
  'cinnamon roll', 'bagel', 'scone', 'macaron', 'macaroon', 'eclair', 'profiterole', 'cannoli', 'baklava',
  'kaya toast', 'french toast', 'lava toast', 'thick toast', 'shibuya toast', 'honey toast',
  // bread / bakes brands of dish
  'pineapple bun', 'polo bun', 'mexican bun', 'roti boy', 'cream bun', 'red bean bun',
];

const DRINK_TERMS = [
  'kopi', 'kopi o', 'kopi c', 'kopi peng', 'kopi gao', 'teh', 'teh o', 'teh c', 'teh peng', 'teh tarik',
  'teh halia', 'teh si', 'milo', 'milo dinosaur', 'milo godzilla', 'milo peng', 'horlicks', 'bandung',
  'bubble tea', 'boba', 'milk tea', 'brown sugar milk tea', 'cheese tea', 'oolong tea', 'matcha latte',
  'matcha', 'hojicha latte', 'taro milk tea', 'thai milk tea', 'thai iced tea', 'yuan yang', 'yuenyeung',
  'soya milk', 'soybean milk', 'sugar cane juice', 'sugarcane juice', 'lime juice', 'calamansi juice',
  'barley', 'barley water', 'chrysanthemum tea', 'longan drink', 'lemon tea', 'iced lemon tea',
  'coffee', 'flat white', 'long black', 'cappuccino', 'latte', 'espresso', 'cold brew', 'iced latte',
  'mocha', 'americano', 'piccolo', 'cortado', 'affogato', 'hot chocolate', 'milkshake', 'smoothie',
  'frappe', 'frappuccino', 'iced coffee', 'kopi luwak', 'oat latte', 'dirty chai', 'chai latte',
  'fresh juice', 'fruit juice', 'avocado juice', 'mango juice', 'watermelon juice', 'lassi', 'mango lassi',
  'soda float', 'coke float', 'root beer float', 'ramune', 'kombucha', 'kombucha tea',
];

// suffix / fragment heuristics — caught even if the exact phrase isn't
// in the curated lists above. Order matters only for `kind` (dessert
// checked first for the cake/tart/… family, drink for the latte/…).
const DESSERT_SUFFIXES = [
  'cake', 'tart', 'pie', 'pudding', 'pastry', 'cookie', 'cookies', 'biscuit', 'biscuits',
  'waffle', 'waffles', 'pancake', 'pancakes', 'crepe', 'crepes', 'donut', 'doughnut', 'mochi',
  'gelato', 'sorbet', 'sundae', 'kueh', 'kuih', 'bingsu', 'macaron', 'macaroon', 'eclair',
];
const DESSERT_FRAGMENTS = ['ice cream', 'ice kacang', 'ais kacang', 'shaved ice', 'snow ice', 'kaya toast'];
const DRINK_SUFFIXES = ['latte', 'frappe', 'frappuccino', 'smoothie', 'milkshake', 'shake'];
const DRINK_FRAGMENTS = ['bubble tea', 'milk tea', 'iced tea', 'iced coffee', 'cold brew', 'fruit juice', 'sugar cane juice', 'soya milk', 'teh tarik'];

const DESSERT_SET = new Set(DESSERT_TERMS.map(norm).filter(Boolean));
const DRINK_SET = new Set(DRINK_TERMS.map(norm).filter(Boolean));

const DESSERT_VENUE_KEYWORDS = [
  'bakery', 'bakeshop', 'bake shop', 'patisserie', 'pâtisserie', 'confectionery', 'confiserie',
  'pastry', 'cake shop', 'cakery', 'dessert', 'desserts', 'dessert bar', 'dessert house', 'sweet',
  'kueh', 'kuih', 'nyonya kueh', 'tang shui', 'cheng tng', 'ice cream', 'ice-cream', 'gelato', 'gelateria',
  'creamery', 'soya', 'tau huay', 'beancurd', 'bean curd', 'waffle', 'crepe', 'cafe', 'café', 'kopitiam',
];
const DESSERT_PRIMARY_TYPES = [
  'bakery', 'cafe', 'dessert_shop', 'dessert_restaurant', 'ice_cream_shop', 'confectionery', 'donut_shop',
  'chocolate_shop', 'candy_store', 'tea_house', 'coffee_shop', 'food_court',
];
const DRINK_VENUE_KEYWORDS = [
  'cafe', 'café', 'coffee', 'coffee roaster', 'roastery', 'espresso', 'kopitiam', 'kopi', 'tea', 'teahouse',
  'tea house', 'bubble tea', 'boba', 'milk tea', 'juice bar', 'juice', 'beverage', 'drinks', 'smoothie',
];
const DRINK_PRIMARY_TYPES = [
  'cafe', 'coffee_shop', 'tea_house', 'bar', 'juice_shop', 'food_court', 'bakery',
];

function endsWithAny(words, suffixes) {
  if (!words.length) return false;
  return suffixes.includes(words[words.length - 1]);
}

// Look up a free-text query against the dessert/drink layer.
// Returns { term, kind, venueKeywords, primaryTypes } or null.
function looksLikeDessertOrDrink(text) {
  const q = norm(text);
  if (!q) return null;
  if (q.length > 48) return null;
  const words = q.split(' ');
  if (words.length > 6) return null;

  let kind = null;
  if (DESSERT_SET.has(q)) kind = 'dessert';
  else if (DRINK_SET.has(q)) kind = 'drink';
  else if (DESSERT_FRAGMENTS.some((f) => q.includes(f))) kind = 'dessert';
  else if (DRINK_FRAGMENTS.some((f) => q.includes(f))) kind = 'drink';
  else if (endsWithAny(words, DESSERT_SUFFIXES)) kind = 'dessert';
  else if (endsWithAny(words, DRINK_SUFFIXES)) kind = 'drink';
  if (!kind) return null;

  return kind === 'dessert'
    ? { term: text.trim(), kind, venueKeywords: DESSERT_VENUE_KEYWORDS, primaryTypes: DESSERT_PRIMARY_TYPES }
    : { term: text.trim(), kind, venueKeywords: DRINK_VENUE_KEYWORDS, primaryTypes: DRINK_PRIMARY_TYPES };
}

// Build the Places `searchText` query for a dessert/drink hit. When a
// cuisine label is also active (TMA chip), it's prepended so e.g.
// "Japanese" + "matcha cake" → "Japanese matcha cake bakery cafe
// Singapore"; bare → "<term> bakery cafe Singapore" (dessert) /
// "<term> cafe Singapore" (drink). Capped at 80 chars.
function dessertDrinkQuery(hit, cuisineLabel) {
  if (!hit) return null;
  const tail = hit.kind === 'dessert' ? 'bakery cafe Singapore' : 'cafe Singapore';
  const head = (typeof cuisineLabel === 'string' && cuisineLabel.trim()) ? `${cuisineLabel.trim()} ` : '';
  return `${head}${hit.term} ${tail}`.replace(/\s+/g, ' ').trim().slice(0, 80);
}

module.exports = {
  looksLikeDessertOrDrink,
  dessertDrinkQuery,
  DESSERT_DRINK_TERMS: new Set([...DESSERT_SET, ...DRINK_SET]),
  _norm: norm,
};
