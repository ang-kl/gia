// __tests__/locale-restore-coherence.test.js — v0.62.959.
//
// Spec: doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md, Part B (B1, B2, B4; I6, I7).
//
// Operator, 30-10 '26: "when I toggled language, the settings should not reset nor the list of eateries". Cuisine
// reloads the page on a language switch (Google fixes the map language at load) and restores a stash. Two defects:
//   1. A restored mount never cleared `firstLoadPending`, so when the set location was abroad (a Tokyo pin on a phone in
//      Singapore, the operator's own setup) the boot-coherence checks called haltBootLoadForMismatch, which believed it
//      was stopping the boot load and EMPTIED the restored list. Reproduced headless with the real bundle before the
//      fix: venues [] and "boot load HALTED — anchor 5319km from device".
//   2. The stash carried 10 hand-picked fields, so layers, list/carousel, the selected eatery, typed text, paging, the
//      searched term and the Park Connector lock all reset.
// The census below makes the second impossible to re-open quietly: every useState in App.jsx is either stashed or
// named as transient with a reason.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { LOCALE_STASH } from '../web/cuisine/src/v2/lib/state.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const raw = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const code = (p) => raw(p)
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
const APP = 'web/cuisine/src/v2/App.jsx';

const slice = (src, start, end) => {
  const a = src.indexOf(start);
  expect(a, start).toBeGreaterThan(-1);
  return src.slice(a, src.indexOf(end, a + start.length));
};

describe('I6 — a restored mount never empties its restored list', () => {
  const src = code(APP);
  it('haltBootLoadForMismatch does nothing on a restored mount', () => {
    const fn = slice(src, 'function haltBootLoadForMismatch(reason) {', 'setVenues([]);');
    expect(fn).toMatch(/if \(localeReloadRestored\) return;/);
  });
  it('the restore effect marks the boot load finished, ref and state together', () => {
    const fx = slice(src, 'const restored = takeStash();', 'localeRestorePending = restored;');
    expect(fx).toMatch(/firstLoadPendingRef\.current = false;/);
    expect(fx).toMatch(/setFirstLoadPending\(false\);/);
  });
});

describe('I7 — the census: every useState in App.jsx is stashed or transient with a reason', () => {
  const src = raw(APP);
  const names = [...src.matchAll(/const \[(\w+)(?:, set\w+)?\] = useState\(/g)].map((m) => m[1]);
  // `carried` are the fields the v0.62.858-892 payload already carried by name (pinned by locale-reload.test.js);
  // `stashed` travel in the new `view` object; `transient` are deliberately not carried, each with its reason.
  const carried = new Set(LOCALE_STASH.carried);
  const stashed = new Set(LOCALE_STASH.stashed);
  const transient = LOCALE_STASH.transient;

  it('the census reads the file, not nothing', () => {
    expect(names.length).toBeGreaterThan(90);
  });
  it('every state is accounted for, once', () => {
    const missing = names.filter((n) => !carried.has(n) && !stashed.has(n) && !(n in transient));
    expect(missing, 'a useState that is neither carried, stashed nor listed as transient').toEqual([]);
    const all = [...carried, ...stashed, ...Object.keys(transient)];
    expect(all.filter((n, i) => all.indexOf(n) !== i), 'listed twice').toEqual([]);
  });
  it('no entry is stale', () => {
    const live = new Set(names);
    expect([...carried, ...stashed, ...Object.keys(transient)].filter((n) => !live.has(n)), 'names that no longer exist').toEqual([]);
  });
  it('every carried state is in the payload', () => {
    const payload = slice(code(APP), 'const payload = {', '};');
    for (const n of carried) expect(payload, n).toMatch(new RegExp(`\\b${n}\\b`));
    expect(payload).toMatch(/view: viewStashRef\.current/);
  });
  it('every transient entry says why', () => {
    for (const [n, why] of Object.entries(transient)) expect(String(why).length, n).toBeGreaterThan(12);
  });
  it('every stashed state is written into the stash and set back from it', () => {
    const c = code(APP);
    const writer = slice(c, 'viewStashRef.current = {', '};');
    const setters = slice(c, 'viewSettersRef.current = {', '};');
    for (const n of stashed) {
      expect(writer, `${n} is not written`).toMatch(new RegExp(`\\b${n}\\b`));
      expect(setters, `${n} is not restored`).toMatch(new RegExp(`\\b${n}:`));
    }
  });
  it('the camera carries the real zoom, not a fixed 14', () => {
    const c = code(APP);
    expect(c).not.toMatch(/zoom: 14 \}/);
    expect(code('web/cuisine/src/v2/components/MapPanel.jsx')).toMatch(/onMapMove\(\{ lat: c\.lat\(\), lng: c\.lng\(\), zoom:/);
  });
});

describe('B2 — the Park Connector lock survives a language switch', () => {
  it('MapPanel reports the lock up and re-applies a restored one without re-fitting the map', () => {
    const mp = code('web/cuisine/src/v2/components/MapPanel.jsx');
    expect(mp).toMatch(/onPcnLockChange/);
    expect(mp).toMatch(/restorePcnLock/);
    expect(mp).toMatch(/pcnLock\(restorePcnLock, \{ fit: false \}\)/);
  });
  it.each(['web/cuisine/src/v2/lib/mapOverlays.js', 'web/hawker/src/lib/mapOverlays.js', 'web/transport/src/lib/mapOverlays.js'])(
    '%s: pcnLock takes { fit }', (p) => {
      expect(code(p)).toMatch(/pcnLock\(name, \{ fit = true \} = \{\}\)/);
    });
});

describe('B4 — Train keeps the reader\'s view when only the language changes', () => {
  it('the pins effect passes keepView when nothing but lang changed', () => {
    const mp = code('web/transport/src/components/MrtMapPanel.jsx');
    const fx = slice(mp, 'if (mapRef.current && stations) renderPins(stations', '}, [stations, linePaths');
    expect(fx).toMatch(/keepView: onlyLang/);
  });
});
