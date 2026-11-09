// __tests__/pipeline-pagination.test.js
//
// Places API New Text Search is page-capped (≤20 per page, ~3 pages / ~60
// results). pagesForRequest decides how many pages discover() walks so the
// pool actually fills the caller's requested count — the structural fix for
// "fewer results than Google Maps" (paginate, don't raise the timeout).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { pagesForRequest } = require('../pipeline.js');

describe('pagesForRequest — fill the requested count', () => {
  it('≤20 results → 1 page (unchanged default)', () => {
    expect(pagesForRequest(20, 1)).toBe(1);
    expect(pagesForRequest(15, 1)).toBe(1);
    expect(pagesForRequest(1, 1)).toBe(1);
  });
  it('ceil(maxResults/20): 30 → 2, 40 → 2, 41 → 3', () => {
    expect(pagesForRequest(30, 1)).toBe(2);
    expect(pagesForRequest(40, 1)).toBe(2);
    expect(pagesForRequest(41, 1)).toBe(3);
    expect(pagesForRequest(21, 1)).toBe(2);
  });
  it('clamps to Google’s ~3-page ceiling', () => {
    expect(pagesForRequest(200, 1)).toBe(3);
    expect(pagesForRequest(60, 1)).toBe(3);
    expect(pagesForRequest(80, 10)).toBe(3);
  });
  it('honours an explicit maxPages even when maxResults is small', () => {
    expect(pagesForRequest(20, 3)).toBe(3);   // the TMA cuisine search path
    expect(pagesForRequest(15, 2)).toBe(2);
  });
  it('takes the larger of (needed-by-count, explicit maxPages)', () => {
    expect(pagesForRequest(41, 1)).toBe(3);   // count wins (3 > 1)
    expect(pagesForRequest(20, 2)).toBe(2);   // explicit wins (2 > 1)
  });
  it('defends against bad input (NaN / 0 / undefined)', () => {
    expect(pagesForRequest(undefined, undefined)).toBe(1);
    expect(pagesForRequest(0, 0)).toBe(1);
    expect(pagesForRequest(NaN, NaN)).toBe(1);
  });
});
