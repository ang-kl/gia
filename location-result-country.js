// location-result-country.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md, A.
//
// `/l <place>` with a saved country preference other than SG searches Google Places with that country as a BIAS, not a
// filter, so Google may answer with a place in another country. Operator, 22-11 '26: `/l mandarin gallery` with the
// preference at MY found the real Mandarin Gallery in Singapore, and the bot replied
// "📍 Location saved: 🇲🇾 Mandarin Gallery, Singapore" and stored it as region OTHER, country MY, so every reader of the
// saved place (region-code.js) treated Orchard Road as Malaysia. The flag and the record came from the country SEARCHED.
//
// Here the country FOUND decides. The caller reads it from the answer's addressComponents (pipeline.js
// extractCountryCode) and hands both codes in; nothing here makes a call. The saved preference is not touched (A8:
// "Keep the preference").

'use strict';

const { findCountry } = require('./country-pref');

// The /l lookup's field mask. `places.addressComponents` is the one field added; Google's Text Search page (read
// 22-11 '26) lists it under Text Search Pro, the tier the four fields beside it already put the request in, so the
// lookup costs the same.
const LOCATION_SEARCH_FIELD_MASK = 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents';

const code2 = (c) => {
  const s = String(c || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(s) ? s : null;
};

// { country, region, flag } for a place found in `found` while searching `requested`. No country in the answer keeps
// the searched one, as before. A Singapore place is a Singapore place: no OTHER region.
function placeSaveFields({ requested, found } = {}) {
  const country = code2(found) || code2(requested) || 'SG';
  if (country === 'SG') return { country: 'SG', region: null, flag: '🇸🇬' };
  const entry = findCountry(country);
  return { country, region: 'OTHER', flag: (entry && entry.flag) || '🌍' };
}

// The place fields setUserLocation takes. A Singapore place is saved as the Singapore branch saves it: no region, no
// country (resolveRegionCode then reads SG), with the label kept so the apps can name it. The caller adds
// `fromChat: true` at the call itself, where chat-place-reaches-devices.test.js (K3) reads every chat write for it.
function saveOptions(fields, label) {
  if (fields && fields.region) return { region: fields.region, label, country: fields.country };
  return { label };
}

// The recent-locations entry, carrying the same country.
function recentEntry(fields, { lat, lng, label }) {
  const out = { lat, lng, label, country: fields.country };
  if (fields.region) out.region = fields.region;
  return out;
}

module.exports = { LOCATION_SEARCH_FIELD_MASK, placeSaveFields, saveOptions, recentEntry };
