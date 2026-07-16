// use-viewport.js — v0.62.544
//
// Shared React hook for the responsive tablet/desktop layouts (operator: iPad
// Pro rotation should not feel "stretched"). Reports:
//   deviceClass : 'mobile' | 'tablet' | 'desktop'
//   orientation : 'landscape' | 'portrait'
//   isWide      : true for tablet + desktop (the map-fills + side-panel layout)
//
// Detection: a coarse pointer (touch) with a short-edge ≥ 768 px is an iPad-class
// tablet; a fine pointer on a ≥ 1024 px viewport is desktop; everything else
// (phones) stays mobile. Orientation is width ≥ height. Updates are debounced to
// the next animation frame so a rotate re-flows once, cleanly.
//
// Self-contained (no per-TMA imports) so every Mini App imports the one copy.

import { useEffect, useState } from 'react';

export function readViewport() {
  if (typeof window === 'undefined') {
    return { deviceClass: 'mobile', orientation: 'portrait', isWide: false };
  }
  const w = window.innerWidth || 0;
  const h = window.innerHeight || 0;
  const coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  const minDim = Math.min(w, h);
  let deviceClass;
  if (coarse && minDim >= 768) deviceClass = 'tablet';      // iPad-class touch device
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
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
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
