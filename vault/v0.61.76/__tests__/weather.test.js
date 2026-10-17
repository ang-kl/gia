// __tests__/weather.test.js — v0.60.118
//
// Unit tests for the /weather expansion helpers in weather.js: SG-bounds
// guard, zone resolution, area-string resolution, the per-venue rain
// caveat, the head-out line, and the 24-hour "tonight" line. Pure
// functions only (no network); the cached fetchers wrap these.

import { describe, it, expect } from 'vitest';
import {
  inSgBounds, zoneKeyFor, zoneLabelFor,
  resolveArea, rainAlertFor, headOutLine, tonightOutlookFor,
  WEATHER_ZONE_CENTROIDS
} from '../weather.js';

// Stand-in for i18n tn(key, lang, vars) — echoes the key + vars so we
// can assert which branch fired.
const tn = (key, _lang, vars = {}) => `${key}|${JSON.stringify(vars)}`;

describe('inSgBounds', () => {
  it('accepts points inside Singapore', () => {
    expect(inSgBounds(1.2839, 103.8517)).toBe(true);   // city
    expect(inSgBounds(1.45, 103.82)).toBe(true);        // far north
  });
  it('rejects Johor / out-of-box / non-finite', () => {
    expect(inSgBounds(1.4927, 103.7414)).toBe(false);   // JB CBD — north of the 1.48 bound
    expect(inSgBounds(1.55, 103.8)).toBe(false);        // deep in Johor
    expect(inSgBounds(1.3, 104.2)).toBe(false);         // far east
    expect(inSgBounds(NaN, 103.8)).toBe(false);
    expect(inSgBounds(undefined, undefined)).toBe(false);
  });
});

describe('zoneKeyFor / zoneLabelFor', () => {
  it('maps points to the nearest of the 5 zones', () => {
    expect(zoneKeyFor(WEATHER_ZONE_CENTROIDS.west.lat, WEATHER_ZONE_CENTROIDS.west.lng)).toBe('west');
    expect(zoneKeyFor(WEATHER_ZONE_CENTROIDS.east.lat, WEATHER_ZONE_CENTROIDS.east.lng)).toBe('east');
    expect(zoneKeyFor(1.31, 103.84)).toBe('central');
    expect(zoneLabelFor(WEATHER_ZONE_CENTROIDS.north.lat, WEATHER_ZONE_CENTROIDS.north.lng)).toBe('North');
  });
});

describe('resolveArea', () => {
  const nowcast = {
    forecasts: [
      { area: 'Tampines', forecast: 'Thundery Showers', location: { latitude: 1.3496, longitude: 103.9568 } },
      { area: 'Jurong West', forecast: 'Fair', location: { latitude: 1.3490, longitude: 103.7220 } },
      { area: 'Ang Mo Kio', forecast: 'Cloudy', location: { latitude: 1.3700, longitude: 103.8500 } }
    ]
  };
  it('resolves an exact nowcast area name (case-insensitive)', () => {
    const r = resolveArea(nowcast, 'tampines');
    expect(r).toMatchObject({ name: 'Tampines' });
    expect(r.lat).toBeCloseTo(1.3496, 3);
  });
  it('resolves via substring', () => {
    expect(resolveArea(nowcast, 'jurong')).toMatchObject({ name: 'Jurong West' });
  });
  it('falls back to the 5 broad zones (incl. synonyms)', () => {
    expect(resolveArea(nowcast, 'east')).toMatchObject({ name: 'East' });
    expect(resolveArea(nowcast, 'CBD')).toMatchObject({ name: 'Central' });
    expect(resolveArea(nowcast, 'west side')).toMatchObject({ name: 'West' });
  });
  it('returns null for unknown / empty input', () => {
    expect(resolveArea(nowcast, 'narnia')).toBeNull();
    expect(resolveArea(nowcast, '')).toBeNull();
    expect(resolveArea(null, 'tampines')).toBeNull();
  });
});

