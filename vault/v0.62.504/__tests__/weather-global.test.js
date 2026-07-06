// __tests__/weather-global.test.js — v0.61.380
// Global weather (Open-Meteo) — WMO mapping + summaryGlobal via a mocked
// axios.get seam, so no live network. NEA (SG) path is unchanged + untested
// here (covered by the existing weather suites).

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const weather = require('../weather.js');

describe('weather — WMO code → text', () => {
  it('maps the common conditions', () => {
    expect(weather.wmoToText(0)).toBe('Clear');
    expect(weather.wmoToText(2)).toBe('Partly Cloudy');
    expect(weather.wmoToText(3)).toBe('Cloudy');
    expect(weather.wmoToText(45)).toBe('Fog');
    expect(weather.wmoToText(61)).toBe('Rain');
    expect(weather.wmoToText(71)).toBe('Snow');
    expect(weather.wmoToText(81)).toBe('Showers');
    expect(weather.wmoToText(95)).toBe('Thunderstorm');
  });
  it('returns null for an unknown code', () => {
    expect(weather.wmoToText(999)).toBeNull();
    expect(weather.wmoToText('x')).toBeNull();
  });
});

describe('weather — WMO code → emoji', () => {
  it('maps codes to glyphs', () => {
    expect(weather.wmoToEmoji(0)).toBe('☀️');
    expect(weather.wmoToEmoji(2)).toBe('⛅');
    expect(weather.wmoToEmoji(3)).toBe('☁️');
    expect(weather.wmoToEmoji(45)).toBe('🌫️');
    expect(weather.wmoToEmoji(61)).toBe('🌧️');
    expect(weather.wmoToEmoji(71)).toBe('🌨️');
    expect(weather.wmoToEmoji(95)).toBe('⛈️');
  });
  it('falls back to a thermometer for unknown', () => {
    expect(weather.wmoToEmoji(undefined)).toBe('🌡️');
  });
});

describe('weather.summaryGlobal — Open-Meteo (mocked)', () => {
  it('returns the TMA shape for a Tokyo reading', async () => {
    const mockGet = async () => ({
      data: { current: { temperature_2m: 18.4, relative_humidity_2m: 63, weather_code: 2 } }
    });
    const w = await weather.summaryGlobal(35.6762, 139.6503, mockGet);
    expect(w).toEqual({
      tempC: 18.4, humidityPct: 63, condition: 'Partly Cloudy', emoji: '⛅', source: 'open-meteo'
    });
  });

  it('returns null when the API has no current block', async () => {
    const mockGet = async () => ({ data: {} });
    expect(await weather.summaryGlobal(0, 0, mockGet)).toBeNull(); // (also invalid coords)
    expect(await weather.summaryGlobal(35.6, 139.6, mockGet)).toBeNull();
  });

  it('returns null on a network error (graceful)', async () => {
    const mockGet = async () => { throw new Error('econnrefused'); };
    expect(await weather.summaryGlobal(35.6, 139.6, mockGet)).toBeNull();
  });

  it('null temp → null (so the badge hides rather than showing a blank)', async () => {
    const mockGet = async () => ({ data: { current: { temperature_2m: null, weather_code: 0 } } });
    expect(await weather.summaryGlobal(48.85, 2.35, mockGet)).toBeNull();
  });
});
