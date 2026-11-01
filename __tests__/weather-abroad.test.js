// __tests__/weather-abroad.test.js — v0.62.962.
//
// Spec: doc/Feature/2026-11-01-local-weather-every-city.spec.md, C1-C6, invariants I1-I6 and I8.
//
// The weather outside Singapore comes from MET Norway's Locationforecast 2.0 (NLOD 2.0 and CC BY 4.0, so commercial
// use is allowed with credit). The fixture is a trimmed copy of MET's real answer for Kyoto (35.01, 135.77), fetched
// 01-11 '26 08:56 UTC with `Expires` 09:26:52 UTC: the first step whole, then every third hourly step and all the
// six-hourly ones, each row [time, temp, rh, wind m/s, wind from °, UV clear sky, 1 h symbol, 1 h rain, 6 h symbol,
// 6 h min, 6 h max]. The four-day expectations below were derived from these rows by hand in Python (JST = UTC+9,
// no daylight saving), not by running the code under test.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  OUTSIDE_STRINGS, OUTSIDE_LOCALES, badgeDot, jmaName, jmaLineKey, JMA_NAMES, windText, localTime, topJma, outlookTemp,
  jmaTime, OUTLOOK_CLASSES,
} from '../web/_shared/lib/outside-now-i18n.js';
import { CITIES_BY_COUNTRY } from '../web/cuisine/src/v2/lib/cities.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const weather = require('../weather.js');
const { CITY_CENTROIDS } = require('../city-centroids.js');

