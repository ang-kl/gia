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
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else if (typeof w.close === 'function') {
        w.close();
      }
    };
    if (typeof w.onEvent === 'function') {
      w.onEvent('backButtonClicked', handler);
    } else if (typeof w.BackButton.onClick === 'function') {
      w.BackButton.onClick(handler);
    }
  });

  // v0.60.52 — auto-fullscreen ONLY on iPad. See web/menu/src/tg.js
  // for the full rationale (notebook users on Telegram Desktop
  // were getting an unwanted fullscreen takeover).
  safe('fullscreen', () => {
    const platform = String(w.platform || '').toLowerCase();
    if (platform !== 'ipados') return;
    if (typeof w.isVersionAtLeast !== 'function' || !w.isVersionAtLeast('8.0')) return;
    if (typeof w.requestFullscreen !== 'function') return;
    w.requestFullscreen();
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
