// __tests__/poi-i18n.test.js — v0.62.958.
//
// Spec: doc/Feature/2026-10-30-map-language-and-kept-settings.spec.md, Part A (I1, I2, I3, I9).
//
// Operator, 30-10 '26: "When I switch languages, I realise the police station isn't translated". SPF publishes its
// names in English only, so a second line is COMPOSED from the name's own pattern — and the operator's rule is
// "Composed, only when complete": a line that is half English ("义顺 Neighbourhood Police 中心", which is what the
// existing helpers produce today) must never ship. These tests run every shipped name and every shipped hours line,
// not a sample, because the failure being guarded is the one row nobody looked at.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  POI_LOCALES, policeSecondLine, hospitalSecondLine, localiseHoursLine, poiTerm, POI_TABLES
} from '../web/_shared/lib/poi-i18n.js';

const require = createRequire(import.meta.url);
const police = require('../data/geo-police.json').features;
const hospitals = require('../data/geo-hospitals.json').features;
const clinics = require('../data/geo-clinics.json').features;
const taxis = require('../data/geo-taxis.json').features;

const NON_LATIN = ['ru', 'zh', 'ja', 'ko'];
const LATIN = ['fr', 'de', 'es', 'id'];
const PATTERN = /^(.*?)\s+(Neighbourhood Police Centre|Neighbourhood Police Post|Police Divisional HQ|Police Divisional Head Quarters|Police Division)\s*(\((Self-Help Kiosks Only|Temporarily Closed)\))?$/;

