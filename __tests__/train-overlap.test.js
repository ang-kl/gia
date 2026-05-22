// __tests__/train-overlap.test.js — v0.61.92
//
// Unit tests for the train-overlay overlap helpers: trainTier (per-TMA
// zoom bands), metresPerPixelAt (Web-Mercator ground resolution) and
// demoteByOverlap (the "keep the station nearest the result, demote the
// rest" screen-space collision pass). All three are pure — no Maps /
// DOM dependency — so the root node-environment Vitest exercises them
// directly out of web/cuisine/src/v2/lib/mapOverlays.js.

import { describe, it, expect } from 'vitest';
import {
  trainTier, metresPerPixelAt, demoteByOverlap
} from '../web/cuisine/src/v2/lib/mapOverlays.js';

describe('trainTier — per-TMA zoom bands', () => {
  it('cuisine z15+ shows named pills', () => {
    expect(trainTier('cuisine', 16).station).toBe('pill');
  });
  it('cuisine z13 in focus keeps the v0.61.91 capRadius behaviour', () => {
    expect(trainTier('cuisine', 13, true).capRadius).toBe(300);
  });
  it('cuisine z13 out of focus is a plain code chip', () => {
    const t = trainTier('cuisine', 13, false);
    expect(t.station).toBe('chip');
    expect(t.capRadius).toBeUndefined();
  });
  it('transport z12-14 is a code chip, z15+ a pill', () => {
    expect(trainTier('transport', 13).station).toBe('chip');
    expect(trainTier('transport', 16).station).toBe('pill');
  });
  it('every chip/pill tier carries an overlapChip demote target', () => {
    for (const z of [13, 14, 16]) {
      for (const tma of ['cuisine', 'hawker', 'transport']) {
        expect(trainTier(tma, z, false).overlapChip).toBeGreaterThan(0);
      }
    }
  });
});

describe('metresPerPixelAt', () => {
  it('matches the Web-Mercator constant at zoom 0 / equator', () => {
    expect(metresPerPixelAt(0, 0)).toBeCloseTo(156543.034, 1);
  });
  it('shrinks as the map zooms in', () => {
    expect(metresPerPixelAt(15, 1.3)).toBeLessThan(metresPerPixelAt(13, 1.3));
  });
});

describe('demoteByOverlap', () => {
  const pill = (name, lat, lng, extra) => ({
    name, lat, lng, codes: [name], mode: 'pill', ...extra
  });

  it('demotes the farther of two overlapping pills, keeps the nearer', () => {
    const items = [
      pill('A', 1.3000, 103.8000),
      pill('B', 1.3000, 103.8003)            // ~33 m east — wide pills overlap at z18
    ];
    demoteByOverlap(items, 18, { lat: 1.3000, lng: 103.8000 }, 0.74);
    expect(items[0].mode).toBe('pill');                  // nearest ref — kept
    expect(items[1].mode.startsWith('chip:')).toBe(true); // overlapped — demoted
  });

  it('leaves well-separated stations alone', () => {
    const items = [
      pill('A', 1.30, 103.80),
      pill('B', 1.40, 103.90)                // kilometres apart
    ];
    demoteByOverlap(items, 18, { lat: 1.30, lng: 103.80 }, 0.74);
    expect(items[0].mode).toBe('pill');
    expect(items[1].mode).toBe('pill');
  });

  it('never demotes a pinned station, even when overlapped', () => {
    const items = [
      pill('A', 1.3000, 103.8000, { pinned: true }),
      pill('B', 1.3001, 103.8000)
    ];
    demoteByOverlap(items, 18, { lat: 1.30, lng: 103.80 }, 0.74);
    expect(items[0].mode).toBe('pill');
    expect(items[1].mode.startsWith('chip:')).toBe(true);
  });
});
