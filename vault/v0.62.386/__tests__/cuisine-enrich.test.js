// __tests__/cuisine-enrich.test.js — v0.62.x (progressive-results Stage 1)
//
// The enrichment chain extracted from /api/cuisine/search into FAST
// (pure/local) and SLOW (network/LLM) phases. These tests pin the FAST
// phase's behaviour (regex dishes + snippet, open-hours labels,
// restaurantType, injected price-range) and the extractDishes rules that
// moved with it. The SLOW phase is network/LLM-bound and stays covered by
// its own modules' suites (crowd-signal, translate-review, travel-times…).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { extractDishes, reviewText, enrichFast } = require('../cuisine-enrich.js');

const rev = (text, daysAgo = 10, extra = {}) => ({
  text,
  publishTime: new Date(Date.now() - daysAgo * 86400000).toISOString(),
  ...extra,
});

describe('reviewText — Places v1 nested text unwrap', () => {
  it('unwraps { text: { text } } and accepts bare strings', () => {
    expect(reviewText({ text: { text: 'great laksa' } })).toBe('great laksa');
    expect(reviewText({ text: 'plain' })).toBe('plain');
    expect(reviewText(null)).toBe('');
    expect(reviewText({ text: { languageCode: 'en' } })).toBe('');
  });
});

describe('extractDishes — regex pass', () => {
  it('extracts a dish from "ordered/tried/recommend" phrasing + returns the snippet', () => {
    const { dishes, snippet } = extractDishes([rev('We ordered the Bak Chor Mee. Superb broth')], 'Some Stall');
    expect(dishes).toContain('Bak Chor Mee');
    expect(snippet).toMatch(/^We ordered the Bak Chor Mee/);
  });
  it('drops a capture containing the venue name (leaked fragment, not a dish)', () => {
    const { dishes } = extractDishes([rev('We tried the Restaurant Fiz tasting menu')], 'Restaurant Fiz');
    expect(dishes.find((d) => /fiz/i.test(d))).toBeUndefined();
  });
  it('returns empty for no reviews', () => {
    expect(extractDishes([], 'X')).toEqual({ dishes: [], snippet: null });
    expect(extractDishes(null, 'X').dishes).toEqual([]);
  });
  it('caps dishes at 3', () => {
    const text = 'We ordered the Chilli Crab. tried the Black Pepper Crab. had the Salted Egg Prawn. got the Cereal Prawn. recommend Mee Goreng';
    const { dishes } = extractDishes([rev(text)], 'X');
    expect(dishes.length).toBeLessThanOrEqual(3);
  });
});

describe('enrichFast — pure/local phase', () => {
  const ctx = {
    cuisineQueries: ['italian'],
    csChatId: null,
    deviceRegion: 'SG',
    humaniseRestaurantType: (display, _enum) => display || '',
    enrichPriceRangeDisplay: async () => {},   // injected — no network in FAST
  };
  it('sets dishes + recentReview from inline reviews, hours labels, and restaurantType', async () => {
    const top = [{
      placeId: 'A', name: 'Trattoria Uno',
      reviews: [rev('We ordered the Cacio Pepe — amazing')],
      openNow: false, regularPeriods: null,
      primaryTypeDisplayName: 'Italian restaurant', primaryType: 'italian_restaurant',
    }];
    await enrichFast(top, ctx);
    expect(top[0].dishes).toContain('Cacio Pepe');
    expect(top[0].recentReview).toMatch(/Cacio Pepe/);
    expect(top[0]).toHaveProperty('closedTodayLabel');   // openNow === false branch ran
    expect(top[0].restaurantType).toBe('Italian restaurant');
    // FAST must NOT consume the reviews — the SLOW phase still needs them.
    expect(Array.isArray(top[0].reviews)).toBe(true);
  });
  it('leaves a venue without reviews as a valid thinner card (no dishes row)', async () => {
    const top = [{ placeId: 'B', name: 'Bare', openNow: true, regularPeriods: null }];
    await enrichFast(top, ctx);
    expect(top[0].dishes).toBeUndefined();
    expect(top[0].recentReview).toBeUndefined();
  });
  it('a failing injected price-range enricher does not throw (best-effort)', async () => {
    const bad = { ...ctx, enrichPriceRangeDisplay: async () => { throw new Error('boom'); } };
    const top = [{ placeId: 'C', name: 'C', openNow: true }];
    await expect(enrichFast(top, bad)).resolves.toBeTruthy();
  });
});
