// recent-locations.js — v0.61.197, cap raised v0.61.305
//
// 20-entry per-user LRU of resolved locations. Backed by Redis at
// `recent-locations:<chatId>` as a JSON array, newest-first. Each
// entry shape:
//   { lat, lng, label, country?, region?, setAt }
//
// The module is intentionally tiny: add / list / removeAt / clear.
// Dedup is by exact (lat, lng) within 11 m (5 decimals), so resaving
// the same anchor bubbles the existing row to the top instead of
// duplicating.
//
// TTL: 180 days. The cap of 20 entries means stale rows naturally
// roll off as the user adds new ones; the TTL is a safety net for
// abandoned accounts. v0.61.305 doubled the cap (was 10) to give the
// in-TMA recents drawer more room before items roll off.

'use strict';

const kv = require('./lib/redis-kv');

const MAX_ENTRIES = 20;
const TTL_S = 180 * 24 * 60 * 60;

function _key(chatId) {
  return `recent-locations:${chatId}`;
}

function _round5(n) {
  return Math.round(Number(n) * 1e5) / 1e5;
}

function _sameCoord(a, b) {
  return _round5(a.lat) === _round5(b.lat) && _round5(a.lng) === _round5(b.lng);
}

async function listRecentLocations(redis, chatId) {
  if (!(await kv.ensure(redis))) return [];
  const parsed = await kv.getJSON(redis, _key(chatId));
  return Array.isArray(parsed) ? parsed : [];
}

async function addRecentLocation(redis, chatId, entry) {
  if (!(await kv.ensure(redis))) return false;
  if (!entry || !Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return false;
  const normalised = {
    lat: _round5(entry.lat),
    lng: _round5(entry.lng),
    label: typeof entry.label === 'string' ? entry.label.slice(0, 240) : '',
    setAt: Date.now()
  };
  if (typeof entry.country === 'string' && entry.country) normalised.country = entry.country.toUpperCase().slice(0, 2);
  if (typeof entry.region === 'string' && entry.region) normalised.region = entry.region.slice(0, 16);
  try {
    const existing = await listRecentLocations(redis, chatId);
    const deduped = existing.filter((e) => !_sameCoord(e, normalised));
    deduped.unshift(normalised);
    const trimmed = deduped.slice(0, MAX_ENTRIES);
    await redis.setEx(_key(chatId), TTL_S, JSON.stringify(trimmed));
    return true;
  } catch (err) {
    console.warn('[recent-locations] add failed:', err && err.message);
    return false;
  }
}

async function removeRecentLocationAt(redis, chatId, index) {
  if (!(await kv.ensure(redis))) return false;
  const i = Number(index);
  if (!Number.isInteger(i) || i < 0) return false;
  try {
    const existing = await listRecentLocations(redis, chatId);
    if (i >= existing.length) return false;
    existing.splice(i, 1);
    if (existing.length === 0) {
      await redis.del(_key(chatId));
    } else {
      await redis.setEx(_key(chatId), TTL_S, JSON.stringify(existing));
    }
    return true;
  } catch (err) {
    console.warn('[recent-locations] removeAt failed:', err && err.message);
    return false;
  }
}

async function clearRecentLocations(redis, chatId) {
  if (!(await kv.ensure(redis))) return false;
  try {
    await redis.del(_key(chatId));
    return true;
  } catch (err) {
    console.warn('[recent-locations] clear failed:', err && err.message);
    return false;
  }
}

// v0.61.415 — operator: "clear locations include current location which should
// not." Clear-all in the recents drawer used to wipe the WHOLE LRU, the active
// (current) location included. This keeps ONLY the current entry and drops the
// rest. "Current" is the row matching (lat, lng) within ~11 m; when no coord is
// supplied or none matches, it falls back to the most-recent row [0] (which is
// the current set-location). Returns the kept entry (or null when none).
async function clearRecentLocationsExcept(redis, chatId, lat, lng) {
  if (!(await kv.ensure(redis))) return null;
  try {
    const existing = await listRecentLocations(redis, chatId);
    if (existing.length === 0) return null;
    let keep = null;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      keep = existing.find((e) => _sameCoord(e, { lat, lng })) || null;
    }
    if (!keep) keep = existing[0];   // fallback: most-recent = the current spot
    await redis.setEx(_key(chatId), TTL_S, JSON.stringify([keep]));
    return keep;
  } catch (err) {
    console.warn('[recent-locations] clearExcept failed:', err && err.message);
    return null;
  }
}

module.exports = {
  MAX_ENTRIES,
  TTL_S,
  listRecentLocations,
  addRecentLocation,
  removeRecentLocationAt,
  clearRecentLocations,
  clearRecentLocationsExcept
};
