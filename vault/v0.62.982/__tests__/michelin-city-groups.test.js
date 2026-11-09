// __tests__/michelin-city-groups.test.js — v0.62.6
//
// Display-layer city grouping of the visible Michelin batch (operator spec,
// 10-06 '26): group cards by awardCity, set-city group first (no jump row,
// Case A), every other city group gets a "{count} Michelin picks in {city}"
// row; Case B (zero cards in the set city) gives every group a row and the
// map fit-bounds across all visible pins. Counts are batch-local. Pure
// display logic — never reorders inside a city, never drops venues.

import { describe, it, expect } from 'vitest';
import {
  groupByAwardCity,
  groupNeedsJumpRow,
  initialFitPins,
  pinsOf,
} from '../web/cuisine/src/v2/lib/michelin-city-groups.js';

const mk = (name, awardCity, lat = 3.1, lng = 101.6) => ({ placeId: name, name, awardCity, lat, lng });

// Operator Case A: KL set, 12 visible = 4 KL + 8 Georgetown.
const CASE_A = [
  ...[1, 2].map((i) => mk(`GT${i}`, 'Georgetown', 5.4, 100.3)),       // curated order interleaves
  ...[1, 2, 3, 4].map((i) => mk(`KL${i}`, 'Kuala Lumpur')),
  ...[3, 4, 5, 6, 7, 8].map((i) => mk(`GT${i}`, 'Georgetown', 5.4, 100.3)),
];

// Operator Case B: Putrajaya set, 12 visible = 0 Putrajaya + 4 KL + 8 Georgetown.
const CASE_B = [
  ...[1, 2, 3, 4].map((i) => mk(`KL${i}`, 'Kuala Lumpur')),
  ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => mk(`GT${i}`, 'Georgetown', 5.4, 100.3)),
];

describe('groupByAwardCity — Case A (set city has visible cards)', () => {
  const g = groupByAwardCity(CASE_A, 'Kuala Lumpur');

  it('is Case A and hoists the set-city group first', () => {
    expect(g.caseA).toBe(true);
    expect(g.groups[0].city).toBe('Kuala Lumpur');
    expect(g.groups[0].isSetCity).toBe(true);
  });
  it('set-city group gets NO jump row; other groups do', () => {
    expect(groupNeedsJumpRow(g.groups[0], g.caseA)).toBe(false);
    expect(groupNeedsJumpRow(g.groups[1], g.caseA)).toBe(true);
  });
  it('counts are batch-local (4 KL, 8 Georgetown) and order inside a group is preserved', () => {
    expect(g.groups[0].venues.map((v) => v.name)).toEqual(['KL1', 'KL2', 'KL3', 'KL4']);
    expect(g.groups[1].city).toBe('Georgetown');
    expect(g.groups[1].venues).toHaveLength(8);
    expect(g.groups[1].venues.map((v) => v.name)).toEqual(['GT1', 'GT2', 'GT3', 'GT4', 'GT5', 'GT6', 'GT7', 'GT8']);
  });
  it('never drops a venue', () => {
    expect(g.groups.flatMap((x) => x.venues)).toHaveLength(CASE_A.length);
  });
  it('initial map pins = the SET city pins only (map stays on the set city)', () => {
    const pins = initialFitPins(g);
    expect(pins).toHaveLength(4);
    expect(pins.every((p) => p.lng === 101.6)).toBe(true);
  });
});

describe('groupByAwardCity — Case B (zero cards in the set city)', () => {
  const g = groupByAwardCity(CASE_B, 'Putrajaya');

  it('is Case B; first-appearance group order is kept (KL then Georgetown)', () => {
    expect(g.caseA).toBe(false);
    expect(g.groups.map((x) => x.city)).toEqual(['Kuala Lumpur', 'Georgetown']);
  });
  it('EVERY city group gets a jump row', () => {
    for (const grp of g.groups) expect(groupNeedsJumpRow(grp, g.caseA)).toBe(true);
  });
  it('counts: 4 KL + 8 Georgetown (batch-local, not totals)', () => {
    expect(g.groups[0].venues).toHaveLength(4);
    expect(g.groups[1].venues).toHaveLength(8);
  });
  it('initial map pins = ALL visible pins (country-level fit-bounds)', () => {
    expect(initialFitPins(g)).toHaveLength(12);
  });
  it('no resolved set city behaves the same as an unmatched one', () => {
    const g2 = groupByAwardCity(CASE_B, null);
    expect(g2.caseA).toBe(false);
    expect(initialFitPins(g2)).toHaveLength(12);
  });
});

describe('groupByAwardCity — degenerate batches', () => {
  it('single-city batch → one group, no jump row in Case A (visual no-op)', () => {
    const g = groupByAwardCity([mk('A', 'Seoul'), mk('B', 'Seoul')], 'Seoul');
    expect(g.groups).toHaveLength(1);
    expect(groupNeedsJumpRow(g.groups[0], g.caseA)).toBe(false);
  });
  it('venues without awardCity fold into a leading unlabelled group with no row', () => {
    const g = groupByAwardCity([mk('KL1', 'Kuala Lumpur'), mk('SG1', null), mk('SG2', undefined)], 'Kuala Lumpur');
    expect(g.groups[0].city).toBe(null);
    expect(g.groups[0].venues.map((v) => v.name)).toEqual(['SG1', 'SG2']);
    expect(groupNeedsJumpRow(g.groups[0], g.caseA)).toBe(false);
    expect(g.groups[1].city).toBe('Kuala Lumpur');
  });
  it('set-city match is case-insensitive and trims whitespace', () => {
    const g = groupByAwardCity([mk('KL1', 'Kuala Lumpur')], '  kuala lumpur ');
    expect(g.caseA).toBe(true);
  });
  it('empty / non-array input is safe', () => {
    expect(groupByAwardCity([], 'KL').groups).toEqual([]);
    expect(groupByAwardCity(null, 'KL').caseA).toBe(false);
  });
});

describe('pinsOf', () => {
  it('keeps only venues with finite lat/lng', () => {
    expect(pinsOf([mk('A', 'X'), { name: 'B', lat: null, lng: 1 }, null])).toEqual([{ lat: 3.1, lng: 101.6 }]);
  });
});
