// user-data.js — v0.62.898
//
// Self-service erasure (/forgetme) and inactivity TTL refresh.
//
// ⚠ THE HEADER THIS REPLACES WAS THE DEFECT. It listed eight keys and read as if it were the
// whole inventory. It was not: the app writes about forty per-chat namespaces and this module
// deleted SEVEN. Measured before the fix — 29 seeded, 7 deleted, 22 survived — including the
// entire `cab:*` cabinet tree, `rating-pref`, `country-pref`, `user:<id>:lang`, `userlocale:`,
// `recent-locations:` and `search-conv:`, which holds the user's own typed messages.
//
// ⚠ AND THE ORDER MADE IT WORSE THAN A GAP. It deleted `clip:<chatId>` — the INDEX — without the
// card hashes it points at, while `clip-store.js recomputeCardTtl` sets a favourited card to
// PERSIST: no TTL, ever. Asking to be forgotten therefore left favourited cards on disk
// permanently with nothing pointing at them — unreachable AND undeletable. Erasure created the
// orphan it was supposed to prevent.
//
// `/privacy` says, in nine locales: "You can clear your stored data at any time by typing
// /forgetme." That is a published commitment, which is why this is a fix and not a feature.
//
// THE SHAPE OF THE FIX. Three lists and one exemption table, all EXPORTED so a test asserts them
// by calling rather than by reading this comment — because a comment is what went stale:
//
//   plainKeys(chatId)    exact keys under the raw chatId
//   hashedKeys(chatId)   exact keys under hashChatId() — sha256, first 16 hex. ONE encoding;
//                        loc:, loc:pending:, proc:, seen:, userlocale: and drift-suppress: all
//                        use it, verified rather than assumed.
//   scanPatterns(chatId) glob patterns for the families (cards, cabinets, cuisine state …)
//   ERASURE_EXEMPT       namespace → reason, for what deliberately is NOT erased
//
// SCAN RATHER THAN FOLLOW THE INDEX, deliberately. Reading `clip:<chatId>` to find the cards
// would fix the ordering bug and nothing else. SCAN also collects the orphans that ALREADY exist
// from every /forgetme run before this one, so a user erased last month is cleaned up the next
// time they ask. It makes ordering irrelevant instead of merely correct.
//
// ⚠ EVERY PATTERN TERMINATES THE chatId. `cuisine:*:<chatId>*` would also match chat 1000000019
// when erasing 100000001 — Telegram ids are numeric and one can be a prefix of another. (Both are
// SYNTHETIC stand-ins: this repo is public and a real chat id identifies a real person, so
// __tests__/no-owner-chat-id.test.js forbids the one that used to sit here. The pair keeps the
// prefix relationship the example needs.) So the
// patterns are `…:<chatId>` (exact) and `…:<chatId>:*`, never a bare trailing wildcard, and a
// test asserts it.
//
// Aggregate-usage SETs hold this user's sha256 as a bare member with no value attached; those
// are handled by removeUsageMembership, not by key deletion. usage:cuisine / usage:criteria are
// name→count HASHes with no per-user attribution at all — nothing there to erase.

const { hashChatId } = require('./location-cache');

const ACTIVITY_TTL_S = 90 * 24 * 60 * 60; // 90 days

// Static keys under the raw chatId (one DEL each).
function plainKeys(chatId) {
  return [
    // clipboard — the index and the two list heads. The CARDS are scanned, see scanPatterns.
    `clip:${chatId}`,
    `clip_archive:${chatId}`,
    `clip:rename-pending:${chatId}`,
    `cab:${chatId}`,
    // durable preferences the user deliberately set
    `rating-pref:${chatId}`,
    `country-pref:${chatId}`,
    `user:${chatId}:lang`,
    `user:${chatId}:country`,
    `recent-locations:${chatId}`,
    `verbose:${chatId}`,
    // the user's own typed messages — /s conversation history, up to 16 turns
    `search-conv:${chatId}`,
    // what was shown: rotation + dedup state
    `recent-picks:${chatId}`,
    `michelin:walk:seen:${chatId}`,
    `michelin:walk:meta:${chatId}`,
    `funfact:lastSeen:${chatId}`,
    // transient flow state
    `locconf:${chatId}`,
    `drift-pending:${chatId}`,
    `wake:pending:${chatId}`,
    `wake2:offer:${chatId}`,
    `degraded:notice:${chatId}`,
    // buddy — the feature is retired (index.js:4140-4145 commented out) but old keys persist
    `buddy-optin:${chatId}`,
    `buddy-blocks:${chatId}`
  ];
}