const ROOT = path.join(__dirname, '..');
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const KYOTO_ROWS = [
  ["2026-11-01T08:00:00Z",16.2,71.9,1.4,208.6,0.0,"partlycloudy_night",0.0,"fair_night",13.4,15.3], ["2026-11-01T09:00:00Z",15.3,73.7,1.5,232.3,0.0,"partlycloudy_night",0.0,"fair_night",13.2,14.8], ["2026-11-01T12:00:00Z",14.0,76.3,0.9,16.2,0.0,"fair_night",0.0,"fair_night",12.8,13.8],
  ["2026-11-01T15:00:00Z",13.2,79.8,2.1,169.3,0.0,"fair_night",0.0,"partlycloudy_night",12.8,13.3], ["2026-11-01T18:00:00Z",12.8,84.0,1.5,27.9,0.0,"fair_night",0.0,"rain",12.9,15.0], ["2026-11-01T21:00:00Z",13.2,92.1,2.0,38.2,0.0,"cloudy",0.0,"heavyrain",14.2,16.9],
  ["2026-11-02T00:00:00Z",15.0,98.3,2.0,28.8,2.1,"heavyrain",2.9,"heavyrainshowers_day",15.5,20.0], ["2026-11-02T03:00:00Z",16.9,98.1,1.5,51.1,4.5,"rain",0.3,"lightrainshowers_day",16.8,20.0], ["2026-11-02T06:00:00Z",20.0,81.7,4.3,281.3,1.0,"fair_day",0.0,"clearsky_night",14.3,19.3],
  ["2026-11-02T09:00:00Z",16.8,82.4,4.1,329.9,0.0,"clearsky_night",0.0,"clearsky_night",12.7,15.6], ["2026-11-02T12:00:00Z",14.3,88.1,3.4,289.9,0.0,"clearsky_night",0.0,"clearsky_night",11.6,13.9], ["2026-11-02T15:00:00Z",12.7,93.1,3.2,247.2,0.0,"fair_night",0.0,"clearsky_night",10.5,12.4],
  ["2026-11-02T18:00:00Z",11.6,95.2,2.9,239.8,0.0,"clearsky_night",0.0,"clearsky_night",10.5,16.2], ["2026-11-02T21:00:00Z",10.5,93.9,4.0,259.3,0.0,"clearsky_day",0.0,"fair_day",11.1,19.8], ["2026-11-03T00:00:00Z",16.2,68.3,4.7,252.3,2.1,"fair_day",0.0,"partlycloudy_day",18.2,19.8],
  ["2026-11-03T03:00:00Z",19.8,43.5,3.9,337.1,4.5,"partlycloudy_day",0.0,"partlycloudy_day",14.1,19.6], ["2026-11-03T06:00:00Z",19.0,48.4,3.4,329.6,1.0,"partlycloudy_day",0.0,"fair_night",11.5,17.8], ["2026-11-03T09:00:00Z",14.1,76.0,2.4,335.9,0.0,"fair_night",0.0,"fair_night",10.3,13.1],
  ["2026-11-03T12:00:00Z",11.5,88.2,2.0,311.3,0.0,"fair_night",0.0,"clearsky_night",9.9,10.9], ["2026-11-03T15:00:00Z",10.3,92.6,2.5,328.3,0.0,"clearsky_night",0.0,"clearsky_night",9.5,10.2], ["2026-11-03T18:00:00Z",9.9,92.7,2.1,322.9,0.0,"clearsky_night",0.0,"clearsky_night",9.5,15.4],
  ["2026-11-03T21:00:00Z",9.5,89.8,2.2,319.5,0.0,"fair_day",0.0,null,null,null], ["2026-11-04T00:00:00Z",15.4,70.8,1.9,153.0,2.0,null,null,"fair_day",15.1,19.2], ["2026-11-04T06:00:00Z",17.8,42.9,1.3,47.0,null,null,null,"partlycloudy_night",15.4,18.2],
  ["2026-11-04T12:00:00Z",15.4,82.9,1.8,19.3,null,null,null,"heavyrain",14.5,15.5], ["2026-11-04T18:00:00Z",14.6,94.8,1.4,22.7,null,null,null,"heavyrain",14.6,16.3], ["2026-11-05T00:00:00Z",16.3,96.0,1.1,33.5,null,null,null,"heavyrain",16.1,19.7],
  ["2026-11-05T06:00:00Z",19.7,78.6,0.5,185.5,null,null,null,"fair_night",15.1,19.7], ["2026-11-05T12:00:00Z",15.1,95.8,0.8,22.9,null,null,null,"partlycloudy_night",15.1,16.1], ["2026-11-05T18:00:00Z",16.1,95.4,0.9,258.6,null,null,null,"partlycloudy_night",14.5,19.0],
  ["2026-11-06T00:00:00Z",19.0,79.7,2.5,289.3,null,null,null,"clearsky_day",19.0,22.0], ["2026-11-06T06:00:00Z",20.9,48.6,3.8,303.2,null,null,null,"partlycloudy_night",14.5,20.9], ["2026-11-06T12:00:00Z",14.5,72.4,3.2,294.8,null,null,null,"clearsky_night",11.8,14.5],
  ["2026-11-06T18:00:00Z",11.8,75.1,2.5,285.6,null,null,null,"fair_night",10.0,12.6], ["2026-11-07T00:00:00Z",12.6,61.5,4.0,325.1,null,null,null,"partlycloudy_day",12.2,13.9], ["2026-11-07T06:00:00Z",12.2,59.4,4.1,334.2,null,null,null,"partlycloudy_night",8.6,12.2],
  ["2026-11-07T12:00:00Z",8.6,77.9,1.0,260.6,null,null,null,"partlycloudy_night",8.2,9.0], ["2026-11-07T18:00:00Z",8.9,81.9,0.7,299.4,null,null,null,"partlycloudy_night",8.4,11.3], ["2026-11-08T00:00:00Z",11.3,66.0,2.7,11.4,null,null,null,"partlycloudy_day",11.3,12.2],
  ["2026-11-08T06:00:00Z",12.1,60.2,2.4,356.1,null,null,null,"partlycloudy_night",8.1,12.6], ["2026-11-08T12:00:00Z",8.1,79.4,0.9,306.1,null,null,null,"partlycloudy_night",6.1,8.1], ["2026-11-08T18:00:00Z",6.1,90.0,0.2,276.6,null,null,null,"cloudy",5.7,11.4],
  ["2026-11-09T00:00:00Z",11.4,72.9,1.1,200.7,null,null,null,"clearsky_day",11.4,16.4], ["2026-11-09T06:00:00Z",15.0,62.7,3.9,347.4,null,null,null,"partlycloudy_night",9.9,15.0], ["2026-11-09T12:00:00Z",9.9,81.5,1.6,338.4,null,null,null,"fair_night",8.3,10.0],
  ["2026-11-09T18:00:00Z",8.3,84.6,1.1,13.5,null,null,null,"fair_night",7.7,11.7], ["2026-11-10T00:00:00Z",11.7,62.4,0.8,40.1,null,null,null,"clearsky_day",11.7,15.1], ["2026-11-10T06:00:00Z",14.0,47.2,3.3,351.3,null,null,null,"clearsky_night",7.5,14.0],
  ["2026-11-10T12:00:00Z",7.5,80.8,0.8,254.2,null,null,null,null,null,null],
];

// Rows → MET's own JSON shape.
function metJson(rows) {
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [135.77, 35.01, 43] },
    properties: {
      meta: { updated_at: '2026-11-01T08:17:28Z', units: { air_temperature: 'celsius' } },
      timeseries: rows.map(([time, t, rh, ws, wd, uv, s1, r1, s6, mn6, mx6]) => {
        const instant = { air_temperature: t, relative_humidity: rh, wind_speed: ws, wind_from_direction: wd };
        if (uv != null) instant.ultraviolet_index_clear_sky = uv;
        const data = { instant: { details: instant } };
        if (s1) data.next_1_hours = { summary: { symbol_code: s1 }, details: { precipitation_amount: r1 } };
        if (s6) data.next_6_hours = { summary: { symbol_code: s6 }, details: { air_temperature_min: mn6, air_temperature_max: mx6 } };
        return { time, data };
      }),
    },
  };
}
const NOW = Date.parse('2026-11-01T08:56:06Z');
const EXPIRES = 'Sun, 01 Nov 2026 09:26:52 GMT';
// An axios.get-shaped fake recording the URL and headers it was called with.
function fakeGet(body = metJson(KYOTO_ROWS), headers = { expires: EXPIRES }) {
  const calls = [];
  const fn = async (url, opts) => { calls.push({ url, opts }); return { data: body, headers }; };
  fn.calls = calls;
  return fn;
}
function fakeCache() {
  const m = new Map();
  return { m, ttl: {}, async get(k) { return m.has(k) ? m.get(k) : null; }, async setEx(k, ttl, v) { m.set(k, v); this.ttl[k] = ttl; return 'OK'; } };
}
const K = CITY_CENTROIDS.Kyoto;

