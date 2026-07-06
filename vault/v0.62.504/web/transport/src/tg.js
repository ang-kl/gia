// Mirrors web/hawker/src/tg.js — Telegram theme + initData accessor.

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

  // v0.62.286 — operator: REMOVED auto-fullscreen entirely (was triggered on
  // iPad / Mac / Telegram Desktop / any window ≥600px wide). Desktop + notebook
  // users got an unwanted full-screen takeover. The TMA now only `expand()`s to
  // full height (above); fullscreen is never requested automatically on any
  // platform. (A manual fullscreen map button, if any, is unaffected.)

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
