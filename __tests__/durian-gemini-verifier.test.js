// __tests__/durian-gemini-verifier.test.js — v0.61.264
//
// Unit tests for durian-gemini-verifier.js. The Gemini SDK is mocked
// via the `_genAIFactory` test seam — no network, no GEMINI_API_KEY
// needed at test time.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  verifyKeptVenues,
  _flattenKeptVenues,
  _buildPrompt,
  _safeParseJson
} = require('../durian-gemini-verifier');

function makeReport(...venuesByRegion) {
  return {
    mode: 'durian-pastry',
    regions: venuesByRegion.map((venues, i) => ({
      name: `Region${i + 1}`,
      queries: [{
        seed: 'durian cake', lang: 'en',
        kept: venues, rejected: []
      }],
      totals: { placesReturned: venues.length, kept: venues.length, rejected: 0 },
      primaryTypeFrequency: {}
    })),
    totals: { placesReturned: 0, kept: 0, rejected: 0 }
  };
}

function v(name, primaryType, address = 'Singapore', reviews = []) {
  return {
    name, primaryType, formattedAddress: address,
    reviews: reviews.map((t) => ({ text: t, publishTime: '2026-01-01T00:00:00Z', rating: 5 }))
  };
}

function extractVenuesFromPrompt(prompt) {
  // The real prompt has a schema-spec bracket pair earlier in the
  // body; the venues array is appended LAST after "Venues:\n".
  const marker = 'Venues:';
  const idx = prompt.lastIndexOf(marker);
  const tail = prompt.slice(idx + marker.length);
  const start = tail.indexOf('[');
  const end = tail.lastIndexOf(']');
  return JSON.parse(tail.slice(start, end + 1));
}

function mockFactory(labelsByName) {
  return () => ({
    getGenerativeModel({ model }) {
      return {
        async generateContent(prompt) {
          const venuesJson = extractVenuesFromPrompt(prompt);
          const arr = venuesJson.map((v) => {
            const label = labelsByName[v.name] || 'specialist';
            return { id: v.id, label, confidence: 'high', reason: `mocked: ${label}` };
          });
          return { response: { text: () => JSON.stringify(arr) } };
        }
      };
    }
  });
}

describe('durian-gemini-verifier — helpers', () => {
  it('_flattenKeptVenues assigns sequential ids and pulls reviews', () => {
    const r = makeReport(
      [v('Sunlife Durian Puffs', 'bakery', 'Toa Payoh', ['great durian puff', 'best in town'])],
      [v('Emicakes', 'cake_shop', 'Bukit Batok', ['durian cake was amazing'])]
    );
    const flat = _flattenKeptVenues(r);
    expect(flat.length).toBe(2);
    expect(flat[0].id).toBe(1);
    expect(flat[0].region).toBe('Region1');
    expect(flat[0].name).toBe('Sunlife Durian Puffs');
    expect(flat[0].reviewSnippets.length).toBe(2);
    expect(flat[1].id).toBe(2);
    expect(flat[1].region).toBe('Region2');
  });

  it('_flattenKeptVenues caps review snippets to 3 per venue', () => {
    const r = makeReport([v('Many Reviews', 'cafe', 'SG', ['a', 'b', 'c', 'd', 'e'])]);
    const flat = _flattenKeptVenues(r);
    expect(flat[0].reviewSnippets.length).toBe(3);
  });

  it('_safeParseJson handles raw JSON', () => {
    const arr = _safeParseJson('[{"id":1,"label":"specialist"}]');
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[0].id).toBe(1);
  });

  it('_safeParseJson handles fenced markdown JSON', () => {
    const arr = _safeParseJson('```json\n[{"id":1,"label":"specialist"}]\n```');
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[0].label).toBe('specialist');
  });

  it('_safeParseJson handles JSON with leading prose', () => {
    const arr = _safeParseJson('Here are the labels:\n[{"id":1,"label":"unrelated"}]');
    expect(Array.isArray(arr)).toBe(true);
    expect(arr[0].label).toBe('unrelated');
  });

  it('_safeParseJson returns null on garbage', () => {
    expect(_safeParseJson('not json')).toBe(null);
    expect(_safeParseJson(null)).toBe(null);
  });

  it('_buildPrompt mentions fruit vs pastry contract distinctly', () => {
    const fruitPrompt = _buildPrompt('durian', [{ id: 1, name: 'X', primaryType: 'food_store', address: '', reviewSnippets: [] }]);
    const pastryPrompt = _buildPrompt('durian-pastry', [{ id: 1, name: 'Y', primaryType: 'bakery', address: '', reviewSnippets: [] }]);
    expect(fruitPrompt).toContain('FRESH DURIAN FRUIT');
    expect(pastryPrompt).toContain('DURIAN-FLAVORED PASTRIES');
  });
});

