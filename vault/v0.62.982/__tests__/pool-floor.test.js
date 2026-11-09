// __tests__/pool-floor.test.js — v0.61.441
//
// Tests the shared "a gate demotes, never empties" helper that unifies
// the cuisine-search anti-collapse floors (never-≤1 backfill, newlyOpened
// floor-to-bias, Gemini all-unrelated floor, …).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { demoteNeverEmpty } = require('../pool-floor');

function v(id, distanceM) {
  return { placeId: id, name: id, distanceM };
}

describe('demoteNeverEmpty — min:1 (classic never-empty)', () => {
  it('returns filtered as-is when non-empty', () => {
    const filtered = [v('a', 100)];
    const out = demoteNeverEmpty(filtered, [v('a', 100), v('b', 200)]);
    expect(out).toEqual(filtered);
  });
  it('returns the whole fallback pool when the gate emptied', () => {
    const fb = [v('a', 100), v('b', 200)];
    const out = demoteNeverEmpty([], fb);
    expect(out.map((x) => x.placeId)).toEqual(['a', 'b']);
  });
  it('returns empty when both are empty', () => {
    expect(demoteNeverEmpty([], [])).toEqual([]);
  });
});

describe('demoteNeverEmpty — min:2 (never-≤1 backfill)', () => {
  it('tops a lone survivor up to 2 from the fallback, nearest-first', () => {
    const lone = [v('a', 500)];
    const fb = [v('a', 500), v('c', 9000), v('b', 1200)];
    const out = demoteNeverEmpty(lone, fb, { min: 2, byDistance: true });
    expect(out.map((x) => x.placeId)).toEqual(['a', 'b']);   // b (1200) is nearest unused
  });
  it('does not re-add a venue already in filtered', () => {
    const lone = [v('a', 500)];
    const fb = [v('a', 500), v('a', 500), v('b', 1200)];     // dup of a
    const out = demoteNeverEmpty(lone, fb, { min: 2, byDistance: true });
    expect(out.map((x) => x.placeId)).toEqual(['a', 'b']);
  });
  it('leaves a healthy page untouched', () => {
    const page = [v('a', 100), v('b', 200), v('c', 300)];
    const out = demoteNeverEmpty(page, [v('z', 50)], { min: 2 });
    expect(out).toEqual(page);
  });
  it('stops at min even when the fallback has more', () => {
    const out = demoteNeverEmpty([v('a', 100)], [v('a', 100), v('b', 200), v('c', 300)], { min: 2, byDistance: true });
    expect(out).toHaveLength(2);
  });
  it('returns what it can when the fallback cannot reach min', () => {
    const out = demoteNeverEmpty([v('a', 100)], [v('a', 100)], { min: 3 });
    expect(out).toHaveLength(1);
  });
});

describe('demoteNeverEmpty — defensive', () => {
  it('non-array filtered is treated as empty', () => {
    const out = demoteNeverEmpty(null, [v('a', 100)]);
    expect(out.map((x) => x.placeId)).toEqual(['a']);
  });
  it('non-array fallback returns filtered untouched', () => {
    const filtered = [v('a', 100)];
    expect(demoteNeverEmpty(filtered, null, { min: 2 })).toEqual(filtered);
  });
});
