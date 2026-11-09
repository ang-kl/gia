// __tests__/hidden-gems.test.js — v0.58.22 unit tests for the
// deterministic hidden-gem evaluator. Claude C2/C5 judgment + the
// rankAsHiddenGems Anthropic call are integration concerns and are
// not covered here (they require API keys; rely on prod log lines
// D724–D726 for diagnostics).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const hg = require('../hidden-gems');

describe('hidden-gems chain blacklist', () => {
  it('matches Toast Box', () => expect(hg.isChain('Toast Box Outlet 47')).toBe(true));
  it('matches Ya Kun', () => expect(hg.isChain('Ya Kun Kaya Toast')).toBe(true));
  it('matches Killiney', () => expect(hg.isChain('Killiney Kopitiam')).toBe(true));
  it('matches Old Chang Kee', () => expect(hg.isChain('Old Chang Kee')).toBe(true));
  it('matches KOI', () => expect(hg.isChain('KOI Cafe')).toBe(true));
  it('matches LiHO', () => expect(hg.isChain('LiHO Tea')).toBe(true));
  it('matches Mr Bean', () => expect(hg.isChain('Mr. Bean')).toBe(true));
  it('matches Each-a-Cup', () => expect(hg.isChain('Each-A-Cup')).toBe(true));
  it('matches Crystal Jade', () => expect(hg.isChain('Crystal Jade Kitchen')).toBe(true));
  it('matches McDonald variant', () => expect(hg.isChain("McDonald's")).toBe(true));
  it('matches Subway', () => expect(hg.isChain('Subway')).toBe(true));
  it('matches Starbucks', () => expect(hg.isChain('Starbucks Coffee')).toBe(true));
  it('matches Texas Chicken', () => expect(hg.isChain('Texas Chicken')).toBe(true));

  // Whole-word boundary: a place called "Toast Bar" must NOT match
  // the Toast Box pattern.
  it('does NOT match Toast Bar', () => expect(hg.isChain('The Toast Bar')).toBe(false));
  // "Kun" alone shouldn't trip Ya Kun.
  it('does NOT match standalone Kun', () => expect(hg.isChain('Kun Yang Restaurant')).toBe(false));
  // Nominal independent venues should pass.
  it('does NOT match Quiet Bun Bakery', () => expect(hg.isChain('Quiet Bun Bakery')).toBe(false));
  it('does NOT match Wildseed Cafe', () => expect(hg.isChain('Wildseed Cafe')).toBe(false));

  // Defensive: empty / null input.
  it('handles empty string', () => expect(hg.isChain('')).toBe(false));
  it('handles null', () => expect(hg.isChain(null)).toBe(false));
});

describe('passesHardFilter', () => {
  const baseline = {
    name: 'Quiet Bun Bakery', rating: 4.5, userRatingCount: 30,
    businessStatus: 'OPERATIONAL'
  };
  it('passes a clean independent venue', () => {
    expect(hg.passesHardFilter(baseline)).toBe(true);
  });
  it('drops rating < 4.0', () => {
    expect(hg.passesHardFilter({ ...baseline, rating: 3.9 })).toBe(false);
  });
  it('keeps rating == 4.0', () => {
    expect(hg.passesHardFilter({ ...baseline, rating: 4.0 })).toBe(true);
  });
  it('drops userRatingCount < 8', () => {
    expect(hg.passesHardFilter({ ...baseline, userRatingCount: 7 })).toBe(false);
  });
  it('keeps userRatingCount == 8', () => {
    expect(hg.passesHardFilter({ ...baseline, userRatingCount: 8 })).toBe(true);
  });
  it('drops chains', () => {
    expect(hg.passesHardFilter({ ...baseline, name: 'Toast Box Tampines' })).toBe(false);
  });
  it('drops CLOSED_PERMANENTLY', () => {
    expect(hg.passesHardFilter({ ...baseline, businessStatus: 'CLOSED_PERMANENTLY' })).toBe(false);
  });
  it('drops null input', () => {
    expect(hg.passesHardFilter(null)).toBe(false);
  });
});

describe('evalC1_NewHighRated', () => {
  const NOW = new Date('2026-05-05T00:00:00Z');
  it('true when rating ≥ 4.3 and earliest review within 150 days', () => {
    const v = {
      rating: 4.5,
      reviews: [{ publishTime: '2026-03-01T00:00:00Z' }] // ~65 days old
    };
    expect(hg.evalC1_NewHighRated(v, NOW)).toBe(true);
  });
  it('false when earliest review > 150 days', () => {
    const v = {
      rating: 4.5,
      reviews: [{ publishTime: '2025-10-01T00:00:00Z' }] // ~216 days old
    };
    expect(hg.evalC1_NewHighRated(v, NOW)).toBe(false);
  });
  it('false when rating < 4.3', () => {
    const v = {
      rating: 4.2,
      reviews: [{ publishTime: '2026-03-01T00:00:00Z' }]
    };
    expect(hg.evalC1_NewHighRated(v, NOW)).toBe(false);
  });
  it('false with no reviews', () => {
    expect(hg.evalC1_NewHighRated({ rating: 4.6, reviews: [] }, NOW)).toBe(false);
  });
  it('picks the earliest of multiple reviews', () => {
    const v = {
      rating: 4.5,
      reviews: [
        { publishTime: '2026-04-20T00:00:00Z' }, // 15d ago
        { publishTime: '2026-02-20T00:00:00Z' }  // 75d ago
      ]
    };
    expect(hg.evalC1_NewHighRated(v, NOW)).toBe(true);
  });
});

