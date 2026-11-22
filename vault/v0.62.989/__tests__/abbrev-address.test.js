// __tests__/abbrev-address.test.js — v0.62.684
//
// The address shortener behind the carousel card's collapsed row (operator:
// "Address / area - can abbreviate the country and state to reduce text
// character usage"). Pure string work, so it IS unit-testable — unlike the
// card layout it feeds, which has no render harness (O-93).
//
// The regression that matters most here is the conservative postcode rule:
// a STREET number must never be mistaken for a postal code.

import { describe, it, expect } from 'vitest';
import { abbrevAddress, dropPostcode, abbrevState } from '../web/_shared/lib/abbrev-address.js';

describe('dropPostcode', () => {
  it('drops a trailing 4-digit postcode (AU/NZ)', () => {
    expect(dropPostcode('495/497 Wellington St, Perth WA 6000')).toBe('495/497 Wellington St, Perth WA');
  });

  it('drops a trailing 5-digit postcode (MY)', () => {
    expect(dropPostcode('12 Jalan Besar, Kuala Lumpur 50100')).toBe('12 Jalan Besar, Kuala Lumpur');
  });

  it('drops a trailing 6-digit postcode (SG)', () => {
    expect(dropPostcode('8 Marina View, Singapore 018960')).toBe('8 Marina View, Singapore');
  });

  it('drops a hyphenated JP postcode', () => {
    expect(dropPostcode('5-1 Ginza, Chuo City, Tokyo 104-0061')).toBe('5-1 Ginza, Chuo City, Tokyo');
  });

  it('NEVER eats a street number that is not trailing', () => {
    // The whole point of the conservative anchor: "495/497" leads the string.
    expect(dropPostcode('495/497 Wellington St, Perth WA')).toBe('495/497 Wellington St, Perth WA');
    expect(dropPostcode('1 HarbourFront Walk, B2-33A/B Vivocity')).toBe('1 HarbourFront Walk, B2-33A/B Vivocity');
  });

  it('leaves an address with no postcode untouched', () => {
    expect(dropPostcode('Amoy Street Food Centre')).toBe('Amoy Street Food Centre');
  });
});

describe('abbrevState', () => {
  it('abbreviates a spelled-out state occupying its own segment', () => {
    expect(abbrevState('Some Road, Western Australia')).toBe('Some Road, WA');
  });

  it('abbreviates a spelled-out state trailing inside a segment', () => {
    expect(abbrevState('Some Road, Perth Western Australia')).toBe('Some Road, Perth WA');
  });

  it('leaves an already-abbreviated state alone', () => {
    expect(abbrevState('495/497 Wellington St, Perth WA')).toBe('495/497 Wellington St, Perth WA');
  });

  it('leaves an unknown region alone rather than guessing', () => {
    expect(abbrevState('Main St, Someshire')).toBe('Main St, Someshire');
  });
});

describe('abbrevAddress', () => {
  it('applies both reductions together', () => {
    expect(abbrevAddress('Some Road, Perth Western Australia 6000')).toBe('Some Road, Perth WA');
  });

  it('matches the operator screenshot cases', () => {
    expect(abbrevAddress('495/497 Wellington St, Perth WA 6000')).toBe('495/497 Wellington St, Perth WA');
    expect(abbrevAddress('Unit 22/60 Royal St, Perth WA 6004')).toBe('Unit 22/60 Royal St, Perth WA');
  });

  it('passes empty / non-string input straight through', () => {
    expect(abbrevAddress('')).toBe('');
    expect(abbrevAddress(null)).toBe(null);
    expect(abbrevAddress(undefined)).toBe(undefined);
  });
});
