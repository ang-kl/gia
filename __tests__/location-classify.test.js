// __tests__/location-classify.test.js — v0.61.156
//
// Unit tests for the classifyAndPersist orchestrator (PR 2/5).
// Mocks the reverseGeocodeFn + a fake Redis so the test runs
// without network and without a real Redis instance.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { classifyAndPersist } = require('../location-classify');
const { getUserLocale } = require('../location-locale');

function makeFakeRedis({ isOpen = true } = {}) {
  const store = new Map();
  return {
    isOpen,
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async setEx(k, ttl, v) { store.set(k, v); return 'OK'; },
    async del(k) { store.delete(k); return 1; }
  };
}

const SG_FIX        = { lat: 1.2843, lng: 103.8519 };  // Raffles Place
const JB_FIX        = { lat: 1.4927, lng: 103.7414 };  // City Square
const BATAM_FIX     = { lat: 1.0810, lng: 104.0305 };
const PUTRAJAYA_FIX = { lat: 2.9742, lng: 101.7060 };  // beyond 120km gate

const sgGeo = async () => ({ country: 'Singapore', adminAreaLevel1: 'Central Region', placeName: 'Raffles Place' });
const jbGeo = async () => ({ country: 'Malaysia',  adminAreaLevel1: 'Johor',         placeName: 'City Square' });
const batamGeo = async () => ({ country: 'Indonesia', adminAreaLevel1: 'Kepulauan Riau', placeName: 'Batam Centre' });
const putrajayaGeo = async () => ({ country: 'Malaysia', adminAreaLevel1: 'Wilayah Persekutuan Putrajaya', placeName: 'IOI Resort City' });

describe('classifyAndPersist — fresh registration (no prior locale)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('SG fix → persists SG record, changed=true', async () => {
    const out = await classifyAndPersist({
      chatId: '1', ...SG_FIX, redis, reverseGeocodeFn: sgGeo, now: 1700000000000
    });
    expect(out.mode).toBe('SG');
    expect(out.changed).toBe(true);
    expect(out.geocoded).toBe(true);
    expect(out.record.placeName).toBe('Raffles Place');
    const stored = await getUserLocale(redis, '1');
    expect(stored.mode).toBe('SG');
    expect(stored.placeName).toBe('Raffles Place');
    expect(stored.lat).toBe(SG_FIX.lat);
    expect(stored.lng).toBe(SG_FIX.lng);
  });

  it('JB fix → persists JB record', async () => {
    const out = await classifyAndPersist({
      chatId: '2', ...JB_FIX, redis, reverseGeocodeFn: jbGeo
    });
    expect(out.mode).toBe('JB');
    expect(out.record.adminAreaLevel1).toBe('Johor');
  });

  it('Batam fix (within gate, foreign) → persists OTHER record via geocode', async () => {
    const out = await classifyAndPersist({
      chatId: '3', ...BATAM_FIX, redis, reverseGeocodeFn: batamGeo
    });
    expect(out.mode).toBe('OTHER');
    expect(out.record.country).toBe('Indonesia');
    expect(out.gated).toBe(false);
    expect(out.geocoded).toBe(true);
  });

  it('Putrajaya fix (beyond 120 km gate) → OTHER WITHOUT geocode call', async () => {
    let calls = 0;
    const fn = async () => { calls++; return putrajayaGeo(); };
    const out = await classifyAndPersist({
      chatId: '4', ...PUTRAJAYA_FIX, redis, reverseGeocodeFn: fn
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
    expect(out.geocoded).toBe(false);
    expect(calls).toBe(0);
    // Still persists — caller can re-classify on next fix.
    const stored = await getUserLocale(redis, '4');
    expect(stored.mode).toBe('OTHER');
    expect(stored.country).toBeNull();         // gate skipped → no geocode → no country
    expect(stored.placeName).toBeNull();
  });
});

describe('classifyAndPersist — rule §2.6 no-nag (same locale)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('a second SG fix in the same admin region returns changed=false and does NOT overwrite', async () => {
    // First fix
    const first = await classifyAndPersist({
      chatId: '5', ...SG_FIX, redis, reverseGeocodeFn: sgGeo, now: 1700000000000
    });
    expect(first.changed).toBe(true);
    // Second fix — same SG region (no admin change)
    const second = await classifyAndPersist({
      chatId: '5', lat: 1.3000, lng: 103.8000, redis, reverseGeocodeFn: sgGeo, now: 1700000999999
    });
    expect(second.changed).toBe(false);
    expect(second.mode).toBe('SG');
    expect(second.record.registeredAt).toBe(1700000000000);  // PRIOR value preserved
  });

  it('admin-area change in the same mode → changed=true (different locale)', async () => {
    // First: Selangor
    await classifyAndPersist({
      chatId: '6', lat: 1.0900, lng: 104.0300, redis,
      reverseGeocodeFn: async () => ({ country: 'Malaysia', adminAreaLevel1: 'Selangor', placeName: 'Shah Alam' }),
      now: 1700000000000
    });
    // Second: Wilayah Persekutuan Putrajaya
    const out = await classifyAndPersist({
      chatId: '6', lat: 1.0901, lng: 104.0301, redis,
      reverseGeocodeFn: async () => ({ country: 'Malaysia', adminAreaLevel1: 'Wilayah Persekutuan Putrajaya', placeName: 'Putrajaya' }),
      now: 1700001000000
    });
    expect(out.changed).toBe(true);
    expect(out.record.adminAreaLevel1).toBe('Wilayah Persekutuan Putrajaya');
  });

  it('mode change (JB → SG) → changed=true even with same admin (defensive)', async () => {
    await classifyAndPersist({
      chatId: '7', ...JB_FIX, redis, reverseGeocodeFn: jbGeo, now: 1700000000000
    });
    const out = await classifyAndPersist({
      chatId: '7', ...SG_FIX, redis, reverseGeocodeFn: sgGeo, now: 1700001000000
    });
    expect(out.changed).toBe(true);
    expect(out.mode).toBe('SG');
  });
});

describe('classifyAndPersist — defensive paths', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('geocode fn throws → conservative OTHER, persists', async () => {
    const out = await classifyAndPersist({
      chatId: '8', ...SG_FIX, redis,
      reverseGeocodeFn: async () => { throw new Error('quota'); }
    });
    expect(out.mode).toBe('OTHER');
    expect(out.geocoded).toBe(false);
    expect(out.changed).toBe(true);
  });

  it('non-finite lat/lng → OTHER + gated', async () => {
    const out = await classifyAndPersist({
      chatId: '9', lat: NaN, lng: 103, redis, reverseGeocodeFn: sgGeo
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
  });
});
