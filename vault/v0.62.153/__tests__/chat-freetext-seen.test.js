// __tests__/chat-freetext-seen.test.js — v0.61.171

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const {
  TTL_S,
  SEEN_CAP,
  hashCriteria,
  getSeenSet,
  getSeenSize,
  addSeen,
  clearSeen,
  setQuery,
  getQuery,
  pickUnseen
} = require('../chat-freetext-seen');

function makeFakeRedis({ isOpen = true } = {}) {
  const store = new Map();
  const sets = new Map();
  const ttls = new Map();
  return {
    isOpen, store, sets, ttls,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async setEx(k, ttl, v) { store.set(k, v); ttls.set(k, ttl); return 'OK'; },
    async del(k) { store.delete(k); sets.delete(k); ttls.delete(k); return 1; },
    async sMembers(k) { return Array.from(sets.get(k) || []); },
    async sCard(k) { return (sets.get(k) || new Set()).size; },
    async sAdd(k, members) {
      if (!sets.has(k)) sets.set(k, new Set());
      const arr = Array.isArray(members) ? members : [members];
      for (const m of arr) sets.get(k).add(m);
      return arr.length;
    },
    async expire(k, ttl) { ttls.set(k, ttl); return 1; }
  };
}

describe('constants', () => {
  it('TTL_S = 30 minutes', () => { expect(TTL_S).toBe(30 * 60); });
  it('SEEN_CAP = 80', () => { expect(SEEN_CAP).toBe(80); });
});

describe('hashCriteria', () => {
  it('is deterministic for the same input', () => {
    expect(hashCriteria('123', 'italian food')).toBe(hashCriteria('123', 'italian food'));
  });
  it('is case + whitespace insensitive', () => {
    expect(hashCriteria('1', 'Italian Food')).toBe(hashCriteria('1', '  italian   food  '));
  });
  it('differs by chatId', () => {
    expect(hashCriteria('1', 'x')).not.toBe(hashCriteria('2', 'x'));
  });
  it('differs by text', () => {
    expect(hashCriteria('1', 'italian')).not.toBe(hashCriteria('1', 'japanese'));
  });
  it('returns 10-char hex string', () => {
    expect(hashCriteria('1', 'x')).toMatch(/^[0-9a-f]{10}$/);
  });
});

describe('getSeenSet + addSeen round-trip', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('empty initially', async () => {
    expect((await getSeenSet(redis, 'c', 'h')).size).toBe(0);
    expect(await getSeenSize(redis, 'c', 'h')).toBe(0);
  });

  it('addSeen + getSeenSet round-trip', async () => {
    await addSeen(redis, 'c', 'h', ['p1', 'p2', 'p3']);
    const s = await getSeenSet(redis, 'c', 'h');
    expect(s.has('p1')).toBe(true);
    expect(s.has('p2')).toBe(true);
    expect(s.has('p3')).toBe(true);
    expect(await getSeenSize(redis, 'c', 'h')).toBe(3);
  });

  it('ignores non-string / empty placeIds', async () => {
    await addSeen(redis, 'c', 'h', ['p1', '', null, 'p2', 42]);
    expect(await getSeenSize(redis, 'c', 'h')).toBe(2);
  });

  it('sets the TTL on add', async () => {
    await addSeen(redis, 'c', 'h', ['p1']);
    const k = require('crypto').createHash('sha256').update('c|h').digest('hex').slice(0, 16);
    // Just verify some TTL was set (the fake stores it).
    const ttl = [...redis.ttls.values()][0];
    expect(ttl).toBe(TTL_S);
  });

  it('clearSeen empties the set', async () => {
    await addSeen(redis, 'c', 'h', ['p1', 'p2']);
    await clearSeen(redis, 'c', 'h');
    expect(await getSeenSize(redis, 'c', 'h')).toBe(0);
  });

  it('handles closed redis + missing args defensively', async () => {
    const closed = makeFakeRedis({ isOpen: false });
    await addSeen(closed, 'c', 'h', ['p1']);
    expect((await getSeenSet(closed, 'c', 'h')).size).toBe(0);
    await addSeen(redis, 'c', 'h', null);     // non-array
    await addSeen(redis, 'c', 'h', []);       // empty
    expect(await getSeenSize(redis, 'c', 'h')).toBe(0);
  });
});

describe('setQuery + getQuery', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  it('stores + reads back the verbatim query text', async () => {
    await setQuery(redis, 'abc', 'italian food near me');
    expect(await getQuery(redis, 'abc')).toBe('italian food near me');
  });

  it('returns null for missing / expired hashes', async () => {
    expect(await getQuery(redis, 'missing')).toBeNull();
  });

  it('rejects empty / non-string text', async () => {
    await setQuery(redis, 'x', '');
    await setQuery(redis, 'x', '   ');
    await setQuery(redis, 'x', null);
    expect(await getQuery(redis, 'x')).toBeNull();
  });
});

describe('pickUnseen', () => {
  let redis;
  beforeEach(() => { redis = makeFakeRedis(); });

  function v(placeId) { return { placeId, name: placeId }; }

  it('returns the first `take` venues when nothing is seen', async () => {
    const venues = [v('a'), v('b'), v('c'), v('d'), v('e')];
    const out = await pickUnseen(redis, 'c', 'h', venues, 3);
    expect(out.topUnseen.map((x) => x.placeId)).toEqual(['a', 'b', 'c']);
    expect(out.exhausted).toBe(false);
  });

  it('skips already-seen placeIds', async () => {
    await addSeen(redis, 'c', 'h', ['a', 'c']);
    const venues = [v('a'), v('b'), v('c'), v('d'), v('e')];
    const out = await pickUnseen(redis, 'c', 'h', venues, 3);
    expect(out.topUnseen.map((x) => x.placeId)).toEqual(['b', 'd', 'e']);
    // 3 unseen returned; 0 remaining → exhausted=true (last batch)
    expect(out.exhausted).toBe(true);
  });

  it('exhausted=true when unseen pool ≤ take', async () => {
    const venues = [v('a'), v('b')];
    const out = await pickUnseen(redis, 'c', 'h', venues, 8);
    expect(out.topUnseen).toHaveLength(2);
    expect(out.exhausted).toBe(true);
  });

  it('exhausted=true when seen count reaches SEEN_CAP', async () => {
    // Seed 75 already seen; next tap returns 5 → 80 total → exhausted
    const preSeen = Array.from({ length: 75 }, (_, i) => `p${i}`);
    await addSeen(redis, 'c', 'h', preSeen);
    const fresh = Array.from({ length: 20 }, (_, i) => v(`q${i}`));
    const out = await pickUnseen(redis, 'c', 'h', fresh, 8);
    expect(out.exhausted).toBe(true);   // 75 + 8 ≥ 80 (SEEN_CAP)
  });

  it('does not write the seen-set itself (caller does that)', async () => {
    const venues = [v('a'), v('b'), v('c')];
    await pickUnseen(redis, 'c', 'h', venues, 8);
    expect(await getSeenSize(redis, 'c', 'h')).toBe(0);    // unchanged
  });
});
