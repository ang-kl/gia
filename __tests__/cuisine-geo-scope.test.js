// __tests__/cuisine-geo-scope.test.js — v0.61.442
//
// Pins the behaviour of the single geographic-scoping pass extracted from
// /api/cuisine/search (gate audit P4). Each test mirrors one of the four
// former inline filters so the extraction is provably behaviour-preserving:
// the 120 km hard gate, the JB-hybrid filter (+ JB→OTHER fallback), the
// OTHER country-keyword filter (+ stale-pref floor), and the SG
// mention/proximity filter.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { scopeVenuesByRegion, SG_CENTROID, JB_CENTROID } = require('../cuisine-geo-scope');
const { demoteNeverEmpty } = require('../pool-floor');

function v(props) {
  return { name: 'x', area: '', ...props };
}

// Real-ish injected deps; overridable per test.
function deps(over = {}) {
  return {
    demoteNeverEmpty,
    resolveCtxCountry: async () => null,
    countryTextMatch: {
      hasKeywordsFor: () => true,
      filterVenuesByCountry: (vs) => vs
    },
    locationMode: {
      isFarFromJB: () => false,
      haversineMeters: () => 100000,
      JB_CBD: { lat: 1.46, lng: 103.76 }
    },
    logger: { log: () => {}, warn: () => {} },
    ...over
  };
}

describe('120 km hard gate', () => {
  it('drops venues beyond 120 km, keeps within, keeps null distanceM', async () => {
    // isOther with no country-pref → pool passes through after the gate only.
    const venues = [
      v({ name: 'near', distanceM: 50000 }),
      v({ name: 'edge', distanceM: 120000 }),
      v({ name: 'far', distanceM: 130000 }),
      v({ name: 'nodist', distanceM: null })
    ];
    const r = await scopeVenuesByRegion({ venues, isOther: true, lat: 3.0, lng: 101.6, ...deps() });
    const names = r.venues.map((x) => x.name).sort();
    expect(names).toEqual(['edge', 'near', 'nodist']);
  });
});

describe('SG region (default branch)', () => {
  it('keeps singapore-text OR ≤30 km of the SG centroid; drops far non-SG', async () => {
    const venues = [
      v({ name: 'atCentroid', lat: SG_CENTROID.lat, lng: SG_CENTROID.lng }),
      v({ name: 'sgText', area: 'Somewhere, Singapore', lat: 9, lng: 9 }),  // far coords but text
      v({ name: 'klFar', lat: 3.139, lng: 101.687 })                        // KL, no text → drop
    ];
    const r = await scopeVenuesByRegion({ venues, isJB: false, isOther: false, lat: SG_CENTROID.lat, lng: SG_CENTROID.lng, ...deps() });
    const names = r.venues.map((x) => x.name).sort();
    expect(names).toEqual(['atCentroid', 'sgText']);
    expect(r.jbFallbackToOther).toBe(false);
  });
});

describe('JB region', () => {
  it('keeps johor-text OR ≤60 km of the JB centroid; drops singapore-tagged', async () => {
    const venues = [
      v({ name: 'johorText', area: 'Skudai, 81300, Johor' }),
      v({ name: 'nearJB', lat: JB_CENTROID.lat, lng: JB_CENTROID.lng }),
      v({ name: 'sgTagged', area: 'Singapore', lat: JB_CENTROID.lat, lng: JB_CENTROID.lng }), // near but SG-tagged → drop
      v({ name: 'klFar', lat: 3.139, lng: 101.687 })                                          // far, no johor → drop
    ];
    const r = await scopeVenuesByRegion({ venues, isJB: true, lat: 1.46, lng: 103.76, ...deps() });
    const names = r.venues.map((x) => x.name).sort();
    expect(names).toEqual(['johorText', 'nearJB']);
    expect(r.jbFallbackToOther).toBe(false);
  });

  it('JB→OTHER fallback: wiped at far coords restores the pool + defaults ctxCountry=MY', async () => {
    // 5 KL venues, no johor text, not near JB → JB filter wipes to 0.
    const venues = Array.from({ length: 5 }, (_, i) => v({ name: `kl${i}`, lat: 3.139, lng: 101.687 }));
    const r = await scopeVenuesByRegion({
      venues, isJB: true, lat: 3.13, lng: 101.68,
      ...deps({ locationMode: { isFarFromJB: () => true, haversineMeters: () => 250000, JB_CBD: { lat: 1.46, lng: 103.76 } } })
    });
    expect(r.jbFallbackToOther).toBe(true);
    expect(r.ctxCountry).toBe('MY');
    expect(r.venues.length).toBe(5);   // country filter (stub keeps all MY) on the restored pool
  });

  it('does NOT fall back when the JB filter keeps some venues', async () => {
    const venues = [
      v({ name: 'johorText', area: 'Johor Bahru' }),
      ...Array.from({ length: 5 }, (_, i) => v({ name: `kl${i}`, lat: 3.139, lng: 101.687 }))
    ];
    const r = await scopeVenuesByRegion({
      venues, isJB: true, lat: 1.46, lng: 103.76,
      ...deps({ locationMode: { isFarFromJB: () => true, haversineMeters: () => 0, JB_CBD: {} } })
    });
    expect(r.jbFallbackToOther).toBe(false);
    expect(r.venues.map((x) => x.name)).toEqual(['johorText']);
  });
});

