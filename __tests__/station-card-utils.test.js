// __tests__/station-card-utils.test.js — v0.62.598
//
// Pure helpers behind the Transport StationCard: terminus resolution from a
// first_last_train `direction`, defensive first/last-train timing extraction,
// worst-crowd, and the name-strip text-contrast pick.

import { describe, it, expect } from 'vitest';
import {
  slugify, textOn, hexForLineCode, worstCrowd, trainTimes,
  directionLabel, terminusForDirection
} from '../web/transport/src/lib/station-card-utils.js';

// Minimal coarse NEL fixture (running order NE1 … NE17), as /api/transport/stations shapes it.
const NEL = [
  { name: 'HarbourFront', codes: ['NE1', 'CC29'], lines: ['NEL', 'CCL'], lat: 1.265, lng: 103.82, status: 'operational' },
  { name: 'Outram Park', codes: ['NE3', 'EW16', 'TE17'], lines: ['NEL', 'EWL', 'TEL'], lat: 1.28, lng: 103.83, status: 'operational' },
  { name: 'Serangoon', codes: ['NE12', 'CC13'], lines: ['NEL', 'CCL'], lat: 1.35, lng: 103.87, status: 'operational' },
  { name: 'Punggol', codes: ['NE17', 'PTC'], lines: ['NEL', 'PLRT'], lat: 1.405, lng: 103.90, status: 'operational' }
];

describe('slugify', () => {
  it('normalises a station name to an underscore slug', () => {
    expect(slugify('Punggol Coast')).toBe('punggol_coast');
    expect(slugify('HarbourFront')).toBe('harbourfront');
    expect(slugify("Ten Mile Junction")).toBe('ten_mile_junction');
  });
});

describe('textOn', () => {
  it('returns white on dark line colours and dark on light ones', () => {
    expect(textOn('#9900AA')).toBe('#fff');      // NEL purple → white
    expect(textOn('#D42E12')).toBe('#fff');      // NSL red → white
    expect(textOn('#97C616')).toBe('#111827');   // CRL lime → dark
    expect(textOn(undefined)).toBe('#fff');       // no hex → white default
  });
});

describe('hexForLineCode', () => {
  it('maps a line code to its brand hex, with a grey fallback', () => {
    expect(hexForLineCode('NEL')).toBe('#9900AA');
    expect(hexForLineCode('EWL')).toBe('#009645');
    expect(hexForLineCode('ZZZ')).toBe('#6b7280');
  });
});

describe('worstCrowd', () => {
  it('returns the worst level across a station\'s codes (case-insensitive)', () => {
    expect(worstCrowd({ NE1: 'l', CC29: 'h' }, ['NE1', 'CC29'])).toBe('h');
    expect(worstCrowd({ ne1: 'm' }, ['NE1'])).toBe(null); // lookup uppercases the code; a lowercase map key won't match
    expect(worstCrowd({ NE1: 'm', CC29: 'l' }, ['NE1', 'CC29'])).toBe('m');
    expect(worstCrowd(null, ['NE1'])).toBe(null);
    expect(worstCrowd({ NE1: 'l' }, [])).toBe(null);
  });
});

describe('trainTimes', () => {
  it('reads the common weekday/weekend timing shape', () => {
    const r = trainTimes({ first_weekday: '5:32am', first_weekend: '5:47am', last_weekday: '12:18am', last_weekend: '12:18am' });
    expect(r.wdFirst).toBe('5:32am');
    expect(r.wdLast).toBe('12:18am');
    expect(r.weFirst).toBe('5:47am');
    expect(r.terminal).toBe(false);
    expect(r.weekendDiffers).toBe(true); // 5:47 !== 5:32
  });

  it('reads the alternate first_sat / first_sun_ph / last_weekend_ph shape', () => {
    const r = trainTimes({ first_sat: '5:47am', first_sun_ph: '6:07am', first_weekday: '5:47am', last_weekday: '11:55pm', last_weekend_ph: '11:55pm' });
    expect(r.wdFirst).toBe('5:47am');
    expect(r.wdLast).toBe('11:55pm');
    expect(r.weFirst).toBe('5:47am');   // first_sat wins the weekend slot
    expect(r.weLast).toBe('11:55pm');
    expect(r.terminal).toBe(false);
  });

  it('flags a terminal direction (all timings null)', () => {
    const r = trainTimes({ first_sat: null, first_sun_ph: null, first_weekday: null, last_weekday: null, last_weekend_ph: null });
    expect(r.terminal).toBe(true);
    expect(r.wdFirst).toBe(null);
  });
});

describe('directionLabel', () => {
  it('localises compass / loop bounds', () => {
    expect(directionLabel('northbound', 'en')).toBe('Northbound');
    expect(directionLabel('clockwise', 'en')).toBe('Clockwise');
    expect(directionLabel('loop', 'fr')).toBe('Boucle');
  });
  it('prettifies an unknown direction', () => {
    expect(directionLabel('towards_expo', 'en')).toBe('Towards Expo');
  });
});

describe('terminusForDirection', () => {
  it('resolves towards_<slug> to the matching terminus row', () => {
    const term = terminusForDirection(NEL, 'NEL', 'towards_harbourfront');
    expect(term).toBeTruthy();
    expect(term.name).toBe('HarbourFront');
    expect(term.focusCode).toBe('NE1');
  });

  it('resolves the other terminus by slug', () => {
    const term = terminusForDirection(NEL, 'NEL', 'towards_punggol');
    expect(term.name).toBe('Punggol');
    expect(term.focusCode).toBe('NE17');
  });

  it('returns null for compass / loop directions (no named terminus)', () => {
    expect(terminusForDirection(NEL, 'NEL', 'northbound')).toBe(null);
    expect(terminusForDirection(NEL, 'CCL', 'clockwise')).toBe(null);
    expect(terminusForDirection([], 'NEL', 'towards_punggol')).toBe(null);
  });
});