// ── I3 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I3 — MET terms: identify ourselves, cache per grid cell, never cache a failure', () => {
  it('asks Locationforecast 2.0 /complete for the 0.1° cell, with a User-Agent naming Soleat and soleat.net', async () => {
    const get = fakeGet();
    await weather.fetchMet(K.lat, K.lng, { getFn: get, cache: null, now: () => NOW });
    expect(get.calls).toHaveLength(1);
    expect(get.calls[0].url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/complete?lat=35.0&lon=135.8');
    const ua = get.calls[0].opts.headers['User-Agent'];
    expect(ua).toMatch(/Soleat/);
    expect(ua).toMatch(/https:\/\/soleat\.net/);
    expect(ua).not.toMatch(/@/); // A3: the website, no email address
  });
  it('caches until Expires, never less than 30 minutes, and a second call in the cell is served from cache', async () => {
    const get = fakeGet(); const cache = fakeCache();
    await weather.fetchMet(K.lat, K.lng, { getFn: get, cache, now: () => NOW });
    await weather.fetchMet(K.lat + 0.02, K.lng + 0.02, { getFn: get, cache, now: () => NOW }); // same 0.1° cell (35.0, 135.8)
    expect(get.calls).toHaveLength(1);
    const [key] = cache.m.keys();
    expect(key).toBe('met:v1:35.0:135.8');
    expect(cache.ttl[key]).toBe(1846); // 09:26:52 - 08:56:06 = 1,846 s
    const short = fakeCache();
    await weather.fetchMet(K.lat, K.lng, { getFn: fakeGet(undefined, { expires: 'Sun, 01 Nov 2026 09:00:00 GMT' }), cache: short, now: () => NOW });
    expect(Object.values(short.ttl)).toEqual([1800]);
    const none = fakeCache();
    await weather.fetchMet(K.lat, K.lng, { getFn: fakeGet(undefined, {}), cache: none, now: () => NOW });
    expect(Object.values(none.ttl)).toEqual([1800]);
  });
  it('a failure is null and is not cached', async () => {
    const cache = fakeCache();
    const boom = async () => { throw new Error('403'); };
    expect(await weather.fetchMet(K.lat, K.lng, { getFn: boom, cache, now: () => NOW })).toBeNull();
    expect(await weather.fetchMet(K.lat, K.lng, { getFn: fakeGet({ properties: {} }), cache, now: () => NOW })).toBeNull();
    expect(cache.m.size).toBe(0);
  });
  it('the route answers { ok: false } when MET fails', async () => {
    const boom = async () => { throw new Error('ETIMEDOUT'); };
    expect(await weather.abroadForPoint(K.lat, K.lng, { getFn: boom, cache: null, now: () => NOW })).toEqual({ ok: false });
  });
});

