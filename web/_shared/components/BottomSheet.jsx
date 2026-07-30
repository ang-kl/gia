// BottomSheet.jsx — v0.62.648
//
// A Google-Maps-style draggable bottom sheet. A full-bleed map sits behind; this
// sheet holds the scrolling list and snaps between a few heights. A short centred
// bar is the drag handle: drag it up to see more of the list, down to collapse.
// Tapping the handle steps to the next snap. Pointer Events (mouse + touch).
// The inner list scrolls independently — only the handle drags the sheet.
//
// `snaps` are TOP offsets as a fraction of the viewport height (smaller = taller
// sheet). Defaults: 0.14 full · 0.48 half · 0.80 collapsed (a peek over the map).
//
// v0.62.648 — TWO fixes for the operator's standing "I still didn't see the
// drawer handle":
//
//   1. THE HANDLE WAS LITERALLY INVISIBLE. It was painted with `bg-tg-hint/70`,
//      and Tailwind emitted NO RULE for that class: an opacity modifier on a
//      colour defined as a raw `var()` string is silently dropped (see
//      web/_shared/lib/tg-colors.js, which fixes the palette repo-wide). The
//      grabber rendered as a transparent 48x6 box. The v0.62.620 pass tried to
//      fix this by enlarging the bar, which could not work. The grabber now
//      carries an INLINE background as well, so it cannot silently vanish again
//      no matter what the utility layer does.
//   2. The grab zone was ~26px tall (`pt-3 pb-2` + a 6px bar). It is now a
//      44px minimum target — the Apple HIG / WCAG 2.5.8 floor.
//
// Release physics also gain a velocity term (shared with the vanilla component
// in ./bottom-sheet/): the resting snap is chosen from where the sheet is
// HEADING — position projected forward by the trailing-window velocity — not
// from where the finger happened to stop. A flick now travels; before, a fast
// short flick snapped straight back to where it started.
import React, { useRef, useState } from 'react';
import { sampleVelocity, rubberBand, DEFAULTS as SHEET_DEFAULTS } from './bottom-sheet/bottom-sheet.js';
import { classifyViewport } from '../lib/classify-viewport.js';

// How far ahead (ms) to project the sheet's momentum when picking a snap.
const PROJECT_MS = 140;

// v0.62.660 — operator: the drawer handle should feel lighter (less resistant
// to overdrag past its open/collapsed ends) on a larger, more precise input
// surface. `SHEET_DEFAULTS.rubberBandFactor` (0.35) — already the standalone
// vanilla component's own "resistance applied to over-drag" constant — is the
// phone baseline; tablet gets 20% less resistance, desktop 40% less. Only the
// FACTOR scales — `rubberBandMax` (the absolute overdrag ceiling, 48px) stays
// the same for every device, since nothing asked for a bigger travel range,
// just a lighter feel getting there.
const FRICTION_BY_CLASS = {
  mobile: SHEET_DEFAULTS.rubberBandFactor,
  tablet: SHEET_DEFAULTS.rubberBandFactor * 0.8,
  desktop: SHEET_DEFAULTS.rubberBandFactor * 0.6
};

function currentDeviceClass() {
  if (typeof window === 'undefined') return 'mobile';
  let coarse = false;
  try { coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches); } catch { /* noop */ }
  const screenMin = Math.min(window.screen?.width || 0, window.screen?.height || 0);
  return classifyViewport({ w: window.innerWidth, h: window.innerHeight, coarse, screenMin }).deviceClass;
}

