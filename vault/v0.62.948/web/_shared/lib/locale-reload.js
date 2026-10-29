// web/_shared/lib/locale-reload.js — v0.62.858
//
// RE-LANGUAGE THE MAP WITHOUT LOSING THE SEARCH.
//
// Operator: *"can you first keep the search results and then reload the map and present it
// back?"*, and on being shown the two ways to do it: reload the whole app and restore.
//
// WHY A FULL RELOAD RATHER THAN RE-INJECTING THE SDK. Google fixes the Maps JS API's
// `language` at injection and offers no way to change it afterwards. The alternative was to
// tear out the script tag, delete `window.google`, and re-inject — which Google does not
// support, which leaves dangling references and a marker library registered twice, and which
// nothing in this repo can exercise: the render smoke runs without a real Maps SDK, so it
// would have shipped unverified onto a live map. A fresh page gets the new language with
// certainty, and certainty is the thing that was missing.
//
// THIS OVERRULES A DECISION THIS REPO ALREADY MADE, WHICH IS WHY IT IS WRITTEN DOWN.
// `gmaps-language.js` said: "Reloading the SDK to fix it would blank and re-tile the map
// under the reader's finger, which is worse than the seam." That was a fair reading of
// reloading ALONE. The operator's framing supplies the missing half — keep the results, put
// them back — and with the results preserved the trade changes: a one-second reload that
// returns you to the same list beats a map permanently labelled in the language you just
// left. The old comment has been rewritten rather than left to contradict this file.
//
// IT DOES NOT RELOAD WHEN IT WOULD ACHIEVE NOTHING. If no Maps SDK has been injected yet —
// the common case, since most people pick a language before searching — the next injection
// already uses the new locale, and reloading would be pure cost. Staleness is measured
// against the SDK actually in the page, never assumed from the fact that the locale changed.

import { mapsLanguage } from './gmaps-language.js';

export const STASH_KEY = 'gia.locale-reload';

// A stash is meant to survive one navigation, not a lunch break. sessionStorage is already
// per-tab, so this guards only the case where the reload never happened (the user backgrounded
// the webview mid-switch) and a much later mount would otherwise resurrect a stale result set.
export const STASH_TTL_MS = 5 * 60 * 1000;

const MAPS_SRC = 'maps.googleapis.com/maps/api/js';

/**
 * The `language` the Maps SDK in this page was actually loaded with, or null if none is
 * present. Read from the script tag rather than from anything we remember, because three of
 * the four loaders inject their own tag and only one of them stamps `data-gmaps` — a fact
 * `gmaps-loader.js` records and this function must not assume away.
 */
export function loadedMapsLanguage() {
  if (typeof document === 'undefined') return null;
  const tags = document.querySelectorAll('script[src]');
  for (const t of tags) {
    const src = t.getAttribute('src') || '';
    if (!src.includes(MAPS_SRC)) continue;
    const m = /[?&]language=([^&]+)/.exec(src);
    if (m) { try { return decodeURIComponent(m[1]); } catch { return m[1]; } }
    return '';   // loaded with no language at all — stale against any explicit choice
  }
  return null;
}

/** True when a map is present AND is showing a language the reader has moved away from. */
export function mapsLanguageIsStale(nextLang) {
  const loaded = loadedMapsLanguage();
  if (loaded === null) return false;          // no map yet — the next load is already correct
  return loaded !== mapsLanguage(nextLang);
}

/**
 * Persist `payload` and reload the page. `reload` is injectable so tests can assert the
 * call without navigating; production passes nothing.
 */
export function stashAndReload(payload, { reload = null } = {}) {
  try {
    const blob = JSON.stringify({ ts: Date.now(), payload });
    window.sessionStorage.setItem(STASH_KEY, blob);
  } catch { /* private mode, or a payload with a cycle — reload anyway, unrestored */ }
  const go = reload || (() => window.location.reload());
  go();
}

/**
 * Read the stash and CLEAR it, so a second mount cannot re-apply it. Returns the payload or
 * null. Clearing first is deliberate: a payload that throws while being applied must not be
 * left behind to throw again on every subsequent launch.
 */
export function takeStash() {
  let raw = null;
  try {
    raw = window.sessionStorage.getItem(STASH_KEY);
    window.sessionStorage.removeItem(STASH_KEY);
  } catch { return null; }
  if (!raw) return null;
  try {
    const o = JSON.parse(raw);
    if (!o || typeof o.ts !== 'number') return null;
    if (Date.now() - o.ts > STASH_TTL_MS) return null;
    return o.payload || null;
  } catch { return null; }
}
