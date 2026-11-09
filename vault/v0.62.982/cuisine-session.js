// cuisine-session.js — v0.60.146
//
// Per-Cuisine-TMA-session state held in Redis. Distinct from
// `clip:<chatId>` (clip-store.js — 100-entry /clip recall) and from
// `cuisine:seen:<chatId>:<criteriaHash>` (index.js — long-lived
// per-criteria dedup). This is a *short-lived session clipboard*:
//
//   - The user opens the Cuisine TMA → `startSession()` wipes the
//     session-seen set + the page history.
//   - Each `/api/cuisine/search` response is `recordPage`'d → its
//     placeIds go into a SET (cap 80, refuses past 80 → terminal),
//     its slim payload is LPUSH'd onto a LIST (cap 10 — enough for
//     the back-FAB to walk back from "you've seen the 80 maximum"
//     to the first page).
//   - `popPage()` pops the head of the list, returning the page that
//     was on screen BEFORE the most recent one — so the back-FAB
//     walks the user back through prior result lists until #1.
//
// Every helper is fire-and-forget and never throws, mirroring the
// discipline in usage-log.js / clip-store.js.
//
// Redis keys:
//   cuisine:session-seen:<chatId>     SET   30 min TTL — capped at 80 placeIds
//   cuisine:session-pages:<chatId>    LIST  30 min TTL — capped at 10 page JSON blobs (LPUSH at head; LPOP at head for "back")
//   cuisine:session-meta:<chatId>     HASH  30 min TTL — started_at, last_search_at, total_served

'use strict';

const SESSION_TTL_S = 30 * 60;       // 30 minutes
// v0.61.170 — operator bumped cap 80 → 100 alongside the 24/12
// pagination model. 24 + 8 × 12 ≈ 120 max if every tap is full;
// 100 cap means recycle prompt typically lands around tap 7-8.
const SEEN_CAP = 100;                // operator's "cap to 100"
const PAGES_CAP = 10;                // ~100 / 12 ≈ 9; allow a buffer for retries

function ok(redis) { return !!(redis && redis.isOpen); }

function keys(chatId) {
  return {
    seen:  `cuisine:session-seen:${chatId}`,
    pages: `cuisine:session-pages:${chatId}`,
    meta:  `cuisine:session-meta:${chatId}`,
  };
}

async function startSession(redis, chatId) {
  if (!ok(redis) || !chatId) return { started: false };
  const k = keys(chatId);
  try {
    await redis.del(k.seen).catch(() => {});
    await redis.del(k.pages).catch(() => {});
    await redis.del(k.meta).catch(() => {});
    const now = String(Date.now());
    try { await redis.hSet(k.meta, { started_at: now, last_search_at: now, total_served: '0' }); } catch { /* best-effort */ }
    try { await redis.expire(k.meta, SESSION_TTL_S); } catch { /* best-effort */ }
  } catch { /* best-effort */ }
  return { started: true };
}

async function seenCount(redis, chatId) {
  if (!ok(redis) || !chatId) return 0;
  try {
    if (typeof redis.sCard === 'function') return Number(await redis.sCard(keys(chatId).seen)) || 0;
    const m = await redis.sMembers(keys(chatId).seen);
    return Array.isArray(m) ? m.length : 0;
  } catch { return 0; }
}

async function getSeen(redis, chatId) {
  if (!ok(redis) || !chatId) return new Set();
  try {
    const ids = await redis.sMembers(keys(chatId).seen);
    return new Set(Array.isArray(ids) ? ids : []);
  } catch { return new Set(); }
}

async function isExhausted(redis, chatId, cap = SEEN_CAP) {
  return (await seenCount(redis, chatId)) >= cap;
}

