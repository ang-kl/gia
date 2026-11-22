// chat-freetext-seen.js — v0.61.171
//
// Per-(chatId, free-text criteria) seen-set for the chat
// `runFreeTextSearch` flow. Mirrors the v0.60.116/117 cuisine
// `cuisine:seen:<chatId>:<criteriaHash>` per-criteria dedup but
// for chat free-text searches ("italian food", "where's good
// laksa", etc.). Powers the v0.61.171 "Search 🔍 for more"
// inline-keyboard button + "↺ Start over" recycle.
//
// Storage:
//   chat-freetext:seen:<chatId>:<hash>   SET  30 min TTL, capped at 80
//   chat-freetext:query:<hash>           STRING  30 min TTL — maps a hash
//                                          back to the verbatim query
//                                          text so the callback can
//                                          re-run the same search
//                                          without packing the text
//                                          into callback_data (64-byte
//                                          Telegram limit).
//
// Hash is `chatId|text-normalised` SHA-256 first-10-hex chars. Keyed
// by chatId so two users searching the same thing have distinct
// rotation histories.

'use strict';

const crypto = require('crypto');

const TTL_S = 30 * 60;                 // 30 minutes
const SEEN_CAP = 80;                   // ~10 taps of 8 venues = 80; cap matches the cuisine session ceiling
const SEEN_PREFIX = 'chat-freetext:seen:';
const QUERY_PREFIX = 'chat-freetext:query:';

function _normaliseText(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function hashCriteria(chatId, text) {
  const id = String(chatId || '0');
  const norm = _normaliseText(text);
  return crypto.createHash('sha256').update(`${id}|${norm}`).digest('hex').slice(0, 10);
}

function _seenKey(chatId, hash) {
  return `${SEEN_PREFIX}${String(chatId || '0')}:${hash}`;
}

function _queryKey(hash) {
  return `${QUERY_PREFIX}${hash}`;
}

async function getSeenSet(redis, chatId, hash) {
  if (!redis || !redis.isOpen) return new Set();
  try {
    const members = await redis.sMembers(_seenKey(chatId, hash));
    return new Set(Array.isArray(members) ? members : []);
  } catch {
    return new Set();
  }
}

async function getSeenSize(redis, chatId, hash) {
  if (!redis || !redis.isOpen) return 0;
  try {
    const n = await redis.sCard(_seenKey(chatId, hash));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

async function addSeen(redis, chatId, hash, placeIds) {
  if (!redis || !redis.isOpen) return;
  const ids = (Array.isArray(placeIds) ? placeIds : [])
    .filter((p) => typeof p === 'string' && p);
  if (!ids.length) return;
  const k = _seenKey(chatId, hash);
  try {
    await redis.sAdd(k, ids);
    await redis.expire(k, TTL_S);
  } catch { /* non-fatal */ }
}

async function clearSeen(redis, chatId, hash) {
  if (!redis || !redis.isOpen) return;
  try { await redis.del(_seenKey(chatId, hash)); } catch { /* non-fatal */ }
}

async function setQuery(redis, hash, text) {
  if (!redis || !redis.isOpen) return;
  if (typeof text !== 'string' || !text.trim()) return;
  try { await redis.setEx(_queryKey(hash), TTL_S, text); } catch { /* non-fatal */ }
}

async function getQuery(redis, hash) {
  if (!redis || !redis.isOpen) return null;
  if (typeof hash !== 'string' || !hash) return null;
  try {
    const v = await redis.get(_queryKey(hash));
    return typeof v === 'string' && v.trim() ? v : null;
  } catch {
    return null;
  }
}

// Convenience: given a freshly-fetched venues array, return
// `{ topUnseen, exhausted }` where:
//   topUnseen — the venues to surface this tap (capped at `take`),
//               with already-seen placeIds excluded
//   exhausted — true when the seen-set is at or past SEEN_CAP
//               OR the unseen pool ≤ `take` (this is the last batch)
async function pickUnseen(redis, chatId, hash, venues, take = 8) {
  const seen = await getSeenSet(redis, chatId, hash);
  const arr = Array.isArray(venues) ? venues : [];
  const unseen = arr.filter((v) => v && v.placeId && !seen.has(v.placeId));
  const top = unseen.slice(0, take);
  const seenSizeAfter = seen.size + top.length;
  const exhausted = (seenSizeAfter >= SEEN_CAP) || (unseen.length <= take);
  return { topUnseen: top, exhausted, seenSizeAfter };
}

module.exports = {
  TTL_S,
  SEEN_CAP,
  hashCriteria,
  getSeenSet,
  getSeenSize,
  addSeen,
  clearSeen,
  setQuery,
  getQuery,
  pickUnseen
};
