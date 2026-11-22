// __tests__/weather-global.test.js — v0.61.380, rewritten at v0.62.962.
//
// Global weather outside Singapore. Until v0.62.961 this pinned Open-Meteo (WMO codes, `source: 'open-meteo'`).
// Spec doc/Feature/2026-11-01-local-weather-every-city.spec.md (C2, A2 confirmed by the operator: "Yes, MET Norway")
// replaces that source with MET Norway, because Open-Meteo's free tier is non-commercial; the acceptance criteria
// name this file as one to update because the source it pins changes. The WMO tables went with it. The behaviour it
// guarded is kept: the TMA shape, and null (so the badge hides) on a missing block, a network error or a null
// temperature. The NEA (Singapore) path is unchanged and covered by the existing weather suites.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const weather = require('../weather.js');

const step = (time, t, rh, sym) => ({ time, data: { instant: { details: { air_temperature: t, relative_humidity: rh, wind_speed: 2, wind_from_direction: 90 } }, next_1_hours: { summary: { symbol_code: sym }, details: { precipitation_amount: 0 } } } });
const answer = (...steps) => ({ properties: { meta: { updated_at: '2026-11-01T08:00:00Z' }, timeseries: steps } });
const NOW = Date.parse('2026-11-01T08:10:00Z');
const opts = (getFn) => ({ getFn, cache: null, now: () => NOW });

describe('weather — MET symbol → emoji', () => {
  it('maps the families to glyphs', () => {
    expect(weather.metSymbolEmoji('clearsky_day')).toBe('☀️');
    expect(weather.metSymbolEmoji('clearsky_night')).toBe('🌙');
    expect(weather.metSymbolEmoji('fair_day')).toBe('🌤️');
    expect(weather.metSymbolEmoji('partlycloudy_day')).toBe('⛅');
    expect(weather.metSymbolEmoji('cloudy')).toBe('☁️');
    expect(weather.metSymbolEmoji('fog')).toBe('🌫️');
    expect(weather.metSymbolEmoji('lightrainshowers_day')).toBe('🌦️');
    expect(weather.metSymbolEmoji('rain')).toBe('🌧️');
    expect(weather.metSymbolEmoji('snow')).toBe('🌨️');
    expect(weather.metSymbolEmoji('rainandthunder')).toBe('⛈️');
  });
  it('falls back to a thermometer for unknown', () => {
    expect(weather.metSymbolEmoji(undefined)).toBe('🌡️');
    expect(weather.metSymbolEmoji('nonsense')).toBe('🌡️');
  });
});

describe('weather.summaryGlobal — MET Norway (mocked)', () => {
  it('returns the TMA shape for a Tokyo reading', async () => {
    const get = async () => ({ data: answer(step('2026-11-01T08:00:00Z', 18.4, 63, 'partlycloudy_day')), headers: {} });
    const w = await weather.summaryGlobal(35.6762, 139.6503, opts(get));
    expect(w).toEqual({ tempC: 18.4, humidityPct: 63, condition: 'Partly cloudy', emoji: '⛅', source: 'met-norway' });
  });

  it('reads the step for now, not the first one MET happens to send', async () => {
    const get = async () => ({ data: answer(step('2026-11-01T07:00:00Z', 10, 50, 'rain'), step('2026-11-01T08:00:00Z', 12, 55, 'cloudy'), step('2026-11-01T09:00:00Z', 14, 60, 'fair_day')), headers: {} });
    expect((await weather.summaryGlobal(35.6, 139.6, opts(get))).tempC).toBe(12);
  });

  it('returns null when the API has no timeseries', async () => {
    const get = async () => ({ data: {}, headers: {} });
    expect(await weather.summaryGlobal(0, 0, opts(get))).toBeNull(); // (also invalid coords)
    expect(await weather.summaryGlobal(35.6, 139.6, opts(get))).toBeNull();
  });

  it('returns null on a network error (graceful)', async () => {
    const get = async () => { throw new Error('econnrefused'); };
    expect(await weather.summaryGlobal(35.6, 139.6, opts(get))).toBeNull();
  });

  it('null temp → null (so the badge hides rather than showing a blank)', async () => {
    const get = async () => ({ data: answer(step('2026-11-01T08:00:00Z', null, 60, 'fair_day')), headers: {} });
    expect(await weather.summaryGlobal(48.85, 2.35, opts(get))).toBeNull();
  });
});
