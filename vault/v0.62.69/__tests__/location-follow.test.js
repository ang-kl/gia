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
