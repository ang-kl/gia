// Telegram WebApp helpers (Clipboard TMA).
//
// Slim copy of web/cuisine/src/api/tg.js — just the four functions the
// Clipboard surface actually uses. Keeping it small (no v2-specific deps)
// makes the per-call overhead obvious.
//
// P2 (v0.62.669) — NO theme plumbing here, deliberately: Sketchbook's palette
// is FIXED-LIGHT by operator decision (D-37; tailwind.config.js hard-codes
// every tg-* colour), so the old themeParams → --tg-* variable writes had
// zero consumers and were removed as dead code. Don't re-add them — a future
// Telegram-theming pass would go through tailwind.config.js, not here.

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function initData() {
  return tg()?.initData || '';
}

export function hasInitData() {
  return !!(tg()?.initData);
}

export function getLanguage() {
  const w = tg();
  const tgLang = w?.initDataUnsafe?.user?.language_code;
  if (tgLang) return String(tgLang).slice(0, 2).toLowerCase();
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.slice(0, 2).toLowerCase();
  }
  return 'en';
}

export function initTelegramChrome() {
  const w = tg();
  if (!w) return;
  const safe = (label, fn) => {
    try { fn(); }
    catch (err) {
      try { console.warn(`[Clipboard-TMA-Init-Err] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };
  safe('ready', () => w.ready());
  safe('expand', () => w.expand());
  // v0.62.663 — operator: auto-maximize on Telegram Desktop when the window
  // isn't already. Mirrors Cuisine/Hawker/Transport's tg.js (see their
  // "auto-fullscreen saga" comments) — `requestFullscreen()` (Bot API 8.0) is
  // the only programmatic way to enlarge a Mini App; there's no API that
  // reports the OS window's actual minimized/maximized state, so
  // `w.isFullscreen` (Telegram's own flag) is the closest available proxy,
  // and it's what stops this from re-firing on every reload.
  safe('fullscreen', () => {
    if (typeof w.requestFullscreen !== 'function') return;
    if (typeof w.isVersionAtLeast === 'function' && !w.isVersionAtLeast('8.0')) return;
    if (w.isFullscreen) return;
    try { if (typeof w.onEvent === 'function') w.onEvent('fullscreenFailed', () => { /* UNSUPPORTED on this client */ }); } catch { /* noop */ }
    const platform = String(w.platform || '').toLowerCase();
    if (platform !== 'tdesktop' && platform !== 'macos') return;
    try { w.requestFullscreen(); } catch { /* best-effort */ }
  });
  // v0.62.664 — URGENT operator report: "the Telegram TMA in Desktop version
  // cannot close/end." Clipboard had NO close affordance at all — no
  // BackButton, no in-app close button — it relied entirely on Telegram's own
  // native window chrome. The v0.62.663 desktop-fullscreen step above hides
  // that chrome (Menu's own long-standing comment already warned this is
  // exactly what "fullscreen takeover with no chrome and no easy exit" means),
  // so once fullscreen fired there was truly no way out. Mirror the
  // Cuisine/Hawker/Transport BackButton wiring — Telegram's own persistent
  // in-app arrow keeps rendering even when the OS window chrome is gone.
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => { if (typeof w.close === 'function') w.close(); };
    try {
      if (typeof w.offEvent === 'function' && w.__giaBackHandler) {
        w.offEvent('backButtonClicked', w.__giaBackHandler);
      }
      if (typeof w.BackButton.offClick === 'function' && w.__giaBackHandler) {
        w.BackButton.offClick(w.__giaBackHandler);
      }
    } catch { /* noop */ }
    w.__giaBackHandler = handler;
    if (typeof w.onEvent === 'function') {
      w.onEvent('backButtonClicked', handler);
    } else if (typeof w.BackButton.onClick === 'function') {
      w.BackButton.onClick(handler);
    }
  });
}

// Telegram haptic feedback for drag start / drop. No-op when unavailable.
export function haptic(kind = 'light') {
  try {
    const h = tg()?.HapticFeedback;
    if (!h) return;
    if (kind === 'light' || kind === 'medium' || kind === 'heavy' || kind === 'rigid' || kind === 'soft') {
      h.impactOccurred(kind);
    } else if (kind === 'success' || kind === 'warning' || kind === 'error') {
      h.notificationOccurred(kind);
    }
  } catch { /* unavailable on this client */ }
}

// Open a Telegram-aware external link in the in-app browser. Used by the
// shared-trip share flow to surface the t.me/<bot>/clipboard?startapp=…
// URL as a tap-to-share affordance.
export function openTelegramLink(url) {
  try {
    const w = tg();
    if (w && typeof w.openTelegramLink === 'function') {
      w.openTelegramLink(url);
      return true;
    }
  } catch { /* fallthrough */ }
  try {
    if (typeof window !== 'undefined') window.open(url, '_blank');
  } catch { /* noop */ }
  return false;
}

// v0.62.417 — switch to a sibling Mini App served on the same origin
// (/app/cuisine, /app/hawker, /app/transport). Same-origin navigation keeps
// the Telegram webview + initData session, so no re-auth. Used by the hamburger
// "Switch app" rows and the header filter chips (deep-link to Cuisine).
export function openMiniApp(path) {
  try {
    if (typeof window !== 'undefined') window.location.assign(path);
  } catch { /* noop */ }
}
