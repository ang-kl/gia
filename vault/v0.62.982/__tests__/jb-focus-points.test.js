// __tests__/jb-focus-points.test.js — v0.61.281

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  JB_FOCUS_POINTS,
  JB_FOCUS_KEYS,
  JB_FOCUS_DEFAULT,
  JB_FOCUS_CHIP_LABELS,
  getJbFocus
} = require('../web/cuisine/src/v2/lib/jb-focus-points.js');

describe('JB_FOCUS_POINTS — v0.61.281 shape', () => {
  it('exports five chip keys in operator-spec order', () => {
    // Order matters: it's the chip render order per the v0.61.281
    // operator screenshot annotation. Use Array.from to clone the
    // frozen JB_FOCUS_KEYS before any in-place comparison.
    expect(Array.from(JB_FOCUS_KEYS)).toEqual([
      'legoland', 'bukitIndah', 'cbd', 'southkey', 'mtAustin'
    ]);
  });

  it('legoland coords match Legoland Malaysia', () => {
    expect(JB_FOCUS_POINTS.legoland.name).toBe('Legoland Malaysia');
    expect(JB_FOCUS_POINTS.legoland.lat).toBeCloseTo(1.4296, 4);
    expect(JB_FOCUS_POINTS.legoland.lng).toBeCloseTo(103.6321, 4);
  });

  it('bukitIndah coords are inside JB extent', () => {
    expect(JB_FOCUS_POINTS.bukitIndah.name).toBe('Bukit Indah');
    expect(JB_FOCUS_POINTS.bukitIndah.lat).toBeCloseTo(1.4773, 4);
    expect(JB_FOCUS_POINTS.bukitIndah.lng).toBeCloseTo(103.6645, 4);
  });

  it('cbd coords match the existing JB CBD constant', () => {
    expect(JB_FOCUS_POINTS.cbd.name).toBe('JB CBD');
    expect(JB_FOCUS_POINTS.cbd.lat).toBeCloseTo(1.4927, 4);
    expect(JB_FOCUS_POINTS.cbd.lng).toBeCloseTo(103.7414, 4);
  });

  it('southkey coords match Mid Valley Southkey', () => {
    expect(JB_FOCUS_POINTS.southkey.name).toBe('Mid Valley Southkey');
    expect(JB_FOCUS_POINTS.southkey.lat).toBeCloseTo(1.4912, 4);
    expect(JB_FOCUS_POINTS.southkey.lng).toBeCloseTo(103.7665, 4);
  });

  it('mtAustin coords match Mount Austin', () => {
    expect(JB_FOCUS_POINTS.mtAustin.name).toBe('Mount Austin');
    expect(JB_FOCUS_POINTS.mtAustin.lat).toBeCloseTo(1.5252, 4);
    expect(JB_FOCUS_POINTS.mtAustin.lng).toBeCloseTo(103.7935, 4);
  });

  it('default key is southkey (preserves v0.61.277 behaviour)', () => {
    expect(JB_FOCUS_DEFAULT).toBe('southkey');
  });

  it('chip labels are short forms suited to a 5-chip mobile row', () => {
    expect(JB_FOCUS_CHIP_LABELS).toEqual({
      legoland:   'Legoland',
      bukitIndah: 'Bukit Indah',
      cbd:        'CBD',
      southkey:   'Southkey',
      mtAustin:   'Mt Austin'
    });
  });

  it('getJbFocus returns the named focus when valid', () => {
    expect(getJbFocus('legoland').name).toBe('Legoland Malaysia');
    expect(getJbFocus('cbd').name).toBe('JB CBD');
    expect(getJbFocus('mtAustin').name).toBe('Mount Austin');
  });

  it('getJbFocus falls back to default on unknown / null / undefined', () => {
    expect(getJbFocus('unknown')).toBe(JB_FOCUS_POINTS.southkey);
    expect(getJbFocus(null)).toBe(JB_FOCUS_POINTS.southkey);
    expect(getJbFocus(undefined)).toBe(JB_FOCUS_POINTS.southkey);
  });

  it('all five entries are frozen (immutable)', () => {
    expect(Object.isFrozen(JB_FOCUS_POINTS)).toBe(true);
    for (const k of JB_FOCUS_KEYS) {
      expect(Object.isFrozen(JB_FOCUS_POINTS[k])).toBe(true);
    }
  });
});

describe('JB_FOCUS_POINTS — all five classify as JB via isJbCoords', () => {
  // The v0.61.281 contract: every registered JB focus point must
  // return isJbCoords()===true so tapping the chip doesn't trigger
  // the v0.61.276 region-coords coherence modal ("JB selected but
  // you're not in Johor"). Legoland (1.4296, 103.6321) is the
  // tricky case — the pre-v0.61.281 bbox over-claimed it for SG
  // because the flat SG_LAT_MAX=1.47 extended too far west. The
  // v0.61.281 west-of-strait carve-out (lng<103.70 → SG_LAT_MAX=
  // 1.42) corrects this.
  const { isJbCoords, coordsToCountry } = require('../web/cuisine/src/v2/lib/coords-to-country.js');

  for (const k of JB_FOCUS_KEYS) {
    it(`${k} (${JB_FOCUS_POINTS[k].name}) → isJbCoords true`, () => {
      expect(isJbCoords(JB_FOCUS_POINTS[k])).toBe(true);
    });
    it(`${k} → coordsToCountry 'MY'`, () => {
      expect(coordsToCountry(JB_FOCUS_POINTS[k])).toBe('MY');
    });
  }

  // Defensive sanity: all five sit within JB longitude range.
  it('all five focus points sit within JB longitude range (103.5–104.0)', () => {
    for (const k of JB_FOCUS_KEYS) {
      const lng = JB_FOCUS_POINTS[k].lng;
      expect(lng).toBeGreaterThan(103.5);
      expect(lng).toBeLessThan(104.0);
    }
  });
});
