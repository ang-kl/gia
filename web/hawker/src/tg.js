// Mirrors web/menu/src/tg.js — applies Telegram theme params + provides
// initData accessor for authed fetches to /api/hawker/closures.

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;
  try { w.ready(); w.expand(); } catch { /* noop */ }
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

export function initData() {
  return tg()?.initData || '';
}

export function openLink(url) {
  const w = tg();
  if (w?.openLink) w.openLink(url);
  else window.open(url, '_blank');
}
