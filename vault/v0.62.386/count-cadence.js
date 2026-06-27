// count-cadence.js — v0.61.166
//
// Per-item cadence config for the Periodical scheduler. Operator's
// spec from the in-chat design: every item can be set to one of:
//
//   'manual'    — never auto-recount; only operator taps trigger it.
//                 The schema default.
//   '4-monthly' — re-count when ≥ 120 days have elapsed since the
//                 latest history entry.
//   'yearly'    — re-count when ≥ 365 days have elapsed.
//   'off'       — never auto-recount AND don't show in scheduler
//                 logs (operator explicitly suppressed).
//
// Storage: a single Redis key per item, `count:cadence:<item>`,
// value = one of the 4 strings above. No TTL (cadence persists
// until the operator changes it via the /ver Periodical sub-menu).
// Missing key → 'manual' (preserves the v0.61.164/.165 behaviour
// for users who never set anything).

'use strict';

const VALUES = Object.freeze(['manual', '4-monthly', 'yearly', 'off']);
const DEFAULT_VALUE = 'manual';
const KEY_PREFIX = 'count:cadence:';

const DAYS_4_MONTHLY = 120;
const DAYS_YEARLY = 365;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function _key(item) { return `${KEY_PREFIX}${item}`; }

function isValidValue(v) {
  return typeof v === 'string' && VALUES.includes(v);
}

// Returns the cadence string for an item. Falls back to the default
// when the key is missing / redis is closed / parse fails. Never
// throws.
async function getCadence(redis, item) {
  if (!redis || !redis.isOpen) return DEFAULT_VALUE;
  if (typeof item !== 'string' || !item) return DEFAULT_VALUE;
  try {
    const raw = await redis.get(_key(item));
    if (isValidValue(raw)) return raw;
    return DEFAULT_VALUE;
  } catch {
    return DEFAULT_VALUE;
  }
}

// Persists the cadence value. Returns true on success, false on
// invalid value / redis miss. No TTL — cadence is sticky until
// explicitly changed.
async function setCadence(redis, item, value) {
  if (!redis || !redis.isOpen) return false;
  if (typeof item !== 'string' || !item) return false;
  if (!isValidValue(value)) return false;
  try {
    await redis.set(_key(item), value);
    return true;
  } catch {
    return false;
  }
}

// Returns a Map<item, cadence> for every item in `items`. The
// `count-scheduler` calls this once per tick to avoid 14 sequential
// reads when the scheduler decides which items are due.
async function listAll(redis, items) {
  const out = new Map();
  if (!Array.isArray(items)) return out;
  for (const item of items) {
    out.set(item, await getCadence(redis, item));
  }
  return out;
}

// Returns the recount interval in milliseconds for a cadence value,
// or `null` when the cadence is 'manual' / 'off' (i.e. never
// auto-recount). The scheduler compares this to (now - lastTs) to
// decide if an item is due.
function intervalMs(value) {
  if (value === '4-monthly') return DAYS_4_MONTHLY * MS_PER_DAY;
  if (value === 'yearly')    return DAYS_YEARLY * MS_PER_DAY;
  return null;
}

module.exports = {
  VALUES,
  DEFAULT_VALUE,
  DAYS_4_MONTHLY,
  DAYS_YEARLY,
  isValidValue,
  getCadence,
  setCadence,
  listAll,
  intervalMs
};
