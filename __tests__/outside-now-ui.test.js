// __tests__/outside-now-ui.test.js — v0.62.952.
//
// Spec: doc/Feature/2026-10-29-outside-now-alerts.spec.md (I3, I5, I6, I7, C6, C7, C8).
//
// The root suite runs in node without React, so the chip, strip and sheet are covered here through their pure helpers
// (web/_shared/lib/outside-now-i18n.js) and by reading the component and app sources; the built apps are rendered
// headless separately and the screenshots go on the PR.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  OUTSIDE_STRINGS, OUTSIDE_LOCALES, ROW_SOURCE, ot, topWarning, stripText, dismissKey, sheetRows, levelKey, rowTone, hhmm,
} from '../web/_shared/lib/outside-now-i18n.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const src = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Drop whole-line // comments and /* */ blocks, so a comment QUOTING a rule cannot satisfy or trip a check on code.
const code = (p) => src(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const at = (hhmm_) => `2026-10-29T${hhmm_}:00+08:00`;
const payload = (warnings, over = {}) => ({
  ok: true, inSg: true, place: { isDefault: false }, dot: warnings.length ? 'red' : 'green', warnings,
  rows: {
    heat: { status: 'ok', level: warnings.includes('heat') ? 'high' : 'low', wbgt: 33.4, station: 'Cathay Green', at: at('13:00') },
    lightning: { status: 'ok', level: warnings.includes('lightning') ? 'warn' : 'clear', count: 2, nearestKm: 2.1, at: at('13:28') },
    flood: { status: 'ok', level: warnings.includes('flood') ? 'warn' : 'none', alerts: warnings.includes('flood') ? [{ text: 'Orchard Rd', km: null }] : [], at: at('13:29') },
    air: { status: 'ok', level: warnings.includes('haze') ? 'unhealthy' : 'good', psi: warnings.includes('haze') ? 150 : 40, pm25: 11, region: 'south', at: at('13:00') },
    uv: { status: 'ok', level: 'veryHigh', index: 9, warn: warnings.includes('uv'), at: at('13:00') },
    parking: null,
    ...over,
  },
});

describe('I6 — every new string exists in all nine locales', () => {
  it('nine locales, the same nine the apps carry', () => {
    expect(OUTSIDE_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });
  for (const [key, row] of Object.entries(OUTSIDE_STRINGS)) {
    it(key, () => {
      for (const l of OUTSIDE_LOCALES) {
        expect(typeof row[l] === 'string' && row[l].trim().length > 0, `${key}.${l}`).toBe(true);
        // Same placeholders as English, so no locale drops the number it is about.
        const ph = (s) => (s.match(/\{\w+\}/g) || []).sort();
        expect(ph(row[l]), `${key}.${l} placeholders`).toEqual(ph(row.en));
      }
    });
  }
  it('a missing locale falls back to English rather than printing the key', () => {
    expect(ot('title', 'xx')).toBe('Outside now');
  });
});

describe('I5 — rows name NEA or PUB, and nothing says LTA', () => {
  it('the source map is NEA and PUB only, with no source for parking', () => {
    expect(new Set(Object.values(ROW_SOURCE))).toEqual(new Set(['NEA', 'PUB']));
    expect(ROW_SOURCE.flood).toBe('PUB');
    expect(ROW_SOURCE.parking).toBeUndefined();
  });
  it('no string in any locale says LTA', () => {
    const all = Object.values(OUTSIDE_STRINGS).flatMap((r) => Object.values(r)).join('\n');
    expect(all).not.toMatch(/\bLTA\b/);
  });
  for (const f of ['web/_shared/components/OutsideNowStrip.jsx', 'web/_shared/components/OutsideNowSheet.jsx',
    'web/_shared/components/WeatherBadge.jsx', 'web/cuisine/src/v2/components/WeatherBadge.jsx', 'web/_shared/lib/use-outside-now.js']) {
    it(`${f} renders no "LTA"`, () => {
      expect(code(f)).not.toMatch(/\bLTA\b/);
    });
  }
});

describe('I7 — the strip shows the single most urgent warning (C3)', () => {
  const every = ['lightning', 'flood', 'haze', 'heat', 'uv'];
  it('default order: lightning, flood, haze, heat, uv', () => {
    expect(topWarning(payload(every), 'cuisine')).toBe('lightning');
    expect(topWarning(payload(['uv', 'heat', 'haze']), 'cuisine')).toBe('haze');
    expect(topWarning(payload(['uv', 'heat']), 'train')).toBe('heat');
  });
  it('Hawker moves heat ahead of haze, and nothing else', () => {
    expect(topWarning(payload(['haze', 'heat', 'uv']), 'hawker')).toBe('heat');
    expect(topWarning(payload(every), 'hawker')).toBe('lightning');
    expect(topWarning(payload(['flood', 'heat']), 'hawker')).toBe('flood');
  });
  it('I3: nothing outside Singapore, nothing without a warning', () => {
    expect(topWarning({ ok: true, inSg: false, dot: null, warnings: [], rows: null }, 'cuisine')).toBeNull();
    expect(topWarning(payload([]), 'cuisine')).toBeNull();
    expect(topWarning(null, 'cuisine')).toBeNull();
  });
  it('each strip names what it is about, with the number that matters', () => {
    const d = payload(every);
    expect(stripText('lightning', d, 'cuisine', 'en')).toBe('Lightning 2.1 km away · pick somewhere sheltered');
    expect(stripText('flood', d, 'cuisine', 'en')).toBe('Flood alert · Orchard Rd');
    expect(stripText('haze', d, 'cuisine', 'en')).toBe('Unhealthy air · PSI 150');
    expect(stripText('heat', d, 'cuisine', 'en')).toBe('High heat stress · take it easy outdoors');
    expect(stripText('heat', d, 'hawker', 'en')).toBe('High heat stress · open-air centres are hot now');
    expect(stripText('uv', d, 'cuisine', 'ko')).toBe('자외선 9 · 그늘을 찾으세요');
  });
  it('a flood alert with a distance shows it', () => {
    const d = payload(['flood'], { flood: { status: 'ok', level: 'warn', alerts: [{ text: 'Scotts Rd', km: 1.4 }], at: at('13:29') } });
    expect(stripText('flood', d, 'train', 'en')).toBe('Flood alert · Scotts Rd (1.4 km)');
  });
});

describe('C7 — a dismissed strip returns only when the warning changes', () => {
  it('the dismiss key follows the level, not the reading', () => {
    const a = payload(['haze']);
    const b = payload(['haze'], { air: { ...a.rows.air, psi: 160 } });
    const c = payload(['haze'], { air: { ...a.rows.air, level: 'veryUnhealthy', psi: 230 } });
    expect(dismissKey('haze', a)).toBe(dismissKey('haze', b));
    expect(dismissKey('haze', a)).not.toBe(dismissKey('haze', c));
    expect(dismissKey('heat', a)).not.toBe(dismissKey('haze', a));
  });
});

describe('Sheet rows (C6) and levels', () => {
  it('only Cuisine has a parking row; Hawker leads with heat and UV', () => {
    expect(sheetRows('cuisine')).toContain('parking');
    expect(sheetRows('train')).not.toContain('parking');
    expect(sheetRows('hawker')).not.toContain('parking');
    expect(sheetRows('hawker').slice(0, 2)).toEqual(['heat', 'uv']);
  });
  it('labels and tones follow the levels, and an unavailable row says so', () => {
    const d = payload(['heat', 'haze']);
    expect(levelKey(d.rows.heat, 'heat')).toBe('lvl.high');
    expect(rowTone(d.rows.heat, 'heat')).toBe('red');
    expect(rowTone(d.rows.air, 'air')).toBe('red');
    expect(rowTone({ status: 'ok', psi: 70 }, 'air')).toBe('amber');
    expect(levelKey({ status: 'unavailable' }, 'uv')).toBe('lvl.unavailable');
    expect(rowTone({ status: 'unavailable' }, 'uv')).toBe('muted');
    expect(hhmm('2026-10-29T15:12:05.313+08:00')).toBe('15:12');
  });
});

describe('Wiring — each app uses the route, the dot, the strip and the sheet (C5, C8)', () => {
  const apps = {
    cuisine: 'web/cuisine/src/v2/App.jsx',
    transport: 'web/transport/src/App.jsx',
    hawker: 'web/hawker/src/App.jsx',
  };
  for (const [name, f] of Object.entries(apps)) {
    it(name, () => {
      const c = code(f);
      expect(c).toMatch(/useOutsideNow\(/);
      expect(c).toMatch(/<OutsideNowStrip\b/);
      expect(c).toMatch(/<OutsideNowSheet\b/);
      // Every WeatherBadge in the app carries the dot and opens the sheet (Hawker has three header variants).
      const badges = c.match(/<WeatherBadge\b[^>]*>/g) || [];
      expect(badges.length).toBeGreaterThan(0);
      for (const b of badges) {
        expect(b, `${name}: ${b}`).toMatch(/\bdot=/);
        expect(b, `${name}: ${b}`).toMatch(/\bonClick=/);
      }
    });
  }
  it('only Cuisine asks for parking', () => {
    expect(code(apps.cuisine)).toMatch(/useOutsideNow\(\{[^}]*parking:\s*true/);
    expect(code(apps.transport)).not.toMatch(/parking:\s*true/);
    expect(code(apps.hawker)).not.toMatch(/parking:\s*true/);
  });
  it('the sheet renders nothing outside Singapore', () => {
    expect(code('web/_shared/components/OutsideNowSheet.jsx')).toMatch(/!data\.inSg/);
  });
});
