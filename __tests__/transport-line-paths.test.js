// __tests__/transport-line-paths.test.js — v0.60.233
//
// Unit tests for buildLinePaths (Build E 5a) — the pure helper that
// derives MRT/LRT polyline geometry from the station list. Lives in
// web/transport/ but is plain ESM with no Maps dependency, so the
// root (node-environment) Vitest can exercise it directly.

import { describe, it, expect } from 'vitest';
import { buildLinePaths, resolveLinePaths } from '../web/transport/src/data/line-paths.js';

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

// v0.60.233 — LRT loop + Circle Line fixture. Drawn from explicit
// operator-verified sequences (BPL/PLRT) or with a connected CE spur.
const LRT_CCL_STATIONS = [
  // Bukit Panjang LRT — BP1..BP13.
  { name: 'Choa Chu Kang', lat: 1.3854, lng: 103.7443, codes: ['BP1'],  lines: ['BPL'], status: 'operational' },
  { name: 'South View',    lat: 1.3805, lng: 103.7453, codes: ['BP2'],  lines: ['BPL'], status: 'operational' },
  { name: 'Keat Hong',     lat: 1.3858, lng: 103.7491, codes: ['BP3'],  lines: ['BPL'], status: 'operational' },
  { name: 'Teck Whye',     lat: 1.3897, lng: 103.7503, codes: ['BP4'],  lines: ['BPL'], status: 'operational' },
  { name: 'Phoenix',       lat: 1.3858, lng: 103.7544, codes: ['BP5'],  lines: ['BPL'], status: 'operational' },
  { name: 'Bukit Panjang', lat: 1.3789, lng: 103.7616, codes: ['BP6'],  lines: ['BPL'], status: 'operational' },
  { name: 'Petir',         lat: 1.3779, lng: 103.7700, codes: ['BP7'],  lines: ['BPL'], status: 'operational' },
  { name: 'Pending',       lat: 1.3756, lng: 103.7715, codes: ['BP8'],  lines: ['BPL'], status: 'operational' },
  { name: 'Bangkit',       lat: 1.3787, lng: 103.7733, codes: ['BP9'],  lines: ['BPL'], status: 'operational' },
  { name: 'Fajar',         lat: 1.3838, lng: 103.7706, codes: ['BP10'], lines: ['BPL'], status: 'operational' },
  { name: 'Segar',         lat: 1.3877, lng: 103.7697, codes: ['BP11'], lines: ['BPL'], status: 'operational' },
  { name: 'Jelapang',      lat: 1.3866, lng: 103.7642, codes: ['BP12'], lines: ['BPL'], status: 'operational' },
  { name: 'Senja',         lat: 1.3826, lng: 103.7624, codes: ['BP13'], lines: ['BPL'], status: 'operational' },
  // Punggol LRT — hub PTC + PW1..PW7 + PE1..PE7. Teck Lee is PW7.
  { name: 'Punggol',       lat: 1.4053, lng: 103.9023, codes: ['PTC'], lines: ['PLRT'], status: 'operational' },
  { name: 'Sam Kee',       lat: 1.4078, lng: 103.9024, codes: ['PW1'], lines: ['PLRT'], status: 'operational' },
  { name: 'Punggol Point', lat: 1.4128, lng: 103.9047, codes: ['PW2'], lines: ['PLRT'], status: 'operational' },
  { name: 'Samudera',      lat: 1.4148, lng: 103.9027, codes: ['PW3'], lines: ['PLRT'], status: 'operational' },
  { name: 'Nibong',        lat: 1.4119, lng: 103.9003, codes: ['PW4'], lines: ['PLRT'], status: 'operational' },
  { name: 'Sumang',        lat: 1.4085, lng: 103.8985, codes: ['PW5'], lines: ['PLRT'], status: 'operational' },
  { name: 'Soo Teck',      lat: 1.4053, lng: 103.8966, codes: ['PW6'], lines: ['PLRT'], status: 'operational' },
  { name: 'Teck Lee',      lat: 1.4115, lng: 103.9089, codes: ['PW7'], lines: ['PLRT'], status: 'operational' },
  { name: 'Cove',          lat: 1.3993, lng: 103.9059, codes: ['PE1'], lines: ['PLRT'], status: 'operational' },
  { name: 'Meridian',      lat: 1.3970, lng: 103.9095, codes: ['PE2'], lines: ['PLRT'], status: 'operational' },
  { name: 'Coral Edge',    lat: 1.3939, lng: 103.9123, codes: ['PE3'], lines: ['PLRT'], status: 'operational' },
  { name: 'Riviera',       lat: 1.3940, lng: 103.9165, codes: ['PE4'], lines: ['PLRT'], status: 'operational' },
  { name: 'Kadaloor',      lat: 1.3994, lng: 103.9162, codes: ['PE5'], lines: ['PLRT'], status: 'operational' },
  { name: 'Oasis',         lat: 1.4023, lng: 103.9131, codes: ['PE6'], lines: ['PLRT'], status: 'operational' },
  { name: 'Damai',         lat: 1.4053, lng: 103.9085, codes: ['PE7'], lines: ['PLRT'], status: 'operational' },
  // Circle Line — a slice of the CC arc + the CE spur.
  { name: 'Esplanade',      lat: 1.2934, lng: 103.8555, codes: ['CC3'], lines: ['CCL'], status: 'operational' },
  { name: 'Promenade',      lat: 1.2935, lng: 103.8612, codes: ['CC4'], lines: ['CCL'], status: 'operational' },
  { name: 'Nicoll Highway', lat: 1.2997, lng: 103.8636, codes: ['CC5'], lines: ['CCL'], status: 'operational' },
  { name: 'Bayfront',       lat: 1.2823, lng: 103.8590, codes: ['CE1'], lines: ['CCL'], status: 'operational' },
  { name: 'Marina Bay',     lat: 1.2761, lng: 103.8546, codes: ['CE2'], lines: ['CCL'], status: 'operational' }
];
const ALL_STATIONS = [...STATIONS, ...LRT_CCL_STATIONS];

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
  it('closes each SLRT branch into a loop wrapped by the STC hub', () => {
    const paths = buildLinePaths(STATIONS);
    expect(paths.SLRT).toHaveLength(2);
    const hub = { lat: 1.3916, lng: 103.8954 };   // Sengkang
    for (const seg of paths.SLRT) {
      expect(seg).toHaveLength(4);                 // hub + 2 branch stops + hub
      expect(seg[0]).toEqual(hub);
      expect(seg[seg.length - 1]).toEqual(hub);
    }
  });
});

