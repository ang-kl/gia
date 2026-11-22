// __tests__/search-conversation.test.js — v0.59.54
//
// Per-chatId Redis state for /search conversational mode.

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const sc = require('../search-conversation.js');

function makeFakeRedis() {
  const store = new Map();
  return {
    isOpen: true,
    async connect() {},
    async setEx(key, ttl, val) { store.set(key, { val, ttl }); },
    async get(key) { return store.get(key)?.val || null; },
    async del(key) { store.delete(key); },
    _store: store
  };
}

describe('isOtherSlashCommand', () => {
  it('returns true for any slash command except /s and /search', () => {
    expect(sc.isOtherSlashCommand('/cuisine')).toBe(true);
    expect(sc.isOtherSlashCommand('/hidden marina bay')).toBe(true);
    expect(sc.isOtherSlashCommand('/clip')).toBe(true);
    expect(sc.isOtherSlashCommand('/forgetme')).toBe(true);
  });
  it('returns false for /s and /search continuations', () => {
    expect(sc.isOtherSlashCommand('/s')).toBe(false);
    expect(sc.isOtherSlashCommand('/search')).toBe(false);
    expect(sc.isOtherSlashCommand('/s pad thai')).toBe(false);
    expect(sc.isOtherSlashCommand('/search goulash with dumpling')).toBe(false);
    expect(sc.isOtherSlashCommand('/s e')).toBe(false);
    expect(sc.isOtherSlashCommand('/s end')).toBe(false);
  });
  it('returns false for non-slash text', () => {
    expect(sc.isOtherSlashCommand('hello there')).toBe(false);
    expect(sc.isOtherSlashCommand('')).toBe(false);
  });
  it('handles bot-username suffix /s@soleat_bot', () => {
    expect(sc.isOtherSlashCommand('/s@soleat_bot pad thai')).toBe(false);
    expect(sc.isOtherSlashCommand('/cuisine@soleat_bot')).toBe(true);
  });
});

describe('isEndSignal', () => {
  it('detects /s e and /s end', () => {
    expect(sc.isEndSignal('/s e')).toBe(true);
    expect(sc.isEndSignal('/s end')).toBe(true);
    expect(sc.isEndSignal('/search end')).toBe(true);
    expect(sc.isEndSignal('/search stop')).toBe(true);
    expect(sc.isEndSignal('/s done')).toBe(true);
  });
  it('returns false for other inputs', () => {
    expect(sc.isEndSignal('/s pad thai')).toBe(false);
    expect(sc.isEndSignal('/s')).toBe(false);
    expect(sc.isEndSignal('end')).toBe(false);
    expect(sc.isEndSignal('hello')).toBe(false);
  });
  it('accepts French end words', () => {
    expect(sc.isEndSignal('/s fini')).toBe(true);
    expect(sc.isEndSignal('/s arrêter')).toBe(true);
    expect(sc.isEndSignal('/s terminer')).toBe(true);
  });
});

describe('startConversation + getConversation', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });
  it('persists a fresh state at clip:<chatId>', async () => {
    await sc.startConversation(redis, '12345');
    const conv = await sc.getConversation(redis, '12345');
    expect(conv).not.toBeNull();
    expect(conv.rt).toBe(0);
    expect(conv.history).toEqual([]);
  });
  it('returns null for an empty chatId', async () => {
    const conv = await sc.getConversation(redis, 'never');
    expect(conv).toBeNull();
  });
});

describe('appendExchange', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });
  it('increments rt and appends both user and bot entries', async () => {
    await sc.startConversation(redis, 'c');
    const conv = await sc.appendExchange(redis, 'c', 'goulash with dumpling', 'Found 3 European venues...', 'dish');
    expect(conv.rt).toBe(1);
    expect(conv.history).toHaveLength(2);
    expect(conv.history[0]).toEqual({ role: 'user', text: 'goulash with dumpling' });
    expect(conv.history[1].role).toBe('bot');
    expect(conv.intent).toBe('dish');
  });
  it('trims history to last 16 entries (8 exchanges)', async () => {
    await sc.startConversation(redis, 'c');
    for (let i = 0; i < 12; i++) {
      await sc.appendExchange(redis, 'c', `user msg ${i}`, `bot reply ${i}`, 'dish');
    }
    const conv = await sc.getConversation(redis, 'c');
    expect(conv.history).toHaveLength(16);
    expect(conv.rt).toBe(12);
    expect(conv.history[0].text).toBe('user msg 4');
  });
});

describe('endConversation', () => {
  it('deletes the per-chatId state', async () => {
    const redis = makeFakeRedis();
    await sc.startConversation(redis, 'c');
    expect(redis._store.has('search-conv:c')).toBe(true);
    await sc.endConversation(redis, 'c');
    expect(redis._store.has('search-conv:c')).toBe(false);
  });
});

describe('shouldNudgeEnd', () => {
  it('fires every 6 round-trips', () => {
    expect(sc.shouldNudgeEnd({ rt: 6 })).toBe(true);
    expect(sc.shouldNudgeEnd({ rt: 12 })).toBe(true);
    expect(sc.shouldNudgeEnd({ rt: 18 })).toBe(true);
  });
  it('does not fire on intermediate rounds', () => {
    expect(sc.shouldNudgeEnd({ rt: 1 })).toBe(false);
    expect(sc.shouldNudgeEnd({ rt: 5 })).toBe(false);
    expect(sc.shouldNudgeEnd({ rt: 11 })).toBe(false);
  });
  it('does not fire on rt=0', () => {
    expect(sc.shouldNudgeEnd({ rt: 0 })).toBe(false);
  });
  it('handles malformed conv', () => {
    expect(sc.shouldNudgeEnd(null)).toBe(false);
    expect(sc.shouldNudgeEnd({})).toBe(false);
    expect(sc.shouldNudgeEnd({ rt: NaN })).toBe(false);
  });
});

describe('endNudge', () => {
  it('returns the EN reminder by default', () => {
    expect(sc.endNudge()).toContain('/s end');
  });
  it('returns the FR reminder when lang=fr', () => {
    expect(sc.endNudge('fr')).toContain('/s end');
    expect(sc.endNudge('fr')).toMatch(/Astuce|terminer/);
  });
});

describe('module surface', () => {
  it('exports KEY_PREFIX = "search-conv:"', () => {
    expect(sc.KEY_PREFIX).toBe('search-conv:');
  });
  it('exports REMINDER_EVERY_N_RT = 6', () => {
    expect(sc.REMINDER_EVERY_N_RT).toBe(6);
  });
});
