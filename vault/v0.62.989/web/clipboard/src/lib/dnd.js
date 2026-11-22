// dnd.js — pointer-event drag helper for the Clipboard TMA.
//
// Long-press a card to enter drag mode; pointer movement updates the ghost's
// position; pointerup on a registered drop-target fires its handler. No DnD
// library — keeps the bundle flat and gives precise control over the haptics
// and the visual cues.
//
// Drop targets register via data-clipboard-drop="cabinet:<cabId>" or
// "drawer:<cabId>:<n>" on any DOM node. useDrag's `onDrop` callback receives
// the parsed target spec.
//
// v0.62.707 — TWO fixes for the operator's "if I want to move the card by
// holding on it / can it hard-friction the scroll bar. currently is too
// smooth to move around":
//
//   1. THERE WAS NO MOVEMENT GUARD. The 280ms timer fired whether or not the
//      finger had moved, so an ordinary scroll that happened to start on a
//      card ALSO began a drag 280ms in — the list scrolling under the finger
//      while a ghost followed it. A press that drifts is a scroll, and it now
//      cancels, using the same `createLongPress` written for the footer tab in
//      v0.62.705 rather than a second copy of the same logic.
//
//   2. FREE SCROLLING IS TAKEN AWAY FOR THE DURATION OF A DRAG, and replaced
//      with deliberate edge auto-scroll (see ./drag-scroll.js). Nothing moves
//      until the card is held near the top or bottom of the list, and then the
//      speed ramps quadratically — a crawl at the boundary, full speed only at
//      the very edge. That is the requested friction: scrolling becomes
//      something you ask for, not a by-product of moving your hand.
//
// The scroll lock is applied AT DRAG START, which is the one moment it can
// work: the long press requires 280ms of stillness, so the browser has not yet
// committed to a scroll gesture and `touch-action: none` still takes effect for
// the remainder of the interaction.

import { useEffect, useRef, useState } from 'react';
import { haptic } from './tg.js';
import { createLongPress } from './long-press.js';
import { edgeScrollDelta, createScrollDriver } from './drag-scroll.js';

const LONG_PRESS_MS = 280;
const DRAG_MOVE_TOLERANCE_PX = 8;   // tighter than the footer's 10 — a card sits in a scrolling list

/** The nearest ancestor that actually scrolls. */
function scrollParent(node) {
  let el = node && node.parentElement;
  while (el && el !== document.body) {
    const oy = getComputedStyle(el).overflowY;
    if ((oy === 'auto' || oy === 'scroll') && el.scrollHeight > el.clientHeight) return el;
    el = el.parentElement;
  }
  return null;
}