// ── The reading, the sheet payload, and I6 ───────────────────────────────────────────────────────────────────────
describe('C5 — /api/weather/abroad for Kyoto, from the real MET answer', () => {
  it('summaryGlobal: the badge reading (MET replaces the previous source)', async () => {
    const w = await weather.summaryGlobal(K.lat, K.lng, { getFn: fakeGet(), cache: null, now: () => NOW });
    expect(w).toEqual({ tempC: 16.2, humidityPct: 71.9, condition: 'Partly cloudy', emoji: '⛅', source: 'met-norway' });
  });
  it('the payload: now, rain next hour, clear-sky UV, the time zone and the reading time', async () => {
    const r = await weather.abroadForPoint(K.lat, K.lng, { getFn: fakeGet(), cache: null, now: () => NOW });
    expect(r.ok).toBe(true);
    expect(r.inSg).toBe(false);
    expect(r.tz).toBe('Asia/Tokyo');
    expect(r.at).toBe('2026-11-01T08:00:00Z');
    expect(r.now).toMatchObject({ tempC: 16.2, humidityPct: 72, windKmh: 5, windFrom: 'SW', cls: 'partlyCloudy', emoji: '⛅' });
    expect(r.rainNextHourMm).toBe(0);
    expect(r.uvClearSky).toBe(0);
    expect(r.jma).toBeNull();
  });
  it('I6 — the next four days are Kyoto\'s own dates, lows and highs, and midday condition', async () => {
    const r = await weather.abroadForPoint(K.lat, K.lng, { getFn: fakeGet(), cache: null, now: () => NOW });
    expect(r.days).toEqual([
      { date: '2026-11-02', lowC: 12, highC: 20, cls: 'rain', emoji: '🌧️' },
      { date: '2026-11-03', lowC: 10, highC: 20, cls: 'partlyCloudy', emoji: '⛅' },
      { date: '2026-11-04', lowC: 10, highC: 19, cls: 'fair', emoji: '🌤️' },
      { date: '2026-11-05', lowC: 15, highC: 20, cls: 'rain', emoji: '🌧️' },
    ]);
  });
  it('I6 — a step at 00:30 in Kyoto belongs to the next day there, though it is still the day before in Singapore', () => {
    const series = weather.metSeries(metJson([
      ['2026-11-01T08:00:00Z', 16, 70, 1, 0, 0, 'fair_day', 0, 'fair_day', 15, 17],
      ['2026-11-02T03:00:00Z', 18, 70, 1, 0, 0, 'fair_day', 0, 'fair_day', 17, 18],
      ['2026-11-02T15:30:00Z', 30, 70, 1, 0, 0, 'fair_night', 0, null, null, null], // 00:30 JST 3 Nov; 23:30 SGT 2 Nov
      ['2026-11-03T03:00:00Z', 18, 70, 1, 0, 0, 'fair_day', 0, 'fair_day', 17, 18],
    ]));
    const days = weather.daysFromSeries(series, 'Asia/Tokyo', NOW);
    expect(days.find((d) => d.date === '2026-11-02').highC).toBe(18);
    expect(days.find((d) => d.date === '2026-11-03').highC).toBe(30);
  });
  it('a point inside Singapore answers inSg and asks MET nothing', async () => {
    const get = fakeGet();
    expect(await weather.abroadForPoint(1.2937, 103.8531, { getFn: get, cache: null, now: () => NOW })).toEqual({ ok: true, inSg: true });
    expect(get.calls).toHaveLength(0);
  });
  it('the route hands Japan\'s points to the JMA module and nobody else\'s', async () => {
    const seen = [];
    const jma = async (lat, lng) => { seen.push([lat, lng]); return { status: 'ok', warnings: [], dot: null }; };
    const kyoto = await weather.abroadForPoint(K.lat, K.lng, { getFn: fakeGet(), cache: null, now: () => NOW, jma });
    expect(kyoto.jma).toEqual({ status: 'ok', warnings: [], dot: null });
    const paris = await weather.abroadForPoint(48.8566, 2.3522, { getFn: fakeGet(), cache: null, now: () => NOW, jma: async () => null });
    expect(paris.jma).toBeNull();
  });
});

describe('C6 — each city\'s time zone', () => {
  const tz = (city) => weather.tzForPoint(CITY_CENTROIDS[city].lat, CITY_CENTROIDS[city].lng);
  it('one zone per country where the country has one', () => {
    expect(tz('Kyoto')).toBe('Asia/Tokyo');
    expect(tz('Paris')).toBe('Europe/Paris');
    expect(tz('Seoul')).toBe('Asia/Seoul');
    expect(tz('Chengdu')).toBe('Asia/Shanghai');
    expect(tz('Auckland')).toBe('Pacific/Auckland');
  });
  it('per city in Australia and Indonesia', () => {
    expect(tz('Sydney')).toBe('Australia/Sydney');
    expect(tz('Perth')).toBe('Australia/Perth');
    expect(tz('Adelaide')).toBe('Australia/Adelaide');
    expect(tz('Brisbane')).toBe('Australia/Brisbane');
    expect(tz('Darwin')).toBe('Australia/Darwin');
    expect(tz('Jakarta')).toBe('Asia/Jakarta');
    expect(tz('Denpasar')).toBe('Asia/Makassar');
  });
  it('every one of the 152 cities resolves to a zone this runtime knows', () => {
    for (const [name, c] of Object.entries(CITY_CENTROIDS)) {
      const z = weather.tzForPoint(c.lat, c.lng);
      expect(() => new Intl.DateTimeFormat('en', { timeZone: z }), `${name}: ${z}`).not.toThrow();
    }
  });
  // Operator, 01-11 '26: "include all cities' weather". Every city the picker offers must get its OWN zone, not a
  // longitude band. The expected zone is worked out here from the picker's own country and state, independently of
  // weather.js's table: a single zone per country, Australia by state, and Indonesia's WITA cities by name.
  it('every one of the 284 picker cities resolves to its own country\'s (or state\'s) zone', () => {
    const ONE = { MY: 'Asia/Kuala_Lumpur', ID: 'Asia/Jakarta', TH: 'Asia/Bangkok', VN: 'Asia/Ho_Chi_Minh', PH: 'Asia/Manila',
      BN: 'Asia/Brunei', NZ: 'Pacific/Auckland', JP: 'Asia/Tokyo', KR: 'Asia/Seoul', CN: 'Asia/Shanghai', HK: 'Asia/Hong_Kong',
      MO: 'Asia/Macau', TW: 'Asia/Taipei', FR: 'Europe/Paris', SG: 'Asia/Singapore' };
    const STATE = { NSW: 'Australia/Sydney', ACT: 'Australia/Sydney', VIC: 'Australia/Melbourne', QLD: 'Australia/Brisbane',
      SA: 'Australia/Adelaide', WA: 'Australia/Perth', TAS: 'Australia/Hobart', NT: 'Australia/Darwin' };
    let n = 0;
    const wrong = [];
    for (const [cc, list] of Object.entries(CITIES_BY_COUNTRY)) {
      for (const c of list) {
        if (!Number.isFinite(c.lat)) continue;
        n++;
        const want = cc === 'AU' ? STATE[c.region]
          : cc === 'ID' && /Makassar|Bali|Denpasar/.test(c.name) ? 'Asia/Makassar' : ONE[cc];
        const got = weather.tzForPoint(c.lat, c.lng);
        if (got !== want) wrong.push(`${cc} ${c.name}: ${got} (want ${want})`);
      }
    }
    expect(n).toBe(284);
    expect(wrong).toEqual([]);
  });
  it('a point near no city falls back to the hour band of its longitude', () => {
    expect(weather.tzForPoint(-40, -140)).toBe('Etc/GMT+9');
  });
});

