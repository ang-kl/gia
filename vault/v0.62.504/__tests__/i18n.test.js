// __tests__/i18n.test.js — v0.58.55
//
// Server-side i18n module: EN default, FR localised, missing keys
// fall back to EN (then to the key itself), {placeholder} substitution.

import { describe, it, expect } from 'vitest';
import { t, tn, pickLang } from '../i18n.js';

describe('pickLang', () => {
  it('accepts en and fr', () => {
    expect(pickLang('en')).toBe('en');
    expect(pickLang('fr')).toBe('fr');
  });
  it('falls back to en for unknown / missing', () => {
    expect(pickLang('zh')).toBe('en');
    expect(pickLang('')).toBe('en');
    expect(pickLang(undefined)).toBe('en');
    expect(pickLang(null)).toBe('en');
  });
});

describe('t() — basic lookups', () => {
  it('returns English for lang=en', () => {
    expect(t('hours.openNow', 'en')).toBe('Open now');
    expect(t('hours.closed', 'en')).toBe('Closed');
  });
  it('returns French for lang=fr', () => {
    expect(t('hours.openNow', 'fr')).toBe('Ouvert maintenant');
    expect(t('hours.closed', 'fr')).toBe('Fermé');
    expect(t('crowd.high', 'fr')).toBe('🔴 chargé');
  });
  it('falls back to en when lang missing/unknown', () => {
    expect(t('hours.openNow')).toBe('Open now');
    expect(t('hours.openNow', 'de')).toBe('Open now');
  });
  it('returns the key itself for missing keys', () => {
    expect(t('does.not.exist', 'en')).toBe('does.not.exist');
    expect(t('does.not.exist', 'fr')).toBe('does.not.exist');
  });
});

describe('tn() — placeholder substitution', () => {
  it('substitutes {n} for a number', () => {
    expect(tn('pick.header.many', 'en', { n: 5 })).toBe('📋 5 places');
    expect(tn('pick.header.many', 'fr', { n: 5 })).toBe('📋 5 lieux');
  });
  it('leaves placeholders intact when var missing', () => {
    expect(tn('pick.header.many', 'en', {})).toBe('📋 {n} places');
  });
  it('handles strings as well as numbers', () => {
    expect(tn('hours.opensTomorrowAt', 'fr', { time: '11:00' })).toBe('Ouvre demain à 11:00');
  });
});
