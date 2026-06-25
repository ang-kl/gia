// dnd.js — pointer-event drag helper for the Clipboard TMA.
//
// Long-press a catch-all card to enter drag mode; pointer movement
// updates the ghost element's position; pointerup on a registered
// drop-target fires its handler. No DnD library — keeps the bundle
// flat and gives us precise control over the haptic + visual cues.
//
// Drop targets register via data-clipboard-drop="cabinet:<cabId>" or
// "drawer:<cabId>:<n>" on any DOM node. useDrag's `onDrop` callback
// receives the parsed target spec.

import { useEffect, useRef, useState } from 'react';
import { haptic } from './tg.js';

const LONG_PRESS_MS = 280;

export function useDrag({ onDrop }) {
  const [dragging, setDragging] = useState(null);   // { cardId, label, x, y }
  const stateRef = useRef({ active: false, timer: null, ghost: null });

  // On-unmount cleanup only — the per-drag move/up listeners are
  // registered inside the setTimeout closure in dragHandle and
  // removed there too. We only need to make sure a stale ghost
  // doesn't outlive the component if it unmounts mid-drag.
  useEffect(() => {
    return () => {
      const s = stateRef.current;
      if (s.timer) { clearTimeout(s.timer); s.timer = null; }
      if (s.ghost && s.ghost.parentNode) {
        s.ghost.parentNode.removeChild(s.ghost);
        s.ghost = null;
      }
    };
  }, []);

  // Props to spread onto a draggable card element.
  //
  // v0.62.330 — Codex P1 fix: the pointermove / pointerup handlers MUST
  // be defined in the same closure that registers them on window.
  // Previously they were declared inside the on-mount useEffect (so out
  // of scope here) and the first real drag threw a ReferenceError. Now
  // both _onMove and _onUp live inside the setTimeout closure where
  // they're created + registered + removed, and reference the drag
  // state via stateRef + the captured cardId/label/onDrop closure.
  function dragHandle({ cardId, label }) {
    return {
      onPointerDown(e) {
        if (e.button && e.button !== 0) return;
        const s = stateRef.current;
        clearTimeout(s.timer);
        const startX = e.clientX, startY = e.clientY;
        s.timer = setTimeout(() => {
          s.active = true;
          haptic('light');
          // Create the floating ghost element.
          const ghost = document.createElement('div');
          ghost.className = 'drag-ghost';
          ghost.textContent = label || '📋';
          document.body.appendChild(ghost);
          ghost.style.left = `${startX + 12}px`;
          ghost.style.top  = `${startY - 28}px`;
          s.ghost = ghost;
          // Carry cardId on every drop target so onPointerUp's
          // elementFromPoint resolution can find it.
          document.querySelectorAll('[data-clipboard-drop]').forEach((n) => { n.__dragCardId = cardId; });
          setDragging({ cardId, label, x: startX, y: startY });

          function _onMove(ev) {
            if (!s.active) return;
            ev.preventDefault();
            const x = ev.clientX, y = ev.clientY;
            if (s.ghost) {
              s.ghost.style.left = `${x + 12}px`;
              s.ghost.style.top  = `${y - 28}px`;
            }
            const el = document.elementFromPoint(x, y);
            const tgt = el && el.closest('[data-clipboard-drop]');
            document.querySelectorAll('.dropzone').forEach((n) => n.classList.remove('dropzone'));
            if (tgt) tgt.classList.add('dropzone');
          }

          function _onUp(ev) {
            if (!s.active) return;
            s.active = false;
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
        }, LONG_PRESS_MS);
      },
      onPointerUp() {
        const s = stateRef.current;
        clearTimeout(s.timer);
      },
      onPointerCancel() {
        const s = stateRef.current;
        clearTimeout(s.timer);
      }
    };
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