export function useDrag({ onDrop }) {
  const [dragging, setDragging] = useState(null);   // { cardId, label, x, y }
  const stateRef = useRef({ active: false, ghost: null, scroller: null, restore: null, raf: 0, y: 0 });

  // On-unmount cleanup only — the per-drag move/up listeners are registered
  // inside the drag-start closure and removed there too. This makes sure a
  // stale ghost, a locked scroller or a live rAF does not outlive the
  // component if it unmounts mid-drag.
  useEffect(() => {
    return () => {
      const s = stateRef.current;
      if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
      if (s.restore) { s.restore(); s.restore = null; }
      if (s.ghost && s.ghost.parentNode) {
        s.ghost.parentNode.removeChild(s.ghost);
        s.ghost = null;
      }
    };
  }, []);

  function dragHandle({ cardId, label }) {
    // One press controller per handle instance, created lazily so it is not
    // rebuilt on every render.
    let press = null;

    return {
      onPointerDown(e) {
        if (e.button && e.button !== 0) return;
        const s = stateRef.current;
        const node = e.currentTarget;
        const startX = e.clientX, startY = e.clientY;
        const pointerId = e.pointerId;

        press = createLongPress({
          delayMs: LONG_PRESS_MS,
          moveTolerance: DRAG_MOVE_TOLERANCE_PX,
          onLongPress: () => begin(node, cardId, label, startX, startY, pointerId, s)
        });
        press.down(startX, startY);
      },
      // A drift past the tolerance cancels the pending drag — that gesture is
      // a scroll, and the list should scroll normally.
      onPointerMove(e) { press && press.move(e.clientX, e.clientY); },
      onPointerUp() { press && press.up(); },
      onPointerCancel() { press && press.up(); }
    };
  }

  function begin(node, cardId, label, startX, startY, pointerId, s) {
    s.active = true;
    s.y = startY;
    haptic('light');

    // Capture the pointer so the stream keeps coming to us even if the finger
    // leaves the card, and so the browser stops treating it as a page gesture.
    try { node.setPointerCapture?.(pointerId); } catch { /* not captureable */ }

    // ── take free scrolling away for the duration ──
    const scroller = scrollParent(node);
    s.scroller = scroller;
    if (scroller) {
      const prevTouch = scroller.style.touchAction;
      const prevOverscroll = scroller.style.overscrollBehavior;
      scroller.style.touchAction = 'none';
      scroller.style.overscrollBehavior = 'contain';
      s.restore = () => {
        scroller.style.touchAction = prevTouch;
        scroller.style.overscrollBehavior = prevOverscroll;
      };
    } else {
      s.restore = null;
    }

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    ghost.textContent = label || '📋';
    document.body.appendChild(ghost);
    ghost.style.left = `${startX + 12}px`;
    ghost.style.top = `${startY - 28}px`;
    s.ghost = ghost;

    // Carry cardId on every drop target so _onUp's elementFromPoint
    // resolution can find it.
    document.querySelectorAll('[data-clipboard-drop]').forEach((n) => { n.__dragCardId = cardId; });
    setDragging({ cardId, label, x: startX, y: startY });

    // ── the deliberate edge scroll ──
    // One rAF loop for the whole drag, reading the latest pointer y. Driving
    // it from the move event instead would tie scroll speed to how fast the
    // finger is moving, and a finger held still at the edge would never
    // scroll at all.
    // Carries the sub-pixel remainder, so the slow end of the ramp actually
    // creeps instead of being rounded away by scrollTop every frame.
    const driver = createScrollDriver();
    const tick = () => {
      if (!s.active) { s.raf = 0; return; }
      if (s.scroller) {
        const r = s.scroller.getBoundingClientRect();
        const moved = driver.step(s.scroller, edgeScrollDelta({ y: s.y, top: r.top, bottom: r.bottom }));
        // The list moved under a stationary finger, so what is beneath the
        // pointer changed — re-resolve the drop target.
        if (moved) highlight(s.lastX ?? startX, s.y);
      }
      s.raf = requestAnimationFrame(tick);
    };
    s.raf = requestAnimationFrame(tick);

    function highlight(x, y) {
      const el = document.elementFromPoint(x, y);
      const tgt = el && el.closest('[data-clipboard-drop]');
      document.querySelectorAll('.dropzone').forEach((n) => n.classList.remove('dropzone'));
      if (tgt) tgt.classList.add('dropzone');
      return tgt;
    }

    function _onMove(ev) {
      if (!s.active) return;
      ev.preventDefault();
      const x = ev.clientX, y = ev.clientY;
      s.lastX = x; s.y = y;
      if (s.ghost) {
        s.ghost.style.left = `${x + 12}px`;
        s.ghost.style.top = `${y - 28}px`;
      }
      highlight(x, y);
    }

    function _onUp(ev) {
      if (!s.active) return;
      s.active = false;
      if (s.raf) { cancelAnimationFrame(s.raf); s.raf = 0; }
      if (s.restore) { s.restore(); s.restore = null; }
      s.scroller = null;

      const x = ev.clientX, y = ev.clientY;
      const el = document.elementFromPoint(x, y);
      const tgt = el && el.closest('[data-clipboard-drop]');
      document.querySelectorAll('.dropzone').forEach((n) => n.classList.remove('dropzone'));
      if (s.ghost && s.ghost.parentNode) s.ghost.parentNode.removeChild(s.ghost);
      s.ghost = null;
      setDragging(null);
      if (tgt && onDrop) {
        const spec = parseTarget(tgt.dataset.clipboardDrop);
        if (spec) {
          haptic('success');
          onDrop({ ...spec, cardId: tgt.__dragCardId });
        }
      }
      window.removeEventListener('pointermove', _onMove);
      window.removeEventListener('pointerup', _onUp);
      window.removeEventListener('pointercancel', _onUp);
    }

    window.addEventListener('pointermove', _onMove, { passive: false });
    window.addEventListener('pointerup', _onUp);
    window.addEventListener('pointercancel', _onUp);
  }

  return { dragging, dragHandle };
}

function parseTarget(raw) {
  // raw: "cabinet:<cabId>" | "drawer:<cabId>:<n>"
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.split(':');
  if (parts[0] === 'cabinet' && parts[1]) return { kind: 'cabinet', cabinetId: parts[1] };
  if (parts[0] === 'drawer' && parts[1] && parts[2] != null) {
    const n = Number(parts[2]);
    if (!Number.isInteger(n) || n < 0) return null;
    return { kind: 'drawer', cabinetId: parts[1], drawerIdx: n };
  }
  return null;
}
