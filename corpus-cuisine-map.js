// corpus-cuisine-map.js — v0.62.8
//
// Maps a Foursquare OS Places category label → our cuisine slug(s)
// (the 69 slugs in cuisines-vault.js). FSQ labels are hierarchical paths,
// e.g. "Dining and Drinking > Restaurant > Asian Restaurant > Japanese
// Restaurant". The corpus harvester (scripts/build-cuisine-corpus.py)
// stores the LEAF segments per venue (e.g. ["Japanese Restaurant"]); this
// module is the single source of truth that turns those into slugs at
// corpus-load time, so the mapping lives in ONE place (Node), not also in
// Python.
//
// Matching: token → slug. A token matches when it appears as a whole word
// in the (lowercased) label. Longer/more-specific tokens are checked first
// so "north indian" wins over "indian". A venue may map to several slugs
// (e.g. "Dim Sum" → cantonese AND the parent "Chinese" → chinese); the
// caller dedups. Unmapped labels (Noodle, Seafood, Vegetarian, generic
// "Restaurant") return [] — the venue still lives in the corpus for the
// no-cuisine "nearby" browse, it just won't match a cuisine-specific filter.

'use strict';

// token (lowercased, word-matched in the FSQ label) → our cuisine slug.
// Ordered conceptually specific→general; the matcher sorts by token length
// desc so multi-word tokens win. Only slugs that exist in cuisines-vault.
const TOKEN_TO_SLUG = Object.freeze({
  // — Japanese —
  'japanese': 'japanese', 'sushi': 'japanese', 'ramen': 'japanese',
  'izakaya': 'japanese', 'yakitori': 'japanese', 'udon': 'japanese',
  'soba': 'japanese', 'tempura': 'japanese', 'donburi': 'japanese',
  'teppanyaki': 'japanese', 'okonomiyaki': 'japanese', 'unagi': 'japanese',
  'tonkatsu': 'japanese', 'shabu': 'japanese',
  // — Korean —
  'korean': 'korean',
  // — Thai —
  'thai': 'thai', 'som tum': 'thai', 'tom yum': 'thai', 'isan': 'thai',
  'isaan': 'thai',
  // — Chinese + regionals —
  'chinese': 'chinese', 'dim sum': 'cantonese', 'cantonese': 'cantonese',
  'sichuan': 'sichuan', 'szechuan': 'sichuan', 'hunan': 'hunan',
  'shanghai': 'shanghainese', 'shanghainese': 'shanghainese',
  'hong kong': 'hong-kong', 'macau': 'macau', 'macanese': 'macau',
  'hakka': 'hakka', 'teochew': 'teochew', 'hokkien': 'hokkien',
  'hainanese': 'hainanese', 'taiwanese': 'taiwanese',
  // (Hot Pot / Dumpling / Noodle are pan-Chinese-or-Thai → left generic)
  'hot pot': 'chinese', 'dumpling': 'chinese',
  // — SE-Asia —
  'vietnamese': 'vietnamese', 'pho': 'vietnamese',
  'indonesian': 'indonesian', 'malaysian': 'malaysian', 'malay': 'malaysian',
  'singaporean': 'singaporean', 'peranakan': 'peranakan', 'nyonya': 'peranakan',
  'filipino': 'filipino', 'burmese': 'burmese', 'eurasian': 'eurasian',
  // — South Asia —
  'north indian': 'north-indian', 'south indian': 'south-indian',
  'indian': 'north-indian', 'pakistani': 'pakistani', 'bangladeshi': 'bengali',
  'bengali': 'bengali', 'nepalese': 'nepalese', 'nepali': 'nepalese',
  'sri lankan': 'sri-lankan', 'gujarati': 'gujarati',
  // — Americas —
  'american': 'american', 'steakhouse': 'american', 'bbq': 'american',
  'barbecue': 'american', 'diner': 'american', 'burger': 'american',
  'southern': 'american', 'cajun': 'american', 'creole': 'american',
  'mexican': 'mexican', 'tex-mex': 'mexican', 'brazilian': 'brazilian',
  'argentin': 'argentinian',
  // — Europe —
  'italian': 'italian', 'pizz': 'italian', 'trattoria': 'italian',
  'french': 'french', 'spanish': 'spanish', 'tapas': 'spanish',
  'greek': 'greek', 'british': 'british', 'english': 'british',
  'german': 'german', 'austrian': 'austrian', 'swiss': 'swiss',
  'portuguese': 'portuguese', 'russian': 'russian', 'ukrainian': 'ukrainian',
  'polish': 'polish', 'scandinavian': 'scandinavian', 'mediterranean': 'mediterranean',
  'european': 'european',
  // — Middle East / Central Asia —
  'lebanese': 'lebanese', 'turkish': 'turkish', 'persian': 'persian',
  'iranian': 'persian', 'moroccan': 'moroccan', 'egyptian': 'egyptian',
  'jordanian': 'jordanian', 'israeli': 'israeli', 'uzbek': 'uzbek',
  'georgian': 'georgian',
  // — Africa —
  'south african': 'south-african', 'african': 'african', 'ethiopian': 'african',
  // — sweets —
  'dessert': 'dessert', 'ice cream': 'dessert', 'gelato': 'dessert',
  'patisserie': 'dessert', 'cake': 'dessert', 'creperie': 'dessert'
});

// pre-sort tokens longest-first so "north indian" / "som tum" win over "indian" / "thai"
const TOKENS_BY_LEN = Object.freeze(Object.keys(TOKEN_TO_SLUG).sort((a, b) => b.length - a.length));

function _wordIncludes(hay, token) {
  // whole-word-ish: token bounded by non-letters (handles "pizz" → pizza/pizzeria via prefix below)
  const i = hay.indexOf(token);
  if (i < 0) return false;
  const before = i === 0 ? ' ' : hay[i - 1];
  return !/[a-z]/.test(before);   // token starts at a word boundary; trailing is free (pizz→pizzeria)
}

// slugsForCats(cats) — cats: array of FSQ label strings (full path or leaf).
// Returns a deduped array of our cuisine slugs (possibly empty).
function slugsForCats(cats) {
  if (!Array.isArray(cats) || !cats.length) return [];
  let hay = cats.join(' | ').toLowerCase();
  const out = [];
  // Longest-first so "north indian" / "som tum" win; CONSUME each match so a
  // generic token ("indian") can't re-match the residue of a specific one
  // ("south indian" → south-indian only, never also north-indian).
  for (const token of TOKENS_BY_LEN) {
    if (_wordIncludes(hay, token)) {
      const slug = TOKEN_TO_SLUG[token];
      if (!out.includes(slug)) out.push(slug);
      hay = hay.split(token).join(' ');   // consume so overlapping shorter tokens skip it
    }
  }
  return out;
}

module.exports = { slugsForCats, TOKEN_TO_SLUG };
