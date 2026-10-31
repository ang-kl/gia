// __tests__/weather-outlook.test.js — v0.62.960.
//
// Spec: doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md (I4, I5, I6; C4, C5, C6).
//
// NEA's four-day outlook, from GET /v2/real-time/api/four-day-outlook. The fixture copies the shape measured live on
// 31-10 '26 (issued 05:41, covering Sunday to Wednesday). The server normalises and caches it; the Outside-now sheet
// labels each day from NEA's own text, because NEA publishes no list of its forecast codes.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  OUTSIDE_STRINGS, OUTSIDE_LOCALES, ot, outlookClass, outlookLabel, outlookDay, outlookTemp, OUTLOOK_CLASSES,
} from '../web/_shared/lib/outside-now-i18n.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const wo = require('../weather-outlook.js');
const ROOT = path.join(__dirname, '..');
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const day = (date, text, low, high, code_ = 'TL') => ({
  day: 'x', forecast: { code: code_, summary: 'Afternoon thundery showers', text },
  relativeHumidity: { high: 95, low: 60, unit: 'Percentage' },
  temperature: { high, low, unit: 'Degrees Celsius' },
  timestamp: `${date}T00:00:00+08:00`,
  wind: { direction: 'SE', speed: { high: 15, low: 5 } },
});
const live = () => ({
  code: 0,
  errorMsg: '',
  data: {
    records: [{
      date: '2026-10-31',
      updatedTimestamp: '2026-10-31T05:41:09+08:00',
      timestamp: '2026-10-31T05:33:00+08:00',
      forecasts: [
        day('2026-11-01', 'Thundery Showers', 26, 34),
        day('2026-11-02', 'Thundery Showers', 25, 33),
        day('2026-11-03', 'Partly Cloudy (Day)', 25, 33, 'PC'),
        day('2026-11-04', 'Showers', 25, 33, 'SH'),
      ],
    }],
  },
});

