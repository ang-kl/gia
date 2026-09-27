// __tests__/surprise-helpers.test.js — covers haversine,
// priceLevelToInt, extractJsonObject (v0.39.3 lenient parse).

import { describe, it, expect } from 'vitest';

function haversine(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function priceLevelToInt(p) {
  if (typeof p === 'number') return p;
  const map = {
    PRICE_LEVEL_FREE: 0,
    PRICE_LEVEL_INEXPENSIVE: 1,
    PRICE_LEVEL_MODERATE: 2,
    PRICE_LEVEL_EXPENSIVE: 3,
    PRICE_LEVEL_VERY_EXPENSIVE: 4
  };
  return map[p] ?? null;
}

function extractJsonObject(text) {
  if (typeof text !== 'string') return '{}';
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence && fence[1]) return fence[1].trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

describe('haversine', () => {
  it('returns 0 for identical points', () => {
    expect(haversine({ lat: 1.28, lng: 103.85 }, { lat: 1.28, lng: 103.85 })).toBeCloseTo(0, 1);
  });

  it('Raffles Place to Tanjong Pagar MRT (~1km)', () => {
    const d = haversine({ lat: 1.2839, lng: 103.8517 }, { lat: 1.2765, lng: 103.8459 });
    expect(d).toBeGreaterThan(900);
    expect(d).toBeLessThan(1200);
  });

  it('symmetric: A→B == B→A', () => {
    const a = { lat: 1.28, lng: 103.85 };
    const b = { lat: 1.30, lng: 103.86 };
    expect(haversine(a, b)).toBeCloseTo(haversine(b, a), 6);
  });
});

describe('priceLevelToInt', () => {
  it('passes numeric levels through', () => {
    expect(priceLevelToInt(0)).toBe(0);
    expect(priceLevelToInt(2)).toBe(2);
    expect(priceLevelToInt(4)).toBe(4);
  });

  it('maps Places API enum strings', () => {
    expect(priceLevelToInt('PRICE_LEVEL_FREE')).toBe(0);
    expect(priceLevelToInt('PRICE_LEVEL_INEXPENSIVE')).toBe(1);
    expect(priceLevelToInt('PRICE_LEVEL_MODERATE')).toBe(2);
    expect(priceLevelToInt('PRICE_LEVEL_EXPENSIVE')).toBe(3);
    expect(priceLevelToInt('PRICE_LEVEL_VERY_EXPENSIVE')).toBe(4);
  });

  it('returns null for unknown / missing', () => {
    expect(priceLevelToInt(undefined)).toBe(null);
    expect(priceLevelToInt(null)).toBe(null);
    expect(priceLevelToInt('PRICE_LEVEL_UNKNOWN')).toBe(null);
  });
});

describe('extractJsonObject', () => {
  it('returns the inside of ```json fences', () => {
    expect(extractJsonObject('```json\n{"a":1}\n```').trim()).toBe('{"a":1}');
  });

  it('returns the inside of bare ``` fences', () => {
    expect(extractJsonObject('```\n{"a":1}\n```').trim()).toBe('{"a":1}');
  });

  it('extracts the first { ... } block when no fences', () => {
    expect(extractJsonObject('Sure, here is: {"a":1}')).toBe('{"a":1}');
  });

  it('returns "{}" for non-string input', () => {
    expect(extractJsonObject(null)).toBe('{}');
    expect(extractJsonObject(undefined)).toBe('{}');
    expect(extractJsonObject(42)).toBe('{}');
  });

  it('returns trimmed input when no { ... } found', () => {
    expect(extractJsonObject('   no json here   ')).toBe('no json here');
  });
});
