// __tests__/location-cache.test.js — covers touchLastSeen, the v0.61.84
// per-chat last-activity marker behind the wake-from-idle location
// re-confirmation prompt. touchLastSeen must return the PRIOR timestamp
// (so the caller can compute the idle gap) and then stamp `now`.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const { touchLastSeen } = require('../location-cache.js');

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