describe('evalC3_Underreviewed', () => {
  it('true when rating ≥ 4.5 AND ratingCount < 60', () => {
    expect(hg.evalC3_Underreviewed({ rating: 4.5, userRatingCount: 23 })).toBe(true);
  });
  it('false at rating 4.4', () => {
    expect(hg.evalC3_Underreviewed({ rating: 4.4, userRatingCount: 23 })).toBe(false);
  });
  it('false at userRatingCount = 60 (strict <)', () => {
    expect(hg.evalC3_Underreviewed({ rating: 4.6, userRatingCount: 60 })).toBe(false);
  });
  it('true at userRatingCount = 59', () => {
    expect(hg.evalC3_Underreviewed({ rating: 4.6, userRatingCount: 59 })).toBe(true);
  });
});

describe('evalC4_OffTransport', () => {
  it('true at 400 m exactly', () => expect(hg.evalC4_OffTransport(400)).toBe(true));
  it('false at 399 m', () => expect(hg.evalC4_OffTransport(399)).toBe(false));
  it('true at 1200 m', () => expect(hg.evalC4_OffTransport(1200)).toBe(true));
  it('false at NaN', () => expect(hg.evalC4_OffTransport(NaN)).toBe(false));
  it('false at Infinity', () => expect(hg.evalC4_OffTransport(Infinity)).toBe(false));
});

describe('nearestMrtWalkM', () => {
  // Uses transport.nearestMrtStations under the hood; we inject mrtFn.
  it('returns Infinity when no stations found', async () => {
    const walk = await hg.nearestMrtWalkM(
      { lat: 1.3, lng: 103.8 },
      { mrtFn: async () => [] }
    );
    expect(walk).toBe(Infinity);
  });

  it('applies 1.3x walking-detour factor', async () => {
    const walk = await hg.nearestMrtWalkM(
      { lat: 1.3, lng: 103.8 },
      { mrtFn: async () => [{ distanceM: 300, name: 'Mock MRT' }] }
    );
    expect(walk).toBe(390); // 300 × 1.3
  });

  it('returns Infinity when transport throws', async () => {
    const walk = await hg.nearestMrtWalkM(
      { lat: 1.3, lng: 103.8 },
      { mrtFn: async () => { throw new Error('Places API down'); } }
    );
    expect(walk).toBe(Infinity);
  });
});

describe('evaluateHiddenGemCriteria', () => {
  // Mock MRT lookup so the test is deterministic.
  const farMrt = async () => [{ distanceM: 400, name: 'Mock' }]; // walk = 520 m → c4 true
  const nearMrt = async () => [{ distanceM: 100, name: 'Mock' }]; // walk = 130 m → c4 false

  const NOW = new Date('2026-05-05T00:00:00Z');

  it('annotates each candidate with c1/c3/c4 + deterministicScore', async () => {
    const candidates = [
      // Should hit C1 (new + 4.3+) AND C4 (off-MRT) → score 1.0+0.8=1.8
      {
        placeId: 'p1', name: 'New Hidden', lat: 1.3, lng: 103.8,
        rating: 4.4, userRatingCount: 80,
        reviews: [{ publishTime: '2026-03-01T00:00:00Z' }]
      },
      // Should hit only C3 → score 1.2
      {
        placeId: 'p2', name: 'Quiet Spot', lat: 1.3, lng: 103.8,
        rating: 4.6, userRatingCount: 20,
        reviews: []
      }
    ];
    const annotated = await hg.evaluateHiddenGemCriteria(
      candidates, { lat: 1.3, lng: 103.8 },
      { now: NOW, mrtFn: farMrt }
    );
    expect(annotated[0].c1_new_highrated).toBe(true);
    expect(annotated[0].c3_underreviewed).toBe(false);
    expect(annotated[0].c4_off_transport).toBe(true);
    expect(annotated[0].deterministicScore).toBeCloseTo(1.8, 5);

    expect(annotated[1].c1_new_highrated).toBe(false);
    expect(annotated[1].c3_underreviewed).toBe(true);
    expect(annotated[1].c4_off_transport).toBe(true);
    expect(annotated[1].deterministicScore).toBeCloseTo(2.0, 5);
  });

  it('zero score when nothing fires', async () => {
    const annotated = await hg.evaluateHiddenGemCriteria(
      [{
        placeId: 'p3', name: 'Mediocre', lat: 1.3, lng: 103.8,
        rating: 4.1, userRatingCount: 200,
        reviews: [{ publishTime: '2024-01-01T00:00:00Z' }]
      }],
      { lat: 1.3, lng: 103.8 },
      { now: NOW, mrtFn: nearMrt }
    );
    expect(annotated[0].c1_new_highrated).toBe(false);
    expect(annotated[0].c3_underreviewed).toBe(false);
    expect(annotated[0].c4_off_transport).toBe(false);
    expect(annotated[0].deterministicScore).toBe(0);
  });
});
