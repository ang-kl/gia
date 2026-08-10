// __tests__/vibe-summary-reviews.test.js — v0.62.71x
//
// Sanctuary redundant-fetch regression coverage: fetchReviewText used to ALWAYS hit Google
// Places Details, even when the caller (cuisine-enrich.js's enrichSlow)
// had already fetched the exact same `reviews` field on the base search
// call moments earlier. `preFetchedReviews` lets a caller hand those
// reviews straight to the sanctuary-read formatter and skip the redundant
// paid call. These tests never set GOOGLE_MAPS_API_KEY, so any test that
// still returns real formatted text proves the in-memory path fired
// (the live-fetch path returns '' immediately without a key).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { fetchReviewText, formatReviewsForSummary } = require('../vibe-summary.js');

const originalKey = process.env.GOOGLE_MAPS_API_KEY;

beforeEach(() => { delete process.env.GOOGLE_MAPS_API_KEY; });
afterEach(() => {
  if (originalKey === undefined) delete process.env.GOOGLE_MAPS_API_KEY;
  else process.env.GOOGLE_MAPS_API_KEY = originalKey;
});

const review = (text, daysAgo = 5) => ({
  text: { text },
  publishTime: new Date(Date.now() - daysAgo * 86400000).toISOString()
});

describe('formatReviewsForSummary', () => {
  it('prefers recent (≤30d) reviews, joined with the separator, capped at 8', () => {
    const reviews = Array.from({ length: 10 }, (_, i) => review(`review ${i}`, 5));
    const out = formatReviewsForSummary(reviews);
    expect(out.split('\n---\n').length).toBe(8);
    expect(out).toContain('review 0');
  });

  it('falls back to all reviews when none are recent', () => {
    const out = formatReviewsForSummary([review('old one', 400)]);
    expect(out).toBe('old one');
  });

  it('drops empty-text reviews and returns "" for an empty/absent list', () => {
    expect(formatReviewsForSummary([{ text: { text: '' } }])).toBe('');
    expect(formatReviewsForSummary([])).toBe('');
    expect(formatReviewsForSummary(null)).toBe('');
    expect(formatReviewsForSummary(undefined)).toBe('');
  });
});

describe('fetchReviewText — preFetchedReviews short-circuit (redundant-fetch fix)', () => {
  it('uses preFetchedReviews and returns real text with NO API key set (proves no live fetch happened)', async () => {
    const out = await fetchReviewText('place-1', null, [review('quiet corner seat')]);
    expect(out).toBe('quiet corner seat');
  });

  it('falls back to the live-fetch path (which needs a key) when preFetchedReviews is absent', async () => {
    const out = await fetchReviewText('place-1', null);
    expect(out).toBe(''); // no API key → live path short-circuits to ''
  });

  it('falls back to the live-fetch path when preFetchedReviews is an empty array', async () => {
    const out = await fetchReviewText('place-1', null, []);
    expect(out).toBe('');
  });

  it('falls back to the live-fetch path when preFetchedReviews is not an array', async () => {
    const out = await fetchReviewText('place-1', null, 'not-an-array');
    expect(out).toBe('');
  });

  it('formats preFetchedReviews identically to formatReviewsForSummary', async () => {
    const reviews = [review('a'), review('b')];
    const out = await fetchReviewText('place-1', null, reviews);
    expect(out).toBe(formatReviewsForSummary(reviews));
  });
});
