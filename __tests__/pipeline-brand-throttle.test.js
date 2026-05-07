// __tests__/pipeline-brand-throttle.test.js — v0.59.21
//
// Verifies the brand-throttle dedup. When Google Places returns
// multiple outlets of the same brand (Hong Lim Curry Puff x3, Gold
// Xiang Curry Puff x2), the user wants ≤ 2 venues per brand cluster
// so the result list shows variety. The brandKey extractor + cap=2
// throttle implements this.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { brandKey, throttleBrands } = require('../pipeline.js');

describe('brandKey', () => {
  it('strips branch markers after " - " (corporate full name)', () => {
    expect(brandKey({ name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Bukit Merah' }))
      .toBe(brandKey({ name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Chinatown' }));
  });

  it('strips parenthesised location suffixes', () => {
    expect(brandKey({ name: 'Hong Lim Curry Puff (Maxwell Food Centre)' }))
      .toBe('hong lim curry puff');
    expect(brandKey({ name: 'Hong Lim Curry Puff' }))
      .toBe('hong lim curry puff');
  });

  it('drops corporate-form tokens (pte/ltd/&/and/inc)', () => {
    expect(brandKey({ name: 'Gold Xiang Curry Puff Pte. Ltd.' }))
      .toBe('gold xiang curry puff');
  });

  it('caps at 4 tokens (avoids merging "Toast Box" with "Toast Box Express Westgate")', () => {
    const a = brandKey({ name: 'Toast Box' });
    const b = brandKey({ name: 'Toast Box Express Westgate Mall Branch' });
    // 4-token cap means "Toast Box" = "toast box" and "Toast Box Express Westgate" = "toast box express westgate"
    // Different keys → different brands → both stay.
    expect(a).not.toBe(b);
  });

  it('handles Places-API-shape displayName (object with .text)', () => {
    expect(brandKey({ displayName: { text: 'Hong Lim Curry Puff' } }))
      .toBe('hong lim curry puff');
  });

  it('returns empty string for missing names', () => {
    expect(brandKey({})).toBe('');
    expect(brandKey(null)).toBe('');
    expect(brandKey({ name: '' })).toBe('');
  });
});

describe('throttleBrands', () => {
  it('caps a 3-outlet brand at 2 (matches user screenshot Hong Lim case)', () => {
    const venues = [
      { name: 'Hong Lim Curry Puff', placeId: 'a' },
      { name: 'Hong Lim Curry Puff Enggor Street (Anson)', placeId: 'b' },
      { name: 'Hong Lim Curry Puff (Maxwell Food Centre)', placeId: 'c' }
    ];
    const out = throttleBrands(venues, 2);
    expect(out.length).toBe(2);
    expect(out.map((v) => v.placeId)).toEqual(['a', 'b']); // first 2 kept, 3rd dropped
  });

  it('caps a 2-outlet brand at 2 (no drop)', () => {
    const venues = [
      { name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Bukit Merah', placeId: 'a' },
      { name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Chinatown', placeId: 'b' }
    ];
    expect(throttleBrands(venues, 2).length).toBe(2);
  });

  it('preserves discover order across mixed brands', () => {
    const venues = [
      { name: 'Hong Lim Curry Puff', placeId: 'h1' },
      { name: 'Tian Tian Hainanese Chicken', placeId: 't1' },
      { name: 'Hong Lim Curry Puff (Maxwell)', placeId: 'h2' },
      { name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Bukit Merah', placeId: 'g1' },
      { name: 'Hong Lim Curry Puff Enggor', placeId: 'h3' }, // 3rd Hong Lim → DROPPED
      { name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Chinatown', placeId: 'g2' }
    ];
    const out = throttleBrands(venues, 2);
    expect(out.map((v) => v.placeId)).toEqual(['h1', 't1', 'h2', 'g1', 'g2']);
  });

  it('reproduces the user-screenshot scenario (5 curry-puff venues from 2 brands → 4 kept)', () => {
    const venues = [
      { name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Bukit Merah', placeId: '1' },
      { name: 'Hong Lim Curry Puff', placeId: '2' },
      { name: 'Hong Lim Curry Puff Enggor Street (Anson)', placeId: '3' },
      { name: 'GOLD XIANG CURRY PUFF PTE. LTD. - Chinatown', placeId: '4' },
      { name: 'Hong Lim Curry Puff (Maxwell Food Centre)', placeId: '5' } // 3rd Hong Lim → DROPPED
    ];
    const out = throttleBrands(venues, 2);
    expect(out.length).toBe(4);
    expect(out.map((v) => v.placeId)).toEqual(['1', '2', '3', '4']);
  });

  it('passes through single-venue cases unchanged', () => {
    const venues = [
      { name: 'Tian Tian Hainanese Chicken Rice', placeId: 't1' },
      { name: 'Maxwell Hokkien Mee', placeId: 'm1' },
      { name: 'Boon Tong Kee', placeId: 'b1' }
    ];
    expect(throttleBrands(venues, 2).length).toBe(3);
  });

  it('keeps venues with empty brand keys (defensive)', () => {
    const venues = [
      { name: '', placeId: 'a' },
      { placeId: 'b' }
    ];
    expect(throttleBrands(venues, 2).length).toBe(2);
  });

  it('handles non-array inputs without throwing (passes through)', () => {
    expect(throttleBrands(null, 2)).toBe(null);
    expect(throttleBrands(undefined, 2)).toBe(undefined);
  });

  it('handles empty array (passes through)', () => {
    expect(throttleBrands([], 2)).toEqual([]);
  });
});
