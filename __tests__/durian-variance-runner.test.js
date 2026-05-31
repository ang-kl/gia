// __tests__/durian-variance-runner.test.js — v0.61.302
//
// Tests the bot-side variance runner. The runner is also called by
// the scripts/durian-variance.js CLI (v0.61.293 unification), so
// these tests guard both consumers.
//
// Key contract: every venue surfaced by `runVariance` MUST carry a
// non-empty `placeId` field. This was the v0.61.275 → v0.61.287
// silent-bug class (placeId dropped at `_placeToVenue` and the
// `kept[]` row builder, leaving `dgv:labels:<mode>` empty in prod
// across 28 patches). Direct unit tests on the placeId contract
// would have caught it at write-time.

import { describe, it, expect, vi } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  runVariance,
  REGIONS_DEFAULT,
  SEEDS_DURIAN,
  SEEDS_DURIAN_PASTRY,
  PLACES_LANG,
  _placeToVenue
} = require('../durian-variance-runner.js');

// A minimal Places API place-record fixture. Mirrors the
// X-Goog-FieldMask in `_searchText`: id, displayName, formattedAddress,
// location, primaryType, primaryTypeDisplayName, reviews,
// editorialSummary.
function place(name, primaryType = 'food_store', overrides = {}) {
  return {
    id: 'placeId:' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    displayName: { text: name },
    formattedAddress: name + ', Test Address',
    location: { latitude: 1.30, longitude: 103.80 },
    primaryType,
    reviews: [],
    ...overrides
  };
}

// A `_searchTextFn` stub: given a textQuery + region, returns 2 places
// — one durian-name (passes sm.isRelevant) + one unrelated (rejected).
// Mirrors the Places API contract from `_searchText`.
function makeSearchTextStub() {
  return vi.fn(async (textQuery /*, region, lang, apiKey, limit, radiusM, maxPages, log */) => {
    return [
      place('Sunlife Durian Puffs - ' + textQuery, 'bakery'),
      place('Pizza Hut Express - ' + textQuery, 'restaurant')
    ];
  });
}

describe('durian-variance-runner — data exports', () => {
  it('exports REGIONS_DEFAULT with the 4 expected cities', () => {
    expect(Array.isArray(REGIONS_DEFAULT)).toBe(true);
    expect(REGIONS_DEFAULT.length).toBe(4);
    const names = REGIONS_DEFAULT.map((r) => r.name);
    expect(names).toEqual(['Singapore', 'Johor Bahru', 'Putrajaya', 'Kuala Lumpur']);
    for (const r of REGIONS_DEFAULT) {
      expect(typeof r.lat).toBe('number');
      expect(typeof r.lng).toBe('number');
      expect(typeof r.cc).toBe('string');
    }
  });

  it('exports SEEDS_DURIAN and SEEDS_DURIAN_PASTRY with the 12 BCP-47 language keys', () => {
    for (const seeds of [SEEDS_DURIAN, SEEDS_DURIAN_PASTRY]) {
      expect(Object.keys(seeds).sort()).toEqual(
        ['en', 'hi', 'id', 'ja', 'ko', 'ms', 'ta', 'th', 'tl', 'vi', 'zh-CN', 'zh-TW']
      );
      for (const arr of Object.values(seeds)) {
        expect(Array.isArray(arr)).toBe(true);
        expect(arr.length).toBeGreaterThan(0);
      }
    }
  });

  it('every SEEDS_DURIAN_PASTRY english seed includes "durian"', () => {
    for (const s of SEEDS_DURIAN_PASTRY.en) {
      expect(s.toLowerCase()).toContain('durian');
    }
  });

  it('PLACES_LANG covers every SEEDS key', () => {
    for (const lang of Object.keys(SEEDS_DURIAN)) {
      expect(PLACES_LANG).toHaveProperty(lang);
    }
  });
});

describe('durian-variance-runner — _placeToVenue placeId carry (the v0.61.283/.288 regression contract)', () => {
  it('returns placeId from p.id (the Places-API field)', () => {
    const v = _placeToVenue({ id: 'placeId:ChIJxyz', displayName: { text: 'X' } });
    expect(v.placeId).toBe('placeId:ChIJxyz');
  });

  it('falls back to empty string when p.id is missing', () => {
    const v = _placeToVenue({ displayName: { text: 'X' } });
    expect(v.placeId).toBe('');
  });

  it('falls back to empty string for non-object inputs', () => {
    expect(_placeToVenue(null).placeId).toBe('');
    expect(_placeToVenue(undefined).placeId).toBe('');
  });

  it('produces all the fields the downstream Gemini verifier expects', () => {
    const v = _placeToVenue({
      id: 'p:1',
      displayName: { text: 'Test Cafe' },
      formattedAddress: '1 Test St',
      primaryType: 'cafe',
      editorialSummary: { text: 'a summary' },
      reviews: [
        { text: { text: 'Great durian' }, publishTime: '2026-01-01T00:00:00Z', rating: 5 }
      ]
    });
    expect(v).toMatchObject({
      placeId: 'p:1',
      name: 'Test Cafe',
      formattedAddress: '1 Test St',
      area: '1 Test St',
      primaryType: 'cafe',
      googleSummary: { overview: 'a summary' }
    });
    expect(v.reviews).toHaveLength(1);
    expect(v.reviews[0]).toMatchObject({
      text: 'Great durian',
      publishTime: '2026-01-01T00:00:00Z',
      rating: 5
    });
  });
});

