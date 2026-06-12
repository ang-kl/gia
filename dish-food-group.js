// dish-food-group.js — v0.62.x
//
// Phase 1 of the cuisine "What to order" Arrival-Plate: organise a cuisine's
// NATION_OVERLAY iconicDishes (names only) into food groups so a 30-dish
// cuisine (Japanese, Singaporean = 164) doesn't jam-pack the card. The card
// shows the first 3 dishes (the curated headliners) then the rest bucketed
// into food-group sections, the sections ordered ASCENDING by size (operator:
// "rare ones show first 3 then group in ascending").
//
// Classification is display-only and low-stakes (a dumpling is a dumpling), so
// it's a curated keyword classifier with explicit per-dish OVERRIDES where the
// keywords mis-bucket; anything unmatched falls into 'other' ("More"). Drinks
// are read straight off NATION_OVERLAY's `kind: 'drink'` flag — no guessing.
//
// Pure (no IO) → unit-testable; consumed by index.js when it builds the
// cuisine plate, and mirrored nowhere else (the client receives the grouped
// structure ready to render).

'use strict';

// Section order is by ascending dish-count at render time; this map only
// supplies the human label (en/fr) + a stable tie-break order for equal sizes.
const GROUP_ORDER = [
  'noodles', 'rice', 'bread-dumpling', 'soup', 'grilled', 'stew-curry',
  'seafood', 'veg', 'snack', 'sweet', 'drink', 'other',
];
const GROUP_LABEL = {
  'noodles':        { en: 'Noodles',              fr: 'Nouilles' },
  'rice':           { en: 'Rice & grains',        fr: 'Riz & céréales' },
  'bread-dumpling': { en: 'Bread & dumplings',    fr: 'Pains & raviolis' },
  'soup':           { en: 'Soups',                fr: 'Soupes' },
  'grilled':        { en: 'Grilled & BBQ',        fr: 'Grillades & BBQ' },
  'stew-curry':     { en: 'Stews & curries',      fr: 'Mijotés & curries' },
  'seafood':        { en: 'Seafood',              fr: 'Fruits de mer' },
  'veg':            { en: 'Vegetable & salad',    fr: 'Légumes & salades' },
  'snack':          { en: 'Snacks & street bites', fr: 'En-cas & street food' },
  'sweet':          { en: 'Sweets & desserts',    fr: 'Sucreries & desserts' },
  'drink':          { en: 'Drinks',               fr: 'Boissons' },
  'other':          { en: 'More',                 fr: 'Autres' },
};

// Explicit per-dish overrides (lowercased exact dish name → group). Used where
// the keyword rules below would mis-bucket a proof-set dish. Kept small and
// curated — extend as cuisines are verified.
const OVERRIDES = {
  // Georgian
  'khachapuri adjaruli': 'bread-dumpling', 'imeretian khachapuri': 'bread-dumpling',
  'tonis puri': 'bread-dumpling', 'mchadi': 'bread-dumpling', 'elarji': 'rice',
  'khinkali': 'bread-dumpling', 'khinkali kalakuri': 'bread-dumpling',
  'satsivi': 'stew-curry', 'chakhokhbili': 'stew-curry', 'chakapuli': 'stew-curry', 'ostri': 'stew-curry',
  'lobio': 'veg', 'phali': 'veg', 'walnut-paste pkhali': 'veg', 'badrijani nigvzit': 'veg', 'gebzhalia': 'veg',
  'mtsvadi': 'grilled', 'kuchmachi': 'grilled',
  'churchkhela': 'sweet', 'ajika': 'other',
  // Japanese
  'sushi': 'seafood', 'sashimi': 'seafood', 'omakase': 'seafood', 'chirashi don': 'seafood', 'unagi don': 'seafood',
  'takoyaki': 'snack', 'okonomiyaki': 'snack', 'onigiri': 'rice', 'mochi': 'sweet', 'matcha': 'drink',
  'gyoza': 'bread-dumpling', 'yakitori': 'grilled', 'yakiniku': 'grilled', 'tempura': 'snack',
  'shabu shabu': 'soup', 'sukiyaki': 'soup',
  // Singaporean / Malaysian common misfits
  'yam ring': 'veg', 'yong tau foo': 'veg', 'sambal kangkong': 'veg', 'tahu goreng': 'veg', 'nasi ulam': 'veg',
  'ngoh hiang': 'snack', 'ngoh hiang platter': 'snack', 'begedil': 'snack', 'cucur udang': 'snack',
  'goreng pisang': 'snack', 'lobak': 'snack', 'epok-epok': 'snack', 'vadai (sg hawker)': 'snack',
  'kong bak pau': 'bread-dumpling', 'kueh pie tee': 'snack', 'roti john': 'bread-dumpling',
  'roti john malaysian': 'bread-dumpling', 'youtiao sg breakfast': 'bread-dumpling',
  'bak kut teh klang': 'soup', 'sup kambing': 'soup', 'mutton soup (sup tulang)': 'soup',
  'rendang': 'stew-curry', 'beef rendang sg': 'stew-curry', 'patin tempoyak': 'stew-curry',
  'ayam buah keluak': 'stew-curry', 'babi pongteh': 'stew-curry', 'assam pedas': 'stew-curry',
  'ayam masak merah': 'stew-curry', 'kaya': 'other', 'kaya toast': 'sweet',
};

