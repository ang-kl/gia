// dish-name.js — shared "is this a real dish/dessert name?" guard.
//
// The recommendation line that suggests what to order at a venue
// ("🍴 Try · …", "🍽️ Try …", "🧾 …", the Cuisine TMA "🍴 try the …")
// must only ever carry a genuine dish or dessert NAME — never a
// generic category word ("dishes", "desserts", "food", "mains",
// "meat") and never a captured sentence fragment ("desserts which").
//
// Before v0.60.209 several extraction paths (Michelin review-regex,
// cuisine-search review-regex, Gemini narration) each rolled their
// own partial denylist; "dish"/"dishes" slipped past every one and
// surfaced as "🧾 dishes" / "🍴 Try · dishes" on real cards. This
// module is the single source of truth, shared by every render and
// extraction site so the criteria stay identical across all five
// surfaces (Cuisine TMA, Copy, Copy to, /s, free-text).

// Whole-word category nouns that are NOT dish names. The regex is
// anchored ^…$ so real menu items that merely CONTAIN one of these
// words still pass ("Dessert Platter", "Combo Set", "Fish Head
// Curry") — only a bare category word on its own is rejected.
const CATEGORY_WORDS = [
  'restaurant', 'restaurants', 'place', 'places', 'food', 'foods',
  'dish', 'dishes', 'cuisine', 'cuisines', 'service', 'staff', 'menu',
  'menus', 'location', 'locations', 'owner', 'hostess', 'chef', 'chefs',
  'table', 'tables', 'seat', 'seats', 'seating', 'ambience', 'ambiance',
  'atmosphere', 'experience', 'experiences', 'vibe', 'time', 'times',
  'price', 'prices', 'night', 'lunch', 'dinner', 'breakfast', 'brunch',
  'meal', 'meals', 'course', 'courses', 'drink', 'drinks', 'beverage',
  'beverages', 'dessert', 'desserts', 'appetiser', 'appetisers',
  'appetizer', 'appetizers', 'starter', 'starters', 'main', 'mains',
  'side', 'sides', 'combo', 'combos', 'set', 'sets', 'special',
  'specials', 'deal', 'deals', 'recommendation', 'recommendations',
  'meat', 'meats', 'gravy', 'gravies', 'sauce', 'sauces', 'chocolate',
  'chocolates', 'bread', 'breads', 'wine', 'wines', 'cocktail',
  'cocktails', 'beer', 'beers', 'entree', 'entrees', 'portion',
  'portions', 'serving', 'servings', 'flavor', 'flavors', 'flavour',
  'flavours', 'taste', 'tastes', 'texture', 'textures', 'ingredient',
  'ingredients'
];
const CATEGORY_RE = new RegExp(`^(?:${CATEGORY_WORDS.join('|')})$`, 'i');

// A candidate whose LAST token is a connector / stop-word is a
// captured sentence fragment ("desserts which", "the chicken was"),
// not a dish name.
const TRAILING_STOPWORD_RE = /\b(which|that|was|were|is|are|had|has|have|from|for|with|of|in|on|at|by|to|but|and|or|than|then|so|too|very|really|just|also|still|even|though|when|while|where|here|there|the|a|an)$/i;

// True when `s` is a plausible dish / dessert NAME fit for a "Try"
// line. Length-bounded (3–40 chars), not a bare category word, not a
// trailing-stop-word fragment.
function isDishName(s) {
  if (typeof s !== 'string') return false;
  const t = s.trim();
  if (t.length < 3 || t.length > 40) return false;
  if (CATEGORY_RE.test(t)) return false;
  if (TRAILING_STOPWORD_RE.test(t)) return false;
  return true;
}

// Filter an array of candidate dish strings down to genuine names,
// preserving order. Non-arrays yield [].
function filterDishNames(arr) {
  return (Array.isArray(arr) ? arr : []).filter(isDishName);
}

module.exports = { isDishName, filterDishNames, CATEGORY_RE, CATEGORY_WORDS };
