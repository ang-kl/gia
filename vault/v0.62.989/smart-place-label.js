// smart-place-label.js — v0.61.265
//
// Operator: "For Others, should show 'Street/Building name, city, state'
// — don't have to show country."
//
// Google Places (New) returns `displayName.text` that is often the
// building number for street addresses (e.g. "1" for the address
// "1, Jln Imbi, Imbi, 55100 Kuala Lumpur, …"). When we use that
// verbatim the user sees a meaningless "Location saved: 1".
//
// This helper synthesizes a `<Street/Building>, <City>, <State>`
// label from `displayName.text` + `formattedAddress`. Country tail
// is dropped. Sub-locality is preferred when displayName is a
// building number AND the address has a recognisable sublocality.
//
// Operator example:
//   displayName    = "1"
//   formatted      = "1, Jln Imbi, Imbi, 55100 Kuala Lumpur,
//                     Wilayah Persekutuan Kuala Lumpur, Malaysia"
//   expected label = "Jln Imbi, Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur"
//
// For Singapore (no state in address) the third comma is omitted:
//   displayName    = "Pavilion"
//   formatted      = "176 Orchard Rd, 238843, Singapore"
//   expected label = "Pavilion, Orchard Rd"

'use strict';

const COUNTRY_TAIL = /^(malaysia|singapore|indonesia|thailand|vietnam|philippines|brunei|cambodia|laos|myanmar|japan|china|hong\s+kong|taiwan|south\s+korea|korea|australia|new\s+zealand)$/i;

// State / federal-territory names we recognise as the trailing
// admin-level piece (Malaysia, Indonesia, Australia, etc.).
const STATE_HEAD = /^(wilayah\s+persekutuan|federal\s+territory|selangor|johor|penang|sabah|sarawak|negeri\s+sembilan|kelantan|pahang|terengganu|kedah|perak|perlis|melaka|malacca|new\s+south\s+wales|victoria|queensland|western\s+australia|south\s+australia|tasmania|northern\s+territory|nsw|qld|wa|sa|vic|nt|act)\b/i;

const STREET_KEYWORD = /\b(jl\.|jalan|jln\.?|street|st\.?|road|rd\.?|avenue|ave\.?|drive|dr\.?|boulevard|blvd\.?|lane|ln\.?|highway|hwy\.?|soi|via|piazza|plaza|crescent|square|lorong|lrg\.?|persiaran|lebuh|lebuhraya|tingkat|taman|kampong|kampung|alley|chome|machi|gang)\b/i;

const BUILDING_NUMBER = /^[0-9]+[a-z]?$/i;

