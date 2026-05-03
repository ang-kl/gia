// __tests__/pipeline-task-gates.test.js — covers applySurpriseGates
// and applyTemporalGate (the v0.32 surprise gate spec).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { applySurpriseGates, applyTemporalGate } = require('../pipeline-task.js');

describe('applySurpriseGates', () => {
  it('keeps venues with rating in [4.0, 4.3]', () => {
    const venues = [
      { name: 'A', rating: 4.0, userRatingCount: 30 },
      { name: 'B', rating: 4.3, userRatingCount: 30 },
      { name: 'C', rating: 4.2, userRatingCount: 30 }
    ];
    expect(applySurpriseGates(venues).length).toBe(3);
  });

  it('drops venues outside [4.0, 4.3] rating window', () => {
    const venues = [
      { name: 'TooLow', rating: 3.9, userRatingCount: 30 },
      { name: 'TooHigh', rating: 4.4, userRatingCount: 30 },
      { name: 'Famous', rating: 4.8, userRatingCount: 30 }
    ];
    expect(applySurpriseGates(venues).length).toBe(0);
  });

  it('drops venues with >=50 reviews (hidden-gem signal)', () => {
    const venues = [
      { name: 'Hidden', rating: 4.2, userRatingCount: 20 },
      { name: 'Known', rating: 4.2, userRatingCount: 50 },
      { name: 'Popular', rating: 4.2, userRatingCount: 200 }
    ];
    expect(applySurpriseGates(venues).map((v) => v.name)).toEqual(['Hidden']);
  });

  it('keeps venues without verifiedOpeningDate (soft gate)', () => {
    const venues = [{ name: 'NoDate', rating: 4.2, userRatingCount: 20 }];
    expect(applySurpriseGates(venues).length).toBe(1);
  });

  it('drops venues opened >90 days ago when verifiedOpeningDate present', () => {
    const oldDate = new Date(Date.now() - 200 * 86400 * 1000).toISOString().slice(0, 10);
    const newDate = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
    const venues = [
      { name: 'Old', rating: 4.2, userRatingCount: 20, verifiedOpeningDate: oldDate },
      { name: 'New', rating: 4.2, userRatingCount: 20, verifiedOpeningDate: newDate }
    ];
    expect(applySurpriseGates(venues).map((v) => v.name)).toEqual(['New']);
  });

  it('respects the relaxed launchWindowDays override', () => {
    const date150 = new Date(Date.now() - 150 * 86400 * 1000).toISOString().slice(0, 10);
    const venues = [{ name: 'X', rating: 4.2, userRatingCount: 20, verifiedOpeningDate: date150 }];
    expect(applySurpriseGates(venues).length).toBe(0);
    expect(applySurpriseGates(venues, { launchWindowDays: 180 }).length).toBe(1);
  });
});

describe('applyTemporalGate', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  function setSgtHour(h) {
    const utcHour = (h - 8 + 24) % 24;
    const d = new Date(Date.UTC(2026, 4, 2, utcHour, 0, 0));
    vi.setSystemTime(d);
  }

  it('day mode: openNow + closesInHours >= 2 → keep', () => {
    setSgtHour(12);
    expect(applyTemporalGate([{ openNow: true, closesInHours: 3 }]).length).toBe(1);
  });

  it('day mode: openNow + closesInHours < 2 → drop', () => {
    setSgtHour(12);
    expect(applyTemporalGate([{ openNow: true, closesInHours: 1 }]).length).toBe(0);
  });

  it('night mode: openNow + closesInHours < 4 → drop (must close after 02:00)', () => {
    setSgtHour(23);
    expect(applyTemporalGate([{ openNow: true, closesInHours: 2 }]).length).toBe(0);
  });

  it('night mode: openNow + closesInHours >= 4 → keep', () => {
    setSgtHour(23);
    expect(applyTemporalGate([{ openNow: true, closesInHours: 5 }]).length).toBe(1);
  });

  it('night mode: closed but opens within 12h (breakfast pivot) → keep', () => {
    setSgtHour(2);
    expect(applyTemporalGate([{ openNow: false, opensWithinHours: 6 }]).length).toBe(1);
  });

  it('day mode: closed venue is dropped', () => {
    setSgtHour(13);
    expect(applyTemporalGate([{ openNow: false }]).length).toBe(0);
  });

  it('allows venues with no closing-time data through (no dead-end)', () => {
    setSgtHour(13);
    expect(applyTemporalGate([{ openNow: true }]).length).toBe(1);
  });
});
