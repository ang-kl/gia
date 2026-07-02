// web/cuisine/src/v2/lib/countries.js — v0.61.191
//
// Frozen list of countries available in the OTHER-region location
// flag picker. SG is intentionally omitted — Singapore-anchored
// searches use the SG pill, not OTHER. The 16 countries here cover
// ASEAN-9 (sans SG), Oceania-2, and North Asia-5.
//
// Each entry is shaped for two use sites:
//   - the TMA's tiny dropdown to the left of the LocationField input
//     (renders `${flag}  ${code}` to keep the dropdown compact);
//   - the server's Places searchText call, which constrains results
//     via `includedRegionCodes: [code]` (ISO 3166-1 alpha-2 two-letter
//     code, accepted by Places API New).

'use strict';

export const OTHER_COUNTRIES = Object.freeze([
  // ASEAN excluding SG (SG has its own pill).
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
  // Europe-1 — France (v0.62.470). Michelin 2025/26 star venues; Paris + Lyon
  // sourced first, remaining cities and Bib Gourmand land in follow-up PRs.
  { code: 'FR', flag: '🇫🇷', name: 'France' }
]);

// Default when no preference is saved (operator's primary use case
// is MY/Putrajaya at v0.61.191 ship time).
export const DEFAULT_OTHER_COUNTRY = 'MY';

export function findCountry(code) {
  if (!code) return null;
  const c = String(code).toUpperCase();
  return OTHER_COUNTRIES.find((e) => e.code === c) || null;
}
