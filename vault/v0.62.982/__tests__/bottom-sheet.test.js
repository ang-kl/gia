// __tests__/bottom-sheet.test.js — v0.62.647
//
// Gesture physics for the vanilla swipe-to-close bottom sheet
// (web/_shared/components/bottom-sheet/bottom-sheet.js).
//
// The release decision is the part of a drawer users actually feel, and it is
// the part that cannot be eyeballed in a screenshot. It is therefore factored
// out of the DOM entirely — resolveGesture/sampleVelocity/rubberBand are pure —
// so the repo's Node-only Vitest suite can pin the two failure modes that make
// a sheet feel broken:
//
//   velocity-only  → a deliberate slow drag all the way down springs back
//   distance-only  → a fast flick from the top does nothing
//
// Importing the module must also stay side-effect-free under Node (no
// `document` at import time), which this file proves by importing it at all.

import { describe, it, expect } from 'vitest';
import {
  resolveGesture,
  sampleVelocity,
  rubberBand,
  DEFAULTS
} from '../web/_shared/components/bottom-sheet/bottom-sheet.js';

const H = 400; // a representative sheet height in px

describe('sampleVelocity', () => {
  it('returns 0 with fewer than two samples', () => {
    expect(sampleVelocity([])).toBe(0);
    expect(sampleVelocity([{ y: 10, t: 0 }])).toBe(0);
  });

  it('measures px/ms, positive downward', () => {
    const v = sampleVelocity([{ y: 0, t: 0 }, { y: 100, t: 100 }]);
    expect(v).toBeCloseTo(1, 5);
  });

  it('is negative for an upward gesture', () => {
    expect(sampleVelocity([{ y: 100, t: 0 }, { y: 40, t: 60 }])).toBeCloseTo(-1, 5);
  });

  it('uses only the trailing window, so a slow drag ending in a flick reads as a flick', () => {
    // 300px over 3s (0.1 px/ms overall) then 60px in the last 60ms (1 px/ms).
    const samples = [
      { y: 0, t: 0 }, { y: 150, t: 1500 }, { y: 300, t: 3000 }, { y: 360, t: 3060 }
    ];
    expect(sampleVelocity(samples, 120)).toBeCloseTo(1, 5);
    // Over the whole gesture it would have looked ten times slower.
    expect(sampleVelocity(samples, 10000)).toBeCloseTo(360 / 3060, 5);
  });

  it('returns 0 when every sample shares a timestamp (no divide-by-zero)', () => {
    expect(sampleVelocity([{ y: 0, t: 5 }, { y: 90, t: 5 }])).toBe(0);
  });
});

describe('rubberBand', () => {
  it('is zero at and below the boundary', () => {
    expect(rubberBand(0)).toBe(0);
    expect(rubberBand(-20)).toBe(0);
  });

  it('resists: output is always less than the input overshoot', () => {
    for (const px of [10, 50, 200, 1000]) {
      expect(rubberBand(px)).toBeLessThan(px);
    }
  });

  it('is monotonic and asymptotic — it can never exceed the cap', () => {
    expect(rubberBand(100)).toBeGreaterThan(rubberBand(50));
    expect(rubberBand(100000)).toBeLessThan(DEFAULTS.rubberBandMax);
  });
});

describe('resolveGesture', () => {
  it('closes on a fast downward flick even from a short travel', () => {
    expect(resolveGesture({ dy: 40, velocity: 1.2, sheetHeight: H })).toBe('close');
  });

  it('closes on a slow drag past the distance threshold', () => {
    // 60 % of the sheet, barely moving at release.
    expect(resolveGesture({ dy: 0.6 * H, velocity: 0.02, sheetHeight: H })).toBe('close');
  });

  it('snaps back on a short, slow drag', () => {
    expect(resolveGesture({ dy: 24, velocity: 0.05, sheetHeight: H })).toBe('snap');
  });

  it('snaps back when the user reverses with an upward flick, however far down', () => {
    expect(resolveGesture({ dy: 0.9 * H, velocity: -1.4, sheetHeight: H })).toBe('snap');
  });

  it('does not close on a flick that never moved (a tap on the handle)', () => {
    expect(resolveGesture({ dy: 2, velocity: 3, sheetHeight: H })).toBe('snap');
  });

  it('treats the distance threshold as a boundary, not a range', () => {
    const at = DEFAULTS.distanceRatio * H;
    expect(resolveGesture({ dy: at, velocity: 0, sheetHeight: H })).toBe('close');
    expect(resolveGesture({ dy: at - 1, velocity: 0, sheetHeight: H })).toBe('snap');
  });

  it('scales with the sheet, not with absolute pixels', () => {
    // 150px is half a short sheet (closes) but a fifth of a tall one (snaps).
    expect(resolveGesture({ dy: 150, velocity: 0, sheetHeight: 300 })).toBe('close');
    expect(resolveGesture({ dy: 150, velocity: 0, sheetHeight: 760 })).toBe('snap');
  });

  it('accepts per-instance overrides', () => {
    const strict = { distanceRatio: 0.8, velocityThreshold: 2 };
    expect(resolveGesture({ dy: 0.5 * H, velocity: 1, sheetHeight: H }, strict)).toBe('snap');
  });

  it('is total: garbage in still yields a decision', () => {
    expect(resolveGesture({ dy: NaN, velocity: NaN, sheetHeight: 0 })).toBe('snap');
    expect(resolveGesture({})).toBe('snap');
  });
});
