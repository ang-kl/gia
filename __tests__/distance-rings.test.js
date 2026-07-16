// __tests__/distance-rings.test.js — v0.62.537 distance-ring overlay helper.
//
// Covers the PURE geometry + MRT-stop computation in the shared ring helper
// (web/_shared/lib/distance-rings.js). The DOM-drawing surface (createRingLayer /
// ringLabelNode) needs the Google Maps SDK + a document and is exercised at
// runtime in the TMAs, not here (node env, no JSDOM).

import { describe, it, expect } from 'vitest';
import { mrtTwoStopRadius, mrtReachRadius, farthestResultDist, formatDist, _internal } from '../web/_shared/lib/distance-rings.js';

const { metresBetween, destPoint, circlePath, parseCode, nearestStation } = _internal;

describe('formatDist', () => {
  it('renders sub-kilometre distances as ###m rounded to 10 m', () => {
    expect(formatDist(750)).toBe('750m');
    expect(formatDist(742)).toBe('740m');
    expect(formatDist(0)).toBe('0m');
    expect(formatDist(999)).toBe('1000m');   // <1000 → still metres
  });
  it('renders >= 1 km as #.#km', () => {
    expect(formatDist(1000)).toBe('1.0km');
    expect(formatDist(1640)).toBe('1.6km');
    expect(formatDist(2500)).toBe('2.5km');
  });
  it('is safe on non-finite input', () => {
    expect(formatDist(NaN)).toBe('');
    expect(formatDist(undefined)).toBe('');
  });
});

describe('parseCode', () => {
  it('splits a station code into line prefix + sequence number', () => {
    expect(parseCode('NS10')).toEqual({ line: 'NS', num: 10 });
    expect(parseCode('cc31')).toEqual({ line: 'CC', num: 31 });   // upcased
    expect(parseCode('DT16')).toEqual({ line: 'DT', num: 16 });
  });
  it('returns null for malformed codes', () => {
    expect(parseCode('')).toBeNull();
    expect(parseCode('CG')).toBeNull();     // no number
    expect(parseCode(null)).toBeNull();
  });
});

describe('metresBetween', () => {
  it('is ~0 for the same point', () => {
    expect(metresBetween(1.3, 103.8, 1.3, 103.8)).toBeCloseTo(0, 5);
  });
  it('matches a known SG distance (City Hall → Raffles Place ~0.7 km)', () => {
    // City Hall (1.2931,103.8520) → Raffles Place (1.2839,103.8515)
    const d = metresBetween(1.2931, 103.8520, 1.2839, 103.8515);
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1100);
  });
});

describe('destPoint + circlePath', () => {
  it('destPoint lands ~radius metres away in the given bearing', () => {
    const p = destPoint(1.3521, 103.8198, 750, 0);   // due north
    const back = metresBetween(1.3521, 103.8198, p.lat, p.lng);
    expect(back).toBeCloseTo(750, 0);
    expect(p.lat).toBeGreaterThan(1.3521);            // north → higher lat
  });
  it('circlePath returns a closed ring of the right length, all ~radius out', () => {
    const c = { lat: 1.3521, lng: 103.8198 };
    const pts = circlePath(c.lat, c.lng, 750);
    expect(pts.length).toBe(73);                      // 72 segments + closing point
    expect(pts[0].lat).toBeCloseTo(pts[pts.length - 1].lat, 6);
    expect(pts[0].lng).toBeCloseTo(pts[pts.length - 1].lng, 6);
    for (const p of pts) {
      expect(metresBetween(c.lat, c.lng, p.lat, p.lng)).toBeCloseTo(750, -1);
    }
  });
});

describe('nearestStation', () => {
  it('finds the closest operational station to a point', () => {
    // Right on top of City Hall (NS25/EW13, ~1.2931,103.8522).
    const n = nearestStation(1.2931, 103.8522);
    expect(n).toBeTruthy();
    expect(n.st.n).toBe('City Hall');
    expect(n.distM).toBeLessThan(200);
  });
});

