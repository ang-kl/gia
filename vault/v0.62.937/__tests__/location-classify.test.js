// __tests__/location-classify.test.js — v0.61.157
//
// Tests for the v0.61.156 classifyAndPersist orchestrator + the
// v0.61.157 boundary-drift extensions (rule §2.7 'outside' /
// 'suppressed' branches).

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { classifyAndPersist } = require('../location-classify');
const {
  getUserLocale,
  addDriftSuppress
} = require('../location-locale');

// Fake Redis with the Set commands location-locale.js needs for
// drift-suppression. Only the methods exercised by tests are
// implemented; the rest are silent no-ops.
function makeFakeRedis({ isOpen = true } = {}) {
  const store = new Map();
  const sets = new Map();    // key → Set<string>
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

const SG_RAFFLES     = { lat: 1.2843, lng: 103.8519 };
const SG_SENTOSA     = { lat: 1.2494, lng: 103.8303 };
const JB_CBD         = { lat: 1.4927, lng: 103.7414 };
const JB_PASIR       = { lat: 1.4790, lng: 103.9180 };  // ~21 km E of JB CBD (inside 30 km radius)
const BATAM_FIX      = { lat: 1.0810, lng: 104.0305 };
const PUTRAJAYA_FIX  = { lat: 2.9742, lng: 101.7060 };
// SELANGOR_FIX uses coords inside the 120 km gate so the geocoder
// mock can pretend it returned Selangor admin (the real Selangor
// is ~330 km away, beyond the coarse gate, where the classifier
// short-circuits to OTHER+null-admin without geocoding). The
// coordinate value here is irrelevant — the mock controls the
// admin string.
const SELANGOR_FIX   = { lat: 1.0900, lng: 104.0500 };

const sgGeo = async () => ({ country: 'Singapore', adminAreaLevel1: 'Central Region', placeName: 'Raffles Place' });
const sgNorthGeo = async () => ({ country: 'Singapore', adminAreaLevel1: 'North Region', placeName: 'Sentosa' });
const jbGeo = async () => ({ country: 'Malaysia',  adminAreaLevel1: 'Johor',         placeName: 'City Square' });
const jbPasirGeo = async () => ({ country: 'Malaysia', adminAreaLevel1: 'Johor', placeName: 'Pasir Gudang' });
const batamGeo = async () => ({ country: 'Indonesia', adminAreaLevel1: 'Kepulauan Riau', placeName: 'Batam Centre' });
const selangorGeo = async () => ({ country: 'Malaysia', adminAreaLevel1: 'Selangor', placeName: 'Shah Alam' });

describe('classifyAndPersist — first registration (no prior locale)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('SG fix → persists with drift=none, changed=true', async () => {
    const out = await classifyAndPersist({
      chatId: '1', ...SG_RAFFLES, redis, reverseGeocodeFn: sgGeo, now: 1700000000000
    });
    expect(out.mode).toBe('SG');
    expect(out.changed).toBe(true);
    expect(out.drift).toBe('none');
    expect(out.record.placeName).toBe('Raffles Place');
    expect(out.record.boundary).toMatchObject({ matchKey: 'SG' });
    expect(out.record.boundary.radiusM).toBeGreaterThan(0);
  });

  it('JB fix → persists JB record with JB boundary', async () => {
    const out = await classifyAndPersist({
      chatId: '2', ...JB_CBD, redis, reverseGeocodeFn: jbGeo
    });
    expect(out.mode).toBe('JB');
    expect(out.drift).toBe('none');
    expect(out.record.boundary.matchKey).toBe('JB|johor');
  });

  it('Putrajaya fix (gate-skipped) → persists OTHER with no geocode call', async () => {
    let calls = 0;
    const fn = async () => { calls++; return { country: 'Malaysia', adminAreaLevel1: 'Putrajaya', placeName: 'IOI' }; };
    const out = await classifyAndPersist({
      chatId: '3', ...PUTRAJAYA_FIX, redis, reverseGeocodeFn: fn
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
    expect(out.geocoded).toBe(false);
    expect(calls).toBe(0);
    expect(out.record.boundary.matchKey).toBe('OTHER|');     // no admin from gated path
  });
});

describe('classifyAndPersist — rule §2.6 silent reuse (drift=inside)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('SG sub-region change (Raffles → Sentosa) stays inside SG boundary', async () => {
    const first = await classifyAndPersist({
      chatId: '5', ...SG_RAFFLES, redis, reverseGeocodeFn: sgGeo, now: 1700000000000
    });
    expect(first.drift).toBe('none');
    // Second fix in a different SG admin (North Region) — still SG.
    const second = await classifyAndPersist({
      chatId: '5', ...SG_SENTOSA, redis, reverseGeocodeFn: sgNorthGeo, now: 1700000999999
    });
    expect(second.changed).toBe(false);
    expect(second.drift).toBe('inside');
    expect(second.record.registeredAt).toBe(1700000000000);
  });

  it('JB fix → another JB fix 21 km away (still in Johor) is inside', async () => {
    await classifyAndPersist({ chatId: '6', ...JB_CBD, redis, reverseGeocodeFn: jbGeo });
    const out = await classifyAndPersist({
      chatId: '6', ...JB_PASIR, redis, reverseGeocodeFn: jbPasirGeo
    });
    expect(out.drift).toBe('inside');
    expect(out.changed).toBe(false);
  });
});

