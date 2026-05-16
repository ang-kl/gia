// __tests__/venue-filters.test.js — v0.58.31
//
// Unit tests for the shared "this place isn't a specific eatery"
// filter. Covers the user's verbatim list (excludes), the stall-
// inside-building positives ("ought to keep" rule), edge cases on
// trailing modifiers / parens / commas, and the passesVenueFilter
// integration with the type gate.

import { describe, it, expect } from 'vitest';
import {
  isBuildingItself,
  isDirectoryBuilding,
  passesVenueFilter,
  isRainSensitiveVenue,
  NON_FOOD_TYPES,
  BUILDING_NAME_PATTERNS,
  DIRECTORY_BUILDINGS
} from '../venue-filters.js';

describe('isBuildingItself — building names (user wants these EXCLUDED)', () => {
  // User's verbatim list from chat
  const buildings = [
    'Lau Pa Sat',
    'Maxwell Food Centre',
    'Newton Food Centre',
    'Tiong Bahru Market',
    'Chinatown Complex',
    'Hong Lim Market & Food Centre',
    'SAFRA Mount Faber',
    'Golden Mile Food Centre',
    'Old Airport Road Food Centre',
    'Amoy Street Food Centre',
    'Tekka Market',
    'Geylang Serai Market',
    'Bedok Food Centre',
    'Berseh Food Centre'
  ];
  for (const name of buildings) {
    it(`flags "${name}" as the building itself`, () => {
      expect(isBuildingItself(name)).toBe(true);
    });
  }

  it('handles trailing ", Singapore" / postcode', () => {
    expect(isBuildingItself('Lau Pa Sat, Singapore')).toBe(true);
    expect(isBuildingItself('Maxwell Food Centre, Singapore 069118')).toBe(true);
    expect(isBuildingItself('Newton Food Centre Singapore')).toBe(true);
  });

  it('handles trailing parens like "(CBD)"', () => {
    expect(isBuildingItself('Maxwell Food Centre (CBD)')).toBe(true);
    expect(isBuildingItself('Lau Pa Sat (Tanjong Pagar)')).toBe(true);
  });

  it('flags shopping malls / lifestyle hubs as venues themselves', () => {
    expect(isBuildingItself('VivoCity')).toBe(true);
    expect(isBuildingItself('Plaza Singapura')).toBe(true);
    expect(isBuildingItself('ION Orchard')).toBe(true);
    expect(isBuildingItself('Jewel Changi')).toBe(true);
    expect(isBuildingItself('Takashimaya')).toBe(true);
  });

  it('catches generic "X Hawker Centre" / "X Food Centre" suffixes', () => {
    expect(isBuildingItself('XYZ Hawker Centre')).toBe(true);
    expect(isBuildingItself('Block 322 Clementi Food Centre')).toBe(true);
    expect(isBuildingItself('Pasir Panjang Food Centre')).toBe(true);
  });

  it('catches generic "X Country/Community Club"', () => {
    expect(isBuildingItself('Tanglin Country Club')).toBe(true);
    expect(isBuildingItself('Bukit Timah Community Club')).toBe(true);
  });
});

describe('isBuildingItself — eateries inside a building (user wants these KEPT)', () => {
  // The user's "ought to check if there are restaurants inside the
  // building or the building name is the restaurant or eatery" rule.
  const eateries = [
    'Tian Tian Hainanese Chicken Rice',
    'Tian Tian Hainanese Chicken Rice (Maxwell Food Centre)',
    'Boon Tat Street BBQ Seafood @ Lau Pa Sat',
    'JUMBO Seafood - Riverside Point',
    'Sushi Tei VivoCity',
    'Song Fa Bak Kut Teh',
    'Song Fa Bak Kut Teh (11 New Bridge Road)',
    'Swee Choon Jalan Besar',
    'Swee Choon Tim Sum Restaurant',
    'A Noodle Story',
    'Hill Street Tai Hwa Pork Noodle'
  ];
  for (const name of eateries) {
    it(`passes "${name}" (specific eatery, not the whole building)`, () => {
      expect(isBuildingItself(name)).toBe(false);
    });
  }
});

