// Telegram WebApp helpers (Clipboard TMA).
//
// Slim copy of web/cuisine/src/api/tg.js — just the four functions the
// Clipboard surface actually uses. Keeping it small (no v2-specific deps)
// makes the per-call overhead obvious + avoids dragging the cuisine TMA's
// theme-bootstrap edge cases into a brand-new bundle.

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function initData() {
  return tg()?.initData || '';
}

export function hasInitData() {
  return !!(tg()?.initData);
}

export function getLanguage() {
  const w = tg();
  const tgLang = w?.initDataUnsafe?.user?.language_code;
  if (tgLang) return String(tgLang).slice(0, 2).toLowerCase();
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.slice(0, 2).toLowerCase();
  }
  return 'en';
}

export function applyTelegramTheme() {
  const w = tg();
  if (!w) return;
  const safe = (label, fn) => {
    try { fn(); }
    catch (err) {
      try { console.warn(`[Clipboard-TMA-Init-Err] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };
  safe('ready', () => w.ready());
  safe('expand', () => w.expand());
  safe('theme', () => {
    const p = w.themeParams || {};
    const root = document.documentElement;
    if (p.bg_color)            root.style.setProperty('--tg-bg', p.bg_color);
    if (p.text_color)          root.style.setProperty('--tg-text', p.text_color);
    if (p.hint_color)          root.style.setProperty('--tg-hint', p.hint_color);
    if (p.link_color)          root.style.setProperty('--tg-accent', p.link_color);
    if (p.button_color)        root.style.setProperty('--tg-accent', p.button_color);
    if (p.button_text_color)   root.style.setProperty('--tg-accent-text', p.button_text_color);
    if (p.secondary_bg_color)  root.style.setProperty('--tg-card', p.secondary_bg_color);
    root.dataset.theme = w.colorScheme || 'dark';
  });
}

// Telegram haptic feedback for drag start / drop. No-op when unavailable.
export function haptic(kind = 'light') {
  try {
    const h = tg()?.HapticFeedback;
    if (!h) return;
    if (kind === 'light' || kind === 'medium' || kind === 'heavy' || kind === 'rigid' || kind === 'soft') {
      h.impactOccurred(kind);
    } else if (kind === 'success' || kind === 'warning' || kind === 'error') {
      h.notificationOccurred(kind);
    }
  } catch { /* unavailable on this client */ }
}

// Open a Telegram-aware external link in the in-app browser. Used by the
// shared-trip share flow to surface the t.me/<bot>/clipboard?startapp=…
// URL as a tap-to-share affordance.
export function openTelegramLink(url) {
  try {
    const w = tg();
    if (w && typeof w.openTelegramLink === 'function') {
      w.openTelegramLink(url);
      return true;
    }
  } catch { /* fallthrough */ }
  try {
    if (typeof window !== 'undefined') window.open(url, '_blank');
  } catch { /* noop */ }
  return false;
}

// v0.62.417 — switch to a sibling Mini App served on the same origin
// (/app/cuisine, /app/hawker, /app/transport). Same-origin navigation keeps
// the Telegram webview + initData session, so no re-auth. Used by the hamburger
// "Switch app" rows and the header filter chips (deep-link to Cuisine).
export function openMiniApp(path) {
  try {
    if (typeof window !== 'undefined') window.location.assign(path);
  } catch { /* noop */ }
}
