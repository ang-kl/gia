// region-code.js — v0.61.231
//
// Single source of truth for the Google Places `regionCode` derived from a
// cached user location (`location-cache.getUserLocation`). Before this, the
// derivation was inline-duplicated across handleSearchTurn, the cooking-method
// callback, and the TMA handlers — and the nation-iconic + cooking-method
// fan-outs forgot it entirely, so they stayed biased to Singapore even when
// the user's anchor was abroad (country=MY/ID/TH, or a Bangkok/Tokyo pin).
// That made e.g. "/s chilli crab" in Bangkok return zero results: the query
// said "Singapore" AND regionCode forced 'SG', contradicting the locationBias
// circle around Bangkok.
//
// Resolution order:
//   loc.country (ISO alpha-2, e.g. 'MY' / 'ID' / 'TH' / 'JP')  → use it
//   loc.region === 'JB' or legacy 'MY-PUT'                     → 'MY'
//   default                                                    → 'SG'
function resolveRegionCode(loc) {
  if (loc?.country && /^[A-Z]{2}$/.test(loc.country)) return loc.country;
  if (loc?.region === 'JB' || loc?.region === 'MY-PUT') return 'MY';
  return 'SG';
}

module.exports = { resolveRegionCode };
