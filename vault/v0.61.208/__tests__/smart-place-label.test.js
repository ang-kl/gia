// __tests__/smart-place-label.test.js — v0.61.207

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { smartPlaceLabel } = require('../smart-place-label.js');

describe('smartPlaceLabel — operator failure case (Jln Imbi / KL)', () => {
  it('"1" + KL address → "Jln Imbi, Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur"', () => {
    const dn = '1';
    const fa = '1, Jln Imbi, Imbi, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia';
    expect(smartPlaceLabel(dn, fa)).toBe('Jln Imbi, Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur');
  });
});

describe('smartPlaceLabel — uses real displayName when present', () => {
  it('"Berjaya Times Square" + KL address', () => {
    expect(smartPlaceLabel('Berjaya Times Square',
      '1, Jalan Imbi, Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia'))
      .toBe('Berjaya Times Square, Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur');
  });
  it('"Pavilion KL" + KL address', () => {
    expect(smartPlaceLabel('Pavilion KL',
      '168, Jalan Bukit Bintang, 55100 Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur, Malaysia'))
      .toBe('Pavilion KL, Kuala Lumpur, Wilayah Persekutuan Kuala Lumpur');
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
  it('empty displayName + empty fa → Unnamed', () => {
    expect(smartPlaceLabel('', '')).toBe('Unnamed');
  });
  it('null/undefined → Unnamed', () => {
    expect(smartPlaceLabel(null, undefined)).toBe('Unnamed');
  });
  it('only displayName (no fa) and is a number → falls back to displayName', () => {
    expect(smartPlaceLabel('1', '')).toBe('1');
  });
});
