// __tests__/country-hints.test.js — v0.61.200

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { detectCountryHint, HINTS } = require('../country-hints.js');

describe('country-hints — basics', () => {
  it('returns null on empty / missing input', () => {
    expect(detectCountryHint('')).toBeNull();
    expect(detectCountryHint(null)).toBeNull();
    expect(detectCountryHint(undefined)).toBeNull();
  });
  it('returns null when no hint matches', () => {
    expect(detectCountryHint('Tanjong Pagar MRT')).toBeNull();
    expect(detectCountryHint('Hawker Centre 123')).toBeNull();
  });
});

describe('country-hints — MY (operator\'s primary failure case)', () => {
  it('detects Times Square KL → MY', () => {
    expect(detectCountryHint('Times Square KL')).toBe('MY');
  });
  it('detects Kuala Lumpur (multi-word)', () => {
    expect(detectCountryHint('Pavilion Kuala Lumpur')).toBe('MY');
  });
  it('detects "kl" word-boundary', () => {
    expect(detectCountryHint('Times Square kl')).toBe('MY');
    // "skl" (no boundary on left) should NOT fire MY
    expect(detectCountryHint('Skl Cafe')).toBeNull();
  });
  it('detects Johor Bahru / JB / Putrajaya', () => {
    expect(detectCountryHint('Komtar JBCC Johor Bahru')).toBe('MY');
    expect(detectCountryHint('shopping in JB')).toBe('MY');
    expect(detectCountryHint('IOI City Mall Putrajaya')).toBe('MY');
  });
  it('detects Skudai / Iskandar / Pasir Gudang / Mersing', () => {
    expect(detectCountryHint('Restoran Skudai Lama')).toBe('MY');
    expect(detectCountryHint('Iskandar Puteri')).toBe('MY');
    expect(detectCountryHint('Pasir Gudang industrial')).toBe('MY');
    expect(detectCountryHint('Mersing jetty')).toBe('MY');
  });
});

describe('country-hints — TH / ID / PH / VN / JP / KR', () => {
  it('Bangkok → TH', () => { expect(detectCountryHint('Siam Paragon Bangkok')).toBe('TH'); });
  it('Phuket → TH', () => { expect(detectCountryHint('Patong Beach Phuket')).toBe('TH'); });
  it('Bali → ID', () => { expect(detectCountryHint('Seminyak Bali')).toBe('ID'); });
  it('Batam → ID', () => { expect(detectCountryHint('Nagoya Hill Batam')).toBe('ID'); });
  it('Manila → PH', () => { expect(detectCountryHint('Makati Manila')).toBe('PH'); });
  it('Ho Chi Minh / Saigon → VN', () => {
    expect(detectCountryHint('District 1 Ho Chi Minh')).toBe('VN');
    expect(detectCountryHint('Old Quarter Saigon')).toBe('VN');
  });
  it('Tokyo / Osaka / Kyoto → JP', () => {
    expect(detectCountryHint('Shibuya Tokyo')).toBe('JP');
    expect(detectCountryHint('Dotonbori Osaka')).toBe('JP');
    expect(detectCountryHint('Kyoto temples')).toBe('JP');
  });
  it('Seoul / Busan → KR', () => {
    expect(detectCountryHint('Gangnam Seoul')).toBe('KR');
    expect(detectCountryHint('Haeundae Busan')).toBe('KR');
  });
});

describe('country-hints — CN / HK / TW / AU / NZ', () => {
  it('Shanghai → CN', () => { expect(detectCountryHint('The Bund Shanghai')).toBe('CN'); });
  it('Hong Kong → HK (not CN)', () => {
    expect(detectCountryHint('Tsim Sha Tsui Hong Kong')).toBe('HK');
  });
  it('Taipei → TW', () => { expect(detectCountryHint('Ximending Taipei')).toBe('TW'); });
  it('Sydney → AU', () => { expect(detectCountryHint('Opera House Sydney')).toBe('AU'); });
  it('Auckland → NZ', () => { expect(detectCountryHint('Auckland CBD')).toBe('NZ'); });
});

describe('country-hints — longest-match wins', () => {
  it('"kuala lumpur" beats any single-word collision', () => {
    expect(detectCountryHint('Hotel near Kuala Lumpur Sentral')).toBe('MY');
  });
  it('"hong kong" beats hypothetical CN single-word', () => {
    expect(detectCountryHint('Hong Kong restaurant')).toBe('HK');
  });
});

describe('country-hints — HINTS shape', () => {
  it('every country code is 2 uppercase letters', () => {
    for (const e of HINTS) {
      expect(e.country).toMatch(/^[A-Z]{2}$/);
      expect(Array.isArray(e.patterns)).toBe(true);
      expect(e.patterns.length).toBeGreaterThan(0);
    }
  });
});
