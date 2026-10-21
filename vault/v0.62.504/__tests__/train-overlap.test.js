// __tests__/train-overlap.test.js — v0.61.92
//
// Unit tests for the train-overlay overlap helpers: trainTier (per-TMA
// zoom bands), metresPerPixelAt (Web-Mercator ground resolution) and
// demoteByOverlap (v0.61.94 — the symmetric, iterative screen-space
// collision pass: overlapping markers are demoted to progressively
// smaller code chips until they no longer collide). All three are pure
// — no Maps / DOM dependency — so the root node-environment Vitest
// exercises them directly out of web/cuisine/src/v2/lib/mapOverlays.js.

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
  const isChip = (m) => typeof m === 'string' && m.startsWith('chip:');

  it('demotes BOTH of two overlapping pills to code chips', () => {
    // v0.61.94 — symmetric: a kept wide pill would still cover its
    // neighbour, so every overlapping pill is demoted, not just one.
    const items = [
      pill('A', 1.3000, 103.8000),
      pill('B', 1.3000, 103.8003)            // ~33 m east — wide pills overlap at z18
    ];
    demoteByOverlap(items, 18, 0.74);
    expect(isChip(items[0].mode)).toBe(true);
    expect(isChip(items[1].mode)).toBe(true);
  });

  it('leaves well-separated stations alone', () => {
    const items = [
      pill('A', 1.30, 103.80),
      pill('B', 1.40, 103.90)                // kilometres apart
    ];
    demoteByOverlap(items, 18, 0.74);
    expect(items[0].mode).toBe('pill');
    expect(items[1].mode).toBe('pill');
  });

  it('never demotes a pinned station, even when overlapped', () => {
    const items = [
      pill('A', 1.3000, 103.8000, { pinned: true }),
      pill('B', 1.3001, 103.8000)
    ];
    demoteByOverlap(items, 18, 0.74);
    expect(items[0].mode).toBe('pill');                  // pinned — untouched
    expect(isChip(items[1].mode)).toBe(true);            // overlapped — demoted
  });

  it('iteratively shrinks a tight cluster down the chip ladder', () => {
    // Three pills within ~6 m — one demotion step is not enough, so the
    // pass must loop until the code chips no longer collide.
    const items = [
      pill('A', 1.30000, 103.80000),
      pill('B', 1.30000, 103.80005),
      pill('C', 1.30005, 103.80000)
    ];
    demoteByOverlap(items, 18, 0.74);
    for (const it of items) {
      expect(isChip(it.mode)).toBe(true);
      // demoted past the first chip rung — a multi-round result.
      expect(parseFloat(it.mode.slice(5))).toBeLessThan(0.74);
    }
  });

  it('demotes a wide long-named pill that overlaps a close neighbour', () => {
    // The City Hall / CC3 case: a long station name makes a very wide
    // pill that covers a nearby station — the wide pill must demote too.
    const items = [
      pill('City Hall Interchange', 1.30000, 103.80000),
      pill('CC3', 1.30000, 103.80020)        // ~22 m east
    ];
    demoteByOverlap(items, 17, 0.74);
    expect(items[0].mode).not.toBe('pill');
    expect(items[1].mode).not.toBe('pill');
  });
});