describe('I1 — a composed police line is complete or absent', () => {
  it('9 locales', () => {
    expect(POI_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });
  it('in ru, zh, ja and ko no line contains a Latin letter; no line anywhere echoes the English name', () => {
    expect(police.length).toBe(128);
    for (const f of police) {
      for (const lang of POI_LOCALES) {
        const r = policeSecondLine(f.name, lang);
        if (!r) continue;
        expect(r.text, `${lang}: ${f.name}`).not.toBe(f.name);
        if (NON_LATIN.includes(lang)) expect(r.text, `${lang}: ${f.name}`).not.toMatch(/[A-Za-z]/);
      }
    }
  });
  it('English never gets a second line', () => {
    for (const f of police) expect(policeSecondLine(f.name, 'en')).toBe(null);
  });
});

describe('I2 — police coverage, measured', () => {
  const count = (lang) => police.filter((f) => policeSecondLine(f.name, lang)).length;
  it('105 names follow the pattern; the 23 headquarters units get no line in any locale', () => {
    const patterned = police.filter((f) => PATTERN.test(f.name));
    expect(patterned.length).toBe(105);
    for (const f of police.filter((x) => !PATTERN.test(x.name))) {
      for (const lang of POI_LOCALES) expect(policeSecondLine(f.name, lang), `${lang}: ${f.name}`).toBe(null);
    }
  });
  it('fr, de, es and id: all 105 get the type and status in their own words', () => {
    for (const lang of LATIN) expect(count(lang), lang).toBe(105);
  });
  it('the place renders fully native for at least 87 in zh and 88 in ja, ko and ru', () => {
    expect(count('zh')).toBeGreaterThanOrEqual(87);
    for (const lang of ['ja', 'ko', 'ru']) expect(count(lang), lang).toBeGreaterThanOrEqual(88);
  });
  it('a status in the English name is carried into the line, so a closed station never reads as open', () => {
    const closed = police.filter((f) => /\(Temporarily Closed\)$/.test(f.name));
    expect(closed.length).toBe(13);
    for (const lang of POI_LOCALES.slice(1)) {
      const status = POI_TABLES.policeStatus['Temporarily Closed'][lang];
      for (const f of closed) {
        const r = policeSecondLine(f.name, lang);
        if (r) expect(r.text, `${lang}: ${f.name}`).toContain(status);
      }
    }
  });
  it('a known example composes in the expected order', () => {
    const fr = policeSecondLine('Tanah Merah Neighbourhood Police Post (Temporarily Closed)', 'fr');
    expect(fr.text).toMatch(/^Poste de police de quartier · Tanah Merah/);
    expect(fr.text).toMatch(/fermé temporairement/);
  });
});

describe('Polyclinics — complete or absent, 28 of 28 in zh and ko', () => {
  const polys = hospitals.filter((f) => /Polyclinic$/.test(f.name));
  it('28 polyclinics, each with a native line in zh and ko', () => {
    expect(polys.length).toBe(28);
    for (const lang of ['zh', 'ko']) {
      const lines = polys.map((f) => hospitalSecondLine(f.name, lang)).filter(Boolean);
      expect(lines.length, lang).toBe(28);
      for (const l of lines) expect(l.text).not.toMatch(/[A-Za-z]/);
    }
  });
  it('a hospital that is not a polyclinic gets no composed line', () => {
    const other = hospitals.find((f) => !/Polyclinic$/.test(f.name));
    for (const lang of POI_LOCALES) expect(hospitalSecondLine(other.name, lang)).toBe(null);
  });
});

describe('I3 — every shipped hours line translates', () => {
  const lines = [
    ...clinics.flatMap((f) => (Array.isArray(f.hours) ? f.hours : [])),
    ...hospitals.flatMap((f) => (Array.isArray(f.hours) ? f.hours : []))
  ];
  const ENGLISH = /\b(AM|PM|Closed|Open|hours|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b/;
  it('7,861 lines; in every other locale each one changes and keeps no English word', () => {
    expect(lines.length).toBe(7861);
    for (const lang of POI_LOCALES.slice(1)) {
      let bad = 0;
      for (const l of lines) {
        const out = localiseHoursLine(l, lang);
        if (out === l || ENGLISH.test(out)) bad++;
      }
      expect(bad, lang).toBe(0);
    }
  });
  it('English is returned unchanged, and an unparseable line is shown as it is', () => {
    expect(localiseHoursLine('Monday: 9:00 AM – 5:00 PM', 'en')).toBe('Monday: 9:00 AM – 5:00 PM');
    expect(localiseHoursLine('By appointment only', 'de')).toBe('By appointment only');
  });
  it('times convert correctly, including an inherited meridiem, noon and midnight', () => {
    expect(localiseHoursLine('Monday: 9:00 AM – 1:00 PM, 2:00 – 5:30 PM', 'de'))
      .toBe('Montag: 09:00–13:00, 14:00–17:30');
    expect(localiseHoursLine('Sunday: 12:00 AM – 12:00 PM', 'fr')).toBe('dimanche : 00:00–12:00');
    expect(localiseHoursLine('Friday: Closed', 'zh')).toBe('星期五：休息');
    expect(localiseHoursLine('Tuesday: Open 24 hours', 'ja')).toBe('火曜日：24時間営業');
  });
});

describe('I9 — every table value exists in all 9 locales', () => {
  it('police types and statuses, hospital categories and phone purposes, taxi names, polyclinic', () => {
    for (const [table, rows] of Object.entries(POI_TABLES)) {
      for (const [key, row] of Object.entries(rows)) {
        for (const l of POI_LOCALES) expect(typeof row[l] === 'string' && row[l].trim(), `${table}.${key}.${l}`).toBeTruthy();
      }
    }
  });
  it('every shipped hospital category, phone purpose and taxi name has a row', () => {
    for (const f of hospitals) {
      expect(POI_TABLES.hospitalCategory[f.category], f.category).toBeTruthy();
      for (const p of f.phones || []) if (p.purpose && p.purpose !== 'Main') expect(POI_TABLES.phonePurpose[p.purpose], p.purpose).toBeTruthy();
    }
    for (const f of taxis) expect(poiTerm('taxi', f.name, 'ko'), f.name).not.toBe(f.name);
  });
  it('an unknown value falls back to itself rather than to nothing', () => {
    expect(poiTerm('hospitalCategory', 'Something new', 'zh')).toBe('Something new');
  });
});
