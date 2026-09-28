// Mirrors web/transport/src/tg.js — Telegram theme + initData accessor.
import { wireSafeAreaInsets } from '../../_shared/lib/safe-area.js';

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;

  // v0.59.28 — see web/cuisine/src/api/tg.js for full rationale: each
  // init step fails independently so one throwing call (e.g.
  // requestFullscreen without a user gesture) never blanks the TMA.
  const safe = (label, fn) => {
    try { fn(); }
    catch (err) {
      try { console.warn(`[TMA-Init-Err][oversight] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };

  safe('ready', () => w.ready());
  safe('expand', () => w.expand());
  // v0.62.638 — wire the Telegram safe-area vars (+ fullscreen min-top clearance).
  safe('safe-area', () => wireSafeAreaInsets(w));
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
  // cannot close/end." Oversight only had an in-app ✕ button calling
  // closeApp() (below) — no Telegram BackButton. The v0.62.663 desktop-
  // fullscreen step above hides Telegram's own native window chrome (Menu's
  // long-standing comment already warned this is exactly what "fullscreen
  // takeover with no chrome and no easy exit" means), so the only way out
  // depended on the in-app button staying reachable. Mirror the
  // Cuisine/Hawker/Transport BackButton wiring — Telegram's own persistent
  // in-app arrow keeps rendering even when the OS window chrome is gone —
  // as a second, more robust way to close, reusing closeApp()'s
  // flaky-on-desktop double-close retry.
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => closeApp();
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

  // v0.60.42 — sync Telegram header + chrome bg to secondary.
  safe('header-color', () => {
    if (typeof w.setHeaderColor === 'function') w.setHeaderColor('secondary_bg_color');
  });
  safe('background-color', () => {
    if (typeof w.setBackgroundColor === 'function') w.setBackgroundColor('secondary_bg_color');
  });

  safe('viewport-handler', () => {
    if (typeof w.onEvent !== 'function') return;
    const writeViewportVar = () => {
      try {
        const h = typeof w.viewportStableHeight === 'number'
          ? w.viewportStableHeight
          : (typeof w.viewportHeight === 'number' ? w.viewportHeight : null);
        if (h && document?.documentElement) {
          document.documentElement.style.setProperty('--tg-viewport-stable-height', `${h}px`);
        }
      } catch { /* noop */ }
    };
    writeViewportVar();
    w.onEvent('viewportChanged', writeViewportVar);
  });

  const tp = w.themeParams || {};
  const root = document.documentElement;
  const set = (k, v) => v && root.style.setProperty(k, v);
  set('--tg-bg',          tp.bg_color);
  set('--tg-text',        tp.text_color);
  // hint contrast handled in styles.css.
  set('--tg-accent',      tp.button_color);
  set('--tg-accent-text', tp.button_text_color);
  set('--tg-card',        tp.secondary_bg_color);
}

export function initData() {
  return tg()?.initData || '';
}

// Close the Mini App. WebApp.close() is a bit flaky on Telegram
// Desktop/macOS — a second call ~350 ms later is a harmless no-op
// once the webview has shut. (Same approach as the cuisine BackFab
// closeOnly path in v0.60.141.)
export function closeApp() {
  const w = tg();
  if (w && typeof w.close === 'function') {
    try { w.close(); } catch { /* webview tearing down */ }
    setTimeout(() => { try { w.close(); } catch { /* noop */ } }, 350);
  } else if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
  }
}
