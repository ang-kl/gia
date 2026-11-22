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
  DRIFT_SUPPRESS_TTL,
  getUserLocale,
  setUserLocale,
  clearUserLocale,
  isSameLocale,
  getDriftSuppress,
  isDriftSuppressed,
  addDriftSuppress,
  clearDriftSuppress
} = require('../location-locale');

function makeFakeRedis({ isOpen = true } = {}) {
  const store = new Map();
  const sets = new Map();
  const ttls = new Map();
  return {
    isOpen, store, sets, ttls,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async setEx(k, ttl, v) { store.set(k, v); ttls.set(k, ttl); return 'OK'; },
    async del(k) { store.delete(k); sets.delete(k); ttls.delete(k); return 1; },
    async sMembers(k) { return Array.from(sets.get(k) || []); },
    async sIsMember(k, m) { return (sets.get(k) || new Set()).has(m); },
    async sAdd(k, m) {
      if (!sets.has(k)) sets.set(k, new Set());
      sets.get(k).add(m);
      return 1;
    },
    async expire(k, ttl) { ttls.set(k, ttl); return 1; }
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

describe('isSameLocale (rule §2.6 no-nag) — v0.61.157 matchKey semantics', () => {
  it('matches identical JB records', () => {
    expect(isSameLocale(
      { mode: 'JB', adminAreaLevel1: 'Johor' },
      { mode: 'JB', adminAreaLevel1: 'Johor' }
    )).toBe(true);
  });

  it('collapses SG sub-region differences (v0.61.157 behaviour change)', () => {
    expect(isSameLocale(
      { mode: 'SG', adminAreaLevel1: 'Central Region' },
      { mode: 'SG', adminAreaLevel1: 'North Region' }
    )).toBe(true);
  });

  it('OTHER mode keeps admin-specific matching', () => {
    expect(isSameLocale(
      { mode: 'OTHER', adminAreaLevel1: '  Selangor  ' },
      { mode: 'OTHER', adminAreaLevel1: 'selangor' }
    )).toBe(true);
    expect(isSameLocale(
      { mode: 'OTHER', adminAreaLevel1: 'Selangor' },
      { mode: 'OTHER', adminAreaLevel1: 'Wilayah Persekutuan Putrajaya' }
    )).toBe(false);
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

describe('drift-suppression set (rule §2.7 single re-prompt)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('DRIFT_SUPPRESS_TTL is 24 hours', () => {
    expect(DRIFT_SUPPRESS_TTL).toBe(24 * 60 * 60);
  });

  it('empty set by default + isDriftSuppressed=false for unknown key', async () => {
    expect((await getDriftSuppress(redis, 'x')).size).toBe(0);
    expect(await isDriftSuppressed(redis, 'x', 'JB|johor')).toBe(false);
  });

  it('add → isDriftSuppressed=true; set carries the entry', async () => {
    await addDriftSuppress(redis, 'x', 'JB|johor');
    expect(await isDriftSuppressed(redis, 'x', 'JB|johor')).toBe(true);
    expect((await getDriftSuppress(redis, 'x')).has('JB|johor')).toBe(true);
  });

  it('different destinations isolate per matchKey', async () => {
    await addDriftSuppress(redis, 'x', 'JB|johor');
    expect(await isDriftSuppressed(redis, 'x', 'OTHER|selangor')).toBe(false);
  });

  it('clearDriftSuppress empties the set', async () => {
    await addDriftSuppress(redis, 'x', 'JB|johor');
    await clearDriftSuppress(redis, 'x');
    expect(await isDriftSuppressed(redis, 'x', 'JB|johor')).toBe(false);
  });

  it('per-chat isolation', async () => {
    await addDriftSuppress(redis, 'a', 'JB|johor');
    expect(await isDriftSuppressed(redis, 'b', 'JB|johor')).toBe(false);
  });

  it('TTL refreshes on every add', async () => {
    await addDriftSuppress(redis, 'x', 'JB|johor');
    const ttl1 = redis.ttls.get(`drift-suppress:${require('crypto').createHash('sha256').update('x').digest('hex').slice(0, 16)}`);
    expect(ttl1).toBe(DRIFT_SUPPRESS_TTL);
  });

  it('no-op on closed redis / missing args', async () => {
    const closed = makeFakeRedis({ isOpen: false });
    await addDriftSuppress(closed, 'x', 'JB|johor');
    expect(await isDriftSuppressed(closed, 'x', 'JB|johor')).toBe(false);
    expect(await isDriftSuppressed(redis, 'x', '')).toBe(false);
    expect(await isDriftSuppressed(redis, 'x', null)).toBe(false);
  });
});

describe('setUserLocale persists structured boundary (v0.61.157)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('stores a valid boundary verbatim', async () => {
    await setUserLocale(redis, 'b1', {
      mode: 'JB', placeName: 'X', country: 'Malaysia', adminAreaLevel1: 'Johor',
      lat: 1.49, lng: 103.74,
      boundary: { matchKey: 'JB|johor', radiusM: 30000, anchorLat: 1.49, anchorLng: 103.74 }
    });
    const got = await getUserLocale(redis, 'b1');
    expect(got.boundary).toMatchObject({ matchKey: 'JB|johor', radiusM: 30000 });
  });

  it('drops a boundary missing matchKey or radiusM (defensive)', async () => {
    await setUserLocale(redis, 'b2', {
      mode: 'SG', lat: 1, lng: 103,
      boundary: { matchKey: '', radiusM: 30000 }
    });
    expect((await getUserLocale(redis, 'b2')).boundary).toBeNull();
    await setUserLocale(redis, 'b3', {
      mode: 'SG', lat: 1, lng: 103,
      boundary: { matchKey: 'SG', radiusM: 0 }
    });
    expect((await getUserLocale(redis, 'b3')).boundary).toBeNull();
  });

  it('drops boundary entirely when input is not an object', async () => {
    await setUserLocale(redis, 'b4', { mode: 'SG', lat: 1, lng: 103, boundary: 'oops' });
    expect((await getUserLocale(redis, 'b4')).boundary).toBeNull();
  });
});
