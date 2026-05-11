// cuisine-google-types.js — v0.60.101
//
// Maps the Cuisine TMA's slug catalogue to Google Places (v1) restaurant
// types so we can tag each venue in the combo OR-fallback with WHICH of
// the user's selected cuisines it actually serves.
//
// Operator 2026-05-11: "search from Google API whether it can identify
// as 'Japanese' 'Italian' so that combo selection results of the eateries
// can properly identify the cuisine type is selling."
//
// Google's `places.types` array (Table A "Food and Drink") covers the
// big-ticket cuisines — italian_restaurant, japanese_restaurant, etc.
// For regional cuisines Google doesn't tag (cantonese, peranakan,
// teochew, hokkien, …) we fall back to keyword matching on name +
// primaryType + types.

// Slug → Google Places type. Only includes slugs Google actually tags;
// the rest are handled via KEYWORDS_BY_SLUG below.
const GOOGLE_TYPE_BY_SLUG = {
  'american':       'american_restaurant',
  'brazilian':      'brazilian_restaurant',
  'chinese':        'chinese_restaurant',
  'french':         'french_restaurant',
  'greek':          'greek_restaurant',
  'south-indian':   'indian_restaurant',
  'north-indian':   'indian_restaurant',
  'indian':         'indian_restaurant',
  'indonesian':     'indonesian_restaurant',
  'italian':        'italian_restaurant',
  'japanese':       'japanese_restaurant',
  'korean':         'korean_restaurant',
  'lebanese':       'lebanese_restaurant',
  'mediterranean':  'mediterranean_restaurant',
  'mexican':        'mexican_restaurant',
  'spanish':        'spanish_restaurant',
  'thai':           'thai_restaurant',
  'turkish':        'turkish_restaurant',
  'vietnamese':     'vietnamese_restaurant'
};

// Slug → name/type keyword fallback. Lowercased substrings — match if
// venue.name OR venue.primaryType OR any of venue.types contains one.
// Order keywords from most-specific to most-general so a chain like
// "Din Tai Fung" (shanghainese) doesn't get pulled by the bare "chinese"
// in its address.
const KEYWORDS_BY_SLUG = {
  'singaporean':    ['singaporean', 'hawker', 'kopitiam'],
  'peranakan':      ['peranakan', 'nyonya', 'nonya'],
  'eurasian':       ['eurasian'],
  'malaysian':      ['malaysian', 'malay'],
  'filipino':       ['filipino', 'philippine'],
  'burmese':        ['burmese', 'myanmar'],
  'laotian':        ['laotian', 'lao '],
  'timorese':       ['timorese', 'timor'],
  'taiwanese':      ['taiwanese', 'taiwan'],
  // China-regional — Google lumps these under chinese_restaurant.
  'sichuan':        ['sichuan', 'szechuan'],
  'shanghainese':   ['shanghainese', 'shanghai'],
  'cantonese':      ['cantonese'],
  'hunan':          ['hunan'],
  'hokkien':        ['hokkien'],
  'teochew':        ['teochew'],
  'hainanese':      ['hainanese', 'hainan'],
  'hakka':          ['hakka'],
  'northeastern':   ['dongbei', 'northeastern chinese'],
  'northwestern':   ['xinjiang', 'northwestern chinese'],
  'hong-kong':      ['hong kong', 'hk-style', 'cha chaan teng'],
  'macau':          ['macau', 'macanese'],
  // South Asian regional
  'bengali':        ['bengali'],
  'gujarati':       ['gujarati'],
  'goan':           ['goan'],
  'nepalese':       ['nepalese', 'nepali'],
  'tibetan':        ['tibetan'],
  'sri-lankan':     ['sri lankan', 'sri-lankan', 'ceylon'],
  'pakistani':      ['pakistani'],
  // Middle Eastern
  'persian':        ['persian', 'iranian'],
  'moroccan':       ['moroccan'],
  'egyptian':       ['egyptian'],
  'jordanian':      ['jordanian'],
  'israeli':        ['israeli'],
  'uzbek':          ['uzbek'],
  'georgian':       ['georgian'],
  // European specialists Google doesn't tag
  'british':        ['british', 'english pub'],
  'german':         ['german'],
  'austrian':       ['austrian'],
  'swiss':          ['swiss'],
  'portuguese':     ['portuguese'],
  'russian':        ['russian'],
  'ukrainian':      ['ukrainian'],
  'polish':         ['polish'],
  'scandinavian':   ['scandinavian', 'nordic', 'swedish', 'danish', 'norwegian', 'finnish'],
  'european':       ['european'],
  // Americas
  'argentinian':    ['argentinian', 'argentine'],
  // Africa
  'african':        ['african'],
  'south-african':  ['south african', 'south-african'],
  // Australasia
  'australian':     ['australian', 'modern australian'],
  'new-zealand':    ['new zealand', 'kiwi', 'antipodean'],
  'australasia':    ['australasian', 'pacific']
};

// matchedCuisinesForVenue(venue, selectedSlugs) → array of slugs that
// the venue plausibly serves, given Google's types + name. Used by the
// /api/cuisine/search combo path to tag each venue card.
//
// Match logic per slug:
//   1. Strong signal: Google's `places.types` array contains the slug's
//      mapped type (e.g. 'italian_restaurant'). One hit = match.
//   2. Fallback: venue.name OR venue.primaryType OR any v.types entry
//      contains one of the slug's KEYWORDS_BY_SLUG substrings.
//
// Returns slugs in the same order they appear in `selectedSlugs` so the
// UI can render chips consistent with the user's selection order.
function matchedCuisinesForVenue(venue, selectedSlugs) {
  if (!venue || !Array.isArray(selectedSlugs) || !selectedSlugs.length) return [];
  const types = Array.isArray(venue.types) ? venue.types.map((t) => String(t).toLowerCase()) : [];
  const primaryType = String(venue.primaryType || '').toLowerCase();
  const name = String(venue.name || '').toLowerCase();
  const haystack = `${name} ${primaryType} ${types.join(' ')}`;
  const matched = [];
  for (const slug of selectedSlugs) {
    const googleType = GOOGLE_TYPE_BY_SLUG[slug];
    if (googleType && (types.includes(googleType) || primaryType === googleType)) {
      matched.push(slug);
      continue;
    }
    const keywords = KEYWORDS_BY_SLUG[slug] || [slug.replace(/-/g, ' ')];
    if (keywords.some((kw) => haystack.includes(kw))) {
      matched.push(slug);
    }
  }
  return matched;
}

module.exports = {
  GOOGLE_TYPE_BY_SLUG,
  KEYWORDS_BY_SLUG,
  matchedCuisinesForVenue
};
