// usage-log.js — v0.60.142
//
// Lightweight, identity-free-ish usage counters for the hidden
// `/oversight` admin dashboard. Redis-only; every write is
// fire-and-forget and never throws (the bot path must not be blocked
// by a stats hiccup). Per-user entries are one-way sha256 hashes
// (`hashChatId` from location-cache.js — the same scheme the bot
// already uses for `loc:` / `proc:`), used ONLY to de-duplicate the
// counts; no other data is attached to a user. `/forgetme` removes a
// user's hash from `usage:users` (see user-data.js).
//
// Keys:
//   usage:users                SET  — hashChatId for everyone who ever
//                                       interacted (no TTL). count = total users.
//   usage:dau:<YMD>            SET  90d — hashes active that day. count = DAU.
//   usage:search:<YMD>        SET  90d — hashes who did ≥1 search that day.
//   usage:searchmulti:<YMD>   SET  90d — hashes who did ≥2 searches that day. count = "frequent (>1)".
//   usage:cuisine             HASH      — cuisineName → search count (all-time).
//   usage:cuisine:<YMD>       HASH 90d  — cuisineName → search count that day.
//   usage:criteria            HASH      — flat key → count (all-time):
//                                          `filter:<name>` (each truthy filter),
//                                          `price:<n>`, `region:JB`, `freetext`,
//                                          `src:<chat-freetext|cuisine-tma|s|eat|surprise>`.
//   usage:criteria:<YMD>      HASH 90d  — same, that day.
//
// `<YMD>` is the UTC `YYYY-MM-DD` date — same convention as
// freetext-log.js's `freetext:log:<YMD>` keys (so the dashboard's
// per-day aggregation of free-text terms lines up with these). The
// /oversight dashboard surfaces this with a "dates are UTC; per-day
// data goes back 90 days; no backfill before tracking shipped" note.

'use strict';

const { hashChatId } = require('./location-cache');
const { dumpFreeTextLog } = require('./freetext-log');

const DAY_TTL_S = 90 * 24 * 60 * 60;

function ymd(d = new Date()) {
  return d.toISOString().slice(0, 10);
}
function ymdNDaysAgo(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return ymd(d);
}
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function dowOf(ymdStr) {
  // ymdStr = "YYYY-MM-DD" — interpret as UTC midnight.
  const [y, m, dd] = String(ymdStr).split('-').map(Number);
  if (!y) return '';
  return DOW[new Date(Date.UTC(y, (m || 1) - 1, dd || 1)).getUTCDay()] || '';
}

function ok(redis) {
  return !!(redis && redis.isOpen);
}
async function setCard(redis, key) {
  try {
    if (typeof redis.sCard === 'function') return Number(await redis.sCard(key)) || 0;
    const m = await redis.sMembers(key);
    return Array.isArray(m) ? m.length : 0;
  } catch { return 0; }
}
async function hAdd1(redis, key, field, ttlS) {
  try {
    if (typeof redis.hIncrBy === 'function') {
      await redis.hIncrBy(key, field, 1);
    } else {
      const cur = Number((await redis.hGet(key, field)) || 0);
      await redis.hSet(key, field, String(cur + 1));
    }
    if (ttlS) await redis.expire(key, ttlS).catch(() => {});
  } catch { /* best-effort */ }
}
async function sAddDay(redis, key, member) {
  try {
    await redis.sAdd(key, member);
    await redis.expire(key, DAY_TTL_S).catch(() => {});
  } catch { /* best-effort */ }
}

// ── writers (fire-and-forget) ───────────────────────────────────────

// Records that `chatId` interacted with the bot at all (any message /
// command / TMA call). Idempotent per day.
async function recordUser(redis, chatId) {
  if (!ok(redis) || !chatId) return;
  try {
    const h = hashChatId(chatId);
    await redis.sAdd('usage:users', h).catch(() => {});
    await sAddDay(redis, `usage:dau:${ymd()}`, h);
  } catch { /* best-effort */ }
}

// Records a "search" (Cuisine-TMA search, chat free-text dish search,
// /s, /eat, /surprise). Also bumps the user/DAU counters.
// criteria: { cuisines?: string[], filters?: object, prices?: (number|string)[], freeText?: string, src: string }
async function recordSearch(redis, chatId, criteria = {}) {
  if (!ok(redis) || !chatId) return;
  try {
    const h = hashChatId(chatId);
    const day = ymd();
    await redis.sAdd('usage:users', h).catch(() => {});
    await sAddDay(redis, `usage:dau:${day}`, h);
    // searcher / frequent-searcher: if already a searcher today → frequent.
    let already = 0;
    try { already = Number(await redis.sIsMember(`usage:search:${day}`, h)) || 0; } catch { already = 0; }
    if (already) await sAddDay(redis, `usage:searchmulti:${day}`, h);
    else await sAddDay(redis, `usage:search:${day}`, h);
    // cuisine + criteria popularity (all-time + per-day HASHes).
    const cuisines = Array.isArray(criteria.cuisines) ? criteria.cuisines : [];
    for (const c of cuisines) {
      const name = String(c || '').trim();
      if (!name) continue;
      await hAdd1(redis, 'usage:cuisine', name);
      await hAdd1(redis, `usage:cuisine:${day}`, name, DAY_TTL_S);
    }
    const critKeys = [];
    if (criteria.src) critKeys.push(`src:${String(criteria.src)}`);
    const filters = criteria.filters && typeof criteria.filters === 'object' ? criteria.filters : {};
    for (const [k, v] of Object.entries(filters)) {
      if (v === true || (typeof v === 'string' && v && v !== 'false') || (typeof v === 'number' && v)) critKeys.push(`filter:${k}`);
    }
    const prices = Array.isArray(criteria.prices) ? criteria.prices : [];
    for (const p of prices) { const n = String(p).trim(); if (n) critKeys.push(`price:${n}`); }
    if (criteria.region && String(criteria.region).toUpperCase() === 'JB') critKeys.push('region:JB');
    if (typeof criteria.freeText === 'string' && criteria.freeText.trim()) critKeys.push('freetext');
    for (const ck of critKeys) {
      await hAdd1(redis, 'usage:criteria', ck);
      await hAdd1(redis, `usage:criteria:${day}`, ck, DAY_TTL_S);
    }
  } catch { /* best-effort */ }
}

