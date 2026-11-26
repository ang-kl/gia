// visual/telegram-clients.mjs - v0.62.996 (v0.63 plan, phase 1)
//
// Three stand-ins for Telegram's `window.Telegram.WebApp`, one per client generation the plan names (Stage 3,
// C5): before 8.0, 8.0 (fullscreen, safe areas, orientation lock arrived there), and the latest. "Latest" is the
// newest Bot API version on core.telegram.org/bots/webapps, read on 26-11 '26: 10.1.
//
// Each stand-in answers `isVersionAtLeast` the way Telegram's script does (numeric compare, part by part), so an
// app that gates a call on the version takes the same branch it would on a real client of that version. Like
// Telegram's script, every method exists on every client, and one newer than the client throws
// `WebAppMethodUnsupported` when called. (Telegram also logs to the console first; the stand-in does not, so
// that the boot check's "no console error" reads the app's own errors only.)
//
// initData is NON-EMPTY on purpose: every app boots through a guard that shows a "reopen from Telegram" screen
// when it is blank (see scripts/render-smoke.mjs). The value is never checked in the page; the server is a
// stand-in here. The user id is the synthetic 1.

export const CLIENTS = {
  'before-8': '6.9',
  v8: '8.0',
  latest: '10.1',
};

export function telegramStub(version) {
  return `(() => {
    const VERSION = ${JSON.stringify(version)};
    const cmp = (a, b) => {
      const pa = String(a).split('.').map(Number), pb = String(b).split('.').map(Number);
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const x = pa[i] || 0, y = pb[i] || 0;
        if (x !== y) return x > y ? 1 : -1;
      }
      return 0;
    };
    const atLeast = (v) => cmp(VERSION, v) >= 0;
    const noop = () => {};
    const button = { show: noop, hide: noop, setText: noop, onClick: noop, offClick: noop, setParams: noop, enable: noop, disable: noop, showProgress: noop, hideProgress: noop, isVisible: false };
    const app = {
      initData: 'query_id=VISUAL&user=%7B%22id%22%3A1%2C%22language_code%22%3A%22en%22%7D&auth_date=0&hash=visual',
      initDataUnsafe: { user: { id: 1, language_code: 'en' } },
      version: VERSION, platform: 'ios', colorScheme: 'light',
      themeParams: { bg_color: '#ffffff', text_color: '#000000', hint_color: '#707579', link_color: '#3390ec', button_color: '#3390ec', button_text_color: '#ffffff', secondary_bg_color: '#f4f4f5' },
      isExpanded: true, viewportHeight: window.innerHeight, viewportStableHeight: window.innerHeight,
      isVersionAtLeast: atLeast,
      ready: noop, expand: noop, close: noop, sendData: noop, openLink: noop, openTelegramLink: noop,
      enableClosingConfirmation: noop, disableClosingConfirmation: noop,
      onEvent: noop, offEvent: noop, setHeaderColor: noop, setBackgroundColor: noop,
      showPopup: (_p, cb) => { cb && cb(null); }, showAlert: (_m, cb) => { cb && cb(); }, showConfirm: (_m, cb) => { cb && cb(false); },
      HapticFeedback: { impactOccurred: noop, notificationOccurred: noop, selectionChanged: noop },
      MainButton: { ...button }, SecondaryButton: { ...button },
      BackButton: { show: noop, hide: noop, onClick: noop, offClick: noop, isVisible: false },
      CloudStorage: { getItem: (_k, cb) => { cb && cb(null, null); }, setItem: (_k, _v, cb) => { cb && cb(null, true); }, getItems: (_k, cb) => { cb && cb(null, {}); }, removeItem: (_k, cb) => { cb && cb(null, true); }, getKeys: (cb) => { cb && cb(null, []); } },
    };
    const since = (v, fn) => (...args) => {
      if (!atLeast(v)) throw new Error('WebAppMethodUnsupported');
      return fn(...args);
    };
    app.isVerticalSwipesEnabled = true;
    app.disableVerticalSwipes = since('7.7', noop);
    app.enableVerticalSwipes = since('7.7', noop);
    app.isFullscreen = false; app.isOrientationLocked = false; app.isActive = true;
    app.safeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 };
    app.contentSafeAreaInset = { top: 0, bottom: 0, left: 0, right: 0 };
    app.requestFullscreen = since('8.0', noop);
    app.exitFullscreen = since('8.0', noop);
    app.lockOrientation = since('8.0', noop);
    app.unlockOrientation = since('8.0', noop);
    app.addToHomeScreen = since('8.0', noop);
    app.checkHomeScreenStatus = since('8.0', (cb) => { cb && cb('unsupported'); });
    window.Telegram = { WebApp: app };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition = (ok) => ok({ coords: { latitude: 1.3521, longitude: 103.8198, accuracy: 20 } });
    }
  })();`;
}
