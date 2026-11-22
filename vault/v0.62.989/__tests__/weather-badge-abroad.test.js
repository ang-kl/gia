// __tests__/weather-badge-abroad.test.js — v0.62.960.
//
// Spec: doc/Feature/2026-10-30-weather-fixes-and-4-day-forecast.spec.md (I1, I2, I3; C1, C2, C3).
//
// The temperature badge follows the reader in all three Mini Apps; abroad its tap opens a small weather card that
// carries Open-Meteo's required credit; in Singapore the tap opens the Outside-now sheet, which carries the Singapore
// Open Data Licence notice. The root suite has no React, so this reads the sources the way outside-now-ui.test.js does.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { OUTSIDE_STRINGS, OUTSIDE_LOCALES } from '../web/_shared/lib/outside-now-i18n.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const SHARED = 'web/_shared/components/WeatherBadge.jsx';
const CUISINE = 'web/cuisine/src/v2/components/WeatherBadge.jsx';
const APPS = { cuisine: 'web/cuisine/src/v2/App.jsx', transport: 'web/transport/src/App.jsx', hawker: 'web/hawker/src/App.jsx' };
const badges = (f) => code(f).match(/<WeatherBadge\b[^>]*>/g) || [];

describe('I1 — the badge asks for the reader\'s own location', () => {
  for (const f of [SHARED, CUISINE]) {
    it(`${f} takes lat/lng and sends them`, () => {
      const c = code(f);
      expect(c).toMatch(/function WeatherBadge\(\{[^}]*\blat\b[^}]*\blng\b/);
      expect(c).toMatch(/\/api\/weather\/summary\$\{qs\}/);
      expect(c).toMatch(/\?lat=\$\{lat\}&lng=\$\{lng\}/);
      expect(c).toMatch(/\[lat, lng\]/);
    });
  }
  for (const app of ['transport', 'hawker']) {
    it(`${app}: every badge passes the Outside-now location`, () => {
      const bs = badges(APPS[app]);
      expect(bs.length).toBeGreaterThan(0);
      for (const b of bs) {
        expect(b, b).toMatch(/\blat=\{outsideLoc\?\.lat \?\? null\}/);
        expect(b, b).toMatch(/\blng=\{outsideLoc\?\.lng \?\? null\}/);
      }
    });
  }
  it('cuisine still passes its active location', () => {
    for (const b of badges(APPS.cuisine)) expect(b).toMatch(/\blat=\{/);
  });
});

// v0.62.962 — spec doc/Feature/2026-11-01-local-weather-every-city.spec.md, C3: the abroad "Outside now" sheet
// replaces v0.62.960's small card, and C2 replaces Open-Meteo with MET Norway. This block used to pin the card and
// Open-Meteo's credit; it now pins that the card is gone, that the tap opens the sheet in Singapore AND abroad, and
// that the credit (carried by the sheet) names MET Norway. The I1 and I3 blocks above and below are unchanged.
describe('I2 — the tap opens the Outside-now sheet, in Singapore and abroad; the credit names MET Norway', () => {
  for (const f of [SHARED, CUISINE]) {
    it(`${f}: no small card any more; the tap is the one the app passes`, () => {
      const c = code(f);
      expect(c).not.toMatch(/data-weather-card/);
      expect(c).not.toMatch(/open-meteo/i);
      expect(c).toMatch(/const tap = onClick;/);
    });
  }
  for (const [app, f] of Object.entries(APPS)) {
    it(`${app}: the sheet tap is passed in Singapore, and abroad once MET has answered`, () => {
      const bs = badges(f);
      expect(bs.length).toBeGreaterThan(0);
      for (const b of bs) expect(b, b).toMatch(/onClick=\{\(outside\?\.inSg \|\| abroad\?\.ok\) \? openOutside : null\}/);
    });
  }
  it('the credit names MET Norway in every locale', () => {
    for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS['abroad.credit'][l]).toMatch(/MET Norway/);
  });
  it('the Singapore-only line, in every locale', () => {
    for (const l of OUTSIDE_LOCALES) expect(OUTSIDE_STRINGS['abroad.sgOnly'][l].length).toBeGreaterThan(10);
    expect(OUTSIDE_STRINGS['abroad.sgOnly'].en).toBe('Heat stress, lightning, flood and air-quality readings are Singapore-only.');
  });
});

describe('I3 — the Outside-now sheet carries the Singapore Open Data Licence notice', () => {
  it('the footer and its link', () => {
    const c = code('web/_shared/components/OutsideNowSheet.jsx');
    expect(c).toMatch(/'licence\.sg'/);
    expect(c).toMatch(/href="https:\/\/data\.gov\.sg\/open-data-licence"/);
  });
  it('the notice names NEA, PUB and data.gov.sg in every locale', () => {
    for (const l of OUTSIDE_LOCALES) {
      const s = OUTSIDE_STRINGS['licence.sg'][l];
      expect(s, l).toMatch(/NEA/);
      expect(s, l).toMatch(/PUB/);
      expect(s, l).toMatch(/data\.gov\.sg/);
    }
  });
});
