// user-data.js — v0.57.25
//
// Self-service erasure (/forgetme) and inactivity TTL refresh.
//
// Per-chatId Redis keys this module is aware of:
//   loc:<hashedChatId>             24 h  (location-cache)
//   loc:pending:<hashedChatId>      5 min (location-cache)
//   proc:<hashedChatId>            60 s  (location-cache)
//   buddy-optin:<chatId>           30 d  (buddy-match)
//   buddy-blocks:<chatId>          persistent — refreshed to 90 d
//                                   on every activity so it auto-
//                                   purges if the user stops using
//                                   the bot for ≥90 days
//   buddy-day:<chatId>:<YMD>       24 h  (buddy-match)
//   recent-picks:<chatId>          24 h  (recent-picks)
//   clip:<chatId>                  30 d  (clip-store, v0.59.44)
//
// Aggregate-usage SETs that hold this user's sha256 hash as a member
// (no per-user value attached — only de-dup membership; usage-log.js):
//   usage:users                    persistent (one SREM)
//   usage:dau:<YMD>                90 d  (SCAN + SREM the hash)
//   usage:search:<YMD>             90 d  (SCAN + SREM)
//   usage:searchmulti:<YMD>        90 d  (SCAN + SREM)
// (usage:cuisine / usage:criteria HASHes carry no per-user attribution
// → nothing to erase there.)
//
// `loc:`, `loc:pending:`, `proc:` are hashed (sha256, 16-hex) per
// location-cache.js — the same `hashChatId` the `usage:*` SETs store.
// The buddy + recent-picks + clip keys use the plain chatId.
// `forgetUserData` covers all encodings.

const { hashChatId } = require('./location-cache');

const ACTIVITY_TTL_S = 90 * 24 * 60 * 60; // 90 days

// Static keys that use plain chatId (one DEL each).
function plainKeys(chatId) {
  return [
    `buddy-optin:${chatId}`,
    `buddy-blocks:${chatId}`,
    `recent-picks:${chatId}`,
    `clip:${chatId}`
  ];
}

// Static keys that use hashedChatId.
function hashedKeys(chatId) {
  const h = hashChatId(chatId);
  return [
    `loc:${h}`,
    `loc:pending:${h}`,
    `proc:${h}`
  ];
}

// Daily counters use the pattern `buddy-day:<chatId>:<YMD>` — many
// keys per chat over time. SCAN them.
async function scanDailyKeys(redis, chatId) {
  const matched = [];
  try {
    const iter = redis.scanIterator({ MATCH: `buddy-day:${chatId}:*`, COUNT: 100 });
    for await (const key of iter) {
      // node-redis v4 yields strings; v5 yields { keys: [...] }.
      if (typeof key === 'string') matched.push(key);
      else if (key && Array.isArray(key.keys)) matched.push(...key.keys);
    }
  } catch (err) {
    // SCAN failed — return what we found so far.
  }
  return matched;
}

// scanKeys — SCAN every key matching `pattern` (node-redis v4/v5 safe).
async function scanKeys(redis, pattern) {
  const matched = [];
  try {
    const iter = redis.scanIterator({ MATCH: pattern, COUNT: 200 });
    for await (const key of iter) {
      if (typeof key === 'string') matched.push(key);
      else if (key && Array.isArray(key.keys)) matched.push(...key.keys);
    }
  } catch { /* SCAN failed — return what we have */ }
  return matched;
}

// removeUsageMembership — strip this user's sha256 hash from the
// aggregate-usage SETs (usage:users + every usage:dau/search/searchmulti
// day-set). These hold only de-dup membership, no per-user value, so
// nothing else needs touching. Best-effort; returns the # of SREMs that
// reported a removal.
async function removeUsageMembership(redis, chatId) {
  let removed = 0;
  try {
    const h = hashChatId(chatId);
    try { removed += Number(await redis.sRem('usage:users', h)) || 0; } catch { /* best-effort */ }
    const dayKeys = [
      ...(await scanKeys(redis, 'usage:dau:*')),
      ...(await scanKeys(redis, 'usage:search:*')),
      ...(await scanKeys(redis, 'usage:searchmulti:*'))
    ];
    for (const k of dayKeys) {
      try { removed += Number(await redis.sRem(k, h)) || 0; } catch { /* per-key best-effort */ }
    }
  } catch { /* best-effort */ }
  return removed;
}

// forgetUserData — wipes every chatId-keyed entry from Redis.
// Returns `{ deleted: number, keys: string[] }` for caller to
// surface back to the user. Idempotent — re-running on an already-
// erased user simply returns deleted: 0.
async function forgetUserData(redis, chatId) {
  if (!redis || !chatId) return { deleted: 0, keys: [] };
  if (!redis.isOpen) await redis.connect();
  // Strip aggregate-usage membership first (best-effort; counted into
  // `deleted` so the user sees a non-zero result even if all their
  // own keys had already expired).
  const usageRemoved = await removeUsageMembership(redis, chatId);
  const candidates = [
    ...plainKeys(chatId),
    ...hashedKeys(chatId),
    ...(await scanDailyKeys(redis, chatId))
  ];
  // Filter to keys that actually exist (so the count we report is
  // accurate, not "I tried to delete 6 things, half might've been
  // ghosts").
  const existing = [];
  for (const k of candidates) {
    try {
      if (await redis.exists(k)) existing.push(k);
    } catch { /* per-key best-effort */ }
  }
  if (!existing.length) return { deleted: usageRemoved, keys: [] };
  try {
    await redis.del(existing);
  } catch (err) {
    // Some redis clients don't support array DEL — fall back to per-key.
    for (const k of existing) {
      try { await redis.del(k); } catch { /* ignore */ }
    }
  }
  return { deleted: existing.length + usageRemoved, keys: existing };
}

// touchActivity — refresh the 90-day TTL on `buddy-blocks:<chatId>`,
// the only persistent per-user key. EXPIRE on a non-existent key is
// a no-op, so this is safe to call on every incoming message even
// for users who never opted into /buddy. After 90 days of silence
// Redis evicts the key automatically.
async function touchActivity(redis, chatId) {
  if (!redis || !chatId) return;
  try {
    if (!redis.isOpen) await redis.connect();
    await redis.expire(`buddy-blocks:${chatId}`, ACTIVITY_TTL_S);
  } catch { /* best-effort */ }
}

module.exports = {
  forgetUserData,
  touchActivity,
  plainKeys,
  hashedKeys,
  scanDailyKeys,
  removeUsageMembership,
  ACTIVITY_TTL_S
};
