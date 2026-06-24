// __tests__/dish-search-gate.test.js — operator item 10: the tapped-dish
// relevance gate (distance cap + off-cuisine drop + evidence-first order).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { gateDishVenues } = require('../dish-search-gate.js');

describe('gateDishVenues — the Georgian-in-SG screenshot', () => {
  // Reproduces the operator's bleed: tap a Georgian dish in Singapore.
  const venues = [
    { name: 'Argo Georgian Bar & Grill', primaryType: 'restaurant', dishEvidence: 'reviews', _distKm: 986 }, // Bangkok
    { name: 'Hai Ge Ji Beef Noodles', primaryType: 'chinese_restaurant', dishEvidence: null, _distKm: 4 },
    { name: "Elfuego by Collin's", primaryType: 'restaurant', dishEvidence: null, _distKm: 8 },
  ];
  const r = gateDishVenues(venues, { cuisineSlugs: ['georgian'], maxKm: 50 });

  it('drops the 986 km Bangkok venue (distance cap)', () => {
    expect(r.droppedFar).toBe(1);
    expect(r.kept.find((v) => v.name.startsWith('Argo'))).toBeUndefined();
  });
  it('drops the off-cuisine Chinese noodle shop (no dish evidence)', () => {
    expect(r.kept.find((v) => v.primaryType === 'chinese_restaurant')).toBeUndefined();
  });
  it('drops the generic grill — Georgian has no Google type, so generic = noise', () => {
    expect(r.kept.find((v) => v.name.includes('Collin'))).toBeUndefined();
  });
  it('ends up honestly empty rather than bleeding', () => {
    expect(r.empty).toBe(true);
    expect(r.kept).toHaveLength(0);
  });
});

describe('gateDishVenues — keeps real matches, evidence-first', () => {
  it('orders name > reviews > cuisine > weak and keeps on-cuisine venues', () => {
    const venues = [
      { name: 'Generic Eatery', primaryType: 'restaurant', dishEvidence: null, _distKm: 2 },        // weak
      { name: 'Pho Stop', primaryType: 'vietnamese_restaurant', dishEvidence: null, _distKm: 3 },     // cuisine
      { name: 'Pho 99', primaryType: 'vietnamese_restaurant', dishEvidence: 'reviews', _distKm: 1 },  // reviews
      { name: 'Phở Hà Nội House', primaryType: 'restaurant', dishEvidence: 'name', _distKm: 1 },       // name
    ];
    const r = gateDishVenues(venues, { cuisineSlugs: ['vietnamese'], maxKm: 50 });
    expect(r.kept.map((v) => v.dishTier)).toEqual(['name', 'reviews', 'cuisine', 'weak']);
    expect(r.empty).toBe(false);
  });
  it('for a KNOWN cuisine, drops only off-cuisine no-evidence venues (generic stays as weak)', () => {
    const venues = [
      { name: 'Sushi Hana', primaryType: 'japanese_restaurant', dishEvidence: null, _distKm: 2 },  // wrong cuisine for a Thai search
      { name: 'Corner Restaurant', primaryType: 'restaurant', dishEvidence: null, _distKm: 2 },     // generic → weak (kept)
    ];
    const r = gateDishVenues(venues, { cuisineSlugs: ['thai'], maxKm: 50 });
    expect(r.kept.map((v) => v.name)).toEqual(['Corner Restaurant']);
    expect(r.droppedCuisine).toBe(1);
  });
  it('dish evidence overrides cuisine — a name match survives even if off-cuisine-typed', () => {
    const venues = [{ name: 'Khachapuri Corner', primaryType: 'chinese_restaurant', dishEvidence: 'name', _distKm: 3 }];
    const r = gateDishVenues(venues, { cuisineSlugs: ['georgian'], maxKm: 50 });
    expect(r.kept).toHaveLength(1);
    expect(r.kept[0].dishTier).toBe('name');
  });
  it('no cuisine selected → no cuisine gating, only the distance cap applies', () => {
    const venues = [
      { name: 'Far Place', primaryType: 'chinese_restaurant', dishEvidence: null, _distKm: 900 },
      { name: 'Near Place', primaryType: 'chinese_restaurant', dishEvidence: null, _distKm: 3 },
    ];
    const r = gateDishVenues(venues, { cuisineSlugs: [], maxKm: 50 });
    expect(r.kept.map((v) => v.name)).toEqual(['Near Place']);
  });
});