// ── reader (for GET /api/oversight/stats) ───────────────────────────

function topFromHash(obj, limit = 20) {
  return Object.entries(obj || {})
    .map(([k, v]) => ({ k, count: Number(v) || 0 }))
    .filter((e) => e.count > 0)
    .sort((a, b) => b.count - a.count || a.k.localeCompare(b.k))
    .slice(0, limit);
}

// getStats(redis, { date?, days? }) — `date` ("YYYY-MM-DD") picks one
// day; otherwise the trailing `days` days (default 7, clamped 1–90).
async function getStats(redis, { date = null, days = 7 } = {}) {
  const today = ymd();
  const n = Math.max(1, Math.min(90, Number(days) || 7));
  const dayList = date && /^\d{4}-\d{2}-\d{2}$/.test(date)
    ? [date]
    : Array.from({ length: n }, (_, i) => ymdNDaysAgo(n - 1 - i));   // oldest → today

  const stats = {
    totalUsers: 0,
    today: { date: today, active: 0, searchers: 0, frequent: 0 },
    byDay: [],
    byDayOfWeek: [],
    topCuisines: [],
    topCriteria: [],
    topFreeText: [],
    recentFreeText: [],
    note: 'Aggregate counts since tracking began (no backfill). Dates are UTC; per-day data goes back 90 days. Per-user entries are sha256 hashes used only to de-dup counts; removed on /forgetme.',
  };
  if (!ok(redis)) return stats;

  stats.totalUsers = await setCard(redis, 'usage:users');
  stats.today.active = await setCard(redis, `usage:dau:${today}`);
  stats.today.searchers = await setCard(redis, `usage:search:${today}`);
  stats.today.frequent = await setCard(redis, `usage:searchmulti:${today}`);

  // per-day rows
  for (const d of dayList) {
    const [active, searchers, frequent] = await Promise.all([
      setCard(redis, `usage:dau:${d}`),
      setCard(redis, `usage:search:${d}`),
      setCard(redis, `usage:searchmulti:${d}`),
    ]);
    stats.byDay.push({ date: d, dow: dowOf(d), active, searchers, frequent });
  }
  // day-of-week averages over the window
  const dowAcc = {};
  for (const r of stats.byDay) {
    if (!dowAcc[r.dow]) dowAcc[r.dow] = { dow: r.dow, sumActive: 0, sumFrequent: 0, count: 0 };
    dowAcc[r.dow].sumActive += r.active; dowAcc[r.dow].sumFrequent += r.frequent; dowAcc[r.dow].count += 1;
  }
  stats.byDayOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    .filter((d) => dowAcc[d])
    .map((d) => ({ dow: d, avgActive: Math.round((dowAcc[d].sumActive / dowAcc[d].count) * 10) / 10, avgFrequent: Math.round((dowAcc[d].sumFrequent / dowAcc[d].count) * 10) / 10 }));

  // cuisine + criteria popularity — per-day if a single `date`, else all-time
  try {
    const cuisineKey = date ? `usage:cuisine:${date}` : 'usage:cuisine';
    const critKey = date ? `usage:criteria:${date}` : 'usage:criteria';
    stats.topCuisines = topFromHash(await redis.hGetAll(cuisineKey), 20).map((e) => ({ name: e.k, count: e.count }));
    stats.topCriteria = topFromHash(await redis.hGetAll(critKey), 20).map((e) => ({ key: e.k, count: e.count }));
  } catch { /* best-effort */ }

  // free-text terms — aggregate the per-day freetext:log:<YMD> lists
  // for the window (or the single day); plus a recent-tail dump.
  try {
    const counts = new Map();
    for (const d of dayList) {
      let entries = [];
      try { entries = await redis.lRange(`freetext:log:${d}`, 0, -1); } catch { entries = []; }
      for (const raw of (entries || [])) {
        let q = '';
        try { q = (JSON.parse(raw).q || '').trim().toLowerCase(); } catch { q = String(raw).trim().toLowerCase(); }
        if (!q) continue;
        counts.set(q, (counts.get(q) || 0) + 1);
      }
    }
    stats.topFreeText = [...counts.entries()]
      .map(([term, count]) => ({ term, count }))
      .filter((e) => e.count > 0)
      .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
      .slice(0, 30);
  } catch { /* best-effort */ }
  try { stats.recentFreeText = await dumpFreeTextLog(redis, 50); } catch { stats.recentFreeText = []; }

  return stats;
}

module.exports = {
  recordUser,
  recordSearch,
  getStats,
  _ymd: ymd,
  _DAY_TTL_S: DAY_TTL_S,
};
