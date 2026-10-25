// __tests__/nl-anchor.test.js — v0.62.941.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md, invariant I1.
//
// The operator typed "What are the new eateries at Raffles City" into the Mini App's
// AI path on 25-10 '26 and got twelve places spread from Lengkok Bahru to Sentosa.
// The AI route called Places with `radius: 50000` whether or not a place was named,
// and Places Text Search treats that circle as a BIAS, not a restriction, so even a
// correct centre could not keep results near Raffles City. These tests pin both
// halves: the plan narrows to 1.5 km when a place resolves, and the results are
// held to that circle afterwards.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const nl = require('../nl-anchor.js');
const placeDetector = require('../place-detector.js');

// Raffles City Shopping Centre, and a user sitting in Tiong Bahru ~3 km away.
const RAFFLES_CITY = { name: 'Raffles City', lat: 1.2937, lng: 103.8531 };
const USER = { lat: 1.2847, lng: 103.8303 };

describe('constants', () => {
  it('uses the normal search\'s place radius, read from the same source', () => {
    expect(nl.NEARBY_RADIUS_M).toBe(placeDetector.NEARBY_RADIUS_M);
    expect(nl.NEARBY_RADIUS_M).toBe(1500);
  });
  it('keeps the AI route\'s previous radius for searches with no place', () => {
    expect(nl.NL_DEFAULT_RADIUS_M).toBe(50000);
  });
});

describe('acceptPlace — the AI route\'s existing SG/JB + 120 km rule, unchanged', () => {
  it('accepts a Singapore place near the user', () => {
    expect(nl.acceptPlace(RAFFLES_CITY, USER.lat, USER.lng).ok).toBe(true);
  });
  it('rejects a place outside the SG/JB box (Tokyo)', () => {
    const r = nl.acceptPlace({ name: 'Ginza', lat: 35.672, lng: 139.765 }, USER.lat, USER.lng);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('outside-sgjb');
  });
  it('rejects a place with no coordinates', () => {
    expect(nl.acceptPlace({ name: 'x' }, USER.lat, USER.lng).ok).toBe(false);
    expect(nl.acceptPlace(null, USER.lat, USER.lng).ok).toBe(false);
  });
  it('without a user fix, rejects by default (the Mini App route\'s historical behaviour)', () => {
    expect(nl.acceptPlace(RAFFLES_CITY, undefined, undefined).ok).toBe(false);
  });
  it('without a user fix, accepts an in-box place when the caller opts out (the chat path)', () => {
    expect(nl.acceptPlace(RAFFLES_CITY, undefined, undefined, { requireUserFix: false }).ok).toBe(true);
  });
});

describe('planNlSearch', () => {
  it('a resolved place centres the search on it at 1,500 m and yields a place pill', () => {
    const plan = nl.planNlSearch({ place: RAFFLES_CITY, userLat: USER.lat, userLng: USER.lng });
    expect(plan.anchored).toBe(true);
    expect(plan.lat).toBe(RAFFLES_CITY.lat);
    expect(plan.lng).toBe(RAFFLES_CITY.lng);
    expect(plan.radius).toBe(1500);
    expect(plan.placeAnchor).toMatchObject({ name: 'Raffles City', lat: RAFFLES_CITY.lat, lng: RAFFLES_CITY.lng });
  });
  it('no place keeps the user centre and the previous radius, with no pill', () => {
    const plan = nl.planNlSearch({ place: null, userLat: USER.lat, userLng: USER.lng });
    expect(plan.anchored).toBe(false);
    expect(plan.lat).toBe(USER.lat);
    expect(plan.radius).toBe(50000);
    expect(plan.placeAnchor).toBeNull();
  });
});

describe('filterToAnchor — Places only BIASES to the circle, so the circle is enforced after', () => {
  const plan = nl.planNlSearch({ place: RAFFLES_CITY, userLat: USER.lat, userLng: USER.lng });
  const near = { placeId: 'near', name: 'Near', lat: 1.2945, lng: 103.8540 };      // ~130 m
  const edge = { placeId: 'edge', name: 'Edge', lat: 1.3030, lng: 103.8531 };      // ~1.03 km
  const sentosa = { placeId: 'far', name: 'Sol & Ora', lat: 1.2494, lng: 103.8303 }; // ~5.5 km
  const harbour = { placeId: 'far2', name: 'Harbourfront', lat: 1.2653, lng: 103.8200 };

  it('drops what is outside 1.5 km', () => {
    const out = nl.filterToAnchor([sentosa, near, harbour, edge], plan);
    expect(out.map((v) => v.placeId)).toEqual(['near', 'edge']);
  });
  it('never empties: when nothing is inside, returns the pool nearest-first', () => {
    const out = nl.filterToAnchor([sentosa, harbour], plan);
    expect(out.length).toBe(2);
    // HarbourFront (~4.9 km) is nearer Raffles City than Sentosa (~5.5 km).
    expect(out.map((v) => v.placeId)).toEqual(['far2', 'far']);
  });
  it('is a no-op when the plan is not anchored', () => {
    const unanchored = nl.planNlSearch({ place: null, userLat: USER.lat, userLng: USER.lng });
    const pool = [sentosa, near];
    expect(nl.filterToAnchor(pool, unanchored)).toEqual(pool);
  });
  it('keeps venues with no coordinates rather than guessing', () => {
    const out = nl.filterToAnchor([{ placeId: 'nocoord', name: 'n' }, near], plan);
    expect(out.map((v) => v.placeId)).toEqual(['nocoord', 'near']);
  });
});

