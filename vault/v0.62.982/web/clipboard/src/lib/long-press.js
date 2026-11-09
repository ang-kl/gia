// long-press.js — the timing half of a press-and-hold gesture.
//
// Pure: no React, no DOM types, no globals. The caller feeds it pointer
// coordinates and wires the callbacks; this owns only the timer, the movement
// tolerance and the "did it fire?" bookkeeping.
//
// It is a separate module because the fiddly parts are exactly the parts a
// screenshot cannot show: that a press which DRIFTS is a scroll and must not
// fire, that a press which fires must swallow the click that follows it
// (otherwise a long-press on a nav tab both opens the picker AND navigates),
// and that a cancelled press leaves nothing armed. Those are cheap to test
// here and expensive to test through a component.
//
// `setTimer`/`clearTimer` are injected so tests can drive time directly rather
// than sleeping or reaching for fake timers.

export const LONG_PRESS_MS = 500;      // matches Cuisine's map long-press
export const MOVE_TOLERANCE_PX = 10;   // below a scroll, above a shaky thumb

export function createLongPress({
  delayMs = LONG_PRESS_MS,
  moveTolerance = MOVE_TOLERANCE_PX,
  onLongPress,
  setTimer = setTimeout,
  clearTimer = clearTimeout
} = {}) {
  let timer = null;
  let origin = null;
  let fired = false;

  const disarm = () => {
    if (timer !== null) { clearTimer(timer); timer = null; }
    origin = null;
  };

  return {
    /** Pointer went down at (x, y). Arms the timer. */
    down(x, y) {
      disarm();
      fired = false;
      origin = { x, y };
      timer = setTimer(() => {
        timer = null;
        // Only mark as fired once the callback has actually run, so a throwing
        // callback cannot leave a click permanently swallowed.
        onLongPress?.();
        fired = true;
      }, delayMs);
    },

    /** Pointer moved. Past the tolerance this is a scroll, not a press. */
    move(x, y) {
      if (!origin) return;
      if (Math.abs(x - origin.x) > moveTolerance || Math.abs(y - origin.y) > moveTolerance) disarm();
    },

    /** Pointer released or cancelled. */
    up() { disarm(); },

    /**
     * True exactly once after a press that fired — the caller uses it to
     * swallow the synthetic click the browser sends on release. Reading it
     * clears it, so a later genuine tap is never eaten.
     */
    consumeClick() {
      if (!fired) return false;
      fired = false;
      return true;
    },

    /** Test seam. */
    get armed() { return timer !== null; }
  };
}
