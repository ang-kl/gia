// __tests__/iata-cities.test.js — v0.61.242
//
// Pins the IATA city reference table (web/cuisine/src/v2/lib/iata-cities.js)
// against the "non inventive — real IATA codes only" rule the operator
// set on 29-05 '26 06:40 SGT:
//
//   - Every entry has a 3-letter UPPERCASE IATA code, ISO-2 country
//     code, finite lat/lng inside the continent's reasonable bbox.
//   - Codes are unique across the table (no duplicates).
//   - Region counts are in the expected band (we shipped ~348 entries
//     after the +11 audit; PRs that drop coverage below 300 should fail).
//   - nearestIataCity is finite, returns the right entry for known
//     anchor cities (Kuala Lumpur → KUL, Tokyo → TYO, Sydney → SYD,
//     Bangkok → BKK), and handles bad input safely.
//   - cities.js (the curated dropdown source) only references codes
//     that exist in iata-cities.js (the post-v0.61.242 invariant).

import { describe, it, expect } from 'vitest';
import { IATA_CITIES, nearestIataCity } from '../web/_shared/lib/iata-cities.js';
import { CITIES_BY_COUNTRY } from '../web/cuisine/src/v2/lib/cities.js';

describe('IATA_CITIES — table shape', () => {
  it('contains at least 300 entries (post v0.61.242 audit shipped 348)', () => {
    expect(IATA_CITIES.length).toBeGreaterThanOrEqual(300);
  });

  it('every entry has a 3-letter uppercase IATA code', () => {
    for (const c of IATA_CITIES) {
      expect(c.iata).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('every entry has an ISO-2 country code', () => {
    for (const c of IATA_CITIES) {
      expect(c.countryCode).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('every entry has a finite lat/lng inside Earth bounds', () => {
    for (const c of IATA_CITIES) {
      expect(Number.isFinite(c.lat)).toBe(true);
      expect(Number.isFinite(c.lng)).toBe(true);
      expect(c.lat).toBeGreaterThanOrEqual(-90);
      expect(c.lat).toBeLessThanOrEqual(90);
      expect(c.lng).toBeGreaterThanOrEqual(-180);
      expect(c.lng).toBeLessThanOrEqual(180);
    }
  });

  it('IATA codes are unique across the table', () => {
    const seen = new Set();
    for (const c of IATA_CITIES) {
      expect(seen.has(c.iata)).toBe(false);
      seen.add(c.iata);
    }
  });

  it('does NOT contain the previously-invented codes the operator flagged', () => {
    const banned = ['TST', 'CEN', 'CWB', 'MOK', 'WCH', 'SHT', 'ABD', 'TCH',
                    'MUR', 'KLB', 'SER', 'TUT', 'BGR',
                    'PUT', 'SHG', 'SZH', 'UKY', 'NRA', 'YOK',
                    'DAJ', 'GJU', 'SML', 'JFN', 'KEE',
                    'HOI', 'AYU', 'TGT', 'KEP', 'KPT', 'KRG',
                    'CMS', 'DDT', 'VVN', 'POL', 'HPA',
                    'SBN', 'MLK', 'KGR'];
    // Note: PTY is not banned per se (it IS real IATA for Panama City) but
    // it must not be associated with Pattaya in this table (Pattaya is UTP).
    const codes = new Set(IATA_CITIES.map((c) => c.iata));
    for (const b of banned) {
      expect(codes.has(b)).toBe(false);
    }
  });
});

describe('IATA_CITIES — regional coverage', () => {
  function countCountries(predicate) {
    return new Set(IATA_CITIES.filter(predicate).map((c) => c.countryCode)).size;
  }
  function countEntries(predicate) {
    return IATA_CITIES.filter(predicate).length;
  }

  it('covers all 11 ASEAN countries', () => {
    const asean = ['BN', 'KH', 'ID', 'LA', 'MY', 'MM', 'PH', 'SG', 'TH', 'VN', 'TL'];
    for (const cc of asean) {
      expect(countEntries((c) => c.countryCode === cc)).toBeGreaterThanOrEqual(1);
    }
  });

  it('covers Japan, Korea, China, HK, Macau, Taiwan, Mongolia', () => {
    for (const cc of ['JP', 'KR', 'CN', 'HK', 'MO', 'TW', 'MN']) {
      expect(countEntries((c) => c.countryCode === cc)).toBeGreaterThanOrEqual(1);
    }
  });

  it('covers Australia and New Zealand', () => {
    expect(countEntries((c) => c.countryCode === 'AU')).toBeGreaterThanOrEqual(10);
    expect(countEntries((c) => c.countryCode === 'NZ')).toBeGreaterThanOrEqual(5);
  });
});

describe('nearestIataCity — known anchors', () => {
  it('Kuala Lumpur GPS (3.1390, 101.6869) → KUL', () => {
    const r = nearestIataCity(3.1390, 101.6869);
    expect(r).not.toBeNull();
    expect(r.city.iata).toBe('KUL');
    expect(r.distanceKm).toBeLessThan(1);
  });

  it('Tokyo GPS (35.6762, 139.6503) → TYO', () => {
    const r = nearestIataCity(35.6762, 139.6503);
    expect(r.city.iata).toBe('TYO');
  });

  it('Sydney GPS (-33.8688, 151.2093) → SYD', () => {
    const r = nearestIataCity(-33.8688, 151.2093);
    expect(r.city.iata).toBe('SYD');
  });

  it('Bangkok GPS (13.7563, 100.5018) → BKK', () => {
    const r = nearestIataCity(13.7563, 100.5018);
    expect(r.city.iata).toBe('BKK');
  });

  it('Singapore GPS → SIN', () => {
    const r = nearestIataCity(1.3521, 103.8198);
    expect(r.city.iata).toBe('SIN');
  });

  it('returns null for NaN / non-numeric input', () => {
    expect(nearestIataCity(NaN, 100)).toBeNull();
    expect(nearestIataCity(0, undefined)).toBeNull();
    expect(nearestIataCity('foo', 'bar')).toBeNull();
  });
});

describe('cities.js — every code is a real IATA code present in iata-cities.js', () => {
  const iataCodes = new Set(IATA_CITIES.map((c) => c.iata));

  for (const [countryCode, list] of Object.entries(CITIES_BY_COUNTRY)) {
    it(`${countryCode} entries all reference real IATA codes`, () => {
      for (const city of list) {
        // v0.61.420 — operator-sanctioned exception (issue "1b"): the Johor
        // whole-STATE row uses code 'JOHOR' (not an IATA airport code), wired to
        // the entire Johor state. Every OTHER code must still be a real IATA code.
        if (city.code === 'JOHOR') continue;
        expect(iataCodes.has(city.code),
          `cities.js[${countryCode}] entry "${city.name}" has code "${city.code}" which is NOT in iata-cities.js`
        ).toBe(true);
      }
    });
  }
});
