// country-pref.js — v0.61.195
//
// Server-side mirror of `web/cuisine/src/v2/lib/countries.js` for the
// chat-side `/location` country picker. The TMA list is the canonical
// source (16 OTHER countries, ASEAN-9 + Oceania-2 + N-Asia-5); this
// module re-encodes it for two reasons:
//
//   1. The TMA module is ESM and gets bundled by Vite; the bot runs on
//      CommonJS Node and cannot import it directly.
//   2. The bot adds `SG` as a 17th entry — Singapore IS a valid search
//      country in the chat picker (`/location <place>` without an
//      explicit anchor was always SG-anchored). The TMA's OTHER picker
//      omits SG because SG has its own region pill there.
//
// Drift policy: when the TMA list changes, mirror it here. The two
// files have lived in sync since v0.61.191 and we don't import the
// TMA file at runtime (separate package, separate node_modules).

'use strict';

const OTHER_COUNTRIES = Object.freeze([
  // ASEAN sans SG.
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

// Bot-side picker prepends SG as the 17th option. Default starts the
// user on SG so existing /location <place> behaviour is preserved
// for everyone who never opens the picker.
const SG_ENTRY = Object.freeze({ code: 'SG', flag: '🇸🇬', name: 'Singapore' });
const ALL_COUNTRIES = Object.freeze([SG_ENTRY, ...OTHER_COUNTRIES]);
const ALL_CODES = new Set(ALL_COUNTRIES.map((c) => c.code));
const DEFAULT_COUNTRY = 'SG';

function findCountry(code) {
  if (!code) return null;
  const c = String(code).toUpperCase();
  return ALL_COUNTRIES.find((e) => e.code === c) || null;
}

function isValidCountry(code) {
  return ALL_CODES.has(String(code || '').toUpperCase());
}

// Inline-keyboard layout: 4 buttons per row. SG sits alone in row 1
// so it's clearly the "I'm in Singapore" anchor; the 16 OTHER
// entries fill 4 rows of 4. Last row carries a Cancel button.
function buildCountryPickerKeyboard() {
  const rows = [];
  rows.push([{ text: `${SG_ENTRY.flag} ${SG_ENTRY.name}`, callback_data: `cp:${SG_ENTRY.code}` }]);
  for (let i = 0; i < OTHER_COUNTRIES.length; i += 4) {
    const slice = OTHER_COUNTRIES.slice(i, i + 4);
    rows.push(slice.map((c) => ({
      text: `${c.flag} ${c.code}`,
      callback_data: `cp:${c.code}`
    })));
  }
  rows.push([{ text: '✖ Cancel', callback_data: 'cp:cancel' }]);
  return { inline_keyboard: rows };
}

const PREF_TTL = 365 * 24 * 60 * 60; // 365 days

// v0.61.363 — per-device country pref. Same multi-device rationale as
// the location cache: one chatId, several devices each in a different
// country. A device token routes to `country-pref:<chatId>:dev:<id>`;
// reads fall back to the chatId-level key (bot-chat default + seed).
function _sanitizeDeviceId(deviceId) {
  if (!deviceId) return null;
  const clean = String(deviceId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return clean || null;
}

async function getUserCountryPref(redis, chatId, deviceId) {
  if (!redis) return DEFAULT_COUNTRY;
  try {
    if (!redis.isOpen) await redis.connect();
    const dev = _sanitizeDeviceId(deviceId);
    let raw = dev ? await redis.get(`country-pref:${chatId}:dev:${dev}`).catch(() => null) : null;
    if (!raw) raw = await redis.get(`country-pref:${chatId}`).catch(() => null);
    if (raw && ALL_CODES.has(String(raw).toUpperCase())) return String(raw).toUpperCase();
  } catch { /* non-fatal — default */ }
  return DEFAULT_COUNTRY;
}

async function setUserCountryPref(redis, chatId, code, deviceId) {
  if (!redis) return false;
  const cc = String(code || '').toUpperCase();
  if (!ALL_CODES.has(cc)) return false;
  try {
    if (!redis.isOpen) await redis.connect();
    // Write the chatId-level key (bot-chat default + seed) and, when a
    // device token is present, the per-device key too.
    await redis.setEx(`country-pref:${chatId}`, PREF_TTL, cc);
    const dev = _sanitizeDeviceId(deviceId);
    if (dev) await redis.setEx(`country-pref:${chatId}:dev:${dev}`, PREF_TTL, cc);
    return true;
  } catch (err) {
    console.warn('[country-pref] set failed:', err && err.message);
    return false;
  }
}

module.exports = {
  OTHER_COUNTRIES,
  ALL_COUNTRIES,
  DEFAULT_COUNTRY,
  findCountry,
  isValidCountry,
  buildCountryPickerKeyboard,
  getUserCountryPref,
  setUserCountryPref
};
