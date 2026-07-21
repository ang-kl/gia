// __tests__/station-card-utils.test.js — v0.62.598
//
// Pure helpers behind the Transport StationCard: terminus resolution from a
// first_last_train `direction`, defensive first/last-train timing extraction,
// worst-crowd, and the name-strip text-contrast pick.

import { describe, it, expect } from 'vitest';
import {
  slugify, textOn, hexForLineCode, worstCrowd, trainTimes, noteIsTerminal,
  directionLabel, terminusForDirection,
  directionsUrl, shareUrl, haversineM, walkMinutes, todaySummary
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
    expect(r.satFirst).toBe('5:47am');  // first_weekend fills the Saturday slot
    expect(r.sunFirst).toBe(null);       // no distinct Sun/PH value in this shape
    expect(r.weLast).toBe('12:18am');
    expect(r.noTimes).toBe(false);
  });

  it('keeps Sat and Sun/PH first-train times SEPARATE (regression: Sun/PH was dropped)', () => {
    // Real HarbourFront NEL row: Sat 5:47 == weekday, but Sun/PH 6:07 differs.
    const r = trainTimes({ first_sat: '5:47am', first_sun_ph: '6:07am', first_weekday: '5:47am', last_weekday: '11:55pm', last_weekend_ph: '11:55pm' });
    expect(r.wdFirst).toBe('5:47am');
    expect(r.wdLast).toBe('11:55pm');
    expect(r.satFirst).toBe('5:47am');
    expect(r.sunFirst).toBe('6:07am');   // preserved distinctly, not collapsed
    expect(r.weLast).toBe('11:55pm');
    expect(r.noTimes).toBe(false);
  });

  it('flags a no-service direction (all timings null) via noTimes', () => {
    const r = trainTimes({ first_sat: null, first_sun_ph: null, first_weekday: null, last_weekday: null, last_weekend_ph: null });
    expect(r.noTimes).toBe(true);
    expect(r.wdFirst).toBe(null);
    expect(r.sunFirst).toBe(null);
  });
});

describe('noteIsTerminal', () => {
  it('recognises a terminus note', () => {
    expect(noteIsTerminal('terminal station in this direction')).toBe(true);
    expect(noteIsTerminal('Terminus')).toBe(true);
  });
  it('does NOT treat data-availability notes as terminal', () => {
    expect(noteIsTerminal('timing data is currently unavailable')).toBe(false);
    expect(noteIsTerminal('station not yet open')).toBe(false);
    expect(noteIsTerminal('')).toBe(false);
    expect(noteIsTerminal(null)).toBe(false);
  });
});

describe('directionLabel', () => {
  // Injected stub translator (the real i18n.t pulls in `react`, unresolvable
  // from the repo-root test context — that's exactly why translate is injected).
  const tr = (key) => ({
    'mrt.dir.northbound': 'Northbound',
    'mrt.dir.clockwise': 'Clockwise',
    'mrt.dir.loop': 'Boucle'
  })[key] || key;

  it('localises compass / loop bounds via the injected translator', () => {
    expect(directionLabel('northbound', tr, 'en')).toBe('Northbound');
    expect(directionLabel('clockwise', tr, 'en')).toBe('Clockwise');
    expect(directionLabel('loop', tr, 'fr')).toBe('Boucle');
  });
  it('prettifies an unknown direction without the translator', () => {
    expect(directionLabel('towards_expo', tr, 'en')).toBe('Towards Expo');
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

// v0.62.621 — Google-Maps place-details helpers (action row + distance/walk +
// collapsible hours summary).
describe('directionsUrl', () => {
  it('builds a Google Maps Directions deep link to the station coords', () => {
    const u = directionsUrl(1.3, 103.8, 'Outram Park');
    expect(u).toContain('https://www.google.com/maps/dir/?api=1');
    expect(u).toContain(encodeURIComponent('1.3,103.8'));
    expect(u).toContain('travelmode=transit');
  });
  it('falls back to a name search when coords are missing', () => {
    const u = directionsUrl(NaN, undefined, 'Dhoby Ghaut');
    expect(u).toContain('maps.google.com/?q=');
    expect(u).toContain(encodeURIComponent('Dhoby Ghaut Singapore'));
  });
});

describe('shareUrl', () => {
  it('builds a Telegram share of the station map location', () => {
    const u = shareUrl(1.3, 103.8, 'Serangoon');
    expect(u).toContain('https://t.me/share/url?url=');
    expect(u).toContain(encodeURIComponent('Serangoon'));
  });
});

describe('haversineM', () => {
  it('is ~0 for identical points', () => {
    expect(haversineM({ lat: 1.3, lng: 103.8 }, { lat: 1.3, lng: 103.8 })).toBe(0);
  });
  it('approximates a known short distance (≈ 1.11 km per 0.01° of latitude)', () => {
    const d = haversineM({ lat: 1.30, lng: 103.8 }, { lat: 1.31, lng: 103.8 });
    expect(d).toBeGreaterThan(1050);
    expect(d).toBeLessThan(1170);
  });
  it('returns null for missing / invalid points', () => {
    expect(haversineM(null, { lat: 1, lng: 1 })).toBe(null);
    expect(haversineM({ lat: 1 }, { lat: 1, lng: 1 })).toBe(null);
  });
});

describe('walkMinutes', () => {
  it('rounds distance to whole minutes at ~80 m/min, floored at 1', () => {
    expect(walkMinutes(800)).toBe(10);
    expect(walkMinutes(40)).toBe(1);   // floored
    expect(walkMinutes(0)).toBe(1);
  });
  it('returns null for invalid input', () => {
    expect(walkMinutes(NaN)).toBe(null);
    expect(walkMinutes(-5)).toBe(null);
  });
});

describe('todaySummary', () => {
  it('picks the first timed direction as the collapsed hours summary', () => {
    const dirs = [
      { direction: 'towards_a', timings: {} },
      { direction: 'towards_b', timings: { first_weekday: '05:31', last_weekday: '00:12' } }
    ];
    expect(todaySummary(dirs)).toEqual({ first: '05:31', last: '00:12' });
  });
  it('returns null when no direction carries times', () => {
    expect(todaySummary([{ direction: 'towards_a', timings: {} }])).toBe(null);
    expect(todaySummary([])).toBe(null);
  });
});
