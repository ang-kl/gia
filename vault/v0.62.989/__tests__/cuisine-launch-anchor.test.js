// __tests__/cuisine-launch-anchor.test.js — v0.62.987.
//
// Spec: doc/Feature/2026-11-15-chat-place-opens-cuisine-and-bold-tag.spec.md, invariants K2 and K4.
//
// The PROOF of K2 is scripts/cuisine-deeplink-boot.mjs: it boots the BUILT app from a chat link in a headless
// browser, under six conditions, and reads the screen. Each of the four parts of the app-side fix was removed in a
// scratch copy ([AMD-339]): the script FAILED for parts 1, 3 and 4. It did NOT fail for part 2 (arming the latch and
// the lock when the link is read), so part 2 is held by the source pin below and by nothing else. The reason is
// measured, not guessed: the only automatic mover the latch could stop on a chat-link open is the 20-second follow,
// and location-sync.js gives that follow one chance, on its first tick, which the pending first load already
// refuses. Part 2 is kept because it makes a chat-link place a deliberate pick like every other deliberate pick in
// this file, not because a test here can see it work.
//
// This file holds what a unit test can hold:
//   - the app's own reader of the link, CALLED, including the one-line statement of the defect;
//   - source pins, comments masked, that App.jsx still wires the four parts in. A pin cannot show the app behaves;
//     it can show that a later edit removed the wiring, minutes sooner than the browser check would.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { readOverridesFromHash } from '../web/cuisine/src/v2/lib/state.js';

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

describe('K2 / K4 - the app reads the place and its name out of the chat link', () => {
  function withHash(hash, fn) {
    const had = Object.prototype.hasOwnProperty.call(globalThis, 'window');
    const prev = globalThis.window;
    globalThis.window = { location: { hash } };
    try { return fn(); } finally { if (had) globalThis.window = prev; else delete globalThis.window; }
  }

  it('lat, lng, region and the name, exactly as location-cache.js applyLaunchAnchorToParams writes them', () => {
    const link = new URLSearchParams({ lat: '1.5148', lng: '103.6862', region: 'OTHER', place: 'Hyatt Place Johor Bahru Paradigm Mall, Johor Bahru, Johor' });
    const o = withHash('#' + link.toString(), () => readOverridesFromHash());
    expect(o.location).toEqual({ lat: 1.5148, lng: 103.6862, name: 'Hyatt Place Johor Bahru Paradigm Mall, Johor Bahru, Johor', region: 'OTHER' });
  });

  it('a link from before v0.62.987 (no name) still yields the place, unnamed', () => {
    const o = withHash('#lat=1.5148&lng=103.6862&region=OTHER', () => readOverridesFromHash());
    expect(o.location).toEqual({ lat: 1.5148, lng: 103.6862, name: '', region: 'OTHER' });
  });

  it('the address the app rewrites for itself carries no place: reading it again yields nothing', () => {
    // The defect of 15-11 '26 in one line: after the first paint the address is "#region=SG"-shaped, so a reader
    // that goes back to the address has lost the link.
    expect(withHash('#region=OTHER', () => readOverridesFromHash())).toBeNull();
    expect(withHash('#cuisines=indonesian&region=SG', () => readOverridesFromHash())).toBeNull();
  });
});

describe('K2 - App.jsx keeps the four parts wired (source pins; the browser check is the proof)', () => {
  const src = code('web/cuisine/src/v2/App.jsx');

  it('1. the chat link is read once per page load, into a ref, and never straight from the address on render', () => {
    expect(src).not.toMatch(/const initialOverrides = \(typeof window !== 'undefined'\) \? readOverridesFromHash\(\)/);
    expect(src).toMatch(/if \(initialOverridesRef\.current === undefined\) \{/);
    expect(src).toMatch(/const initialOverrides = initialOverridesRef\.current;/);
    // One read site only.
    expect(src.split('readOverridesFromHash(').length - 1).toBe(1);
  });

  it('2. a link that carries a place arms the explicit-pick latch and the lock at that read', () => {
    const at = src.indexOf('if (initialOverridesRef.current === undefined) {');
    const block = src.slice(at, at + 420);
    expect(block).toMatch(/if \(initialOverridesRef\.current\?\.location\) \{\s*explicitPickRef\.current = true;\s*anchorLockedRef\.current = true;/);
  });

  it('3. the server\'s answer cannot override a region the link states itself', () => {
    expect(src).toMatch(/const linkHasRegion = userLocSource === 'hash' && !!initialOverrides\?\.location\?\.region;/);
    expect(src).toMatch(/if \(r\?\.region && !linkHasRegion\) applyRegionFromAnchor\(r\.region\);/);
  });

  it('4. the post-search re-push stands down for a place that came from the chat link, until a pick is made in the app', () => {
    const at = src.indexOf('async function reassertPickAfterSearch(');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 260)).toMatch(/if \(linkPickRef\.current\) return;/);
    const pick = src.indexOf('function onLocationSelect(p) {');
    expect(pick).toBeGreaterThan(-1);
    expect(src.slice(pick, pick + 220)).toMatch(/linkPickRef\.current = false;/);
  });
});

describe('FINDING, recorded so it cannot be mistaken for a working feature', () => {
  // [AMD-339]. The return-to-app refresh (refetchAndFlip, v0.61.186) calls isValidCoord, which is a const of ANOTHER
  // useEffect. It throws a ReferenceError that its own catch swallows, so it has applied nothing since 27-05 '26.
  // This release does not change that (switching it on is the operator's decision). The test below states the
  // condition as it is. When the refresh is repaired it FAILS, on purpose: whoever repairs it must then decide what
  // a locked place set in chat does when the reader returns to an open app, and extend the browser check to cover
  // it (the check already fires the event three times).
  it('refetchAndFlip still calls a helper that is not in its scope', () => {
    const src = code('web/cuisine/src/v2/App.jsx');
    const defs = src.match(/const isValidCoord = /g) || [];
    expect(defs.length, 'isValidCoord is now defined somewhere else too: is the refresh live?').toBe(1);
    const def = src.indexOf('const isValidCoord = ');
    const refresh = src.indexOf('async function refetchAndFlip()');
    expect(refresh).toBeGreaterThan(def);
    // The definition sits inside the mount effect: between it and the refresh, that effect closes and others open.
    const between = src.slice(def, refresh);
    expect(between.split('useEffect(').length - 1).toBeGreaterThan(3);
    expect(src.slice(refresh, refresh + 420)).toMatch(/if \(!r \|\| !isValidCoord\(r\.lat, r\.lng\)\) return;/);
  });
});
