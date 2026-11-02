// __tests__/location-follow.test.js — v0.61.372
// The 20 s "follow device" sync decision (web/cuisine). Closes the race
// where a Menu-picked overseas city was overwritten by the device GPS.

import { describe, it, expect } from 'vitest';
import { shouldFollowDevice, haversineMeters } from '../web/cuisine/src/v2/lib/location-follow.js';

const SG = { lat: 1.2721, lng: 103.8116 };   // Bukit Merah (device GPS)
const WLG = { lat: -41.2865, lng: 174.7762 }; // Wellington (Menu pick)

describe('haversineMeters', () => {
  it('is ~0 for the same point', () => {
    expect(haversineMeters(SG, SG)).toBeLessThan(1);
  });
  it('SG → Wellington is a long way (> 8000 km)', () => {
    expect(haversineMeters(SG, WLG)).toBeGreaterThan(8_000_000);
  });
  it('returns Infinity for invalid input', () => {
    expect(haversineMeters(null, SG)).toBe(Infinity);
    expect(haversineMeters(SG, { lat: NaN, lng: 0 })).toBe(Infinity);
  });
});

describe('shouldFollowDevice', () => {
  it('does NOT follow before the initial resolution settles (closes the race)', () => {
    // The sync's first tick (device GPS = SG) must NOT overwrite the
    // soon-to-be-installed Menu pick.
    expect(shouldFollowDevice({
      initialResolveDone: false, explicitAnchorName: null, current: null, loc: SG,
    })).toBe(false);
  });

  it('does NOT follow off an explicit named pick (Menu / deep-link)', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, explicitAnchorName: 'Wellington', current: WLG, loc: SG,
    })).toBe(false);
  });

  it('treats a blank/whitespace name as no explicit pick', () => {
    // device-followed anchors carry name '' → still eligible to follow
    expect(shouldFollowDevice({
      initialResolveDone: true, explicitAnchorName: '   ', current: { lat: 1.0, lng: 103.0 }, loc: SG,
    })).toBe(true);
  });

  it('does NOT follow sub-threshold jitter', () => {
    const jitter = { lat: SG.lat + 0.001, lng: SG.lng + 0.001 }; // ~150 m
    expect(shouldFollowDevice({
      initialResolveDone: true, explicitAnchorName: '', current: SG, loc: jitter,
    })).toBe(false);
  });

  it('follows a real move once resolved with no explicit pick', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, explicitAnchorName: '', current: WLG, loc: SG,
    })).toBe(true);
  });

  it('follows the first reading (no current) once resolved', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, explicitAnchorName: null, current: null, loc: SG,
    })).toBe(true);
  });

  it('does NOT follow an invalid reading', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, explicitAnchorName: null, current: null, loc: { lat: NaN, lng: 0 },
    })).toBe(false);
  });

  // v0.61.387 — operator: "first load just ask user to wait". The follow-sync
  // must not re-search over an in-flight boot load (the re-search also pops a
  // fact card on the first load).
  it('does NOT follow while the first load is still pending', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, firstLoadPending: true, explicitAnchorName: '', current: WLG, loc: SG,
    })).toBe(false);
  });

  it('resumes following once the first load has landed', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, firstLoadPending: false, explicitAnchorName: '', current: WLG, loc: SG,
    })).toBe(true);
  });

  // v0.61.430 — operator: "explicit pick wins". Once the user deliberately
  // picks a foreign region/country, the SG device GPS must NOT drag them back
  // (the country-drift bug), even when the inherited pick carries no name.
  it('does NOT follow after an explicit pick, even with a blank anchor name', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, firstLoadPending: false,
      explicitAnchorName: '', explicitPick: true, current: WLG, loc: SG,
    })).toBe(false);
  });

  it('still follows a real move when no explicit pick has been made', () => {
    expect(shouldFollowDevice({
      initialResolveDone: true, firstLoadPending: false,
      explicitAnchorName: '', explicitPick: false, current: WLG, loc: SG,
    })).toBe(true);
  });
});

// v0.62.965 — spec doc/Feature/2026-11-02-saved-place-expires-after-six-hours.spec.md, I3 and C9.
// A named anchor used to block the follow for ever. Now `locked` (the 6-hour rule, computed by anchor-age.js) is what
// blocks it; a named anchor past its lock follows only when the phone is over 50 km away, so the 1.5 km rule for an
// unnamed anchor is unchanged. The 14 tests above are unedited.
describe('shouldFollowDevice — locked (v0.62.965)', () => {
  const base = { initialResolveDone: true, firstLoadPending: false, explicitPick: false };
  const KYOTO = { lat: 35.0116, lng: 135.7681 };
  const KYOTO_5KM = { lat: 35.0116 + 5 / 111.2, lng: 135.7681 };
  it('a locked named anchor never follows, however far the phone is', () => {
    expect(shouldFollowDevice({ ...base, explicitAnchorName: 'Kyoto', locked: true, current: KYOTO, loc: SG })).toBe(false);
  });
  it('an unlocked named anchor follows only past 50 km: 5 km keeps, Singapore switches', () => {
    expect(shouldFollowDevice({ ...base, explicitAnchorName: 'Kyoto', locked: false, current: KYOTO, loc: KYOTO_5KM })).toBe(false);
    expect(shouldFollowDevice({ ...base, explicitAnchorName: 'Kyoto', locked: false, current: KYOTO, loc: SG })).toBe(true);
  });
  it('an unnamed anchor keeps the 1.5 km rule', () => {
    const NEAR = { lat: SG.lat + 0.001, lng: SG.lng };       // ~110 m
    const TWO_KM = { lat: SG.lat + 2 / 111.2, lng: SG.lng };
    expect(shouldFollowDevice({ ...base, explicitAnchorName: '', locked: false, current: SG, loc: NEAR })).toBe(false);
    expect(shouldFollowDevice({ ...base, explicitAnchorName: '', locked: false, current: SG, loc: TWO_KM })).toBe(true);
  });
  it('explicitPick still blocks (an in-session pick is locked by construction)', () => {
    expect(shouldFollowDevice({ ...base, explicitPick: true, explicitAnchorName: 'Kyoto', locked: false, current: KYOTO, loc: SG })).toBe(false);
  });
});
