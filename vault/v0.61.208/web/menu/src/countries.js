// web/menu/src/countries.js — v0.61.192
//
// Duplicate of web/cuisine/src/v2/lib/countries.js so the Menu TMA's
// build (separate Vite config, separate node_modules) can import
// without cross-package wiring. Keep the two lists in sync — 16
// entries: ASEAN-9 (sans SG), Oceania-2, North Asia-5.

'use strict';

export const OTHER_COUNTRIES = Object.freeze([
  // ASEAN excluding SG (SG has its own pill).
  { code: 'MY', flag: '🇲🇾', name: 'Malaysia' },
  { code: 'ID', flag: '🇮🇩', name: 'Indonesia' },
  { code: 'TH', flag: '🇹🇭', name: 'Thailand' },
  { code: 'VN', flag: '🇻🇳', name: 'Vietnam' },
  { code: 'PH', flag: '🇵🇭', name: 'Philippines' },
  { code: 'BN', flag: '🇧🇳', name: 'Brunei' },
  { code: 'KH', flag: '🇰🇭', name: 'Cambodia' },
  { code: 'LA', flag: '🇱🇦', name: 'Laos' },
  { code: 'MM', flag: '🇲🇲', name: 'Myanmar' },
  // Oceania.
  { code: 'AU', flag: '🇦🇺', name: 'Australia' },
  { code: 'NZ', flag: '🇳🇿', name: 'New Zealand' },
  // North Asia.
  { code: 'JP', flag: '🇯🇵', name: 'Japan' },
  { code: 'KR', flag: '🇰🇷', name: 'South Korea' },
  { code: 'CN', flag: '🇨🇳', name: 'China' },
  { code: 'HK', flag: '🇭🇰', name: 'Hong Kong' },
  { code: 'TW', flag: '🇹🇼', name: 'Taiwan' }
]);

export const DEFAULT_OTHER_COUNTRY = 'MY';

export function findCountry(code) {
  if (!code) return null;
  const c = String(code).toUpperCase();
  return OTHER_COUNTRIES.find((e) => e.code === c) || null;
}
