// count-history.js — v0.61.164
//
// Reference-count persistence layer for the `/ver Periodical`
// owner sub-menu. Each tracked item (cuisines, michelin, hawker,
// bus-stops, …) has a Redis ZSET history capped at the 12 newest
// entries. Each entry is JSON `{n, source, notes, ts}`.
//
// Storage schema:
//   Key:   count:history:<item>
//   Type:  ZSET
//   Score: epoch ms (entry.ts)
//   Value: JSON-encoded { n, source, notes, ts }
//   Cap:   12 newest entries (ZREMRANGEBYRANK keeps tail-12)
//
// Semantics (operator answers Q1/Q2):
//   - Re-counting writes a NEW entry — the newest is always the
//     "current" value.
//   - Revert writes a NEW entry that copies the prior count's `n`
//     with source='revert'. The source-of-truth file/API is NOT
//     mutated (operator's Q2 (a)). The displayed string just
//     resolves to the newest entry.
//   - The 12-cap means a long history of reverts naturally rotates
//     out the oldest non-revert entries; that's the operator's
//     ask ("up to 12 versions").
//
// This module is the pure data layer. The 14 recount fns live in
// `count-recount.js`. The `/ver Periodical` UI lands in v0.61.165;
// the cron scheduler in v0.61.166.

'use strict';

const HISTORY_CAP = 12;
const KEY_PREFIX = 'count:history:';

// Operator's final 14 items (Q1: "all 14 in one go").
const ITEMS = Object.freeze([
  'cuisines',
  'michelin',
  'hawker',
  'healthier-eateries',
  'buildings',
  'bus-stops',
  'train-stations',
  'train-lines',
  'carparks',
  'parks',
  'attractions',
  'clinics',
  'hospitals',
  'police'
]);

const ITEM_SET = new Set(ITEMS);

function _key(item) {
  return `${KEY_PREFIX}${item}`;
}

// Validate one of the 14 known items. Unknown items are not
// auto-rejected (the schema can support new items without code
// changes); the strict guard is for the recount dispatcher in
// count-recount.js.
function isKnownItem(item) {
  return typeof item === 'string' && ITEM_SET.has(item);
}

// Record a new count entry. Returns the entry object on success,
// null on any redis / arg failure. `source` describes what triggered
// the recount: 'manual' (operator tap), '4-monthly' / 'yearly' (cron),
// 'revert' (revert-to-prior), or any string the caller supplies.
// `notes` is a free-form string captured alongside the count for
// the history view (e.g. "before LTA refresh" / "after JB MRT add").
async function recordCount(redis, item, n, source = 'manual', notes = '') {
  if (!redis || !redis.isOpen) return null;
  if (typeof item !== 'string' || !item) return null;
  if (!Number.isFinite(n) || n < 0) return null;
  const entry = {
    n,
    source: typeof source === 'string' ? source : 'manual',
    notes: typeof notes === 'string' ? notes : '',
    ts: Date.now()
  };
  try {
    await redis.zAdd(_key(item), { score: entry.ts, value: JSON.stringify(entry) });
    // Cap to HISTORY_CAP newest. ZREMRANGEBYRANK removes from the
    // LOW end; -HISTORY_CAP-1 keeps the top 12.
    await redis.zRemRangeByRank(_key(item), 0, -HISTORY_CAP - 1);
    return entry;
  } catch {
    return null;
  }
}

// Returns the history (newest first). Empty array on no history /
// redis miss / corrupt entries.
async function getHistory(redis, item) {
  if (!redis || !redis.isOpen) return [];
  if (typeof item !== 'string' || !item) return [];
  try {
    const raw = await redis.zRange(_key(item), 0, -1, { REV: true });
    const arr = Array.isArray(raw) ? raw : [];
    return arr
      .map((s) => { try { return JSON.parse(s); } catch { return null; } })
      .filter((e) => e && typeof e === 'object' && Number.isFinite(e.n));
  } catch {
    return [];
  }
}

// Returns the newest entry or null. The "current" displayed count.
async function getCurrentCount(redis, item) {
  const h = await getHistory(redis, item);
  return h.length ? h[0] : null;
}

// Revert to a historical entry (matched by `ts`). Writes a NEW
// entry with source='revert' so the history surfaces the revert
// event. Returns the new entry on success, or null when no entry
// with that ts exists.
async function revertTo(redis, item, ts) {
  if (!Number.isFinite(ts)) return null;
  const h = await getHistory(redis, item);
  const target = h.find((e) => e.ts === ts);
  if (!target) return null;
  return recordCount(redis, item, target.n, 'revert', `reverted to ts=${ts} (n=${target.n})`);
}

// Clear the entire history for an item. Owner-only; used by the
// /ver Periodical sub-menu when the operator wants to start fresh.
async function clearHistory(redis, item) {
  if (!redis || !redis.isOpen) return false;
  if (typeof item !== 'string' || !item) return false;
  try {
    await redis.del(_key(item));
    return true;
  } catch {
    return false;
  }
}

module.exports = {
  HISTORY_CAP,
  ITEMS,
  isKnownItem,
  recordCount,
  getHistory,
  getCurrentCount,
  revertTo,
  clearHistory
};
