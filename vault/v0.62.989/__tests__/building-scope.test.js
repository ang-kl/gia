// __tests__/building-scope.test.js — v0.62.945.
//
// Spec: doc/Feature/2026-10-26-ai-place-building-scope.spec.md (I2, I3, A1, A3, A5, A7).
//
// Operator, 26-10 '26, after "New eateries in Raffles City" came back as Marina One and Telok Ayer:
// "if the query is building specify the AI should query within building", and on how: "the card
// should show address first and then fill the rest within 150m outside with a tab the address as
// "beyond #### building/road"". Nothing inside and nothing within 150 m → say so, show nothing.
// Venue addresses and coordinates below are the operator's own curated rows (#1883).
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const bs = require('../building-scope');

const RAFFLES_CITY = { name: 'Raffles City Shopping Centre', lat: 1.29372, lng: 103.85308, scope: 'building' };
const OJEJE = { placeId: 'oj', name: 'OJEJE Singapore', area: '252 North Bridge Road, #B1-12 Raffles City Shopping Centre, Singapore 179103', lat: 1.293894, lng: 103.853120 };
const MAISON = { placeId: 'my', name: 'Maison Yoshoku', area: '252 N Bridge Rd, #03-43 Raffles City Shopping Centre, Singapore 179103', lat: 1.293920, lng: 103.853150 };
const CLOVE = { placeId: 'cl', name: 'CLOVE', area: '2 Stamford Road, Level 2 Swissôtel The Stamford, Singapore 178882', lat: 1.293300, lng: 103.853410 };
const LAU_PA_SAT = { placeId: 'lps', name: "Yamamoto's Hamburg", area: '18 Raffles Quay, Stall 96-103 Lau Pa Sat, Singapore 048582', lat: 1.280617, lng: 103.850486 };

describe('scopeFromTypes — building vs road vs area (A3)', () => {
  it('malls, hotels, food courts and addresses are buildings', () => {
    expect(bs.scopeFromTypes(['shopping_mall', 'point_of_interest', 'establishment'])).toBe('building');
    expect(bs.scopeFromTypes(['hotel', 'lodging'])).toBe('building');
    expect(bs.scopeFromTypes(['premise'])).toBe('building');
    expect(bs.scopeFromTypes(['street_address'])).toBe('building');
  });
  it('a road is a road', () => {
    expect(bs.scopeFromTypes(['route'])).toBe('road');
  });
  it('areas, stations, and a restaurant itself keep the 1.5 km search', () => {
    expect(bs.scopeFromTypes(['neighborhood', 'political'])).toBeNull();
    expect(bs.scopeFromTypes(['subway_station', 'transit_station'])).toBeNull();
    expect(bs.scopeFromTypes(['restaurant', 'food', 'point_of_interest', 'establishment'])).toBeNull();
    expect(bs.scopeFromTypes(['shopping_mall', 'restaurant'])).toBeNull();   // a named restaurant inside a mall
    expect(bs.scopeFromTypes([])).toBeNull();
    expect(bs.scopeFromTypes(undefined)).toBeNull();
  });
});

describe('addressInside — the address names the building or road', () => {
  it('matches the mall with or without its generic suffix', () => {
    expect(bs.addressInside(OJEJE.area, 'Raffles City Shopping Centre')).toBe(true);
    expect(bs.addressInside(OJEJE.area, 'Raffles City')).toBe(true);
    expect(bs.addressInside(CLOVE.area, 'Raffles City Shopping Centre')).toBe(false);
  });
  it('matches a road across abbreviations', () => {
    expect(bs.addressInside('165 Telok Ayer St, Singapore 068617', 'Telok Ayer Street')).toBe(true);
    expect(bs.addressInside(MAISON.area, 'North Bridge Road')).toBe(true);   // "N Bridge Rd"
    expect(bs.addressInside('32 Maxwell Rd', 'Telok Ayer Street')).toBe(false);
  });
  it('refuses a name too generic to mean anything once the suffix is gone', () => {
    expect(bs.addressInside('1 Plaza Road', 'The Plaza')).toBe(false);
  });
});

