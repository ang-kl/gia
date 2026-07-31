// use-viewport.js — v0.62.544
//
// Shared React hook for the responsive tablet/desktop layouts (operator: iPad
// Pro rotation should not feel "stretched"). Reports:
//   deviceClass : 'mobile' | 'tablet' | 'desktop'
//   orientation : 'landscape' | 'portrait'
//   isWide      : true for tablet + desktop (the map-fills + side-panel layout)
//   isCompact   : true for a 'mobile' device with a short edge <= 390px (iPhone
//                 11/12/13 Pro, 12/13 mini, SE) — v0.62.678, see classify-
//                 viewport.js's COMPACT_MAX_WIDTH for the exact rule
//
// Detection: a coarse pointer (touch) with a short-edge ≥ 700 px is an iPad-class
// tablet; a fine pointer on a ≥ 1024 px viewport is desktop; everything else
// (phones) stays mobile. Orientation is width ≥ height. Updates are debounced to
// the next animation frame so a rotate re-flows once, cleanly.
//
// Self-contained (no per-TMA imports) so every Mini App imports the one copy.

import { useEffect, useState } from 'react';
// v0.62.622 — the pure classifier now lives in a React-free module so it can be
// unit-tested from the repo-root (node) Vitest context. See classify-viewport.js
// for the tablet/desktop/mobile rules (incl. the v0.62.612/613/622 history:
// physical-screen fallback for partial-height iPad webviews, the 768→700 edge
// for the iPad mini, and the live-width guard that stops a narrow Telegram
// Desktop window on a touchscreen laptop from being mis-read as a tablet).
import { TABLET_MIN_EDGE, COMPACT_MAX_WIDTH, classifyViewport } from './classify-viewport.js';

export { TABLET_MIN_EDGE, COMPACT_MAX_WIDTH };

export function readViewport() {
  if (typeof window === 'undefined') {
    return { deviceClass: 'mobile', orientation: 'portrait', isWide: false, isCompact: false };
  }
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const scr = window.screen || null;
  const screenMin = scr ? Math.min(scr.width || 0, scr.height || 0) : 0;
  return classifyViewport({ w, h, coarse, screenMin });
}

export function useViewport() {
  const [vp, setVp] = useState(readViewport);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp(readViewport()));
    };
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    // v0.62.546 — Telegram's requestFullscreen resizes the webview shortly after
    // mount but may NOT fire a window 'resize' (so the initial mount read — the
    // small centered modal — would stick as 'mobile'). Also listen on the visual
    // viewport, and re-read a few times after mount to catch the post-fullscreen
    // size on the FIRST open (before any rotate).
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv) vv.addEventListener('resize', update);
    const timers = [setTimeout(update, 250), setTimeout(update, 700), setTimeout(update, 1500)];
    // v0.62.654 — the three timers above are a GUESS at when Telegram finishes
    // resizing the webview after requestFullscreen(). Telegram tells us exactly
    // when, and we were not listening: `fullscreenChanged` fires on the
    // enter/exit transition and `viewportChanged` on every height change. Without
    // these, a fullscreen transition slower than 1500 ms leaves the layout stuck
    // on the pre-expand classification for the rest of the session — nothing
    // re-measures again until the user resizes or rotates. Shared hook, so all
    // five TMAs gain this at once.
    const tgw = (typeof window !== 'undefined' && window.Telegram) ? window.Telegram.WebApp : null;
    const TG_EVENTS = ['fullscreenChanged', 'viewportChanged'];
    if (tgw && typeof tgw.onEvent === 'function') {
      for (const ev of TG_EVENTS) {
        try { tgw.onEvent(ev, update); } catch { /* older client without this event */ }
      }
    }
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (vv) vv.removeEventListener('resize', update);
      if (tgw && typeof tgw.offEvent === 'function') {
        for (const ev of TG_EVENTS) {
          try { tgw.offEvent(ev, update); } catch { /* noop */ }
        }
      }
      timers.forEach(clearTimeout);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);
  return vp;
}

// Footer label beside the version: "(tablet · landscape)" / "(tablet)" /
// "(desktop · landscape)" / "" (mobile). Portrait drops the "landscape" word
// (operator). Empty string on phones — the parenthetical is a tablet/desktop cue.
export function viewportTag(vp) {
  if (!vp || !vp.isWide) return '';
  return vp.orientation === 'landscape'
    ? `(${vp.deviceClass} · landscape)`
    : `(${vp.deviceClass})`;
}
