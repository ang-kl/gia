// __tests__/pipeline-dessert-fusion.test.js — v0.59.21 (Codex #226 P2)
//
// Codex flagged that specialRequestForCuisines runs only inside
// runPipeline, but the cuisine TMA path goes /api/cuisine/search →
// pipeline.discover() directly with no LLM rank step. Dessert/Fusion
// intent never reached the TMA flow.
//
// Fix: expandDessertCuisines + expandFusionCuisines mirror the
// Singaporean dish-rotation pattern, expanding the Places textQuery
// with grounded keywords so the TMA path returns dessert-themed and
// fusion/Michelin-aware venues respectively.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const {
  DESSERT_KEYWORDS,
  FUSION_KEYWORDS,
  expandDessertCuisines,
  expandFusionCuisines
} = require('../pipeline.js');

describe('DESSERT_KEYWORDS', () => {
  it('v0.59.27: replaced 12-keyword pool with the user-supplied 67-item dessert catalogue', () => {
    expect(DESSERT_KEYWORDS.length).toBeGreaterThanOrEqual(60);
    // Spot-check Peranakan kueh
    expect(DESSERT_KEYWORDS).toContain('Kueh Lapis');
    expect(DESSERT_KEYWORDS).toContain('Ondeh Ondeh');
    expect(DESSERT_KEYWORDS).toContain('Ang Ku Kueh');
    // SG cold/warm staples
    expect(DESSERT_KEYWORDS).toContain('Ice Kachang');
    expect(DESSERT_KEYWORDS).toContain('Chendol');
    expect(DESSERT_KEYWORDS).toContain('Tau Huay');
    expect(DESSERT_KEYWORDS).toContain('Cheng Tng');
    // Regional: Thai, Filipino, Indonesian, Vietnamese
    expect(DESSERT_KEYWORDS).toContain('Mango Sticky Rice');
    expect(DESSERT_KEYWORDS).toContain('Halo Halo');
    expect(DESSERT_KEYWORDS).toContain('Es Teler');
    expect(DESSERT_KEYWORDS).toContain('Che Ba Mau');
  });

  it('has no duplicate entries', () => {
    expect(new Set(DESSERT_KEYWORDS).size).toBe(DESSERT_KEYWORDS.length);
  });
});

describe('FUSION_KEYWORDS', () => {
  it('includes Michelin / Bib / Asia 50 Best signals', () => {
    expect(FUSION_KEYWORDS).toContain('Michelin Star Singapore');
    expect(FUSION_KEYWORDS).toContain('Michelin Bib Gourmand Singapore');
    expect(FUSION_KEYWORDS).toContain("Asia's 50 Best Restaurants");
  });

  it('has no duplicate entries', () => {
    expect(new Set(FUSION_KEYWORDS).size).toBe(FUSION_KEYWORDS.length);
  });
});

describe('expandDessertCuisines', () => {
  it('appends 3 keywords when "Dessert" is in the cuisines list', () => {
    const out = expandDessertCuisines(['Dessert']);
    expect(out.length).toBe(6);
    expect(out[0]).toBe('Dessert');
    expect(DESSERT_KEYWORDS).toContain(out[1]);
    expect(DESSERT_KEYWORDS).toContain(out[2]);
    expect(DESSERT_KEYWORDS).toContain(out[3]);
    expect(new Set([out[1], out[2], out[3]]).size).toBe(3);
  });

  it('matches case-insensitively', () => {
    expect(expandDessertCuisines(['dessert']).length).toBe(6);
    expect(expandDessertCuisines(['DESSERT']).length).toBe(6);
  });

  it('passes through non-dessert cuisines unchanged', () => {
    expect(expandDessertCuisines(['Korean', 'Italian'])).toEqual(['Korean', 'Italian']);
  });

  it('preserves other cuisines when Dessert is mixed in', () => {
    const out = expandDessertCuisines(['Dessert', 'Korean']);
    expect(out.length).toBe(7);
    expect(out).toContain('Dessert');
    expect(out).toContain('Korean');
  });

  it('handles non-array / empty inputs without throwing', () => {
    expect(expandDessertCuisines(null)).toBe(null);
    expect(expandDessertCuisines(undefined)).toBe(undefined);
    expect(expandDessertCuisines([])).toEqual([]);
  });

  it('does NOT match "desserts-and-more" (token boundary respected)', () => {
    // Hyphenated single token should not match the standalone "dessert".
    expect(expandDessertCuisines(['desserts-and-more'])).toEqual(['desserts-and-more']);
  });
});

describe('expandFusionCuisines', () => {
  it('appends 2 Michelin/50-Best signals when "Fusion" is selected', () => {
    const out = expandFusionCuisines(['Fusion']);
    expect(out.length).toBe(6);
    expect(out[0]).toBe('Fusion');
    expect(FUSION_KEYWORDS).toContain(out[1]);
    expect(FUSION_KEYWORDS).toContain(out[2]);
    expect(out[1]).not.toBe(out[2]);
  });

  it('matches case-insensitively', () => {
    expect(expandFusionCuisines(['fusion']).length).toBe(6);
    expect(expandFusionCuisines(['FUSION']).length).toBe(6);
  });

  it('passes through non-fusion cuisines unchanged', () => {
    expect(expandFusionCuisines(['Italian'])).toEqual(['Italian']);
  });

  it('preserves other cuisines when Fusion is mixed in', () => {
    const out = expandFusionCuisines(['Fusion', 'Italian']);
    // 2 cuisines + 5 fusion keywords = 7 (v0.59.41: 2 → 5 keywords)
    expect(out.length).toBe(7);
    expect(out).toContain('Fusion');
    expect(out).toContain('Italian');
  });

  it('handles non-array / empty inputs without throwing', () => {
    expect(expandFusionCuisines(null)).toBe(null);
    expect(expandFusionCuisines([])).toEqual([]);
  });
});