describe('I2 — inside first, then the 150 m ring tagged "beyond", nothing farther', () => {
  it('Raffles City: OJEJE and Maison inside, CLOVE beyond, Lau Pa Sat gone', () => {
    const r = bs.scopeVenues([LAU_PA_SAT, CLOVE, MAISON, OJEJE], RAFFLES_CITY);
    expect(r.venues.map((v) => v.placeId)).toEqual(['oj', 'my', 'cl']);
    expect(r.insideCount).toBe(2);
    expect(r.ringCount).toBe(1);
    expect(r.venues[0]._beyond).toBeUndefined();
    expect(r.venues[2]._beyond).toBe('Raffles City Shopping Centre');
    expect(r.empty).toBe(false);
  });
  it('the ring is 150 m: just inside kept, just outside dropped', () => {
    const near = { placeId: 'n', name: 'n', area: 'x', lat: RAFFLES_CITY.lat + 0.00130, lng: RAFFLES_CITY.lng };   // ~145 m
    const far = { placeId: 'f', name: 'f', area: 'x', lat: RAFFLES_CITY.lat + 0.00140, lng: RAFFLES_CITY.lng };    // ~156 m
    expect(bs.scopeVenues([near, far], RAFFLES_CITY).venues.map((v) => v.placeId)).toEqual(['n']);
  });
  it('an inside venue counts as inside even when its pin is off (address wins)', () => {
    const odd = { ...OJEJE, placeId: 'odd', lat: RAFFLES_CITY.lat + 0.01, lng: RAFFLES_CITY.lng };
    expect(bs.scopeVenues([odd], RAFFLES_CITY).venues.map((v) => v.placeId)).toEqual(['odd']);
  });
  it('a road scopes the same way (A7)', () => {
    const road = { name: 'Telok Ayer Street', lat: 1.2808, lng: 103.8486, scope: 'road' };
    const on = { placeId: 'on', name: 'on', area: '165 Telok Ayer St, Singapore 068617', lat: 1.2790, lng: 103.8480 };
    const off = { placeId: 'off', name: 'off', area: '1 Somewhere Rd', lat: 1.2900, lng: 103.8600 };
    const r = bs.scopeVenues([off, on], road);
    expect(r.venues.map((v) => v.placeId)).toEqual(['on']);
  });
});

describe('I3 + A5 — empty only when inside AND ring are empty', () => {
  it('only the ring has places → they are shown, tagged', () => {
    const r = bs.scopeVenues([CLOVE, LAU_PA_SAT], RAFFLES_CITY);
    expect(r.venues.map((v) => v.placeId)).toEqual(['cl']);
    expect(r.empty).toBe(false);
  });
  it('nothing inside or within 150 m → empty', () => {
    const r = bs.scopeVenues([LAU_PA_SAT], RAFFLES_CITY);
    expect(r.venues).toEqual([]);
    expect(r.empty).toBe(true);
  });
  it('an anchor without a building/road scope leaves the list untouched', () => {
    const area = { name: 'Tanjong Pagar', lat: 1.2766, lng: 103.8457, scope: null };
    const list = [LAU_PA_SAT, CLOVE];
    expect(bs.scopeVenues(list, area)).toEqual({ venues: list, insideCount: 0, ringCount: 0, empty: false, applied: false });
  });
});

describe('wiring — the normal search, the AI route, the cards', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  const app = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/App.jsx'), 'utf8');
  const card = readFileSync(join(__dirname, '..', 'web/cuisine/src/v2/components/ResultCard.jsx'), 'utf8');
  it('normal search: the detector hit carries scope onto the anchor, and the pool every later step reads is scoped', () => {
    expect(src).toMatch(/if \(rawPlaceHit && rawPlaceHit\.scope\) detectedPlaceAnchor = \{ \.\.\.detectedPlaceAnchor, scope: rawPlaceHit\.scope \}/);
    const at = src.indexOf("require('./building-scope').scopeVenues(trulyUnseen, detectedPlaceAnchor)");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(src.indexOf('let ringPool = trulyUnseen;'));
    expect(src).toMatch(/if \(placeScopeEmpty\) zeroReason = 'nothing-in-place';/);
    // the scoped list REPLACES the pool, not just gets logged
    expect(src.slice(at, at + 400)).toMatch(/trulyUnseen = scoped\.venues;/);
  });
  it('AI route: the detector fills in a missing place, and an empty building is reported', () => {
    expect(src).toMatch(/const det = await detectPlaceFromText\(text,/);
    expect(src).toMatch(/if \(det && nlAnchor\.acceptPlace\(det, lat, lng\)\.ok\) \{\s+acceptedPlace = det;/);
    expect(src).toMatch(/zeroReason: 'nothing-in-place', placeEmpty: nlPlaceEmpty/);
  });
  it('the geocode asks Google for types', () => {
    const vs = readFileSync(join(__dirname, '..', 'vibe-suggest.js'), 'utf8');
    expect((vs.match(/'places\.types'/g) || []).length).toBe(2);
  });
  it('Mini App: the "beyond" row and the empty message', () => {
    expect(card).toMatch(/venue\._beyond && \([\s\S]{0,200}tn\('card\.beyond', lang, \{ place: venue\._beyond \}\)/);
    expect(app).toMatch(/zr === 'nothing-in-place' && r\.placeEmpty \? 'zero\.nothingInPlace'/);
    expect(app).toMatch(/r\.zeroReason === 'nothing-in-place' && r\.placeEmpty\) \{ setZeroPlace\(r\.placeEmpty\); setZeroReasonKey\('zero\.nothingInPlace'\)/);
  });
  it('chat card: "↗ beyond {place}" in the reader\'s language', () => {
    const vt = require('../venue-templates');
    expect(vt.formatVenueBlock({ name: 'CLOVE', area: 'x', _beyond: 'Raffles City Shopping Centre' }, { lang: 'en' })).toContain('↗ beyond Raffles City Shopping Centre');
    expect(vt.formatVenueBlock({ name: 'CLOVE', area: 'x', _beyond: 'Raffles City' }, { lang: 'ko' })).toContain('↗ Raffles City 밖');
    expect(vt.formatVenueBlock({ name: 'OJEJE', area: 'x' }, { lang: 'en' })).not.toMatch(/beyond/);
  });
});
