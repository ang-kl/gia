// Telegram WebApp helpers.
//
// applyTelegramTheme() mirrors Telegram themeParams onto CSS variables so
// Tailwind's tg-* color tokens follow the user's light/dark/named theme.
import { wireSafeAreaInsets } from '../../../_shared/lib/safe-area.js';

export function tg() {
  return typeof window !== 'undefined' ? window.Telegram?.WebApp : null;
}

export function initData() {
  return tg()?.initData || '';
}

// v0.62.x — true only when launched inside Telegram with a signed initData.
// Used by the boot guard to show a "reopen from Telegram" screen instead of
// firing doomed (401) requests when opened outside Telegram.
export function hasInitData() {
  return !!(tg()?.initData);
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
  // v0.62.638 — wire the Telegram safe-area vars (+ fullscreen min-top clearance)
  // so headers clear the floating buttons on iPad (shared helper).
  safe('safe-area', () => wireSafeAreaInsets(w));

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
  // v0.60.92 — defensively unregister prior handler before adding
  // a new one (see web/hawker/src/tg.js for full rationale).
  safe('back-button', () => {
    if (!w.BackButton || typeof w.BackButton.show !== 'function') return;
    w.BackButton.show();
    const handler = () => {
      // v0.62.214 — operator (back arrow "isn't working"): window.history.length is
      // unreliable in the Telegram webview (seeded >1 even with nowhere to go), so a
      // back press did NOTHING on a deep-linked open. Return to the in-app Menu hub
      // ONLY when we genuinely arrived from it (same-origin /app/* referrer);
      // otherwise CLOSE the WebApp so the back arrow always does something.
      let fromHub = false;
      try {
        const ref = (typeof document !== 'undefined' && document.referrer)
          ? new URL(document.referrer) : null;
        fromHub = !!ref && ref.origin === window.location.origin
          && ref.pathname.indexOf('/app/') === 0;
      } catch { /* noop */ }
      if (fromHub && typeof window !== 'undefined' && window.history.length > 1) {
        window.history.back();
      } else if (typeof w.close === 'function') {
        w.close();
      }
    };
    try {
      if (typeof w.offEvent === 'function' && w.__giaBackHandler) {
        w.offEvent('backButtonClicked', w.__giaBackHandler);
      }
      if (typeof w.BackButton.offClick === 'function' && w.__giaBackHandler) {
        w.BackButton.offClick(w.__giaBackHandler);
      }
    } catch { /* noop */ }
    w.__giaBackHandler = handler;
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
  // v0.62.561 — O-54 responsive port: widen the gate to ALL touch tablets
  // (the Hawker Rule N-2 gate) so the responsive tablet layout can fill the
  // screen — Android tablets get parity, and the gate now keys on physical
  // signals (coarse pointer + short screen edge ≥ 768) rather than the
  // platform string alone. Telegram Desktop / macOS notebooks (fine pointer,
  // 'tdesktop'/'macos') are still excluded, preserving the v0.60.52 fix; a
  // phone (ios/android with a short edge < 768) also stays windowed.
  // Auto-fullscreen saga: v0.62.617 RE-ENABLED on Telegram Desktop / macOS →
  // v0.62.623 removed the desktop branch ("wrong system command") → v0.62.624
  // RESTORES it ("why I cannot expand in telegram desktop"). `requestFullscreen()`
  // (Bot API 8.0) is the ONLY programmatic way to enlarge a Mini App; `expand()`
  // only controls HEIGHT and there is NO API to widen a desktop window. On clients
  // that don't support it, it fires `fullscreenFailed`/UNSUPPORTED and no-ops; on
  // Telegram Desktop clients that DO (the operator's does) it opens wide, and the
  // v0.62.622 classifier fix means the wide layout now renders correctly.
  safe('fullscreen', () => {
    if (typeof w.requestFullscreen !== 'function') return;
    if (typeof w.isVersionAtLeast === 'function' && !w.isVersionAtLeast('8.0')) return;
    if (w.isFullscreen) return;
    try { if (typeof w.onEvent === 'function') w.onEvent('fullscreenFailed', () => { /* UNSUPPORTED on this client — expand() height still applies */ }); } catch { /* noop */ }
    // NB: Telegram reports iPad as 'ipados' (NOT 'ios').
    const plat = String(w.platform || '').toLowerCase();
    const touchClient = plat === 'ipados' || plat === 'ios' || plat === 'android';
    const desktopClient = plat === 'tdesktop' || plat === 'macos';
    const coarse = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(pointer: coarse)').matches;
    const scr = typeof window !== 'undefined' ? window.screen : null;
    const minScreen = scr ? Math.min(scr.width || 0, scr.height || 0) : 0;
    if (desktopClient || (touchClient && coarse && minScreen >= 700)) {   // desktop (open wide) OR iPad-class (700 covers the 744px iPad mini)
      try { w.requestFullscreen(); } catch { /* best-effort */ }
    }
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
  // v0.62.126 — expose Telegram's light/dark scheme as a data attribute so CSS
  // can branch (e.g. the skeuomorphic selected region pill is dark-mode only).
  // Falls back to a bg-luminance guess when colorScheme is absent (non-Telegram
  // dev / old clients); defaults to light when neither is available.
  let scheme = w.colorScheme === 'dark' || w.colorScheme === 'light' ? w.colorScheme : null;
  if (!scheme && tp.bg_color && /^#?[0-9a-f]{6}$/i.test(tp.bg_color)) {
    const h = tp.bg_color.replace('#', '');
    const lum = 0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16);
    scheme = lum < 128 ? 'dark' : 'light';
  }
  if (scheme) root.setAttribute('data-theme', scheme);
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

// v0.62.x — operator (urgent): first-launch location often didn't register
// ("Allow Once" via the iOS prompt that navigator.geolocation triggers inside
// the Telegram webview frequently fails to propagate). Telegram's NATIVE
// LocationManager (Bot API 8.0) is the reliable path — it shows Telegram's own
// permission flow and returns coords directly. Returns {lat,lng} or null so
// callers can fall back to navigator.geolocation on older clients / web.
export function getTelegramLocation() {
  return new Promise((resolve) => {
    try {
      const w = tg();
      if (!w || typeof w.isVersionAtLeast !== 'function' || !w.isVersionAtLeast('8.0')) { resolve(null); return; }
      const lm = w.LocationManager;
      if (!lm || typeof lm.getLocation !== 'function') { resolve(null); return; }
      let settled = false;
      const done = (v) => { if (!settled) { settled = true; resolve(v); } };
      const to = setTimeout(() => done(null), 8000); // never hang the boot
      const read = () => {
        try {
          lm.getLocation((loc) => {
            clearTimeout(to);
            const lat = loc && Number(loc.latitude);
            const lng = loc && Number(loc.longitude);
            if (Number.isFinite(lat) && Number.isFinite(lng) && !(Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001)) {
              done({ lat, lng });
            } else {
              done(null); // access denied / unavailable → caller falls back
            }
          });
        } catch { clearTimeout(to); done(null); }
      };
      if (lm.isInited) read();
      else lm.init(() => read());
    } catch { resolve(null); }
  });
}

// Open Telegram's native location-access settings (Bot API 8.0). MUST be called
// from a user gesture. No-op (returns false) on older clients.
export function openTelegramLocationSettings() {
  try {
    const w = tg();
    const lm = w && typeof w.isVersionAtLeast === 'function' && w.isVersionAtLeast('8.0') ? w.LocationManager : null;
    if (lm && typeof lm.openSettings === 'function') { lm.openSettings(); return true; }
  } catch { /* noop */ }
  return false;
}

// v0.62.407 — open an external URL from inside the Mini App. Telegram's
// WebApp.openLink hands the URL to the device / in-app browser (and, being a
// host-API call rather than window.open, it is NOT subject to popup-blocking
// after an await). Outside Telegram (desktop / gia-web) fall back to window.open.
export function openExternal(url) {
  if (!url) return;
  try {
    const w = tg();
    if (w && typeof w.openLink === 'function') { w.openLink(url); return; }
  } catch { /* fall through */ }
  try { window.open(url, '_blank', 'noopener'); } catch { /* noop */ }
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
