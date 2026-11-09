// __tests__/map-card-language.test.js — v0.62.958.
//
// Spec: doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md, Part A (I4, I5, I9, I10).
//
// A read-only audit on 30-10 '26 found the map popups' chrome localised and their content mostly English — police
// entirely, plus a dozen literal English words baked into the card builders of all three mapOverlays.js copies, and
// a language switch that left already-drawn labels in the old language in Hawker and Train. The card builders live
// inside createOverlayController and need Google Maps to run, so they are checked by reading their code with comments
// removed (a history note quoting the old English cannot satisfy or trip a check), and the vocabulary they now read is
// checked by calling it.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { POI_CHROME, poiLabel, POI_LOCALES } from '../web/_shared/lib/poi-i18n.js';

const require = createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const code = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

const COPIES = {
  cuisine: 'web/cuisine/src/v2/lib/mapOverlays.js',
  hawker: 'web/hawker/src/lib/mapOverlays.js',
  transport: 'web/transport/src/lib/mapOverlays.js'
};
const WITH_HAWKER_OVERLAY = ['cuisine', 'transport'];
const body = (src, start, end) => {
  const a = src.indexOf(start);
  expect(a, start).toBeGreaterThan(-1);
  const b = src.indexOf(end, a + start.length);
  return src.slice(a, b > a ? b : a + 4000);
};

describe('I4 — no English literal is left in the card and label builders', () => {
  const FORBIDDEN = [
    "' lots'", " lots available", "'Carpark'", 'Wheelchair accessible', '🌐 Website', '📷 Instagram', "'Pick-up'",
    'Pick-up point', 'Taxi stand', 'Google Map ➚', "textContent = 'NEW'", "f.name || 'Clinic'",
    "f.name || 'Hospital'", ": 'Attraction'", "' 🅿 here'", "' ‧ Bus № '", "'≤5 min'", "'20+ min'",
    'escapeHtml(f.status)'
  ];
  it.each(Object.entries(COPIES))('%s', (_n, p) => {
    const src = code(p);
    for (const s of FORBIDDEN) expect(src, `${p}: ${s}`).not.toContain(s);
  });
});

describe('I4 — the cards read the shared vocabulary', () => {
  it.each(Object.entries(COPIES))('%s: police, hospital, hours, taxi, addresses', (_n, p) => {
    const src = code(p);
    expect(src).toMatch(/import \{[^}]*policeSecondLine[^}]*\} from '[./]+_shared\/lib\/poi-i18n\.js'/);
    expect(body(src, 'const poiInfo =', 'const clinicInfo')).toMatch(/policeSecondLine\(f\.name, _lang\)/);
    expect(body(src, 'const poiInfo =', 'const clinicInfo')).toMatch(/placeSecondLine\(f\.address, _lang\)/);
    const clinic = body(src, 'const clinicInfo =', 'const hospitalInfo');
    expect(clinic).toMatch(/localiseHoursLine\(/);
    expect(clinic).toMatch(/placeSecondLine\(f\.street, _lang\)/);
    const hosp = body(src, 'const hospitalInfo =', 'infoCard(h, f)');
    expect(hosp).toMatch(/poiTerm\('hospitalCategory', f\.category, _lang\)/);
    expect(hosp).toMatch(/poiTerm\('phonePurpose', p\.purpose, _lang\)/);
    expect(hosp).toMatch(/hospitalSecondLine\(f\.name, _lang\)/);
    expect(hosp).toMatch(/localiseHoursLine\(/);
    expect(src).toMatch(/poiTerm\('taxi', f\.name( \|\| '')?, _lang\)/);
    const attr = body(src, 'const attractionInfo =', 'const poiInfo');
    expect(attr).toMatch(/placeSecondLine\(f\.address, _lang\)/);
    expect(attr).toMatch(/stationDisplay\(st\.name, _lang\)/);
    expect(attr).toMatch(/scLabel\('exit', _lang\)/);
    expect(body(src, 'function busInfoHtml', '\n}\n')).toMatch(/scLabel\('googleMap', _lang\)/);
  });
  it.each(WITH_HAWKER_OVERLAY)('%s: the hawker overlay card uses the local name, translated status and stations', (n) => {
    const src = code(COPIES[n]);
    expect(body(src, 'function fetchHawkerCentres', '\n}\n')).toMatch(/displayName: c\.displayName \|\| ''/);
    const card = body(src, 'function hawkerCardHtml', 'function openHawkerInfo');
    expect(card).toMatch(/hawkerNameLocal\(f\.displayName \|\| f\.name, _lang\)/);
    expect(card).toMatch(/stationDisplay\(st\.name, _lang\)/);
    expect(card).toMatch(/scLabel\('stalls', _lang/);
    expect(card).toMatch(/poiLabel\('operating', _lang\)/);
  });
  it('the Cuisine carpark card no longer shows its Google Map link twice', () => {
    expect(body(code(COPIES.cuisine), 'const carparkInfo =', 'const attractionInfo')).not.toMatch(/gmapsLinkRow\(/);
  });
});

describe('I5 — a language switch re-renders what is already drawn', () => {
  it.each(Object.entries(COPIES))('%s: setLang calls relanguage, which resets every zoom-band cache', (_n, p) => {
    const src = code(p);
    expect(body(src, 'setLang(l) {', '},')).toMatch(/relanguage\(\)/);
    const r = body(src, 'function relanguage()', '\n  }\n');
    expect(r).toMatch(/info\.close\(\)/);
    for (const cache of ['_busTier', '_tierRendered', '_mode']) expect(r, cache).toContain(cache);
    expect(r).toMatch(/scLabel\('exit', lang\)/);
    expect(r).toMatch(/applyVisibility\(/);
  });
});

describe('I9 — the card words exist in all 9 locales', () => {
  it('every key, every locale, and only brand words may equal the English', () => {
    const BRAND = new Set(['instagram']);
    for (const [key, row] of Object.entries(POI_CHROME)) {
      for (const l of POI_LOCALES) expect(typeof row[l] === 'string' && row[l].trim(), `${key}.${l}`).toBeTruthy();
      if (!BRAND.has(key)) expect(['zh', 'ja', 'ko', 'ru'].every((l) => row[l] !== row.en), key).toBe(true);
    }
  });
  it('templates fill their variables', () => {
    expect(poiLabel('lotsAvailable', 'de', { n: 12 })).toBe('12 Plätze frei');
    expect(poiLabel('busRow', 'zh', { label: poiLabel('minLe', 'zh', { n: 5 }), svcs: '12, 14' })).toContain('12, 14');
  });
});
