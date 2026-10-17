// __tests__/smart-place-label.test.js — v0.61.265

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { smartPlaceLabel } = require('../smart-place-label.js');

describe('smartPlaceLabel — operator failure case (Jln Imbi / KL)', () => {
  it('"1" + KL address → "Jln Imbi, Kuala Lumpur, WP KL" (state abbreviated)', () => {
    const dn = '1';
    const fa = '1, Jln Imbi, Imbi, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia';
    expect(smartPlaceLabel(dn, fa)).toBe('Jln Imbi, Kuala Lumpur, WP KL');
  });
});

describe('smartPlaceLabel — uses real displayName when present', () => {
  it('"Berjaya Times Square" + KL address', () => {
    expect(smartPlaceLabel('Berjaya Times Square',
      '1, Jalan Imbi, Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia'))
      .toBe('Berjaya Times Square, Kuala Lumpur, WP KL');
  });
  it('"Pavilion KL" + KL address', () => {
    expect(smartPlaceLabel('Pavilion KL',
      '168, Jalan Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia'))
      .toBe('Pavilion KL, Kuala Lumpur, WP KL');
  });
});

describe('smartPlaceLabel — WP abbreviation (v0.61.209)', () => {
  it('Putrajaya address: "Wilayah Persekutuan Putrajaya" → "WP Putrajaya"', () => {
    const fa = 'IOI Resort City, 62502 Putrajaya, Wilayah Persekutuan Putrajaya, Malaysia';
    expect(smartPlaceLabel('IOI Resort City', fa)).toBe('IOI Resort City, Putrajaya, WP Putrajaya');
  });
  it('Federal Territory of Kuala Lumpur (English form) → "WP KL"', () => {
    const fa = '168 Jln Bukit Bintang, 55100 Kuala Lumpur, Federal Territory of Kuala Lumpur, Malaysia';
    expect(smartPlaceLabel('Pavilion', fa)).toBe('Pavilion, Kuala Lumpur, WP KL');
  });
});

describe('smartPlaceLabel — Selangor state', () => {
  it('Petaling Jaya → "Jalan SS2/10, Petaling Jaya, Selangor"', () => {
    const fa = '12, Jalan SS2/10, SS2, 47300 Petaling Jaya, Selangor, Malaysia';
    expect(smartPlaceLabel('12', fa)).toBe('Jalan SS2/10, Petaling Jaya, Selangor');
  });
});

describe('smartPlaceLabel — Singapore (no state)', () => {
  it('Pavilion-style → "Pavilion, Orchard Rd"', () => {
    expect(smartPlaceLabel('Pavilion', '176 Orchard Rd, 238843, Singapore'))
      .toBe('Pavilion, Orchard Rd');
  });
  it('bare building number → falls back to street + city', () => {
    expect(smartPlaceLabel('42', '42, Tanjong Pagar Road, Tanjong Pagar, 088466, Singapore'))
      .toBe('Tanjong Pagar Road, Tanjong Pagar');
  });
});

describe('smartPlaceLabel — defensive', () => {
  // v0.61.265 — operator: "always show 'unnamed' on whatever i typed
  // in the other mode." The literal 'Unnamed' fallback was masking
  // the caller's own || text fallback chain. The helper now returns
  // '' so callers can chain to formattedAddress / typed text /
  // their own placeholder.
  it('empty displayName + empty fa → empty string (caller decides placeholder)', () => {
    expect(smartPlaceLabel('', '')).toBe('');
  });
  it('null/undefined → empty string (caller decides placeholder)', () => {
    expect(smartPlaceLabel(null, undefined)).toBe('');
  });
  it('only displayName (no fa) and is a number → falls back to displayName', () => {
    expect(smartPlaceLabel('1', '')).toBe('1');
  });
  // v0.61.265 — country-only inputs collapse to empty, so the caller's
  // || text fallback resolves to the user's typed text instead of
  // the country name leaking back into the pill.
  it('country-only displayName + matching fa → empty (country tail stripped, nothing left)', () => {
    expect(smartPlaceLabel('Singapore', 'Singapore')).toBe('');
  });
  it('country-only fa, no displayName → empty', () => {
    expect(smartPlaceLabel('', 'Malaysia')).toBe('');
  });
});
