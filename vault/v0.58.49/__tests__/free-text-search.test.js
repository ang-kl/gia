// __tests__/free-text-search.test.js — v0.57.27

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fts = require('../free-text-search.js');

const USER = { lat: 1.2840, lng: 103.8510 }; // Raffles Place

function venueAt(name, lat, lng, area = 'Singapore') {
  return { name, lat, lng, area, placeId: 'p_' + name.replace(/\s+/g, '_').toLowerCase() };
}

describe('haversineM', () => {
  it('returns null for missing coords', () => {
    expect(fts.haversineM(USER, {})).toBe(null);
    expect(fts.haversineM({}, USER)).toBe(null);
  });

  it('returns ~0 for the same point', () => {
    expect(fts.haversineM(USER, USER)).toBe(0);
  });

  it('returns a sensible meter distance for SG points', () => {
    // Raffles Place → Marina Bay Sands ≈ 1.4 km
    const mbs = { lat: 1.2834, lng: 103.8607 };
    const d = fts.haversineM(USER, mbs);
    expect(d).toBeGreaterThan(800);
    expect(d).toBeLessThan(2500);
  });
});

describe('filterFreeTextResults', () => {
  it('returns [] for empty / null input', () => {
    expect(fts.filterFreeTextResults([], USER)).toEqual([]);
    expect(fts.filterFreeTextResults(null, USER)).toEqual([]);
  });

  it('returns [] when user location is missing', () => {
    const c = [venueAt('A', 1.28, 103.85)];
    expect(fts.filterFreeTextResults(c, {})).toEqual([]);
  });

  it('attaches distanceM + walkMinutes', () => {
    const c = [venueAt('Near', 1.2841, 103.8511)];
    const out = fts.filterFreeTextResults(c, USER);
    expect(out).toHaveLength(1);
    expect(typeof out[0].distanceM).toBe('number');
    expect(typeof out[0].walkMinutes).toBe('number');
  });

  it('drops venues farther than 80 km from the user', () => {
    // ~120 km away
    const c = [venueAt('Far Away', 2.5, 105.0)];
    expect(fts.filterFreeTextResults(c, USER)).toEqual([]);
  });

  it('keeps SG-mentioning venues even without coords', () => {
    const c = [{ name: 'Hawker', area: 'Singapore', placeId: 'h' }];
    // No lat/lng → distanceM null → passes the distance gate;
    // SG mention in area → passes the SG gate.
    const out = fts.filterFreeTextResults(c, USER);
    expect(out).toHaveLength(1);
  });

  it('drops MY venues outside 30 km of SG centroid that don\'t mention Singapore', () => {
    // KL is ~310 km from SG centroid
    const c = [venueAt('KLCC', 3.158, 101.711, 'Kuala Lumpur')];
    expect(fts.filterFreeTextResults(c, USER)).toEqual([]);
  });

  it('sorts by distanceM ascending', () => {
    const c = [
      venueAt('Far',  1.30, 103.90), // ~5 km from user
      venueAt('Near', 1.285, 103.852), // ~200 m from user
      venueAt('Mid',  1.295, 103.860)  // ~1.5 km from user
    ];
    const out = fts.filterFreeTextResults(c, USER);
    expect(out.map((v) => v.name)).toEqual(['Near', 'Mid', 'Far']);
  });

  it('caps results at the default limit (5)', () => {
    const c = Array.from({ length: 12 }, (_, i) =>
      venueAt(`v${i}`, 1.284 + i * 0.0005, 103.851)
    );
    expect(fts.filterFreeTextResults(c, USER)).toHaveLength(5);
  });

  it('honours opts.limit override', () => {
    const c = Array.from({ length: 12 }, (_, i) =>
      venueAt(`v${i}`, 1.284 + i * 0.0005, 103.851)
    );
    expect(fts.filterFreeTextResults(c, USER, { limit: 3 })).toHaveLength(3);
  });
});

describe('runFreeTextSearch / handler is LLM-free (structural)', () => {
  // Source-level assertion: the bot.on('message') free-text branch in
  // index.js must not import or call gatekeep / classifyIntent. This
  // is a structural guard against regression.
  const fs = require('fs');
  const idx = fs.readFileSync(require.resolve('../index.js'), 'utf8');

  // Find the bot.on('message') block.
  const start = idx.indexOf("bot.on('message'");
  const end = idx.indexOf("\n});", start);
  const block = start >= 0 && end > start ? idx.slice(start, end) : '';

  it('the bot.on(\'message\') block does not call gatekeep()', () => {
    expect(block).not.toMatch(/\bgatekeep\s*\(/);
  });

  it('the bot.on(\'message\') block does not call classifyIntent()', () => {
    expect(block).not.toMatch(/\bclassifyIntent\s*\(/);
  });

  it('the bot.on(\'message\') block calls runFreeTextSearch', () => {
    expect(block).toMatch(/runFreeTextSearch\s*\(/);
  });
});
