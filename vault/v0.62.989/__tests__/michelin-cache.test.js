// __tests__/michelin-cache.test.js — v0.60.150
//
// Pins the Michelin per-entry slug helper used as the Redis cache key
// (`michelin:place:<slug>`) and verifies the negative-cache marker
// shape. The slug helper lives inline in index.js handleMichelinSearch
// (introduced in v0.60.150 to support the parallelized Places-resolution
// loop); duplicating it here so the test doesn't have to load the whole
// index.js — same body, intentionally kept in sync.
//
// If the slug logic ever changes in index.js, update both copies so
// (a) cached entries from the old version don't reappear under a new
// slug for the same name, and (b) the cache-key shape stays diff-able
// in Railway logs.

import { describe, it, expect } from 'vitest';

const slugify = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

describe('Michelin per-entry slug (cache key)', () => {
  it('lowercases and joins non-alphanumeric runs with single hyphens', () => {
    expect(slugify('Odette')).toBe('odette');
    expect(slugify('Les Amis')).toBe('les-amis');
    expect(slugify('Hill Street Tai Hwa Pork Noodle')).toBe('hill-street-tai-hwa-pork-noodle');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('—Burnt Ends—')).toBe('burnt-ends');
    expect(slugify('  Restaurant Ânfora  ')).toBe('restaurant-nfora');
  });

  it('strips diacritics-only characters as hyphens (acceptable for cache uniqueness)', () => {
    // The slug doesn't transliterate diacritics — just removes them
    // and joins runs. "Anfora" and "Ânfora" land on the same slug,
    // which is fine for a curated 130-entry list (no collisions in
    // the 2025 catalogue). Pinning the behavior here so a future
    // ICU/unidecode swap is a deliberate decision.
    expect(slugify('Anfora')).toBe('anfora');
    expect(slugify('Ânfora')).toBe('nfora');
  });

  it('handles ampersands / punctuation / multiple spaces', () => {
    expect(slugify('Cluck Cluck & Co')).toBe('cluck-cluck-co');
    expect(slugify("A & B's Bistro")).toBe('a-b-s-bistro');
    expect(slugify('  Multi    Spaces  ')).toBe('multi-spaces');
  });

  it('caps at 80 characters', () => {
    const long = 'A'.repeat(200);
    expect(slugify(long).length).toBe(80);
  });

  it('null / undefined / empty inputs yield empty string', () => {
    expect(slugify('')).toBe('');
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });
});

describe('Michelin negative-cache marker shape', () => {
  // Places sometimes returns no match for an obscure curated entry.
  // The handler still caches the miss (as `{ __null: true }`) for 24 h
  // so the next session doesn't re-hit Places for the same dead venue.
  // The read side unwraps `__null` back to `null` so downstream logic
  // sees the same "Places returned nothing" signal as a live miss.

  it('encodes a negative-cache entry as { __null: true }', () => {
    const stored = JSON.stringify({ __null: true });
    expect(JSON.parse(stored)).toEqual({ __null: true });
  });

  it('a parsed negative-cache value is treated as null by the read side', () => {
    // Mirror of the unwrap at index.js:
    //   return (parsed && parsed.__null) ? null : parsed;
    const parsed = JSON.parse(JSON.stringify({ __null: true }));
    const effective = (parsed && parsed.__null) ? null : parsed;
    expect(effective).toBeNull();
  });

  it('a real Places payload is NOT mis-treated as a negative cache', () => {
    const live = { id: 'abc', displayName: { text: 'Odette' }, rating: 4.7 };
    const parsed = JSON.parse(JSON.stringify(live));
    const effective = (parsed && parsed.__null) ? null : parsed;
    expect(effective).toEqual(live);
  });
});

describe('Michelin enrich-cache read — type guards (v0.60.154)', () => {
  // Mirrors the inline cache-merge block in index.js:6160-6172. The
  // `[object Object]` bug surfaced when a corrupt prior cache entry
  // (recentReview / vibe / signatureDish written as a non-string) was
  // assigned to the venue object as-is and React stringified it on the
  // result card. The fix tightens the merge to typeof === 'string' &&
  // .trim() so any non-string flows past the guard untouched. Step 5
  // cache WRITE refills with valid strings on the same handler call.
  function mergeCachedEnrichment(v, e) {
    if (!e || typeof e !== 'object') return v;
    if (!v.recentReview && typeof e.recentReview === 'string' && e.recentReview.trim()) v.recentReview = e.recentReview;
    if (!v.vibe && typeof e.vibe === 'string' && e.vibe.trim()) v.vibe = e.vibe;
    if (!v.signatureDish && typeof e.signatureDish === 'string' && e.signatureDish.trim()) v.signatureDish = e.signatureDish;
    if ((!Array.isArray(v.dishes) || v.dishes.length < 2) && Array.isArray(e.dishes) && e.dishes.length) {
      v.dishes = e.dishes.slice(0, 3);
    }
    return v;
  }

  it('drops a nested-object recentReview (the [object Object] bug)', () => {
    const v = {};
    mergeCachedEnrichment(v, { recentReview: { nested: 'x' } });
    expect(v.recentReview).toBeUndefined();
  });

  it('drops an array vibe', () => {
    const v = {};
    mergeCachedEnrichment(v, { vibe: ['casual', 'lively'] });
    expect(v.vibe).toBeUndefined();
  });

  it('drops a null signatureDish', () => {
    const v = {};
    mergeCachedEnrichment(v, { signatureDish: null });
    expect(v.signatureDish).toBeUndefined();
  });

  it('accepts well-formed strings', () => {
    const v = {};
    mergeCachedEnrichment(v, {
      recentReview: 'Lovely tasting menu',
      vibe: 'refined',
      signatureDish: 'Cod brandade'
    });
    expect(v.recentReview).toBe('Lovely tasting menu');
    expect(v.vibe).toBe('refined');
    expect(v.signatureDish).toBe('Cod brandade');
  });

  it('does not overwrite an existing field value', () => {
    const v = { vibe: 'already set' };
    mergeCachedEnrichment(v, { vibe: 'cache value' });
    expect(v.vibe).toBe('already set');
  });

  it('rejects empty / whitespace-only strings', () => {
    const v = {};
    mergeCachedEnrichment(v, { recentReview: '   ', vibe: '', signatureDish: '\t\n' });
    expect(v.recentReview).toBeUndefined();
    expect(v.vibe).toBeUndefined();
    expect(v.signatureDish).toBeUndefined();
  });
});