describe('OTHER region — country-keyword filter + stale-pref floor', () => {
  it('applies the country filter when keywords exist', async () => {
    const venues = [v({ name: 'a' }), v({ name: 'b' }), v({ name: 'c' })];
    const r = await scopeVenuesByRegion({
      venues, isOther: true, lat: 3, lng: 101,
      ...deps({
        resolveCtxCountry: async () => 'MY',
        countryTextMatch: { hasKeywordsFor: () => true, filterVenuesByCountry: (vs) => vs.filter((x) => x.name !== 'c') }
      })
    });
    expect(r.venues.map((x) => x.name)).toEqual(['a', 'b']);
    expect(r.ctxCountry).toBe('MY');
  });

  it('stale-pref floor: keeps the coord-pinned pool when the filter would empty it', async () => {
    const venues = [v({ name: 'a' }), v({ name: 'b' })];
    const r = await scopeVenuesByRegion({
      venues, isOther: true, lat: 3, lng: 101,
      ...deps({
        resolveCtxCountry: async () => 'MY',
        countryTextMatch: { hasKeywordsFor: () => true, filterVenuesByCountry: () => [] }   // empties
      })
    });
    expect(r.venues.map((x) => x.name)).toEqual(['a', 'b']);   // floored back to the pool
  });

  it('no keywords for the country → pool unchanged', async () => {
    const venues = [v({ name: 'a' }), v({ name: 'b' })];
    const r = await scopeVenuesByRegion({
      venues, isOther: true, lat: 3, lng: 101,
      ...deps({ resolveCtxCountry: async () => 'XX', countryTextMatch: { hasKeywordsFor: () => false, filterVenuesByCountry: () => [] } })
    });
    expect(r.venues.length).toBe(2);
  });

  it('ctxCountry === SG → country filter skipped (pool unchanged)', async () => {
    const venues = [v({ name: 'a' }), v({ name: 'b' })];
    const called = { n: 0 };
    const r = await scopeVenuesByRegion({
      venues, isOther: true, lat: 1.35, lng: 103.8,
      ...deps({ resolveCtxCountry: async () => 'SG', countryTextMatch: { hasKeywordsFor: () => true, filterVenuesByCountry: () => { called.n++; return []; } } })
    });
    expect(r.venues.length).toBe(2);
    expect(called.n).toBe(0);
  });
});

describe('defensive', () => {
  it('non-array venues → empty result', async () => {
    const r = await scopeVenuesByRegion({ venues: null, isOther: true, lat: 3, lng: 101, ...deps() });
    expect(r.venues).toEqual([]);
  });
  it('a thrown country-pref read does not crash the pass (SG-like fall-through)', async () => {
    const venues = [v({ name: 'a' })];
    const r = await scopeVenuesByRegion({
      venues, isOther: true, lat: 3, lng: 101,
      ...deps({ resolveCtxCountry: async () => { throw new Error('redis down'); } })
    });
    expect(r.venues.length).toBe(1);   // no ctxCountry → no filter
  });
});