function _looksLikeBuildingNumber(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  if (BUILDING_NUMBER.test(t)) return true;
  // Unit codes like "01-23", "#03-12" — short, mostly digits + dashes/hashes.
  if (/^[#\-0-9]+$/.test(t) && t.length <= 10) return true;
  return false;
}

function _stripPostal(s) {
  // Malaysia / Indonesia postal codes are 5-digit; SG is 6; PH is 4.
  // Strip a leading 4-6 digit sequence and a trailing one.
  return String(s || '')
    .replace(/^\d{4,6}\s+/, '')
    .replace(/\s+\d{4,6}$/, '')
    .trim();
}

// Strip a leading short building number ("176 Orchard Rd" → "Orchard Rd").
// We only do this for the CITY slot because the building number is
// redundant with the street name. Leaves "Wilayah Persekutuan KL" etc.
// alone (no leading digits).
function _stripLeadingNumber(s) {
  return String(s || '').replace(/^\d+[a-z]?\s+/i, '').trim();
}

function _isStreet(s) {
  return STREET_KEYWORD.test(String(s || ''));
}

function _isCountryName(s) {
  return COUNTRY_TAIL.test(String(s || '').trim());
}

function smartPlaceLabel(displayName, formattedAddress) {
  let dn = String(displayName || '').trim();
  const fa = String(formattedAddress || '').trim();
  // v0.61.265 — operator: "the location field box cannot be a country
  // like singapore or malaysia." When Places' displayName.text is
  // *itself* a country name (e.g. user typed 'Singapore' into the
  // OTHER picker), treat it as empty so the caller's fallback chain
  // resolves to typed text or placeholder rather than the country.
  if (_isCountryName(dn)) dn = '';

  // Split + strip empties.
  let parts = fa ? fa.split(',').map((s) => s.trim()).filter(Boolean) : [];

  // Drop standalone postal-code pieces (SG addresses often have
  // "176 Orchard Rd, 238843, Singapore" — the "238843" is its own
  // comma-separated piece). Without removing them we'd treat "238843"
  // as the city.
  parts = parts.filter((p) => !/^\d{4,6}$/.test(p));

  // Drop country tail.
  while (parts.length && COUNTRY_TAIL.test(parts[parts.length - 1])) {
    parts = parts.slice(0, -1);
  }

  // Identify trailing state (if present).
  let state = '';
  if (parts.length && STATE_HEAD.test(parts[parts.length - 1])) {
    state = parts[parts.length - 1];
    parts = parts.slice(0, -1);
  }
  // v0.61.209 — abbreviate verbose Malaysian federal-territory names.
  // "Wilayah Persekutuan Kuala Lumpur" → "WP KL"
  // "Wilayah Persekutuan Putrajaya"    → "WP Putrajaya"
  // "Wilayah Persekutuan Labuan"       → "WP Labuan"
  // "Federal Territory of Kuala Lumpur" → "WP KL"
  state = state
    .replace(/^Wilayah\s+Persekutuan\s+Kuala\s+Lumpur$/i, 'WP KL')
    .replace(/^Federal\s+Territory\s+of\s+Kuala\s+Lumpur$/i, 'WP KL')
    .replace(/^Wilayah\s+Persekutuan\s+/i, 'WP ')
    .replace(/^Federal\s+Territory\s+of\s+/i, 'WP ');

  // City — the last remaining piece (postal stripped + leading
  // building number stripped, since the city slot shouldn't carry
  // "176 Orchard Rd" — that's a street, not a city).
  let city = parts.length ? _stripLeadingNumber(_stripPostal(parts[parts.length - 1])) : '';
  if (city) parts = parts.slice(0, -1);

  // Street/Building part 1:
  // - If displayName is non-empty AND NOT a pure building number,
  //   use displayName verbatim. It's a named venue ("Pavilion KL",
  //   "Berjaya Times Square", "Komtar JBCC").
  // - Else if any remaining `parts` looks like a street, use the
  //   FIRST one (closest to street level).
  // - Else use displayName as a last resort (even if it's a number),
  //   or empty string (callers attach their own fallback chain — see
  //   v0.61.265 note below).
  let first = '';
  if (dn && !_looksLikeBuildingNumber(dn)) {
    first = dn;
  } else {
    const streetIdx = parts.findIndex(_isStreet);
    if (streetIdx >= 0) {
      first = parts[streetIdx];
    } else if (parts.length > 0) {
      // No street keyword matched — take the LAST remaining part
      // (closest to city) as a best-effort.
      first = parts[parts.length - 1];
    } else {
      first = dn || '';
    }
  }

  const pieces = [first];
  if (city) pieces.push(city);
  if (state) pieces.push(state);
  // Dedupe consecutive duplicates (e.g. city == state head segment).
  const deduped = [];
  for (const p of pieces) {
    if (p && (deduped.length === 0 || deduped[deduped.length - 1].toLowerCase() !== p.toLowerCase())) {
      deduped.push(p);
    }
  }
  // v0.61.265 — operator: "always show 'unnamed' on whatever i typed
  // in the other mode. why" — the prior literal 'Unnamed' fallback
  // was masking the caller's own || text fallback chain (the truthy
  // string short-circuited it). Return '' so callers can chain to
  // formattedAddress / user-typed text / their own placeholder.
  return deduped.join(', ') || dn || '';
}

module.exports = { smartPlaceLabel };
