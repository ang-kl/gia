// place-card-closed-guess.test.js - v0.62.992. Spec: doc/Feature/2026-11-23-place-card-any-map-icon.spec.md, Part D,
// invariant I6.
//
// Operator, 23-11 '26: "f there isn't opening hours stated in the google map, use human-logic like is 10 PM (the chance
// eatery to be closed is near 99% in Singapore, 11 PM for Japan and Korea)". Then, asked where it applies: "New place
// card only", ending at 6 AM, worded as a guess, and no guess in other countries.
//
// It is a GUESS, and it must stay one: it sets no open or closed status, it applies only where Google gave no hours at
// all, and a bar or night club is left out because those open late.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pc = require('../place-card.js');

const hm = (h, m = 0) => h * 60 + m;
const eatery = (over = {}) => ({ family: 'eatery', hasHours: false, country: 'SG', localMinutes: hm(23), ...over });

describe('closedGuess: the hours it covers (I6)', () => {
  it('Singapore: from 22:00 to 05:59', () => {
    expect(pc.closedGuess(eatery({ localMinutes: hm(21, 59) }))).toBe(false);
    expect(pc.closedGuess(eatery({ localMinutes: hm(22, 0) }))).toBe(true);
    expect(pc.closedGuess(eatery({ localMinutes: hm(23, 59) }))).toBe(true);
    expect(pc.closedGuess(eatery({ localMinutes: hm(0, 0) }))).toBe(true);
    expect(pc.closedGuess(eatery({ localMinutes: hm(5, 59) }))).toBe(true);
    expect(pc.closedGuess(eatery({ localMinutes: hm(6, 0) }))).toBe(false);
    expect(pc.closedGuess(eatery({ localMinutes: hm(12, 0) }))).toBe(false);
  });

  it.each(['JP', 'KR'])('%s: from 23:00 to 05:59', (country) => {
    expect(pc.closedGuess(eatery({ country, localMinutes: hm(22, 0) }))).toBe(false);
    expect(pc.closedGuess(eatery({ country, localMinutes: hm(22, 59) }))).toBe(false);
    expect(pc.closedGuess(eatery({ country, localMinutes: hm(23, 0) }))).toBe(true);
    expect(pc.closedGuess(eatery({ country, localMinutes: hm(5, 59) }))).toBe(true);
    expect(pc.closedGuess(eatery({ country, localMinutes: hm(6, 0) }))).toBe(false);
  });

  it.each(['MY', 'TH', 'US', 'FR', '', null, undefined])('no guess in %s, at any hour', (country) => {
    for (const m of [hm(22), hm(23), hm(2), hm(12)]) expect(pc.closedGuess(eatery({ country, localMinutes: m }))).toBe(false);
  });
});

describe('closedGuess: what it never applies to (I6)', () => {
  it('a place Google has hours for', () => {
    expect(pc.closedGuess(eatery({ hasHours: true }))).toBe(false);
  });

  it.each(['bar', 'lodging', 'shopping', 'health', 'safety', 'nature', 'sight', 'transit', 'worship', 'learning', 'building'])('a %s', (family) => {
    expect(pc.closedGuess(eatery({ family }))).toBe(false);
  });

  it('a missing or broken time', () => {
    for (const localMinutes of [NaN, null, undefined, -1, 1440]) expect(pc.closedGuess(eatery({ localMinutes }))).toBe(false);
  });
});

describe('familyOf: which places count as an eatery', () => {
  it.each([
    [['restaurant', 'food'], 'restaurant'],
    [['cafe', 'food'], 'cafe'],
    [['bakery', 'store', 'food'], 'bakery'],
    [['food_court', 'food'], 'food_court'],
    [['meal_takeaway', 'restaurant'], 'meal_takeaway'],
    [['japanese_restaurant', 'restaurant', 'food'], 'japanese_restaurant'],
    [['coffee_shop', 'cafe'], 'coffee_shop'],
  ])('%j is an eatery', (types, primary) => {
    expect(pc.familyOf(types, primary)).toBe('eatery');
  });

  it('a bar, pub or night club is not, even when it also serves food', () => {
    expect(pc.familyOf(['bar', 'restaurant', 'food'], 'bar')).toBe('bar');
    expect(pc.familyOf(['pub', 'bar'], 'pub')).toBe('bar');
    expect(pc.familyOf(['night_club', 'bar'], 'night_club')).toBe('bar');
    expect(pc.familyOf(['wine_bar', 'bar', 'restaurant'], 'wine_bar')).toBe('bar');
  });

  it('a restaurant that also has a bar is still an eatery, by its main type', () => {
    expect(pc.familyOf(['restaurant', 'bar', 'food'], 'restaurant')).toBe('eatery');
  });

  it('the other families', () => {
    expect(pc.familyOf(['shopping_mall'], 'shopping_mall')).toBe('shopping');
    expect(pc.familyOf(['hotel', 'lodging'], 'hotel')).toBe('lodging');
    expect(pc.familyOf(['hospital', 'health'], 'hospital')).toBe('health');
    expect(pc.familyOf(['police'], 'police')).toBe('safety');
    expect(pc.familyOf(['park'], 'park')).toBe('nature');
    expect(pc.familyOf(['tourist_attraction'], 'tourist_attraction')).toBe('sight');
    expect(pc.familyOf(['subway_station', 'transit_station'], 'subway_station')).toBe('transit');
    expect(pc.familyOf(['mosque', 'place_of_worship'], 'mosque')).toBe('worship');
    expect(pc.familyOf(['university'], 'university')).toBe('learning');
    expect(pc.familyOf(['point_of_interest', 'establishment'], '')).toBe('building');
    expect(pc.familyOf([], undefined)).toBe('building');
    expect(pc.familyOf(null, null)).toBe('building');
  });
});

