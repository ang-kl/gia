// __tests__/location-locale.test.js — v0.61.156
//
// Unit tests for the location-locale persistence layer (PR 2/5 of
// the 10-rule location-classification phased build). Covers the
// getUserLocale / setUserLocale / clearUserLocale Redis round-trip
// AND the rule §2.6 isSameLocale "no nagging" predicate.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  LOCALE_TTL,
  getUserLocale,
  setUserLocale,
  clearUserLocale,
  isSameLocale
} = require('../location-locale');

function makeFakeRedis({ isOpen = true } = {}) {
  const store = new Map();
  const ttls = new Map();
  return {
    isOpen,
    store,
    ttls,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async setEx(k, ttl, v) { store.set(k, v); ttls.set(k, ttl); return 'OK'; },
    async del(k) { store.delete(k); ttls.delete(k); return 1; }
  };
}

describe('LOCALE_TTL', () => {
  it('is 30 days', () => {
    expect(LOCALE_TTL).toBe(30 * 24 * 60 * 60);
  });
});

describe('setUserLocale + getUserLocale round-trip', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('persists a valid record and reads it back', async () => {
    await setUserLocale(redis, '12345', {
      mode: 'JB',
      placeName: 'City Square',
      country: 'Malaysia',
      adminAreaLevel1: 'Johor',
      lat: 1.4927,
      lng: 103.7414,
      registeredAt: 1700000000000
    });
    const got = await getUserLocale(redis, '12345');
    expect(got).toMatchObject({
      mode: 'JB',
      placeName: 'City Square',
      country: 'Malaysia',
      adminAreaLevel1: 'Johor',
      lat: 1.4927,
      lng: 103.7414,
      registeredAt: 1700000000000
    });
  });

  it('returns null for an unknown chatId', async () => {
    expect(await getUserLocale(redis, 'nobody')).toBeNull();
  });

  it('hashes chatId — different keys for different chats', async () => {
    await setUserLocale(redis, 'a', { mode: 'SG', placeName: 'A', country: 'Singapore', lat: 1, lng: 103 });
    await setUserLocale(redis, 'b', { mode: 'JB', placeName: 'B', country: 'Malaysia', adminAreaLevel1: 'Johor', lat: 1.5, lng: 103.7 });
    expect((await getUserLocale(redis, 'a')).mode).toBe('SG');
    expect((await getUserLocale(redis, 'b')).mode).toBe('JB');
  });

  it('coerces unknown mode → OTHER', async () => {
    await setUserLocale(redis, 'x', { mode: 'WAKANDA', placeName: 'A', lat: 1, lng: 103 });
    expect((await getUserLocale(redis, 'x')).mode).toBe('OTHER');
  });

  it('drops blank / non-string placeName + country to null', async () => {
    await setUserLocale(redis, 'y', { mode: 'OTHER', placeName: '   ', country: 42, lat: 1, lng: 103 });
    const got = await getUserLocale(redis, 'y');
    expect(got.placeName).toBeNull();
    expect(got.country).toBeNull();
  });

  it('drops non-finite lat/lng to null', async () => {
    await setUserLocale(redis, 'z', { mode: 'OTHER', placeName: 'X', lat: NaN, lng: 'foo' });
    const got = await getUserLocale(redis, 'z');
    expect(got.lat).toBeNull();
    expect(got.lng).toBeNull();
  });

  it('defaults registeredAt to Date.now() when absent', async () => {
    const before = Date.now();
    await setUserLocale(redis, 'w', { mode: 'SG', placeName: 'A', lat: 1, lng: 103 });
    const got = await getUserLocale(redis, 'w');
    expect(got.registeredAt).toBeGreaterThanOrEqual(before);
    expect(got.registeredAt).toBeLessThanOrEqual(Date.now() + 100);
  });

  it('writes with the 30-day TTL', async () => {
    await setUserLocale(redis, 'q', { mode: 'SG', placeName: 'A', lat: 1, lng: 103 });
    const [ttl] = [...redis.ttls.values()];
    expect(ttl).toBe(LOCALE_TTL);
  });

  it('is a no-op when redis is closed / null', async () => {
    const closedRedis = makeFakeRedis({ isOpen: false });
    await setUserLocale(closedRedis, 'q', { mode: 'SG', placeName: 'A', lat: 1, lng: 103 });
    expect(closedRedis.store.size).toBe(0);
    expect(await getUserLocale(null, 'q')).toBeNull();
    expect(await getUserLocale(closedRedis, 'q')).toBeNull();
  });

  it('clearUserLocale removes the record', async () => {
    await setUserLocale(redis, 'q', { mode: 'SG', placeName: 'A', lat: 1, lng: 103 });
    expect(await getUserLocale(redis, 'q')).not.toBeNull();
    await clearUserLocale(redis, 'q');
    expect(await getUserLocale(redis, 'q')).toBeNull();
  });

  it('returns null on corrupt JSON', async () => {
    const r = makeFakeRedis();
    r.store.set(`userlocale:${require('crypto').createHash('sha256').update('bad').digest('hex').slice(0, 16)}`, '{not valid json');
    expect(await getUserLocale(r, 'bad')).toBeNull();
  });
});

describe('isSameLocale (rule §2.6 no-nag)', () => {
  it('matches identical mode + admin', () => {
    expect(isSameLocale(
      { mode: 'JB', adminAreaLevel1: 'Johor' },
      { mode: 'JB', adminAreaLevel1: 'Johor' }
    )).toBe(true);
  });

  it('matches case-insensitively + trims', () => {
    expect(isSameLocale(
      { mode: 'OTHER', adminAreaLevel1: '  Selangor  ' },
      { mode: 'OTHER', adminAreaLevel1: 'selangor' }
    )).toBe(true);
  });

  it('distinguishes Selangor from Wilayah Persekutuan Putrajaya', () => {
    expect(isSameLocale(
      { mode: 'OTHER', adminAreaLevel1: 'Selangor' },
      { mode: 'OTHER', adminAreaLevel1: 'Wilayah Persekutuan Putrajaya' }
    )).toBe(false);
  });

  it('treats two null-admin SG records as same locale', () => {
    expect(isSameLocale(
      { mode: 'SG', adminAreaLevel1: null },
      { mode: 'SG' }
    )).toBe(true);
  });

  it('different modes never match', () => {
    expect(isSameLocale(
      { mode: 'SG', adminAreaLevel1: 'Central Region' },
      { mode: 'JB', adminAreaLevel1: 'Central Region' }
    )).toBe(false);
  });

  it('null / non-object inputs → false', () => {
    expect(isSameLocale(null, { mode: 'SG' })).toBe(false);
    expect(isSameLocale({ mode: 'SG' }, null)).toBe(false);
    expect(isSameLocale('a', 'b')).toBe(false);
    expect(isSameLocale(undefined, undefined)).toBe(false);
  });
});
