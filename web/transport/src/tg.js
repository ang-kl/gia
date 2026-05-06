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
    // v0.59.18: tablet+ true fullscreen (Bot API 8.0+).
    if (window.matchMedia?.('(min-width: 600px)').matches
        && typeof w.isVersionAtLeast === 'function'
        && w.isVersionAtLeast('8.0')
        && typeof w.requestFullscreen === 'function') {
      w.requestFullscreen();
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
