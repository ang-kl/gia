// __tests__/onemap-search.test.js — v0.62.690
//
// The parsing half of the road/address search. Fixtures are trimmed from real
// `common/elastic/search` responses captured while building the feature, so the
// quirks under test are OneMap's actual behaviour: SHOUTED values, the literal
// "NIL" for absent fields, coordinates as STRINGS, and the same building
// returned once per unit.

import { describe, it, expect } from 'vitest';
import {
  normaliseOneMapResults, addressLabel, titleCase, inSgBounds, SG_BOUNDS
} from '../onemap-search.js';

const ORCHARD = {
  // Verbatim shape from the live endpoint, including the advisory `error` that
  // accompanies a perfectly good `results` array on the keyless call.
  error: 'Authentication token missing. Please create an account and generate or renew your API Token.',
  found: 9,
  totalNumPages: 1,
  pageNum: 1,
  results: [
    {
      SEARCHVAL: 'HOLIDAY INN EXPRESS SINGAPORE ORCHARD ROAD',
      BLK_NO: '20', ROAD_NAME: 'BIDEFORD ROAD',
      BUILDING: 'HOLIDAY INN EXPRESS SINGAPORE ORCHARD ROAD',
      ADDRESS: '20 BIDEFORD ROAD HOLIDAY INN EXPRESS SINGAPORE ORCHARD ROAD SINGAPORE 229921',
      POSTAL: '229921', LATITUDE: '1.30322796530206', LONGITUDE: '103.836680361524'
    },
    {
      SEARCHVAL: 'ORCHARD ROAD', BLK_NO: '2', ROAD_NAME: 'ORCHARD TURN',
      BUILDING: 'ORCHARD ROAD', ADDRESS: '2 ORCHARD TURN ORCHARD ROAD SINGAPORE 238801',
      POSTAL: '238801', LATITUDE: '1.30364', LONGITUDE: '103.83215'
    },
  ]
};

