// __tests__/response-cache.test.js — covers buildKey determinism
// (the v0.41.0 cache key collision class) and roundtrip with stub.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const cache = require('../response-cache.js');

describe('buildKey determinism', () => {
  it('produces identical keys regardless of cuisine array order', () => {
    const params1 = { lat: 1.2839, lng: 103.8517, cuisines: ['Korean', 'Japanese', 'Italian'], mealPeriod: 'lunch' };
    const params2 = { lat: 1.2839, lng: 103.8517, cuisines: ['Italian', 'Japanese', 'Korean'], mealPeriod: 'lunch' };
    expect(cache.buildKey(params1)).toBe(cache.buildKey(params2));
  });

  it('lowercases cuisine names so case differences do not split cache', () => {
    const params1 = { lat: 1.28, lng: 103.85, cuisines: ['Korean'], mealPeriod: 'lunch' };
    const params2 = { lat: 1.28, lng: 103.85, cuisines: ['korean'], mealPeriod: 'lunch' };
    expect(cache.buildKey(params1)).toBe(cache.buildKey(params2));
  });

  it('uses "any" when cuisines is empty or missing', () => {
    const k1 = cache.buildKey({ lat: 1.28, lng: 103.85, cuisines: [], mealPeriod: 'lunch' });
    const k2 = cache.buildKey({ lat: 1.28, lng: 103.85, mealPeriod: 'lunch' });
    expect(k1).toContain(':any:');
    expect(k1).toBe(k2);
  });

  it('rounds lat/lng to 3 decimal places (geo bucket)', () => {
    const k1 = cache.buildKey({ lat: 1.28391, lng: 103.85174, cuisines: [], mealPeriod: 'lunch' });
    const k2 = cache.buildKey({ lat: 1.28429, lng: 103.85211, cuisines: [], mealPeriod: 'lunch' });
    expect(k1).toBe(k2);
  });

  it('partitions by mealPeriod', () => {
    const k1 = cache.buildKey({ lat: 1.28, lng: 103.85, cuisines: [], mealPeriod: 'lunch' });
    const k2 = cache.buildKey({ lat: 1.28, lng: 103.85, cuisines: [], mealPeriod: 'dinner' });
    expect(k1).not.toBe(k2);
  });

  it('lowercases mealPeriod', () => {
    const k1 = cache.buildKey({ lat: 1.28, lng: 103.85, cuisines: [], mealPeriod: 'Lunch' });
    const k2 = cache.buildKey({ lat: 1.28, lng: 103.85, cuisines: [], mealPeriod: 'LUNCH' });
    expect(k1).toBe(k2);
  });

  it('starts with the cuisine-cache: prefix', () => {
    expect(cache.buildKey({ lat: 1, lng: 1, mealPeriod: 'now' })).toMatch(/^cuisine-cache:/);
  });
});

describe('get / set roundtrip', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('set then get returns the cached venues', async () => {
    const params = { lat: 1.28, lng: 103.85, cuisines: ['Japanese'], mealPeriod: 'lunch' };
    const venues = [{ placeId: 'ChIJ_test1', name: 'Hashida' }];
    await cache.set(redis, params, venues);
    const read = await cache.get(redis, params);
    expect(read.hit).toBe(true);
    expect(read.venues).toEqual(venues);
    expect(typeof read.cachedAt).toBe('number');
  });

  it('get returns hit:false on miss', async () => {
    const params = { lat: 1.28, lng: 103.85, cuisines: [], mealPeriod: 'lunch' };
    const read = await cache.get(redis, params);
    expect(read.hit).toBe(false);
    expect(read.key).toMatch(/^cuisine-cache:/);
  });

  it('returns null safely when redis is closed/unavailable', async () => {
    redis.isOpen = false;
    const r = await cache.get(redis, { lat: 1, lng: 1, mealPeriod: 'now' });
    expect(r).toBe(null);
  });

  it('refuses to write empty venues array', async () => {
    const r = await cache.set(redis, { lat: 1, lng: 1, mealPeriod: 'now' }, []);
    expect(r).toBe(null);
  });

  it('exposes TTL_S correctly', () => {
    expect(cache.TTL_S).toBe(30 * 60);
  });
});
