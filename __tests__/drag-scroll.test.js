// __tests__/drag-scroll.test.js — v0.62.707
//
// The scroll model behind card dragging.
//
// Operator: "can it hard-friction the scroll bar. currently is too smooth to
// move around". The answer is not a slower constant speed — it is a REST BAND
// through most of the list where nothing scrolls at all, and a quadratic ramp
// in the edge zones so the first half of the zone barely creeps. These tests
// pin that shape, because "feels right" is not something a later change can
// check itself against.

import { describe, it, expect } from 'vitest';
import {
  edgeScrollDelta, applyScrollStep, createScrollDriver,
  EDGE_ZONE_PX, MAX_SPEED_PX, RAMP_CURVE
} from '../web/clipboard/src/lib/drag-scroll.js';

// A typical phone list: header ~120, footer nav ~56 on an 844pt screen.
const BOX = { top: 120, bottom: 788 };
const at = (y, extra = {}) => edgeScrollDelta({ y, ...BOX, ...extra });

describe('the rest band', () => {
  it('does not scroll in the middle of the list', () => {
    expect(at((BOX.top + BOX.bottom) / 2)).toBe(0);
  });

  it('does not scroll anywhere outside the edge zones', () => {
    for (let y = BOX.top + EDGE_ZONE_PX; y <= BOX.bottom - EDGE_ZONE_PX; y += 20) {
      expect(at(y), `y=${y} should rest`).toBe(0);
    }
  });

  it('rests exactly at the zone boundary — the edge is where it starts, not where it is already moving', () => {
    expect(at(BOX.top + EDGE_ZONE_PX)).toBe(0);
    expect(at(BOX.bottom - EDGE_ZONE_PX)).toBe(0);
  });
});

describe('direction', () => {
  it('scrolls up near the top', () => {
    expect(at(BOX.top + 10)).toBeLessThan(0);
  });

  it('scrolls down near the bottom', () => {
    expect(at(BOX.bottom - 10)).toBeGreaterThan(0);
  });

  it('is symmetric', () => {
    expect(at(BOX.top + 12)).toBeCloseTo(-at(BOX.bottom - 12), 10);
  });
});

describe('the friction — a quadratic ramp, not a constant pull', () => {
  // This is the whole point. A linear ramp would move the list the instant
  // you cross the boundary, which is the "too smooth" being complained about.
  it('moves at a quarter speed at the halfway point of the zone', () => {
    const half = at(BOX.top + EDGE_ZONE_PX / 2);
    expect(Math.abs(half)).toBeCloseTo(MAX_SPEED_PX * 0.25, 6);
  });

  it('is far slower than linear across the first half of the zone', () => {
    for (let d = 0.1; d <= 0.5; d += 0.1) {
      const y = BOX.top + EDGE_ZONE_PX * (1 - d);
      const linear = MAX_SPEED_PX * d;
      expect(Math.abs(at(y))).toBeLessThan(linear);
    }
  });

  it('reaches full speed only at the very edge', () => {
    expect(Math.abs(at(BOX.top))).toBeCloseTo(MAX_SPEED_PX, 6);
  });

  it('honours the documented curve', () => {
    const d = 0.3;
    const y = BOX.top + EDGE_ZONE_PX * (1 - d);
    expect(Math.abs(at(y))).toBeCloseTo(Math.pow(d, RAMP_CURVE) * MAX_SPEED_PX, 6);
  });
});

describe('clamping', () => {
  it('never exceeds the ceiling, however far past the edge the finger goes', () => {
    for (const y of [BOX.top, BOX.top - 50, BOX.top - 5000]) {
      expect(at(y)).toBeGreaterThanOrEqual(-MAX_SPEED_PX);
    }
    for (const y of [BOX.bottom, BOX.bottom + 50, BOX.bottom + 5000]) {
      expect(at(y)).toBeLessThanOrEqual(MAX_SPEED_PX);
    }
  });

  // On a short container two full zones would overlap and every position in
  // the list would scroll — there would be no way to hold a card still.
  it('keeps a rest band on a container shorter than two zones', () => {
    const short = { top: 100, bottom: 100 + EDGE_ZONE_PX };   // half the needed height
    const mid = 100 + EDGE_ZONE_PX / 2;
    expect(edgeScrollDelta({ y: mid, ...short })).toBe(0);
    expect(edgeScrollDelta({ y: 101, ...short })).toBeLessThan(0);
    expect(edgeScrollDelta({ y: 100 + EDGE_ZONE_PX - 1, ...short })).toBeGreaterThan(0);
  });
});