describe('durian-gemini-verifier — verifyKeptVenues', () => {
  it('labels venues end-to-end using mocked Gemini', async () => {
    const r = makeReport(
      [
        v('Sunlife Durian Puffs', 'bakery', 'Toa Payoh'),
        v('Ritz Apple Strudel', 'pastry_shop', 'Bugis Junction')
      ]
    );
    const out = await verifyKeptVenues({
      report: r,
      mode: 'durian-pastry',
      _genAIFactory: mockFactory({
        'Sunlife Durian Puffs': 'specialist',
        'Ritz Apple Strudel': 'unrelated'
      })
    });
    expect(out.totals.venues).toBe(2);
    expect(out.totals.specialist).toBe(1);
    expect(out.totals.unrelated).toBe(1);
    expect(out.totals.precisionStrict).toBe(0.5);
    expect(out.byRegion.Region1.specialist).toBe(1);
    expect(out.byRegion.Region1.unrelated).toBe(1);
    expect(out.venues[0].label).toBe('specialist');
    expect(out.venues[1].label).toBe('unrelated');
  });

  it('respects mode validation', async () => {
    const r = makeReport([v('X', 'food_store')]);
    await expect(verifyKeptVenues({
      report: r, mode: 'mango', _genAIFactory: mockFactory({})
    })).rejects.toThrow(/mode/);
  });

  it('requires apiKey when no factory provided', async () => {
    const r = makeReport([v('X', 'food_store')]);
    await expect(verifyKeptVenues({
      report: r, mode: 'durian'
    })).rejects.toThrow(/GEMINI_API_KEY/);
  });

  it('continues + records errors when one batch fails', async () => {
    const r = makeReport(
      [v('A', 'bakery'), v('B', 'bakery'), v('C', 'bakery'), v('D', 'bakery')]
    );
    // Mock that throws on the second batch only.
    let calls = 0;
    const factory = () => ({
      getGenerativeModel() {
        return {
          async generateContent(prompt) {
            calls++;
            if (calls === 2) throw new Error('mock batch 2 failure');
            const venuesJson = extractVenuesFromPrompt(prompt);
            return {
              response: {
                text: () => JSON.stringify(venuesJson.map((v) => ({
                  id: v.id, label: 'specialist', confidence: 'high', reason: 'ok'
                })))
              }
            };
          }
        };
      }
    });
    const out = await verifyKeptVenues({
      report: r, mode: 'durian-pastry',
      batchSize: 2, concurrency: 1,
      _genAIFactory: factory
    });
    expect(out.totals.venues).toBe(4);
    expect(out.totals.batches).toBe(2);
    expect(out.totals.batchFailures).toBe(1);
    expect(out.errors.length).toBe(1);
    expect(out.errors[0].error).toMatch(/mock batch 2/);
    // The failed-batch venues default to "unrelated" with low confidence
    // so the totals still add up to the input count.
    expect(out.totals.specialist + out.totals.occasional + out.totals.unrelated).toBe(4);
  });

  it('rolls up by-region precision', async () => {
    const r = makeReport(
      [v('SpecA', 'bakery'), v('UnrelA', 'cafe')],
      [v('SpecB', 'bakery'), v('SpecC', 'cake_shop')]
    );
    const out = await verifyKeptVenues({
      report: r,
      mode: 'durian-pastry',
      _genAIFactory: mockFactory({
        'SpecA': 'specialist',
        'UnrelA': 'unrelated',
        'SpecB': 'specialist',
        'SpecC': 'specialist'
      })
    });
    expect(out.byRegion.Region1.precisionStrict).toBe(0.5);
    expect(out.byRegion.Region2.precisionStrict).toBe(1.0);
  });

  it('progress callback is invoked for each batch', async () => {
    const r = makeReport([v('A', 'cafe'), v('B', 'cafe'), v('C', 'cafe')]);
    const seen = [];
    await verifyKeptVenues({
      report: r,
      mode: 'durian-pastry',
      batchSize: 1,
      concurrency: 1,
      onProgress: ({ done, total }) => { seen.push([done, total]); },
      _genAIFactory: mockFactory({})
    });
    expect(seen.length).toBe(3);
    expect(seen[seen.length - 1]).toEqual([3, 3]);
  });

  it('strict vs lenient precision counts both labels', async () => {
    const r = makeReport([
      v('Spec', 'bakery'),
      v('Occ', 'cafe'),
      v('Unrel', 'restaurant')
    ]);
    const out = await verifyKeptVenues({
      report: r,
      mode: 'durian-pastry',
      _genAIFactory: mockFactory({
        Spec: 'specialist', Occ: 'occasional', Unrel: 'unrelated'
      })
    });
    expect(out.totals.precisionStrict).toBeCloseTo(1 / 3, 5);
    expect(out.totals.precisionLenient).toBeCloseTo(2 / 3, 5);
  });
});

