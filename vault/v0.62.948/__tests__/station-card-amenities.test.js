// __tests__/station-card-amenities.test.js — v0.62.650
//
// The three pure helpers behind the operator's "Missing bus stop description and
// exit description with expanded card" (2026-07-27, Paya Lebar screenshot, where
// the exits read as bare letters "A B C D" and the bus stops as "81111" repeated
// with no name at all).
//
// Each helper exists because the underlying feed is inconsistent in a way the
// card cannot paper over inline:
//   exitLabel     — the rich station feed says `label`, data/station-exits.json
//                   says `exit`, and Paya Lebar's own record mixes prefixed
//                   ("Exit A") with bare ("E") values in the SAME array.
//   busStopDesc   — /api/transport/station-context returns description AND
//                   roadName, either of which can be empty when the Redis
//                   stop-metadata hash has no row for that code.
//   dedupeBusStops— the context feed can repeat a code, and a list reading
//                   "81111 · 81111 · 81111" is worse than no list.

import { describe, it, expect } from 'vitest';
import {
  exitLabel, busStopDesc, dedupeBusStops, splitLineName
} from '../web/transport/src/lib/station-card-utils.js';

describe('exitLabel', () => {
  it('reads either field name the two feeds use', () => {
    expect(exitLabel({ label: 'A' })).toBe('Exit A');
    expect(exitLabel({ exit: 'Exit B' })).toBe('Exit B');
    expect(exitLabel({ exit_label: 'Exit C' })).toBe('Exit C');
  });

  it('normalises Paya Lebar\'s own mixed array to one consistent list', () => {
    // Verbatim from data/station-exits.json — four prefixed, two bare.
    const raw = [{ exit: 'Exit A' }, { exit: 'Exit B' }, { exit: 'Exit C' },
      { exit: 'Exit D' }, { exit: 'E' }, { exit: 'F' }];
    expect(raw.map((e) => exitLabel(e)))
      .toEqual(['Exit A', 'Exit B', 'Exit C', 'Exit D', 'Exit E', 'Exit F']);
  });

  it('never double-prefixes', () => {
    expect(exitLabel({ label: 'Exit A' })).toBe('Exit A');
    expect(exitLabel({ label: 'exit a' })).toBe('Exit a');
  });

  it('localises the prefix', () => {
    expect(exitLabel({ exit: 'A' }, 'fr')).toBe('Sortie A');
    expect(exitLabel({ exit: 'Exit A' }, 'fr')).toBe('Sortie A');
  });

  it('returns empty for an unusable record rather than "Exit undefined"', () => {
    expect(exitLabel(null)).toBe('');
    expect(exitLabel({})).toBe('');
    expect(exitLabel({ exit: '   ' })).toBe('');
  });
});

describe('busStopDesc', () => {
  it('prefers the description', () => {
    expect(busStopDesc({ description: 'Paya Lebar Stn', roadName: 'Sims Ave' }))
      .toBe('Paya Lebar Stn, Sims Ave');
  });

  it('falls back to the road when the description is missing', () => {
    expect(busStopDesc({ description: '', roadName: 'Sims Ave' })).toBe('Sims Ave');
  });

  it('does not repeat itself when both fields say the same thing', () => {
    expect(busStopDesc({ description: 'Sims Ave', roadName: 'sims ave' })).toBe('Sims Ave');
  });

  it('returns empty (not "undefined") when the metadata row is absent', () => {
    expect(busStopDesc({ code: '81111' })).toBe('');
    expect(busStopDesc(null)).toBe('');
  });
});

describe('dedupeBusStops', () => {
  it('collapses the repeated codes the operator saw', () => {
    const out = dedupeBusStops([
      { code: '81111' }, { code: '81111' }, { code: '81111' }, { code: '81129' }
    ]);
    expect(out.map((s) => s.code)).toEqual(['81111', '81129']);
  });

  it('keeps the FIRST occurrence — the feed is distance-sorted, so that is nearest', () => {
    const out = dedupeBusStops([
      { code: '81111', distanceM: 40 }, { code: '81111', distanceM: 310 }
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].distanceM).toBe(40);
  });

  it('drops rows with no usable code instead of grouping them together', () => {
    expect(dedupeBusStops([{ code: '' }, { code: null }, {}])).toEqual([]);
  });

  it('is total', () => {
    expect(dedupeBusStops(null)).toEqual([]);
    expect(dedupeBusStops(undefined)).toEqual([]);
    expect(dedupeBusStops('nope')).toEqual([]);
  });
});

// v0.62.653 — the qualified-line split.
describe('splitLineName', () => {
  it('splits the one qualified line in the LTA feed onto two rows', () => {
    expect(splitLineName('East-West Line (Changi branch)'))
      .toEqual({ main: 'East-West Line', qualifier: 'Changi branch' });
  });

  it('prefers the canonical name, so the row matches the line CHIP the user tapped', () => {
    // data/stations.json says "Changi branch"; lines.js (and the picker) says
    // "Changi Airport Branch". The user just tapped the latter — echo it back.
    expect(splitLineName('East-West Line (Changi branch)', 'Changi Airport Branch'))
      .toEqual({ main: 'East-West Line', qualifier: 'Changi Airport Branch' });
  });

  it('leaves an unqualified line completely alone', () => {
    for (const n of ['Downtown Line', 'North East Line', 'Thomson-East Coast Line',
      'Bukit Panjang LRT', 'Circle Line']) {
      expect(splitLineName(n)).toEqual({ main: n, qualifier: '' });
    }
  });

  it('never echoes the main name back as its own qualifier', () => {
    // A canonical name identical to the base would render "X (X)".
    expect(splitLineName('Circle Line (loop)', 'Circle Line').qualifier).toBe('loop');
    expect(splitLineName('Circle Line (loop)', 'circle line').qualifier).toBe('loop');
  });

  it('is total', () => {
    expect(splitLineName('')).toEqual({ main: '', qualifier: '' });
    expect(splitLineName(null)).toEqual({ main: '', qualifier: '' });
    expect(splitLineName('Weird (')).toEqual({ main: 'Weird (', qualifier: '' });
    expect(splitLineName('Line ()')).toEqual({ main: 'Line', qualifier: '' });
  });
});
