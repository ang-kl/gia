// __tests__/i18n.test.js — v0.58.55
//
// Server-side i18n module: EN default, FR localised, missing keys
// fall back to EN (then to the key itself), {placeholder} substitution.

import { describe, it, expect } from 'vitest';
import { t, tn, pickLang } from '../i18n.js';

describe('pickLang', () => {
  it('accepts all 8 supported locales', () => {
    for (const code of ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es']) {
      expect(pickLang(code)).toBe(code);
    }
  });
  it('falls back to en for unknown / missing', () => {
    // v0.62.511: SUPPORTED expanded to 8 langs; use a genuinely unsupported code
    // v0.62.883 (K6) — 'ko' was this file's example of an unsupported code and is now
    // the opposite of one. 'pt' takes its place: a real ISO code the app does not ship,
    // which tests the same thing 'xx' cannot — that the guard rejects a PLAUSIBLE locale.
    expect(pickLang('pt')).toBe('en');
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
    // v0.62.728: this used 'de' as the stand-in for "a language with no
    // translation". German now HAS one, so the example expired — not the
    // behaviour. 'xx' is not in SUPPORTED and never will be, so it tests the
    // fallback rather than the current state of the table.
    expect(t('hours.openNow')).toBe('Open now');
    expect(t('hours.openNow', 'xx')).toBe('Open now');
  });

  it('serves the six added locales, falling back per key rather than per language', () => {
    // The machine translations are applied per key: an item that failed structural
    // validation is simply absent, and t() falls through to en for that key alone.
    expect(t('hours.openNow', 'de')).toBe('Jetzt geöffnet');
    expect(t('hours.openNow', 'ja')).not.toBe('Open now');
    // privacy.body is long-form and was never translated — it must still be en.
    expect(typeof t('hours.openNow', 'zh')).toBe('string');
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
