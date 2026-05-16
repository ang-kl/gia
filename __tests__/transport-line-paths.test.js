// __tests__/transport-line-paths.test.js — v0.60.230
//
// Unit tests for buildLinePaths (Build E 5a) — the pure helper that
// derives MRT/LRT polyline geometry from the station list. Lives in
// web/transport/ but is plain ESM with no Maps dependency, so the
// root (node-environment) Vitest can exercise it directly.

import { describe, it, expect } from 'vitest';
import { buildLinePaths } from '../web/transport/src/data/line-paths.js';

const STATIONS = [
  { name: 'Jurong East',    lat: 1.3329, lng: 103.7421, codes: ['NS1', 'EW24'], lines: ['NSL', 'EWL'], status: 'operational' },
  { name: 'Bukit Batok',    lat: 1.3490, lng: 103.7497, codes: ['NS2'],         lines: ['NSL'],        status: 'operational' },
  { name: 'Bukit Gombak',   lat: 1.3587, lng: 103.7517, codes: ['NS3'],         lines: ['NSL'],        status: 'operational' },
  { name: 'Tanah Merah',    lat: 1.3274, lng: 103.9464, codes: ['EW4', 'CG'],   lines: ['EWL', 'CGL'], status: 'operational' },
  { name: 'Expo',           lat: 1.3354, lng: 103.9617, codes: ['CG1', 'DT35'], lines: ['CGL', 'DTL'], status: 'operational' },
  { name: 'Changi Airport', lat: 1.3573, lng: 103.9882, codes: ['CG2'],         lines: ['CGL'],        status: 'operational' },
  { name: 'Sengkang',       lat: 1.3916, lng: 103.8954, codes: ['NE16', 'STC'], lines: ['NEL', 'SLRT'], status: 'operational' },
  { name: 'Cheng Lim',      lat: 1.3964, lng: 103.8936, codes: ['SW1'],         lines: ['SLRT'],       status: 'operational' },
  { name: 'Farmway',        lat: 1.3971, lng: 103.8892, codes: ['SW2'],         lines: ['SLRT'],       status: 'operational' },
  { name: 'Compassvale',    lat: 1.3944, lng: 103.9006, codes: ['SE1'],         lines: ['SLRT'],       status: 'operational' },
  { name: 'Rumbia',         lat: 1.3914, lng: 103.9059, codes: ['SE2'],         lines: ['SLRT'],       status: 'operational' },
  { name: 'JRL Stn A',      lat: 1.3850, lng: 103.7450, codes: ['JS1'],         lines: ['JRL'],        status: 'future' },
  { name: 'JRL Stn B',      lat: 1.3800, lng: 103.7400, codes: ['JS2'],         lines: ['JRL'],        status: 'future' }
];

describe('buildLinePaths — ordering', () => {
  it('orders NSL stations by their NS code suffix', () => {
    const paths = buildLinePaths(STATIONS);
    expect(paths.NSL).toHaveLength(1);
    const seg = paths.NSL[0];
    expect(seg.map((p) => p.lat)).toEqual([1.3329, 1.3490, 1.3587]);
  });

  it('places the suffix-less "CG" (Tanah Merah) at ordinal 0 of CGL', () => {
    const paths = buildLinePaths(STATIONS);
    expect(paths.CGL).toHaveLength(1);
    const seg = paths.CGL[0];
    expect(seg[0].lat).toBe(1.3274);            // Tanah Merah (CG)
    expect(seg.map((p) => p.lat)).toEqual([1.3274, 1.3354, 1.3573]);
  });
});

describe('buildLinePaths — LRT loop branches', () => {
  it('splits SLRT into two branch segments, each prepended with the STC hub', () => {
    const paths = buildLinePaths(STATIONS);
    expect(paths.SLRT).toHaveLength(2);
    for (const seg of paths.SLRT) {
      expect(seg[0]).toEqual({ lat: 1.3916, lng: 103.8954 });   // Sengkang hub
      expect(seg.length).toBe(3);                                // hub + 2 branch stops
    }
  });
});

describe('buildLinePaths — future lines & edge cases', () => {
  it('builds a segment for the future JRL', () => {
    const paths = buildLinePaths(STATIONS);
    expect(paths.JRL).toHaveLength(1);
    expect(paths.JRL[0]).toHaveLength(2);
  });

  it('drops single-station lines (segment needs >= 2 points)', () => {
    const paths = buildLinePaths([
      { name: 'Lonely', lat: 1.30, lng: 103.80, codes: ['NS9'], lines: ['NSL'] }
    ]);
    expect(paths.NSL).toBeUndefined();
  });

  it('de-dupes a repeated code ordinal', () => {
    const paths = buildLinePaths([
      { name: 'A',   lat: 1.10, lng: 103.10, codes: ['EW1'] },
      { name: 'A2',  lat: 1.11, lng: 103.11, codes: ['EW1'] },   // duplicate ordinal
      { name: 'B',   lat: 1.20, lng: 103.20, codes: ['EW2'] }
    ]);
    expect(paths.EWL[0]).toHaveLength(2);   // EW1 counted once + EW2
  });

  it('returns an empty object for empty / invalid input', () => {
    expect(buildLinePaths([])).toEqual({});
    expect(buildLinePaths(null)).toEqual({});
    expect(buildLinePaths(undefined)).toEqual({});
  });

  it('skips stations with non-finite coordinates', () => {
    const paths = buildLinePaths([
      { name: 'Bad', lat: NaN,  lng: 103.10, codes: ['NS1'] },
      { name: 'Ok1', lat: 1.20, lng: 103.20, codes: ['NS2'] },
      { name: 'Ok2', lat: 1.30, lng: 103.30, codes: ['NS3'] }
    ]);
    expect(paths.NSL[0]).toHaveLength(2);
  });
});
