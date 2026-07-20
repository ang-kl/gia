// use-viewport.js — v0.62.544
//
// Shared React hook for the responsive tablet/desktop layouts (operator: iPad
// Pro rotation should not feel "stretched"). Reports:
//   deviceClass : 'mobile' | 'tablet' | 'desktop'
//   orientation : 'landscape' | 'portrait'
//   isWide      : true for tablet + desktop (the map-fills + side-panel layout)
//
// Detection: a coarse pointer (touch) with a short-edge ≥ 700 px is an iPad-class
// tablet; a fine pointer on a ≥ 1024 px viewport is desktop; everything else
// (phones) stays mobile. Orientation is width ≥ height. Updates are debounced to
// the next animation frame so a rotate re-flows once, cleanly.
//
// Self-contained (no per-TMA imports) so every Mini App imports the one copy.

import { useEffect, useState } from 'react';

// Physical short-edge (px) at/above which a coarse-pointer device is an
// iPad-class tablet. 700 covers the 744 px iPad mini 6/7 while staying well above
// the largest phones (~480 px short edge) so a phone is never mis-promoted.
export const TABLET_MIN_EDGE = 700;

export function readViewport() {
  if (typeof window === 'undefined') {
    return { deviceClass: 'mobile', orientation: 'portrait', isWide: false };
  }
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const minDim = Math.min(w, h);
  // v0.62.612 — operator: on an iPad / Android tablet the Cuisine TMA kept
  // "reverting" to the phone layout. Cause: Telegram opens (or a swipe collapses)
  // the Mini App to a PARTIAL height, so the webview's min(innerW, innerH) drops
  // below the tablet edge and this classifier mis-read a real tablet as a phone.
  // Fall back to the PHYSICAL screen's short edge (window.screen) — the same
  // signal the fullscreen gate in each tg.js trusts — so a coarse-pointer device
  // whose hardware short edge is ≥ TABLET_MIN_EDGE stays a 'tablet' regardless of
  // the transient webview size (and can never flip back to phone on a resize).
  // v0.62.613 — operator (iPad mini): the edge was 768, but the 6th/7th-gen iPad
  // mini is only 744 px wide, so it fell UNDER the gate and rendered the phone
  // layout. Lowered to 700 — below the 744 mini, safely above the largest phones
  // (~480 px short edge), so phones are never promoted and the mini is covered.
  const scr = typeof window !== 'undefined' ? window.screen : null;
  const screenMin = scr ? Math.min(scr.width || 0, scr.height || 0) : 0;
  let deviceClass;
  if (coarse && (minDim >= TABLET_MIN_EDGE || screenMin >= TABLET_MIN_EDGE)) deviceClass = 'tablet'; // iPad-class touch device
  else if (!coarse && w >= 1024) deviceClass = 'desktop';   // pointer + wide screen
  else deviceClass = 'mobile';
  const orientation = w >= h ? 'landscape' : 'portrait';
  return { deviceClass, orientation, isWide: deviceClass !== 'mobile' };
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
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      if (vv) vv.removeEventListener('resize', update);
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
