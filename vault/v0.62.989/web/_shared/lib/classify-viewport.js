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

// v0.62.678 — "compact phone" tier, added per the operator's typography/
// screen-size audit (iPhone 11 Pro screenshot review). Sits WITHIN the
// 'mobile' deviceClass — it does not change tablet/desktop classification —
// and separates the SHORT-EDGE end of the phone range (iPhone 11/12/13 Pro,
// 12/13 mini, SE: 375px) from the long end (iPhone 14/15/16 Pro, Pro Max:
// 393-430px). 390 sits between them: every named compact device is <= 375,
// every named large-or-newer phone is >= 393.
export const COMPACT_MAX_WIDTH = 390;

// v0.62.684 — "short viewport" tier, from the operator's carousel-card spec.
// Keys off VIEWPORT HEIGHT, and is deliberately independent of `orientation`:
// the thing that actually constrains how many rows a card can show is vertical
// room, and orientation alone is a bad proxy for it. A phone in landscape has
// 375-393 px of height; an iPad mini in landscape still has 744. Both are
// "landscape", only one is short.
//
// 500 sits in the gap between the tallest phone-landscape height (430 px, the
// Pro Max short edge) and the shortest tablet-landscape height (744 px, iPad
// mini), so the flag catches exactly the phone-landscape case and nothing else.
export const SHORT_MAX_HEIGHT = 500;

// v0.62.654 — ONE definition of "wide", quoted by both the JS classifier and the
// CSS grids.
//
// Until now there were two, and they disagreed. This module said a tablet starts
// at 700 px and a desktop at 1024; the list grids in Transport and Hawker used
// Tailwind breakpoints picked independently. At ~1000 px — exactly the width of
// a half-screen Telegram Desktop window — the CSS said "wide enough for three
// columns" while the classifier said "mobile". Nothing rendered wrongly, but two
// competing answers to the same question is how the next layout bug gets written.
//
// The grids are still driven by CSS (a media query re-flows on a window drag
// without a React render, which a JS read cannot match), so these constants
// cannot be injected into Tailwind directly. Instead they are the DECLARED
// contract, and __tests__/viewport-breakpoints.test.js asserts every app's grid
// class string actually uses them — so drift fails a test instead of shipping.
export const GRID_BREAKPOINTS = Object.freeze({
  // < tabletPx        → 2 columns (phone)
  // >= tabletPx       → 3 columns (iPad mini portrait at 744 upward)
  // >= wideDesktopPx  → 4 columns (desktop, iPad Pro landscape)
  tabletPx: TABLET_MIN_EDGE,
  wideDesktopPx: 1280
});

// The Tailwind class string every list grid must use.
//
// DELIBERATELY A PLAIN LITERAL, never a template interpolation.
//
// This file sits inside every app's Tailwind `content` glob
// (`../_shared/**/*.{js,jsx}`), and the scanner reads the WHOLE FILE as text —
// comments included. Build the arbitrary-width variant by interpolating a
// constant into it and Tailwind reads the un-evaluated placeholder as an
// arbitrary screen value, concludes the `screens` config has MIXED UNITS, and
// disables the arbitrary min-width and max-width variants ENTIRELY. That
// silently drops the 3-column rule from all five stylesheets — it cost the iPad
// mini and iPad landscape their third column, and the only sign was a single
// `warn -` line in the build output. (Writing the offending pattern out even in
// a COMMENT re-triggers it, which is why this note describes it in prose.)
//
// The interpolation that proves this string matches the constants above lives in
// __tests__/viewport-breakpoints.test.js, which Tailwind does not scan.
export const LIST_GRID_CLASS = 'grid grid-cols-2 min-[700px]:grid-cols-3 xl:grid-cols-4';

/** Columns a list grid will show at a given viewport width. Mirrors LIST_GRID_CLASS. */
export function gridColumnsForWidth(w = 0) {
  if (w >= GRID_BREAKPOINTS.wideDesktopPx) return 4;
  if (w >= GRID_BREAKPOINTS.tabletPx) return 3;
  return 2;
}

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
  // v0.62.678 — short-edge check (like the tablet test above), so a compact
  // phone stays flagged whether it's held portrait or landscape.
  const isCompact = deviceClass === 'mobile' && minDim > 0 && minDim <= COMPACT_MAX_WIDTH;
  // v0.62.684 — vertical-room flag (see SHORT_MAX_HEIGHT). Measured on `h`
  // alone, NOT on orientation: what matters is how much height the card has,
  // and a tablet in landscape has plenty while a phone in landscape has none.
  const isShort = h > 0 && h <= SHORT_MAX_HEIGHT;
  return { deviceClass, orientation, isWide: deviceClass !== 'mobile', isCompact, isShort };
}
