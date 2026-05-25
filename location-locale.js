// location-locale.js — v0.61.156
//
// Persistence layer for the REGISTERED LOCALE produced by
// location-mode.classifyLocation. Stores one record per chatId:
//
//   { mode, placeName, country, adminAreaLevel1, lat, lng,
//     boundary?, registeredAt }
//
//   - mode             — 'SG' | 'JB' | 'OTHER' (rule §2.3 output)
//   - placeName        — human-readable label from the geocode.
//                        Never raw lat/long (rule §2.4 — the earlier
//                        location-handler bug).
//   - country          — country name from the geocode (e.g.
//                        'Singapore', 'Malaysia', 'Indonesia').
//   - adminAreaLevel1  — first admin level (e.g. 'Johor',
//                        'Selangor', 'Wilayah Persekutuan Putrajaya',
//                        'Central Region'). Drives the boundary
//                        check in rule §2.7 (PR 3).
//   - lat / lng        — the coord that produced the classification.
//                        Used by callers that need to recompute
//                        distance from the anchor (e.g. radius cap).
//   - boundary         — { radiusM?, adminAreaLevel1? } (PR 3). Empty
//                        in PR 2.
//   - registeredAt     — epoch ms.
//
// Separate from `location-cache.js`:
//   - `loc:<chatHash>`         (existing) — ephemeral GPS fix.
//   - `userlocale:<chatHash>`  (this)     — registered classification.
//
// Both can co-exist. The cuisine TMA + chat handlers can still read
// the old `loc:` record for region/radiusCapM compat; new feature
// gates read `userlocale:` for mode.
//
// Public surface:
//   getUserLocale(redis, chatId)             → record | null
//   setUserLocale(redis, chatId, record)     → void
//   clearUserLocale(redis, chatId)           → void
//   isSameLocale(prev, next)                 → boolean
//     ↑ rule §2.6 no-nag check. Same mode AND same adminAreaLevel1
//       (so re-fixes inside "Selangor" are silent, but a cross
//       from Selangor → Wilayah Persekutuan Putrajaya prompts).

'use strict';

const crypto = require('crypto');

const LOCALE_TTL = 30 * 24 * 60 * 60;   // 30 days

function _hashChatId(chatId) {
  return crypto.createHash('sha256').update(String(chatId)).digest('hex').slice(0, 16);
}

function _key(chatId) {
  return `userlocale:${_hashChatId(chatId)}`;
}

async function getUserLocale(redis, chatId) {
  if (!redis || !redis.isOpen) return null;
  try {
    const raw = await redis.get(_key(chatId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') return parsed;
    return null;
  } catch {
    return null;
  }
}

async function setUserLocale(redis, chatId, record) {
  if (!redis || !redis.isOpen) return;
  if (!record || typeof record !== 'object') return;
  // Defensive: drop unknown fields; freeze the canonical shape so
  // future fields go through here, not via ad-hoc spread at call
  // sites.
  const sanitized = {
    mode: (record.mode === 'SG' || record.mode === 'JB' || record.mode === 'OTHER') ? record.mode : 'OTHER',
    placeName: typeof record.placeName === 'string' && record.placeName.trim() ? record.placeName.trim() : null,
    country: typeof record.country === 'string' && record.country.trim() ? record.country.trim() : null,
    adminAreaLevel1: typeof record.adminAreaLevel1 === 'string' && record.adminAreaLevel1.trim()
      ? record.adminAreaLevel1.trim() : null,
    lat: Number.isFinite(record.lat) ? record.lat : null,
    lng: Number.isFinite(record.lng) ? record.lng : null,
    boundary: (record.boundary && typeof record.boundary === 'object') ? record.boundary : null,
    registeredAt: Number.isFinite(record.registeredAt) ? record.registeredAt : Date.now()
  };
  try {
    await redis.setEx(_key(chatId), LOCALE_TTL, JSON.stringify(sanitized));
  } catch { /* non-fatal */ }
}

async function clearUserLocale(redis, chatId) {
  if (!redis || !redis.isOpen) return;
  try { await redis.del(_key(chatId)); } catch { /* non-fatal */ }
}

// Rule §2.6 — "no nagging". Two locales are the same when:
//   - both modes are equal AND
//   - either both have null adminAreaLevel1 (e.g. SG region, no
//     admin component surfaced) OR both share the same
//     adminAreaLevel1 (case-insensitive).
//
// PR 3 will add the boundary radius dimension (rule §2.7). PR 2's
// shape is conservative: same-admin = same locale.
function isSameLocale(prev, next) {
  if (!prev || !next || typeof prev !== 'object' || typeof next !== 'object') return false;
  if (prev.mode !== next.mode) return false;
  const prevA = typeof prev.adminAreaLevel1 === 'string' ? prev.adminAreaLevel1.toLowerCase().trim() : '';
  const nextA = typeof next.adminAreaLevel1 === 'string' ? next.adminAreaLevel1.toLowerCase().trim() : '';
  return prevA === nextA;
}

module.exports = {
  LOCALE_TTL,
  getUserLocale,
  setUserLocale,
  clearUserLocale,
  isSameLocale
};
