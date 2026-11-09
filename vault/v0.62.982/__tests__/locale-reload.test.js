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

// v0.62.892 — SIXTH occurrence of this trap in this repo, and it caught me again:
// MapPanel's comment explains the mount-order race by QUOTING the anti-pattern
// (`useRef(restoredMount ? venues : null)`), so a negative scan matched the very
// explanation of why the code does not do that. Lifted verbatim from
// bot-ternary-sweep.test.js rather than re-derived.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

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
    // v0.62.892 — the array grew by three. The camera and the pin are stashed now, and a
    // listener closed over an older `locationAnchor` would carry the pin the reader had
    // BEFORE their last change — a subtler form of the bug this version fixes. Updated
    // deliberately rather than loosened to a substring match, because the point of pinning
    // it verbatim is that a NEW input cannot be added without someone deciding it belongs.
    expect(app()).toMatch(
      /\}, \[venues, searchCenter, userLoc, selectedCityLocation, locationAnchor, searchLocName, mapViewLocation\]\);/,
    );
  });

  it('THE PIN SURVIVES THE TOGGLE — the guard that did not exist', () => {
    // Operator, with a screenshot: "You can see the location is in Japan. When i switch from
    // Japanese language to Chinese, it switch to locale location which is in Singapore."
    //
    // Nothing tested this. The stash carried the RESULTS across the reload and never the
    // CAMERA, so after the reload nothing was left to pan back to the pin; and the header
    // label was correct only because a server round-trip happened to re-deliver the saved
    // pick. Label and map read different sources, and only one of them survived.
    const s = app();
    // 1. the camera and the pin are stashed.
    //    SCOPED TO THE PAYLOAD BLOCK, and that is not fussiness. The first draft
    //    asserted /locationAnchor, searchLocName,/ against the whole file and a
    //    mutation deleting that exact line from the payload STILL PASSED — because
    //    the same two identifiers, in the same order, also appear in the effect's
    //    dependency array seventeen lines below. The assertion was green for the
    //    wrong reason, which is the failure mode a mutation run exists to find.
    const payload = s.slice(s.indexOf('const payload = {'), s.indexOf('scrollY: window.scrollY || 0,'));
    expect(payload, 'the payload block').toContain('const payload = {');
    expect(payload, 'the pin itself').toMatch(/locationAnchor, searchLocName,/);
    expect(payload, 'the device-follow guard travels too').toMatch(/explicitPick: explicitPickRef\.current,/);
    expect(payload, 'the camera').toMatch(/camera: \(cam && Number\.isFinite\(cam\.lat\) && Number\.isFinite\(cam\.lng\)\)/);
    // 2. the camera is re-issued on restore, with a FRESH key — `_k` is the identity the fly
    //    is keyed on, and one carried across a reload is by definition already spent.
    expect(s).toMatch(/setFlyTarget\(\{ \.\.\.restored\.camera, _k: Date\.now\(\) \}\)/);
    expect(s, 'a reused _k would be a no-op').not.toMatch(/setFlyTarget\(restored\.camera\)/);
    // 3. the guard is re-armed, or the 20 s device-follow drags the pin back to SG GPS
    expect(s).toMatch(/if \(restored\.explicitPick\) explicitPickRef\.current = true;/);
    // 4. and the pin is applied BELOW its own declarations — the v0.62.841 TDZ rule.
    const decl = s.indexOf('const [searchLocName, setSearchLocName] = useState');
    const apply = s.indexOf('if (p.locationAnchor) setLocationAnchor(p.locationAnchor);');
    expect(decl, 'searchLocName declaration').toBeGreaterThan(-1);
    expect(apply, 'the second restore effect').toBeGreaterThan(-1);
    expect(apply, 'the pin restore must sit BELOW the state it sets').toBeGreaterThan(decl);
  });

  it('a restored mount is not read as a new search', () => {
    // The other half. `venues` re-hydrated from sessionStorage is always a brand-new array,
    // so MapPanel's identity check said "new result set" on every restored mount and framed
    // the centroid of results the reader had already navigated away from — skipping the
    // branch that would have honoured their pinned searchCenter.
    const mp = readFileSync(join(ROOT, 'web/cuisine/src/v2/components/MapPanel.jsx'), 'utf8');
    expect(mp).toMatch(/restoredMount = false/);
    expect(mp).toMatch(/if \(restoredMount && !restoreSeededRef\.current && venues\?\.length\) \{/);
    expect(maskComments(mp), 'seeding the ref initialiser would lose the mount-order race')
      .not.toMatch(/useRef\(restoredMount \? venues : null\)/);
    expect(app(), 'and App passes it').toMatch(/restoredMount=\{localeReloadRestored\}/);
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