describe('isBuildingItself — edge cases', () => {
  it('handles falsy / empty / non-string input', () => {
    expect(isBuildingItself('')).toBe(false);
    expect(isBuildingItself(null)).toBe(false);
    expect(isBuildingItself(undefined)).toBe(false);
    expect(isBuildingItself(42)).toBe(false);
    expect(isBuildingItself('   ')).toBe(false);
  });

  it('does not falsely flag similarly-named non-food buildings', () => {
    // Maxwell Chambers is a legal arbitration centre, not the food
    // centre. Pattern requires "Food Centre" / "Hawker Centre" suffix.
    expect(isBuildingItself('Maxwell Chambers')).toBe(false);
    // Newton Circus is a roundabout / area, not the food centre.
    expect(isBuildingItself('Newton Circus Restaurant')).toBe(false);
    // "Maxwell" alone is not a building name match.
    expect(isBuildingItself('Maxwell')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(isBuildingItself('lau pa sat')).toBe(true);
    expect(isBuildingItself('MAXWELL FOOD CENTRE')).toBe(true);
    expect(isBuildingItself('vivocity')).toBe(true);
  });
});

describe('passesVenueFilter — combined gate', () => {
  it('rejects venues whose primaryType is on the deny-list', () => {
    expect(passesVenueFilter({ name: 'Some Place', primaryType: 'food_court' })).toBe(false);
    expect(passesVenueFilter({ name: 'Some Hotel Bistro', primaryType: 'lodging' })).toBe(false);
    expect(passesVenueFilter({ name: 'A Mall Restaurant', primaryType: 'shopping_mall' })).toBe(false);
  });

  it('rejects venues with a non-food type anywhere in types[]', () => {
    expect(passesVenueFilter({
      name: 'Hilton Hotel Restaurant',
      primaryType: 'restaurant',
      types: ['restaurant', 'lodging', 'food']
    })).toBe(false);
  });

  it('rejects multi-tenant building names even when type is benign', () => {
    expect(passesVenueFilter({
      name: 'Maxwell Food Centre',
      primaryType: 'restaurant',
      types: ['restaurant', 'food']
    })).toBe(false);
    expect(passesVenueFilter({
      name: 'Lau Pa Sat',
      primaryType: 'food',
      types: ['food', 'establishment']
    })).toBe(false);
  });

  it('accepts a specific eatery with normal type + name', () => {
    expect(passesVenueFilter({
      name: 'Tian Tian Hainanese Chicken Rice',
      primaryType: 'restaurant',
      types: ['restaurant', 'food']
    })).toBe(true);
    expect(passesVenueFilter({
      name: 'JUMBO Seafood - Riverside Point',
      primaryType: 'restaurant',
      types: ['restaurant', 'food']
    })).toBe(true);
  });

  it('rejects non-OPERATIONAL venues (closed, temp closed)', () => {
    expect(passesVenueFilter({
      name: 'Some Place',
      primaryType: 'restaurant',
      businessStatus: 'CLOSED_PERMANENTLY'
    })).toBe(false);
    expect(passesVenueFilter({
      name: 'Some Place',
      primaryType: 'restaurant',
      businessStatus: 'CLOSED_TEMPORARILY'
    })).toBe(false);
  });

  it('handles missing fields gracefully', () => {
    expect(passesVenueFilter(null)).toBe(false);
    expect(passesVenueFilter({})).toBe(true); // no name, no type — passes (type-gate is conservative)
    expect(passesVenueFilter({ name: 'A Cafe' })).toBe(true);
  });
});

describe('NON_FOOD_TYPES set sanity', () => {
  it('contains food_court (the v0.58.31 addition)', () => {
    expect(NON_FOOD_TYPES.has('food_court')).toBe(true);
  });
  it('contains the historical entries', () => {
    expect(NON_FOOD_TYPES.has('lodging')).toBe(true);
    expect(NON_FOOD_TYPES.has('shopping_mall')).toBe(true);
    expect(NON_FOOD_TYPES.has('point_of_interest')).toBe(true);
  });
});

describe('isRainSensitiveVenue — v0.60.118 rain-caveat gate', () => {
  it('flags open-air / hawker / market / al-fresco venues', () => {
    expect(isRainSensitiveVenue({ name: 'Tian Tian @ Maxwell Food Centre' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Some Stall', area: 'Old Airport Road Hawker Centre' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Riverside Al Fresco Bar' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Boat Quay Seafood', area: '60 Boat Quay' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Tekka Wet Market Stall' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Ah Hock Kopitiam' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Esplanade Outdoor Stage Cafe' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Generic Place', primaryType: 'food_court' })).toBe(true);
    expect(isRainSensitiveVenue({ name: 'Generic', types: ['restaurant', 'market'] })).toBe(true);
  });

  it('does NOT flag ordinary (likely indoor) restaurants', () => {
    expect(isRainSensitiveVenue({ name: 'Sushi Tei VivoCity', primaryType: 'restaurant' })).toBe(false);
    expect(isRainSensitiveVenue({ name: 'Din Tai Fung', area: '290 Orchard Road, Paragon' })).toBe(false);
    expect(isRainSensitiveVenue({ name: 'Some Bistro', area: '1 Raffles Place' })).toBe(false);
    expect(isRainSensitiveVenue({ name: '', area: '' })).toBe(false);
    expect(isRainSensitiveVenue(null)).toBe(false);
    expect(isRainSensitiveVenue({})).toBe(false);
  });
});

describe('curated directory-buildings list (v0.60.229)', () => {
  it('exposes a populated DIRECTORY_BUILDINGS set', () => {
    expect(DIRECTORY_BUILDINGS instanceof Set).toBe(true);
    expect(DIRECTORY_BUILDINGS.size).toBeGreaterThan(5);
  });

  it('rejects food-court chains the regex misses', () => {
    expect(isBuildingItself('Food Opera')).toBe(true);
    expect(isBuildingItself('Food Republic')).toBe(true);
    expect(isBuildingItself('Koufu')).toBe(true);
    expect(isBuildingItself('Kopitiam')).toBe(true);
  });

  it('rejects food halls with a trailing location qualifier', () => {
    expect(isBuildingItself('Food Opera @ ION Orchard')).toBe(true);
    expect(isBuildingItself('Food Republic - Wisma Atria')).toBe(true);
    expect(isBuildingItself('Food Junction, VivoCity')).toBe(true);
  });

  it('rejects the operator-named directory buildings', () => {
    expect(isBuildingItself('Old Airport Road Food Centre')).toBe(true);
    expect(isBuildingItself('Lau Pa Sat')).toBe(true);
    expect(isBuildingItself('Telok Ayer Market')).toBe(true);
  });

  it('is case-insensitive and tolerates ", Singapore <postcode>"', () => {
    expect(isBuildingItself('FOOD OPERA')).toBe(true);
    expect(isBuildingItself('Food Republic, Singapore 238884')).toBe(true);
  });

  it('still keeps a specific stall inside such a building', () => {
    // A stall named after itself, not starting with the food-hall name.
    expect(isBuildingItself('Ramen Champion @ Food Republic')).toBe(false);
    expect(isBuildingItself('Tian Tian Hainanese Chicken Rice')).toBe(false);
  });

  it('isDirectoryBuilding handles empty input', () => {
    expect(isDirectoryBuilding('')).toBe(false);
    expect(isDirectoryBuilding(null)).toBe(false);
  });

  it('passesVenueFilter rejects directory buildings end-to-end', () => {
    expect(passesVenueFilter({ name: 'Food Opera', primaryType: 'restaurant' })).toBe(false);
    expect(passesVenueFilter({ name: 'Food Republic - Wisma Atria', primaryType: 'restaurant' })).toBe(false);
  });
});

describe('BUILDING_NAME_PATTERNS sanity', () => {
  it('exposes a non-empty array of regexes', () => {
    expect(Array.isArray(BUILDING_NAME_PATTERNS)).toBe(true);
    expect(BUILDING_NAME_PATTERNS.length).toBeGreaterThan(10);
    for (const p of BUILDING_NAME_PATTERNS) {
      expect(p).toBeInstanceOf(RegExp);
    }
  });
});
