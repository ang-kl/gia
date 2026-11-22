// __tests__/anchor-age.test.js — v0.62.965.
//
// Spec: doc/Feature/2026-11-02-saved-place-expires-after-six-hours.spec.md, C1, C4, C9 and invariants I1, I2, I7.
//
// One rule for the saved place, as a pure function both Mini Apps and the bot call: a place set on purpose (it has a
// label) is LOCKED for 6 hours from `setAt`; after that, if the phone is more than 50 km away, the app switches to the
// phone. The chip strings live in their own table because Menu's and Cuisine's i18n.js are pinned at exact key counts.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import {
  LOCK_MS, SWITCH_KM, isLocked, shouldSwitchToDevice, describeAge, distanceKm,
} from '../web/_shared/lib/anchor-age.js';
import { CHIP_LOCALES, CHIP_STRINGS, at, backToChipProps } from '../web/_shared/lib/anchor-age-i18n.js';

const require = createRequire(import.meta.url);
const { t, tn } = require('../i18n.js');

const H = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 2, 2, 55); // 02-11 '26 10:55 SGT, the operator's screenshot
const KYOTO = { label: '488番地', lat: 35.0116, lng: 135.7681, region: 'OTHER', country: 'JP' };
const SG = { lat: 1.2819, lng: 103.8525 };      // Downtown Core, the phone
const KYOTO_NEAR = { lat: 35.03, lng: 135.80 };  // ~3.5 km from the Kyoto pick

describe('I1 — a labelled place is locked for 6 hours from setAt, then not; an unlabelled place never', () => {
  it('the limits the spec names', () => {
    expect(LOCK_MS).toBe(6 * H);
    expect(SWITCH_KM).toBe(50);
  });
  it('10 minutes old → locked; 5 h 59 → locked; 6 h → not; 19 h → not', () => {
    expect(isLocked({ ...KYOTO, setAt: NOW - 10 * 60 * 1000 }, NOW)).toBe(true);
    expect(isLocked({ ...KYOTO, setAt: NOW - 6 * H + 1 }, NOW)).toBe(true);
    expect(isLocked({ ...KYOTO, setAt: NOW - 6 * H }, NOW)).toBe(false);
    expect(isLocked({ ...KYOTO, setAt: NOW - 19 * H }, NOW)).toBe(false);
  });
  it('no label, a blank label, no setAt, or no place → never locked', () => {
    expect(isLocked({ lat: 1, lng: 103, setAt: NOW }, NOW)).toBe(false);
    expect(isLocked({ label: '   ', lat: 1, lng: 103, setAt: NOW }, NOW)).toBe(false);
    expect(isLocked({ ...KYOTO, setAt: null }, NOW)).toBe(false);
    expect(isLocked({ ...KYOTO }, NOW)).toBe(false);
    expect(isLocked(null, NOW)).toBe(false);
  });
  it('a setAt in the future (clock skew) counts as just set, so locked', () => {
    expect(isLocked({ ...KYOTO, setAt: NOW + 60 * 1000 }, NOW)).toBe(true);
  });
});

describe('I2 — switch only when unlocked AND the phone is over 50 km away AND a reading exists', () => {
  it('Kyoto saved 19 h ago, phone in Singapore → switch', () => {
    expect(shouldSwitchToDevice({ saved: { ...KYOTO, setAt: NOW - 19 * H }, device: SG, now: NOW })).toBe(true);
  });
  it('Kyoto picked 10 minutes ago, phone in Singapore → keep (the Wellington / KL cases)', () => {
    expect(shouldSwitchToDevice({ saved: { ...KYOTO, setAt: NOW - 10 * 60 * 1000 }, device: SG, now: NOW })).toBe(false);
  });
  it('Kyoto saved 19 h ago, phone 3.5 km away in Kyoto → keep', () => {
    expect(distanceKm(KYOTO, KYOTO_NEAR)).toBeLessThan(5);
    expect(shouldSwitchToDevice({ saved: { ...KYOTO, setAt: NOW - 19 * H }, device: KYOTO_NEAR, now: NOW })).toBe(false);
  });
  it('exactly at the threshold: 49 km keeps, 51 km switches', () => {
    const at49 = { lat: KYOTO.lat + 49 / 111.2, lng: KYOTO.lng };
    const at51 = { lat: KYOTO.lat + 51 / 111.2, lng: KYOTO.lng };
    const saved = { ...KYOTO, setAt: NOW - 19 * H };
    expect(shouldSwitchToDevice({ saved, device: at49, now: NOW })).toBe(false);
    expect(shouldSwitchToDevice({ saved, device: at51, now: NOW })).toBe(true);
  });
  it('no reading, or an invalid one → keep', () => {
    const saved = { ...KYOTO, setAt: NOW - 19 * H };
    expect(shouldSwitchToDevice({ saved, device: null, now: NOW })).toBe(false);
    expect(shouldSwitchToDevice({ saved, device: { lat: NaN, lng: 103 }, now: NOW })).toBe(false);
    expect(shouldSwitchToDevice({ saved, device: { lat: 0, lng: 0 }, now: NOW })).toBe(false);
  });
  it('no saved place, or one without coordinates → nothing to switch from', () => {
    expect(shouldSwitchToDevice({ saved: null, device: SG, now: NOW })).toBe(false);
    expect(shouldSwitchToDevice({ saved: { label: 'x', setAt: NOW - 19 * H }, device: SG, now: NOW })).toBe(false);
  });
  it('an unlabelled saved place far away switches too (it was never locked)', () => {
    expect(shouldSwitchToDevice({ saved: { lat: KYOTO.lat, lng: KYOTO.lng, setAt: NOW - 60 * 1000 }, device: SG, now: NOW })).toBe(true);
  });
});

