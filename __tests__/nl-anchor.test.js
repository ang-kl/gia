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
    // v0.62.945 — scopeToPlace: a building/road narrows to inside + 150 m, anything else is
    // filterToAnchor's 1.5 km circle exactly as before (pinned below).
    expect(body).toMatch(/if \(nlPlan\.anchored\) \{[\s\S]{0,200}nlAnchor\.scopeToPlace\(venues, nlPlan\)/);
    const plan = nl.planNlSearch({ place: RAFFLES_CITY, userLat: USER.lat, userLng: USER.lng });
    const pool = [{ placeId: 'a', lat: 1.2945, lng: 103.854 }, { placeId: 'far', lat: 1.2494, lng: 103.8303 }];
    expect(nl.scopeToPlace(pool, plan).venues).toEqual(nl.filterToAnchor(pool, plan));
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

// v0.62.945 — spec doc/Feature/2026-10-26-ai-place-building-scope.spec.md, I1 + I2. On 26-10 '26 the
// operator asked "New eateries in Raffles City" with the AI lever and the log read
// `radius=50000m` with no anchor: the AI reading carried no place. The chat path now asks the
// normal search's place detector when the model names none, and a building narrows to inside +
// 150 m.
describe('v0.62.945 — place fallback and building scope (chat question path)', () => {
  const RC_BUILDING = { name: 'Raffles City Shopping Centre', lat: 1.29372, lng: 103.85308, scope: 'building' };
  const OJEJE = { placeId: 'oj', name: 'OJEJE', area: '252 North Bridge Road, #B1-12 Raffles City Shopping Centre, Singapore 179103', lat: 1.293894, lng: 103.853120 };
  const CLOVE = { placeId: 'cl', name: 'CLOVE', area: '2 Stamford Road, Level 2 Swissôtel The Stamford, Singapore 178882', lat: 1.2933, lng: 103.85341 };
  const LPS = { placeId: 'lps', name: 'Lau Pa Sat stall', area: '18 Raffles Quay, Singapore 048582', lat: 1.280617, lng: 103.850486 };
  const NO_PLACE = { cuisines: [], filters: { newlyOpened: true }, location_override: '', source: 'claude-haiku' };
  function deps(over = {}) {
    const calls = { discover: [], deliver: [], detect: [], log: [] };
    const d = {
      consumeQuota: async () => true,
      infer: async () => NO_PLACE,
      cuisineNames: () => [],
      getUserLocation: async () => ({ lat: 1.2820, lng: 103.8530 }),
      geocode: async () => null,
      detectPlace: async (t) => { calls.detect.push(t); return /raffles city/i.test(t) ? RC_BUILDING : null; },
      discover: async (args) => { calls.discover.push(args); return [LPS, CLOVE, OJEJE]; },
      passesVenueFilter: () => true,
      applyNewness: async (venues) => ({ venues, noProvenNew: false }),
      applyRatingFloor: async (venues) => venues,
      regionCodeFor: () => 'SG',
      askLocation: async () => {},
      deliver: async (out) => { calls.deliver.push(out); },
      log: (line) => { calls.log.push(line); },
      ...over,
    };
    return { d, calls };
  }

  it('I1 — a reading with no place still anchors at Raffles City through the detector', async () => {
    const { d, calls } = deps();
    await nl.answerQuestionWithTellGia({ text: 'New eateries in Raffles City', deps: d });
    expect(calls.detect).toEqual(['New eateries in Raffles City']);
    expect(calls.discover[0]).toMatchObject({ lat: RC_BUILDING.lat, lng: RC_BUILDING.lng, radius: 1500 });
    expect(calls.deliver[0].placeAnchor).toMatchObject({ name: 'Raffles City Shopping Centre' });
  });
  it('I2 — inside first, CLOVE beyond, Lau Pa Sat gone', async () => {
    const { d, calls } = deps();
    await nl.answerQuestionWithTellGia({ text: 'New eateries in Raffles City', deps: d });
    const out = calls.deliver[0];
    expect(out.venues.map((v) => v.placeId)).toEqual(['oj', 'cl']);
    expect(out.venues[1]._beyond).toBe('Raffles City Shopping Centre');
    expect(out.placeEmpty).toBeNull();
  });
  it('a venue the newness step adds (a curated row) is scoped too', async () => {
    const { d, calls } = deps({ applyNewness: async (venues) => ({ venues: [...venues, LPS], noProvenNew: false }) });
    await nl.answerQuestionWithTellGia({ text: 'New eateries in Raffles City', deps: d });
    expect(calls.deliver[0].venues.map((v) => v.placeId)).toEqual(['oj', 'cl']);
  });
  it('I3 — nothing inside or within 150 m → placeEmpty names the building, no venues', async () => {
    const { d, calls } = deps({ discover: async () => [LPS] });
    await nl.answerQuestionWithTellGia({ text: 'New eateries in Raffles City', deps: d });
    expect(calls.deliver[0].venues).toEqual([]);
    expect(calls.deliver[0].placeEmpty).toBe('Raffles City Shopping Centre');
  });
  it('the model\'s own place still wins over the detector', async () => {
    const { d, calls } = deps({ infer: async () => ({ ...NO_PLACE, location_override: 'Bugis' }), geocode: async () => ({ name: 'Bugis', lat: 1.3008, lng: 103.8559 }) });
    await nl.answerQuestionWithTellGia({ text: 'New eateries in Raffles City', deps: d });
    expect(calls.detect).toEqual([]);
    expect(calls.discover[0]).toMatchObject({ lat: 1.3008, lng: 103.8559 });
  });
  it('an area (no scope) keeps the 1.5 km circle', async () => {
    const { d, calls } = deps({ detectPlace: async () => ({ name: 'Tanjong Pagar', lat: 1.2766, lng: 103.8457, scope: null }), discover: async () => [LPS] });
    await nl.answerQuestionWithTellGia({ text: 'new food in Tanjong Pagar', deps: d });
    expect(calls.deliver[0].venues.map((v) => v.placeId)).toEqual(['lps']);
    expect(calls.deliver[0].placeEmpty).toBeNull();
  });
  it('I4 — one reading line, naming source and place and how it was found, no chat id', async () => {
    const { d, calls } = deps();
    await nl.answerQuestionWithTellGia({ text: 'New eateries in Raffles City', deps: d });
    expect(calls.log).toHaveLength(1);
    expect(calls.log[0]).toMatch(/D769 reading source=claude-haiku place="Raffles City Shopping Centre" via=detector scope=building new=true/);
  });
});
