// v0.62.997 — invariants I1, I2 and I5 of doc/Feature/2026-11-28-cuisine-saved-place-near-first.spec.md, on the
// Cuisine app's source.
//
// Operator, 28-11 '26: the Cuisine app asked for the phone's location although a place had just been set in the
// Menu app. Cause, measured: the 20-second follow sync (web/_shared/lib/location-sync.js) was started on mount and
// its first tick reads the phone at once, before deciding whether to follow; and the start-up check read the phone
// again for a place past its 6-hour lock. The operator chose "Never automatically" and, with no saved place, "Read
// the phone once". The behaviour is measured on the built app by visual/cuisine-launch-location.spec.mjs; this file
// pins where the readings may come from, which the browser check cannot name.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// Comments masked, so a sentence about a call cannot stand in for the call.
const src = readFileSync(new URL('../web/cuisine/src/v2/App.jsx', import.meta.url), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '');

const count = (re) => (src.match(re) || []).length;

describe('I1: Cuisine reads the phone only where the reader or an empty record asks', () => {
  it('the 20-second follow sync is not started', () => {
    expect(count(/startLocationSync\(/g)).toBe(0);
  });
  it('the start-up check does not read the phone', () => {
    expect(src).not.toMatch(/getFreshGps/);
  });
  it('exactly two places read the device: the empty-record fallback and the 📍 Current button', () => {
    expect(count(/navigator\.geolocation\.getCurrentPosition\(/g)).toBe(2);
    expect(count(/await getTelegramLocation\(\)/g)).toBe(2);
    expect(src).toMatch(/async function tryGps\(\)/);
    expect(src).toMatch(/const pickCurrentLocation = React\.useCallback\(async \(\) => \{/);
  });
  it('the switch to the phone after 6 hours and its "Back to" chip are gone from Cuisine', () => {
    expect(src).not.toMatch(/shouldSwitchToDevice/);
    expect(src).not.toMatch(/setBackTo\(/);
    expect(src).not.toMatch(/switchedFromUnlocked/);
  });
});

describe('I2: with no saved place, the one reading is used and saved', () => {
  it('the phone is read only after the saved-place lookup misses', () => {
    expect(src).toMatch(/\} else if \(await tryServerCache\(\)\) \{[\s\S]*?\} else if \(await tryGps\(\)\) \{/);
  });
  it('the start-up check names the place from that reading rather than taking a second one', () => {
    expect(src).toMatch(/const target = userLoc;/);
  });
});

describe('I5: a widened search says so', () => {
  it('the result keeps the widened radius from the server', () => {
    expect(src).toMatch(/setNearWidenedM\(Number\.isFinite\(r\.nearWidenedToM\) \? r\.nearWidenedToM : null\)/);
  });
  it('and shows it with the "widened to N km" line the nine languages already carry', () => {
    expect(src).toMatch(/\{nearWidenedM && !loading && !specialModeNotice && \(/);
    expect(src).toMatch(/tn\('special\.widened', lang, \{ km: \(nearWidenedM \/ 1000\)\.toFixed\(1\) \}\)/);
  });
});
