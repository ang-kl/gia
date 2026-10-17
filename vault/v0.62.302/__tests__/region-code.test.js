// __tests__/region-code.test.js — v0.61.231
//
// Guards the Places regionCode derivation shared by /s, free-text, and the
// nation-iconic / cooking-method fan-outs. Regression: before v0.61.231 the
// iconic fan-out ignored this entirely and forced 'SG', so Singaporean (and
// any NATION_OVERLAY) dishes returned zero results when the user's anchor was
// abroad (country=MY/ID/TH, Bangkok/Tokyo pins).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { resolveRegionCode } = require('../region-code.js');

describe('resolveRegionCode', () => {
  it('uses the ISO alpha-2 country when present', () => {
    expect(resolveRegionCode({ country: 'TH' })).toBe('TH');
    expect(resolveRegionCode({ country: 'MY' })).toBe('MY');
    expect(resolveRegionCode({ country: 'ID' })).toBe('ID');
    expect(resolveRegionCode({ country: 'JP' })).toBe('JP');
    expect(resolveRegionCode({ country: 'VN' })).toBe('VN');
  });

  it('country wins even when a region is also set', () => {
    expect(resolveRegionCode({ country: 'TH', region: 'JB' })).toBe('TH');
  });

  it('maps legacy JB / MY-PUT regions to MY', () => {
    expect(resolveRegionCode({ region: 'JB' })).toBe('MY');
    expect(resolveRegionCode({ region: 'MY-PUT' })).toBe('MY');
  });

  it('defaults to SG for null / empty / unrecognised input', () => {
    expect(resolveRegionCode(null)).toBe('SG');
    expect(resolveRegionCode(undefined)).toBe('SG');
    expect(resolveRegionCode({})).toBe('SG');
    expect(resolveRegionCode({ region: 'SG' })).toBe('SG');
    expect(resolveRegionCode({ region: 'OTHER' })).toBe('SG');
  });

  it('ignores malformed country codes (not 2 uppercase letters)', () => {
    expect(resolveRegionCode({ country: 'tha' })).toBe('SG');
    expect(resolveRegionCode({ country: 'th' })).toBe('SG');
    expect(resolveRegionCode({ country: 'T' })).toBe('SG');
    expect(resolveRegionCode({ country: '' })).toBe('SG');
  });
});