describe('buildNlQueries — moved out of the route verbatim, same queries as before', () => {
  // The pre-extraction code from /api/cuisine/nl-query (index.js, v0.62.940), copied
  // here verbatim (logging removed) as the reference the extraction must match.
  function referenceQueries({ text, cuisineNames, merged }) {
    const modifiers = [];
    if (merged.newlyOpened) modifiers.push('newly opened');
    if (merged.halal) modifiers.push('halal');
    if (merged.vegetarian) modifiers.push('vegetarian');
    let cuisineQueries;
    if (modifiers.length && cuisineNames.length) {
      cuisineQueries = cuisineNames.map((n) => `${modifiers.join(' ')} ${n}`);
    } else if (modifiers.length) {
      cuisineQueries = [modifiers.join(' ')];
    } else {
      cuisineQueries = cuisineNames;
    }
    if (typeof text === 'string') {
      const trimmed = text.trim();
      const looksBrand = trimmed.length >= 3 && trimmed.length <= 40
        && /[a-z]/i.test(trimmed)
        && trimmed.split(/\s+/).length <= 4;
      if (looksBrand && !cuisineQueries.some((q) => q && q.toLowerCase().includes(trimmed.toLowerCase()))) {
        cuisineQueries = [trimmed, ...cuisineQueries];
      }
    }
    try {
      const { expandDishAliases } = require('../dish-aliases');
      const alias = expandDishAliases(text);
      if (alias) {
        const trimmedLC = typeof text === 'string' ? text.trim().toLowerCase() : '';
        cuisineQueries = cuisineQueries.filter((q) => q && q.toLowerCase() !== trimmedLC);
        const fresh = alias.terms.filter(
          (t) => !cuisineQueries.some((q) => q && q.toLowerCase() === t.toLowerCase())
        );
        cuisineQueries = [...fresh, ...cuisineQueries];
      }
    } catch { /* same as the route */ }
    return cuisineQueries;
  }
  const CASES = [
    { text: 'What are the new eateries at Raffles City', cuisineNames: [], merged: { newlyOpened: true } },
    { text: 'sushi tei', cuisineNames: ['Japanese'], merged: {} },
    { text: 'dai lok mee', cuisineNames: ['Malaysian'], merged: {} },
    { text: 'halal vegetarian thai', cuisineNames: ['Thai'], merged: { halal: true, vegetarian: true } },
    { text: 'new halal korean bbq near bugis', cuisineNames: ['Korean'], merged: { newlyOpened: true, halal: true } },
    { text: 'ab', cuisineNames: [], merged: {} },
    { text: 'japanese', cuisineNames: ['Japanese'], merged: {} },
  ];
  for (const c of CASES) {
    it(`matches the pre-extraction route for "${c.text}"`, () => {
      expect(nl.buildNlQueries(c)).toEqual(referenceQueries(c));
    });
  }
});

// The module being right is not the route being right: the route must USE it. index.js
// exports nothing, so the AI route is read from source.
describe('/api/cuisine/nl-query uses the plan', () => {
  const { readFileSync } = require('fs');
  const { join } = require('path');
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  const at = src.indexOf("app.post('/api/cuisine/nl-query'");
  const body = src.slice(at, src.indexOf("app.get('/api/oversight/stats'", at));
  it('plans from the accepted place', () => {
    expect(body).toMatch(/nlAnchor\.acceptPlace\(place, lat, lng\)/);
    expect(body).toMatch(/nlAnchor\.planNlSearch\(\{ place: acceptedPlace/);
  });
  it('searches at the plan\'s centre and radius — no hard-coded 50 km left', () => {
    expect(body).toMatch(/lat: nlPlan\.lat, lng: nlPlan\.lng, radius: nlPlan\.radius/);
    expect(body).not.toMatch(/radius: 50000/);
  });
  it('holds results to the circle when anchored, and returns the pill', () => {
    expect(body).toMatch(/if \(nlPlan\.anchored\) \{[\s\S]{0,200}nlAnchor\.filterToAnchor\(venues, nlPlan\)/);
    expect(body).toMatch(/placeAnchor: nlPlan\.placeAnchor/);
  });
  it('builds its queries with the shared function', () => {
    expect(body).toMatch(/nlAnchor\.buildNlQueries\(\{ text, cuisineNames, merged \}\)/);
  });
});

describe('isEmptyReading — the AI found nothing to search for', () => {
  it('empty reading', () => {
    expect(nl.isEmptyReading({ cuisines: [], filters: { newlyOpened: false, openNow: false, halal: false, vegetarian: false, homeBased: false, prices: [] }, location_override: '' })).toBe(true);
    expect(nl.isEmptyReading(null)).toBe(true);
  });
  it('a filter, a cuisine, a price or a place each count as a reading', () => {
    expect(nl.isEmptyReading({ cuisines: [], filters: { newlyOpened: true }, location_override: '' })).toBe(false);
    expect(nl.isEmptyReading({ cuisines: ['thai'], filters: {}, location_override: '' })).toBe(false);
    expect(nl.isEmptyReading({ cuisines: [], filters: { prices: ['$'] }, location_override: '' })).toBe(false);
    expect(nl.isEmptyReading({ cuisines: [], filters: {}, location_override: 'Raffles City' })).toBe(false);
  });
});
