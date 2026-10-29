// __tests__/dish-home-cuisine.test.js — v0.62.945.
//
// Spec: doc/Feature/2026-10-26-ai-place-building-scope.spec.md (I5).
//
// Operator, 26-10 '26: typed "Varenyky dumplings" and got Kapitan (Slavic) plus four Chinese dumpling
// shops. The live log: `cuisineMetas.length=0` and `D793 dish-gate … offCuisine=0` — the search knew
// the dish but not its cuisine, so the off-cuisine gate had nothing to compare against. The five
// venues below are those five, with the primaryType Google gave them.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const dd = require('../discovery-dish');
const { gateDishVenues } = require('../dish-search-gate');

const KAPITAN = { name: 'Kapitan Restaurant | Authentic Slavic Cuisine', primaryType: 'eastern_european_restaurant', dishEvidence: null };
const YUEN_KEE = { name: 'Yuen Kee Dumpling 袁记云饺 - Vivocity', primaryType: 'dumpling_restaurant', dishEvidence: null };
const ZHANG_JI = { name: 'Zhang Ji Yun Jiao 张记云饺', primaryType: 'chinese_restaurant', dishEvidence: null };

describe('homeCuisinesForDish', () => {
  it('varenyky is Ukrainian', () => {
    expect(dd.homeCuisinesForDish('Varenyky dumplings')).toEqual(['ukrainian']);
  });
  it('a shared dish returns every cuisine that lists it', () => {
    expect(dd.homeCuisinesForDish('pierogi')).toEqual(expect.arrayContaining(['ukrainian', 'polish']));
  });
  it('whole words only, and nothing for an unlisted dish', () => {
    expect(dd.homeCuisinesForDish('salon')).toEqual([]);   // "salo" is Ukrainian; "salon" is not salo
    expect(dd.homeCuisinesForDish('laksa')).toEqual([]);
    expect(dd.homeCuisinesForDish('')).toEqual([]);
  });
});

describe('the gate with the home cuisine', () => {
  it('the operator\'s five: Kapitan stays, the Chinese dumpling shops go', () => {
    const r = gateDishVenues([KAPITAN, { ...YUEN_KEE }, { ...ZHANG_JI }], { cuisineSlugs: ['ukrainian'], maxKm: 100 });
    expect(r.kept.map((v) => v.name)).toEqual([KAPITAN.name]);
    expect(r.droppedCuisine).toBe(2);
  });
  it('a dumpling shop that does show the dish stays', () => {
    const r = gateDishVenues([{ ...YUEN_KEE, dishEvidence: 'reviews' }], { cuisineSlugs: ['ukrainian'], maxKm: 100 });
    expect(r.kept).toHaveLength(1);
  });
  it('a Chinese search keeps dumpling shops', () => {
    const r = gateDishVenues([{ ...YUEN_KEE }], { cuisineSlugs: ['chinese'], maxKm: 100 });
    expect(r.kept).toHaveLength(1);
  });
  it('no cuisine at all: the gate judges nothing, as before', () => {
    const r = gateDishVenues([{ ...YUEN_KEE }, { ...ZHANG_JI }], { cuisineSlugs: [], maxKm: 100 });
    expect(r.kept).toHaveLength(2);
  });
});

describe('index.js wiring', () => {
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  it('the query and the gate use the home cuisine when no cuisine is chosen', () => {
    expect(src).toMatch(/homeCuisinesForDish\(dishQueryTerm\)/);
    expect(src).toMatch(/cuisineQueries = homeNames\.map\(\(n\) => `\$\{ftQualifier\} \$\{n\}`/);
    expect(src).toMatch(/\(\(cuisines && cuisines\.length\) \? cuisines : dishHomeSlugs\)/);
  });
  it('a chosen cuisine wins (the lookup only runs with none)', () => {
    const at = src.indexOf('let dishHomeSlugs = [];');
    expect(src.slice(at, at + 400)).toMatch(/!\(Array\.isArray\(cuisines\) && cuisines\.length\)/);
  });
});
