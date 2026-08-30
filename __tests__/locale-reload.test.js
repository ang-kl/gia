// __tests__/locale-reload.test.js — v0.62.858 (outstanding item 4).
//
// Operator: *"can you first keep the search results and then reload the map and present it
// back?"* — and, shown the two ways to do it, chose the full reload with the results restored
// over re-injecting the SDK in place.
//
// THAT CHOICE IS THE INTERESTING PART. Re-injecting would have kept the app mounted, which
// sounds strictly better, and it is the option I could not have proved: Google does not
// support unloading the Maps SDK, and nothing in this repo exercises a real one — the render
// smoke runs without it. It would have shipped unverified onto a live map. A page reload is
// dull and certain, and everything below is testable without a browser.
//
// IT ALSO OVERRULES A DECISION THE REPO HAD ALREADY MADE. `gmaps-language.js` argued that
// reloading "would blank and re-tile the map under the reader's finger, which is worse than
// the seam" — fair for reloading alone, wrong once the results come back. That comment is
// rewritten rather than left to contradict the code, and a test below holds it to that,
// because a file arguing against what the codebase does is worse than no comment: the next
// reader believes it.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let mod;
function fakeSession() {
  const store = {};
  return {
    store,
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}
function scriptTag(src) {
  return { getAttribute: (n) => (n === 'src' ? src : null) };
}
function setDom(srcs) {
  globalThis.document = { querySelectorAll: () => srcs.map(scriptTag) };
}

beforeEach(async () => {
  globalThis.window = { sessionStorage: fakeSession(), localStorage: { getItem: () => 'en' } };
  setDom([]);
  vi.resetModules();
  mod = await import('../web/_shared/lib/locale-reload.js');
});
afterEach(() => { delete globalThis.document; delete globalThis.window; });

describe('it reloads only when a map is actually stale', () => {
  it('no map in the page → no reload, because the next injection is already correct', () => {
    // The common case: most people choose a language before they search. Reloading here
    // would be pure cost, and inferring staleness from "the locale changed" would do exactly
    // that on every toggle.
    expect(mod.loadedMapsLanguage()).toBeNull();
    expect(mod.mapsLanguageIsStale('ja')).toBe(false);
  });

  it('a map loaded in the SAME language → no reload', () => {
    setDom(['https://maps.googleapis.com/maps/api/js?key=k&language=ja&callback=x']);
    expect(mod.mapsLanguageIsStale('ja')).toBe(false);
  });

  it('a map loaded in a DIFFERENT language → reload', () => {
    setDom(['https://maps.googleapis.com/maps/api/js?key=k&language=en&callback=x']);
    expect(mod.mapsLanguageIsStale('ja')).toBe(true);
  });

  it('zh is compared through the Google mapping, not raw', () => {
    // `zh` is not one of Google's codes; the app sends `zh-CN`. Comparing the raw locale
    // would make a correctly-loaded Chinese map look stale and reload on every toggle.
    setDom(['https://maps.googleapis.com/maps/api/js?key=k&language=zh-CN&callback=x']);
    expect(mod.mapsLanguageIsStale('zh')).toBe(false);
  });

  it('a map loaded with NO language at all is stale against any choice', () => {
    // The pre-v0.62.836 shape. Google fell back to Accept-Language, so the map may be in
    // anything; treating that as "matches" would strand the exact bug this all came from.
    setDom(['https://maps.googleapis.com/maps/api/js?key=k&callback=x']);
    expect(mod.loadedMapsLanguage()).toBe('');
    expect(mod.mapsLanguageIsStale('ja')).toBe(true);
    expect(mod.mapsLanguageIsStale('en')).toBe(true);
  });

  it('reads the tag, not a remembered value — only one of four loaders stamps data-gmaps', () => {
    // `gmaps-loader.js` records that cuisine's MapPanel injects its own tag without the
    // marker attribute. Keying on `script[data-gmaps]` would see no map on the very panel
    // this feature exists for.
    setDom(['https://cdn.example/other.js', 'https://maps.googleapis.com/maps/api/js?language=fr']);
    expect(mod.loadedMapsLanguage()).toBe('fr');
    const src = read('web/cuisine/src/v2/components/MapPanel.jsx');
    expect(src, 'MapPanel now stamps data-gmaps — the scan could be simplified')
      .not.toMatch(/tag\.dataset\.gmaps/);
  });
});

describe('the search survives the reload', () => {
  it('stash → reload → restore returns the payload once, then never again', () => {
    const reload = vi.fn();
    const payload = { venues: [{ name: 'Tian Tian' }], searchCenter: { lat: 1.3, lng: 103.8 }, scrollY: 240 };
    mod.stashAndReload(payload, { reload });
    expect(reload).toHaveBeenCalledTimes(1);
    expect(mod.takeStash()).toEqual(payload);
    expect(mod.takeStash(), 'a second mount re-applied a spent stash').toBeNull();
  });

  it('clears BEFORE returning, so a payload that breaks the app cannot break every launch', () => {
    mod.stashAndReload({ venues: [] }, { reload: () => {} });
    expect(globalThis.window.sessionStorage.getItem(mod.STASH_KEY)).not.toBeNull();
    mod.takeStash();
    expect(globalThis.window.sessionStorage.getItem(mod.STASH_KEY)).toBeNull();
  });

  it('an expired stash is dropped rather than resurrecting an old result set', () => {
    mod.stashAndReload({ venues: [{ name: 'stale' }] }, { reload: () => {} });
    const raw = JSON.parse(globalThis.window.sessionStorage.getItem(mod.STASH_KEY));
    raw.ts = Date.now() - mod.STASH_TTL_MS - 1;
    globalThis.window.sessionStorage.setItem(mod.STASH_KEY, JSON.stringify(raw));
    expect(mod.takeStash()).toBeNull();
  });

  it('still reloads when storage refuses — an unrestored reload beats a stuck toggle', () => {
    // Safari private mode throws on setItem. Losing the results is bad; leaving the reader
    // on a map in the language they just left, with no way out, is worse.
    globalThis.window.sessionStorage.setItem = () => { throw new Error('QuotaExceeded'); };
    const reload = vi.fn();
    mod.stashAndReload({ venues: [] }, { reload });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('survives junk in storage without throwing', () => {
    for (const junk of ['', 'not json', '{}', '{"ts":"soon"}', 'null']) {
      globalThis.window.sessionStorage.setItem(mod.STASH_KEY, junk);
      expect(() => mod.takeStash()).not.toThrow();
    }
  });
});

describe('it is wired into the cuisine App, in the position that matters', () => {
  const app = () => read('web/cuisine/src/v2/App.jsx');

  it('restores on mount and stashes on the locale event', () => {
    expect(app()).toMatch(/const restored = takeStash\(\);/);
    expect(app()).toMatch(/window\.addEventListener\('gia:locale', onLocale\)/);
    expect(app()).toMatch(/stashAndReload\(payload\)/);
  });

  it('the block sits BELOW every state setter it calls — TDZ, twice-learned', () => {
    // v0.62.841 shipped a white screen by reading a const above its declaration; optional
    // chaining does not guard TDZ, and both Rollup and esbuild compile it happily.
    const s = app();
    const use = s.indexOf('const restored = takeStash();');
    expect(use).toBeGreaterThan(-1);
    for (const decl of [
      'const [userLoc, setUserLoc] = useState(null);',
      'const [venues, setVenues] = useState([]);',
      'const [searchCenter, setSearchCenter] = useState(null);',
      'const [selectedCityLocation, setSelectedCityLocation] = useState(null);',
    ]) {
      const at = s.indexOf(decl);
      expect(at, `${decl} not found`).toBeGreaterThan(-1);
      expect(at, `${decl} is declared AFTER the block that uses its setter`).toBeLessThan(use);
    }
  });

  it('the listener re-subscribes as results change, so the stash is never a stale closure', () => {
    // The v0.62.849 failure, in a new place: a handler closed over the first render's venues
    // would stash an empty list and "restore" nothing.
    expect(app()).toMatch(/\}, \[venues, searchCenter, userLoc, selectedCityLocation\]\);/);
  });

  it('the reload is deferred, so the server-preference POST is not raced away', () => {
    // setActiveLocale writes localStorage, dispatches, and only then dynamically imports
    // api.js to POST the preference that makes bot replies follow the toggle.
    expect(app()).toMatch(/window\.setTimeout\(\(\) => stashAndReload\(payload\), 400\)/);
  });
});

describe('the comment that argued the other way is gone', () => {
  it('gmaps-language.js no longer says reloading is worse than the seam', () => {
    const s = read('web/_shared/lib/gmaps-language.js');
    expect(s, 'the file still argues against what the codebase now does')
      .not.toMatch(/is worse than the seam\.$/m);
    expect(s).toMatch(/WHAT USED TO BE HERE, AND WHY IT IS GONE/);
    // The unchangeable fact it states is still stated — only the conclusion moved.
    expect(s).toMatch(/injected ONCE per webview and its `language` is fixed/);
  });
});
