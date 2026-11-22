// __tests__/rarity-score.test.js — v0.57.17

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const rs = require('../rarity-score.js');

describe('percentileRank', () => {
  it('returns 0 for empty pool', () => {
    expect(rs.percentileRank([], 4.5)).toBe(0);
  });

  it('returns 1 for single-element pool', () => {
    expect(rs.percentileRank([4.0], 4.0)).toBe(1);
  });

  it('ranks the median correctly', () => {
    // pool [1, 2, 3, 4, 5]; value 3 has 3 members ≤ it → 0.6
    expect(rs.percentileRank([1, 2, 3, 4, 5], 3)).toBeCloseTo(0.6);
  });

  it('returns 0 for non-finite value', () => {
    expect(rs.percentileRank([1, 2, 3], NaN)).toBe(0);
  });
});

describe('computeRecency', () => {
  it('uses explicit recencyScore when set', () => {
    expect(rs.computeRecency({ recencyScore: 0.7 })).toBe(0.7);
  });

  it('returns 1.0 for ≤30 days ago', () => {
    expect(rs.computeRecency({ lastReviewDaysAgo: 5 })).toBe(1);
    expect(rs.computeRecency({ lastReviewDaysAgo: 30 })).toBe(1);
  });

  it('returns 0.5 for 30–90 days ago', () => {
    expect(rs.computeRecency({ lastReviewDaysAgo: 60 })).toBe(0.5);
  });

  it('returns 0 for >90 days ago', () => {
    expect(rs.computeRecency({ lastReviewDaysAgo: 200 })).toBe(0);
  });

  it('honours hasRecentReviews flag', () => {
    expect(rs.computeRecency({ hasRecentReviews: true })).toBe(1);
    expect(rs.computeRecency({ hasRecentReviews: false })).toBe(0);
  });

  it('falls back to DEFAULT_RECENCY when no signal', () => {
    expect(rs.computeRecency({})).toBe(rs.DEFAULT_RECENCY);
  });
});

describe('applyRarityRanking', () => {
  it('returns [] for empty input', () => {
    expect(rs.applyRarityRanking([])).toEqual([]);
    expect(rs.applyRarityRanking(null)).toEqual([]);
  });

  it('ranks hidden gem above popular when rating is matched', () => {
    const pool = [
      { name: 'A — popular',     rating: 4.5, userRatingCount: 800, hasRecentReviews: true },
      { name: 'B — hidden gem',  rating: 4.5, userRatingCount: 30,  hasRecentReviews: true },
      { name: 'D — middling',    rating: 4.0, userRatingCount: 200, hasRecentReviews: true }
    ];
    const ranked = rs.applyRarityRanking(pool, 3);
    const ranks = ranked.map((r) => r.name);
    // hidden gem (low volume, equal rating) must beat popular
    expect(ranks.indexOf('B — hidden gem')).toBeLessThan(ranks.indexOf('A — popular'));
  });

  it('penalises abandoned (no recent reviews) versus alive equivalents', () => {
    const pool = [
      { name: 'B — alive',     rating: 4.5, userRatingCount: 30, hasRecentReviews: true },
      { name: 'C — abandoned', rating: 4.5, userRatingCount: 30, hasRecentReviews: false }
    ];
    const ranked = rs.applyRarityRanking(pool, 2);
    expect(ranked[0].name).toBe('B — alive');
  });

  it('returns at most `target` results', () => {
    const pool = Array.from({ length: 20 }, (_, i) => ({
      rating: 4.0 + (i % 5) * 0.1,
      userRatingCount: 10 + i * 20
    }));
    expect(rs.applyRarityRanking(pool, 5).length).toBe(5);
  });

  it('attaches rarityScore to each ranked candidate', () => {
    const pool = [
      { rating: 4.3, userRatingCount: 50 },
      { rating: 4.0, userRatingCount: 200 }
    ];
    const ranked = rs.applyRarityRanking(pool, 2);
    for (const r of ranked) {
      expect(typeof r.rarityScore).toBe('number');
      expect(r.rarityScore).toBeGreaterThanOrEqual(0);
      expect(r.rarityScore).toBeLessThanOrEqual(1);
    }
  });

  it('weights sum to 1', () => {
    expect(rs.W_RATING + rs.W_LOW_VOLUME + rs.W_RECENCY).toBeCloseTo(1);
  });
});
