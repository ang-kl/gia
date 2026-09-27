// Mirrors web/hawker/src/tg.js — Telegram theme + initData accessor.
import { wireSafeAreaInsets } from '../../_shared/lib/safe-area.js';

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;

  // v0.59.28 — see web/cuisine/src/api/tg.js for full rationale.
  const safe = (label, fn) => {
    try { fn(); }
    catch (err) {
      try { console.warn(`[TMA-Init-Err][transport] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };

  safe('ready', () => w.ready());
  safe('expand', () => w.expand());
  // v0.62.638 — operator (iPad Pro): the header sat under Telegram's floating
  // buttons because this TMA never SET --tg-content-safe-area-inset-top. Wire it
  // (shared helper) with a fullscreen minimum-top clearance.
  safe('safe-area', () => wireSafeAreaInsets(w));

  // v0.62.610 — operator: on a phone the draggable station-list DRAWER's
  // downward drag was being grabbed by Telegram's vertical swipe-to-minimise /
  // close gesture, dismissing the Mini App — reopening it started ANOTHER
  // session. Disable Telegram's vertical swipes (Bot API 7.7+) so the drawer
  // owns the drag; feature-detected so older clients are unaffected. The
  // BackButton + footer back/end control still close the app deliberately.
  safe('disable-vertical-swipes', () => {
    if (typeof w.disableVerticalSwipes === 'function') w.disableVerticalSwipes();
  });

  safe('diag-log', () => {
    console.log('[TMA-Diag-v0.59.28-transport]', JSON.stringify({
      platform: w.platform || null,
      version: w.version || null,
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : null,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : null,
      isVersionAtLeast8: typeof w.isVersionAtLeast === 'function' ? w.isVersionAtLeast('8.0') : null,
      hasRequestFullscreen: typeof w.requestFullscreen,
      isExpanded: !!w.isExpanded,
      isFullscreen: !!w.isFullscreen,
      tgViewportHeight: typeof w.viewportHeight === 'number' ? w.viewportHeight : null,
      tgViewportStableHeight: typeof w.viewportStableHeight === 'number' ? w.viewportStableHeight : null
    }));
  });

  // Auto-fullscreen saga:
  //   v0.62.286 — REMOVED (unwanted desktop takeover).
  //   v0.62.617 — operator RE-ENABLED on Telegram Desktop / macOS to open wide.
  //   v0.62.623 — operator ("wrong system command") → removed the desktop branch.
  //   v0.62.624 — operator ("why I cannot expand in telegram desktop") → RESTORE
  //     it. `requestFullscreen()` (Bot API 8.0) is the ONLY programmatic way to
  //     enlarge a Mini App; `expand()` only controls HEIGHT and there is NO API to
  //     widen a desktop window. On clients that don't support fullscreen it fires
  //     `fullscreenFailed`/UNSUPPORTED and no-ops; on Telegram Desktop clients that
  //     DO (the operator's does — v0.62.617 went fullscreen there) it opens wide,
  //     and the v0.62.622 classifier fix means the wide layout now renders
  //     correctly. A `fullscreenFailed` listener keeps a failure from surfacing.
  safe('fullscreen', () => {
    if (typeof w.requestFullscreen !== 'function') return;
    if (typeof w.isVersionAtLeast === 'function' && !w.isVersionAtLeast('8.0')) return;
    if (w.isFullscreen) return;
    try { if (typeof w.onEvent === 'function') w.onEvent('fullscreenFailed', () => { /* UNSUPPORTED on this client — expand() height still applies */ }); } catch { /* noop */ }
    const plat = String(w.platform || '').toLowerCase();
    const touchClient = plat === 'ipados' || plat === 'ios' || plat === 'android';
    const desktopClient = plat === 'tdesktop' || plat === 'macos';
    const coarse = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(pointer: coarse)').matches;
    const scr = typeof window !== 'undefined' ? window.screen : null;
    const minScreen = scr ? Math.min(scr.width || 0, scr.height || 0) : 0;
    if (desktopClient || (touchClient && coarse && minScreen >= 700)) {   // desktop (open wide) OR iPad-class
      try { w.requestFullscreen(); } catch { /* best-effort */ }
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

  // v0.62.214 — operator (back arrow "isn't working for all TMA"): the Transport
  // TMA never wired Telegram's BackButton, so the native back arrow did nothing.
  // Mirror the cuisine/hawker wiring: show the arrow, return to the in-app Menu
  // hub when we arrived from it (same-origin /app/* referrer), else close the
  // WebApp. Defensively unregister any prior handler (handlers persist across
  // same-origin navigations within one WebApp session and would otherwise stack).
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => {
      let fromHub = false;
      try {
        const ref = (typeof document !== 'undefined' && document.referrer)
          ? new URL(document.referrer) : null;
        fromHub = !!ref && ref.origin === window.location.origin
          && ref.pathname.indexOf('/app/') === 0;
      } catch { /* noop */ }
      if (fromHub && typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else if (typeof w.close === 'function') {
        w.close();
      }
    };
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

  const tp = w.themeParams || {};
  const root = document.documentElement;
  const set = (k, v) => v && root.style.setProperty(k, v);
  set('--tg-bg',          tp.bg_color);
  set('--tg-text',        tp.text_color);
  // v0.57.14: hint contrast handled in styles.css.
  set('--tg-accent',      tp.button_color);
  set('--tg-accent-text', tp.button_text_color);
  set('--tg-card',        tp.secondary_bg_color);
}

export function initData() {
  return tg()?.initData || '';
}