describe('openLine: the open or closed line is worked out when the card is read (I6)', () => {
  // A fixture: open every day 11:00 to 21:00, in Google's "periods" shape.
  const DAILY = Array.from({ length: 7 }, (_, d) => ({ open: { day: d, hour: 11, minute: 0 }, close: { day: d, hour: 21, minute: 0 } }));
  const sgt = (iso) => Date.parse(iso + '+08:00');
  const base = { family: 'eatery', country: 'SG', utcOffsetMinutes: 480 };

  it('open: says so, with the closing time, and makes no guess', () => {
    const o = pc.openLine({ ...base, periods: DAILY, hasHours: true }, sgt('2026-11-23T13:00:00'), 'en');
    expect(o.openNow).toBe(true);
    expect(o.label).toMatch(/Open/);
    expect(o.label).toMatch(/9:00/);
    expect(o.guess).toBe(false);
  });

  it('closed: says so, and makes no guess even late at night, because Google HAS hours', () => {
    const o = pc.openLine({ ...base, periods: DAILY, hasHours: true }, sgt('2026-11-23T23:30:00'), 'en');
    expect(o.openNow).toBe(false);
    expect(o.label).toMatch(/Closed/);
    expect(o.guess).toBe(false);
  });

  it('no hours at 23:30 in Singapore: the guess, and still no open or closed status', () => {
    const o = pc.openLine({ ...base, periods: null, hasHours: false }, sgt('2026-11-23T23:30:00'), 'en');
    expect(o).toEqual({ openNow: null, label: '', guess: true });
  });

  it('no hours at 15:00: nothing at all', () => {
    const o = pc.openLine({ ...base, periods: null, hasHours: false }, sgt('2026-11-23T15:00:00'), 'en');
    expect(o).toEqual({ openNow: null, label: '', guess: false });
  });

  it('the hour is the PLACE\'s hour: 22:30 in Singapore is 23:30 in Tokyo', () => {
    const at = sgt('2026-11-23T22:30:00');
    expect(pc.openLine({ family: 'eatery', country: 'JP', utcOffsetMinutes: 540, periods: null, hasHours: false }, at, 'en').guess).toBe(true);
    const earlier = sgt('2026-11-23T21:30:00');   // 22:30 in Tokyo
    expect(pc.openLine({ family: 'eatery', country: 'JP', utcOffsetMinutes: 540, periods: null, hasHours: false }, earlier, 'en').guess).toBe(false);
  });

  it('with no offset from Google, the country\'s own clock is used', () => {
    const at = sgt('2026-11-23T22:30:00');   // 23:30 in Seoul
    expect(pc.openLine({ family: 'eatery', country: 'KR', periods: null, hasHours: false }, at, 'en').guess).toBe(true);
    expect(pc.openLine({ family: 'eatery', country: 'SG', periods: null, hasHours: false }, at, 'en').guess).toBe(true);
  });

  it('a hotel with no hours never gets the guess', () => {
    const o = pc.openLine({ family: 'lodging', country: 'SG', utcOffsetMinutes: 480, periods: null, hasHours: false }, sgt('2026-11-23T23:30:00'), 'en');
    expect(o).toEqual({ openNow: null, label: '', guess: false });
  });

  it('the label follows the reader\'s language', () => {
    const en = pc.openLine({ ...base, periods: DAILY, hasHours: true }, sgt('2026-11-23T13:00:00'), 'en').label;
    const ja = pc.openLine({ ...base, periods: DAILY, hasHours: true }, sgt('2026-11-23T13:00:00'), 'ja').label;
    expect(ja).not.toBe(en);
    expect(ja.length).toBeGreaterThan(0);
  });
});
