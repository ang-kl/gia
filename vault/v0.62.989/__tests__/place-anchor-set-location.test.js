import { describe, it, expect } from 'vitest';
const pd = require('../place-detector.js');
const vs = require('../vibe-suggest.js');

// ⚠ THE DEFECT THIS FILE EXISTS FOR. Operator, 05-09 '26: location set to Tokyo,
// typed `銀座 いしだや` in the Cuisine TMA free-text bar, and the search ran in
// SINGAPORE and found nothing.
//
// `place-detector` was Singapore-only by construction, in three stacked ways:
//   1. its geocode called `vibe-suggest.geocodeQuery`, which glues " Singapore"
//      onto the query string — so Places was asked for "銀座 いしだや Singapore";
//   2. it then dropped any hit outside a hardcoded SG bounding box
//      (1.15–1.55 N, 103.55–104.10 E), which NO coordinate in Japan satisfies;
//   3. the region-aware variant that already existed mapped region 'OTHER' to the
//      suffix "Putrajaya, Malaysia" — and its own comment predicted this failure:
//      *"if other-country OTHER anchors are added, this branch will need
//      precinct-specific suffixes."* They were added. `city-centroids.js` carries
//      19 countries and 11 Japanese cities.
//
// The set country and centre had been available at the call site since v0.61.271
// and were never passed down. One datum, several call sites, only some of them
// asked — the shape this repo keeps re-finding.
//
// A geocode is a paid network call, so the detector takes a `_geocoder` seam and
// these tests inject one. What is asserted is WHICH call is made and WITH WHAT,
// which is where the bug lived.

const TOKYO = { lat: 35.6813, lng: 139.767066 };          // CITY_CENTROIDS['Tokyo']
const GINZA = { lat: 35.6717, lng: 139.7650, name: '銀座 いしだや', placeId: 'jp1', address: 'Ginza, Chuo City, Tokyo' };
const SG_NAMESAKE = { lat: 1.3005, lng: 103.8390, name: 'Ishidaya (SG)', placeId: 'sg1', address: 'Singapore' };

function spyGeocoder({ regionResult = GINZA, plainResult = SG_NAMESAKE } = {}) {
  const calls = [];
  return {
    calls,
    geocodeQueryRegion: async (text, opts) => { calls.push({ fn: 'region', text, opts }); return regionResult; },
    geocodeQuery: async (text) => { calls.push({ fn: 'plain', text }); return plainResult; },
  };
}

describe('place anchor respects the reader’s set location', () => {
  it('⚠ the operator’s exact query resolves in Tokyo, not Singapore', async () => {
    const g = spyGeocoder();
    const hit = await pd.detectPlaceName('銀座 いしだや', { ...TOKYO, countryCode: 'JP', _geocoder: g });
    expect(hit, 'no anchor resolved for the set country').toBeTruthy();
    expect(hit.lat).toBeCloseTo(GINZA.lat, 3);
    expect(hit.lng).toBeCloseTo(GINZA.lng, 3);
    // Not merely "a hit" — it must be nowhere near Singapore.
    expect(Math.abs(hit.lat - SG_NAMESAKE.lat)).toBeGreaterThan(10);
  });

  it('⚠ it asks Places for the COUNTRY, not for a suffix — and biases to the set centre', async () => {
    const g = spyGeocoder();
    await pd.detectPlaceName('銀座 いしだや', { ...TOKYO, countryCode: 'JP', _geocoder: g });
    const call = g.calls.at(-1);
    expect(call.fn, 'fell through to the " Singapore"-suffix geocode').toBe('region');
    expect(call.opts.countryCode).toBe('JP');
    expect(call.opts.biasCenter).toEqual({ lat: TOKYO.lat, lng: TOKYO.lng });
    expect(call.text, 'the query was mangled with a country name').toBe('銀座 いしだや');
  });

  it('⚠ CAN IT FIRE — without the set location the SG namesake still wins (the bug, pinned)', async () => {
    // This is the behaviour the operator hit, kept as a live demonstration rather
    // than described in a comment. Called with no country, the detector takes the
    // legacy path and anchors in Singapore.
    const g = spyGeocoder();
    const hit = await pd.detectPlaceName('銀座 いしだや', { _geocoder: g });
    expect(g.calls.at(-1).fn).toBe('plain');
    expect(hit.lat).toBeCloseTo(SG_NAMESAKE.lat, 3);
  });

  it('skips the Singapore-only rungs abroad — they can only answer wrongly', async () => {
    // STB precincts, the MRT table and the hawker vault are SG data. The hawker
    // matcher accepts an edit-distance score of 0.75, so a foreign name that
    // half-rhymes with a Singapore block could anchor a Tokyo search in Singapore.
    const g = spyGeocoder();
    await pd.detectPlaceName('Chinatown', { ...TOKYO, countryCode: 'JP', _geocoder: g });
    expect(g.calls.at(-1)?.fn, '"Chinatown" matched the SG precinct table while set to Japan').toBe('region');
  });

  it('SG behaviour is unchanged — same call, same box', async () => {
    const g = spyGeocoder();
    const hit = await pd.detectPlaceName('Ishidaya', { lat: 1.3, lng: 103.84, countryCode: 'SG', _geocoder: g });
    expect(g.calls.at(-1).fn, 'an SG reader was routed through the country path').toBe('plain');
    expect(hit.lat).toBeCloseTo(SG_NAMESAKE.lat, 3);
  });

  it('a hit outside the set country’s range is refused by DISTANCE, not by a bbox', () => {
    // A bounding box has to be authored per country and silently rejects every
    // country nobody added — which is precisely how the SG box rejected Japan.
    // Distance from the set centre needs no table and works everywhere.
    const near = { location: { latitude: 35.6717, longitude: 139.7650 } };
    const far  = { location: { latitude: 1.3005, longitude: 103.8390 } };
    expect(vs._pickNearestInRange([far, near], TOKYO, 300000)).toBe(near);
    expect(vs._pickNearestInRange([far], TOKYO, 300000), 'a Singapore hit was accepted for a Tokyo search').toBe(null);
    // With no limit the caller keeps its old "trust Places" behaviour.
    expect(vs._pickNearestInRange([far], TOKYO, undefined)).toBe(far);
  });
});
