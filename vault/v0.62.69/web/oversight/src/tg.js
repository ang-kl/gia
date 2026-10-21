// Mirrors web/transport/src/tg.js — Telegram theme + initData accessor.

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
