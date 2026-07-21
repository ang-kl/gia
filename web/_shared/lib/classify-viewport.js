// classify-viewport.js — v0.62.622
//
// The pure, React-free device/orientation classifier behind use-viewport.js,
// split out so it can be unit-tested from the repo-root (node) Vitest context
// without pulling in `react` (which use-viewport.js imports and which is only
// resolvable inside a web/* TMA). No DOM, no side-effects — arithmetic on the
// four measured signals.

// Physical short-edge (px) at/above which a coarse-pointer device is an
// iPad-class tablet. 700 covers the 744 px iPad mini 6/7 while staying well above
// the largest phones (~480 px short edge) so a phone is never mis-promoted.
export const TABLET_MIN_EDGE = 700;

// Classify from the four signals:
//   w, h        live webview innerWidth / innerHeight (px)
//   coarse      matchMedia('(pointer: coarse)') — a touch primary pointer
//   screenMin   physical screen short edge (min of screen.width/height)
//
// Rules:
//   tablet  — a coarse pointer AND the surface is tablet-sized. "Tablet-sized"
//             is EITHER the live short edge ≥ 700 (a normally-sized tablet
//             webview) OR the physical screen ≥ 700 while the live WIDTH is also
//             ≥ 700 (a real tablet whose webview is merely collapsed to partial
//             HEIGHT — width stays wide). The width guard stops a narrow (~500 px)
//             Telegram-Desktop window on a touchscreen laptop, whose physical
//             monitor is ≥ 700, from being mis-read as a tablet (v0.62.622).
//   desktop — a fine pointer on a ≥ 1024 px viewport.
//   mobile  — everything else (phones, and narrow windows of any kind).
export function classifyViewport({ w = 0, h = 0, coarse = false, screenMin = 0 } = {}) {
  const minDim = Math.min(w, h);
  let deviceClass;
  if (coarse && (minDim >= TABLET_MIN_EDGE || (screenMin >= TABLET_MIN_EDGE && w >= TABLET_MIN_EDGE))) {
    deviceClass = 'tablet';
  } else if (!coarse && w >= 1024) {
    deviceClass = 'desktop';
  } else {
    deviceClass = 'mobile';
  }
  const orientation = w >= h ? 'landscape' : 'portrait';
  return { deviceClass, orientation, isWide: deviceClass !== 'mobile' };
}