describe('mrtTwoStopRadius', () => {
  it('returns a radius + label when the centre sits on the MRT network', () => {
    // Dhoby Ghaut (NS24/NE6/CC1) — dense interchange, 2 stops in several dirs.
    const r = mrtTwoStopRadius(1.2993, 103.8455);
    expect(r).toBeTruthy();
    expect(r.radiusM).toBeGreaterThan(750);           // bigger than the walk ring
    expect(r.radiusM).toBeLessThan(4000);             // but a sane 2-stop reach
    expect(r.label).toMatch(/^\d+(\.\d)?(m|km)$/);
  });
  it('suppresses the MRT ring when the centre is far from any station', () => {
    // Mid-South-China-Sea — nowhere near the SG network.
    expect(mrtTwoStopRadius(3.5, 106.5)).toBeNull();
  });
  it('is safe on non-finite input', () => {
    expect(mrtTwoStopRadius(NaN, 103.8)).toBeNull();
  });
});

describe('mrtReachRadius', () => {
  const C = { lat: 1.2993, lng: 103.8455 };   // Dhoby Ghaut
  const twoStop = 2200;                        // pretend the 2-stop ring is 2.2 km

  it('returns null when every result is within the 2-stop ring', () => {
    // A result ~1 km north — well inside 2.2 km.
    const near = _internal.destPoint(C.lat, C.lng, 1000, 0);
    expect(mrtReachRadius(C.lat, C.lng, [near], twoStop)).toBeNull();
  });

  it('sizes the reach ring to the farthest result and labels ~N stops', () => {
    // A result ~3.8 km north — beyond the 2-stop ring, under the ~6-stop cap.
    const far = _internal.destPoint(C.lat, C.lng, 3800, 0);
    const r = mrtReachRadius(C.lat, C.lng, [far], twoStop);
    expect(r).toBeTruthy();
    expect(r.radiusM).toBeCloseTo(3800, -2);          // ~= farthest result
    expect(r.stops).toBe(3);                           // 3800 / (2200/2) ≈ 3.45 → 3
    expect(r.label).toBe('3.8km (~3 stops)');
  });

  it('caps the reach ring at ~6 stops when a result is very far', () => {
    const veryFar = _internal.destPoint(C.lat, C.lng, 20000, 0);   // 20 km outlier
    const r = mrtReachRadius(C.lat, C.lng, [veryFar], twoStop);
    expect(r).toBeTruthy();
    expect(r.stops).toBe(6);                           // capped
    expect(r.radiusM).toBeCloseTo(2200 / 2 * 6, -1);   // perStop * 6
  });

  it('is null-safe on empty results / bad 2-stop radius', () => {
    expect(mrtReachRadius(C.lat, C.lng, [], twoStop)).toBeNull();
    const far = _internal.destPoint(C.lat, C.lng, 3800, 0);
    expect(mrtReachRadius(C.lat, C.lng, [far], 0)).toBeNull();
    expect(mrtReachRadius(C.lat, C.lng, [far], NaN)).toBeNull();
  });
});

describe('farthestResultDist', () => {
  const C = { lat: 1.3521, lng: 103.8198 };
  it('returns the max straight-line distance to any result', () => {
    const near = _internal.destPoint(C.lat, C.lng, 800, 0);
    const far = _internal.destPoint(C.lat, C.lng, 5200, 90);
    expect(farthestResultDist(C.lat, C.lng, [near, far])).toBeCloseTo(5200, -2);
  });
  it('is 0 for no valid results and NaN-safe on the centre', () => {
    expect(farthestResultDist(C.lat, C.lng, [])).toBe(0);
    expect(farthestResultDist(C.lat, C.lng, [{ lat: NaN, lng: 1 }])).toBe(0);
    expect(farthestResultDist(NaN, C.lng, [{ lat: 1.30, lng: 103.8 }])).toBe(0);
  });
});
