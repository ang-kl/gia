// pool-floor.js — v0.61.441
//
// One shared "a gate demotes, never empties" helper for the cuisine-
// search pipeline.
//
// Background (gate audit, Phase 0): the route had grown SIX independent,
// incident-driven anti-collapse floors — JB-restore, OTHER stale-pref
// floor, newlyOpened floor-to-bias, applyRatingFloor's never-empty
// guard, the special-mode generic fallback, and a (removed) petFriendly
// `<3 keep all`. Each new gate re-discovered that filtering to zero is a
// worse user experience than showing slightly-off results, and bolted on
// its own one-off floor. This module gives them ONE rule.
//
//   demoteNeverEmpty(filtered, fallbackPool, { min, byDistance })
//     - When `filtered` already has >= min items, it is returned as-is.
//     - When a gate emptied (or thinned) `filtered` below `min`, top it
//       up from `fallbackPool` (the pre-gate pool) — nearest-first when
//       `byDistance` is set — deduping by placeId/name, until it reaches
//       `min` or the fallback is exhausted.
//     - min defaults to 1: the classic "never return an empty list"
//       (identical to `kept.length ? kept : input`).
//     - min: 2 powers the operator's "never show just 1 result" rule —
//       a lone survivor is replaced/augmented by the next nearest picks.

'use strict';

function keyOf(v) {
  if (!v) return '';
  return v.placeId || v.id || v.name || '';
}

function demoteNeverEmpty(filtered, fallbackPool, opts = {}) {
  const min = Number.isFinite(opts.min) && opts.min > 0 ? Math.floor(opts.min) : 1;
  const arr = Array.isArray(filtered) ? filtered.slice() : [];
  if (arr.length >= min) return arr;

  const fb = Array.isArray(fallbackPool) ? fallbackPool : [];
  if (!fb.length) return arr;

  // Classic never-empty: when nothing survived and min is 1, hand back
  // the whole fallback pool (the historical `kept.length ? kept : input`).
  if (min <= 1 && arr.length === 0) return fb.slice();

  // Backfill to `min` from the fallback, nearest-first when asked, never
  // re-adding something already kept.
  const seen = new Set(arr.map(keyOf).filter(Boolean));
  const ordered = opts.byDistance
    ? fb.slice().sort((a, b) => (a && Number.isFinite(a.distanceM) ? a.distanceM : Infinity)
                              - (b && Number.isFinite(b.distanceM) ? b.distanceM : Infinity))
    : fb;
  for (const v of ordered) {
    if (arr.length >= min) break;
    const k = keyOf(v);
    if (k && seen.has(k)) continue;
    if (k) seen.add(k);
    arr.push(v);
  }
  return arr;
}

module.exports = { demoteNeverEmpty };