describe('classifyAndPersist — rule §2.7 drift detection (outside)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('SG → JB triggers drift=outside (different matchKey), prev kept', async () => {
    await classifyAndPersist({ chatId: '10', ...SG_RAFFLES, redis, reverseGeocodeFn: sgGeo });
    const out = await classifyAndPersist({
      chatId: '10', ...JB_CBD, redis, reverseGeocodeFn: jbGeo
    });
    expect(out.drift).toBe('outside');
    expect(out.changed).toBe(false);
    expect(out.record.mode).toBe('SG');           // PREV is still canonical
    expect(out.candidate.mode).toBe('JB');        // candidate for the prompt
    expect(out.candidate.placeName).toBe('City Square');
    // Verify nothing got written.
    const stored = await getUserLocale(redis, '10');
    expect(stored.placeName).toBe('Raffles Place');
  });

  it('OTHER → OTHER different admin (Batam → Selangor) is drift=outside', async () => {
    await classifyAndPersist({ chatId: '11', ...BATAM_FIX, redis, reverseGeocodeFn: batamGeo });
    const out = await classifyAndPersist({
      chatId: '11', ...SELANGOR_FIX, redis, reverseGeocodeFn: selangorGeo
    });
    expect(out.drift).toBe('outside');
    expect(out.changed).toBe(false);
    expect(out.candidate.adminAreaLevel1).toBe('Selangor');
  });
});

describe('classifyAndPersist — rule §2.7 single re-prompt (suppressed)', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('after declining for JB destination, a second JB fix is drift=suppressed (no prompt)', async () => {
    // 1. Register SG anchor.
    await classifyAndPersist({ chatId: '20', ...SG_RAFFLES, redis, reverseGeocodeFn: sgGeo });
    // 2. First JB fix → prompt (drift=outside).
    const prompt = await classifyAndPersist({
      chatId: '20', ...JB_CBD, redis, reverseGeocodeFn: jbGeo
    });
    expect(prompt.drift).toBe('outside');
    // 3. Simulate "decline" — caller adds the candidate matchKey to the suppress set.
    await addDriftSuppress(redis, '20', 'JB|johor');
    // 4. Second JB fix → drift=suppressed, no prompt.
    const silent = await classifyAndPersist({
      chatId: '20', ...JB_CBD, redis, reverseGeocodeFn: jbGeo
    });
    expect(silent.drift).toBe('suppressed');
    expect(silent.changed).toBe(false);
    expect(silent.record.placeName).toBe('Raffles Place');   // SG anchor still canonical
  });

  it('suppression for JB does NOT silence a NEW destination (e.g. Selangor)', async () => {
    await classifyAndPersist({ chatId: '21', ...SG_RAFFLES, redis, reverseGeocodeFn: sgGeo });
    await addDriftSuppress(redis, '21', 'JB|johor');   // user previously declined JB
    const out = await classifyAndPersist({
      chatId: '21', ...SELANGOR_FIX, redis, reverseGeocodeFn: selangorGeo
    });
    expect(out.drift).toBe('outside');    // Selangor is a different matchKey
    expect(out.candidate.adminAreaLevel1).toBe('Selangor');
  });
});

describe('classifyAndPersist — defensive paths', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('geocode fn throws on FIRST registration → OTHER persisted, drift=none', async () => {
    const out = await classifyAndPersist({
      chatId: '30', ...SG_RAFFLES, redis,
      reverseGeocodeFn: async () => { throw new Error('quota'); }
    });
    expect(out.mode).toBe('OTHER');
    expect(out.geocoded).toBe(false);
    expect(out.changed).toBe(true);
    expect(out.drift).toBe('none');
  });

  it('non-finite lat/lng on FIRST registration → OTHER + gated, drift=none', async () => {
    const out = await classifyAndPersist({
      chatId: '31', lat: NaN, lng: 103, redis, reverseGeocodeFn: sgGeo
    });
    expect(out.mode).toBe('OTHER');
    expect(out.gated).toBe(true);
    expect(out.drift).toBe('none');
  });

  it('prev with null boundary (pre-v0.61.157 record) — synthesized boundary still gates correctly', async () => {
    // Simulate a legacy record via the setUserLocale path with null boundary.
    const { setUserLocale } = require('../location-locale');
    await setUserLocale(redis, '32', {
      mode: 'SG',
      placeName: 'Raffles Place',
      country: 'Singapore',
      adminAreaLevel1: 'Central Region',
      lat: SG_RAFFLES.lat,
      lng: SG_RAFFLES.lng,
      boundary: null,            // legacy shape
      registeredAt: 1700000000000
    });
    const out = await classifyAndPersist({
      chatId: '32', ...SG_SENTOSA, redis, reverseGeocodeFn: sgNorthGeo
    });
    expect(out.drift).toBe('inside');     // synthesized SG boundary catches Sentosa
  });
});