describe('MET symbols → the existing condition classes', () => {
  it('maps each family, most specific first; snow and sleet get no class rather than a wrong one', () => {
    expect(weather.metSymbolClass('rainandthunder')).toBe('thunder');
    expect(weather.metSymbolClass('heavyrainshowersandthunder_day')).toBe('thunder');
    expect(weather.metSymbolClass('lightrainshowers_day')).toBe('showers');
    expect(weather.metSymbolClass('heavyrain')).toBe('rain');
    expect(weather.metSymbolClass('fog')).toBe('haze');
    expect(weather.metSymbolClass('partlycloudy_night')).toBe('partlyCloudy');
    expect(weather.metSymbolClass('cloudy')).toBe('cloudy');
    expect(weather.metSymbolClass('fair_day')).toBe('fair');
    expect(weather.metSymbolClass('clearsky_day')).toBe('fair');
    // v0.62.963 — Amendment 2 (A9, operator: "Snow and Sleet"): these two asserted null before; they now get their
    // own classes. The full legend is checked below.
    expect(weather.metSymbolClass('heavysnow')).toBe('snow');
    expect(weather.metSymbolClass('sleetshowers_day')).toBe('sleet');
    expect(weather.metSymbolEmoji('heavysnow')).toBe('🌨️');
  });
});

// I18 — every symbol in MET's published legend (github.com/metno/weathericons, weather/legend.csv, read 01-11 '26: 40
// IDs, copied verbatim, including MET's own "lightss…" spellings). Each base ID may carry _day / _night / _polartwilight.
describe('I18 — MET\'s 40 symbols: snow and sleet get their words, thunder stays thunder, the rest are unchanged', () => {
  const LEGEND = ['clearsky', 'fair', 'partlycloudy', 'cloudy', 'lightrainshowers', 'rainshowers', 'heavyrainshowers',
    'lightrainshowersandthunder', 'rainshowersandthunder', 'heavyrainshowersandthunder', 'lightsleetshowers', 'sleetshowers',
    'heavysleetshowers', 'lightssleetshowersandthunder', 'sleetshowersandthunder', 'heavysleetshowersandthunder',
    'lightsnowshowers', 'snowshowers', 'heavysnowshowers', 'lightssnowshowersandthunder', 'snowshowersandthunder',
    'heavysnowshowersandthunder', 'lightrain', 'rain', 'heavyrain', 'lightrainandthunder', 'rainandthunder',
    'heavyrainandthunder', 'lightsleet', 'sleet', 'heavysleet', 'lightsleetandthunder', 'sleetandthunder',
    'heavysleetandthunder', 'lightsnow', 'snow', 'heavysnow', 'lightsnowandthunder', 'snowandthunder', 'heavysnowandthunder', 'fog'];
  const want = (id) => (/thunder/.test(id) ? 'thunder' : /sleet/.test(id) ? 'sleet' : /snow/.test(id) ? 'snow'
    : /showers/.test(id) ? 'showers' : /rain/.test(id) ? 'rain' : id === 'fog' ? 'haze'
      : id === 'partlycloudy' ? 'partlyCloudy' : id === 'cloudy' ? 'cloudy' : 'fair');
  it('the legend holds 40 symbols; 12 snow or sleet without thunder, 12 with', () => {
    expect(new Set(LEGEND).size).toBe(LEGEND.length);
    expect(LEGEND.filter((s) => /snow|sleet/.test(s) && !/thunder/.test(s))).toHaveLength(12);
    expect(LEGEND.filter((s) => /snow|sleet/.test(s) && /thunder/.test(s))).toHaveLength(12);
  });
  for (const id of LEGEND) {
    it(`${id} → ${want(id)}`, () => {
      expect(weather.metSymbolClass(id)).toBe(want(id));
      expect(weather.metSymbolClass(`${id}_day`)).toBe(want(id));
    });
  }
  it('the badge reading names snow and sleet', async () => {
    const step = (sym) => ({ time: '2026-11-01T08:00:00Z', data: { instant: { details: { air_temperature: -2, relative_humidity: 80 } }, next_1_hours: { summary: { symbol_code: sym }, details: { precipitation_amount: 1 } } } });
    const get = (sym) => async () => ({ data: { properties: { timeseries: [step(sym)] } }, headers: {} });
    expect((await weather.summaryGlobal(45.8, 126.5, { getFn: get('snow'), cache: null, now: () => NOW })).condition).toBe('Snow');
    expect((await weather.summaryGlobal(45.8, 126.5, { getFn: get('lightsleet'), cache: null, now: () => NOW })).condition).toBe('Sleet');
  });
  it('the two labels exist in 9 locales, translated rather than copied, and NEA\'s classes are untouched', () => {
    for (const k of ['wx.snow', 'wx.sleet']) {
      for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS[k]?.[l], `${k}.${l}`).toBeTruthy();
      for (const l of ['zh', 'ja', 'ko', 'ru']) expect(OUTSIDE_STRINGS[k][l]).not.toBe(OUTSIDE_STRINGS[k].en);
    }
    expect(OUTSIDE_STRINGS['wx.snow'].en).toBe('Snow');
    expect(OUTSIDE_STRINGS['wx.sleet'].en).toBe('Sleet');
    expect(OUTLOOK_CLASSES.map(([c]) => c)).not.toContain('snow');
  });
});

