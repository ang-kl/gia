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
  // v0.61.157 — boundary is a structured `{ matchKey, radiusM,
  // anchorLat, anchorLng }`; computeBoundary in location-boundary.js
  // builds it. Persisted shape sanity-checks the four fields and
  // drops everything else. PR 2 stored `null`; v0.61.157 callers
  // pass the computed boundary.
  let sanitizedBoundary = null;
  if (record.boundary && typeof record.boundary === 'object') {
    const b = record.boundary;
    if (typeof b.matchKey === 'string' && b.matchKey
        && Number.isFinite(b.radiusM) && b.radiusM > 0) {
      sanitizedBoundary = {
        matchKey: b.matchKey,
        radiusM: b.radiusM,
        anchorLat: Number.isFinite(b.anchorLat) ? b.anchorLat : null,
        anchorLng: Number.isFinite(b.anchorLng) ? b.anchorLng : null
      };
    }
  }
  const sanitized = {
    mode: (record.mode === 'SG' || record.mode === 'JB' || record.mode === 'OTHER') ? record.mode : 'OTHER',
    placeName: typeof record.placeName === 'string' && record.placeName.trim() ? record.placeName.trim() : null,
    country: typeof record.country === 'string' && record.country.trim() ? record.country.trim() : null,
    adminAreaLevel1: typeof record.adminAreaLevel1 === 'string' && record.adminAreaLevel1.trim()
      ? record.adminAreaLevel1.trim() : null,
    lat: Number.isFinite(record.lat) ? record.lat : null,
    lng: Number.isFinite(record.lng) ? record.lng : null,
    boundary: sanitizedBoundary,
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

// Rule §2.6 — "no nagging". Two locales are the same when their
// boundary matchKey (mode + admin per location-boundary.js) agrees.
//
// v0.61.157 — delegates to deriveMatchKey so SG sub-regions
// ('Central Region' / 'North East Region' / …) collapse to a single
// SG matchKey. Previously the PR 2 implementation compared
// adminAreaLevel1 directly, which would flag a Bishan → Sentosa
// fix as a different locale.
function isSameLocale(prev, next) {
  if (!prev || !next || typeof prev !== 'object' || typeof next !== 'object') return false;
  if (prev.mode !== next.mode) return false;
  const { deriveMatchKey } = require('./location-boundary');
  return deriveMatchKey(prev) === deriveMatchKey(next);
}

// v0.61.157 — drift-suppression set. After the user declines the
// rule §2.7 re-prompt for a particular destination matchKey, we
// record the suppression so subsequent fixes during the same
// "excursion" don't re-prompt. TTL 24 hours — long enough to cover
// a typical day-trip, short enough to re-engage the prompt for a
// genuine relocation.
//
// Storage: a single Redis SET per chat. Members are matchKeys.
// Cleared on user accept (anchor swap) or natural TTL expiry.
const DRIFT_SUPPRESS_TTL = 24 * 60 * 60;

function _driftKey(chatId) {
  return `drift-suppress:${_hashChatId(chatId)}`;
}

async function getDriftSuppress(redis, chatId) {
  if (!redis || !redis.isOpen) return new Set();
  try {
    const members = await redis.sMembers(_driftKey(chatId));
    return new Set(Array.isArray(members) ? members : []);
  } catch {
    return new Set();
  }
}

async function isDriftSuppressed(redis, chatId, matchKey) {
  if (!redis || !redis.isOpen) return false;
  if (typeof matchKey !== 'string' || !matchKey) return false;
  try {
    return Boolean(await redis.sIsMember(_driftKey(chatId), matchKey));
  } catch {
    return false;
  }
}

async function addDriftSuppress(redis, chatId, matchKey) {
  if (!redis || !redis.isOpen) return;
  if (typeof matchKey !== 'string' || !matchKey) return;
  try {
    await redis.sAdd(_driftKey(chatId), matchKey);
    // Refresh TTL on every add so the 24h window restarts each
    // time the user declines for a new destination.
    await redis.expire(_driftKey(chatId), DRIFT_SUPPRESS_TTL);
  } catch { /* non-fatal */ }
}

async function clearDriftSuppress(redis, chatId) {
  if (!redis || !redis.isOpen) return;
  try { await redis.del(_driftKey(chatId)); } catch { /* non-fatal */ }
}

module.exports = {
  LOCALE_TTL,
  DRIFT_SUPPRESS_TTL,
  getUserLocale,
  setUserLocale,
  clearUserLocale,
  isSameLocale,
  getDriftSuppress,
  isDriftSuppressed,
  addDriftSuppress,
  clearDriftSuppress
};
