// __tests__/place-to-venue.test.js
//
// v0.62.993 - spec doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Amendment 1, invariant I12:
// "Moving the place-to-venue mapping changes no search result."
//
// The mapping from a Google place to a Soleat venue used to sit inline inside discover(). Release 2 needs the same
// mapping for a single tapped place, so it gets a name (placeToVenue) and discover() calls it.
//
// HOW THIS FILE KNOWS NOTHING MOVED. fixtures/place-to-venue/golden.json is what discover() returned for
// fixtures/place-to-venue/places.json at main 79ce9b87, BEFORE the change, recorded by running the code with Google
// stood in for. Every assertion below compares against that record, and compares the JSON text as well as the
// values, because a deep comparison cannot see a field that changed position.

import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';

const require = createRequire(import.meta.url);
const axios = require('axios');
const pipeline = require('../pipeline.js');
const fixture = require('./fixtures/place-to-venue/places.json');
const golden = require('./fixtures/place-to-venue/golden.json');

const clone = (x) => JSON.parse(JSON.stringify(x));
const realPost = axios.post;
afterEach(() => { axios.post = realPost; delete process.env.GOOGLE_MAPS_API_KEY; });

// Stand in for Google: every POST answers with the fixture places, and the call is kept for inspection.
function standIn() {
  const calls = [];
  process.env.GOOGLE_MAPS_API_KEY = 'test-key-not-real';
  axios.post = async (url, body, cfg) => {
    calls.push({ url, body, headers: (cfg && cfg.headers) || {} });
    return { data: { places: clone(fixture.places) } };
  };
  return calls;
}
const runDiscover = () => pipeline.discover({
  lat: 1.29, lng: 103.85, cuisines: ['japanese'], radius: 1000, maxResults: 20, regionCode: 'SG', lang: 'en',
});

describe('the record itself is what it says it is', () => {
  it('holds four venues from six places: the one not operating and the one with no name are absent', () => {
    expect(fixture.places).toHaveLength(6);
    expect(golden.venues.map((v) => v.placeId)).toEqual([
      'ChIJtest0000000000000000001', 'ChIJtest0000000000000000002',
      'ChIJtest0000000000000000003', 'ChIJtest0000000000000000006',
    ]);
    expect(golden.recordedFrom).toBe('79ce9b87');
  });
  it('covers the branches that matter: a full record, a bare one, a legacy country key, a bar', () => {
    const byId = Object.fromEntries(golden.venues.map((v) => [v.placeId.slice(-1), v]));
    expect(Object.keys(golden.venues[0])).toHaveLength(27);
    expect(byId['1'].reviews).toHaveLength(2);          // the empty review is dropped by the mapping
    expect(byId['2'].primaryType).toBe('restaurant');   // the default when Google sends none
    expect(byId['3'].country).toBe('JP');               // read from short_name, the older key
    expect(byId['6'].primaryType).toBe('bar');
  });
});

describe('discover() still returns exactly what it returned before the mapping was named (I12)', () => {
  it('same venues, same values', async () => {
    standIn();
    expect(await runDiscover()).toEqual(golden.venues);
  });
  it('same JSON text, so no field was renamed, dropped, added or moved', async () => {
    standIn();
    expect(JSON.stringify(await runDiscover())).toBe(JSON.stringify(golden.venues));
  });
  it('still makes one searchText call for this request', async () => {
    const calls = standIn();
    await runDiscover();
    expect(calls).toHaveLength(golden.calls);
    expect(calls[0].url).toMatch(/places:searchText$/);
  });
});

describe('placeToVenue: the same mapping, by name', () => {
  it('is exported as a function', () => {
    expect(typeof pipeline.placeToVenue).toBe('function');
  });
  it('returns, for each place discover keeps, exactly the venue discover returned', () => {
    const byId = Object.fromEntries(fixture.places.map((p) => [p.id, p]));
    for (const want of golden.venues) {
      const got = pipeline.placeToVenue(clone(byId[want.placeId]));
      expect(got, want.name).toEqual(want);
      expect(JSON.stringify(got), `${want.name}: field order`).toBe(JSON.stringify(want));
    }
  });
  it('only maps: it does not drop a place that is not operating or has no name (that is discover\'s job)', () => {
    const shut = pipeline.placeToVenue(clone(fixture.places[3]));
    expect(shut.placeId).toBe('ChIJtest0000000000000000004');
    expect(shut.name).toBe('Shut Shophouse Cafe');
    const nameless = pipeline.placeToVenue(clone(fixture.places[4]));
    expect(nameless.placeId).toBe('ChIJtest0000000000000000005');
    expect(nameless.name).toBe('');
  });
  it('does not change the place it is given', () => {
    for (const p of fixture.places) {
      const before = clone(p);
      pipeline.placeToVenue(p);
      expect(p).toEqual(before);
    }
  });
  it('gives each call its own review list, so one card cannot change another', () => {
    const a = pipeline.placeToVenue(clone(fixture.places[0]));
    const b = pipeline.placeToVenue(clone(fixture.places[0]));
    expect(a.reviews).not.toBe(b.reviews);
    a.reviews.push({ text: 'x' });
    expect(b.reviews).toHaveLength(2);
  });
});

describe('the field list for a single place is the search\'s own field list', () => {
  it('is exported as text with no "places." prefix and no page token', () => {
    expect(typeof pipeline.PLACE_DETAILS_FIELD_MASK).toBe('string');
    const fields = pipeline.PLACE_DETAILS_FIELD_MASK.split(',');
    expect(fields.length).toBeGreaterThan(20);
    for (const f of fields) {
      expect(f, f).not.toMatch(/^places\./);
      expect(f, f).toMatch(/^[A-Za-z][A-Za-z.]*$/);
    }
    expect(fields).not.toContain('nextPageToken');
    expect(new Set(fields).size).toBe(fields.length);
  });
  it('equals, field for field and in order, the list discover really sends to Google', async () => {
    // Read off the request discover makes, not off the source: this is the list Google is actually asked for.
    const calls = standIn();
    await runDiscover();
    const sent = String(calls[0].headers['X-Goog-FieldMask']).split(',').filter((f) => f !== 'nextPageToken');
    expect(sent.length).toBeGreaterThan(20);
    for (const f of sent) expect(f, f).toMatch(/^places\./);
    expect(pipeline.PLACE_DETAILS_FIELD_MASK.split(',')).toEqual(sent.map((f) => f.replace(/^places\./, '')));
  });
  it('asks for the fields the full card depends on', () => {
    const fields = pipeline.PLACE_DETAILS_FIELD_MASK.split(',');
    for (const f of ['id', 'displayName', 'location', 'businessStatus', 'primaryType', 'reviews', 'priceRange',
      'addressComponents', 'utcOffsetMinutes', 'currentOpeningHours.periods', 'regularOpeningHours.periods']) {
      expect(fields, f).toContain(f);
    }
  });
});

describe('there is one mapping, not two', () => {
  // A second inline copy inside discover would pass every test above today and drift tomorrow.
  const src = fs.readFileSync(path.join(__dirname, '..', 'pipeline.js'), 'utf8');
  it('pipeline.js builds a venue from a place in exactly one place', () => {
    expect(src.match(/placeId: p\.id,/g) || []).toHaveLength(1);
    expect(src.match(/priceLevel: priceLevelToInt\(p\.priceLevel\),/g) || []).toHaveLength(1);
  });
  it('discover maps with the named function', () => {
    expect(src).toMatch(/\.map\(placeToVenue\)/);
  });
});
