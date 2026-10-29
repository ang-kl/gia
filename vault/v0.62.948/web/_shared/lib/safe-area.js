// safe-area.js — v0.62.638
//
// Wire Telegram's device safe-area + content-safe-area (Bot API 8.0) into the
// `--tg-content-safe-area-inset-*` CSS vars that every TMA's fixed headers /
// docks read for their top/bottom padding.
//
// Operator (iPad Pro 11", 25-07 '26): in Telegram FULLSCREEN the app headers
// (Train "Train System" + line pills, Hawker "… Centre" + region pills) sat
// UNDER Telegram's floating Back / ⌄ / ··· buttons. Two causes:
//   1. Only the Hawker TMA ever SET these vars — Transport / Cuisine / Menu /
//      Oversight left them unset, so their headers fell back to
//      env(safe-area-inset-top) ≈ 0 on an iPad (no notch) and stuck to the very
//      top under the buttons.
//   2. Even where set, the client's reported content-safe-area top is smaller
//      than the visible floating-button band, so the header still overlapped.
//
// Fix: one shared writer, called by every app's tg.js, that (a) sets all four
// insets from the Bot API values and (b) enforces a MINIMUM top clearance while
// fullscreen (0 otherwise — phones aren't fullscreen, so no floating buttons and
// no wasted gap). Re-runs on every relevant Telegram event, and toggles a
// `tg-fullscreen` class on <html> for any CSS that wants it.

const MIN_FULLSCREEN_TOP_PX = 64; // clears Telegram's floating Back/⌄/··· band

export function wireSafeAreaInsets(w) {
  if (!w || typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root) return;
  const px = (v) => (typeof v === 'number' && v > 0 ? `${v}px` : '0px');
  const write = () => {
    try {
      const sa = w.safeAreaInset || {};
      const csa = w.contentSafeAreaInset || {};
      const minTop = w.isFullscreen ? MIN_FULLSCREEN_TOP_PX : 0;
      const top = Math.max((sa.top || 0) + (csa.top || 0), minTop);
      root.style.setProperty('--tg-content-safe-area-inset-top', px(top));
      root.style.setProperty('--tg-content-safe-area-inset-bottom', px((sa.bottom || 0) + (csa.bottom || 0)));
      root.style.setProperty('--tg-content-safe-area-inset-left', px((sa.left || 0) + (csa.left || 0)));
      root.style.setProperty('--tg-content-safe-area-inset-right', px((sa.right || 0) + (csa.right || 0)));
      root.classList.toggle('tg-fullscreen', !!w.isFullscreen);
    } catch { /* noop */ }
  };
  write();
  if (typeof w.onEvent === 'function') {
    for (const ev of ['safeAreaChanged', 'contentSafeAreaChanged', 'fullscreenChanged', 'viewportChanged']) {
      try { w.onEvent(ev, write); } catch { /* noop */ }
    }
  }
}