// Amendment 2 — the stale line, and dated JMA times (I12, I19).
describe('Amendment 2 — "No JMA bulletin in the last 24 hours", and the date on an older bulletin', () => {
  it('stale and none-yet get different, true lines', () => {
    expect(jmaLineKey({ status: 'stale', warnings: [] })).toBe('jma.noRecent');
    expect(jmaLineKey({ status: 'none-yet', warnings: [] })).toBe('jma.noBulletin');
    expect(OUTSIDE_STRINGS['jma.noRecent'].en).toBe('No JMA bulletin in the last 24 hours');
    for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS['jma.noRecent'][l], l).toMatch(/24/);
  });
  // "Now" is 02-11 '26 05:00 JST.
  const NOW_JST = Date.parse('2026-11-01T20:00:00Z');
  it('a bulletin from today in Japan shows its time only', () => {
    expect(jmaTime('2026-11-02T04:10:00+09:00', 'en', NOW_JST)).toBe('04:10');
  });
  it('one from an earlier day in Japan shows its date too, in the reader\'s language', () => {
    expect(jmaTime('2026-11-01T22:45:00+09:00', 'en', NOW_JST)).toBe('1 Nov 22:45');
    expect(jmaTime('2026-11-01T22:45:00+09:00', 'ja', NOW_JST)).toMatch(/11月1日.*22:45/);
  });
  it('"today" is Japan\'s day, not Singapore\'s: 23:30 JST on 1 Nov is yesterday at 00:30 JST on 2 Nov', () => {
    const at = Date.parse('2026-11-01T15:30:00Z'); // 00:30 JST 2 Nov, 23:30 SGT 1 Nov
    expect(jmaTime('2026-11-01T23:30:00+09:00', 'en', at)).toBe('1 Nov 23:30');
  });
  it('the sheet and the strip use it', () => {
    expect(code('web/_shared/components/OutsideNowSheet.jsx')).toMatch(/jmaTime\(/);
    expect(code('web/_shared/components/OutsideNowStrip.jsx')).toMatch(/jmaTime\(/);
  });
});

describe('MET symbols — no class is invented', () => {
  it('an unknown symbol gets none', () => {
    expect(weather.metSymbolClass('nonsense')).toBeNull();
  });
});

// ── I1 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I1 — Cuisine\'s weather follows the city on screen, a previewed city first', () => {
  const c = code('web/cuisine/src/v2/App.jsx');
  it('the Outside-now point', () => {
    expect(c).toMatch(/const outsideLat = \(selectedCityLocation\?\.lat \?\? locationAnchor\?\.lat \?\? searchCenter\?\.lat \?\? userLoc\?\.lat\) \?\? null;/);
    expect(c).toMatch(/const outsideLng = \(selectedCityLocation\?\.lng \?\? locationAnchor\?\.lng \?\? searchCenter\?\.lng \?\? userLoc\?\.lng\) \?\? null;/);
  });
  it('every badge asks for that same point', () => {
    const bs = c.match(/<WeatherBadge\b[^>]*>/g) || [];
    expect(bs.length).toBeGreaterThan(0);
    for (const b of bs) {
      expect(b).toMatch(/\blat=\{outsideLat\}/);
      expect(b).toMatch(/\blng=\{outsideLng\}/);
    }
  });
});

