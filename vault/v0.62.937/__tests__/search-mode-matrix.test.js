// __tests__/search-mode-matrix.test.js — v0.62.15
//
// The "99% strategy" — an EXHAUSTIVE combination matrix for the Cuisine-TMA
// search modes. Every dimension the operator named (Michelin/Bib · Durian ·
// Durian-Pastry · New · Any-rating · No-rating · combo+quick-filter ·
// combo+Michelin) has a defined, asserted outcome here. The assertions run
// against the REAL helpers (rating-pref / newness-criteria / special-mode /
// venue-filters) AND the read-only precedence descriptor (search-precedence.js)
// so the published decision tree (doc/SearchStrategy) can never silently drift
// from the code. If someone changes a rule, a cell in this matrix goes red.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { resolveSearchPrecedence, NEW_RATING_FLOOR } = require('../search-precedence.js');
const ratingPref = require('../rating-pref.js');
const newness = require('../newness-criteria.js');
const sm = require('../special-mode.js');
const venueFilters = require('../venue-filters.js');
const modes = require('../doc/SearchStrategy/data/search-modes.json');

// ── The matrix: each row is one request shape → its expected winner + effects.
const MATRIX = [
  // Michelin wins over everything, ignores filters/rating/New.
  { name: 'Michelin alone', in: { michelin: true }, winner: 'michelin', floorApplied: false, newness: false },
  { name: 'Michelin + Halal (filter ignored)', in: { michelin: true, halal: true }, winner: 'michelin', halal: false },
  { name: 'Michelin + New (New ignored)', in: { michelin: true, newlyOpened: true }, winner: 'michelin', newness: false },
  { name: 'Michelin + rating unrated (ignored)', in: { michelin: true, ratingPref: 'unrated' }, winner: 'michelin', floorApplied: false },
  { name: 'Michelin + durian (Michelin wins)', in: { michelin: true, specialMode: 'durian' }, winner: 'michelin' },

  // Special-mode: durian/durian-pastry skip the floor (soft 3.7); fruits floors.
  { name: 'Durian alone (soft 3.7, no floor)', in: { specialMode: 'durian' }, winner: 'special-mode', floorApplied: false, newness: false },
  { name: 'Durian-Pastry (soft 3.7)', in: { specialMode: 'durian-pastry' }, winner: 'special-mode', floorApplied: false },
  { name: 'Durian + rating 4.5 (rating ignored)', in: { specialMode: 'durian', ratingPref: '4.5' }, winner: 'special-mode', floorApplied: false },
  { name: 'Durian + New (New skipped)', in: { specialMode: 'durian', newlyOpened: true }, winner: 'special-mode', newness: false },
  { name: 'Durian + Halal (halal auto-off)', in: { specialMode: 'durian', halal: true }, winner: 'special-mode', halal: false },
  { name: 'Fruits + rating 3.7 (floor applies)', in: { specialMode: 'fruits', ratingPref: '3.7' }, winner: 'special-mode', floorApplied: true, floor: 3.7 },
  { name: 'Fruits + any (floor off)', in: { specialMode: 'fruits', ratingPref: 'any' }, winner: 'special-mode', floorApplied: true, floorMode: 'off' },

  // Base: rating-pref + New both apply; New relaxes a numeric floor to 3.0.
  { name: 'Base default (3.7 floor)', in: {}, winner: 'base', floorApplied: true, floor: 3.7, newness: false },
  { name: 'Base + Any rating', in: { ratingPref: 'any' }, winner: 'base', floorMode: 'off' },
  { name: 'Base + No rating (unrated)', in: { ratingPref: 'unrated' }, winner: 'base', floorMode: 'unrated' },
  { name: 'Base + New (relaxes 3.7 → 3.0)', in: { newlyOpened: true, ratingPref: '3.7' }, winner: 'base', floor: NEW_RATING_FLOOR, newness: true },
  { name: 'Base + New + 3.0 (no change)', in: { newlyOpened: true, ratingPref: '3.0' }, winner: 'base', floor: 3.0, newness: true },
  { name: 'Base + New + unrated (no numeric relax)', in: { newlyOpened: true, ratingPref: 'unrated' }, winner: 'base', floorMode: 'unrated', newness: true },
  { name: 'Base + Halal (filter active)', in: { halal: true }, winner: 'base', halal: true },
];

