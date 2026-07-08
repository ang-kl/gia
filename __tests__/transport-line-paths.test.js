// __tests__/transport-line-paths.test.js — v0.61.1
//
// Unit tests for buildLinePaths (Build E 5a) — the pure helper that
// derives MRT/LRT polyline geometry from the station list. Lives in
// web/transport/ but is plain ESM with no Maps dependency, so the
// root (node-environment) Vitest can exercise it directly.

import { describe, it, expect } from 'vitest';
import { buildLinePaths, resolveLinePaths, smoothSegment, smoothLinePaths, catmullRomSegment } from '../web/transport/src/data/line-paths.js';

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

// v0.61.1 — LRT loop + Circle Line fixture. Drawn from explicit
// station-name sequences (BPL/PLRT/CCL); the Circle Line is one full
// closed ring through the CCL6 stations.
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
  // Punggol LRT — hub PTC + PW1..PW7 + PE1..PE7. Teck Lee is PW2.
  { name: 'Punggol',       lat: 1.4053, lng: 103.9023, codes: ['PTC'], lines: ['PLRT'], status: 'operational' },
  { name: 'Sam Kee',       lat: 1.4098, lng: 103.9049, codes: ['PW1'], lines: ['PLRT'], status: 'operational' },
  { name: 'Teck Lee',      lat: 1.4128, lng: 103.9066, codes: ['PW2'], lines: ['PLRT'], status: 'operational' },
  { name: 'Punggol Point', lat: 1.4169, lng: 103.9065, codes: ['PW3'], lines: ['PLRT'], status: 'operational' },
  { name: 'Samudera',      lat: 1.4159, lng: 103.9021, codes: ['PW4'], lines: ['PLRT'], status: 'operational' },
  { name: 'Nibong',        lat: 1.4118, lng: 103.9003, codes: ['PW5'], lines: ['PLRT'], status: 'operational' },
  { name: 'Sumang',        lat: 1.4084, lng: 103.8985, codes: ['PW6'], lines: ['PLRT'], status: 'operational' },
  { name: 'Soo Teck',      lat: 1.4051, lng: 103.8972, codes: ['PW7'], lines: ['PLRT'], status: 'operational' },
  { name: 'Cove',          lat: 1.3994, lng: 103.9059, codes: ['PE1'], lines: ['PLRT'], status: 'operational' },
  { name: 'Meridian',      lat: 1.3968, lng: 103.9090, codes: ['PE2'], lines: ['PLRT'], status: 'operational' },
  { name: 'Coral Edge',    lat: 1.3940, lng: 103.9125, codes: ['PE3'], lines: ['PLRT'], status: 'operational' },
  { name: 'Riviera',       lat: 1.3946, lng: 103.9162, codes: ['PE4'], lines: ['PLRT'], status: 'operational' },
  { name: 'Kadaloor',      lat: 1.3996, lng: 103.9165, codes: ['PE5'], lines: ['PLRT'], status: 'operational' },
  { name: 'Oasis',         lat: 1.4024, lng: 103.9126, codes: ['PE6'], lines: ['PLRT'], status: 'operational' },
  { name: 'Damai',         lat: 1.4054, lng: 103.9085, codes: ['PE7'], lines: ['PLRT'], status: 'operational' },
  // Circle Line — the full CC arc + CCL6 stations + CE stations.
  { name: 'Dhoby Ghaut',       lat: 1.2989, lng: 103.8456, codes: ['CC1'],  lines: ['CCL'], status: 'operational' },
  { name: 'Bras Basah',        lat: 1.2970, lng: 103.8503, codes: ['CC2'],  lines: ['CCL'], status: 'operational' },
  { name: 'Esplanade',         lat: 1.2934, lng: 103.8555, codes: ['CC3'],  lines: ['CCL'], status: 'operational' },
  { name: 'Promenade',         lat: 1.2935, lng: 103.8612, codes: ['CC4'],  lines: ['CCL'], status: 'operational' },
  { name: 'Nicoll Highway',    lat: 1.2997, lng: 103.8636, codes: ['CC5'],  lines: ['CCL'], status: 'operational' },
  { name: 'Stadium',           lat: 1.3028, lng: 103.8753, codes: ['CC6'],  lines: ['CCL'], status: 'operational' },
  { name: 'Mountbatten',       lat: 1.3061, lng: 103.8826, codes: ['CC7'],  lines: ['CCL'], status: 'operational' },
  { name: 'Dakota',            lat: 1.3083, lng: 103.8884, codes: ['CC8'],  lines: ['CCL'], status: 'operational' },
  { name: 'Paya Lebar',        lat: 1.3180, lng: 103.8928, codes: ['CC9'],  lines: ['CCL'], status: 'operational' },
  { name: 'MacPherson',        lat: 1.3266, lng: 103.8898, codes: ['CC10'], lines: ['CCL'], status: 'operational' },
  { name: 'Tai Seng',          lat: 1.3358, lng: 103.8881, codes: ['CC11'], lines: ['CCL'], status: 'operational' },
  { name: 'Bartley',           lat: 1.3427, lng: 103.8797, codes: ['CC12'], lines: ['CCL'], status: 'operational' },
  { name: 'Serangoon',         lat: 1.3499, lng: 103.8732, codes: ['CC13'], lines: ['CCL'], status: 'operational' },
  { name: 'Lorong Chuan',      lat: 1.3517, lng: 103.8642, codes: ['CC14'], lines: ['CCL'], status: 'operational' },
  { name: 'Bishan',            lat: 1.3509, lng: 103.8485, codes: ['CC15'], lines: ['CCL'], status: 'operational' },
  { name: 'Marymount',         lat: 1.3492, lng: 103.8395, codes: ['CC16'], lines: ['CCL'], status: 'operational' },
  { name: 'Caldecott',         lat: 1.3375, lng: 103.8395, codes: ['CC17'], lines: ['CCL'], status: 'operational' },
  { name: 'Botanic Gardens',   lat: 1.3225, lng: 103.8155, codes: ['CC19'], lines: ['CCL'], status: 'operational' },
  { name: 'Farrer Road',       lat: 1.3173, lng: 103.8071, codes: ['CC20'], lines: ['CCL'], status: 'operational' },
  { name: 'Holland Village',   lat: 1.3120, lng: 103.7960, codes: ['CC21'], lines: ['CCL'], status: 'operational' },
  { name: 'Buona Vista',       lat: 1.3071, lng: 103.7902, codes: ['CC22'], lines: ['CCL'], status: 'operational' },
  { name: 'one-north',         lat: 1.2992, lng: 103.7873, codes: ['CC23'], lines: ['CCL'], status: 'operational' },
  { name: 'Kent Ridge',        lat: 1.2935, lng: 103.7843, codes: ['CC24'], lines: ['CCL'], status: 'operational' },
  { name: 'Haw Par Villa',     lat: 1.2832, lng: 103.7822, codes: ['CC25'], lines: ['CCL'], status: 'operational' },
  { name: 'Pasir Panjang',     lat: 1.2761, lng: 103.7916, codes: ['CC26'], lines: ['CCL'], status: 'operational' },
  { name: 'Labrador Park',     lat: 1.2722, lng: 103.8027, codes: ['CC27'], lines: ['CCL'], status: 'operational' },
  { name: 'Telok Blangah',     lat: 1.2706, lng: 103.8094, codes: ['CC28'], lines: ['CCL'], status: 'operational' },
  { name: 'HarbourFront',      lat: 1.2655, lng: 103.8221, codes: ['CC29'], lines: ['CCL'], status: 'operational' },
  { name: 'Keppel',            lat: 1.2700, lng: 103.83111, codes: ['CC30'], lines: ['CCL'], status: 'future' },
  { name: 'Cantonment',        lat: 1.27278, lng: 103.83667, codes: ['CC31'], lines: ['CCL'], status: 'future' },
  { name: 'Prince Edward Road',lat: 1.27333, lng: 103.84722, codes: ['CC32'], lines: ['CCL'], status: 'future' },
  { name: 'Bayfront',          lat: 1.2823, lng: 103.8590, codes: ['CE1'],  lines: ['CCL'], status: 'operational' },
  { name: 'Marina Bay',        lat: 1.2761, lng: 103.8546, codes: ['CE2'],  lines: ['CCL'], status: 'operational' }
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

  it('orders the Punggol West loop by running order (Teck Lee between Sam Kee and Punggol Point)', () => {
    const paths = buildLinePaths(ALL_STATIONS);
    const west = paths.PLRT.find((seg) => seg.some((p) => p.lat === 1.4128 && p.lng === 103.9066));
    expect(west).toBeTruthy();
    expect(west[1]).toEqual({ lat: 1.4098, lng: 103.9049 });   // Sam Kee (PW1)
    expect(west[2]).toEqual({ lat: 1.4128, lng: 103.9066 });   // Teck Lee (PW2)
    expect(west[3]).toEqual({ lat: 1.4169, lng: 103.9065 });   // Punggol Point (PW3)
  });
});

