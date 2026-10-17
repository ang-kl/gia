// __tests__/device-region.test.js — v0.61.376
// Option-B device region: the iOS "Region" (currency) override must beat the
// "Language". Operator's phone: Language=English (UK), Region=Singapore →
// must resolve SG (→ S$), not GB (→ £).

import { describe, it, expect } from 'vitest';
import { regionFromUnicodeRg, regionFromLanguageTag, pickDeviceRegion } from '../web/cuisine/src/v2/lib/device-region.js';

describe('regionFromUnicodeRg', () => {
  it('extracts the iOS Region override', () => {
    expect(regionFromUnicodeRg('en-GB-u-rg-sgzzzz')).toBe('SG');
    expect(regionFromUnicodeRg('en-US-u-rg-jpzzzz')).toBe('JP');
  });
  it('handles a -rg- without the zzzz filler', () => {
    expect(regionFromUnicodeRg('en-GB-u-rg-sg')).toBe('SG');
  });
  it('returns null when there is no override', () => {
    expect(regionFromUnicodeRg('en-GB')).toBeNull();
    expect(regionFromUnicodeRg('')).toBeNull();
    expect(regionFromUnicodeRg(null)).toBeNull();
  });
});

describe('regionFromLanguageTag', () => {
  it('reads an explicit region', () => {
    expect(regionFromLanguageTag('en-GB')).toBe('GB');
    expect(regionFromLanguageTag('en-SG')).toBe('SG');
  });
  it('maximizes a bare language', () => {
    expect(regionFromLanguageTag('en')).toBe('US');
    expect(regionFromLanguageTag('zh')).toBe('CN');
  });
  it('returns null for empties', () => {
    expect(regionFromLanguageTag('')).toBeNull();
    expect(regionFromLanguageTag(null)).toBeNull();
  });
});

describe('pickDeviceRegion — Region override beats Language', () => {
  it("the operator's phone: Language en-GB + Region Singapore → SG (not GB)", () => {
    expect(pickDeviceRegion({
      resolvedLocales: ['en-GB-u-rg-sgzzzz'],
      navigatorLanguage: 'en-GB',
    })).toBe('SG');
  });
  it('falls back to the language region when there is no override', () => {
    expect(pickDeviceRegion({
      resolvedLocales: ['en-GB'],
      navigatorLanguage: 'en-GB',
    })).toBe('GB');
  });
  it('scans multiple resolved locales for the override', () => {
    expect(pickDeviceRegion({
      resolvedLocales: ['en-GB', 'en-GB-u-rg-jpzzzz'],
      navigatorLanguage: 'en-GB',
    })).toBe('JP');
  });
  it('no signal at all → null', () => {
    expect(pickDeviceRegion({ resolvedLocales: [], navigatorLanguage: '' })).toBeNull();
  });
});