// Static keys under hashChatId() — sha256 truncated to 16 hex. There is exactly ONE hashed
// encoding in the codebase; location-locale.js defines its own `_hashChatId` but it is the same
// function, which was verified by computing both rather than by reading them.
function hashedKeys(chatId) {
  const h = hashChatId(chatId);
  return [
    `loc:${h}`,
    `loc:pending:${h}`,
    `proc:${h}`,
    `seen:${h}`,             // last-activity epoch — drives the wake-from-idle prompt
    `userlocale:${h}`,       // registered SG/JB/OTHER locale record
    `drift-suppress:${h}`    // "don't re-ask about this location" — a USER CHOICE
  ];
}

// Families that need a SCAN. Every pattern terminates the chatId with `:` or end-of-string, so
// erasing 100000001 cannot reach 1000000019 — see the header.
function scanPatterns(chatId) {
  return [
    `card:${chatId}:*`,               // the clipboard cards themselves (PERSIST when favourited)
    `card_locs:${chatId}:*`,          // which drawers each card sits in
    `cab:${chatId}:*`,                // the whole cabinet tree: cabinets, drawers, :default
    `country-pref:${chatId}:dev:*`,   // per-device country overrides
    `cuisine:*:${chatId}`,            // session-seen / session-pages / session-meta / sg-dishes
    `cuisine:*:${chatId}:*`,          // seen / variant / pool / recycle, keyed by criteria hash
    `chat-freetext:seen:${chatId}:*`,
    `pick-cache:${chatId}:*`,
    `place:anchor:${chatId}:*`,
    `buddy-day:${chatId}:*`,
    `tell-gia:rl:${chatId}:*`,
    `idem:cuisine:${chatId}:*`,
    `gia:rl:*:${chatId}:*`            // generic per-endpoint rate-limit counters
  ];
}

// What is deliberately NOT erased, and why. The reasons come from a fixed set the test enforces,
// so "we decided not to" always has a stated shape rather than being an omission that looks like
// a decision — which is precisely how the previous seven-of-forty list read.
const ERASURE_EXEMPT = Object.freeze({
  'usage:users': 'aggregate-no-per-user-attribution',
  'usage:dau': 'aggregate-no-per-user-attribution',
  'usage:cuisine': 'aggregate-no-per-user-attribution',
  'usage:criteria': 'aggregate-no-per-user-attribution',
  'freetext:log': 'aggregate-no-per-user-attribution',
  'chat-freetext:query': 'not-enumerable-by-chatid',
  'cuisine-request': 'holds-chatid-as-a-field-not-in-the-key',
  'buddy-intent': 'dead-code-no-writer',
  'buddy-offer': 'dead-code-no-writer'
});

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
  // v0.62.898 — the scanned families join the two static lists. `scanDailyKeys` is retained and
  // still exported for back-compat, but its one pattern now lives in `scanPatterns` with the
  // others so there is a single place to add a namespace and a single list for the test to check.
  const scanned = [];
  for (const pattern of scanPatterns(chatId)) {
    scanned.push(...(await scanKeys(redis, pattern)));
  }
  const candidates = [
    ...plainKeys(chatId),
    ...hashedKeys(chatId),
    ...scanned
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
  scanPatterns,
  ERASURE_EXEMPT,
  scanDailyKeys,
  removeUsageMembership,
  ACTIVITY_TTL_S
};