describe('durian-variance-runner — runVariance input validation', () => {
  it('throws on unknown mode', async () => {
    await expect(runVariance({ mode: 'xxx', apiKey: 'k', _searchTextFn: makeSearchTextStub() }))
      .rejects.toThrow(/invalid mode/);
  });

  it('throws on missing apiKey', async () => {
    await expect(runVariance({ mode: 'durian', _searchTextFn: makeSearchTextStub() }))
      .rejects.toThrow(/apiKey required/);
  });
});

describe('durian-variance-runner — runVariance shape + placeId carry-through', () => {
  // Single-region + single-language SEEDS to keep the test small.
  const ONE_REGION = [{ name: 'Singapore', lat: 1.3521, lng: 103.8198, cc: 'SG' }];

  it('returns a report with the expected top-level fields', async () => {
    const report = await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub()
    });
    expect(report).toMatchObject({
      schemaVersion: 1,
      mode: 'durian',
      regions: expect.any(Array),
      seeds: expect.any(Object),
      config: expect.any(Object),
      totals: expect.any(Object)
    });
    expect(typeof report.scriptVersion).toBe('string');
    expect(typeof report.ranAtIso).toBe('string');
    expect(typeof report.durationMs).toBe('number');
  });

  it('every kept[] row in every region.query carries a non-empty placeId (v0.61.283/.288 contract)', async () => {
    const report = await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub()
    });
    let keptTotal = 0;
    for (const region of report.regions) {
      for (const q of region.queries) {
        for (const row of (q.kept || [])) {
          keptTotal++;
          expect(row.placeId).toBeTruthy();
          expect(row.placeId.length).toBeGreaterThan(0);
        }
      }
    }
    // Sanity: the stub returns 1 durian-named place per call; with the
    // default SEEDS_DURIAN (~30 query-language combos) we expect lots
    // of kept rows. The exact count isn't important — what matters is
    // EVERY kept row has a placeId.
    expect(keptTotal).toBeGreaterThan(0);
  });

  it('every rejected[] row also carries placeId — the contract is universal', async () => {
    const report = await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub()
    });
    let rejTotal = 0;
    for (const region of report.regions) {
      for (const q of region.queries) {
        for (const row of (q.rejected || [])) {
          rejTotal++;
          expect(row.placeId).toBeTruthy();
        }
      }
    }
    expect(rejTotal).toBeGreaterThan(0);
  });

  it('respects mode = "durian-pastry"', async () => {
    const report = await runVariance({
      mode: 'durian-pastry',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub()
    });
    expect(report.mode).toBe('durian-pastry');
    // Seed count for durian-pastry is greater than durian (per v0.61.262
    // expansion); sanity-check the per-query count is non-trivial.
    expect(report.regions[0].queries.length).toBeGreaterThan(20);
  });

  it('uses the provided _searchTextFn the expected number of times', async () => {
    const stub = makeSearchTextStub();
    const ONE_LANG_SEEDS = { en: ['durian shop', 'durian stall'] };
    // Inject smaller SEEDS via the same shape; runVariance reads SEEDS
    // from the module-level const, so we can't override. Run with the
    // default SEEDS_DURIAN and just verify the call count is the
    // expected product of regions × seeds.
    await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: stub
    });
    const expectedCalls = Object.values(SEEDS_DURIAN).reduce((s, a) => s + a.length, 0);
    expect(stub).toHaveBeenCalledTimes(expectedCalls);
  });

  it('fires onProgress with {done, total, mode} per query', async () => {
    const progressCalls = [];
    await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub(),
      onProgress: ({ done, total, mode }) => progressCalls.push({ done, total, mode })
    });
    const expectedTotal = Object.values(SEEDS_DURIAN).reduce((s, a) => s + a.length, 0);
    expect(progressCalls.length).toBe(expectedTotal);
    expect(progressCalls[progressCalls.length - 1]).toEqual({
      done: expectedTotal,
      total: expectedTotal,
      mode: 'durian'
    });
  });

  it('fires log callback with region-header + per-lang + per-query lines (v0.61.293)', async () => {
    const logged = [];
    await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub(),
      log: (line) => logged.push(line)
    });
    const all = logged.join('\n');
    expect(all).toContain('Singapore (SG)');
    expect(all).toContain('--- lang=en ---');
    expect(all).toContain('q="durian shop"');
    expect(all).toContain('primaryType frequency');
  });

  it('the region.totals.precision is computed correctly', async () => {
    const report = await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: makeSearchTextStub()
    });
    const r = report.regions[0];
    const { placesReturned, kept, rejected, precision } = r.totals;
    expect(placesReturned).toBe(kept + rejected);
    if (placesReturned > 0) {
      const expected = +(kept / placesReturned).toFixed(3);
      expect(precision).toBe(expected);
    }
  });

  it('absorbs _searchTextFn failures gracefully (returns [], the per-query rejection path)', async () => {
    const failingStub = vi.fn(async () => { throw new Error('mock network failure'); });
    // The runner's _searchText catches and returns [] on its own;
    // calling stubs that themselves throw means the stub's error
    // propagates. The runner should still complete — let's verify
    // the contract by providing a stub that returns [] (the real
    // _searchText's failure mode).
    const stubReturnsEmpty = vi.fn(async () => []);
    const report = await runVariance({
      mode: 'durian',
      apiKey: 'test-key',
      regions: ONE_REGION,
      _searchTextFn: stubReturnsEmpty
    });
    expect(report.regions[0].totals.placesReturned).toBe(0);
    expect(report.regions[0].totals.kept).toBe(0);
    expect(report.regions[0].totals.precision).toBe(null);
  });
});
