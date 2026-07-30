// Minimal Telegram WebApp shim, mirrors web/cuisine/src/api/tg.js so
// theme params + sendData behave identically across all TMAs.
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
      try { console.warn(`[TMA-Init-Err][menu] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };

  safe('ready', () => w.ready());
  // v0.62.638 — wire the Telegram safe-area vars (+ fullscreen min-top clearance).
  safe('safe-area', () => wireSafeAreaInsets(w));
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
    // v0.62.663 — operator: auto-maximize the TMA window on Telegram Desktop
    // when it isn't already. Cuisine/Hawker/Transport already gained this at
    // v0.62.617/624 (see their tg.js "auto-fullscreen saga" comments) — Menu
    // never did, so the hub opened windowed on desktop even though every app
    // it links to opens maximized. `requestFullscreen()` (Bot API 8.0) is the
    // ONLY programmatic way to enlarge a Mini App; there is no API that
    // reports or controls the actual OS window's minimized/maximized state,
    // so `w.isFullscreen` (Telegram's own flag) is the closest available
    // proxy — and it's what gates against re-requesting on every reload.
    if (typeof w.requestFullscreen !== 'function') return;
    if (typeof w.isVersionAtLeast !== 'function' || !w.isVersionAtLeast('8.0')) return;
    if (w.isFullscreen) return;
    try { if (typeof w.onEvent === 'function') w.onEvent('fullscreenFailed', () => { /* UNSUPPORTED on this client — expand() height still applies */ }); } catch { /* noop */ }
    const platform = String(w.platform || '').toLowerCase();
    const desktopClient = platform === 'tdesktop' || platform === 'macos';
    if (platform !== 'ipados' && !desktopClient) return;
    try { w.requestFullscreen(); } catch { /* best-effort */ }
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

  // v0.62.276 — dark-mode flag for theme-dependent assets: the line-art tile
  // icons must flip to WHITE line in dark (CSS `[data-tg-dark] .icon-navy`).
  // Prefer Telegram's colorScheme; fall back to the bg_color luminance. The
  // rest of the UI stays luminance-driven + theme-agnostic (v0.62.16).
  safe('dark-flag', () => {
    const dark = (w.colorScheme === 'dark') || _bgIsDark(tp.bg_color);
    if (dark) root.setAttribute('data-tg-dark', '1');
    else root.removeAttribute('data-tg-dark');
  });
}

// Relative-luminance dark test for a #rrggbb theme colour (sRGB approx).
function _bgIsDark(hex) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''));
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) < 128;
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

// v0.62.x — Telegram-native location (Bot API 8.0 LocationManager). Reliable
// where the webview's navigator.geolocation drops a first-launch "Allow Once".
// Returns {lat,lng} or null so callers fall back. Mirrors the cuisine TMA.
export function getTelegramLocation() {
  return new Promise((resolve) => {
    try {
      const w = tg();
      if (!w || typeof w.isVersionAtLeast !== 'function' || !w.isVersionAtLeast('8.0')) { resolve(null); return; }
      const lm = w.LocationManager;
      if (!lm || typeof lm.getLocation !== 'function') { resolve(null); return; }
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      const to = setTimeout(() => done(null), 8000);
      const read = () => {
        try {
          lm.getLocation((loc) => {
            clearTimeout(to);
            const lat = loc && Number(loc.latitude);
            const lng = loc && Number(loc.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001)) done({ lat, lng });
            else done(null);
          });
        } catch { clearTimeout(to); done(null); }
      };
      if (lm.isInited) read();
      else lm.init(() => read());
    } catch { resolve(null); }
  });
}
