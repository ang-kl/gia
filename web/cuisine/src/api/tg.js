// Telegram WebApp helpers.
//
// applyTelegramTheme() mirrors Telegram themeParams onto CSS variables so
// Tailwind's tg-* color tokens follow the user's light/dark/named theme.

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function initData() {
  return tg()?.initData || '';
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;
  try {
    w.ready();
    w.expand();
  } catch { /* noop in non-Telegram contexts */ }
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
    console.warn('Telegram.WebApp.sendData unavailable');
    return false;
  }
  w.sendData(JSON.stringify(payload));
  return true;
}

export function closeWebApp() {
  tg()?.close?.();
}

export function showAlert(text) {
  const w = tg();
  if (w?.showAlert) w.showAlert(text);
  else alert(text);
}

export function requestLocation() {
  // Telegram's WebApp doesn't expose a direct location request as of API
  // v7. Fall back to navigator.geolocation; user gets the OS prompt.
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('geolocation unsupported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}