describe('degenerate input', () => {
  it('returns 0 rather than NaN for a collapsed or inverted box', () => {
    expect(edgeScrollDelta({ y: 50, top: 100, bottom: 100 })).toBe(0);
    expect(edgeScrollDelta({ y: 50, top: 200, bottom: 100 })).toBe(0);
  });

  it('returns 0 for missing or non-finite numbers', () => {
    expect(edgeScrollDelta({})).toBe(0);
    expect(edgeScrollDelta({ y: NaN, top: 0, bottom: 100 })).toBe(0);
    expect(edgeScrollDelta()).toBe(0);
  });
});

describe('applyScrollStep', () => {
  const el = (scrollTop, clientHeight = 400, scrollHeight = 1200) => ({
    scrollTop, clientHeight, scrollHeight
  });

  it('moves by the delta and reports what it moved', () => {
    const e = el(100);
    expect(applyScrollStep(e, 14)).toBe(14);
    expect(e.scrollTop).toBe(114);
  });

  // The caller uses a 0 return to know it has hit the end.
  it('clamps at the top and reports 0 once there', () => {
    const e = el(5);
    expect(applyScrollStep(e, -14)).toBe(-5);
    expect(e.scrollTop).toBe(0);
    expect(applyScrollStep(e, -14)).toBe(0);
  });

  it('clamps at the bottom and reports 0 once there', () => {
    const e = el(795);           // max = 1200 - 400 = 800
    expect(applyScrollStep(e, 14)).toBe(5);
    expect(e.scrollTop).toBe(800);
    expect(applyScrollStep(e, 14)).toBe(0);
  });

  it('does nothing when there is nothing to scroll', () => {
    const e = el(0, 400, 400);
    expect(applyScrollStep(e, 14)).toBe(0);
  });

  it('does nothing for a zero delta or a missing element', () => {
    expect(applyScrollStep(el(100), 0)).toBe(0);
    expect(applyScrollStep(null, 14)).toBe(0);
  });
});

describe('createScrollDriver — the sub-pixel carry', () => {
  const el = (scrollTop = 100, clientHeight = 400, scrollHeight = 1200) => ({
    scrollTop, clientHeight, scrollHeight
  });

  // Found by driving a real drag in the browser: a card held just inside the
  // zone boundary moved 0px in 500ms. scrollTop snaps to whole pixels, so a
  // 0.1px/frame delta was discarded every frame and the slow end of the ramp
  // was dead — the rest band silently ran ~14px past its design.
  it('accumulates a creep too small for one pixel per frame', () => {
    const d = createScrollDriver(), e = el();
    expect(d.step(e, 0.1)).toBe(0);        // one frame alone moves nothing
    expect(e.scrollTop).toBe(100);

    // Over a run it must total the real distance. Deliberately NOT asserting
    // which frame tips it over: ten additions of 0.1 come to 0.9999999999999999
    // in floating point, so the pixel lands on the eleventh. Pinning the frame
    // would be testing IEEE-754, not the behaviour.
    let moved = 0.1;
    for (let i = 0; i < 59; i++) moved += d.step(e, 0.1);
    expect(e.scrollTop - 100).toBeGreaterThanOrEqual(5);
    expect(e.scrollTop - 100).toBeLessThanOrEqual(6);   // 60 frames x 0.1 = 6px
  });

  it('carries the fraction of a large delta too', () => {
    const d = createScrollDriver(), e = el();
    expect(d.step(e, 3.5)).toBe(3);
    expect(d.step(e, 3.5)).toBe(4);        // 0.5 + 3.5 = 4
    expect(e.scrollTop).toBe(107);
  });

  it('works the same downward', () => {
    const d = createScrollDriver(), e = el();
    for (let i = 0; i < 60; i++) d.step(e, -0.1);
    expect(100 - e.scrollTop).toBeGreaterThanOrEqual(5);
    expect(100 - e.scrollTop).toBeLessThanOrEqual(6);
  });

  // Otherwise a carry built up while pinned at the top would fire off as a
  // jump the instant the finger moved to the other edge.
  it('drops the carry when it hits an end', () => {
    const d = createScrollDriver(), e = el(1);
    expect(d.step(e, -5)).toBe(-1);        // clamped at 0
    expect(e.scrollTop).toBe(0);
    for (let i = 0; i < 20; i++) d.step(e, -5);
    expect(e.scrollTop).toBe(0);
    expect(d.step(e, 1)).toBe(1);          // reverses cleanly, no burst
    expect(e.scrollTop).toBe(1);
  });

  it('reset clears a pending fraction', () => {
    const d = createScrollDriver(), e = el();
    d.step(e, 0.9);
    d.reset();
    expect(d.step(e, 0.9)).toBe(0);        // would have been 1 without reset
  });
});
