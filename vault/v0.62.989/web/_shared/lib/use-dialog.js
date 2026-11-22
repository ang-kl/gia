// use-dialog.js — shared modal-dialog behaviour for the React TMAs.
//
// P1-d: the repo's only correct dialog implementation was the vanilla
// bottom-sheet (web/_shared/components/bottom-sheet/bottom-sheet.js: focus
// trap at :367-374, Escape, focus restore). None of the ~20 React dialog /
// sheet / popup surfaces carried any of it. This hook lifts that exact
// contract into a reusable primitive:
//
//   const panelRef = useDialog({ open, onClose });
//   <div ref={panelRef} role="dialog" aria-modal="true" aria-label={…}>…</div>
//
// Behaviour while `open`:
//   - remembers document.activeElement and RESTORES focus to it on close
//   - moves initial focus into the panel (first focusable, else the panel
//     itself — the hook sets tabindex="-1" on the panel when needed)
//   - contains Tab / Shift+Tab inside the panel (loops at the ends)
//   - Escape calls onClose (listener is capture-phase on document, so it
//     works no matter which inner element holds focus)
//
// Deliberately NOT included: scroll locking and background `inert` — the
// TMAs' fixed inset-0 scrims already block pointer interaction, and inert
// on the app root needs per-app auditing (portals, toasts) — tracked as a
// follow-up rather than silently half-done here.

import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), ' +
  'select:not([disabled]), textarea:not([disabled]), ' +
  '[tabindex]:not([tabindex="-1"])';

export function useDialog({ open = true, onClose } = {}) {
  const panelRef = useRef(null);
  // Keep the latest onClose in a ref so the effect doesn't re-run (and
  // re-steal focus) every render when callers pass inline closures.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const restoreTo = document.activeElement;

    // Initial focus: first focusable inside the panel, else the panel — but
    // if something inside the panel ALREADY holds focus (React's autoFocus
    // runs at commit, before this effect), leave it alone rather than
    // yanking focus to the first control.
    if (!panel.hasAttribute('tabindex')) panel.setAttribute('tabindex', '-1');
    if (!panel.contains(document.activeElement)) {
      const first = panel.querySelector(FOCUSABLE);
      (first || panel).focus({ preventScroll: true });
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const nodes = Array.from(panel.querySelectorAll(FOCUSABLE))
        .filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (!nodes.length) { e.preventDefault(); panel.focus({ preventScroll: true }); return; }
      const head = nodes[0];
      const tail = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === head || active === panel)) {
        e.preventDefault(); tail.focus({ preventScroll: true });
      } else if (!e.shiftKey && active === tail) {
        e.preventDefault(); head.focus({ preventScroll: true });
      } else if (!panel.contains(active)) {
        e.preventDefault(); head.focus({ preventScroll: true });
      }
    }

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      if (restoreTo && typeof restoreTo.focus === 'function' && document.contains(restoreTo)) {
        restoreTo.focus({ preventScroll: true });
      }
    };
  }, [open]);

  return panelRef;
}

export default useDialog;