describe('buildLinePaths — LRT closed loops (v0.60.233)', () => {
  it('draws BPL as one segment that closes back to Bukit Panjang', () => {
    const paths = buildLinePaths(ALL_STATIONS);
    expect(paths.BPL).toHaveLength(1);
    const seg = paths.BPL[0];
    expect(seg).toHaveLength(14);                              // 13 stations + loop close
    expect(seg[0]).toEqual({ lat: 1.3854, lng: 103.7443 });    // Choa Chu Kang
    expect(seg[5]).toEqual({ lat: 1.3789, lng: 103.7616 });    // Bukit Panjang
    expect(seg[seg.length - 1]).toEqual(seg[5]);               // loop closes on Bukit Panjang
  });

  it('draws PLRT as two loops, each closing on Punggol', () => {
    const paths = buildLinePaths(ALL_STATIONS);
    expect(paths.PLRT).toHaveLength(2);
    const punggol = { lat: 1.4053, lng: 103.9023 };
    for (const seg of paths.PLRT) {
      expect(seg[0]).toEqual(punggol);
      expect(seg[seg.length - 1]).toEqual(punggol);
    }
  });

  it('orders the Punggol West loop by running order, not code number (Teck Lee mid-loop)', () => {
    const paths = buildLinePaths(ALL_STATIONS);
    const west = paths.PLRT.find((seg) => seg.some((p) => p.lat === 1.4115 && p.lng === 103.9089));
    expect(west).toBeTruthy();
    expect(west[1]).toEqual({ lat: 1.4078, lng: 103.9024 });   // Sam Kee (PW1)
    expect(west[2]).toEqual({ lat: 1.4115, lng: 103.9089 });   // Teck Lee (PW7) — between PW1 and PW2
    expect(west[3]).toEqual({ lat: 1.4128, lng: 103.9047 });   // Punggol Point (PW2)
  });
});

describe('buildLinePaths — Circle Line connection (v0.60.233)', () => {
  it('prepends Promenade to the CE spur so Bayfront connects to the loop', () => {
    const paths = buildLinePaths(ALL_STATIONS);
    const promenade = { lat: 1.2935, lng: 103.8612 };
    const ceSeg = paths.CCL.find((seg) => seg[0].lat === promenade.lat && seg[0].lng === promenade.lng);
    expect(ceSeg).toBeTruthy();
    expect(ceSeg[0]).toEqual(promenade);                       // Promenade (CC4)
    expect(ceSeg[1]).toEqual({ lat: 1.2823, lng: 103.8590 });  // Bayfront (CE1)
    expect(ceSeg[2]).toEqual({ lat: 1.2761, lng: 103.8546 });  // Marina Bay (CE2)
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

describe('resolveLinePaths — fetched-vs-derived selection (Build E 5e)', () => {
  const FETCHED = {
    _meta: { source: 'data.gov.sg' },
    NSL: [[{ lat: 1.1, lng: 103.1 }, { lat: 1.2, lng: 103.2 }]]
  };

  it('uses the fetched LTA geometry when present and well-formed', () => {
    const paths = resolveLinePaths(FETCHED, STATIONS);
    expect(paths.NSL).toEqual(FETCHED.NSL);
    expect(paths._meta).toBeUndefined();   // _meta is stripped
  });

  it('falls back to buildLinePaths when fetched is null', () => {
    expect(resolveLinePaths(null, STATIONS)).toEqual(buildLinePaths(STATIONS));
  });

  it('falls back when fetched has no usable segments', () => {
    const empty = { _meta: {}, NSL: [], EWL: [[{ lat: 1, lng: 103 }]] };  // too-short seg
    expect(resolveLinePaths(empty, STATIONS)).toEqual(buildLinePaths(STATIONS));
  });

  it('drops malformed segments but keeps valid lines', () => {
    const mixed = {
      NSL: [[{ lat: 1.1, lng: 103.1 }, { lat: 1.2, lng: 103.2 }]],
      EWL: [[{ lat: NaN, lng: 103.1 }, { lat: 1.2, lng: 103.2 }]]   // non-finite point
    };
    const paths = resolveLinePaths(mixed, STATIONS);
    expect(paths.NSL).toHaveLength(1);
    expect(paths.EWL).toBeUndefined();
  });
});
