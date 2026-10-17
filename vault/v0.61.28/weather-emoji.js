// weather-emoji.js — v0.60.218
//
// Shared weather-emoji vocabulary + an NEA-forecast → emoji mapper.
// Used by the /w (weather) command and, from v0.60.219, the per-TMA
// weather summaries. One source of truth so every surface speaks the
// same visual weather language.
//
// The vocabulary is the operator-curated set (instruction of 16-05-26).

'use strict';

// Operator-curated emoji vocabulary.
const WEATHER_EMOJI = {
  sunny:        '☀️',   // Sunny
  mostlySunny:  '🌤️',   // Mostly sunny
  partlyCloudy: '⛅',   // Partly cloudy
  cloudy:       '☁️',   // Cloudy
  overcast:     '🌥️',   // Overcast
  sunShower:    '🌦️',   // Sun shower
  rain:         '🌧️',   // Rain
  thunderstorm: '⛈️',   // Thunderstorm
  lightning:    '🌩️',   // Lightning
  fogHaze:      '🌫️',   // Fog / haze
  windy:        '💨',   // Windy
  windFace:     '🌬️',   // Wind face
  cyclone:      '🌀',   // Cyclone / typhoon
  umbrellaRain: '☔',   // Umbrella with rain
  rainbow:      '🌈',   // Rainbow
  roughSea:     '🌊',   // Rough sea / waves
  humidity:     '💧'    // Humidity / water droplet
};

// Map an NEA forecast string (the 2-hour nowcast vocabulary —
// "Partly Cloudy", "Thundery Showers", "Hazy", "Fair", "Windy", …)
// or any free-text condition to a single emoji. Order matters:
// the most specific / most severe patterns are checked first.
function forecastEmoji(text) {
  const t = String(text || '').toLowerCase().trim();
  if (!t) return WEATHER_EMOJI.mostlySunny;
  if (/thunder/.test(t))            return WEATHER_EMOJI.thunderstorm;
  if (/lightning/.test(t))          return WEATHER_EMOJI.lightning;
  if (/shower/.test(t))             return WEATHER_EMOJI.sunShower;
  if (/rain|drizzle/.test(t))       return WEATHER_EMOJI.rain;
  if (/haz[ey]|mist|\bfog/.test(t)) return WEATHER_EMOJI.fogHaze;
  if (/wind|gust/.test(t))          return WEATHER_EMOJI.windy;
  if (/overcast/.test(t))           return WEATHER_EMOJI.overcast;
  if (/partly\s*cloud/.test(t))     return WEATHER_EMOJI.partlyCloudy;
  if (/cloud/.test(t))              return WEATHER_EMOJI.cloudy;
  if (/fair|sunny|clear|hot/.test(t)) return WEATHER_EMOJI.sunny;
  return WEATHER_EMOJI.mostlySunny;
}

// Celsius → Fahrenheit, rounded to one decimal.
function toFahrenheit(c) {
  return Number.isFinite(c) ? (c * 9 / 5 + 32) : null;
}

module.exports = { WEATHER_EMOJI, forecastEmoji, toFahrenheit };
