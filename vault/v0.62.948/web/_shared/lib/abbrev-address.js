// abbrev-address.js — v0.62.684
//
// Shortens a venue address for the carousel card's collapsed row, per the
// operator's card spec: "Address / area - can abbreviate the country and state
// to reduce text character usage."
//
// The COUNTRY half already exists and is NOT duplicated here — ResultCard's own
// `dropCountry()` strips a trailing country segment before this runs. This
// module adds the two remaining reductions:
//
//   1. drop the postal code   — the single biggest saving, and the least
//      useful token on a card whose job is "roughly where is this"
//   2. abbreviate a spelled-out state / province / prefecture to its standard
//      code, when the source didn't already
//
// Honest scope note: Google Places usually returns these already-abbreviated
// ("Perth WA 6000"), so in practice rule 1 does most of the work and rule 2 is
// a fallback for the sources that spell them out. Neither is what stops the row
// truncating — the card's `line-clamp-2` does that; this just makes one line
// the common case instead of the exception.

// ESM, matching every other module in web/_shared/lib (the TMAs import these
// directly through Vite; a lone CommonJS file here would not resolve).

// Spelled-out → standard code. Only entries whose abbreviation is genuinely
// standard and unambiguous in an address context are listed; anything that
// would need context to disambiguate is deliberately absent (better a long
// address than a wrong one).
export const STATE_ABBREV = {
  // Australia
  'new south wales': 'NSW', 'victoria': 'VIC', 'queensland': 'QLD',
  'western australia': 'WA', 'south australia': 'SA', 'tasmania': 'TAS',
  'northern territory': 'NT', 'australian capital territory': 'ACT',
  // Malaysia
  'selangor': 'SGR', 'johor': 'JHR', 'penang': 'PNG', 'pulau pinang': 'PNG',
  'melaka': 'MLK', 'malacca': 'MLK', 'negeri sembilan': 'NSN', 'perak': 'PRK',
  'pahang': 'PHG', 'kedah': 'KDH', 'kelantan': 'KTN', 'terengganu': 'TRG',
  'perlis': 'PLS', 'sabah': 'SBH', 'sarawak': 'SWK',
  'kuala lumpur': 'KL', 'putrajaya': 'PJY', 'labuan': 'LBN',
  // New Zealand
  'auckland': 'AKL', 'wellington': 'WLG', 'canterbury': 'CAN', 'otago': 'OTA'
};

// A postal-code-looking trailing token: 4-6 digits (SG 6, AU/NZ 4, MY 5, JP
// 7-with-hyphen handled below), optionally preceded by a state code. Deliberately
// conservative — a bare number that is NOT at the end of a segment is left alone
// so street numbers ("495/497 Wellington St") are never touched.
const TRAILING_POSTCODE = /[,\s]+\d{4,6}\s*$/;
const TRAILING_POSTCODE_JP = /[,\s]+\d{3}-\d{4}\s*$/;

/** Drop a trailing postal code from one address segment (or the whole string). */
export function dropPostcode(s) {
  let out = String(s || '');
  out = out.replace(TRAILING_POSTCODE_JP, '');
  out = out.replace(TRAILING_POSTCODE, '');
  return out.replace(/[\s,]+$/, '');
}

/** Abbreviate a spelled-out state/province name anywhere in the address. */
export function abbrevState(s) {
  const parts = String(s || '').split(',');
  const mapped = parts.map((raw) => {
    const seg = raw.trim();
    const hit = STATE_ABBREV[seg.toLowerCase()];
    if (hit) return hit;
    // "Perth Western Australia" — a trailing spelled-out state inside a segment.
    for (const [name, code] of Object.entries(STATE_ABBREV)) {
      const re = new RegExp(`\\s${name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}$`, 'i');
      if (re.test(seg)) return seg.replace(re, ` ${code}`);
    }
    return seg;
  });
  return mapped.filter(Boolean).join(', ');
}

/**
 * Shorten an address for the compact card row. Returns the input unchanged for
 * empty/non-string input so callers can pass through without guarding.
 */
export function abbrevAddress(area) {
  if (!area || typeof area !== 'string') return area;
  const trimmed = area.trim();
  if (!trimmed) return area;
  return abbrevState(dropPostcode(trimmed));
}

