// __tests__/chat-place-kept-per-phone.test.js — v0.62.988.
//
// Spec: doc/Feature/2026-11-21-chat-place-kept-per-phone.spec.md, invariants L1 to L6.
//
// A fault in v0.62.987, found by the automated review on ang-kl/gia#1929 three minutes after it merged, and
// reproduced before this file was written:
//   phones A and B each have a location record; the chat sets a place; B reads it; A picks another place in an app;
//   B, WHICH PICKED NOTHING, reads its own pre-chat record again.
// v0.62.987 marked a chat write on the ACCOUNT's record, and every app write replaces that record. Its 18 tests
// covered a later pick on the SAME phone, and a pick on another phone not REACHING this one. None covered another
// phone's pick TAKING THE CHAT PLACE AWAY from this one, which is the whole of this file's first block.
//
// The rule the operator confirmed on 15-11 '26 (D2): a place set in chat is what every phone opens on next, until
// THAT phone picks another place inside an app. And D1: nothing automatic moves a place set under six hours ago.
//
// location-cache.js and user-data.js are CALLED, with the fake Redis and the clock stepped between writes.
// All coordinates are public landmarks.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createRequire } from 'module';
import { createStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const lc = require('../location-cache.js');
const { setUserLocation, getUserLocation, hashChatId } = lc;
const { hashedKeys, scanPatterns } = require('../user-data.js');

const H = 60 * 60 * 1000;
const MIN = 60 * 1000;
const T0 = Date.UTC(2026, 10, 21, 1, 0);
const CHAT = 424242;
const HOTEL = { lat: 1.5148, lng: 103.6862, label: 'Hyatt Place Johor Bahru Paradigm Mall, Johor Bahru, Johor', region: 'OTHER', country: 'MY' };
const MERLION = { lat: 1.2868, lng: 103.8545 };
const ORCHARD = { lat: 1.3040, lng: 103.8318 };
const MARINA = { lat: 1.2834, lng: 103.8607 };

let redis;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(T0);
  redis = createStub();
});
afterEach(() => { vi.useRealTimers(); });

const at = (ms) => vi.setSystemTime(T0 + ms);
const pick = (dev, p, label) => setUserLocation(redis, CHAT, p.lat, p.lng, { deviceId: dev, region: 'SG', ...(label ? { label } : {}) });
const chatSetsHotel = () => setUserLocation(redis, CHAT, HOTEL.lat, HOTEL.lng,
  { region: HOTEL.region, label: HOTEL.label, country: HOTEL.country, fromChat: true });
const labelOn = async (dev) => (await getUserLocation(redis, CHAT, dev)).label;

// Two phones, each with a record of its own, then a place set in chat ten minutes later.
async function twoPhonesThenChat() {
  await pick('phoneA', MERLION, 'Merlion (A)');
  await pick('phoneB', MERLION, 'Merlion (B)');
  at(10 * MIN);
  await chatSetsHotel();
}

describe('L1 - another phone\'s pick does not take the chat place away (the review finding on #1929)', () => {
  it('B reads the chat place, A picks in an app, B still reads the chat place', async () => {
    await twoPhonesThenChat();
    at(11 * MIN);
    expect(await labelOn('phoneB')).toBe(HOTEL.label);
    at(12 * MIN);
    await pick('phoneA', ORCHARD, 'Orchard (A picks)');
    at(13 * MIN);
    expect(await labelOn('phoneA')).toBe('Orchard (A picks)');
    expect(await labelOn('phoneB'), 'B picked nothing and lost the chat place').toBe(HOTEL.label);
  });

  it('the same when B had not opened between the chat place and A\'s pick', async () => {
    await twoPhonesThenChat();
    at(12 * MIN);
    await pick('phoneA', ORCHARD, 'Orchard (A picks)');
    at(40 * MIN);
    expect(await labelOn('phoneB')).toBe(HOTEL.label);
  });

  it('several app picks on A, named and unnamed, change nothing for B', async () => {
    await twoPhonesThenChat();
    at(12 * MIN); await pick('phoneA', ORCHARD, 'Orchard');
    at(20 * MIN); await pick('phoneA', MARINA);
    at(30 * MIN); await pick('phoneA', MERLION, 'Merlion again');
    at(31 * MIN);
    expect(await labelOn('phoneB')).toBe(HOTEL.label);
    expect(await labelOn('phoneA')).toBe('Merlion again');
  });
});

describe('L2 - a phone\'s own later pick wins, and stays that phone\'s only', () => {
  it('B picks after the chat place: B reads its pick, and A still reads the chat place', async () => {
    await twoPhonesThenChat();
    at(15 * MIN);
    await pick('phoneB', ORCHARD, 'Orchard (B picks)');
    at(16 * MIN);
    expect(await labelOn('phoneB')).toBe('Orchard (B picks)');
    expect(await labelOn('phoneA')).toBe(HOTEL.label);
  });

  it('a NEWER place set in chat wins again over that pick, on both phones', async () => {
    await twoPhonesThenChat();
    at(15 * MIN);
    await pick('phoneB', ORCHARD, 'Orchard (B picks)');
    at(30 * MIN);
    await setUserLocation(redis, CHAT, MARINA.lat, MARINA.lng, { region: 'SG', label: 'Marina Bay (chat)', fromChat: true });
    at(31 * MIN);
    expect(await labelOn('phoneB')).toBe('Marina Bay (chat)');
    expect(await labelOn('phoneA')).toBe('Marina Bay (chat)');
  });
});

