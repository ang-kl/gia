// __tests__/count-cadence.test.js — v0.61.166

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  VALUES,
  DEFAULT_VALUE,
  DAYS_4_MONTHLY,
  DAYS_YEARLY,
  isValidValue,
  getCadence,
  setCadence,
  listAll,
  intervalMs
} = require('../count-cadence');

function makeFakeRedis({ isOpen = true } = {}) {
  const store = new Map();
  return {
    isOpen,
    store,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async set(k, v) { store.set(k, v); return 'OK'; }
  };
}

describe('constants', () => {
  it('VALUES = the 4 cadence labels', () => {
    expect([...VALUES]).toEqual(['manual', '4-monthly', 'yearly', 'off']);
  });
  it('DEFAULT_VALUE = manual', () => { expect(DEFAULT_VALUE).toBe('manual'); });
  it('DAYS_4_MONTHLY = 120, DAYS_YEARLY = 365', () => {
    expect(DAYS_4_MONTHLY).toBe(120);
    expect(DAYS_YEARLY).toBe(365);
  });
});

describe('isValidValue', () => {
  it('accepts only the 4 canonical values', () => {
    for (const v of VALUES) expect(isValidValue(v)).toBe(true);
    expect(isValidValue('weekly')).toBe(false);
    expect(isValidValue('')).toBe(false);
    expect(isValidValue(null)).toBe(false);
    expect(isValidValue(42)).toBe(false);
  });
});

describe('intervalMs', () => {
  it('manual / off / unknown → null (never auto)', () => {
    expect(intervalMs('manual')).toBeNull();
    expect(intervalMs('off')).toBeNull();
    expect(intervalMs('weekly')).toBeNull();
    expect(intervalMs(null)).toBeNull();
  });
  it('4-monthly → 120 days in ms', () => {
    expect(intervalMs('4-monthly')).toBe(120 * 24 * 60 * 60 * 1000);
  });
  it('yearly → 365 days in ms', () => {
    expect(intervalMs('yearly')).toBe(365 * 24 * 60 * 60 * 1000);
  });
});

describe('getCadence + setCadence round-trip', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('returns DEFAULT_VALUE when key is missing', async () => {
    expect(await getCadence(redis, 'cuisines')).toBe('manual');
  });

  it('stores + reads back a valid value', async () => {
    expect(await setCadence(redis, 'cuisines', '4-monthly')).toBe(true);
    expect(await getCadence(redis, 'cuisines')).toBe('4-monthly');
  });

  it('rejects invalid values + returns false', async () => {
    expect(await setCadence(redis, 'cuisines', 'weekly')).toBe(false);
    expect(await setCadence(redis, 'cuisines', '')).toBe(false);
    expect(await setCadence(redis, 'cuisines', null)).toBe(false);
    expect(await getCadence(redis, 'cuisines')).toBe('manual');  // still default
  });

  it('rejects missing redis / item', async () => {
    expect(await setCadence(null, 'cuisines', 'yearly')).toBe(false);
    expect(await setCadence(redis, '', 'yearly')).toBe(false);
    const closed = makeFakeRedis({ isOpen: false });
    expect(await setCadence(closed, 'cuisines', 'yearly')).toBe(false);
  });

  it('falls back to DEFAULT_VALUE on closed redis', async () => {
    const closed = makeFakeRedis({ isOpen: false });
    expect(await getCadence(closed, 'cuisines')).toBe('manual');
  });

  it('listAll returns a Map<item, cadence>', async () => {
    await setCadence(redis, 'cuisines', '4-monthly');
    await setCadence(redis, 'train-lines', 'yearly');
    const m = await listAll(redis, ['cuisines', 'train-lines', 'parks']);
    expect(m.get('cuisines')).toBe('4-monthly');
    expect(m.get('train-lines')).toBe('yearly');
    expect(m.get('parks')).toBe('manual');   // default
  });

  it('listAll returns empty Map for non-array input', async () => {
    const m = await listAll(redis, null);
    expect(m.size).toBe(0);
  });
});