// recordPage — append placeIds to the session-seen SET (with cap-check)
// and LPUSH the payload onto the page history. Returns
//   { seenCount, capped, depth }
// where `capped` is true when this batch pushed the SET past SEEN_CAP
// (the caller should set exhausted/sessionFull in that case) and
// `depth` is the page-history length after the LPUSH.
// v0.60.149 — opts.skipCap: when true, page placeIds are NOT added to
// the session-seen SET (so they don't count toward the 80-cap) but
// the page IS still LPUSH'd onto the history list so the ⇠ Prev FAB
// works. Used by the Michelin path, whose curated list (~130 entries)
// needs a longer walk than the cuisine-chip 80-cap allows.
async function recordPage(redis, chatId, payload, opts = {}) {
  const skipCap = opts && opts.skipCap === true;
  const out = { seenCount: 0, capped: false, depth: 0 };
  if (!ok(redis) || !chatId || !payload) return out;
  const k = keys(chatId);
  try {
    const ids = Array.isArray(payload.venues)
      ? payload.venues.map((v) => v && v.placeId).filter(Boolean)
      : [];
    const before = await seenCount(redis, chatId);
    if (ids.length && !skipCap) {
      try { await redis.sAdd(k.seen, ids); await redis.expire(k.seen, SESSION_TTL_S); } catch { /* best-effort */ }
    }
    const after = skipCap ? before : await seenCount(redis, chatId);
    out.seenCount = after;
    out.capped = skipCap ? false : (after >= SEEN_CAP);
    // page history — slim JSON, capped at PAGES_CAP entries (newest at
    // index 0). Skipped on the empty-batch case (exhausted responses).
    if (ids.length && typeof redis.lPush === 'function') {
      try {
        await redis.lPush(k.pages, JSON.stringify({
          ts: payload.ts || Date.now(),
          criteriaHash: payload.criteriaHash || '',
          venues: payload.venues,
          meta: payload.meta || {}
        }));
        if (typeof redis.lTrim === 'function') await redis.lTrim(k.pages, 0, PAGES_CAP - 1);
        await redis.expire(k.pages, SESSION_TTL_S);
      } catch { /* best-effort */ }
    }
    try { await redis.hSet(k.meta, { last_search_at: String(Date.now()), total_served: String(after) }); } catch { /* best-effort */ }
    try { await redis.expire(k.meta, SESSION_TTL_S); } catch { /* best-effort */ }
    try {
      if (typeof redis.lLen === 'function') out.depth = Number(await redis.lLen(k.pages)) || 0;
      else if (typeof redis.lRange === 'function') { const all = await redis.lRange(k.pages, 0, -1); out.depth = Array.isArray(all) ? all.length : 0; }
    } catch { /* best-effort */ }
    void before;
  } catch { /* best-effort */ }
  return out;
}

// popPage — LPOP the head of the page-history. Returns the popped page
// (parsed JSON) or null when the history is empty / pop fails.
// IMPORTANT: this does NOT trim the session-seen SET. The user saw
// those venues — they remain dedup'd going forward. This is a
// navigation aid, not a dedup reset (use `startSession` or the
// existing "↺ Start over" per-criteria reset for that).
async function popPage(redis, chatId) {
  if (!ok(redis) || !chatId) return null;
  const k = keys(chatId);
  try {
    let raw = null;
    if (typeof redis.lPop === 'function') raw = await redis.lPop(k.pages);
    if (!raw) return null;
    return JSON.parse(String(raw));
  } catch { return null; }
}

async function depth(redis, chatId) {
  if (!ok(redis) || !chatId) return 0;
  try {
    if (typeof redis.lLen === 'function') return Number(await redis.lLen(keys(chatId).pages)) || 0;
    if (typeof redis.lRange === 'function') {
      const all = await redis.lRange(keys(chatId).pages, 0, -1);
      return Array.isArray(all) ? all.length : 0;
    }
  } catch { /* best-effort */ }
  return 0;
}

module.exports = {
  startSession,
  recordPage,
  popPage,
  seenCount,
  getSeen,
  isExhausted,
  depth,
  _SEEN_CAP: SEEN_CAP,
  _PAGES_CAP: PAGES_CAP,
  _SESSION_TTL_S: SESSION_TTL_S,
};