describe('L3 - a phone with no record of its own gets the chat place', () => {
  it('even after another phone has picked something later', async () => {
    await twoPhonesThenChat();
    at(12 * MIN);
    await pick('phoneA', ORCHARD, 'Orchard (A picks)');
    at(13 * MIN);
    expect(await labelOn('phoneC')).toBe(HOTEL.label);
  });

  it('with no chat place at all it seeds from the account\'s record, as before (v0.61.363)', async () => {
    await pick('phoneA', ORCHARD, 'Orchard (A picks)');
    expect(await labelOn('phoneC')).toBe('Orchard (A picks)');
    expect(await getUserLocation(redis, 999001, 'phoneC')).toBeNull();
  });
});

describe('L4 - an automatic save cannot move a phone off a locked chat place', () => {
  it('after A writes an UNNAMED record, B\'s automatic save is still refused and B still reads the chat place', async () => {
    await twoPhonesThenChat();
    at(12 * MIN);
    await pick('phoneA', MARINA);                  // unnamed: the account's record is no longer a locked place
    at(13 * MIN);
    const out = await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneB', region: 'SG', label: 'Singapore', ambient: true });
    expect(out && out.kept, 'the automatic save went through').toBe(true);
    expect(out.label).toBe(HOTEL.label);
    expect(await labelOn('phoneB')).toBe(HOTEL.label);
  });

  it('a phone\'s own locked pick is protected the same way when another phone wrote last', async () => {
    await pick('phoneB', ORCHARD, 'Orchard (B picks)');
    at(5 * MIN);
    await pick('phoneA', MARINA);
    at(6 * MIN);
    const out = await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneB', region: 'SG', ambient: true });
    expect(out && out.kept).toBe(true);
    expect(await labelOn('phoneB')).toBe('Orchard (B picks)');
  });

  it('past the six-hour lock an automatic save goes through, as the 02-11 rule says', async () => {
    await twoPhonesThenChat();
    at(10 * MIN + 7 * H);
    const out = await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneB', region: 'SG', ambient: true });
    expect(out && out.kept).toBeFalsy();
    const got = await getUserLocation(redis, CHAT, 'phoneB');
    expect(got.label).toBeUndefined();
    expect(got.lat).toBeCloseTo(MERLION.lat, 4);
  });

  it('an automatic save with nothing locked anywhere still goes through', async () => {
    await pick('phoneA', MARINA);
    at(MIN);
    const out = await setUserLocation(redis, CHAT, MERLION.lat, MERLION.lng, { deviceId: 'phoneA', region: 'SG', ambient: true });
    expect(out && out.kept).toBeFalsy();
    expect((await getUserLocation(redis, CHAT, 'phoneA')).lat).toBeCloseTo(MERLION.lat, 4);
  });
});

describe('L5 - a read with no device (the bot itself) is unchanged: the account\'s last record', () => {
  it('after an app pick the bot reads that pick, not the older chat place', async () => {
    await twoPhonesThenChat();
    expect((await getUserLocation(redis, CHAT)).label).toBe(HOTEL.label);
    at(12 * MIN);
    await pick('phoneA', ORCHARD, 'Orchard (A picks)');
    expect((await getUserLocation(redis, CHAT)).label).toBe('Orchard (A picks)');
  });
});

describe('L6 - /forgetme lists every location record', () => {
  const HASH = hashChatId(CHAT);
  const glob = (p) => new RegExp('^' + p.split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$');

  it('the chat place and the per-device records are stored where the lists say', async () => {
    await twoPhonesThenChat();
    const stored = [...redis.store.keys()].filter((k) => k.startsWith('loc:'));
    expect(stored.sort()).toEqual([`loc:${HASH}`, `loc:${HASH}:chat`, `loc:${HASH}:dev:phoneA`, `loc:${HASH}:dev:phoneB`].sort());
    const exact = new Set(hashedKeys(CHAT));
    const patterns = scanPatterns(CHAT).map(glob);
    for (const k of stored) {
      expect(exact.has(k) || patterns.some((re) => re.test(k)), `not erased by /forgetme: ${k}`).toBe(true);
    }
  });

  it('the per-device pattern cannot reach another account', () => {
    const other = hashChatId(4242421);
    expect(other).not.toBe(HASH);
    const patterns = scanPatterns(CHAT).map(glob);
    for (const k of [`loc:${other}:dev:phoneA`, `loc:${other}:chat`, `loc:${other}`]) {
      expect(patterns.some((re) => re.test(k)), `another account's key matched: ${k}`).toBe(false);
      expect(hashedKeys(CHAT)).not.toContain(k);
    }
  });
});