describe('buildLinePaths — Circle Line closed loop (v0.61.1)', () => {
  it('draws CCL as one closed ring through the CCL6 stations, no detached CE spur', () => {
    const paths = buildLinePaths(ALL_STATIONS);
    expect(paths.CCL).toHaveLength(1);                         // one ring only
    const ring = paths.CCL[0];
    expect(ring[0]).toEqual({ lat: 1.2989, lng: 103.8456 });   // starts at Dhoby Ghaut
    expect(ring[ring.length - 1]).toEqual({ lat: 1.2935, lng: 103.8612 }); // closes at Promenade
    expect(ring).toContainEqual({ lat: 1.2700, lng: 103.83111 }); // Keppel (CCL6)
    expect(ring).toContainEqual({ lat: 1.27278, lng: 103.83667 }); // Cantonment (CCL6)
    expect(ring).toContainEqual({ lat: 1.27333, lng: 103.84722 }); // Prince Edward Road (CCL6)
    expect(ring).toContainEqual({ lat: 1.2823, lng: 103.8590 }); // Bayfront — folded into the ring
    expect(ring).toContainEqual({ lat: 1.2761, lng: 103.8546 }); // Marina Bay — folded into the ring
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

  it('falls back to the smoothed derived geometry when fetched is null', () => {
    expect(resolveLinePaths(null, STATIONS)).toEqual(smoothLinePaths(buildLinePaths(STATIONS)));
  });

  it('falls back when fetched has no usable segments', () => {
    const empty = { _meta: {}, NSL: [], EWL: [[{ lat: 1, lng: 103 }]] };  // too-short seg
    expect(resolveLinePaths(empty, STATIONS)).toEqual(smoothLinePaths(buildLinePaths(STATIONS)));
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

describe('smoothSegment — Chaikin corner-cutting (v0.66.0)', () => {
  it('keeps the endpoints of an open segment and adds intermediate points', () => {
    const seg = [
      { lat: 1.30, lng: 103.80 },
      { lat: 1.35, lng: 103.85 },
      { lat: 1.30, lng: 103.90 }
    ];
    const out = smoothSegment(seg, 2);
    expect(out[0]).toEqual(seg[0]);                       // first endpoint preserved
    expect(out[out.length - 1]).toEqual(seg[2]);          // last endpoint preserved
    expect(out.length).toBeGreaterThan(seg.length);       // corners cut → more points
  });

  it('keeps a closed loop closed (first point === last point)', () => {
    const ring = [
      { lat: 1.30, lng: 103.80 },
      { lat: 1.35, lng: 103.85 },
      { lat: 1.32, lng: 103.90 },
      { lat: 1.30, lng: 103.80 }   // same as first → closed loop
    ];
    const out = smoothSegment(ring, 2);
    expect(out[0]).toEqual(out[out.length - 1]);          // still closed
    expect(out.length).toBeGreaterThan(ring.length);
  });

  it('returns segments shorter than 3 points unchanged', () => {
    const seg = [{ lat: 1.30, lng: 103.80 }, { lat: 1.31, lng: 103.81 }];
    expect(smoothSegment(seg, 2)).toBe(seg);
  });
});

describe('smoothLinePaths — whole-map smoothing (v0.66.0 + v0.61.194 + v0.61.220)', () => {
  it('smooths every segment and preserves _meta keys', () => {
    const raw = buildLinePaths(ALL_STATIONS);
    const smoothed = smoothLinePaths({ _meta: { x: 1 }, ...raw });
    expect(smoothed._meta).toEqual({ x: 1 });
    // v0.61.194 — LRT lines (BPL/SLRT/PLRT) use Catmull-Rom (12 sub-
    // segments per control point) so the output is MUCH denser than
    // the raw segment.
    expect(smoothed.BPL[0].length).toBeGreaterThan(raw.BPL[0].length * 5);
    // v0.61.220 — CCL (and the other MRT lines) now also use
    // Catmull-Rom, same density.
    expect(smoothed.CCL[0].length).toBeGreaterThan(raw.CCL[0].length * 5);
    // every point stays a finite {lat,lng}.
    for (const seg of smoothed.CCL) {
      for (const p of seg) {
        expect(Number.isFinite(p.lat) && Number.isFinite(p.lng)).toBe(true);
      }
    }
  });

  it('every line (LRT + MRT) uses Catmull-Rom — output passes through every station (v0.61.194 + v0.61.220)', () => {
    const raw = buildLinePaths(ALL_STATIONS);
    const smoothed = smoothLinePaths(raw);
    // For each line, every original station coord must appear
    // (within 1e-5° rounding) in the smoothed output. Catmull-Rom
    // guarantees B(0) = P1, so every control point is preserved.
    // v0.61.220 — added the 6 MRT line codes (was LRT-only).
    const ALL_LINES = [
      'BPL', 'PLRT',
      'NSL', 'EWL', 'NEL', 'CCL', 'DTL', 'TEL', 'CGL'
    ];
    for (const code of ALL_LINES) {
      if (!raw[code]) continue;
      for (let si = 0; si < raw[code].length; si++) {
        const rawSeg = raw[code][si];
        const smoothSeg = smoothed[code][si];
        for (const p of rawSeg) {
          const hit = smoothSeg.some((q) =>
            Math.abs(q.lat - p.lat) < 1e-5 && Math.abs(q.lng - p.lng) < 1e-5
          );
          expect(hit).toBe(true);
        }
      }
    }
  });
});

describe('catmullRomSegment (v0.61.194)', () => {
  it('passes through every input control point', () => {
    const ctrl = [
      { lat: 1.30, lng: 103.80 },
      { lat: 1.31, lng: 103.81 },
      { lat: 1.32, lng: 103.79 },
      { lat: 1.33, lng: 103.78 }
    ];
    const out = catmullRomSegment(ctrl, 12);
    for (const p of ctrl) {
      const hit = out.some((q) =>
        Math.abs(q.lat - p.lat) < 1e-5 && Math.abs(q.lng - p.lng) < 1e-5
      );
      expect(hit).toBe(true);
    }
  });

  it('preserves closed-loop topology (first === last)', () => {
    const ring = [
      { lat: 1.30, lng: 103.80 },
      { lat: 1.31, lng: 103.81 },
      { lat: 1.32, lng: 103.79 },
      { lat: 1.30, lng: 103.80 }
    ];
    const out = catmullRomSegment(ring, 8);
    expect(out[0]).toEqual(out[out.length - 1]);
  });

  it('returns input unchanged for < 2 points', () => {
    const seg = [{ lat: 1.30, lng: 103.80 }];
    expect(catmullRomSegment(seg)).toBe(seg);
  });
});
