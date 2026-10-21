// __tests__/parse-address-components.test.js — v0.61.139
//
// Unit tests for vibe-suggest.parseAddressComponents, the Google
// Places New-API addressComponents parser used by the Menu TMA
// anchor pill (v0.61.139 O-22-followup PR).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { parseAddressComponents } = require('../places-address-parser');

describe('parseAddressComponents', () => {
  it('returns null when input is not an array', () => {
    expect(parseAddressComponents(null)).toBeNull();
    expect(parseAddressComponents(undefined)).toBeNull();
    expect(parseAddressComponents({})).toBeNull();
    expect(parseAddressComponents('200 Victoria Street')).toBeNull();
  });

  it('returns all-null for an empty array', () => {
    expect(parseAddressComponents([])).toEqual({ street: null, building: null, postal: null });
  });

  it('parses a typical SG building address', () => {
    // Bugis Junction (200 Victoria Street, Singapore 188021)
    const input = [
      { longText: '200', shortText: '200', types: ['street_number'], languageCode: 'en' },
      { longText: 'Victoria Street', shortText: 'Victoria St', types: ['route'], languageCode: 'en' },
      { longText: 'Bugis Junction', shortText: 'Bugis Junction', types: ['premise'], languageCode: 'en-Latn' },
      { longText: 'Singapore', shortText: 'SG', types: ['country', 'political'], languageCode: 'en' },
      { longText: '188021', shortText: '188021', types: ['postal_code'], languageCode: 'en-Latn' }
    ];
    expect(parseAddressComponents(input)).toEqual({
      street: '200 Victoria Street',
      building: 'Bugis Junction',
      postal: '188021'
    });
  });

  it('handles route without street_number', () => {
    const input = [
      { longText: 'Orchard Road', types: ['route'] },
      { longText: '238880', types: ['postal_code'] }
    ];
    expect(parseAddressComponents(input)).toEqual({
      street: 'Orchard Road',
      building: null,
      postal: '238880'
    });
  });

  it('falls back from premise → subpremise → establishment for building', () => {
    // Only subpremise tagged (e.g. unit number inside a non-named building)
    const sub = [
      { longText: 'X', types: ['street_number'] },
      { longText: 'Y Road', types: ['route'] },
      { longText: '#02-15', types: ['subpremise'] }
    ];
    expect(parseAddressComponents(sub).building).toBe('#02-15');

    // Only establishment tagged (e.g. a venue name)
    const est = [
      { longText: 'Y Road', types: ['route'] },
      { longText: 'Some Shop', types: ['establishment'] }
    ];
    expect(parseAddressComponents(est).building).toBe('Some Shop');

    // premise wins when both premise + establishment present
    const both = [
      { longText: 'Y Road', types: ['route'] },
      { longText: 'Tower A', types: ['premise'] },
      { longText: 'Some Shop', types: ['establishment'] }
    ];
    expect(parseAddressComponents(both).building).toBe('Tower A');
  });

  it('prefers longText over shortText, falls back to shortText', () => {
    const input = [
      { longText: '', shortText: 'Short', types: ['route'] }
    ];
    expect(parseAddressComponents(input).street).toBe('Short');

    const inputBoth = [
      { longText: 'Long Form', shortText: 'Short', types: ['route'] }
    ];
    expect(parseAddressComponents(inputBoth).street).toBe('Long Form');
  });

  it('skips components with missing types or empty text', () => {
    const input = [
      { types: ['route'] },                    // no text
      { longText: 'Skip me', types: null },    // null types
      { longText: '188021', types: ['postal_code'] }
    ];
    expect(parseAddressComponents(input)).toEqual({
      street: null,
      building: null,
      postal: '188021'
    });
  });

  it('keeps the first match when duplicate types appear', () => {
    // Google sometimes returns multiple `route` components for compound
    // address situations — we lock onto the first.
    const input = [
      { longText: 'First Road', types: ['route'] },
      { longText: 'Second Road', types: ['route'] }
    ];
    expect(parseAddressComponents(input).street).toBe('First Road');
  });

  it('handles a road junction (no postal_code, no premise)', () => {
    const input = [
      { longText: 'Tanjong Pagar Road', types: ['route'] }
    ];
    expect(parseAddressComponents(input)).toEqual({
      street: 'Tanjong Pagar Road',
      building: null,
      postal: null
    });
  });

  it('handles a residential SG address (street_number + route + postal, no premise)', () => {
    const input = [
      { longText: '15', types: ['street_number'] },
      { longText: 'Spottiswoode Park Road', types: ['route'] },
      { longText: '088638', types: ['postal_code'] }
    ];
    expect(parseAddressComponents(input)).toEqual({
      street: '15 Spottiswoode Park Road',
      building: null,
      postal: '088638'
    });
  });
});
