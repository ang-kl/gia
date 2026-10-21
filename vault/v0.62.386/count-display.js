// count-display.js — v0.61.169
//
// Display-side helpers for the Periodical count system. Reads the
// latest `count:history:<item>` entry and formats it for the
// marketing strings shown to users:
//
//   /start intro                  → "{n}+ cuisines, …"
//   setMyCommands description     → "Plus de {hawker} hawker centres"
//   /api/cuisine/counts endpoint  → JSON `{ cuisines, hawker, michelin, … }`
//
// Falls back to hardcoded baselines when:
//   - Redis isn't open, or
//   - the item has no count:history entry yet (fresh deployment
//     before the Periodical scheduler has seeded anything).
//
// The fallback values match the prior hardcoded marketing copy so
// behaviour is preserved when the count system isn't seeded.
//
// Surface:
//   FALLBACK            — { cuisines, hawker, michelin, … }
//   getDisplayCount(redis, item) → integer (live or fallback)
//   getDisplayCounts(redis)      → object map of all items
//   formatCountPlus(redis, item) → '50+' (rounds DOWN to nearest 5)
//   formatAllCountsPlus(redis)   → object map of '50+' strings
//   substituteCounts(template, counts) → string with `{cuisines}` etc. replaced

'use strict';

const { getCurrentCount, ITEMS } = require('./count-history');

// Hardcoded baselines that mirror the prior marketing strings.
// Used when Redis miss / no history entry. Operator can adjust by
// running the Periodical Re-check (the new entry overrides this).
const FALLBACK = Object.freeze({
  'cuisines':           55,
  'michelin':           170,
  'hawker':             100,
  'healthier-eateries': 100,
  'buildings':          1000,
  'bus-stops':          5500,
  'train-stations':     150,
  'train-lines':        6,
  'carparks':           2000,
  'parks':              350,
  'attractions':        100,
  'clinics':            1200,
  'hospitals':          25,
  'police':             45,
  // v0.61.178 — total SG venue count across the 48-cuisine subset
  // (cuisine-venue-counts.js). NOT a Periodical count-history item;
  // sourced from the cuisine-venue-counts:latest Redis blob written
  // by v0.61.177's owner-triggered chat sweep. Fallback 600 is a
  // rough estimate (most non-saturating cuisines × ~10-20 venues
  // each).
  'cuisine-venues':     600
});

// v0.61.178 — read the cumulative total from the cuisine-venue-
// counts module's Redis layer (single JSON blob, separate from
// count-history). Defensive: any error / missing total / unparseable
// JSON falls back to FALLBACK baseline.
async function _getCuisineVenuesCount(redis) {
  try {
    const cvc = require('./cuisine-venue-counts');
    const latest = await cvc.loadFromRedis(redis);
    if (latest && Number.isFinite(latest.total) && latest.total > 0) return latest.total;
  } catch { /* fall through */ }
  return FALLBACK['cuisine-venues'];
}

async function getDisplayCount(redis, item) {
  // v0.61.178 — cuisine-venues lives in a separate Redis key from
  // the count-history ZSETs; route to the cvc loader.
  if (item === 'cuisine-venues') return _getCuisineVenuesCount(redis);
  const cur = await getCurrentCount(redis, item);
  if (cur && Number.isFinite(cur.n) && cur.n > 0) return cur.n;
  if (Object.prototype.hasOwnProperty.call(FALLBACK, item)) return FALLBACK[item];
  return 0;
}

async function getDisplayCounts(redis) {
  const out = {};
  for (const item of ITEMS) {
    out[item] = await getDisplayCount(redis, item);
  }
  // v0.61.178 — cuisine-venues isn't part of count-history.ITEMS;
  // surface it alongside the 14 standard items.
  out['cuisine-venues'] = await getDisplayCount(redis, 'cuisine-venues');
  return out;
}

// Rounds DOWN to the nearest 5 so the marketing string ("50+",
// "100+") doesn't flicker between 55 and 56 on a small recount.
// Returns the raw value for counts < 10 (no rounding for sparse).
function _roundDownToFive(n) {
  if (!Number.isFinite(n) || n < 10) return n;
  return Math.floor(n / 5) * 5;
}

async function formatCountPlus(redis, item) {
  const n = await getDisplayCount(redis, item);
  const rounded = _roundDownToFive(n);
  return `${rounded}+`;
}

async function formatAllCountsPlus(redis) {
  const out = {};
  for (const item of ITEMS) {
    out[item] = await formatCountPlus(redis, item);
  }
  // v0.61.178 — include cuisine-venues alongside the 14 standard items.
  out['cuisine-venues'] = await formatCountPlus(redis, 'cuisine-venues');
  return out;
}

// Substitutes `{item}` placeholders in a template with the
// formatted "N+" strings. The substitute is purely string-based
// so callers can compose templates without depending on this
// module's escaping. Unknown placeholders are left untouched
// (so a template `{foo}+ items` doesn't crash if foo isn't an
// ITEM).
function substituteCounts(template, counts) {
  if (typeof template !== 'string' || !counts || typeof counts !== 'object') return template;
  return template.replace(/\{([a-z0-9-]+)\}/gi, (m, key) => {
    if (Object.prototype.hasOwnProperty.call(counts, key)) {
      const v = counts[key];
      return v == null ? m : String(v);
    }
    return m;
  });
}

module.exports = {
  FALLBACK,
  getDisplayCount,
  getDisplayCounts,
  formatCountPlus,
  formatAllCountsPlus,
  substituteCounts
};
