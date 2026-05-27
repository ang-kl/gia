// __tests__/recent-locations.test.js — v0.61.197

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const rl = require('../recent-locations.js');

function makeRedisStub() {
  const store = new Map();
  return {
    isOpen: true,
    connect: async () => {},
    get: async (k) => (store.has(k) ? store.get(k) : null),
    setEx: async (k, _ttl, v) => { store.set(k, v); },
    set: async (k, v) => { store.set(k, v); },
    del: async (k) => { store.delete(k); },
    _store: store
  };
}

describe('recent-locations — basic shape', () => {
  it('MAX_ENTRIES is 10', () => {
    expect(rl.MAX_ENTRIES).toBe(10);
  });
});

describe('recent-locations — add / list', () => {
  it('listRecentLocations returns [] when nothing stored', async () => {
    const r = makeRedisStub();
    const list = await rl.listRecentLocations(r, 'chat-1');
    expect(list).toEqual([]);
  });
  it('addRecentLocation persists + listRecentLocations returns it', async () => {
    const r = makeRedisStub();
    const ok = await rl.addRecentLocation(r, 'chat-1', { lat: 1.3, lng: 103.8, label: 'Town' });
    expect(ok).toBe(true);
    const list = await rl.listRecentLocations(r, 'chat-1');
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ lat: 1.3, lng: 103.8, label: 'Town' });
    expect(typeof list[0].setAt).toBe('number');
  });
  it('addRecentLocation rejects entries with invalid lat/lng', async () => {
    const r = makeRedisStub();
    expect(await rl.addRecentLocation(r, 'chat-1', { lat: 'x', lng: 0, label: 'bad' })).toBe(false);
    expect(await rl.addRecentLocation(r, 'chat-1', null)).toBe(false);
    expect(await rl.listRecentLocations(r, 'chat-1')).toEqual([]);
  });
  it('addRecentLocation bubbles existing entry to top (dedup on coord)', async () => {
    const r = makeRedisStub();
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.3, lng: 103.8, label: 'A' });
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.4, lng: 103.9, label: 'B' });
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.3, lng: 103.8, label: 'A-redux' });
    const list = await rl.listRecentLocations(r, 'chat-1');
    expect(list).toHaveLength(2);
    expect(list[0].label).toBe('A-redux');
    expect(list[1].label).toBe('B');
  });
  it('addRecentLocation trims to MAX_ENTRIES (oldest drops off)', async () => {
    const r = makeRedisStub();
    for (let i = 0; i < 15; i++) {
      await rl.addRecentLocation(r, 'chat-1', { lat: 1 + i * 0.01, lng: 103 + i * 0.01, label: `L${i}` });
    }
    const list = await rl.listRecentLocations(r, 'chat-1');
    expect(list).toHaveLength(10);
    expect(list[0].label).toBe('L14');
    expect(list[9].label).toBe('L5');
  });
  it('addRecentLocation persists optional country + region', async () => {
    const r = makeRedisStub();
    await rl.addRecentLocation(r, 'chat-1', { lat: 2.9, lng: 101.7, label: 'Putrajaya', country: 'my', region: 'OTHER' });
    const list = await rl.listRecentLocations(r, 'chat-1');
    expect(list[0].country).toBe('MY');
    expect(list[0].region).toBe('OTHER');
  });
});

describe('recent-locations — removeAt / clear', () => {
  beforeEach(() => {});
  it('removeRecentLocationAt drops the indexed row', async () => {
    const r = makeRedisStub();
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.3, lng: 103.8, label: 'A' });
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.4, lng: 103.9, label: 'B' });
    const ok = await rl.removeRecentLocationAt(r, 'chat-1', 0);
    expect(ok).toBe(true);
    const list = await rl.listRecentLocations(r, 'chat-1');
    expect(list).toHaveLength(1);
    expect(list[0].label).toBe('A');
  });
  it('removeRecentLocationAt at out-of-range index returns false', async () => {
    const r = makeRedisStub();
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.3, lng: 103.8, label: 'A' });
    expect(await rl.removeRecentLocationAt(r, 'chat-1', 5)).toBe(false);
    expect(await rl.removeRecentLocationAt(r, 'chat-1', -1)).toBe(false);
  });
  it('clearRecentLocations wipes the list', async () => {
    const r = makeRedisStub();
    await rl.addRecentLocation(r, 'chat-1', { lat: 1.3, lng: 103.8, label: 'A' });
    await rl.clearRecentLocations(r, 'chat-1');
    expect(await rl.listRecentLocations(r, 'chat-1')).toEqual([]);
  });
});

describe('recent-locations — defensive', () => {
  it('listRecentLocations returns [] when null redis', async () => {
    expect(await rl.listRecentLocations(null, 'chat-1')).toEqual([]);
  });
  it('addRecentLocation returns false when null redis', async () => {
    expect(await rl.addRecentLocation(null, 'chat-1', { lat: 1, lng: 1, label: 'x' })).toBe(false);
  });
  it('listRecentLocations returns [] when stored value is corrupt', async () => {
    const r = makeRedisStub();
    r._store.set('recent-locations:chat-1', 'not-json');
    expect(await rl.listRecentLocations(r, 'chat-1')).toEqual([]);
  });
});