// ── I2 ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I2 — no non-commercial source remains', () => {
  const files = ['weather.js', 'index.js'];
  const walk = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return ['node_modules', 'dist'].includes(e.name) ? [] : walk(p);
    return /\.(jsx?|mjs)$/.test(e.name) ? [p] : [];
  });
  for (const d of ['web/_shared', 'web/cuisine/src', 'web/transport/src', 'web/hawker/src']) files.push(...walk(d));
  it(`no Open-Meteo host or source tag in ${files.length} files`, () => {
    const hits = files.filter((f) => /open-meteo\.com|['"`]open-meteo['"`]/i.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
    expect(hits).toEqual([]);
  });
});

// ── I4 and I8 ─────────────────────────────────────────────────────────────────────────────────────────────────────
describe('I4 — the abroad sheet credits MET Norway under CC BY 4.0 and labels UV as clear-sky', () => {
  const sheet = code('web/_shared/components/OutsideNowSheet.jsx');
  it('the credit links api.met.no and the licence', () => {
    expect(sheet).toMatch(/href="https:\/\/api\.met\.no\/"/);
    expect(sheet).toMatch(/href="https:\/\/creativecommons\.org\/licenses\/by\/4\.0\/"/);
    expect(sheet).toMatch(/'abroad\.credit'/);
    expect(sheet).toMatch(/'abroad\.uv'/);
    expect(sheet).toMatch(/'abroad\.sgOnly'/);
  });
  it('the credit names MET Norway in every locale; UV says clear sky; the Singapore-only line is the spec\'s', () => {
    for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS['abroad.credit'][l], l).toMatch(/MET Norway/);
    expect(OUTSIDE_STRINGS['abroad.credit'].en).toBe('Weather data from MET Norway');
    expect(OUTSIDE_STRINGS['abroad.uv'].en).toBe('UV {i} if the sky is clear');
    for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS['abroad.uv'][l], l).toMatch(/\{i\}/);
    expect(OUTSIDE_STRINGS['abroad.sgOnly'].en).toBe('Heat stress, lightning, flood and air-quality readings are Singapore-only.');
  });
  it('the JMA credit is the wording the Standard Terms of Use ask for', () => {
    expect(OUTSIDE_STRINGS['jma.credit'].en).toBe('Source: Japan Meteorological Agency (JMA), processed by Soleat');
    for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS['jma.credit'][l], l).toMatch(/JMA/);
    expect(sheet).toMatch(/'jma\.credit'/);
  });
});

describe('I8 — every new string exists in all nine locales', () => {
  const NEW = ['abroad.credit', 'abroad.uv', 'abroad.sgOnly', 'abroad.wind', 'abroad.rain', 'abroad.at', 'abroad.humidity',
    'jma.title', 'jma.none', 'jma.noBulletin', 'jma.issued', 'jma.credit',
    'lvl.jma.emergency', 'lvl.jma.danger', 'lvl.jma.warning', 'lvl.jma.advisory'];
  for (const k of NEW) {
    it(k, () => {
      expect(OUTSIDE_STRINGS[k], k).toBeTruthy();
      for (const l of OUTSIDE_LOCALES) expect(typeof OUTSIDE_STRINGS[k][l] === 'string' && OUTSIDE_STRINGS[k][l].trim().length > 0, `${k}.${l}`).toBe(true);
    });
  }
  it('about thirty JMA names, each translated in every locale but Japanese, which keeps JMA\'s own', () => {
    expect(JMA_NAMES.length).toBeGreaterThanOrEqual(29);
    for (const n of JMA_NAMES) {
      expect(jmaName(n, 'ja')).toBe(n);
      for (const l of OUTSIDE_LOCALES.filter((x) => x !== 'ja')) {
        const s = jmaName(n, l);
        expect(s, `${n}.${l}`).not.toBe(n);
        expect(s, `${n}.${l}`).not.toMatch(/[぀-ヿ]/); // no kana outside Japanese
      }
    }
    expect(jmaName('大雨警報', 'en')).toBe('Heavy rain warning');
    expect(jmaName('雷注意報', 'en')).toBe('Thunderstorm advisory');
    expect(jmaName('大雨特別警報', 'en')).toBe('Heavy rain emergency warning');
    expect(jmaName('波浪注意報', 'ko')).toBe('풍랑 주의보');
  });
  it('I11 — a name we have not translated is shown in Japanese, never guessed', () => {
    expect(jmaName('謎の注意報', 'en')).toBe('謎の注意報');
    expect(jmaName('大雨情報', 'fr')).toBe('大雨情報');
  });
});

