// search-precedence.js — v0.62.15
//
// READ-ONLY descriptor of the Cuisine-TMA search decision tree. This module
// does NOT run the search; it returns *which mode wins* and *what each
// dimension effectively does* for a given set of request inputs, mirroring the
// precedence the route already encodes (scattered across index.js / the
// helpers). It is the single executable source of truth the combination test
// matrix (__tests__/search-mode-matrix.test.js) and the hosted mind-map
// (doc/SearchStrategy) assert against, so the doc, the diagram, and the tests
// can never silently drift from each other.
//
// The actual route is unchanged — it MAY log resolveSearchPrecedence() for
// observability, but it does not depend on it (operator declined a hot-path
// resolver refactor). Verified against:
//   index.js  14525/14606  Michelin early-return (wins over everything)
//   index.js  14843-14848  special-mode country gate (belt)
//   index.js  15816-15834  durian soft-rating (skips the rating floor)
//   index.js  15824-15826  New pill relaxes a numeric floor to 3.0
//   index.js  15624-15673  New recency band (only runs off special-mode)
//   QuickFilters.jsx 149   halal auto-off in special-mode
//   index.js  14869        homeBased modifier skipped in special-mode
//   venue-filters.js       applyRatingFloor (off / floor / unrated, never-empty)
//   rating-pref.js         ratingPrefToFloorOpts
//   newness-criteria.js    NEW_RATING_FLOOR (3.0)

'use strict';

const NEW_RATING_FLOOR = 3.0;

// Pure: rating-pref token → floor descriptor. Mirrors rating-pref.js
// ratingPrefToFloorOpts at the descriptor level (canonical tokens only).
function floorFromPref(ratingPref) {
  const p = (typeof ratingPref === 'string' ? ratingPref : '').trim().toLowerCase();
  if (p === 'any') return { mode: 'off', floor: null };
  if (p === 'unrated' || p === 'no-rating') return { mode: 'unrated', floor: null };
  const n = Number(p);
  if (Number.isFinite(n) && n > 0) return { mode: 'floor', floor: n };
  return { mode: 'floor', floor: 3.7 }; // the system default
}

// The three exclusive top-level winners, in precedence order.
const WINNERS = Object.freeze(['michelin', 'special-mode', 'base']);

const SPECIAL_MODES = Object.freeze(['fruits', 'durian', 'durian-pastry']);
const DURIAN_SOFT = Object.freeze(['durian', 'durian-pastry']); // skip the rating floor

/**
 * resolveSearchPrecedence(inputs) → a flat, testable description of the
 * effective search behavior for one request.
 *
 * inputs: {
 *   michelin?: boolean,                 // 'michelin' present in cuisines
 *   specialMode?: 'fruits'|'durian'|'durian-pastry'|null,
 *   newlyOpened?: boolean,              // the New pill
 *   ratingPref?: 'any'|'unrated'|'3.7'|'<numeric>',
 *   halal?, openNow?, vegetarian?, homeBased?, petFriendly?: boolean,
 * }
 */
function resolveSearchPrecedence(inputs = {}) {
  const michelin = inputs.michelin === true;
  const specialMode = SPECIAL_MODES.includes(inputs.specialMode) ? inputs.specialMode : null;
  const newlyOpened = inputs.newlyOpened === true;
  const ratingPref = inputs.ratingPref;

  // ── Tier 1: MICHELIN wins over everything (early-return, curated list). ──
  if (michelin) {
    return {
      winner: 'michelin',
      // Michelin returns a curated, pre-vetted list — no rating floor, no
      // recency, quick-filters are NOT hard filters (cuisine chips only rank).
      ratingFloorApplied: false,
      effectiveFloor: null,
      newnessActive: false,
      halalEffective: false,
      homeBasedEffective: false,
      disabled: ['specialMode', 'newlyOpened', 'ratingPref', 'quickFilters'],
      notes: ['Michelin is PRIMARY: a curated list; other cuisines only re-rank, filters/rating/New are ignored.'],
    };
  }

  // ── Tier 2: SPECIAL-MODE (fruits / durian / durian-pastry). ──
  if (specialMode) {
    const durianSoft = DURIAN_SOFT.includes(specialMode);
    // fruits still floors by ratingPref; durian/durian-pastry skip the floor.
    const floor = durianSoft ? { mode: 'off', floor: null } : floorFromPref(ratingPref);
    return {
      winner: 'special-mode',
      specialMode,
      durianSoft,
      ratingFloorApplied: !durianSoft,            // durian soft-rating skips it
      effectiveFloor: durianSoft ? null : floor.floor,
      effectiveFloorMode: durianSoft ? 'soft-3.7-order' : floor.mode,
      newnessActive: false,                        // New recency block is skipped in special-mode
      halalEffective: false,                       // halal auto-off in special-mode
      homeBasedEffective: false,                   // homeBased modifier skipped
      disabled: ['halal', 'homeBased', ...(durianSoft ? ['ratingPref'] : [])],
      notes: [
        durianSoft
          ? 'Durian: soft 3.7 — keep ALL (incl. <3.7 / unrated); ≥3.7 ordered first.'
          : 'Fruits: rating floor from ratingPref still applies.',
        'New pill, halal, and homeBased do not take effect in special-mode.',
      ],
    };
  }

  // ── Tier 3: BASE (cuisine / free-text). ratingPref + New both apply. ──
  const floor = floorFromPref(ratingPref);
  let effectiveFloor = floor.floor;
  // New pill relaxes a numeric floor down to 3.0 (newly-opened 3.0–3.7 must show).
  if (newlyOpened && floor.mode === 'floor' && floor.floor > NEW_RATING_FLOOR) {
    effectiveFloor = NEW_RATING_FLOOR;
  }
  return {
    winner: 'base',
    ratingFloorApplied: true,                      // applyRatingFloor always runs (off/floor/unrated)
    effectiveFloor,
    effectiveFloorMode: floor.mode,
    newnessActive: newlyOpened,
    halalEffective: inputs.halal === true,
    homeBasedEffective: inputs.homeBased === true,
    disabled: [],
    notes: newlyOpened && floor.mode === 'floor' && floor.floor > NEW_RATING_FLOOR
      ? [`New pill relaxed the ${floor.floor}★ floor to ${NEW_RATING_FLOOR}★.`]
      : [],
  };
}

module.exports = {
  resolveSearchPrecedence,
  floorFromPref,
  NEW_RATING_FLOOR,
  WINNERS,
  SPECIAL_MODES,
  DURIAN_SOFT,
};
