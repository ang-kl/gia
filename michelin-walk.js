// v0.60.198 — Michelin walk-through state.
//
// History: v0.60.193 paged users through the 130-entry curated SG Guide
// via a `cuisine:seen:<chatId>:<criteriaHash>` set. v0.60.195 ripped
// pagination out because the operator wanted "every tap returns top 12
// fresh" — but in practice rapid taps then return the same 12 venues
// over and over (verified in Depoly_2053_15-May.MD: 5 taps in 17 s, all
// returned the identical 12 starred entries). Operator clarified:
// "Issue with tap search for next list — Michelin", picking the
// walk-through model (v0.60.193 shape) + reset on combo/filter change
// + 1-hour idle TTL.
//
// This module is the v0.60.198 implementation. Standalone so the
// Michelin handler stays readable.
//
// Redis shape (per chat):
//   michelin:walk:seen:<chatId>  SET of slugs already served this walk
//   michelin:walk:meta:<chatId>  HASH { hash, lastSeenAt }
//   Both TTL 1h. Both DEL'd when criteriaHash flips (combo/filter change)
//   or when meta lastSeenAt is older than the TTL ceiling.

const crypto = require('crypto');

const TTL_SECONDS = 60 * 60;     // 1h — operator-set
const KEY_SET  = (chatId) => `michelin:walk:seen:${chatId}`;
const KEY_META = (chatId) => `michelin:walk:meta:${chatId}`;

// SHA256 over the normalised filter set. Stable across object-key order,
// case folds free-text, drops falsy filter flags so `{ halal: false }`
// hashes identically to `{}`.
function computeCriteriaHash({ otherCuisineSlugs = [], filters = {}, prices = [], radius, isJB, freeText } = {}) {
  const norm = {
    cuisines: [...otherCuisineSlugs].filter(Boolean).sort(),
    filters: Object.keys(filters || {}).sort().reduce((acc, k) => {
      if (filters[k]) acc[k] = true;
      return acc;
    }, {}),
    prices: [...(prices || [])].map(Number).filter(Number.isFinite).sort((a, b) => a - b),
    radius: Number(radius) || 0,
    isJB: !!isJB,
    freeText: String(freeText || '').trim().toLowerCase()
  };
  return crypto.createHash('sha256').update(JSON.stringify(norm)).digest('hex').slice(0, 16);
}

// Returns { seen: Set<string>, reset: boolean }. `reset:true` indicates
// the seen-set was wiped this call (combo/filter changed, or 1h passed).
// Best-effort: any Redis failure returns an empty set + reset:false so
// the caller falls through to the top-12 default behaviour.
async function readWalkState(redis, chatId, currentHash) {
  if (!redis || !redis.isOpen || !chatId || !currentHash) {
    return { seen: new Set(), reset: false };
  }
  try {
    const meta = await redis.hGetAll(KEY_META(chatId));
    const prevHash    = meta && meta.hash ? String(meta.hash) : null;
    const lastSeenAt  = Number(meta && meta.lastSeenAt) || 0;
    const idleMs      = lastSeenAt ? (Date.now() - lastSeenAt) : Infinity;
    const stale       = lastSeenAt > 0 && idleMs > TTL_SECONDS * 1000;

    // "reset" only fires when there was a prior walk we just wiped —
    // first-ever taps return an empty set with reset:false so the
    // caller can distinguish "fresh user" from "filter just changed".
    const hadPriorWalk = prevHash !== null;
    if (hadPriorWalk && (prevHash !== currentHash || stale)) {
      await redis.del(KEY_SET(chatId));
      await redis.del(KEY_META(chatId));
      return { seen: new Set(), reset: true };
    }
    if (!hadPriorWalk) {
      return { seen: new Set(), reset: false };
    }
    const slugs = await redis.sMembers(KEY_SET(chatId));
    return { seen: new Set(Array.isArray(slugs) ? slugs : []), reset: false };
  } catch {
    return { seen: new Set(), reset: false };
  }
}

// Append the just-served slugs and refresh TTL. No-op when chatId or
// redis is missing, or when newSlugs is empty.
async function recordWalk(redis, chatId, currentHash, newSlugs) {
  if (!redis || !redis.isOpen || !chatId || !currentHash) return;
  const slugs = Array.isArray(newSlugs) ? newSlugs.filter(Boolean) : [];
  if (!slugs.length) return;
  try {
    await redis.sAdd(KEY_SET(chatId), slugs);
    await redis.expire(KEY_SET(chatId), TTL_SECONDS);
    await redis.hSet(KEY_META(chatId), { hash: currentHash, lastSeenAt: String(Date.now()) });
    await redis.expire(KEY_META(chatId), TTL_SECONDS);
  } catch { /* best-effort — next tap will just resume from same cursor */ }
}

module.exports = { computeCriteriaHash, readWalkState, recordWalk, TTL_SECONDS };
