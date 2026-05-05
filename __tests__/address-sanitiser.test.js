// __tests__/address-sanitiser.test.js — v0.58.38
//
// Privacy-hardening regex tests. The user reported "31-02 Marina Blvd"
// leaking apartment-level granularity. These tests pin down the SG
// patterns the sanitiser must catch and the false-positive cases it
// must leave alone.

import { describe, it, expect } from 'vitest';
import { stripAddressUnitNumber } from '../address-sanitiser.js';

describe('stripAddressUnitNumber — patterns to STRIP (privacy)', () => {
  it('strips the user-reported "31-02 Marina Blvd" pattern', () => {
    expect(stripAddressUnitNumber('31-02 Marina Blvd, Singapore'))
      .toBe('Marina Blvd, Singapore');
  });

  it('strips leading "#XX-XXX," with hash prefix', () => {
    expect(stripAddressUnitNumber('#08-123, 1 Marina Boulevard, Singapore'))
      .toBe('1 Marina Boulevard, Singapore');
  });

  it('strips leading "XX-XXX," without hash', () => {
    expect(stripAddressUnitNumber('08-123, 1 Marina Boulevard'))
      .toBe('1 Marina Boulevard');
  });

  it('strips mid-address ", #XX-XXX,"', () => {
    expect(stripAddressUnitNumber('1 Marina Blvd, #08-123, Singapore 048542'))
      .toBe('1 Marina Blvd, Singapore 048542');
  });

  it('strips "Block X #YY-ZZZ" while keeping "Block X"', () => {
    expect(stripAddressUnitNumber('Block 123 #08-456, Bedok North Road'))
      .toBe('Block 123, Bedok North Road');
  });

  it('handles 3-digit floor numbers (high-rise)', () => {
    expect(stripAddressUnitNumber('#102-04, 8 Marina Boulevard'))
      .toBe('8 Marina Boulevard');
  });

  it('handles 4-digit unit numbers', () => {
    expect(stripAddressUnitNumber('#08-1234, 5 Marina Way'))
      .toBe('5 Marina Way');
  });

  it('handles whitespace before hash', () => {
    expect(stripAddressUnitNumber('   #08-123, 1 Marina Blvd'))
      .toBe('1 Marina Blvd');
  });
});

describe('stripAddressUnitNumber — patterns to LEAVE ALONE', () => {
  it('does not touch a clean road name', () => {
    expect(stripAddressUnitNumber('Marina Boulevard')).toBe('Marina Boulevard');
  });

  it('does not strip hyphen-bearing road names', () => {
    expect(stripAddressUnitNumber('Choa Chu Kang Loop')).toBe('Choa Chu Kang Loop');
    expect(stripAddressUnitNumber('Tanjong Pagar Road')).toBe('Tanjong Pagar Road');
  });

  it('does not strip a single-digit shophouse range like "1-3 Smith Street"', () => {
    // \d{2,3}-\d{2,4} requires both sides to be 2-3 digits; "1-3" fails.
    expect(stripAddressUnitNumber('1-3 Smith Street')).toBe('1-3 Smith Street');
  });

  it('does not strip a building number with a hyphen ("Hougang Ave 1-2")', () => {
    expect(stripAddressUnitNumber('Hougang Avenue 1-2')).toBe('Hougang Avenue 1-2');
  });

  it('does not strip mid-address hyphenated numbers without a hash', () => {
    // The mid-address rule requires a hash to fire — otherwise legitimate
    // building ranges in the address would get clipped.
    expect(stripAddressUnitNumber('1 Marina Blvd, 11-13, Singapore'))
      .toBe('1 Marina Blvd, 11-13, Singapore');
  });

  it('returns input unchanged for a neighbourhood-only label', () => {
    expect(stripAddressUnitNumber('Downtown Core')).toBe('Downtown Core');
    expect(stripAddressUnitNumber('Tiong Bahru')).toBe('Tiong Bahru');
  });
});

describe('stripAddressUnitNumber — defensive input', () => {
  it('returns null/undefined as-is', () => {
    expect(stripAddressUnitNumber(null)).toBe(null);
    expect(stripAddressUnitNumber(undefined)).toBe(undefined);
  });

  it('returns empty string as-is', () => {
    expect(stripAddressUnitNumber('')).toBe('');
  });

  it('returns non-string types as-is', () => {
    expect(stripAddressUnitNumber(42)).toBe(42);
    expect(stripAddressUnitNumber({})).toEqual({});
    expect(stripAddressUnitNumber([])).toEqual([]);
  });

  it('handles whitespace-only input', () => {
    expect(stripAddressUnitNumber('   ')).toBe('');
  });
});

describe('stripAddressUnitNumber — multi-strip in one pass', () => {
  it('handles both leading unit AND mid-address unit in same string', () => {
    // Unusual but defensible — Google sometimes returns redundant
    // hash-units on either side of the road.
    expect(stripAddressUnitNumber('#08-123, 1 Marina Blvd, #08-123, Singapore'))
      .toBe('1 Marina Blvd, Singapore');
  });
});
