// __tests__/jb-focus-points.test.js — v0.61.277

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  JB_FOCUS_POINTS,
  JB_FOCUS_KEYS,
  JB_FOCUS_DEFAULT,
  getJbFocus
} = require('../web/cuisine/src/v2/lib/jb-focus-points.js');

describe('JB_FOCUS_POINTS — v0.61.277 shape', () => {
  it('exports both southkey + cbd keys', () => {
    expect(JB_FOCUS_KEYS.sort()).toEqual(['cbd', 'southkey']);
  });

  it('southkey coords match operator-cited Mid Valley Southkey', () => {
    expect(JB_FOCUS_POINTS.southkey.name).toBe('Mid Valley Southkey');
    expect(JB_FOCUS_POINTS.southkey.lat).toBeCloseTo(1.4912, 4);
    expect(JB_FOCUS_POINTS.southkey.lng).toBeCloseTo(103.7665, 4);
  });

  it('cbd coords match the existing index.js:12005 JB CBD constant', () => {
    expect(JB_FOCUS_POINTS.cbd.name).toBe('JB CBD');
    expect(JB_FOCUS_POINTS.cbd.lat).toBeCloseTo(1.4927, 4);
    expect(JB_FOCUS_POINTS.cbd.lng).toBeCloseTo(103.7414, 4);
  });

  it('default key is southkey', () => {
    expect(JB_FOCUS_DEFAULT).toBe('southkey');
  });

  it('getJbFocus returns the named focus when valid', () => {
    expect(getJbFocus('southkey').name).toBe('Mid Valley Southkey');
    expect(getJbFocus('cbd').name).toBe('JB CBD');
  });

  it('getJbFocus falls back to default on unknown key', () => {
    expect(getJbFocus('unknown')).toBe(JB_FOCUS_POINTS.southkey);
    expect(getJbFocus(null)).toBe(JB_FOCUS_POINTS.southkey);
    expect(getJbFocus(undefined)).toBe(JB_FOCUS_POINTS.southkey);
  });

  it('both entries are frozen (immutable)', () => {
    expect(Object.isFrozen(JB_FOCUS_POINTS)).toBe(true);
    expect(Object.isFrozen(JB_FOCUS_POINTS.southkey)).toBe(true);
    expect(Object.isFrozen(JB_FOCUS_POINTS.cbd)).toBe(true);
  });
});

describe('JB_FOCUS_POINTS — coords are inside the JB extent', () => {
  // Lifted thresholds from web/cuisine/src/v2/lib/coords-to-country.js
  // SG max lat is 1.47 (so JB CBD at 1.4927 + Southkey at 1.4912
  // both fall outside SG bbox into the JB-extent bbox). This is the
  // contract the v0.61.277 pill auto-anchor + chip relies on.
  it('Southkey is north of the SG_LAT_MAX boundary (1.47)', () => {
    expect(JB_FOCUS_POINTS.southkey.lat).toBeGreaterThan(1.47);
  });
  it('JB CBD is north of the SG_LAT_MAX boundary (1.47)', () => {
    expect(JB_FOCUS_POINTS.cbd.lat).toBeGreaterThan(1.47);
  });
});
