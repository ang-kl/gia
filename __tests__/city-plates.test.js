// __tests__/city-plates.test.js — v0.62.32
//
// Arrival Plate registry invariants: every row sourced, honest tiers,
// histories bounded, geo lookup correct, and the dish-name guard knows
// every plate dish.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const cp = require('../city-plates.js');
const dd = require('../discovery-dish.js');

const TIERS = new Set(['city-icon', 'regional', 'national-classic']);

describe('city-plates — schema invariants (the source-of-truth rules)', () => {
  it('every dish row has tier, claim, history.en+fr, and ≥1 named source', () => {
    for (const [city, entry] of Object.entries(cp.CITY_PLATES)) {
      expect(entry.country, city).toMatch(/^[A-Z]{2}$/);
      expect(entry.dishes.length, city).toBeGreaterThan(0);
      for (const d of entry.dishes) {
        const tag = `${city}: ${d.dish}`;
        expect(TIERS.has(d.tier), tag + ' tier').toBe(true);
        expect(typeof d.claim, tag + ' claim').toBe('string');
        expect(d.history?.en?.length, tag + ' history.en').toBeGreaterThan(20);
        expect(d.history?.fr?.length, tag + ' history.fr').toBeGreaterThan(20);
        // fact-card budget: ≤ ~60 words
        expect(d.history.en.split(/\s+/).length, tag + ' history length').toBeLessThanOrEqual(60);
        expect(Array.isArray(d.sources) && d.sources.length >= 1, tag + ' sources').toBe(true);
        for (const s of d.sources) expect(typeof s.name, tag + ' source name').toBe('string');
      }
    }
  });

  it('disputed origins name both claimants (pavlova both sides; BKT both sides)', () => {
    const syd = cp.platesForCity('Sydney').dishes.find((d) => d.dish === 'Pavlova');
    const akl = cp.platesForCity('Auckland').dishes.find((d) => d.dish === 'Pavlova');
    expect(syd.claim).toMatch(/AU.*NZ|NZ.*AU/);
    expect(akl.claim).toMatch(/AU.*NZ|NZ.*AU/);
    const klang = cp.platesForCity('Klang').dishes.find((d) => /Bak kut teh/.test(d.dish));
    const sg = cp.platesForCity('Singapore').dishes.find((d) => /Bak kut teh/.test(d.dish));
    expect(klang.claim.toLowerCase()).toContain('claim');
    expect(sg.claim.toLowerCase()).toContain('claim');
  });

  it('VN pass (v0.62.36): phở names both claimants; Tier-S rows carry their ICH/PDO source', () => {
    const pho = cp.platesForCity('Hanoi').dishes.find((d) => /Phở/.test(d.dish));
    expect(pho.claim).toMatch(/Nam Định/);
    expect(pho.history.en).toMatch(/Nam Định/);
    const bbh = cp.platesForCity('Hue').dishes.find((d) => /Bún bò Huế/.test(d.dish));
    // vi-language pass: the MOCST decision number is the FIRST source.
    expect(bbh.sources[0].name).toMatch(/2203\/QĐ-BVHTTDL/);
    expect(bbh.sources[0].lang).toBe('vi');
    expect(pho.sources[0].name).toMatch(/2328\/QĐ-BVHTTDL/);
    const mam = cp.platesForCity('Phu Quoc').dishes.find((d) => /Nước mắm/.test(d.dish));
    expect(mam.claim).toMatch(/PDO/);
    const caolau = cp.platesForCity('Hoi An').dishes.find((d) => /Cao lầu/.test(d.dish));
    expect(caolau.sources[0].url).toMatch(/vietnamtourism\.gov\.vn/);
  });

  it('the honesty test: Putrajaya is honestEmpty with only regional/national rows', () => {
    const p = cp.platesForCity('Putrajaya');
    expect(p.honestEmpty).toBe(true);
    for (const d of p.dishes) expect(d.tier).not.toBe('city-icon');
  });
});

