// Minimal Telegram WebApp shim, mirrors web/cuisine/src/api/tg.js so
// theme params + sendData behave identically across all TMAs.

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
      try { console.warn(`[TMA-Init-Err][menu] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };

  safe('ready', () => w.ready());
  // v0.60.78 — operator request 2026-05-10: don't auto-expand the
  // Menu TMA on iPhone. The hub fits in Telegram's compact half-
  // screen sheet now that v0.60.73 shrunk the tiles to 56 px.
  // Users who want full-height can still swipe up — Telegram exposes
  // the manual expand gesture regardless. (iPad still gets the
  // requestFullscreen call below at safe('fullscreen', ...) since
  // its narrow letterboxed default benefits from the takeover.)

  safe('diag-log', () => {
    console.log('[TMA-Diag-v0.59.28-menu]', JSON.stringify({
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

  safe('fullscreen', () => {
    // v0.60.52 — auto-fullscreen ONLY on iPad. Earlier revisions
    // (v0.59.18 / v0.59.25 / v0.59.28) also fullscreened tdesktop,
    // macos, and any viewport ≥600px wide; that was overreach —
    // notebook users running Telegram Desktop got an unwanted
    // fullscreen takeover with no chrome and no easy exit. iPad
    // is the one platform where Telegram puts the WebApp in a
    // narrow letterboxed column that genuinely benefits from
    // requesting fullscreen.
    const platform = String(w.platform || '').toLowerCase();
    if (platform !== 'ipados') return;
    if (typeof w.isVersionAtLeast !== 'function' || !w.isVersionAtLeast('8.0')) return;
    if (typeof w.requestFullscreen !== 'function') return;
    w.requestFullscreen();
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
  set('--tg-hint',        tp.hint_color);
  set('--tg-accent',      tp.button_color);
  set('--tg-accent-text', tp.button_text_color);
  set('--tg-card',        tp.secondary_bg_color);
}

export function sendData(payload) {
  const w = tg();
  if (!w || typeof w.sendData !== 'function') {
    alert('This menu only works inside Telegram.');
    return false;
  }
  w.sendData(JSON.stringify(payload));
  return true;
}
