// __tests__/long-press.test.js — v0.62.705
//
// The press-and-hold behind "long-press footer tab 2 to switch cabinet".
//
// The interesting cases are the ones a screenshot cannot show and a device
// check finds only by accident: a press that DRIFTS is a scroll and must not
// fire, and a press that fires must swallow the click the browser sends on
// release — otherwise one hold both opens the picker and navigates away from
// the screen it just opened over.
//
// Time is injected rather than faked, so these are synchronous and exact.

import { describe, it, expect } from 'vitest';
import { createLongPress, LONG_PRESS_MS, MOVE_TOLERANCE_PX } from '../web/clipboard/src/lib/long-press.js';

/** A hand-driven clock: collects pending timers, fires them on demand. */
function clock() {
  let next = 1;
  const pending = new Map();
  return {
    setTimer: (fn, ms) => { const id = next++; pending.set(id, { fn, ms }); return id; },
    clearTimer: (id) => { pending.delete(id); },
    /** Fire every timer whose delay has elapsed. */
    tick(ms) {
      for (const [id, t] of [...pending]) {
        if (ms >= t.ms) { pending.delete(id); t.fn(); }
      }
    },
    get count() { return pending.size; }
  };
}

function harness(opts = {}) {
  const c = clock();
  const fired = [];
  const lp = createLongPress({
    onLongPress: () => fired.push(true),
    setTimer: c.setTimer, clearTimer: c.clearTimer,
    ...opts
  });
  return { lp, c, fired };
}

describe('createLongPress', () => {
  it('fires after the hold delay', () => {
    const { lp, c, fired } = harness();
    lp.down(100, 700);
    expect(fired).toHaveLength(0);
    c.tick(LONG_PRESS_MS);
    expect(fired).toHaveLength(1);
  });

  it('does not fire before the delay', () => {
    const { lp, c, fired } = harness();
    lp.down(100, 700);
    c.tick(LONG_PRESS_MS - 1);
    expect(fired).toHaveLength(0);
  });

  it('does not fire for a quick tap', () => {
    const { lp, c, fired } = harness();
    lp.down(100, 700);
    lp.up();
    c.tick(LONG_PRESS_MS * 10);
    expect(fired).toHaveLength(0);
  });

  // A footer tab sits at the bottom of a scrolling screen: a finger that lands
  // on it and drags is scrolling, not holding.
  it('cancels once the finger drifts past the tolerance', () => {
    const { lp, c, fired } = harness();
    lp.down(100, 700);
    lp.move(100, 700 - (MOVE_TOLERANCE_PX + 1));
    c.tick(LONG_PRESS_MS);
    expect(fired).toHaveLength(0);
    expect(lp.armed).toBe(false);
  });

  it('tolerates a small wobble', () => {
    const { lp, c, fired } = harness();
    lp.down(100, 700);
    lp.move(100 + MOVE_TOLERANCE_PX, 700 - MOVE_TOLERANCE_PX);
    c.tick(LONG_PRESS_MS);
    expect(fired).toHaveLength(1);
  });

  it('measures drift from the origin, not from the previous move', () => {
    const { lp, c, fired } = harness();
    lp.down(100, 700);
    // A slow crawl: each step is small, but the total is well past tolerance.
    for (let i = 1; i <= 5; i++) lp.move(100, 700 - i * 4);
    c.tick(LONG_PRESS_MS);
    expect(fired).toHaveLength(0);
  });

  it('ignores moves when nothing is armed', () => {
    const { lp } = harness();
    expect(() => lp.move(0, 0)).not.toThrow();
  });

  describe('consumeClick — the click that follows a hold', () => {
    // Without this the hold opens the picker AND the tab navigates, so the
    // sheet appears over a screen the user never asked for.
    it('swallows exactly one click after firing', () => {
      const { lp, c } = harness();
      lp.down(100, 700);
      c.tick(LONG_PRESS_MS);
      lp.up();
      expect(lp.consumeClick()).toBe(true);
      expect(lp.consumeClick()).toBe(false);   // and only one
    });

    it('does not swallow the click of a plain tap', () => {
      const { lp, c } = harness();
      lp.down(100, 700);
      lp.up();
      c.tick(LONG_PRESS_MS);
      expect(lp.consumeClick()).toBe(false);
    });

    it('does not swallow the click of a tap that follows a hold', () => {
      const { lp, c } = harness();
      lp.down(100, 700);
      c.tick(LONG_PRESS_MS);
      lp.up();
      expect(lp.consumeClick()).toBe(true);
      // now a genuine tap
      lp.down(100, 700);
      lp.up();
      expect(lp.consumeClick()).toBe(false);
    });

    it('does not swallow a click when a callback threw', () => {
      const c = clock();
      const lp = createLongPress({
        onLongPress: () => { throw new Error('boom'); },
        setTimer: c.setTimer, clearTimer: c.clearTimer
      });
      lp.down(100, 700);
      expect(() => c.tick(LONG_PRESS_MS)).toThrow('boom');
      // `fired` is set AFTER the callback, so a throw cannot leave the tab
      // permanently unable to navigate.
      expect(lp.consumeClick()).toBe(false);
    });
  });

  it('leaves no timer armed after up(), so presses cannot stack', () => {
    const { lp, c } = harness();
    lp.down(100, 700);
    expect(c.count).toBe(1);
    lp.up();
    expect(c.count).toBe(0);
    lp.down(100, 700);
    lp.down(120, 720);      // a second down without an up
    expect(c.count).toBe(1);
  });

  it('honours a custom delay and tolerance', () => {
    const { lp, c, fired } = harness({ delayMs: 900, moveTolerance: 2 });
    lp.down(0, 0);
    c.tick(500);
    expect(fired).toHaveLength(0);
    c.tick(900);
    expect(fired).toHaveLength(1);

    const b = harness({ delayMs: 900, moveTolerance: 2 });
    b.lp.down(0, 0);
    b.lp.move(3, 0);
    b.c.tick(900);
    expect(b.fired).toHaveLength(0);
  });
});
