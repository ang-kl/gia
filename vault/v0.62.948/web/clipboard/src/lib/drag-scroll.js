// drag-scroll.js — deliberate edge auto-scroll for card dragging.
//
// Operator: "if I want to move the card by holding on it / can it
// hard-friction the scroll bar. currently is too smooth to move around".
//
// The old behaviour had no scroll model at all: the list kept its ordinary
// touch scrolling while a card was being dragged, so the finger moved the card
// AND the list underneath it at the same time. Aiming at a drawer meant
// fighting the page.
//
// The fix is not "make scrolling slower". It is to take free scrolling away
// during a drag and give back a scroll you have to ASK for: nothing happens
// until the card is held near the top or bottom edge, and then the speed ramps
// from a crawl to a maximum as you push further in. That is where the friction
// lives — the ramp is quadratic, so at the boundary of the edge zone the list
// barely creeps, and you have to commit to reach full speed.
//
// Pure: geometry in, pixels-per-frame out. No DOM, no timers, no React.

/** How deep from each edge the auto-scroll zone reaches. */
export const EDGE_ZONE_PX = 72;

/** Ceiling, in px per animation frame (~14px ≈ 840px/s at 60fps). */
export const MAX_SPEED_PX = 14;

/**
 * Ramp exponent. 1 would be linear — a constant, "smooth" pull that starts
 * the moment you cross the boundary, which is the feel being complained
 * about. 2 makes the first half of the zone almost inert (25% speed at the
 * halfway point) and concentrates the movement at the very edge.
 */
export const RAMP_CURVE = 2;

function ramp(depth, maxSpeed, curve) {
  const d = Math.min(Math.max(depth, 0), 1);
  return Math.pow(d, curve) * maxSpeed;
}

/**
 * Pixels to scroll this frame. Negative scrolls up, positive down, 0 rests.
 *
 * @param {number} y       pointer's viewport y
 * @param {number} top     scroll container's viewport top
 * @param {number} bottom  scroll container's viewport bottom
 */
export function edgeScrollDelta({
  y, top, bottom,
  zone = EDGE_ZONE_PX,
  maxSpeed = MAX_SPEED_PX,
  curve = RAMP_CURVE
} = {}) {
  if (![y, top, bottom].every(Number.isFinite) || bottom <= top) return 0;

  // On a short container two full-size zones would overlap in the middle and
  // there would be no rest band at all — every position would scroll.
  const z = Math.min(zone, (bottom - top) / 2);
  if (z <= 0) return 0;

  if (y < top + z) return -ramp((top + z - y) / z, maxSpeed, curve);
  if (y > bottom - z) return ramp((y - (bottom - z)) / z, maxSpeed, curve);
  return 0;
}

/**
 * Apply one frame of scrolling, clamped to the container's real range.
 * Returns the number of pixels actually moved, which is 0 at either end —
 * the caller can use that to stop a pointless rAF loop.
 */
export function applyScrollStep(el, delta) {
  if (!el || !delta) return 0;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 0) return 0;
  const before = el.scrollTop;
  el.scrollTop = Math.min(Math.max(before + delta, 0), max);
  return el.scrollTop - before;
}

/**
 * A driver that carries the sub-pixel remainder between frames.
 *
 * Without this the slow end of the ramp is simply dead. `scrollTop` snaps to
 * whole pixels, so a 0.1px/frame delta assigns `before + 0.1`, lands back on
 * `before`, and the fraction is discarded — every frame, forever. Measured in
 * the browser: a card held just inside the zone boundary moved **0px in
 * 500ms**, when the model says it should creep. That silently pushed the rest
 * band ~14px past where it was designed to end, and made the shipped feel
 * disagree with the tested one.
 *
 * Accumulating means the creep is real: ten frames at 0.1 move one pixel.
 */
export function createScrollDriver() {
  let carry = 0;
  return {
    step(el, delta) {
      carry += delta;
      const whole = Math.trunc(carry);
      if (!whole) return 0;
      carry -= whole;
      const moved = applyScrollStep(el, whole);
      // Hit an end — drop the remainder so it cannot burst when direction
      // reverses.
      if (moved !== whole) carry = 0;
      return moved;
    },
    reset() { carry = 0; }
  };
}
