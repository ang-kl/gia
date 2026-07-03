// web/menu/src/countries.js — v0.61.221
//
// Was a byte-identical duplicate of web/cuisine/src/v2/lib/countries.js.
// v0.61.221 diverges: the Menu TMA's flag dropdown now appends 🇸🇬 SG at
// the bottom so a user anchored in OTHER (e.g. Bangkok) can flip back to
// SG via the same control. Cuisine TMA still uses a SG/JB pill outside
// the dropdown, so its list stays SG-less.
//
// Operator (28-05 '26): "Add Singapore in part of the dropdown list at
// the bottom for Menu TMA only … When Select Singapore in the Menu TMA,
// and user type in the location it should behavior like what has been
// coded and not change." Picking SG + searching flows through the
// existing /api/cuisine/place-search-by-country endpoint with
// countryCode=SG; the picked result is set-located server-side which
// stamps region='SG' on the anchor; the parent App's region transition
// then re-renders the form back into native SG mode (precinct dropdown
// + place-autocomplete). End behaviour matches the SG-mode codepath.

'use strict';

export const OTHER_COUNTRIES = Object.freeze([
  // ASEAN excluding SG (SG sits at the bottom of this list).
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: 'BN', flag: '🇧🇳', name: 'Brunei' },
  // Oceania.
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  // North Asia.
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
  { code: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
  { code: 'MO', flag: '🇲🇴', name: 'Macau' },
  { code: 'TW', flag: '🇹🇼', name: 'Taiwan' },
  // v0.62.473 — operator: France search DISABLED until the catalogue is settled
  // (Paris 1★ + Bib Gourmand + the other 11 cities still due). Scaffold, FR-michelin.js,
  // cities & centroids all stay in place; only the picker entry is gated off.
  // { code: 'FR', flag: '🇫🇷', name: 'France' },
  // v0.61.221 — Singapore at the bottom, Menu TMA only.
  { code: 'SG', flag: '🇸🇬', name: 'Singapore' }
]);

export const DEFAULT_OTHER_COUNTRY = 'MY';

export function findCountry(code) {
  if (!code) return null;
  const c = String(code).toUpperCase();
  return OTHER_COUNTRIES.find((e) => e.code === c) || null;
}
