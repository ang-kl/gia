// venue-type-label.js — v0.62.896
//
// `humaniseRestaurantType` and its two helpers, lifted OUT of index.js unchanged apart
// from the require at the top.
//
// WHY IT MOVED. index.js has no `module.exports`, so nothing in it can be tested by
// CALLING — only by scanning its source, which this arc has now had to repair six times
// after refactors that changed nothing a reader could see. v0.62.896 made this function
// locale-sensitive (it decides whether to SHOW or HIDE the venue-type line, and the label
// it reads now arrives in one of nine languages), so "does a Korean 음식점 get hidden?"
// became a question worth a real test rather than a regex over a file. bot-keyboard.js
// was carved out of index.js at v0.62.891 for exactly this reason; this is the same move.
//
// The resolution order is unchanged and is index.js's, verbatim:
//   (1) the localized primaryTypeDisplayName when it's already specific;
//   (2) the most specific cuisine subtype mined from types[];
//   (3) the raw primaryType enum when it is itself specific (cafe / bakery / bar);
//   (4) nothing — a bare "Restaurant" / "Food" HIDES the line rather than showing a
//       useless generic label.
//
//   "Cantonese restaurant"  → "Cantonese"
//   "Restaurant japonais"   → "japonais"
//   "sushi_restaurant"      → "Sushi" (raw enum fallback)

'use strict';

const { isGenericTypeLabel } = require('./places-language');

const GENERIC_VENUE_TYPE = new Set([
  'restaurant', 'food', 'store', 'meal takeaway', 'meal delivery',
  'point of interest', 'establishment', 'food store', 'grocery store',
  'grocery or supermarket'
]);
function _humaniseTypeEnum(enumStr) {
  return String(enumStr || '')
    .replace(/_/g, ' ')
    .replace(/[\p{L}][\p{L}'’-]*/gu, (w) => w.charAt(0).toUpperCase() + w.slice(1))
    .replace(/\s+restaurant$/i, '')
    .replace(/^restaurant\s+/i, '')
    .trim();
}
function _isGenericType(s) {
  // v0.62.896 — `isGenericTypeLabel` adds the localised forms (음식점, ресторан, 餐厅,
  // レストラン, restoran …). Before it, step (1) below asked an ENGLISH word set whether a
  // KOREAN display string was generic, got "no", and returned 음식점 — the exact useless
  // label this function's step (4) exists to hide. The English set stays as the first
  // check because it also covers strings that never came from Places.
  const v = String(s || '').trim().toLowerCase();
  return GENERIC_VENUE_TYPE.has(v) || isGenericTypeLabel(v);
}
function humaniseRestaurantType(displayText, primaryTypeEnum, typesArr) {
  // (1) localized display name, when it's already specific.
  //     v0.62.896 — the ENUM decides first. `primaryTypeDisplayName` arrives with no tag
  //     saying which language it is in, so "is this word generic?" is a guess over a union
  //     of nine vocabularies; `primaryType` is 'restaurant' or 'japanese_restaurant' in
  //     every locale. When the enum says generic, skip the display string entirely rather
  //     than hoping the word list covers it.
  const enumIsGeneric = _isGenericType(_humaniseTypeEnum(primaryTypeEnum));
  let s = (displayText && String(displayText).trim()) || '';
  s = s.replace(/\s+restaurant$/i, '').replace(/^restaurant\s+/i, '').trim();
  if (s && !enumIsGeneric && !_isGenericType(s)) return s;
  // (2) mine types[] for a specific cuisine subtype (e.g. gluten_free_restaurant
  //     → "Gluten-free"). These all end in "_restaurant" in the Places (New) API.
  const types = Array.isArray(typesArr) ? typesArr.map(String) : [];
  for (const t of types) {
    if (/_restaurant$/i.test(t)) {
      const h = _humaniseTypeEnum(t);
      if (h && !_isGenericType(h)) return h;
    }
  }
  // (3) raw primaryType enum when it is itself specific (cafe / bakery / bar …).
  const pe = _humaniseTypeEnum(primaryTypeEnum);
  if (pe && !_isGenericType(pe)) return pe;
  // (4) only a generic "Restaurant" / "Food" anywhere — hide the line.
  return '';
}

module.exports = { humaniseRestaurantType, GENERIC_VENUE_TYPE, _humaniseTypeEnum, _isGenericType };