// v0.61.275 — Plan B: placeId must flow through the flatten + labelled
// pipeline so the cuisine-search post-filter can key its Redis label
// cache by placeId. Pre-v0.61.275 the verifier dropped placeId on the
// floor (only id, region, name, primaryType were forwarded).
describe('durian-gemini-verifier — placeId flow (v0.61.275)', () => {
  function makeReportWithPlaceIds(...venuesByRegion) {
    return {
      mode: 'durian-pastry',
      regions: venuesByRegion.map((venues, i) => ({
        name: `Region${i + 1}`,
        queries: [{ seed: 'durian cake', lang: 'en', kept: venues, rejected: [] }],
        totals: { placesReturned: venues.length, kept: venues.length, rejected: 0 },
        primaryTypeFrequency: {}
      })),
      totals: { placesReturned: 0, kept: 0, rejected: 0 }
    };
  }

  it('_flattenKeptVenues surfaces placeId on every output row', () => {
    const r = makeReportWithPlaceIds([
      { placeId: 'PID-AAA-001', name: 'Sunlife Durian Puffs', primaryType: 'bakery', formattedAddress: 'Toa Payoh', reviews: [] },
      { placeId: 'PID-AAA-002', name: 'Emicakes', primaryType: 'cake_shop', formattedAddress: 'Bukit Batok', reviews: [] }
    ]);
    const flat = _flattenKeptVenues(r);
    expect(flat[0].placeId).toBe('PID-AAA-001');
    expect(flat[1].placeId).toBe('PID-AAA-002');
  });

  it('_flattenKeptVenues defaults placeId to empty string when source is missing it', () => {
    const r = makeReportWithPlaceIds([
      { name: 'Anonymous Bakery', primaryType: 'bakery', formattedAddress: 'Somewhere', reviews: [] }
    ]);
    const flat = _flattenKeptVenues(r);
    expect(flat[0].placeId).toBe('');
  });

  it('verifyKeptVenues carries placeId through to labelled venues', async () => {
    const r = makeReportWithPlaceIds([
      { placeId: 'PID-BBB-001', name: 'Real Durian Specialist', primaryType: 'bakery', formattedAddress: 'X' },
      { placeId: 'PID-BBB-002', name: 'Ritz Apple Strudel', primaryType: 'pastry_shop', formattedAddress: 'Y' }
    ]);
    const factory = () => ({
      getGenerativeModel() {
        return {
          async generateContent(prompt) {
            const m = 'Venues:';
            const idx = prompt.lastIndexOf(m);
            const tail = prompt.slice(idx + m.length);
            const s = tail.indexOf('['), e = tail.lastIndexOf(']');
            const venues = JSON.parse(tail.slice(s, e + 1));
            return {
              response: {
                text: () => JSON.stringify(venues.map((v) => ({
                  id: v.id,
                  label: v.name === 'Real Durian Specialist' ? 'specialist' : 'unrelated',
                  confidence: 'high',
                  reason: 'mocked'
                })))
              }
            };
          }
        };
      }
    });
    const out = await verifyKeptVenues({
      report: r, mode: 'durian-pastry', _genAIFactory: factory
    });
    expect(out.venues.length).toBe(2);
    // Sorted by id; first row is the specialist
    expect(out.venues[0].placeId).toBe('PID-BBB-001');
    expect(out.venues[0].label).toBe('specialist');
    expect(out.venues[1].placeId).toBe('PID-BBB-002');
    expect(out.venues[1].label).toBe('unrelated');
  });

  it('failed-batch defaults still include placeId', async () => {
    const r = makeReportWithPlaceIds([
      { placeId: 'PID-CCC-001', name: 'A', primaryType: 'bakery', formattedAddress: 'X' },
      { placeId: 'PID-CCC-002', name: 'B', primaryType: 'bakery', formattedAddress: 'Y' }
    ]);
    // Factory that throws on every call
    const factory = () => ({
      getGenerativeModel() {
        return {
          async generateContent() { throw new Error('forced batch failure'); }
        };
      }
    });
    const out = await verifyKeptVenues({
      report: r, mode: 'durian-pastry', batchSize: 2, concurrency: 1, _genAIFactory: factory
    });
    expect(out.totals.batchFailures).toBe(1);
    expect(out.venues.length).toBe(2);
    expect(out.venues[0].placeId).toBe('PID-CCC-001');
    expect(out.venues[1].placeId).toBe('PID-CCC-002');
    // Failed venues default to unrelated/low.
    expect(out.venues[0].label).toBe('unrelated');
    expect(out.venues[0].reason).toMatch(/gemini batch failed/);
  });
});