describe('describeAge — the chat line reads "today 10:55 AM", "yesterday 4:10 PM", or the date (Singapore time)', () => {
  it('yesterday 4:10 PM SGT, seen at 10:55 AM the next day', () => {
    const setAt = Date.UTC(2026, 10, 1, 8, 10); // 01-11 '26 16:10 SGT
    expect(describeAge(setAt, NOW)).toEqual({ day: 'yesterday', time: '4:10 PM', date: '1 Nov' });
  });
  it('today 9:02 AM', () => {
    const setAt = Date.UTC(2026, 10, 2, 1, 2);
    expect(describeAge(setAt, NOW)).toEqual({ day: 'today', time: '9:02 AM', date: '2 Nov' });
  });
  it('three days ago → the date', () => {
    const setAt = Date.UTC(2026, 9, 30, 4, 0);
    expect(describeAge(setAt, NOW)).toEqual({ day: 'date', time: '12:00 PM', date: '30 Oct' });
  });
  it('11:59 PM yesterday is still yesterday, 12:00 AM today is today (the day boundary is Singapore midnight)', () => {
    expect(describeAge(Date.UTC(2026, 10, 1, 15, 59), NOW).day).toBe('yesterday');
    expect(describeAge(Date.UTC(2026, 10, 1, 16, 0), NOW).day).toBe('today');
  });
  it('no setAt → null', () => {
    expect(describeAge(null, NOW)).toBeNull();
  });
});

describe('I7 — the chip string in 9 locales, translated rather than copied; the chat lines in the bot\'s locales', () => {
  it('the nine locales', () => {
    expect(CHIP_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });
  it('chip.backTo everywhere, with the {label} slot, English as the spec names it', () => {
    for (const l of CHIP_LOCALES) {
      expect(CHIP_STRINGS['chip.backTo']?.[l], `chip.backTo.${l}`).toMatch(/\{label\}/);
    }
    for (const l of ['fr', 'ru', 'zh', 'ja', 'ko']) expect(CHIP_STRINGS['chip.backTo'][l]).not.toBe(CHIP_STRINGS['chip.backTo'].en);
    expect(at('chip.backTo', 'en', { label: 'Kyoto' })).toBe('↩ Back to Kyoto');
    expect(at('chip.backTo', 'xx', { label: 'Kyoto' })).toBe('↩ Back to Kyoto');
    expect(at('chip.backTo', 'ko', { label: '교토' })).toContain('교토');
  });
  it('backToChipProps gives the text and an aria-label that both carry the place', () => {
    const p = backToChipProps({ label: 'Kyoto', lang: 'fr' });
    expect(p.text).toContain('Kyoto');
    expect(p['aria-label']).toContain('Kyoto');
    expect(p['data-back-to']).toBe('Kyoto');
  });
  it('the chat lines exist in every locale the bot carries for the Cuisine command', () => {
    const KEYS = ['cuisine.chat.anchoredToday', 'cuisine.chat.anchoredYesterday', 'cuisine.chat.anchoredOn', 'cuisine.chat.usingPhone'];
    for (const l of ['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']) {
      for (const k of KEYS) expect(t(k, l), `${k}.${l}`).not.toBe(k);
    }
    expect(tn('cuisine.chat.anchoredYesterday', 'en', { label: 'Kyoto', time: '4:10 PM' })).toBe('📍 Anchored to Kyoto, set yesterday 4:10 PM.');
    expect(tn('cuisine.chat.anchoredToday', 'en', { label: 'Kyoto', time: '9:02 AM' })).toBe('📍 Anchored to Kyoto, set today 9:02 AM.');
    expect(tn('cuisine.chat.anchoredOn', 'en', { label: 'Kyoto', date: '30 Oct', time: '12:00 PM' })).toBe('📍 Anchored to Kyoto, set 30 Oct 12:00 PM.');
    expect(tn('cuisine.chat.usingPhone', 'en', { label: 'Kyoto' })).toContain('Kyoto');
    expect(tn('cuisine.chat.usingPhone', 'en', { label: 'Kyoto' })).toMatch(/phone/i);
    for (const l of ['fr', 'ru', 'zh', 'ja', 'ko']) expect(t('cuisine.chat.anchoredYesterday', l)).not.toBe(t('cuisine.chat.anchoredYesterday', 'en'));
  });
});
