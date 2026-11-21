// __tests__/chat-place-reaches-devices.test.js — v0.62.987.
//
// Spec: doc/Feature/2026-11-15-chat-place-opens-cuisine-and-bold-tag.spec.md, invariants K3 and K4.
//
// Operator, 15-11 '26: "/l Hyatt Place Johor Bahru Paradigm Mall. But it still falls back to current location".
// The server half of that: /l writes the ACCOUNT's record only, and a phone reads its OWN slot first
// (location-cache.js, v0.61.363). The phone held an older Singapore record, so the Cuisine app was told Singapore
// while the chat said "Anchored to Hyatt Place". Rule D2: a place set in chat is what every phone opens on next,
// until that phone picks another place inside an app; a pick on one phone never reaches another phone.
//
// location-cache.js is CALLED with the fake Redis, with the clock stepped between writes. The chat handlers and the
// /cuisine handler in index.js cannot be called without booting the bot, so the link is tested through the function
// the handler delegates to (applyLaunchAnchorToParams), and index.js is pinned by source with comments masked.
// All coordinates here are public landmarks or synthetic.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const lc = require('../location-cache.js');
const { setUserLocation, getUserLocation, describeSavedPlace, resolveCuisineLaunchAnchor } = lc;

const H = 60 * 60 * 1000;
const T0 = Date.UTC(2026, 10, 15, 3, 0);
const CHAT = 424242;
const HOTEL = { lat: 1.5148, lng: 103.6862, label: 'Hyatt Place Johor Bahru Paradigm Mall, Johor Bahru, Johor', region: 'OTHER', country: 'MY' };
const MERLION = { lat: 1.2868, lng: 103.8545 };
const ORCHARD = { lat: 1.3040, lng: 103.8318 };

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8');
const code = (p) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

let redis;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  redis = createStub();
});
afterEach(() => { vi.useRealTimers(); });

const at = (ms) => vi.setSystemTime(T0 + ms);
const chatSetsHotel = () => setUserLocation(redis, CHAT, HOTEL.lat, HOTEL.lng,
  { region: HOTEL.region, label: HOTEL.label, country: HOTEL.country, fromChat: true });

describe('K3 - a place set in chat is what a phone with an older slot reads', () => {
  it('the reported case: the phone has its own Singapore record, then /l sets the hotel', async () => {
    await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneA', region: 'SG' });
    at(1 * H);
    await chatSetsHotel();
    const got = await getUserLocation(redis, CHAT, 'phoneA');
    expect(got.label).toBe(HOTEL.label);
    expect(got.region).toBe('OTHER');
    expect(got.country).toBe('MY');
    expect(got.lat).toBeCloseTo(HOTEL.lat, 4);
    // ...and it is locked, so the app's lock and the chat's "Anchored to" line agree.
    expect(await describeSavedPlace(got, T0 + 1 * H + 60000)).toEqual({ ageMinutes: 1, locked: true });
  });

  it('a named, fresh phone record still yields to a newer place set in chat', async () => {
    await setUserLocation(redis, CHAT, ORCHARD.lat, ORCHARD.lng, { deviceId: 'phoneA', region: 'SG', label: 'Orchard Road' });
    at(60 * 1000);
    await chatSetsHotel();
    expect((await getUserLocation(redis, CHAT, 'phoneA')).label).toBe(HOTEL.label);
  });

  it('a shared pin from chat has no name, and still reaches the phone', async () => {
    await setUserLocation(redis, CHAT, ORCHARD.lat, ORCHARD.lng, { deviceId: 'phoneA', region: 'SG', label: 'Orchard Road' });
    at(5 * 60 * 1000);
    await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { fromChat: true });
    const got = await getUserLocation(redis, CHAT, 'phoneA');
    expect(got.lat).toBeCloseTo(MERLION.lat, 4);
    expect(got.label).toBeUndefined();
  });

  it('a later pick inside an app on that phone wins again', async () => {
    await chatSetsHotel();
    at(2 * H);
    await setUserLocation(redis, CHAT, ORCHARD.lat, ORCHARD.lng, { deviceId: 'phoneA', region: 'SG', label: 'Orchard Road' });
    expect((await getUserLocation(redis, CHAT, 'phoneA')).label).toBe('Orchard Road');
    // The account's record is now that pick, and it is no longer marked as set in chat.
    const account = await getUserLocation(redis, CHAT);
    expect(account.label).toBe('Orchard Road');
    expect(account.fromChat).toBeUndefined();
  });

  it('a place set in chat BEFORE the phone\'s own pick does not come back', async () => {
    await chatSetsHotel();
    at(1 * H);
    await setUserLocation(redis, CHAT, ORCHARD.lat, ORCHARD.lng, { deviceId: 'phoneA', region: 'SG', label: 'Orchard Road' });
    at(3 * H);
    expect((await getUserLocation(redis, CHAT, 'phoneA')).label).toBe('Orchard Road');
  });
});

