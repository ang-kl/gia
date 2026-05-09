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

  // v0.59.28 — per-step try/catch isolation. Per Human Lead 2026-05-07
  // "web.telegram does not work": any single throwing init step (e.g.
  // requestFullscreen on Telegram Web without a user gesture, an
  // older client missing onEvent) could abort the whole init and
  // leave the TMA blank. Now each step fails independently and a
  // [TMA-Init-Err] log surfaces the offending step in the user's
  // console.
  const safe = (label, fn) => {
    try { fn(); }
    catch (err) {
      try { console.warn(`[TMA-Init-Err] ${label}:`, err?.message || err); } catch { /* noop */ }
    }
  };

  safe('ready', () => w.ready());
  safe('expand', () => w.expand());

  safe('diag-log', () => {
    console.log('[TMA-Diag-v0.59.28]', JSON.stringify({
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

  // v0.60.52 — wire Telegram's BackButton so users can return to
  // the Menu hub without leaving Telegram. The Cuisine TMA is
  // navigated to via `window.location.href = '/app/cuisine'`
  // from the Menu tile, so window.history has a /app/menu entry
  // to go back to. When opened directly (deep link or no
  // history), fall back to closing the WebApp entirely.
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => {
      if (typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else if (typeof w.close === 'function') {
        w.close();
      }
    };
    if (typeof w.onEvent === 'function') {
      w.onEvent('backButtonClicked', handler);
    } else if (typeof w.BackButton.onClick === 'function') {
      w.BackButton.onClick(handler);
    }
  });

  // v0.60.52 — auto-fullscreen ONLY on iPad. Earlier revisions
  // (v0.59.18 / v0.59.25 / v0.59.28) also fullscreened tdesktop,
  // macos, and any viewport ≥600px wide; that was overreach —
  // notebook users running Telegram Desktop got an unwanted
  // fullscreen takeover with no chrome and no easy exit. iPad
  // is the one platform where Telegram puts the WebApp in a
  // narrow letterboxed column that genuinely benefits from
  // requesting fullscreen.
  safe('fullscreen', () => {
    const platform = String(w.platform || '').toLowerCase();
    if (platform !== 'ipados') return;
    if (typeof w.isVersionAtLeast !== 'function' || !w.isVersionAtLeast('8.0')) return;
    if (typeof w.requestFullscreen !== 'function') return;
    w.requestFullscreen();
  });

  // v0.60.42 — sync Telegram's header + chrome background colours to
  // the secondary bg so the iPad/desktop letterbox area outside our
  // centered #root column reads as a cohesive part of the app rather
  // than a default-grey window. Both APIs are no-ops on Bot API < 6.1
  // and we wrap each in safe() so missing methods don't abort init.
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
  // v0.57.14: don't sync hint from Telegram — its hint_color is a
  // low-contrast gray that fails partial-color-blindness readability.
  // styles.css derives --tg-hint from text/bg with stronger contrast.
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
