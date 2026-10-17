// __tests__/location-country-persist.test.js — v0.62.938
//
// Codex P1 on #1870 (posted after the merge, recorded in [AMD-232]): v0.62.936
// threaded the reader's country into the chat free-text place anchor, but two of
// the three ways a foreign location gets SET never stored a country:
//
//   - `/location <place>` outside SG wrote { region: 'OTHER', label } only,
//     although `countryCode` was in scope for the recent-locations push below it;
//   - picking a recent location copied `region` and `label` and dropped
//     `entry.country`.
//
// `resolveRegionCode` returns 'SG' for an OTHER record with no country, so the
// free-text anchor (and `/s`) fell back to Singapore for both. The v0.62.936
// test scanned `index.js` for the call site and was green with this present,
// because it never resolved a STORED record. This file does: it writes through
// the real `setUserLocation`, reads back through `getUserLocation`, and calls
// the real `resolveRegionCode`.

import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { locationOptsFromRecent } = require('../recent-locations.js');
const { setUserLocation, getUserLocation } = require('../location-cache.js');
const { resolveRegionCode } = require('../region-code.js');

function makeRedisStub() {
  const store = new Map();
  return {
    isOpen: true,
    connect: async () => {},
    get: async (k) => (store.has(k) ? store.get(k) : null),
    set: async (k, v) => { store.set(k, v); },
    setEx: async (k, _ttl, v) => { store.set(k, v); },
    expire: async () => {},
    del: async (k) => { store.delete(k); },
  };
}

async function storeAndResolve(opts, lat = 35.6717, lng = 139.765) {
  const redis = makeRedisStub();
  await setUserLocation(redis, 'chat-1', lat, lng, opts);
  return resolveRegionCode(await getUserLocation(redis, 'chat-1'));
}

describe('a stored OTHER location keeps its country', () => {
  it('the defect, replayed: OTHER with no country resolves to SG', async () => {
    // This is what /location <place> stored before v0.62.938.
    expect(await storeAndResolve({ region: 'OTHER', label: 'Ginza, Tokyo' })).toBe('SG');
  });

  it('/location <place> abroad: OTHER plus country resolves to that country', async () => {
    expect(await storeAndResolve({ region: 'OTHER', label: 'Ginza, Tokyo', country: 'JP' })).toBe('JP');
  });

  it('a recent OTHER pick carries its country through to the stored record', async () => {
    const entry = { lat: 35.6717, lng: 139.765, label: 'Ginza, Tokyo', country: 'JP', region: 'OTHER' };
    expect(await storeAndResolve(locationOptsFromRecent(entry), entry.lat, entry.lng)).toBe('JP');
  });
});

describe('locationOptsFromRecent leaves SG and JB picks exactly as before', () => {
  it('SG entry: label only, no country added', () => {
    expect(locationOptsFromRecent({ lat: 1.3, lng: 103.8, label: 'Bugis', country: 'SG' }))
      .toEqual({ label: 'Bugis' });
  });

  it('JB entry: region and label only, no country added', () => {
    expect(locationOptsFromRecent({ lat: 1.49, lng: 103.74, label: 'JB CBD', country: 'MY', region: 'JB' }))
      .toEqual({ region: 'JB', label: 'JB CBD' });
  });

  it('OTHER entry with no country: unchanged shape', () => {
    expect(locationOptsFromRecent({ lat: 35.6, lng: 139.7, label: 'Tokyo', region: 'OTHER' }))
      .toEqual({ region: 'OTHER', label: 'Tokyo' });
  });

  it('OTHER entry with country: country carried', () => {
    expect(locationOptsFromRecent({ lat: 35.6, lng: 139.7, label: 'Tokyo', region: 'OTHER', country: 'JP' }))
      .toEqual({ region: 'OTHER', label: 'Tokyo', country: 'JP' });
  });

  it('tolerates a missing entry', () => {
    expect(locationOptsFromRecent(null)).toEqual({});
  });
});

describe('index.js wires both call sites (comment-masked)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

  it('/location <place> stores the country with the OTHER anchor', () => {
    expect(code).toMatch(/setUserLocation\(redis, chatId, lat, lng, \{\s*region: 'OTHER',\s*label,\s*country: countryCode\s*\}\)/);
  });

  it('the recent-location pick builds its opts with locationOptsFromRecent', () => {
    expect(code).toMatch(/setUserLocation\(redis, chatId, entry\.lat, entry\.lng, locationOptsFromRecent\(entry\)\)/);
  });
});
