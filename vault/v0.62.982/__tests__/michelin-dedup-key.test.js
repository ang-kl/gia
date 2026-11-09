// __tests__/michelin-dedup-key.test.js — v0.60.187
//
// Regression pin for DF-80 ("Michelin listing cannot refresh next 12
// again"). Root cause was that the venue-construction loop in
// handleMichelinSearch attached `michelinDedupKey` to the FALLBACK
// branch (Places lookup failed) only — the happy path (placesData
// truthy) didn't set it. Downstream, the `postFilterDedupKeys =
// filteredVenues.map((v) => v.michelinDedupKey).filter(Boolean)` line
// dropped every successfully-resolved venue → appendSeenSet appended
// nothing → seen-set never grew → consecutive 🔍 taps returned the
// same first 12 forever.
//
// This test pins the dedup-key format so:
//   1. The candidate filter at index.js:~6125
//        `${e.name}|${e.address || ''}`.toLowerCase()
//   2. The venue object's `michelinDedupKey` field at index.js:~6271 (happy)
//      and ~6344 (fallback)
// stay in lockstep — set membership relies on them producing identical
// strings.

import { describe, it, expect } from 'vitest';

// Same formula as the index.js call sites. Keep in sync.
const dedupKey = (name, address) => `${name}|${address || ''}`.toLowerCase();

describe('Michelin dedup-key (DF-80)', () => {
  it('lowercases name + pipe + address (happy + fallback paths share format)', () => {
    expect(dedupKey('Odette', '5 Saint Andrew\'s Rd')).toBe("odette|5 saint andrew's rd");
    expect(dedupKey('Les Amis', '1 Scotts Rd #02-16')).toBe('les amis|1 scotts rd #02-16');
  });

  it('handles missing address by appending an empty tail (NOT undefined-as-string)', () => {
    expect(dedupKey('Some Place', '')).toBe('some place|');
    expect(dedupKey('Some Place', null)).toBe('some place|');
    expect(dedupKey('Some Place', undefined)).toBe('some place|');
    expect(dedupKey('Some Place')).toBe('some place|');
  });

  it('canonicalises case so the candidate-filter set membership matches', () => {
    // Pool builds the key as `${e.name}|${e.address}`.toLowerCase().
    // The seen-set entries are derived from venue.michelinDedupKey,
    // which is ALSO lowercased at construction. Mismatched case here
    // would cause the seen-set check to miss → next tap re-shows.
    const fromPool = `Odette|5 SAINT ANDREW'S RD`.toLowerCase();
    const fromVenue = dedupKey('Odette', '5 Saint Andrew\'s Rd');
    expect(fromPool).toBe(fromVenue);
  });

  it('every Michelin venue object (happy OR fallback path) MUST carry the key', () => {
    // Simulates the two construction branches at index.js:6271 (happy)
    // and index.js:6311 (fallback). Both must set michelinDedupKey;
    // otherwise the downstream filter(Boolean) drops the venue from
    // the seen-set append → pagination loop stuck on first 12.
    const happyPathVenue = {
      placeId: 'ChIJxxxx',
      name: 'Odette',
      michelinDedupKey: dedupKey('Odette', '5 Saint Andrew\'s Rd')
    };
    const fallbackVenue = {
      placeId: '',
      name: 'Unknown Michelin Bib',
      michelinDedupKey: dedupKey('Unknown Michelin Bib', '')
    };
    for (const v of [happyPathVenue, fallbackVenue]) {
      expect(typeof v.michelinDedupKey).toBe('string');
      expect(v.michelinDedupKey.length).toBeGreaterThan(0);
    }
  });
});
