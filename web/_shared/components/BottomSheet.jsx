// BottomSheet.jsx — v0.62.608
//
// A Google-Maps-style draggable bottom sheet. A full-bleed map sits behind; this
// sheet holds the scrolling list and snaps between a few heights. A short centred
// grey bar is the drag handle: drag it up to see more of the list, down to
// collapse. Tapping the handle steps to the next snap. Pointer Events (mouse +
// touch). The inner list scrolls independently — only the handle drags the sheet.
//
// `snaps` are TOP offsets as a fraction of the viewport height (smaller = taller
// sheet). Defaults: 0.14 full · 0.48 half · 0.80 collapsed (a peek over the map).
import React, { useRef, useState } from 'react';

export default function BottomSheet({
  snaps = [0.14, 0.48, 0.80],
  initialSnap = 1,
  contentRef = null,
  onContentScroll = null,
  footerPad = '3.25rem',
  children
}) {
  const [snapIdx, setSnapIdx] = useState(initialSnap);
  const [dragTop, setDragTop] = useState(null); // px while dragging
  const drag = useRef(null);
  const vh = () => (typeof window !== 'undefined' ? window.innerHeight : 800);
  const topPx = (idx) => Math.round(snaps[idx] * vh());
  const curTop = dragTop != null ? dragTop : topPx(snapIdx);

  const onDown = (e) => {
    drag.current = { y: e.clientY, top: curTop, moved: false };
    try { e.currentTarget.setPointerCapture?.(e.pointerId); } catch { /* noop */ }
  };
  const onMove = (e) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dy) > 3) drag.current.moved = true;
    const lo = topPx(0);
    const hi = topPx(snaps.length - 1) + 0.06 * vh(); // a touch of over-drag past collapsed
    setDragTop(Math.max(lo, Math.min(hi, drag.current.top + dy)));
  };
  const onUp = () => {
    if (!drag.current) return;
    if (drag.current.moved) {
      // snap to the nearest configured height
      const cur = dragTop != null ? dragTop : curTop;
      let best = 0, bd = Infinity;
      snaps.forEach((s, i) => { const d = Math.abs(topPx(i) - cur); if (d < bd) { bd = d; best = i; } });
      setSnapIdx(best);
    } else {
      // a tap on the handle steps taller (wraps at the top back to collapsed)
      setSnapIdx((i) => (i <= 0 ? snaps.length - 1 : i - 1));
    }
    setDragTop(null);
    drag.current = null;
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 bg-tg-bg rounded-t-2xl border-t border-tg-border shadow-[0_-6px_24px_rgba(0,0,0,0.28)] flex flex-col"
      style={{ top: curTop, transition: dragTop != null ? 'none' : 'top 0.28s cubic-bezier(0.25,0.8,0.3,1)' }}
    >
      {/* drag handle — the short centred bar (Google-Maps style). */}
      <div
        className="shrink-0 pt-2.5 pb-1.5 flex justify-center touch-none select-none cursor-grab active:cursor-grabbing"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        role="button" tabIndex={0} aria-label="Drag to resize the list"
      >
        <div className="h-1.5 w-10 rounded-full bg-tg-hint/40" />
      </div>
      <div ref={contentRef} onScroll={onContentScroll} className="flex-1 overflow-y-auto" style={{ paddingBottom: footerPad }}>
        {children}
      </div>
    </div>
  );
}
