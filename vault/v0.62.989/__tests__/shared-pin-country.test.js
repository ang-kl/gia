// __tests__/shared-pin-country.test.js — v0.62.939
//
// The third path Codex named on #1870 ([AMD-232]): a GPS pin SHARED from abroad.
// `bot.on('location')` calls `setUserLocation(redis, chatId, lat, lng)` with no
// opts, and location-cache.js stamps `region: 'OTHER'` when the pin is outside
// the 120 km SG gate — but no country, so `resolveRegionCode` read it as 'SG'
// and the chat free-text anchor fell back to Singapore. v0.62.938 fixed
// `/location <place>` and the recent pick; this closes the share-pin path.
//
// Operator's choice (17-10 '26): the FREE offline lookup — the nearest of the
// 139 curated cities (city-centroids.js), accepted only when the pin lies
// inside that city's own `radiusM`. No paid reverse-geocode. A pin far from
// every curated city keeps the old shape: OTHER, no country.
//
// Every assertion goes through the real setUserLocation -> getUserLocation ->
// resolveRegionCode, not a source scan.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { setUserLocation, getUserLocation, inferCountryFromCoords } = require('../location-cache.js');
const { resolveRegionCode } = require('../region-code.js');

function makeRedisStub() {
  const store = new Map();
  return {
    isOpen: true,
    connect: async () => {},
    get: async (k) => (store.has(k) ? store.get(k) : null),
    set: async (k, v) => { store.set(k, v); },
    setEx: async (k, _ttl, v) => { store.set(k, v); },
    expire: async () => {},
    del: async (k) => { store.delete(k); },
  };
}

async function share(lat, lng, opts) {
  const redis = makeRedisStub();
  await setUserLocation(redis, 'chat-1', lat, lng, opts);
  return getUserLocation(redis, 'chat-1');
}

describe('a bare share-pin abroad gets the nearest curated city\'s country', () => {
  it('Ginza, Tokyo -> JP, and resolveRegionCode agrees', async () => {
    const loc = await share(35.6717, 139.765);
    expect(loc.region).toBe('OTHER');
    expect(loc.regionInferredFromCoords).toBe(true);
    expect(loc.country).toBe('JP');
    expect(loc.countryInferredFromCoords).toBe(true);
    expect(resolveRegionCode(loc)).toBe('JP');
  });

  it('Bangkok -> TH; Paris -> FR; Sydney -> AU', async () => {
    expect(resolveRegionCode(await share(13.7563, 100.5018))).toBe('TH');
    expect(resolveRegionCode(await share(48.8566, 2.3522))).toBe('FR');
    expect(resolveRegionCode(await share(-33.8688, 151.2093))).toBe('AU');
  });

  it('the defect, replayed as a property: OTHER + inferred country never resolves to SG', async () => {
    const loc = await share(35.6717, 139.765);
    expect(resolveRegionCode(loc)).not.toBe('SG');
  });
});

describe('what is deliberately NOT changed', () => {
  it('a pin inside the 120 km SG gate is left exactly as before: no region, no country', async () => {
    const loc = await share(1.3521, 103.8198);         // SG centroid
    expect(loc.region).toBeUndefined();
    expect(loc.country).toBeUndefined();
    expect(resolveRegionCode(loc)).toBe('SG');
    const jb = await share(1.4927, 103.7414);          // JB CBD, inside the gate
    expect(jb.region).toBeUndefined();
    expect(jb.country).toBeUndefined();
  });

  it('a caller that passes its own country keeps it; nothing is inferred over it', async () => {
    const loc = await share(35.6717, 139.765, { region: 'OTHER', country: 'KR', label: 'test' });
    expect(loc.country).toBe('KR');
    expect(loc.countryInferredFromCoords).toBeUndefined();
  });

  it('a caller that passes a country WITHOUT a region keeps its country when the OTHER stamp is inferred', async () => {
    // The only shape in which the `!payload.country` guard is reachable: the
    // coord-inferred branch runs (no region given) and a country is already
    // there. A mutation inferring unconditionally survived until this case
    // existed — the test above passes `region` too, so the branch never ran.
    const loc = await share(35.6717, 139.765, { country: 'KR' });
    expect(loc.region).toBe('OTHER');
    expect(loc.regionInferredFromCoords).toBe(true);
    expect(loc.country).toBe('KR');
    expect(loc.countryInferredFromCoords).toBeUndefined();
  });

  it('a caller that passes an explicit region but no country is not touched by the inference', async () => {
    // Explicit region means the caller took responsibility for the record; only the
    // coord-inferred branch adds a country. (v0.62.938 fixed the explicit callers.)
    const loc = await share(35.6717, 139.765, { region: 'OTHER', label: 'test' });
    expect(loc.regionInferredFromCoords).toBeUndefined();
    expect(loc.country).toBeUndefined();
  });

  it('a pin far from every curated city stays OTHER with no country', async () => {
    const loc = await share(-54.8, -68.3);              // Ushuaia: nothing curated within 45 km
    expect(loc.region).toBe('OTHER');
    expect(loc.country).toBeUndefined();
    expect(resolveRegionCode(loc)).toBe('SG');          // the pre-existing fallback, unchanged
  });
});

describe('inferCountryFromCoords (the exported rule the branch above calls)', () => {
  it('inside the nearest city radius -> that country', () => {
    expect(inferCountryFromCoords(35.6717, 139.765)).toBe('JP');
  });
  it('outside every city radius -> null', () => {
    expect(inferCountryFromCoords(-54.8, -68.3)).toBeNull();
  });
  it('never answers SG, even for a Singapore coordinate', () => {
    expect(inferCountryFromCoords(1.293116, 103.852013)).toBeNull();
  });
  it('invalid input -> null, never throws', () => {
    expect(inferCountryFromCoords(NaN, 1)).toBeNull();
    expect(inferCountryFromCoords(undefined, undefined)).toBeNull();
  });
});
