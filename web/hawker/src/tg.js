// Mirrors web/menu/src/tg.js — applies Telegram theme params + provides
// initData accessor for authed fetches to /api/hawker/closures.

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;

  // v0.59.28 — see web/cuisine/src/api/tg.js for full rationale.
  // Per-step try/catch isolation + Telegram Web (weba/webk) skip
  // for fullscreen.
  const safe = (label, fn) => {
    try { fn(); }
    catch (err) {
      try { console.warn(`[TMA-Init-Err][hawker] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };

  safe('ready', () => w.ready());
  safe('expand', () => w.expand());

  // v0.62.610 — operator: the phone DRAWER's downward drag was being grabbed by
  // Telegram's vertical swipe-to-minimise / close gesture, dismissing the Mini
  // App — reopening it started ANOTHER session. Disable Telegram's vertical
  // swipes (Bot API 7.7+) so the drawer owns the drag; feature-detected so older
  // clients are unaffected. The BackButton still closes the app deliberately.
  safe('disable-vertical-swipes', () => {
    if (typeof w.disableVerticalSwipes === 'function') w.disableVerticalSwipes();
  });

  safe('diag-log', () => {
    console.log('[TMA-Diag-v0.59.28-hawker]', JSON.stringify({
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

  // v0.60.52 — wire Telegram's BackButton so users can return to
  // the Menu hub without leaving Telegram. The Hawker TMA is
  // navigated to via `window.location.href = '/app/hawker'` from
  // the Menu tile, so window.history has a /app/menu entry to go
  // back to. When opened directly (deep link or no history), fall
  // back to closing the WebApp entirely. Required when the WebApp
  // is in fullscreen mode because Telegram's chrome — which
  // normally provides the swipe-down-to-close affordance — is
  // hidden in fullscreen.
  // v0.60.92 — defensively unregister any previous handler before
  // adding a new one. Operator 2026-05-11: after multiple navigations
  // out to /app/map + back, Telegram's BackButton would stop working
  // because handlers stacked across mounts (Telegram's WebApp object
  // persists handlers across same-origin page navigations within a
  // single WebApp session). One tap then fired N stacked handlers,
  // each calling window.history.back(), so the user appeared to be
  // sent back too far or to a corrupted state.
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => {
      // v0.62.214 — operator (back arrow "isn't working"): window.history.length is
      // unreliable in the Telegram webview (seeded >1 even with nowhere to go), so a
      // back press did NOTHING on a deep-linked open. Return to the in-app Menu hub
      // ONLY when we genuinely arrived from it (same-origin /app/* referrer);
      // otherwise CLOSE the WebApp so the back arrow always does something.
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
    // Clear any prior handlers (best-effort — APIs vary by client version).
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

  // v0.60.52 — auto-fullscreen was narrowed to iPad only (notebook users on
  // Telegram Desktop were getting an unwanted fullscreen takeover).
  // v0.62.286 — operator: REMOVED auto-fullscreen entirely (incl iPad). The TMA
  // then only `expand()`s to full height; fullscreen was never requested.
  // v0.62.545 — operator (iPad Pro, responsive tablet layout): on iPad the Mini
  // App opens as a CENTERED MODAL, so the new full-bleed map layout can't fill
  // the screen (and the small webview never even triggers the tablet layout).
  // RE-INTRODUCE auto-fullscreen, but ONLY for touch TABLETS — Telegram Desktop
  // / notebook (the v0.62.286 concern) is excluded (platform is 'tdesktop', and
  // the pointer is fine). Gated on the physical SCREEN size (window.screen), not
  // the modal webview size, to avoid a chicken-and-egg (the modal reports a small
  // innerWidth pre-fullscreen). Requires Bot API 8.0's requestFullscreen.
  safe('tablet-fullscreen', () => {
    if (typeof w.requestFullscreen !== 'function') return;
    if (typeof w.isVersionAtLeast === 'function' && !w.isVersionAtLeast('8.0')) return;
    if (w.isFullscreen) return;
    // NB: Telegram reports iPad as 'ipados' (NOT 'ios') — the existing iPad
    // gates in web/menu/src/tg.js + web/cuisine/src/api/tg.js key on 'ipados'.
    // Missing it here would skip fullscreen on the very device this fixes.
    const plat = String(w.platform || '').toLowerCase();
    const touchClient = plat === 'ipados' || plat === 'ios' || plat === 'android';
    // v0.62.617 — operator: RE-ENABLE auto-fullscreen on Telegram Desktop / macOS
    // so the Mini App opens WIDE enough for the responsive tablet/desktop layout
    // (it otherwise opens in a narrow phone-width window and falls back to the
    // phone layout). This reverses the v0.60.52 / v0.62.286 desktop exclusion,
    // per the operator's explicit request.
    const desktopClient = plat === 'tdesktop' || plat === 'macos';
    const coarse = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(pointer: coarse)').matches;
    const scr = typeof window !== 'undefined' ? window.screen : null;
    const minScreen = scr ? Math.min(scr.width || 0, scr.height || 0) : 0;
    if (desktopClient || (touchClient && coarse && minScreen >= 700)) {   // desktop (open wide) OR iPad-class (700 covers the 744px iPad mini)
      try { w.requestFullscreen(); } catch { /* best-effort */ }
    }
  });

  // v0.60.42 — sync Telegram header + chrome bg to secondary so the
  // iPad/desktop letterbox area blends with the centered column.
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

  // v0.62.591 — operator (iPad Pro): in Telegram FULLSCREEN the frosted top bar +
  // the bottom FAB were hidden behind Telegram's floating system buttons. The CSS
  // already reads `--tg-content-safe-area-inset-top/bottom`, but nothing SET them —
  // so they fell back to env(safe-area-inset-*), which is ~0 on an iPad (no notch)
  // and does NOT reserve room for Telegram's fullscreen chrome. Populate the vars
  // from the Bot API 8.0 insets: total clearance = device safeArea + Telegram
  // contentSafeArea, refreshed whenever fullscreen / safe area / viewport changes.
  safe('safe-area', () => {
    const root = document?.documentElement;
    if (!root) return;
    const px = (v) => (typeof v === 'number' && v > 0 ? `${v}px` : '0px');
    const writeSafeArea = () => {
      try {
        const sa = w.safeAreaInset || {};
        const csa = w.contentSafeAreaInset || {};
        root.style.setProperty('--tg-content-safe-area-inset-top', px((sa.top || 0) + (csa.top || 0)));
        root.style.setProperty('--tg-content-safe-area-inset-bottom', px((sa.bottom || 0) + (csa.bottom || 0)));
        root.style.setProperty('--tg-content-safe-area-inset-left', px((sa.left || 0) + (csa.left || 0)));
        root.style.setProperty('--tg-content-safe-area-inset-right', px((sa.right || 0) + (csa.right || 0)));
      } catch { /* noop */ }
    };
    writeSafeArea();
    if (typeof w.onEvent === 'function') {
      w.onEvent('safeAreaChanged', writeSafeArea);
      w.onEvent('contentSafeAreaChanged', writeSafeArea);
      w.onEvent('fullscreenChanged', writeSafeArea);
      w.onEvent('viewportChanged', writeSafeArea);
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

export function openLink(url) {
  const w = tg();
  if (w?.openLink) w.openLink(url);
  else window.open(url, '_blank');
}
