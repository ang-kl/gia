// __tests__/hawker-vault.test.js — v0.49.0 canonical 125-centre vault.
//
// Skips the network fetch (would hit nea.gov.sg). Asserts the parser,
// fuzzy matcher, and Maps URL builder behave as designed.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const vault = require('../hawker-vault.js');

describe('parsePdfText', () => {
  it('parses a numbered name line + Singapore postal address line', () => {
    const text = `LIST OF HAWKER CENTRES IN SINGAPORE
1. Adam Road Food Centre
2 Adam Road, Singapore 289876
2. Albert Centre Market & Food Centre
270 Queen Street, Singapore 180270
`;
    const r = vault.parsePdfText(text);
    expect(r.length).toBe(2);
    expect(r[0].name).toBe('Adam Road Food Centre');
    expect(r[0].postal).toBe('289876');
    expect(r[0].address).toContain('2 Adam Road');
    expect(r[1].name).toBe('Albert Centre Market & Food Centre');
    expect(r[1].postal).toBe('180270');
  });

  it('dedupes by postal code', () => {
    const text = `1. Same Place
123 Foo St, Singapore 012345
2. Same Place
123 Foo St, Singapore 012345
`;
    const r = vault.parsePdfText(text);
    expect(r.length).toBe(1);
    expect(r[0].postal).toBe('012345');
  });

  it('returns empty array for empty/null input', () => {
    expect(vault.parsePdfText('')).toEqual([]);
    expect(vault.parsePdfText(null)).toEqual([]);
    expect(vault.parsePdfText(undefined)).toEqual([]);
  });

  it('skips lines without postal codes (table-of-contents header)', () => {
    const text = `LIST OF HAWKER CENTRES IN SINGAPORE
As of 25 July 2025
Page 1 of 5
1. Test Centre
1 Test Rd, Singapore 555555
`;
    const r = vault.parsePdfText(text);
    expect(r.length).toBe(1);
    expect(r[0].name).toBe('Test Centre');
  });
});

describe('normaliseName', () => {
  it('strips Centre/Market/Food filler and lowercases', () => {
    expect(vault.normaliseName('Adam Road Food Centre')).toBe('adam road');
    expect(vault.normaliseName('MAXWELL FOOD CENTRE')).toBe('maxwell');
    expect(vault.normaliseName('Albert Centre Market & Food Centre')).toBe('albert and');
  });

  it('handles punctuation and spacing', () => {
    expect(vault.normaliseName('Bukit Timah Hawker Centre.')).toBe('bukit timah');
    expect(vault.normaliseName('  Tiong  Bahru  Market  ')).toBe('tiong bahru');
  });

  it('returns empty for empty/null', () => {
    expect(vault.normaliseName('')).toBe('');
    expect(vault.normaliseName(null)).toBe('');
  });
});

describe('editDistance', () => {
  it('returns 0 for identical strings', () => {
    expect(vault.editDistance('foo', 'foo')).toBe(0);
  });

  it('returns length when one string is empty', () => {
    expect(vault.editDistance('', 'abc')).toBe(3);
    expect(vault.editDistance('abc', '')).toBe(3);
  });

  it('counts single-character substitutions', () => {
    expect(vault.editDistance('foo', 'fop')).toBe(1);
    expect(vault.editDistance('cat', 'bat')).toBe(1);
  });

  it('counts insertions and deletions', () => {
    expect(vault.editDistance('abc', 'abcd')).toBe(1);
    expect(vault.editDistance('abcd', 'abc')).toBe(1);
  });
});

describe('findByName', () => {
  const centres = [
    { name: 'Adam Road Food Centre', address: '2 Adam Road', postal: '289876' },
    { name: 'Maxwell Food Centre', address: '1 Kadayanallur St', postal: '069184' },
    { name: 'Tiong Bahru Market', address: '30 Seng Poh Rd', postal: '168898' },
    { name: 'Chinatown Complex Market & Food Centre', address: '335 Smith St', postal: '050335' }
  ];

  it('returns null for empty inputs', () => {
    expect(vault.findByName([], 'foo')).toBe(null);
    expect(vault.findByName(centres, '')).toBe(null);
    expect(vault.findByName(null, 'foo')).toBe(null);
  });

  it('matches exact name (score 1)', () => {
    const r = vault.findByName(centres, 'Adam Road Food Centre');
    expect(r.centre.postal).toBe('289876');
    expect(r.score).toBe(1);
  });

  it('matches case-insensitive', () => {
    const r = vault.findByName(centres, 'maxwell food centre');
    expect(r.centre.postal).toBe('069184');
  });

  it('matches abbreviated name (substring)', () => {
    const r = vault.findByName(centres, 'Maxwell');
    expect(r.centre.postal).toBe('069184');
    expect(r.score).toBeGreaterThan(0);
  });

  it('matches with typo via edit distance', () => {
    const r = vault.findByName(centres, 'Tiong Bahru Markert'); // typo
    expect(r).not.toBe(null);
    expect(r.centre.postal).toBe('168898');
  });

  it('returns null for unrelated name', () => {
    expect(vault.findByName(centres, 'Zoological Gardens')).toBe(null);
  });

  it('matches "Chinatown" → "Chinatown Complex ..." via substring', () => {
    const r = vault.findByName(centres, 'Chinatown Complex');
    expect(r.centre.postal).toBe('050335');
  });
});

describe('mapsUrlForCentre', () => {
  it('builds api=1 query URL with name + address', () => {
    const url = vault.mapsUrlForCentre({
      name: 'Adam Road Food Centre',
      address: '2 Adam Road, Singapore 289876',
      postal: '289876'
    });
    expect(url).toMatch(/^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    expect(url).toContain('Adam%20Road%20Food%20Centre');
    expect(url).toContain('289876');
  });

  it('returns empty string for null centre', () => {
    expect(vault.mapsUrlForCentre(null)).toBe('');
  });
});

describe('annotateNames', () => {
  const centres = [
    { name: 'Maxwell Food Centre', address: '1 Kadayanallur St', postal: '069184' },
    { name: 'Tiong Bahru Market', address: '30 Seng Poh Rd', postal: '168898' }
  ];

  it('annotates each input with match info', () => {
    const r = vault.annotateNames(centres, ['Maxwell', 'Unknown', 'Tiong Bahru']);
    expect(r.length).toBe(3);
    expect(r[0].input).toBe('Maxwell');
    expect(r[0].match).not.toBe(null);
    expect(r[0].match.centre.postal).toBe('069184');
    expect(r[1].match).toBe(null);
    expect(r[2].match.centre.postal).toBe('168898');
  });

  it('returns empty array for non-array input', () => {
    expect(vault.annotateNames(centres, null)).toEqual([]);
  });
});
