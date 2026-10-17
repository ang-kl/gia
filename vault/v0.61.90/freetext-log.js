// freetext-log.js — v0.60.131
//
// Identity-free backend log of free-text dish/cuisine search terms, so
// the operator can see WHAT people type (and extend the misrepresented-
// dish / cooking-method / dessert-drink tables, tune the question
// guard, and catch recurring failures) — never WHO typed it.
//
// What's stored per entry: { q: <≤80 chars>, ts: <epoch ms>, src:
// 'chat' | 'cuisine-tma' | '/s', chip: <bool, was a cuisine chip
// active>, m: <what matched: 'misrep' | 'cooking-method' | 'red' |
// 'dessert-drink' | 'question-declined' | null>, n: <result count or
// null> }. NO chatId, no user identifier.
//
// Storage: a global capped list `freetext:log` (LPUSH + LTRIM to the
// last LOG_CAP entries) for the quick /ftlog dump, plus a per-day list
// `freetext:log:YYYY-MM-DD` (RPUSH, 90-day TTL) for time-bucketed
// review. Both writes are fire-and-forget — any failure is swallowed
// (the search must never be blocked by logging).

'use strict';

const GLOBAL_KEY = 'freetext:log';
const LOG_CAP = 5000;
const DAY_TTL_S = 90 * 24 * 60 * 60;   // v0.60.132 — aligned with the 90-day inactivity-retention promise in /privacy

function dayKey(d = new Date()) {
  const iso = d.toISOString().slice(0, 10); // YYYY-MM-DD
  return `freetext:log:${iso}`;
}

// Fire-and-forget. `text` is the raw user input; `meta` = { src, chip,
// matchedKnownTerm, resultCount }.
function logFreeTextQuery(redis, text, meta = {}) {
  try {
    if (!redis || !redis.isOpen) return;
    const q = String(text || '').trim().slice(0, 80);
    if (!q) return;
    const entry = JSON.stringify({
      q,
      ts: Date.now(),
      src: typeof meta.src === 'string' ? meta.src : 'chat',
      chip: meta.chip === true,
      m: typeof meta.matchedKnownTerm === 'string' ? meta.matchedKnownTerm : null,
      n: Number.isFinite(meta.resultCount) ? meta.resultCount : null,
    });
    // global capped list — also given the 90-day TTL (refreshed on
    // each write) so it self-clears after 90 days of inactivity, in
    // line with the /privacy retention promise.
    redis.lPush(GLOBAL_KEY, entry)
      .then(() => redis.lTrim(GLOBAL_KEY, 0, LOG_CAP - 1))
      .then(() => redis.expire(GLOBAL_KEY, DAY_TTL_S))
      .catch(() => {});
    // per-day list with TTL
    const dk = dayKey();
    redis.rPush(dk, entry)
      .then(() => redis.expire(dk, DAY_TTL_S))
      .catch(() => {});
  } catch { /* never throw from logging */ }
}

// Read back the most-recent `n` entries (newest first), parsed.
async function dumpFreeTextLog(redis, n = 50) {
  try {
    if (!redis || !redis.isOpen) return [];
    const limit = Math.max(1, Math.min(500, Number(n) || 50));
    const raw = await redis.lRange(GLOBAL_KEY, 0, limit - 1);
    return raw.map((s) => { try { return JSON.parse(s); } catch { return { q: s }; } });
  } catch {
    return [];
  }
}

module.exports = { logFreeTextQuery, dumpFreeTextLog, _GLOBAL_KEY: GLOBAL_KEY, _LOG_CAP: LOG_CAP };
