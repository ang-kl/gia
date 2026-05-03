// __tests__/pipeline-task-gates.test.js — covers applySurpriseGates
// and applyTemporalGate (the v0.32 surprise gate spec).

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { applySurpriseGates, applyTemporalGate } = require('../pipeline-task.js');

describe('applySurpriseGates (v0.47.0 relaxed gates)', () => {
  it('keeps venues with rating in [3.8, 4.6]', () => {
    const venues = [
      { name: 'A', rating: 3.8, userRatingCount: 30 },
      { name: 'B', rating: 4.0, userRatingCount: 30 },
      { name: 'C', rating: 4.3, userRatingCount: 30 },
      { name: 'D', rating: 4.5, userRatingCount: 30 },
      { name: 'E', rating: 4.6, userRatingCount: 30 }
    ];
    expect(applySurpriseGates(venues).length).toBe(5);
  });

  it('drops venues outside [3.8, 4.6] rating window', () => {
    const venues = [
      { name: 'TooLow', rating: 3.7, userRatingCount: 30 },
      { name: 'TooHigh', rating: 4.7, userRatingCount: 30 },
      { name: 'Perfect', rating: 5.0, userRatingCount: 30 }
    ];
    expect(applySurpriseGates(venues).length).toBe(0);
  });

  it('drops venues with >=50 reviews (hidden-gem signal preserved)', () => {
    const venues = [
      { name: 'Hidden', rating: 4.2, userRatingCount: 20 },
      { name: 'Boundary', rating: 4.2, userRatingCount: 50 },
      { name: 'Popular', rating: 4.2, userRatingCount: 200 }
    ];
    expect(applySurpriseGates(venues).map((v) => v.name)).toEqual(['Hidden']);
  });

  it('keeps venues without verifiedOpeningDate (soft gate, v0.32.0 behaviour preserved)', () => {
    const venues = [{ name: 'NoDate', rating: 4.2, userRatingCount: 20 }];
    expect(applySurpriseGates(venues).length).toBe(1);
  });

  it('v0.47.0: KEEPS venues opened >90 days ago when verifiedOpeningDate present', () => {
    // The launch-window HARD gate was removed in v0.47.0. Old venues now
    // pass through (assuming rating + review-count gates are met).
    // Reason: Places API doesn't expose opening dates; LLM-asserted
    // verifiedOpeningDate was unreliable. Was eliminating ~95% of
    // candidates with no real signal.
    const oldDate = new Date(Date.now() - 200 * 86400 * 1000).toISOString().slice(0, 10);
    const newDate = new Date(Date.now() - 30 * 86400 * 1000).toISOString().slice(0, 10);
    const venues = [
      { name: 'Old', rating: 4.2, userRatingCount: 20, verifiedOpeningDate: oldDate },
      { name: 'New', rating: 4.2, userRatingCount: 20, verifiedOpeningDate: newDate }
    ];
    expect(applySurpriseGates(venues).map((v) => v.name)).toEqual(['Old', 'New']);
  });

  it('v0.47.0: launchWindowDays opts override is now a no-op (no hard gate)', () => {
    const date300 = new Date(Date.now() - 300 * 86400 * 1000).toISOString().slice(0, 10);
    const venues = [{ name: 'Ancient', rating: 4.2, userRatingCount: 20, verifiedOpeningDate: date300 }];
    // Both calls should keep the venue — gate is gone.
    expect(applySurpriseGates(venues).length).toBe(1);
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
