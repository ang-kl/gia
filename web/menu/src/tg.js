// Minimal Telegram WebApp shim, mirrors web/cuisine/src/api/tg.js so
// theme params + sendData behave identically across all TMAs.

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