// ── I5 and I12 on the client ──────────────────────────────────────────────────────────────────────────────────────
describe('I5 — no warning dot abroad, except Japan\'s JMA dot', () => {
  const sg = { ok: true, inSg: true, dot: 'amber' };
  const away = { ok: true, inSg: false, dot: null };
  it('Singapore keeps its own dot', () => {
    expect(badgeDot(sg, null)).toBe('amber');
  });
  it('France, Malaysia, anywhere without JMA: no dot', () => {
    expect(badgeDot(away, { ok: true, inSg: false, jma: null })).toBeNull();
    expect(badgeDot(away, null)).toBeNull();
    expect(badgeDot(away, { ok: true, inSg: false, jma: null, dot: 'red' })).toBeNull();
  });
  it('Japan: JMA\'s worst level, and none when JMA has none', () => {
    expect(badgeDot(away, { ok: true, inSg: false, jma: { status: 'ok', dot: 'red' } })).toBe('red');
    expect(badgeDot(away, { ok: true, inSg: false, jma: { status: 'ok', dot: null } })).toBeNull();
  });
  for (const [name, f] of Object.entries({ cuisine: 'web/cuisine/src/v2/App.jsx', transport: 'web/transport/src/App.jsx', hawker: 'web/hawker/src/App.jsx' })) {
    it(`${name}: every badge takes its dot from badgeDot`, () => {
      const bs = code(f).match(/<WeatherBadge\b[^>]*>/g) || [];
      expect(bs.length).toBeGreaterThan(0);
      for (const b of bs) expect(b, b).toMatch(/\bdot=\{badgeDot\(outside, abroad\)\}/);
    });
  }
});

describe('I12 — the sheet says "No warnings" only with a current bulletin', () => {
  it('the line for each JMA state', () => {
    expect(jmaLineKey({ status: 'ok', warnings: [] })).toBe('jma.none');
    expect(jmaLineKey({ status: 'ok', warnings: [{ name: '雷注意報', level: 'advisory' }] })).toBeNull();
    // v0.62.963 — Amendment 2: a bulletin older than 24 h was received, so "received yet" was untrue for it.
    expect(jmaLineKey({ status: 'stale', warnings: [] })).toBe('jma.noRecent');
    expect(jmaLineKey({ status: 'none-yet', warnings: [] })).toBe('jma.noBulletin');
    expect(jmaLineKey(undefined)).toBe('jma.noBulletin');
  });
});

describe('C7 — the strip shows JMA\'s worst current warning, and nothing otherwise', () => {
  const ab = (jma) => ({ ok: true, inSg: false, jma });
  it('the first (worst) warning of a current bulletin', () => {
    expect(topJma(ab({ status: 'ok', warnings: [{ name: '大雨警報', level: 'warning' }, { name: '雷注意報', level: 'advisory' }] })))
      .toEqual({ name: '大雨警報', level: 'warning' });
  });
  it('nothing for an all-clear, a stale or missing bulletin, or a city outside Japan', () => {
    expect(topJma(ab({ status: 'ok', warnings: [] }))).toBeNull();
    expect(topJma(ab({ status: 'stale', warnings: [{ name: '大雨警報', level: 'warning' }] }))).toBeNull();
    expect(topJma(ab(null))).toBeNull();
    expect(topJma(null)).toBeNull();
  });
  it('the strip component uses it', () => {
    expect(code('web/_shared/components/OutsideNowStrip.jsx')).toMatch(/topJma\(abroad\)/);
  });
});

describe('the four-day range below zero (found by the live run of every city, 01-11 \'26: Harbin read "-9-1°C")', () => {
  it('a negative end switches the separator, so the range stays readable', () => {
    expect(outlookTemp(-9, 1, 'C')).toBe('-9 / 1°C');
    expect(outlookTemp(-9, -1, 'C')).toBe('-9 / -1°C');
    expect(outlookTemp(-9, 1, 'F')).toBe('16-34°F'); // both ends positive in °F
  });
  it('Singapore\'s form is untouched', () => {
    expect(outlookTemp(25, 33, 'C')).toBe('25-33°C');
  });
});

describe('the sheet\'s small formatters', () => {
  it('wind in km/h with the localised compass point', () => {
    expect(windText({ windKmh: 5, windFrom: 'SW' }, 'en')).toBe('Wind 5 km/h from SW');
    expect(windText({ windKmh: 12, windFrom: 'NE' }, 'ja')).toMatch(/北東/);
  });
  it('the reading time in the city\'s own zone, not Singapore\'s', () => {
    expect(localTime('2026-11-01T08:00:00Z', 'Asia/Tokyo')).toBe('17:00');
    expect(localTime('2026-11-01T08:00:00Z', 'Europe/Paris')).toBe('09:00');
  });
});

describe('C5 — the route', () => {
  it('index.js serves /api/weather/abroad from weather.abroadForPoint with the JMA module and the shared cache', () => {
    const c = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    expect(c).toMatch(/app\.get\('\/api\/weather\/abroad'/);
    expect(c).toMatch(/weather\.abroadForPoint\(/);
    expect(c).toMatch(/require\('\.\/jma-warnings'\)/);
    expect(c).toMatch(/weather\.summaryGlobal\(lat, lng, \{ cache:/);
  });
});