describe('I4 — normalise', () => {
  it('four days from tomorrow, with NEA\'s issue time', () => {
    const n = wo.normalise(live());
    expect(n.ok).toBe(true);
    expect(n.issuedAt).toBe('2026-10-31T05:41:09+08:00');
    expect(n.days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04']);
    expect(n.days[0]).toMatchObject({ text: 'Thundery Showers', lowC: 26, highC: 34, humidityLow: 60, humidityHigh: 95 });
    expect(typeof n.days[0].emoji).toBe('string');
  });
  it('the first day is after the issue date (A1: it starts tomorrow, as NEA issues it)', () => {
    const n = wo.normalise(live());
    expect(n.days[0].date > n.issuedAt.slice(0, 10)).toBe(true);
  });
  it('never more than four days', () => {
    const r = live();
    r.data.records[0].forecasts.push(day('2026-11-05', 'Fair (Day)', 25, 33));
    expect(wo.normalise(r).days).toHaveLength(4);
  });
  it('the free-text summary is not passed on (C5: it is English prose)', () => {
    expect(JSON.stringify(wo.normalise(live()))).not.toMatch(/Afternoon thundery showers/);
  });
  for (const [name, raw] of [
    ['null', null], ['no data', { code: 0 }], ['no records', { code: 0, data: { records: [] } }],
    ['no forecasts', { code: 0, data: { records: [{ updatedTimestamp: 'x', forecasts: [] }] } }],
    ['error code', { code: 1, data: live().data }],
  ]) {
    it(`malformed (${name}) → { ok: false }`, () => {
      expect(wo.normalise(raw)).toEqual({ ok: false });
    });
  }
  it('a day with non-numeric temperatures is dropped, not shown as NaN', () => {
    const r = live();
    r.data.records[0].forecasts[1].temperature = { high: 'x', low: null };
    const n = wo.normalise(r);
    expect(n.days.map((d) => d.date)).toEqual(['2026-11-01', '2026-11-03', '2026-11-04']);
  });
});

describe('I4 — cached for 30 minutes as nea:4day, { ok: false } on any failure (C6)', () => {
  const fakeCache = (initial = null) => {
    const store = new Map(initial ? [[wo.CACHE_KEY, initial]] : []);
    const calls = [];
    return {
      calls,
      get: async (k) => store.get(k) ?? null,
      setEx: async (k, ttl, v) => { calls.push([k, ttl]); store.set(k, v); },
    };
  };
  it('the key and TTL are the spec\'s', () => {
    expect(wo.CACHE_KEY).toBe('nea:4day');
    expect(wo.TTL_S).toBe(1800);
  });
  it('a miss fetches once and caches for 1,800 s', async () => {
    const cache = fakeCache();
    let n = 0;
    const out = await wo.getOutlook({ fetchJson: async () => { n++; return live(); }, cache });
    expect(out.ok).toBe(true);
    expect(n).toBe(1);
    expect(cache.calls).toEqual([['nea:4day', 1800]]);
  });
  it('a hit does not fetch', async () => {
    const cache = fakeCache(JSON.stringify(wo.normalise(live())));
    let n = 0;
    const out = await wo.getOutlook({ fetchJson: async () => { n++; return live(); }, cache });
    expect(n).toBe(0);
    expect(out.days).toHaveLength(4);
  });
  it('a failed fetch is { ok: false } and is not cached', async () => {
    const cache = fakeCache();
    const out = await wo.getOutlook({ fetchJson: async () => { throw new Error('ECONNRESET'); }, cache });
    expect(out).toEqual({ ok: false });
    expect(cache.calls).toEqual([]);
  });
  it('an empty answer is { ok: false } and is not cached', async () => {
    const cache = fakeCache();
    expect(await wo.getOutlook({ fetchJson: async () => ({ code: 0, data: { records: [] } }), cache })).toEqual({ ok: false });
    expect(cache.calls).toEqual([]);
  });
  it('a broken cache does not break the outlook', async () => {
    const cache = { get: async () => { throw new Error('redis down'); }, setEx: async () => { throw new Error('redis down'); } };
    expect((await wo.getOutlook({ fetchJson: async () => live(), cache })).ok).toBe(true);
  });
  it('works with no cache at all', async () => {
    expect((await wo.getOutlook({ fetchJson: async () => live(), cache: null })).ok).toBe(true);
  });
  it('the route serves it and fetches nothing else', () => {
    // Whole-line comments only: index.js has a "/*" inside code earlier on, so block-stripping would swallow the route.
    const c = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const i = c.indexOf("app.get('/api/weather/outlook'");
    expect(i).toBeGreaterThan(-1);
    const body = c.slice(i, i + 1200);
    expect(body).toMatch(/require\('\.\/weather-outlook'\)/);
    expect(body).toMatch(/getOutlook\(/);
    expect(body).toMatch(/ok: false/);
  });
});

describe('I5 — labels keyed on NEA\'s text; unknown text shown as NEA writes it', () => {
  // Every forecast text seen in NEA's 4-day and 2-hour vocabularies, with the class each must land in.
  const SEEN = {
    'Thundery Showers': 'thunder', 'Heavy Thundery Showers': 'thunder', 'Heavy Thundery Showers with Gusty Winds': 'thunder',
    'Showers': 'showers', 'Light Showers': 'showers', 'Passing Showers': 'showers', 'Heavy Showers': 'showers',
    'Light Rain': 'rain', 'Moderate Rain': 'rain', 'Heavy Rain': 'rain', 'Drizzle': 'rain',
    'Hazy': 'haze', 'Slightly Hazy': 'haze', 'Mist': 'haze', 'Fog': 'haze',
    'Windy': 'windy', 'Overcast': 'overcast',
    'Partly Cloudy': 'partlyCloudy', 'Partly Cloudy (Day)': 'partlyCloudy', 'Partly Cloudy (Night)': 'partlyCloudy',
    'Cloudy': 'cloudy', 'Fair': 'fair', 'Fair (Day)': 'fair', 'Fair (Night)': 'fair', 'Fair & Warm': 'fair',
  };
  for (const [text, cls] of Object.entries(SEEN)) {
    it(`${text} → ${cls}`, () => {
      expect(outlookClass(text)).toBe(cls);
      for (const l of OUTSIDE_LOCALES) expect(outlookLabel(text, l)).toBe(ot(`wx.${cls}`, l));
    });
  }
  it('order matters: "Partly Cloudy" is not "Cloudy", and "Thundery Showers" is not "Showers"', () => {
    const order = OUTLOOK_CLASSES.map(([c]) => c);
    expect(order.indexOf('partlyCloudy')).toBeLessThan(order.indexOf('cloudy'));
    expect(order.indexOf('thunder')).toBeLessThan(order.indexOf('showers'));
  });
  it('text that matches nothing is NEA\'s own words, in every locale', () => {
    for (const l of OUTSIDE_LOCALES) {
      expect(outlookLabel('Sumatra Squall', l)).toBe('Sumatra Squall');
      expect(outlookClass('Sumatra Squall')).toBeNull();
    }
    expect(outlookLabel('', 'fr')).toBe('');
  });
  it('the weekday is the reader\'s own, from Intl', () => {
    expect(outlookDay('2026-11-01', 'en')).toBe(new Intl.DateTimeFormat('en', { weekday: 'short', timeZone: 'Asia/Singapore' }).format(new Date('2026-11-01T12:00:00+08:00')));
    expect(outlookDay('2026-11-01', 'en')).toMatch(/^Sun/);
    expect(outlookDay('2026-11-01', 'fr')).toMatch(/^dim/i);
    expect(outlookDay('nope', 'en')).toBe('');
  });
  it('the range follows °C / °F', () => {
    expect(outlookTemp(25, 33, 'C')).toBe('25-33°C');
    expect(outlookTemp(25, 33, 'F')).toBe('77-91°F');
  });
});

describe('I5 — the sheet shows the block, fetched only when it opens', () => {
  it('use-outlook fetches /api/weather/outlook only while enabled', () => {
    const c = code('web/_shared/lib/use-outlook.js');
    expect(c).toMatch(/\/api\/weather\/outlook/);
    expect(c).toMatch(/if \(!enabled\) return/);
    expect(c).not.toMatch(/setInterval/);
  });
  it('the sheet renders the four days with the shared helpers and the issue time', () => {
    const c = code('web/_shared/components/OutsideNowSheet.jsx');
    expect(c).toMatch(/useOutlook\(/);
    expect(c).toMatch(/outlookLabel\(/);
    expect(c).toMatch(/outlookDay\(/);
    expect(c).toMatch(/outlookTemp\(/);
    expect(c).toMatch(/'outlook\.title'/);
    expect(c).toMatch(/'outlook\.issued'/);
    expect(c).toMatch(/TEMP_UNIT_KEY/);
  });
});

describe('I6 — every new string exists in all nine locales', () => {
  const NEW = ['outlook.title', 'outlook.issued', 'licence.sg', 'abroad.note', 'abroad.humidity', 'abroad.credit',
    ...OUTLOOK_CLASSES.map(([c]) => `wx.${c}`)];
  for (const k of NEW) {
    it(k, () => {
      expect(OUTSIDE_STRINGS[k], k).toBeTruthy();
      for (const l of OUTSIDE_LOCALES) expect(typeof OUTSIDE_STRINGS[k][l] === 'string' && OUTSIDE_STRINGS[k][l].trim().length > 0, `${k}.${l}`).toBe(true);
    });
  }
  it('the condition labels are translated, not English copied into other locales', () => {
    for (const [c] of OUTLOOK_CLASSES) {
      for (const l of ['zh', 'ja', 'ko', 'ru']) expect(OUTSIDE_STRINGS[`wx.${c}`][l], `wx.${c}.${l}`).not.toBe(OUTSIDE_STRINGS[`wx.${c}`].en);
    }
  });
});
