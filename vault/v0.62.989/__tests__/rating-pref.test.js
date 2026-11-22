// __tests__/rating-pref.test.js — v0.61.426
//
// Unit tests for the per-chat minimum-rating preference shared by the
// Cuisine TMA rating pill and the /rating (/ra) command. Covers value
// normalisation, the command parser (0 = any, 1.0–5.0 = floor, else
// invalid), the applyRatingFloor opts mapping, the Redis get/set
// roundtrip (default + per-device), and the bilingual messages.

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_RATING,
  MIN_FLOOR,
  MAX_FLOOR,
  normalizeRatingPref,
  parseRatingCommand,
  ratingPrefToFloorOpts,
  describeRatingPref,
  getUserRatingPref,
  setUserRatingPref,
  ratingStatusMessage,
  ratingSavedMessage,
  ratingInvalidMessage,
} from '../rating-pref.js';

function fakeRedis() {
  const store = new Map();
  return {
    isOpen: true,
    async connect() {},
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async setEx(k, _ttl, v) { store.set(k, v); },
    _store: store,
  };
}

describe('rating-pref — constants', () => {
  it('default is the guarded 3.7 floor; range 1.0–5.0', () => {
    expect(DEFAULT_RATING).toBe('3.7');
    expect(MIN_FLOOR).toBe(1.0);
    expect(MAX_FLOOR).toBe(5.0);
  });
});

describe('normalizeRatingPref', () => {
  it("0 / off / any → 'any'", () => {
    expect(normalizeRatingPref('0')).toBe('any');
    expect(normalizeRatingPref('0.0')).toBe('any');
    expect(normalizeRatingPref('any')).toBe('any');
    expect(normalizeRatingPref('off')).toBe('any');
  });
  it("unrated aliases → 'unrated'", () => {
    expect(normalizeRatingPref('unrated')).toBe('unrated');
    expect(normalizeRatingPref('none')).toBe('unrated');
    expect(normalizeRatingPref('no-rating')).toBe('unrated');
  });
  it('a number in 1.0–5.0 → 1-decimal string', () => {
    expect(normalizeRatingPref('3.7')).toBe('3.7');
    expect(normalizeRatingPref('4')).toBe('4.0');
    expect(normalizeRatingPref('5.0')).toBe('5.0');
    expect(normalizeRatingPref('1')).toBe('1.0');
    expect(normalizeRatingPref('4.25')).toBe('4.3');   // rounds to 1 decimal
  });
  it('out-of-range / junk → null', () => {
    expect(normalizeRatingPref('0.5')).toBe(null);     // below 1.0 and not 0
    expect(normalizeRatingPref('6')).toBe(null);
    expect(normalizeRatingPref('5.1')).toBe(null);
    expect(normalizeRatingPref('abc')).toBe(null);
    expect(normalizeRatingPref('')).toBe(null);
    expect(normalizeRatingPref(null)).toBe(null);
    expect(normalizeRatingPref(undefined)).toBe(null);
  });
});

describe('parseRatingCommand', () => {
  it("0 → any; number → floor; strips a leading ≥", () => {
    expect(parseRatingCommand('0')).toBe('any');
    expect(parseRatingCommand('any')).toBe('any');
    expect(parseRatingCommand('3.7')).toBe('3.7');
    expect(parseRatingCommand('≥4.2')).toBe('4.2');
    expect(parseRatingCommand('>= 4.5')).toBe('4.5');
  });
  it('invalid → null (caller suggests 3.7)', () => {
    expect(parseRatingCommand('nope')).toBe(null);
    expect(parseRatingCommand('9')).toBe(null);
    expect(parseRatingCommand('')).toBe(null);
    expect(parseRatingCommand(null)).toBe(null);
  });
});

describe('ratingPrefToFloorOpts', () => {
  it('maps tokens to applyRatingFloor opts', () => {
    expect(ratingPrefToFloorOpts('unrated')).toEqual({ mode: 'unrated' });
    expect(ratingPrefToFloorOpts('any')).toEqual({ mode: 'off' });
    expect(ratingPrefToFloorOpts('4.5')).toEqual({ mode: 'floor', floor: 4.5 });
  });
  it('null / invalid falls back to the guarded default floor', () => {
    expect(ratingPrefToFloorOpts(null)).toEqual({ mode: 'floor', floor: 3.7 });
    expect(ratingPrefToFloorOpts('junk')).toEqual({ mode: 'floor', floor: 3.7 });
  });
});

