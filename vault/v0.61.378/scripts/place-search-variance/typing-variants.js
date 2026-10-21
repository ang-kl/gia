// scripts/place-search-variance/typing-variants.js
//
// Generates 5 typing variants per venue, simulating how real users
// type a place name when they're searching for it.
//
// Variant taxonomy:
//   1. "full"        — operator-curated full name (the canonical landmark name)
//   2. "shortened"   — what a tourist might type, dropping qualifiers
//                      ("Berjaya Times Square" → "Times Square")
//   3. "native"      — native-script version (JP/KR/TH only — MY/ID use Latin)
//                      ("Tokyo Station" → "東京駅")
//   4. "typo"        — common misspelling / non-native-speaker spelling
//                      ("Putrajaya" → "Putrajya")
//   5. "descriptive" — language-mixed / vague / "near" form
//                      ("Pavilion KL" → "shopping mall Bukit Bintang")
//
// For venues with no `nativeName`, variant 3 falls back to a Latin-script
// alternative phrasing so we still produce 5 distinct rows.

'use strict';

// Stopwords to strip when generating the "shortened" variant.
const SHORTEN_STRIP = new Set([
  'shopping', 'mall', 'plaza', 'centre', 'center', 'mart',
  'station', 'terminal', 'airport',
  'park', 'palace', 'temple', 'shrine', 'tower',
  'museum', 'hotel', 'resort', 'beach', 'market',
  'kuala', 'lumpur', 'jakarta', 'tokyo', 'osaka',
  'seoul', 'busan', 'bangkok', 'phuket', 'chiang', 'mai',
  'putrajaya', 'penang', 'melaka', 'johor', 'bahru',
  'bali', 'denpasar', 'singapore', 'thailand', 'malaysia',
  'indonesia', 'japan', 'korea',
  'international', 'central', 'old', 'new',
  'the', 'of', 'and', 'at'
]);

// Generate a "tourist-shortened" form by dropping STRIP tokens.
function shortenName(name) {
  const tokens = String(name).split(/\s+/).filter(Boolean);
  const kept = tokens.filter((t) => !SHORTEN_STRIP.has(t.toLowerCase()));
  return (kept.length > 0 ? kept.join(' ') : tokens[0] || name);
}

// Generate a common typo for the full name.
// Deterministic — uses a per-name hash to pick a transformation so the
// test set is reproducible.
function typoize(name) {
  const s = String(name);
  if (s.length < 4) return s + 'a';
  // Pick a single mid-word character to drop/swap based on name length.
  const cuts = [];
  // Drop a vowel near the middle
  const mid = Math.floor(s.length / 2);
  const vowelMatch = s.slice(mid - 2, mid + 2).match(/[aeiou]/i);
  if (vowelMatch) {
    const at = mid - 2 + vowelMatch.index;
    cuts.push(s.slice(0, at) + s.slice(at + 1));
  }
  // Swap two adjacent consonants
  const consMatch = s.slice(2, -2).match(/([bcdfghjklmnpqrstvwxz])([bcdfghjklmnpqrstvwxz])/i);
  if (consMatch) {
    const at = 2 + consMatch.index;
    cuts.push(s.slice(0, at) + s[at + 1] + s[at] + s.slice(at + 2));
  }
  // Double a consonant
  if (s.length > 6) {
    const dblMatch = s.slice(3).match(/([bcdfghjklmnpqrstvwxz])/i);
    if (dblMatch) {
      const at = 3 + dblMatch.index;
      cuts.push(s.slice(0, at + 1) + s[at] + s.slice(at + 1));
    }
  }
  // If nothing matched, drop the last char
  if (cuts.length === 0) cuts.push(s.slice(0, -1));
  // Pick the first cut deterministically.
  return cuts[0];
}

// Generate a vague / descriptive form. Uses venue.type if available.
function describeName(venue) {
  const t = venue.type || '';
  const city = venue.city || '';
  switch (t) {
    case 'mall': return `shopping mall ${city}`;
    case 'station': return `train station ${city}`;
    case 'airport': return `airport ${city}`;
    case 'beach': return `beach near ${city}`;
    case 'market': return `market ${city}`;
    case 'food-street': return `food street ${city}`;
    case 'food-hall': return `food court ${city}`;
    case 'hawker': return `hawker centre ${city}`;
    case 'landmark': return `landmark ${city}`;
    case 'park': return `park ${city}`;
    case 'temple': return `temple ${city}`;
    case 'hotel': return `hotel ${city}`;
    case 'resort': return `resort ${city}`;
    case 'museum': return `museum ${city}`;
    case 'venue': return `convention center ${city}`;
    case 'district': return `${venue.name.split(' ')[0]} district`;
    case 'street': return `${venue.name} ${city}`;
    default: return `${city} ${venue.name.split(' ')[0]}`;
  }
}

// Public: given a venue, return [{ variant, query }, …] of 5 entries.
function generateVariants(venue) {
  const out = [];
  out.push({ variant: 'full', query: venue.name });
  const sh = shortenName(venue.name);
  out.push({ variant: 'shortened', query: sh !== venue.name ? sh : venue.name });
  if (venue.nativeName) {
    out.push({ variant: 'native', query: venue.nativeName });
  } else {
    // For MY/ID (Latin script), the 3rd variant becomes a "name + country"
    // form which approximates what a non-local would type.
    out.push({ variant: 'name+country', query: `${venue.name} ${venueCountryWord(venue.country)}` });
  }
  out.push({ variant: 'typo', query: typoize(venue.name) });
  out.push({ variant: 'descriptive', query: describeName(venue) });
  return out;
}

function venueCountryWord(cc) {
  switch (cc) {
    case 'MY': return 'Malaysia';
    case 'TH': return 'Thailand';
    case 'ID': return 'Indonesia';
    case 'JP': return 'Japan';
    case 'KR': return 'South Korea';
    default:   return cc;
  }
}

module.exports = { generateVariants, shortenName, typoize, describeName };