describe('K3 - a pick on one phone never reaches another, and an automatic write never wins', () => {
  it('phone B\'s pick stays phone B\'s (the v0.61.363 rule, unchanged)', async () => {
    await setUserLocation(redis, CHAT, ORCHARD.lat, ORCHARD.lng, { deviceId: 'phoneA', region: 'SG', label: 'Orchard Road' });
    at(1 * H);
    await setUserLocation(redis, CHAT, HOTEL.lat, HOTEL.lng, { deviceId: 'phoneB', region: 'OTHER', label: HOTEL.label, country: 'MY' });
    expect((await getUserLocation(redis, CHAT, 'phoneA')).label).toBe('Orchard Road');
    expect((await getUserLocation(redis, CHAT, 'phoneB')).label).toBe(HOTEL.label);
  });

  it('an unmarked account write (the older search endpoints) does not displace the phone\'s record', async () => {
    await setUserLocation(redis, CHAT, ORCHARD.lat, ORCHARD.lng, { deviceId: 'phoneA', region: 'SG', label: 'Orchard Road' });
    at(1 * H);
    await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng);
    expect((await getUserLocation(redis, CHAT, 'phoneA')).label).toBe('Orchard Road');
  });

  it('an automatic save from the phone is still refused over the chat place, and the phone still reads the place', async () => {
    await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneA', region: 'SG' });
    at(1 * H);
    await chatSetsHotel();
    at(1 * H + 5000);
    const out = await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneA', region: 'SG', label: 'Singapore', ambient: true });
    expect(out && out.kept).toBe(true);
    expect((await getUserLocation(redis, CHAT, 'phoneA')).label).toBe(HOTEL.label);
  });

  it('with no device, and for a phone with no slot, the account record is returned as before', async () => {
    await chatSetsHotel();
    expect((await getUserLocation(redis, CHAT)).label).toBe(HOTEL.label);
    expect((await getUserLocation(redis, CHAT, 'newPhone')).label).toBe(HOTEL.label);
    expect(await getUserLocation(redis, 999001, 'newPhone')).toBeNull();
  });

  it('the choice itself, called directly: only a chat-marked, newer account record displaces the slot', () => {
    const { pickSavedRecord } = lc;
    const slot = { lat: 1, lng: 103, setAt: 1000 };
    expect(pickSavedRecord(slot, { lat: 2, lng: 104, setAt: 2000, fromChat: true }).lat).toBe(2);
    expect(pickSavedRecord(slot, { lat: 2, lng: 104, setAt: 2000 }).lat).toBe(1);            // not set in chat
    expect(pickSavedRecord(slot, { lat: 2, lng: 104, setAt: 1000, fromChat: true }).lat).toBe(1);  // not newer
    expect(pickSavedRecord(slot, { lat: 2, lng: 104, setAt: 500, fromChat: true }).lat).toBe(1);   // older
    expect(pickSavedRecord(slot, { lat: 2, lng: 104, fromChat: true }).lat).toBe(1);          // no time to compare
    expect(pickSavedRecord(null, { lat: 2, lng: 104, setAt: 5 }).lat).toBe(2);                // no slot: account record
    expect(pickSavedRecord(slot, null).lat).toBe(1);
    expect(pickSavedRecord(null, null)).toBeNull();
  });
});

