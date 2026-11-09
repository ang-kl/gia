// __tests__/weather-emoji.test.js — v0.60.218

import { describe, it, expect } from 'vitest';
import { WEATHER_EMOJI, forecastEmoji, toFahrenheit } from '../weather-emoji.js';

describe('forecastEmoji — NEA forecast vocabulary', () => {
  const cases = [
    ['Thundery Showers', WEATHER_EMOJI.thunderstorm],
    ['Heavy Thundery Showers with Gusty Winds', WEATHER_EMOJI.thunderstorm],
    ['Passing Showers', WEATHER_EMOJI.sunShower],
    ['Light Showers', WEATHER_EMOJI.sunShower],
    ['Light Rain', WEATHER_EMOJI.rain],
    ['Heavy Rain', WEATHER_EMOJI.rain],
    ['Hazy', WEATHER_EMOJI.fogHaze],
    ['Slightly Hazy', WEATHER_EMOJI.fogHaze],
    ['Mist', WEATHER_EMOJI.fogHaze],
    ['Windy', WEATHER_EMOJI.windy],
    ['Partly Cloudy', WEATHER_EMOJI.partlyCloudy],
    ['Partly Cloudy (Day)', WEATHER_EMOJI.partlyCloudy],
    ['Cloudy', WEATHER_EMOJI.cloudy],
    ['Overcast', WEATHER_EMOJI.overcast],
    ['Fair', WEATHER_EMOJI.sunny],
    ['Fair (Day)', WEATHER_EMOJI.sunny],
    ['Sunny', WEATHER_EMOJI.sunny]
  ];
  for (const [text, emoji] of cases) {
    it(`"${text}" → ${emoji}`, () => expect(forecastEmoji(text)).toBe(emoji));
  }
  it('empty / unknown → mostly sunny fallback', () => {
    expect(forecastEmoji('')).toBe(WEATHER_EMOJI.mostlySunny);
    expect(forecastEmoji(null)).toBe(WEATHER_EMOJI.mostlySunny);
    expect(forecastEmoji('moon walk')).toBe(WEATHER_EMOJI.mostlySunny);
  });
});

describe('toFahrenheit', () => {
  it('converts 32°C → 89.6°F', () => expect(toFahrenheit(32)).toBeCloseTo(89.6, 1));
  it('converts 0°C → 32°F', () => expect(toFahrenheit(0)).toBe(32));
  it('returns null for non-finite input', () => {
    expect(toFahrenheit(undefined)).toBe(null);
    expect(toFahrenheit(NaN)).toBe(null);
  });
});