describe('normaliseOneMapResults', () => {
  it('parses the live payload despite the advisory `error` field', () => {
    const out = normaliseOneMapResults(ORCHARD);
    expect(out).toHaveLength(2);
    expect(out[0].name).toBe('Holiday Inn Express Singapore Orchard Road');
    expect(out[0].lat).toBeCloseTo(1.30322, 4);
    expect(out[0].lng).toBeCloseTo(103.83668, 4);
  });

  it('coerces OneMap\'s string coordinates to numbers', () => {
    const out = normaliseOneMapResults(ORCHARD);
    for (const r of out) {
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lng).toBe('number');
    }
  });

  it('preserves OneMap\'s own relevance order', () => {
    const out = normaliseOneMapResults(ORCHARD);
    expect(out.map((r) => r.name)).toEqual([
      'Holiday Inn Express Singapore Orchard Road', 'Orchard Road'
    ]);
  });

  it('drops results outside the Singapore bbox', () => {
    const out = normaliseOneMapResults({ results: [
      { SEARCHVAL: 'JOHOR THING', ROAD_NAME: 'JALAN X', LATITUDE: '1.4927', LONGITUDE: '103.7414' },
      { SEARCHVAL: 'WAY OFF', ROAD_NAME: 'NIL', LATITUDE: '35.68', LONGITUDE: '139.69' },
    ] });
    expect(out.map((r) => r.name)).toEqual(['Johor Thing']);   // 1.4927 is still inside SG bounds
  });

  it('drops non-finite coordinates rather than emitting NaN', () => {
    const out = normaliseOneMapResults({ results: [
      { SEARCHVAL: 'BROKEN', LATITUDE: '', LONGITUDE: '103.8' },
      { SEARCHVAL: 'ALSO BROKEN', LATITUDE: 'abc', LONGITUDE: 'def' },
    ] });
    expect(out).toEqual([]);
  });

  it('de-duplicates the same building returned once per unit', () => {
    const unit = (n) => ({
      SEARCHVAL: 'TOA PAYOH HDB HUB', BLK_NO: String(n), ROAD_NAME: 'TOA PAYOH LOR 6',
      POSTAL: '31000' + n, LATITUDE: '1.33215', LONGITUDE: '103.84722'
    });
    const out = normaliseOneMapResults({ results: [unit(1), unit(2), unit(3)] });
    expect(out).toHaveLength(1);
  });

  // Regression for the real "Jalan Kayu" payload: six rows, one name, six
  // DIFFERENT coordinates. Coordinate-keyed dedup let all six through.
  it('collapses one repeated name even when every coordinate differs', () => {
    const house = (i) => ({
      SEARCHVAL: 'JALAN KAYU ESTATE', BLK_NO: String(40 + i), ROAD_NAME: 'JALAN TARI PAYONG',
      POSTAL: '79985' + i, LATITUDE: String(1.4005 + i / 10000), LONGITUDE: String(103.8705 + i / 10000)
    });
    const out = normaliseOneMapResults({ results: [house(0), house(1), house(2), house(3)] });
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Jalan Kayu Estate');
  });

  it('drops ERP gantries, which are toll points rather than destinations', () => {
    const out = normaliseOneMapResults({ results: [
      { SEARCHVAL: 'ORCHARD ROAD', ROAD_NAME: 'ORCHARD ROAD', LATITUDE: '1.30162', LONGITUDE: '103.83821' },
      { SEARCHVAL: 'ORCHARD ROAD - ERP(13)', ROAD_NAME: 'NIL', LATITUDE: '1.30484', LONGITUDE: '103.83222' },
      { SEARCHVAL: 'ORCHARD ROAD AFTER YMCA - ERP(47)', ROAD_NAME: 'NIL', LATITUDE: '1.29805', LONGITUDE: '103.84798' },
    ] });
    expect(out.map((r) => r.name)).toEqual(['Orchard Road']);
  });

  it('honours the limit and defaults to 6', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({
      SEARCHVAL: `PLACE ${i}`, ROAD_NAME: 'SOME ROAD',
      LATITUDE: '1.3', LONGITUDE: String(103.8 + i / 1000)
    }));
    expect(normaliseOneMapResults({ results: many })).toHaveLength(6);
    expect(normaliseOneMapResults({ results: many }, { limit: 3 })).toHaveLength(3);
  });

  it('falls back to ROAD_NAME when SEARCHVAL is absent', () => {
    const out = normaliseOneMapResults({ results: [
      { SEARCHVAL: 'NIL', ROAD_NAME: 'BUKIT TIMAH ROAD', LATITUDE: '1.325', LONGITUDE: '103.81' },
    ] });
    expect(out[0].name).toBe('Bukit Timah Road');
  });

  it('returns [] for junk input rather than throwing', () => {
    expect(normaliseOneMapResults(null)).toEqual([]);
    expect(normaliseOneMapResults({})).toEqual([]);
    expect(normaliseOneMapResults({ results: 'nope' })).toEqual([]);
  });
});

describe('addressLabel', () => {
  it('builds "blk road · S(postal)"', () => {
    expect(addressLabel({ BLK_NO: '20', ROAD_NAME: 'BIDEFORD ROAD', POSTAL: '229921' }))
      .toBe('20 Bideford Road · S(229921)');
  });

  it('omits the parts OneMap marks NIL', () => {
    expect(addressLabel({ BLK_NO: 'NIL', ROAD_NAME: 'ORCHARD ROAD', POSTAL: 'NIL' }))
      .toBe('Orchard Road');
    expect(addressLabel({ BLK_NO: 'NIL', ROAD_NAME: 'NIL', POSTAL: 'NIL' })).toBe('');
  });
});

describe('titleCase', () => {
  it('un-SHOUTS OneMap values', () => {
    expect(titleCase('BUKIT TIMAH ROAD')).toBe('Bukit Timah Road');
  });

  it('keeps initialisms upper', () => {
    expect(titleCase('DHOBY GHAUT MRT STATION')).toBe('Dhoby Ghaut MRT Station');
    expect(titleCase('NUS BUKIT TIMAH CAMPUS')).toBe('NUS Bukit Timah Campus');
  });

  it('leaves block/unit tokens starting with a digit alone', () => {
    expect(titleCase('20A BIDEFORD ROAD')).toBe('20A Bideford Road');
  });
});

describe('inSgBounds', () => {
  it('accepts inside, rejects outside and non-finite', () => {
    expect(inSgBounds(1.3521, 103.8198)).toBe(true);
    expect(inSgBounds(SG_BOUNDS.latMin, SG_BOUNDS.lngMin)).toBe(true);
    expect(inSgBounds(3.14, 101.68)).toBe(false);      // Kuala Lumpur
    expect(inSgBounds(NaN, 103.8)).toBe(false);
  });
});
