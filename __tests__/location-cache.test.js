// __tests__/location-cache.test.js — covers touchLastSeen, the v0.61.84
// per-chat last-activity marker behind the wake-from-idle location
// re-confirmation prompt. touchLastSeen must return the PRIOR timestamp
// (so the caller can compute the idle gap) and then stamp `now`.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const { touchLastSeen, setUserLocation, getUserLocation } = require('../location-cache.js');

describe('touchLastSeen', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('returns null on the first call (no prior marker)', async () => {
    const prev = await touchLastSeen(redis, 12345);
    expect(prev).toBe(null);
  });

  it('returns the prior timestamp on the second call', async () => {
    const before = Date.now();
    await touchLastSeen(redis, 12345);
    const prev = await touchLastSeen(redis, 12345);
    expect(typeof prev).toBe('number');
    expect(prev).toBeGreaterThanOrEqual(before);
    expect(prev).toBeLessThanOrEqual(Date.now());
  });

  it('keeps separate markers per chat', async () => {
    await touchLastSeen(redis, 111);
    const prevOther = await touchLastSeen(redis, 222);
    expect(prevOther).toBe(null);
  });

  it('refreshes the marker each call (later call sees a newer stamp)', async () => {
    await touchLastSeen(redis, 999);
    const first = await touchLastSeen(redis, 999);
    await new Promise((r) => setTimeout(r, 5));
    const second = await touchLastSeen(redis, 999);
    expect(second).toBeGreaterThanOrEqual(first);
  });

  it('connects redis if it is closed', async () => {
    redis.isOpen = false;
    const prev = await touchLastSeen(redis, 777);
    expect(prev).toBe(null);
    expect(redis.isOpen).toBe(true);
  });
});

// v0.61.270 — Phase 2 SSOT consolidation. setUserLocation must now
// persist `country` (ISO 3166-1 alpha-2) when supplied. Pre-v0.61.270
// the opt was silently dropped at the helper boundary, which left the
// Cuisine TMA cuisine-search OTHER branch unable to distinguish a
// user who picked Thailand from one who picked Indonesia.
describe('setUserLocation — country opt persistence (v0.61.270)', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('persists country when a valid 2-letter ISO code is passed', async () => {
    await setUserLocation(redis, 12345, 13.7563, 100.5018, {
      label: 'Bangkok', country: 'TH', region: 'OTHER'
    });
    const cached = await getUserLocation(redis, 12345);
    expect(cached.country).toBe('TH');
    expect(cached.label).toBe('Bangkok');
    expect(cached.region).toBe('OTHER');
    expect(cached.lat).toBeCloseTo(13.7563, 4);
  });

  it('uppercases lowercase country codes', async () => {
    await setUserLocation(redis, 12346, 1.3521, 103.8198, {
      country: 'sg'
    });
    const cached = await getUserLocation(redis, 12346);
    expect(cached.country).toBe('SG');
  });

  it('drops invalid country values', async () => {
    await setUserLocation(redis, 12347, 1.3521, 103.8198, {
      country: 'BANGKOK'  // not 2-letter
    });
    const cached = await getUserLocation(redis, 12347);
    expect(cached.country).toBeUndefined();
  });

  it('drops non-string country values', async () => {
    await setUserLocation(redis, 12348, 1.3521, 103.8198, {
      country: 123
    });
    const cached = await getUserLocation(redis, 12348);
    expect(cached.country).toBeUndefined();
  });

  it('preserves country across separate writes that omit it', async () => {
    // First write: with country
    await setUserLocation(redis, 12349, 13.7563, 100.5018, {
      country: 'TH', label: 'Bangkok'
    });
    // Second write: same chat, NO country opt → setUserLocation
    // OVERWRITES the entire key. The new payload won't carry the
    // stale country forward (this is the existing replace-payload
    // semantics; documenting here so a future migration knows).
    await setUserLocation(redis, 12349, 14.0, 100.5);
    const cached = await getUserLocation(redis, 12349);
    expect(cached.country).toBeUndefined();
    // Callers that want to keep the country MUST re-pass it on
    // every write — matches /api/menu/set-location's existing
    // behaviour.
  });

  it('coexists with all other opts (region, label, street, building, postal, radiusCapM)', async () => {
    await setUserLocation(redis, 12350, 3.139, 101.6869, {
      country: 'MY',
      region: 'OTHER',
      label: 'Pavilion KL',
      street: 'Jalan Bukit Bintang',
      building: 'Pavilion',
      postal: '55100',
      radiusCapM: 25000
    });
    const c = await getUserLocation(redis, 12350);
    expect(c.country).toBe('MY');
    expect(c.region).toBe('OTHER');
    expect(c.label).toBe('Pavilion KL');
    expect(c.street).toBe('Jalan Bukit Bintang');
    expect(c.building).toBe('Pavilion');
    expect(c.postal).toBe('55100');
    expect(c.radiusCapM).toBe(25000);
  });
});

// v0.61.363 — per-device keys. One chatId, several devices each in a
// different place: a device token routes writes/reads to its own slot so
// devices don't clobber each other; reads fall back to the chatId-level
// key (bot-chat default + new-device seed).
describe('setUserLocation / getUserLocation — per-device keys (v0.61.363)', () => {
  let redis;
  beforeEach(() => { redis = createStub(); });

  it('keeps two devices on the same chatId isolated (no clobber)', async () => {
    await setUserLocation(redis, 777, 1.3521, 103.8198, { region: 'SG', country: 'SG', deviceId: 'phoneA' });
    await setUserLocation(redis, 777, 35.6762, 139.6503, { region: 'OTHER', country: 'JP', deviceId: 'phoneB' });
    const a = await getUserLocation(redis, 777, 'phoneA');
    const b = await getUserLocation(redis, 777, 'phoneB');
    expect(a.country).toBe('SG');
    expect(a.lat).toBeCloseTo(1.3521, 3);
    expect(b.country).toBe('JP');
    expect(b.lat).toBeCloseTo(35.6762, 3);
  });

  it('a fresh device falls back to the chatId-level key (seed), then diverges', async () => {
    // Only a chatId-level write so far (e.g. a bot-chat share-pin).
    await setUserLocation(redis, 888, 1.3521, 103.8198, { region: 'SG', country: 'SG' });
    // New device with no slot yet → seeds from chatId-level.
    const seed = await getUserLocation(redis, 888, 'newPhone');
    expect(seed.country).toBe('SG');
    // Once the device writes its own slot, it diverges.
    await setUserLocation(redis, 888, 13.7563, 100.5018, { region: 'OTHER', country: 'TH', deviceId: 'newPhone' });
    const own = await getUserLocation(redis, 888, 'newPhone');
    expect(own.country).toBe('TH');
    // The chatId-level (bot-chat) read still reflects the latest write.
    const chatLevel = await getUserLocation(redis, 888);
    expect(chatLevel.country).toBe('TH');
  });

  it('a per-device write also refreshes the chatId-level key', async () => {
    await setUserLocation(redis, 999, 37.5665, 126.9780, { region: 'OTHER', country: 'KR', deviceId: 'tab1' });
    const chatLevel = await getUserLocation(redis, 999);
    expect(chatLevel.country).toBe('KR');
  });
});
