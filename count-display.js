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
  'police':             45
});

async function getDisplayCount(redis, item) {
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
