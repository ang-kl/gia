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

// v0.27.2: ISO 639-1 from Telegram. Falls back to navigator language
// then 'en'. Used to localise the cuisine accordion + category headers.
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

// v0.26.3: launch-context snapshot for diagnostics. Lets us tell whether
// the TMA was opened from a chat-menu-button (initData populated, sendData
// usable, fetch path ideal) vs an inline button (sendData NOT available;
// fetch is the only outbound) vs a direct t.me/<bot>/<app> link (similar
// to inline). The exact rules per Telegram WebApp docs:
//   - sendData() works ONLY when the WebApp was opened from a
//     KeyboardButton or chat-menu button. Inline-button + direct-link
//     launches throw on sendData.
export function launchContext() {
  const w = tg();
  if (!w) {
    return { hasWebApp: false, canSendData: false };
  }
  return {
    hasWebApp: true,
    platform: w.platform || null,
    version: w.version || null,
    initDataLength: (w.initData || '').length,
    hasUser: !!w.initDataUnsafe?.user?.id,
    startParam: w.initDataUnsafe?.start_param || null,
    isExpanded: !!w.isExpanded,
    // Heuristic: sendData is documented as usable for KeyboardButton +
    // chat-menu-button launches. There's no API that tells us "you were
    // launched from X", so the safest probe is: sendData is a function
    // AND we have initData (so the bot can attribute the message to a
    // user). Inline-button-launched WebApps still expose sendData as a
    // function but Telegram throws when called. We can only know by
    // trying it; the search-fallback path handles that exception.
    canSendData: typeof w.sendData === 'function'
  };
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