// Ordered keyword rules — FIRST match wins. Each is [regex, group]. Tuned so
// the proof-set cuisines (georgian / japanese / singaporean / malaysian) bucket
// sensibly; tightened with word edges where a substring would over-match.
const RULES = [
  [/\b(cendol|ais ?kacang|ice kacang|chendol|bobo cha|cheng tng|tau huay|douhua|orh nee|pengat|tart|pudding|tang yuan|mua chee|red bean|gula melaka|churchkhela|mochi|dessert|kueh dadar|kueh salat|kuih|love letters|ang ku|apam|apom)\b/, 'sweet'],
  [/\b(kopi|teh|milo|horlicks|bandung|juice|tea|water|sake|matcha|shake|soda|drink|chin chow|yuan yang|100 plus|sugarcane|coconut water)\b/, 'drink'],
  [/\b(noodle|noodles|mee|ramen|udon|soba|laksa|kway teow|hor fun|hor-fun|pho|mein|men|bee hoon|mee pok|mee suah|mee tai mak|tsukemen|lor mee|wanton mee|wantan mee|fishball noodle|kway chap)\b/, 'noodles'],
  [/\b(roti|bread|naan|bao|pau|dumpling|gyoza|khinkali|khachapuri|prata|puff|mantou|idli|thosai|dosai|putu mayam|toast|pie tee|youtiao)\b/, 'bread-dumpling'],
  [/\b(soup|broth|sup\b|tim\b|tom yum|bee hoon soup)\b/, 'soup'],
  [/\b(yakitori|yakiniku|satay|sate|grill|grilled|bakar|bbq|roast|char siu|siu yuk|siu mei|tandoori|penyet|mtsvadi|kebab|skewer)\b/, 'grilled'],
  [/\b(curry|rendang|satsivi|ostri|chakhokhbili|chakapuli|masak|braised|gulai|pongteh|keluak|tempoyak|assam pedas|pedas|kari)\b/, 'stew-curry'],
  [/\b(crab|prawn|prawns|fish|sotong|squid|stingray|oyster|unagi|sashimi|sushi|chirashi|pomfret|ikan|fish skin|fish head|fish maw|seafood)\b/, 'seafood'],
  [/\b(salad|kangkong|vegetable|veggie|tahu|tofu|lobio|phali|pkhali|yong tau foo|ulam|kerabu|sayur)\b/, 'veg'],
  [/\b(rice|nasi|biryani|congee|porridge|claypot|don\b|donburi|risotto|onigiri|lontong|png kueh|fried rice|chirashi|katsudon|gyudon|oyakodon)\b/, 'rice'],
  [/\b(takoyaki|okonomiyaki|vadai|ngoh hiang|begedil|cucur|goreng pisang|lobak|epok|fritter|cake|bak kwa|spring roll|popiah)\b/, 'snack'],
];

// Classify one dish into a food group. `kind` from NATION_OVERLAY ('food' |
// 'drink') short-circuits drinks. Returns a GROUP_ORDER slug ('other' default).
function foodGroupFor(name, kind) {
  if (kind === 'drink') return 'drink';
  const n = String(name || '').toLowerCase().trim();
  if (!n) return 'other';
  if (OVERRIDES[n]) return OVERRIDES[n];
  for (const [re, group] of RULES) {
    if (re.test(n)) return group;
  }
  return 'other';
}

// v0.62.x Phase 2 — carry the curated depth (native-script `local` + one-line
// `note` history) onto each rendered dish so the plate can show native names and
// the per-dish 📜 fact card. Names-only dishes (the majority) just get `{ dish }`.
function slimDish(d) {
  const o = { dish: d.name };
  if (d.local) o.local = d.local;
  if (d.note && (d.note.en || d.note.fr)) o.note = d.note;
  return o;
}

// Build the grouped structure the cuisine plate renders. Input: the cuisine's
// iconicDishes ([{ name, kind, local?, note? }]). Output:
//   { headliners: [{ dish, local?, note? }],  // first `headCount` (default 3)
//     groups: [{ group, label:{en,fr}, dishes:[{ dish, local?, note? }] }] }
// Headliner dishes are EXCLUDED from the groups (shown once, at the top).
function groupCuisineDishes(iconicDishes, headCount = 3) {
  const dishes = Array.isArray(iconicDishes) ? iconicDishes.filter((d) => d && d.name) : [];
  const headliners = dishes.slice(0, headCount).map(slimDish);
  const rest = dishes.slice(headCount);
  const buckets = new Map();
  for (const d of rest) {
    const g = foodGroupFor(d.name, d.kind);
    if (!buckets.has(g)) buckets.set(g, []);
    buckets.get(g).push(slimDish(d));
  }
  const groups = [...buckets.entries()].map(([group, ds]) => ({
    group,
    label: GROUP_LABEL[group] || GROUP_LABEL.other,
    dishes: ds,
  }));
  // Ascending by size; 'other' always last; stable tie-break by GROUP_ORDER.
  groups.sort((a, b) => {
    if (a.group === 'other') return 1;
    if (b.group === 'other') return -1;
    if (a.dishes.length !== b.dishes.length) return a.dishes.length - b.dishes.length;
    return GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group);
  });
  return { headliners, groups };
}

module.exports = { foodGroupFor, groupCuisineDishes, GROUP_ORDER, GROUP_LABEL };