describe('search-mode matrix — winner + effect per combination', () => {
  for (const row of MATRIX) {
    it(`${row.name}`, () => {
      const r = resolveSearchPrecedence(row.in);
      expect(r.winner).toBe(row.winner);
      if ('floorApplied' in row) expect(r.ratingFloorApplied).toBe(row.floorApplied);
      if ('newness' in row) expect(r.newnessActive).toBe(row.newness);
      if ('halal' in row) expect(r.halalEffective).toBe(row.halal);
      if ('floor' in row) expect(r.effectiveFloor).toBe(row.floor);
      if ('floorMode' in row) expect(r.effectiveFloorMode).toBe(row.floorMode);
    });
  }
});

describe('cross-check the resolver against the REAL helpers', () => {
  it('floorFromPref descriptor agrees with rating-pref.ratingPrefToFloorOpts', () => {
    for (const p of ['any', 'unrated', 'no-rating', '3.7', '4.5', '1.0']) {
      const real = ratingPref.ratingPrefToFloorOpts(p);
      const r = resolveSearchPrecedence({ ratingPref: p });
      expect(r.effectiveFloorMode).toBe(real.mode);
      if (real.mode === 'floor') expect(r.effectiveFloor).toBe(real.floor);
    }
  });

  it('New pill 3.0 floor matches newness-criteria.NEW_RATING_FLOOR', () => {
    expect(NEW_RATING_FLOOR).toBe(newness.NEW_RATING_FLOOR);
    // a 4.x venue passes newness on rating; a 2.x rated venue does not.
    expect(newness.passesNewness({ oldestReviewDays: 30, rating: 4.2 })).toBe(true);
    expect(newness.passesNewness({ oldestReviewDays: 30, rating: 2.5 })).toBe(false);
    // unrated newly-opened venues are kept.
    expect(newness.passesNewness({ oldestReviewDays: 30, rating: null })).toBe(true);
  });

  it('durian/durian-pastry are belt-gated; fruits is global (special-mode.specialModeAllowed)', () => {
    for (const cc of ['SG', 'MY', 'ID', 'TH', 'PH', 'BN', 'VN']) {
      expect(sm.specialModeAllowed(cc, 'durian')).toBe(true);
    }
    expect(sm.specialModeAllowed('HK', 'durian')).toBe(false);
    expect(sm.specialModeAllowed('JP', 'durian-pastry')).toBe(false);
    expect(sm.specialModeAllowed('HK', 'fruits')).toBe(true);   // fruits global
    expect(sm.specialModeAllowed('US', 'fruits')).toBe(true);
  });

  it('applyRatingFloor never empties a non-empty pool (the never-zero invariant)', () => {
    const pool = [
      { placeId: 'a', rating: 2.1, userRatingCount: 50 },
      { placeId: 'b', rating: 2.4, userRatingCount: 80 },
    ];
    const out = venueFilters.applyRatingFloor(pool, { mode: 'floor', floor: 3.7 });
    expect(Array.isArray(out)).toBe(true);
    expect(out.length).toBeGreaterThan(0);   // demote-not-drop
  });
});

describe('the data file (single source of truth) stays in sync', () => {
  it('search-modes.json enumerates the three exclusive winners in precedence order', () => {
    expect(modes.precedence.map((p) => p.winner)).toEqual(['michelin', 'special-mode', 'base']);
  });

  it('every dimension the operator named has an entry', () => {
    const keys = modes.dimensions.map((d) => d.key);
    for (const k of ['michelin', 'durian', 'durian-pastry', 'fruits', 'new', 'rating', 'quick-filters']) {
      expect(keys).toContain(k);
    }
  });

  it('each declared conflict resolves to a known winner token', () => {
    for (const c of modes.conflicts) {
      expect(['michelin', 'special-mode', 'base', 'auto-off', 'relax-3.0', 'skip']).toContain(c.resolution);
    }
  });
});