describe('describeRatingPref', () => {
  it('renders a short log label', () => {
    expect(describeRatingPref('unrated')).toBe('new-or-unrated');
    expect(describeRatingPref('any')).toBe('any (off)');
    expect(describeRatingPref('4.0')).toBe('≥4.0');
    expect(describeRatingPref(null)).toBe('≥3.7');
  });
});

describe('getUserRatingPref / setUserRatingPref', () => {
  it('returns the default when nothing is stored', async () => {
    const redis = fakeRedis();
    expect(await getUserRatingPref(redis, '123')).toBe('3.7');
  });
  it('set then get roundtrips the value', async () => {
    const redis = fakeRedis();
    expect(await setUserRatingPref(redis, '123', '4.5')).toBe(true);
    expect(await getUserRatingPref(redis, '123')).toBe('4.5');
    expect(redis._store.get('rating-pref:123')).toBe('4.5');
  });
  it("normalises on write (0 → 'any', number → 1 decimal)", async () => {
    const redis = fakeRedis();
    await setUserRatingPref(redis, '123', '0');
    expect(await getUserRatingPref(redis, '123')).toBe('any');
    await setUserRatingPref(redis, '123', '4');
    expect(await getUserRatingPref(redis, '123')).toBe('4.0');
  });
  it('rejects an invalid value (no write)', async () => {
    const redis = fakeRedis();
    expect(await setUserRatingPref(redis, '123', 'banana')).toBe(false);
    expect(redis._store.has('rating-pref:123')).toBe(false);
  });
  it('v0.61.436 — NO per-device layer: one chat-level key serves every surface', async () => {
    const redis = fakeRedis();
    // A TMA-style save followed by a chat-style /rating save: the LATEST
    // write wins for every reader (code review: the old device key
    // permanently shadowed later chat-side /rating changes).
    await setUserRatingPref(redis, '123', '4.8');
    await setUserRatingPref(redis, '123', '3.7');
    expect(await getUserRatingPref(redis, '123')).toBe('3.7');
    expect(redis._store.has('rating-pref:123:dev:devA')).toBe(false); // no dev keys written
  });
  it('no redis / no chatId → default (unset is authoritative)', async () => {
    expect(await getUserRatingPref(null, '123')).toBe('3.7');
    expect(await getUserRatingPref(fakeRedis(), null)).toBe('3.7');
    expect(await setUserRatingPref(null, '123', '4.0')).toBe(false);
  });
  it('v0.61.436 — Redis OPERATION errors propagate from getUserRatingPref', async () => {
    const broken = {
      isOpen: true,
      async connect() {},
      async get() { throw new Error('redis down'); },
      async setEx() { throw new Error('redis down'); },
    };
    await expect(getUserRatingPref(broken, '123')).rejects.toThrow('redis down');
    // set still swallows (returns false) — the POST endpoint 503s on false.
    expect(await setUserRatingPref(broken, '123', '4.0')).toBe(false);
  });
});

describe('bilingual messages', () => {
  it('status message reflects the current value', () => {
    expect(ratingStatusMessage('4.5', 'en')).toContain('≥ 4.5');
    expect(ratingStatusMessage('any', 'en')).toContain('any rating');
    expect(ratingStatusMessage('unrated', 'en')).toContain('unrated');
    expect(ratingStatusMessage('4.5', 'fr')).toContain('≥ 4.5');
  });
  it('saved + invalid messages are non-empty strings', () => {
    expect(typeof ratingSavedMessage('3.7', 'en')).toBe('string');
    expect(ratingSavedMessage('3.7', 'en').length).toBeGreaterThan(0);
    expect(ratingInvalidMessage('en')).toContain('3.7');
    expect(ratingInvalidMessage('fr')).toContain('3.7');
  });
});