describe('rainAlertFor', () => {
  const nowcastWet = { forecasts: [{ area: 'Bedok', forecast: 'Thundery Showers', location: { latitude: 1.324, longitude: 103.93 } }] };
  const nowcastFair = { forecasts: [{ area: 'Bedok', forecast: 'Partly Cloudy', location: { latitude: 1.324, longitude: 103.93 } }] };
  const rainfallDry = { stations: [{ id: 'S1', name: 'Bedok', lat: 1.324, lng: 103.93, value: 0 }] };
  const rainfallWet = { stations: [{ id: 'S1', name: 'Bedok', lat: 1.324, lng: 103.93, value: 3.2 }] };

  it('flags "raining now" from a >0.2mm rainfall station', () => {
    const line = rainAlertFor(nowcastFair, rainfallWet, 1.324, 103.93, 'en', tn);
    expect(line).toContain('weather.rainNowNear');
  });
  it('flags "showery 2h outlook" when dry now but nowcast is wet', () => {
    const line = rainAlertFor(nowcastWet, rainfallDry, 1.324, 103.93, 'en', tn);
    expect(line).toContain('weather.rainSoonNear');
    expect(line).toContain('Thundery Showers');
  });
  it('returns null on a fair outlook with no rain', () => {
    expect(rainAlertFor(nowcastFair, rainfallDry, 1.324, 103.93, 'en', tn)).toBeNull();
  });
  it('returns null outside SG bounds, or without a tn function', () => {
    expect(rainAlertFor(nowcastWet, rainfallWet, 1.4927, 103.7414, 'en', tn)).toBeNull(); // JB CBD — out of box
    expect(rainAlertFor(nowcastWet, rainfallWet, 1.6, 103.8, 'en', tn)).toBeNull();       // deep Johor
    expect(rainAlertFor(nowcastWet, rainfallWet, 1.324, 103.93, 'en', null)).toBeNull();  // no tn
  });
});

describe('headOutLine', () => {
  const at = { lat: 1.31, lng: 103.84 };
  it('"raining" when a station shows rain', () => {
    const fc = { forecasts: [{ area: 'City', forecast: 'Fair', location: { latitude: 1.31, longitude: 103.84 } }] };
    const rf = { stations: [{ id: 's', name: 'City', lat: 1.31, lng: 103.84, value: 1.0 }] };
    expect(headOutLine(fc, rf, at.lat, at.lng, 'en', tn)).toContain('weather.headOutRaining');
  });
  it('"showery" when dry but the 2h outlook is wet', () => {
    const fc = { forecasts: [{ area: 'City', forecast: 'Showers', location: { latitude: 1.31, longitude: 103.84 } }] };
    const rf = { stations: [{ id: 's', name: 'City', lat: 1.31, lng: 103.84, value: 0 }] };
    expect(headOutLine(fc, rf, at.lat, at.lng, 'en', tn)).toContain('weather.headOutShowery');
  });
  it('"good window" when fair', () => {
    const fc = { forecasts: [{ area: 'City', forecast: 'Partly Cloudy', location: { latitude: 1.31, longitude: 103.84 } }] };
    const rf = { stations: [{ id: 's', name: 'City', lat: 1.31, lng: 103.84, value: 0 }] };
    expect(headOutLine(fc, rf, at.lat, at.lng, 'en', tn)).toContain('weather.headOutGood');
  });
  it('null when there is no forecast at all', () => {
    expect(headOutLine(null, null, at.lat, at.lng, 'en', tn)).toBeNull();
  });
});

describe('tonightOutlookFor', () => {
  // Two periods; the second starts in the evening → "tonight".
  const fc24 = {
    general: 'Thundery Showers',
    periods: [
      { startIso: '2026-05-11T12:00:00+08:00', endIso: '2026-05-11T18:00:00+08:00', regions: { west: 'Fair', east: 'Cloudy', central: 'Fair', south: 'Fair', north: 'Fair' } },
      { startIso: '2026-05-11T18:00:00+08:00', endIso: '2026-05-12T06:00:00+08:00', regions: { west: 'Showers', east: 'Thundery Showers', central: 'Cloudy', south: 'Cloudy', north: 'Showers' } }
    ]
  };
  it('picks the evening period and the venue zone', () => {
    const line = tonightOutlookFor(fc24, WEATHER_ZONE_CENTROIDS.east.lat, WEATHER_ZONE_CENTROIDS.east.lng, 'en', tn);
    expect(line).toContain('weather.tonight');
    expect(line).toContain('Thundery Showers');
    expect(line).toContain('East');
  });
  it('falls back to general when the zone has no period forecast', () => {
    const fc = { general: 'Hazy', periods: [{ startIso: '2026-05-11T20:00:00+08:00', endIso: '2026-05-12T06:00:00+08:00', regions: {} }] };
    expect(tonightOutlookFor(fc, 1.31, 103.84, 'en', tn)).toContain('Hazy');
  });
  it('null when there is no forecast', () => {
    expect(tonightOutlookFor(null, 1.31, 103.84, 'en', tn)).toBeNull();
    expect(tonightOutlookFor({ periods: [] }, 1.31, 103.84, 'en', tn)).toBeNull();
  });
});