describe('city-plates — geo lookup (platesNear)', () => {
  it('resolves the curated city for known centroids; null far away', () => {
    expect(cp.platesNear(43.0618, 141.3545)?.city).toBe('Sapporo');
    expect(cp.platesNear(21.0285, 105.8542)?.city).toBe('Hanoi');        // VN pass
    expect(cp.platesNear(10.8231, 106.6297)?.city).toBe('Ho Chi Minh City');
    expect(cp.platesNear(15.8801, 108.3380)?.city).toBe('Hoi An');       // ≠ Da Nang (~27 km)
    expect(cp.platesNear(2.9264, 101.6964)?.city).toBe('Putrajaya');
    expect(cp.platesNear(-27.4698, 153.0251)?.city).toBe('Brisbane');
    expect(cp.platesNear(0, 150)).toBe(null);          // open ocean
    expect(cp.platesNear(NaN, NaN)).toBe(null);        // defensive
  });
});

describe('dish-name guard — plate dishes can never become place anchors', () => {
  it('every plate dish (romanised + local script) is a known dish name', () => {
    for (const name of cp.allPlateDishNames()) {
      expect(dd.isKnownDishName(name), name).toBe(true);
    }
  });

  it('the operator log cases are guarded; genuine places are not', () => {
    expect(dd.isKnownDishName('Ikan patin tempoyak')).toBe(true);   // → was geocoded to Yishun
    expect(dd.isKnownDishName('Obanzai')).toBe(true);               // → was geocoded to a SG izakaya
    expect(dd.isKnownDishName('Jingisukan')).toBe(true);
    expect(dd.isKnownDishName('tiong bahru')).toBe(false);
    expect(dd.isKnownDishName('Legoland Malaysia')).toBe(false);
    expect(dd.isKnownDishName('Restoran Dapur Mars patin tempoyak')).toBe(false); // ≥2 extra tokens → venue name
  });
});

describe('v0.62.37 — overlay classics + D792 city tie-in', () => {
  it('classicsForCountry: SG >150, MY ≥28, unknown → null', () => {
    expect(cp.classicsForCountry('SG').length).toBeGreaterThan(150);
    expect(cp.classicsForCountry('MY').length).toBeGreaterThanOrEqual(28);
    expect(cp.classicsForCountry('XX')).toBe(null);
  });

  it('plate classics dedupe the curated rows (no bare chicken-rice next to Hainanese chicken rice)', () => {
    const sg = cp.platesForCity('Singapore');
    expect(Array.isArray(sg.classics)).toBe(true);
    const folded = sg.classics.map((s) => s.toLowerCase());
    expect(folded.some((s) => s.includes('chicken rice'))).toBe(false);
  });

  it('honestEmpty Putrajaya still carries the national classics list', () => {
    const pj = cp.platesNear(2.9264, 101.6964);
    expect(pj.honestEmpty).toBe(true);
    expect(pj.classics.length).toBeGreaterThan(20);
  });

  it('findCityPlateDish: name > reviews ladder against the Hoi An plate; misses stay null', () => {
    const hoian = cp.platesForCity('Hoi An').dishes;
    expect(dd.findCityPlateDish({ name: 'Cao Lầu Bá Lễ' }, hoian))
      .toEqual({ dish: 'Cao lầu', tier: 'city-icon', evidence: 'name' });
    expect(dd.findCityPlateDish({ name: 'Random Eatery', reviews: [{ text: 'the cao lau here is the real deal' }] }, hoian))
      .toEqual({ dish: 'Cao lầu', tier: 'city-icon', evidence: 'reviews' });
    expect(dd.findCityPlateDish({ name: 'Pizza Corner', reviews: [{ text: 'great margherita' }] }, hoian)).toBe(null);
    expect(dd.findCityPlateDish(null, hoian)).toBe(null);
  });

  it('overlay classics names are already guarded dish names (spot checks)', () => {
    expect(dd.isKnownDishName('bak chor mee')).toBe(true);
    expect(dd.isKnownDishName('kaya toast')).toBe(true);
  });
});
