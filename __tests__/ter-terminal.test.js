// ter-terminal.test.js — v0.62.983
// Spec doc/Feature/2026-11-09-lta-ter-is-terminal.spec.md (I1, I2, I4, I5).
//
// LTA abbreviates "Terminal" as "Ter" in its bus-stop descriptions ("Changi Airport Ter 1", "Kent Ridge Ter").
// Both abbreviation maps expanded it to "Terrace", so 36 stops on production read "...Terrace" (measured
// 09-11 '26 from soleat.net/api/geo/bus-stops, 5,209 stops). Every one is a terminal: bus, ferry, cargo or
// airport. No LTA road name uses the token, and roads that really are terraces are written out in full.
//
// The list below is those 36 descriptions as LTA writes them: production's served text with "Terrace" put back
// to "Ter". Words the expander had already expanded ("Opposite", "Before") stay expanded; they pass through
// unchanged a second time.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';
import { ABBREV, SG_TERMS, expandAbbrev } from '../web/_shared/lib/sg-terms-i18n.js';

const require = createRequire(import.meta.url);
const { expandSgAbbrev } = require('../sg-address.js');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const LTA_TER_STOPS = [
  'After Changi Airport Ter 2', 'After Tuas Ter', 'AirFreight Ter Building', 'Beach Stn Ter',
  'Before Kampong Bahru Ter', 'Before Kent Ridge Ter', 'Before Tuas Ter', 'Buona Vista Ter',
  'Changi Airport Ter 1', 'Changi Airport Ter 2', 'Changi Airport Ter 3', 'Changi Airport Ter 4',
  'Changi Business Pk Ter', 'Changi Village Ter', 'Gali Batu Ter', 'Ghim Moh Ter', 'JB Sentral Bus Ter',
  'Kampong Bahru Ter', 'Kent Ridge Ter', 'Larkin Ter', 'Lorong 1 Geylang Ter', 'Mobil Marine Ter',
  'Opposite Ghim Moh Ter', 'Opposite Kampong Bahru Ter', 'Opposite Kent Ridge Ter',
  'Opposite Lorong 1 Geylang Ter', 'Opposite SAF Ferry Ter', 'Queen Street Ter', 'SAF Ferry Ter',
  'SATS Cargo Ter', 'Shenton Way Ter', 'Sims Place Ter', "St. Michael's Ter", 'Tanah Merah Ferry Ter',
  'Tuas Ter', 'Upper East Coast Ter',
];

describe('I1 — LTA\'s "Ter" is a terminal', () => {
  it('the list is the 36 measured on production', () => {
    expect(LTA_TER_STOPS.length).toBe(36);
    expect(new Set(LTA_TER_STOPS).size).toBe(36);
  });

  it('every one expands to "...Terminal..." on the server, and none to "Terrace"', () => {
    for (const s of LTA_TER_STOPS) {
      const out = expandSgAbbrev(s);
      expect(out, s).toMatch(/\bTerminal\b/);
      expect(out, s).not.toMatch(/Terrace/);
    }
    expect(expandSgAbbrev('Changi Airport Ter 1')).toBe('Changi Airport Terminal 1');
    expect(expandSgAbbrev('Opposite Kent Ridge Ter')).toBe('Opposite Kent Ridge Terminal');
    expect(expandSgAbbrev('Opp Kent Ridge Ter')).toBe('Opposite Kent Ridge Terminal');
  });

  it('the Mini App map says the same word', () => {
    expect(ABBREV.ter).toBe('terminal');
    expect(expandAbbrev('Ter')).toBe('terminal');
  });
});

describe('I2 — a name written out in full is untouched', () => {
  it('"Marine Terrace" stays a terrace', () => {
    expect(expandSgAbbrev('Marine Terrace')).toBe('Marine Terrace');
    expect(expandSgAbbrev('50A Marine Terrace')).toBe('50A Marine Terrace');
    expect(expandAbbrev('Terrace')).toBe('terrace');
    expect(SG_TERMS.terrace, 'terrace must stay translatable for names written in full').toBeTruthy();
  });

  it('"Ter" inside a longer word is not touched', () => {
    expect(expandSgAbbrev('Terminal 3')).toBe('Terminal 3');
    expect(expandSgAbbrev('Teresa Road')).toBe('Teresa Road');
  });
});

describe('I4 — "terminal" is translated, zh as 终站', () => {
  it('carries all eight locales, with the operator\'s zh choice', () => {
    expect(SG_TERMS.terminal).toEqual({
      fr: 'Terminal', id: 'Terminal', ru: 'Терминал', de: 'Terminal',
      zh: '终站', ja: 'ターミナル', es: 'Terminal', ko: '터미널',
    });
  });
});

describe('I5 — the served bus-stop list is not the cached "Terrace" one', () => {
  const src = fs.readFileSync(path.join(ROOT, 'index.js'), 'utf8');
  const start = src.indexOf("app.get('/api/geo/bus-stops'");
  const route = src.slice(start, src.indexOf('});', start));

  it('finds the route', () => {
    expect(start, 'the /api/geo/bus-stops route moved').toBeGreaterThan(-1);
    expect(route.length).toBeGreaterThan(100);
  });

  it('reads and writes the versioned key, and never the old one', () => {
    expect(route).toContain("const CACHE_KEY = 'geo:busstops:v2';");
    expect(route).not.toMatch(/['"]geo:busstops['"]/);
  });
});