export default function BottomSheet({
  snaps = [0.14, 0.48, 0.80],
  initialSnap = 1,
  contentRef = null,
  onContentScroll = null,
  footerPad = '3.25rem',
  ariaLabel = 'Drag to resize the list',
  peekPx = null,
  children
}) {
  const [snapIdx, setSnapIdx] = useState(initialSnap);
  const [dragTop, setDragTop] = useState(null); // px while dragging
  const drag = useRef(null);
  const vh = () => (typeof window !== 'undefined' ? window.innerHeight : 800);
  // v0.62.655 — `peekPx` overrides the COLLAPSED (last) snap with a real pixel
  // height instead of a viewport fraction. Operator: the drawer "should show only
  // 1.5 card height in list mode so user knows how to scroll up and down". 1.5
  // cards is a fact about the CARD, not about the screen — a fraction of vh gets
  // it right on one device and wrong on every other. The caller measures its own
  // first card and passes the number; the fraction stays as the fallback.
  const topPx = (idx) => {
    if (peekPx != null && idx === snaps.length - 1) {
      return Math.max(0, Math.round(vh() - peekPx));
    }
    return Math.round(snaps[idx] * vh());
  };
  const curTop = dragTop != null ? dragTop : topPx(snapIdx);

  const stamp = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

  const onDown = (e) => {
    // Device class (and so friction) is fixed for the duration of one drag —
    // read once at the start rather than mid-gesture, so an orientation change
    // never rewrites the feel of a drag already in flight.
    const friction = FRICTION_BY_CLASS[currentDeviceClass()] ?? FRICTION_BY_CLASS.mobile;
    drag.current = { y: e.clientY, top: curTop, moved: false, samples: [{ y: e.clientY, t: stamp() }], friction };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dy) > 3) drag.current.moved = true;
    drag.current.samples.push({ y: e.clientY, t: stamp() });
    if (drag.current.samples.length > 24) drag.current.samples.shift();
    const lo = topPx(0);
    const hi = topPx(snaps.length - 1);
    const raw = drag.current.top + dy;
    // Past either end the handle gets progressively harder to pull — a real
    // rubber-band curve (diminishing returns, capped at rubberBandMax) rather
    // than the old flat 0.06·vh allowance on the collapsed side only and a
    // hard wall on the expanded side.
    let next;
    if (raw < lo) next = lo - rubberBand(lo - raw, drag.current.friction, SHEET_DEFAULTS.rubberBandMax);
    else if (raw > hi) next = hi + rubberBand(raw - hi, drag.current.friction, SHEET_DEFAULTS.rubberBandMax);
    else next = raw;
    setDragTop(next);
  };
  const onUp = () => {
    if (!drag.current) return;
    if (drag.current.moved) {
      // Snap to where the sheet is HEADING, not where the finger stopped: the
      // release position projected forward by the trailing-window velocity.
      // Without this a fast, short flick lands back on the snap it left.
      const cur = dragTop != null ? dragTop : curTop;
      const v = sampleVelocity(drag.current.samples);   // px/ms, + = downward
      const projected = cur + v * PROJECT_MS;
      let best = 0, bd = Infinity;
      snaps.forEach((s, i) => { const d = Math.abs(topPx(i) - projected); if (d < bd) { bd = d; best = i; } });
      setSnapIdx(best);
    } else {
      // a tap on the handle steps taller (wraps at the top back to collapsed)
      setSnapIdx((i) => (i <= 0 ? snaps.length - 1 : i - 1));
    }
    setDragTop(null);
    drag.current = null;
  };

  // P1-d — the handle advertised itself as a focusable button but had no
  // keyboard operation at all (pointer-only). Enter/Space now mirror the tap
  // (step taller, wrapping back to collapsed at the top); ArrowUp/ArrowDown
  // move one snap taller/shorter; Home/End jump to fully open / collapsed.
  const onHandleKey = (e) => {
    const last = snaps.length - 1;
    let handled = true;
    if (e.key === 'Enter' || e.key === ' ') setSnapIdx((i) => (i <= 0 ? last : i - 1));
    else if (e.key === 'ArrowUp') setSnapIdx((i) => Math.max(0, i - 1));
    else if (e.key === 'ArrowDown') setSnapIdx((i) => Math.min(last, i + 1));
    else if (e.key === 'Home') setSnapIdx(0);
    else if (e.key === 'End') setSnapIdx(last);
    else handled = false;
    if (handled) e.preventDefault();
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-tg-bg rounded-t-2xl border-t border-tg-border shadow-[0_-6px_24px_rgba(0,0,0,0.28)] flex flex-col"
      style={{ top: curTop, transition: dragTop != null ? 'none' : 'top 0.28s cubic-bezier(0.32,0.72,0,1)' }}
      data-gia-drawer
    >
      {/* Drag handle. The 44px minimum target is the whole band, full width —
          the visible pill is only the affordance. The inline backgroundColor is
          deliberate belt-and-braces: this bar has gone invisible once already
          because a Tailwind opacity utility was dropped at build time. */}
      <div
        className="shrink-0 min-h-[44px] flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onKeyDown={onHandleKey}
        role="button" tabIndex={0} aria-label={ariaLabel}
      >
        <div
          className="h-1.5 w-12 rounded-full"
          style={{ backgroundColor: 'var(--tg-hint, #98989f)', opacity: 0.8 }}
        />
      </div>
      <div ref={contentRef} onScroll={onContentScroll} className="flex-1 overflow-y-auto" style={{ paddingBottom: footerPad }}>
        {children}
      </div>
    </div>
  );
}
