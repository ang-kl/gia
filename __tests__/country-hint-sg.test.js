// country-hint-sg.test.js — v0.62.991. Spec: doc/Feature/2026-11-22-l-flag-stops-linger-icon-tap-card-fold.spec.md,
// part A, invariant I2.
//
// "Singapore" was never a country hint, because Singapore was the default. Once a saved preference is another country,
// nothing typed could bring a /l search back to Singapore: "Mandarin Gallery Singapore" still searched Malaysia.
// "Singapore" and "SG" are hints now, like "KL". Every existing hint must answer as before; the original cases stay in
// country-hints.test.js, unedited, and a few are repeated here so this file alone shows the two sets do not collide.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { detectCountryHint, HINTS } = require('../country-hints.js');

describe('"Singapore" and "SG" are hints (I2)', () => {
  it('the operator\'s case', () => {
    expect(detectCountryHint('Mandarin Gallery Singapore')).toBe('SG');
    expect(detectCountryHint('mandarin gallery singapore')).toBe('SG');
  });

  it('"SG" as a word, in any case', () => {
    expect(detectCountryHint('ion orchard sg')).toBe('SG');
    expect(detectCountryHint('Jewel SG')).toBe('SG');
  });

  it('only as a whole word', () => {
    expect(detectCountryHint('sgx centre')).toBeNull();
    expect(detectCountryHint('singaporean food')).toBeNull();
  });

  it('text with no country word stays a non-hint', () => {
    expect(detectCountryHint('mandarin gallery')).toBeNull();
    expect(detectCountryHint('Tanjong Pagar MRT')).toBeNull();
  });
});

describe('every existing hint answers as before (I2)', () => {
  it('a longer place name still wins over the short "SG"', () => {
    expect(detectCountryHint('Times Square KL')).toBe('MY');
    expect(detectCountryHint('Komtar JBCC Johor Bahru')).toBe('MY');
    expect(detectCountryHint('Johor Bahru Singapore checkpoint')).toBe('MY');
    expect(detectCountryHint('Tsim Sha Tsui Hong Kong')).toBe('HK');
  });

  it('two-letter ties keep the old order: "KL" is listed before "SG"', () => {
    expect(detectCountryHint('SG Mall KL')).toBe('MY');
  });

  it('SG is the last entry, so nothing listed before it moved', () => {
    expect(HINTS[HINTS.length - 1].country).toBe('SG');
    expect(HINTS.filter((e) => e.country === 'SG')).toHaveLength(1);
  });
});
