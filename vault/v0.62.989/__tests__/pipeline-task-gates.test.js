// __tests__/pipeline-task-gates.test.js — covers applySurpriseGates
// and applyTemporalGate (the v0.32 surprise gate spec).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { applySurpriseGates, applyTemporalGate } = require('../pipeline-task.js');

describe('applySurpriseGates (v0.47.1 — rating ≥4.0, opened ≤100d)', () => {
  it('keeps venues with rating ≥ 4.0 (no upper cap)', () => {
    const venues = [
      { name: 'A', rating: 4.0 },
      { name: 'B', rating: 4.5 },
      { name: 'C', rating: 4.8 },
      { name: 'D', rating: 5.0 }
    ];
    expect(applySurpriseGates(venues).length).toBe(4);
  });

  it('drops venues with rating < 4.0', () => {
    const venues = [
      { name: 'TooLow1', rating: 3.5 },
      { name: 'TooLow2', rating: 3.9 },
      { name: 'OK',     rating: 4.0 }
    ];
    expect(applySurpriseGates(venues).map((v) => v.name)).toEqual(['OK']);
  });

  it('does NOT filter by review count (v0.47.1 — popular venues now allowed)', () => {
    const venues = [
      { name: 'Hidden', rating: 4.2, userRatingCount: 20 },
      { name: 'Popular', rating: 4.2, userRatingCount: 5000 }
    ];
    expect(applySurpriseGates(venues).length).toBe(2);
  });

  it('keeps venues without verifiedOpeningDate (soft enforcement)', () => {
    const venues = [{ name: 'NoDate', rating: 4.2 }];
    expect(applySurpriseGates(venues).length).toBe(1);
  });

  it('drops venues opened >100 days ago when verifiedOpeningDate present', () => {
    const oldDate = new Date(Date.now() - 150 * 86400 * 1000).toISOString().slice(0, 10);
    const newDate = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
    const venues = [
      { name: 'Old', rating: 4.2, verifiedOpeningDate: oldDate },
      { name: 'New', rating: 4.2, verifiedOpeningDate: newDate }
    ];
    expect(applySurpriseGates(venues).map((v) => v.name)).toEqual(['New']);
  });

  it('respects launchWindowDays override (e.g. relaxed 200d)', () => {
    const date150 = new Date(Date.now() - 150 * 86400 * 1000).toISOString().slice(0, 10);
    const venues = [{ name: 'X', rating: 4.2, verifiedOpeningDate: date150 }];
    expect(applySurpriseGates(venues).length).toBe(0);
    expect(applySurpriseGates(venues, { launchWindowDays: 200 }).length).toBe(1);
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
