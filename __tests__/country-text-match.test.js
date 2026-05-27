// __tests__/country-text-match.test.js — v0.61.210

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { filterVenuesByCountry, hasKeywordsFor, COUNTRY_CODES } = require('../country-text-match.js');

const v = (area, name) => ({ area, name });

describe('country-text-match — shape', () => {
  it('has 16 supported country codes (matches v0.61.191 OTHER set)', () => {
    expect(COUNTRY_CODES.length).toBe(16);
    ['MY', 'TH', 'ID', 'PH', 'VN', 'JP', 'KR', 'CN', 'HK', 'TW',
     'AU', 'NZ', 'BN', 'KH', 'LA', 'MM'].forEach((c) => {
      expect(COUNTRY_CODES).toContain(c);
      expect(hasKeywordsFor(c)).toBe(true);
    });
  });
  it('unknown / invalid codes report false', () => {
    expect(hasKeywordsFor('US')).toBe(false);
    expect(hasKeywordsFor('')).toBe(false);
    expect(hasKeywordsFor(null)).toBe(false);
  });
});

describe('country-text-match — MY keep-rule (operator failure case)', () => {
  it('Padang Tengku, Pahang address keeps', () => {
    const venues = [
      v('Padang Tengku, Pahang, Malaysia', 'Restoran X'),
      v('Some Other Place', 'Restoran Y')
    ];
    const out = filterVenuesByCountry(venues, 'MY');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Restoran X');
  });
  it('Skudai address without "Johor" word keeps via "skudai" keyword', () => {
    const venues = [v('Skudai, 81300, Malaysia', 'Char Kway Teow Hut')];
    expect(filterVenuesByCountry(venues, 'MY')).toHaveLength(1);
  });
  it('Wilayah Persekutuan keeps', () => {
    const venues = [v('Bukit Bintang, Wilayah Persekutuan Kuala Lumpur', 'Place')];
    expect(filterVenuesByCountry(venues, 'MY')).toHaveLength(1);
  });
  it('cross-border Singapore venue drops when country is MY', () => {
    const venues = [
      v('Tanjong Pagar, Singapore', 'Hawker'),
      v('Kuala Lumpur, Malaysia', 'KL Hawker')
    ];
    const out = filterVenuesByCountry(venues, 'MY');
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('KL Hawker');
  });
});

describe('country-text-match — TH / ID / JP / HK', () => {
  it('TH Bangkok keeps', () => {
    const venues = [v('Pathum Wan, Bangkok 10330, Thailand', 'Som Tam Spot')];
    expect(filterVenuesByCountry(venues, 'TH')).toHaveLength(1);
  });
  it('ID Bali keeps via "bali"', () => {
    const venues = [v('Seminyak, Kuta, Badung', 'Babi Guling')];
    expect(filterVenuesByCountry(venues, 'ID')).toHaveLength(1);
  });
  it('JP Tokyo keeps', () => {
    const venues = [v('Shibuya, Tokyo, Japan', 'Ichiran Ramen')];
    expect(filterVenuesByCountry(venues, 'JP')).toHaveLength(1);
  });
  it('HK Kowloon keeps', () => {
    const venues = [v('Tsim Sha Tsui, Kowloon', 'Dim Sum Spot')];
    expect(filterVenuesByCountry(venues, 'HK')).toHaveLength(1);
  });
});

describe('country-text-match — fail-open behaviour', () => {
  it('unknown country code → returns input unchanged', () => {
    const venues = [v('Anywhere', 'X')];
    expect(filterVenuesByCountry(venues, 'US')).toEqual(venues);
  });
  it('empty country → returns input unchanged', () => {
    const venues = [v('Anywhere', 'X')];
    expect(filterVenuesByCountry(venues, '')).toEqual(venues);
  });
  it('null venues → returns []', () => {
    expect(filterVenuesByCountry(null, 'MY')).toEqual([]);
  });
});

describe('country-text-match — case-insensitive match', () => {
  it('uppercase address still keeps', () => {
    const venues = [v('JALAN IMBI, KUALA LUMPUR', 'Some Spot')];
    expect(filterVenuesByCountry(venues, 'MY')).toHaveLength(1);
  });
});
