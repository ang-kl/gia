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

async function _connect(redis) {
  if (!redis) return false;
  if (!redis.isOpen) {
    try { await redis.connect(); } catch { return false; }
  }
  return true;
}

async function listRecentLocations(redis, chatId) {
  if (!(await _connect(redis))) return [];
  try {
    const raw = await redis.get(_key(chatId)).catch(() => null);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function addRecentLocation(redis, chatId, entry) {
  if (!(await _connect(redis))) return false;
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
  if (!(await _connect(redis))) return false;
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
  if (!(await _connect(redis))) return false;
  try {
    await redis.del(_key(chatId));
    return true;
  } catch (err) {
    console.warn('[recent-locations] clear failed:', err && err.message);
    return false;
  }
}

module.exports = {
  MAX_ENTRIES,
  TTL_S,
  listRecentLocations,
  addRecentLocation,
  removeRecentLocationAt,
  clearRecentLocations
};
