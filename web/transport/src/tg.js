// Mirrors web/hawker/src/tg.js — Telegram theme + initData accessor.

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;
  try {
    w.ready();
    w.expand();
    // v0.59.25 — see web/cuisine/src/api/tg.js for full rationale.
    try {
      console.log('[TMA-Diag-v0.59.25-transport]', JSON.stringify({
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
    } catch { /* diag best-effort */ }
    const platform = String(w.platform || '').toLowerCase();
    const isTabletPlatform = platform === 'ipados' || platform === 'tdesktop' || platform === 'macos';
    const wideViewport = typeof window !== 'undefined'
      && window.matchMedia?.('(min-width: 600px)').matches;
    if ((wideViewport || isTabletPlatform)
        && typeof w.isVersionAtLeast === 'function'
        && w.isVersionAtLeast('8.0')
        && typeof w.requestFullscreen === 'function') {
      try { w.requestFullscreen(); }
      catch (err) { console.warn('[TMA-Diag] requestFullscreen failed:', err?.message || err); }
    }
    if (typeof w.onEvent === 'function') {
      const writeViewportVar = () => {
        const h = typeof w.viewportStableHeight === 'number'
          ? w.viewportStableHeight
          : (typeof w.viewportHeight === 'number' ? w.viewportHeight : null);
        if (h && document?.documentElement) {
          document.documentElement.style.setProperty('--tg-viewport-stable-height', `${h}px`);
        }
      };
      writeViewportVar();
      try { w.onEvent('viewportChanged', writeViewportVar); }
      catch { /* older clients may not support this event */ }
    }
  } catch { /* noop */ }
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
