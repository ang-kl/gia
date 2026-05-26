// cuisine-venue-counts.test.js — v0.61.173
//
// Coverage targets:
//   - SCOPE_SLUGS frozen + correct cardinality + all slugs present
//     in the live cuisines-vault.
//   - buildTextQuery prefers vault.searchQuery, falls back to
//     "<name> restaurant Singapore" when missing.
//   - countOne: paginates, dedups across pages, returns capped=true
//     at the 60-ceiling, isolates errors, null on missing API key.
//   - countAll: aggregates total, propagates per-slug errors,
//     surfaces capped slugs.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const cuisinesVault = require('../cuisines-vault');
const {
  SCOPE_SLUGS,
  buildTextQuery,
  countOne,
  countAll,
  PAGE_SIZE,
  MAX_PAGES
} = require('../cuisine-venue-counts');

describe('SCOPE_SLUGS', () => {
  it('contains exactly 48 slugs (operator-confirmed subset)', () => {
    expect(SCOPE_SLUGS.length).toBe(48);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(SCOPE_SLUGS)).toBe(true);
  });

  it('has no duplicates', () => {
    const seen = new Set(SCOPE_SLUGS);
    expect(seen.size).toBe(SCOPE_SLUGS.length);
  });

  it('every slug exists in cuisines-vault.getAllCuisines()', () => {
    const have = new Set(cuisinesVault.getAllCuisines().map((c) => c.slug));
    const missing = SCOPE_SLUGS.filter((s) => !have.has(s));
    expect(missing).toEqual([]);
  });

  it('excludes the 19 slugs the operator chose to drop', () => {
    const excluded = [
      'singaporean', 'south-indian', 'malaysian', 'indonesian', 'chinese',
      'sichuan', 'cantonese', 'hunan', 'hokkien', 'teochew', 'hainanese',
      'hakka', 'hong-kong', 'macau', 'european', 'mediterranean', 'turkish',
      'dessert', 'fusion'
    ];
    const set = new Set(SCOPE_SLUGS);
    for (const slug of excluded) {
      expect(set.has(slug)).toBe(false);
    }
  });
});

describe('buildTextQuery', () => {
  it('uses vault.searchQuery when present', () => {
    const q = buildTextQuery(cuisinesVault, 'italian');
    expect(q.toLowerCase()).toContain('italian');
    expect(q.toLowerCase()).toContain('singapore');
  });

  it('falls back to "<name> restaurant Singapore" when vault has no searchQuery', () => {
    const fakeVault = {
      getAllCuisines: () => [{ slug: 'fake', name: 'Fake' }]
    };
    expect(buildTextQuery(fakeVault, 'fake')).toBe('Fake restaurant Singapore');
  });

  it('falls back to slug when neither name nor searchQuery is present', () => {
    const fakeVault = {
      getAllCuisines: () => [{ slug: 'orphan' }]
    };
    expect(buildTextQuery(fakeVault, 'orphan')).toBe('orphan restaurant Singapore');
  });
});

describe('countOne', () => {
  it('returns n=null + error when GOOGLE_MAPS_API_KEY is missing', async () => {
    const out = await countOne('italian', { apiKey: '' });
    expect(out.n).toBeNull();
    expect(out.error).toMatch(/API_KEY/i);
  });

  it('counts unique placeIds across one page', async () => {
    const fetchFn = async () => ({
      places: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      nextPageToken: null
    });
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBe(3);
    expect(out.pages).toBe(1);
    expect(out.capped).toBe(false);
  });

  it('paginates up to 3 pages and dedups overlapping placeIds', async () => {
    let call = 0;
    const fetchFn = async () => {
      call += 1;
      if (call === 1) {
        return { places: [{ id: 'a' }, { id: 'b' }], nextPageToken: 'tok1' };
      }
      if (call === 2) {
        // overlap: 'b' returned again
        return { places: [{ id: 'b' }, { id: 'c' }, { id: 'd' }], nextPageToken: 'tok2' };
      }
      return { places: [{ id: 'e' }], nextPageToken: null };
    };
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBe(5);     // a, b, c, d, e (b deduped)
    expect(out.pages).toBe(3);
    expect(call).toBe(3);
  });

  it('caps pagination at MAX_PAGES even if nextPageToken keeps coming', async () => {
    let call = 0;
    const fetchFn = async () => {
      call += 1;
      const ids = Array.from({ length: PAGE_SIZE }, (_, i) => `p${call}-${i}`);
      return { places: ids.map((id) => ({ id })), nextPageToken: 'more' };
    };
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.pages).toBe(MAX_PAGES);
    expect(out.n).toBe(PAGE_SIZE * MAX_PAGES);    // 60
    expect(out.capped).toBe(true);
    expect(call).toBe(MAX_PAGES);
  });

  it('surfaces the network error message + bails further pagination', async () => {
    const fetchFn = async () => { throw new Error('ECONNRESET'); };
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBeNull();
    expect(out.error).toMatch(/ECONNRESET/);
    expect(out.pages).toBe(0);
  });

  it('returns n=0 (not null) when the first page is empty', async () => {
    const fetchFn = async () => ({ places: [], nextPageToken: null });
    const out = await countOne('italian', { apiKey: 'x', fetchFn });
    expect(out.n).toBe(0);
    expect(out.error).toBeNull();
  });
});

describe('countAll', () => {
  it('aggregates per-slug counts into a total + isolates per-slug errors', async () => {
    let i = 0;
    const fetchFn = async ({ textQuery }) => {
      i += 1;
      // First call for "japanese" errors; rest succeed with 1 hit each.
      if (textQuery.toLowerCase().startsWith('japanese')) throw new Error('quota');
      return { places: [{ id: `id-${i}` }], nextPageToken: null };
    };
    const out = await countAll({ apiKey: 'x', fetchFn });
    expect(Object.keys(out.perSlug).length).toBe(SCOPE_SLUGS.length);
    expect(out.errors.japanese).toMatch(/quota/);
    expect(out.perSlug.japanese).toBeNull();
    // 47 cuisines × 1 hit each = 47
    expect(out.total).toBe(SCOPE_SLUGS.length - 1);
  });

  it('surfaces capped slugs', async () => {
    const fetchFn = async () => ({
      places: Array.from({ length: PAGE_SIZE }, (_, i) => ({ id: `pid-${i}-${Math.random()}` })),
      nextPageToken: 'more'
    });
    const out = await countAll({ apiKey: 'x', fetchFn });
    // Every slug hits the 60-ceiling.
    expect(out.capped.length).toBe(SCOPE_SLUGS.length);
    expect(out.total).toBe(SCOPE_SLUGS.length * PAGE_SIZE * MAX_PAGES);
  });

  it('records elapsedMs as a finite number', async () => {
    const fetchFn = async () => ({ places: [], nextPageToken: null });
    const out = await countAll({ apiKey: 'x', fetchFn });
    expect(Number.isFinite(out.elapsedMs)).toBe(true);
    expect(out.elapsedMs).toBeGreaterThanOrEqual(0);
  });

  it('writes an ISO 8601 timestamp', async () => {
    const fetchFn = async () => ({ places: [], nextPageToken: null });
    const out = await countAll({ apiKey: 'x', fetchFn });
    expect(new Date(out.ts).toString()).not.toBe('Invalid Date');
  });
});