describe('K3 - every chat handler marks its write, and no app route does (source census of index.js)', () => {
  // Each setUserLocation( call, with its whole argument list, comments masked.
  function calls() {
    const src = code('index.js');
    const out = [];
    let i = 0;
    for (;;) {
      const s = src.indexOf('setUserLocation(', i);
      if (s < 0) break;
      let depth = 0; let e = s + 'setUserLocation'.length;
      for (; e < src.length; e++) {
        if (src[e] === '(') depth++;
        else if (src[e] === ')') { depth--; if (depth === 0) break; }
      }
      out.push(src.slice(s, e + 1));
      i = e + 1;
    }
    return out;
  }
  const isAppRoute = (c) => /deviceId|String\(userId\)|tgUserId|setOpts\)$/.test(c);

  it('the census parses the calls it expects (an empty parse is not a pass)', () => {
    const all = calls();
    expect(all.length).toBe(14);
    expect(all.filter(isAppRoute).length).toBe(6);
  });

  it('the eight chat writes pass fromChat: true', () => {
    const chat = calls().filter((c) => !isAppRoute(c));
    expect(chat.length).toBe(8);
    for (const c of chat) expect(c, `a chat write is not marked: ${c.slice(0, 90)}`).toMatch(/fromChat:\s*true/);
  });

  it('no Mini App route passes it: a pick on one phone must not reach the others', () => {
    for (const c of calls().filter(isAppRoute)) expect(c, c.slice(0, 90)).not.toMatch(/fromChat/);
  });
});

describe('K4 - the chat /cuisine link carries the place and its name; explicit arguments still win', () => {
  const { applyLaunchAnchorToParams } = lc;

  it('a locked place yields lat, lng, region and its name', async () => {
    const anchor = await resolveCuisineLaunchAnchor({ ...HOTEL, setAt: T0 - 10 * 60 * 1000 }, T0);
    expect(anchor).toMatchObject({ lat: HOTEL.lat, lng: HOTEL.lng, region: 'OTHER', label: HOTEL.label });
    const p = applyLaunchAnchorToParams(new URLSearchParams(''), anchor);
    expect(p.get('lat')).toBe(String(HOTEL.lat));
    expect(p.get('lng')).toBe(String(HOTEL.lng));
    expect(p.get('region')).toBe('OTHER');
    expect(p.get('place')).toBe(HOTEL.label);
    // The Mini App reads it back whole from the address.
    const round = new URLSearchParams(p.toString());
    expect(round.get('place')).toBe(HOTEL.label);
  });

  it('a place past its lock is not linked at all (I6 of 02-11 \'26, unchanged)', async () => {
    expect(await resolveCuisineLaunchAnchor({ ...HOTEL, setAt: T0 - 19 * H }, T0)).toBeNull();
  });

  it('an explicit @location argument wins: nothing of the saved place is added', () => {
    const explicit = new URLSearchParams('lat=1.3&lng=103.8&place=Orchard');
    const p = applyLaunchAnchorToParams(explicit, { lat: HOTEL.lat, lng: HOTEL.lng, region: 'OTHER', label: HOTEL.label });
    expect(p.get('lat')).toBe('1.3');
    expect(p.get('place')).toBe('Orchard');
    expect(p.has('region')).toBe(false);
  });

  it('a long name is cut to the 80 characters the app reads; no name, no place; no anchor, no change', () => {
    const long = 'x'.repeat(200);
    expect(applyLaunchAnchorToParams(new URLSearchParams(''), { lat: 1.5, lng: 103.6, region: 'OTHER', label: long }).get('place')).toHaveLength(80);
    const bare = applyLaunchAnchorToParams(new URLSearchParams(''), { lat: 1.5, lng: 103.6, region: null });
    expect(bare.has('place')).toBe(false);
    expect(bare.has('region')).toBe(false);
    expect(bare.get('lat')).toBe('1.5');
    expect(applyLaunchAnchorToParams(new URLSearchParams('cuisines=thai'), null).toString()).toBe('cuisines=thai');
  });

  it('index.js builds the link through that function (source pin)', () => {
    const src = code('index.js');
    expect(src).toMatch(/applyLaunchAnchorToParams\(params,\s*preResolvedAnchor\)/);
  });
});
