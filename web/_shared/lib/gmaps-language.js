// gmaps-language.js — v0.62.836
//
// The `language` parameter for the Google Maps JS API script URL, resolved from
// the locale the reader has already chosen.
//
// THE BUG THIS CLOSES. Operator, from a Japanese session over Tokyo: "i set to
// japanese, but the google map embedded is still english". Correct — not one of
// the four loaders passed `language` at all, so Google fell back to the browser's
// Accept-Language and the map read "Shinjuku 新宿区" while every surface around it
// read 新宿区. The app's own chrome was already Japanese; the map was the one
// panel nobody had told.
//
// ONE PLACE, FOUR CALLERS, AND THAT IS THE POINT. cuisine/MapPanel,
// hawker/HawkerMapPanel, transport/MrtMapPanel and gmaps-loader each build their
// own script URL — gmaps-loader's header already records that the three panels
// are load-bearing copies awaiting migration. A short allowlist duplicated four
// times is exactly the shape that produced the `POST /api/cuisine/user-language`
// bug earlier in this arc, where three copies learned `ja` and the fourth did not.
// So the mapping lives here and the four callers import it.
//
// WHAT THIS CANNOT DO, STATED RATHER THAN DISCOVERED LATER
// --------------------------------------------------------
// The Maps SDK is injected ONCE per webview and its `language` is fixed at that
// moment — Google offers no way to re-language a loaded map. So switching locale
// mid-session re-renders every string the app owns and leaves the map's own tile
// labels in the language the session started in, until the next launch. That is a
// real seam, not a rounding error, and it is asserted in the tests rather than
// left for a screenshot to find. Reloading the SDK to fix it would blank and
// re-tile the map under the reader's finger, which is worse than the seam.

/** Shared across all five TMAs on one origin. */
export const LOCALE_KEY = 'gia.locale';

/** The app's eight. Kept as data so a ninth locale is one line, not a hunt. */
export const SUPPORTED_LOCALES = ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es'];

// Google's list is not the app's list. Seven of the eight are accepted verbatim;
// bare `zh` is NOT one of Google's codes — it publishes `zh-CN` and `zh-TW`. The
// app's Chinese is Simplified throughout (the hawker-centre names curated this
// arc are Simplified, and the government register they came from is Simplified),
// so `zh` maps to `zh-CN`. Sending bare `zh` silently falls back to English,
// which is the failure this module exists to stop, arriving one locale later.
const GOOGLE_OVERRIDES = { zh: 'zh-CN' };

/**
 * The Maps `language` value for an app locale.
 * Unknown or absent locale → 'en', never undefined: a missing parameter and
 * `language=undefined` are different requests, and the second is a bug.
 * @param {string} [lang]
 * @returns {string}
 */
export function mapsLanguage(lang) {
  if (!SUPPORTED_LOCALES.includes(lang)) return 'en';
  return GOOGLE_OVERRIDES[lang] || lang;
}

/**
 * Read the stored locale and return its Maps `language`. Storage can throw
 * (Safari private mode), so this never does.
 * @returns {string}
 */
export function mapsLanguageFromStorage() {
  let stored = null;
  try {
    stored = typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(LOCALE_KEY)
      : null;
  } catch { /* private mode — fall through to 'en' */ }
  return mapsLanguage(stored);
}

/**
 * The `&language=…` fragment for a script URL, ready to concatenate.
 * Percent-encoded because it lands in a query string; `zh-CN` survives intact.
 * @returns {string}
 */
export function mapsLanguageParam() {
  return '&language=' + encodeURIComponent(mapsLanguageFromStorage());
}
