// __tests__/user-data.test.js — v0.57.25

import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const ud = require('../user-data.js');
const { hashChatId } = require('../location-cache.js');

// Minimal in-memory Redis mock that supports the surface
// user-data.js touches: get, exists, del (single + array),
// scanIterator, expire, isOpen.
function mockRedis(initial = {}) {
  const store = new Map(Object.entries(initial));
  const ttls = new Map();
  return {
    isOpen: true,
    async connect() {},
    async exists(k) { return store.has(k) ? 1 : 0; },
    async del(keys) {
      const arr = Array.isArray(keys) ? keys : [keys];
      let n = 0;
      for (const k of arr) {
        if (store.delete(k)) n += 1;
        ttls.delete(k);
      }
      return n;
    },
    async expire(k, ttl) {
      if (store.has(k)) { ttls.set(k, ttl); return 1; }
      return 0;
    },
    scanIterator({ MATCH }) {
      const keys = [...store.keys()].filter((k) => {
        const re = new RegExp('^' + MATCH.replace(/\*/g, '.*') + '$');
        return re.test(k);
      });
      return (async function* () { for (const k of keys) yield k; })();
    },
    _store: store,
    _ttls: ttls
  };
}

const CHAT = 12345678;
const HASHED = hashChatId(CHAT);

describe('plainKeys / hashedKeys', () => {
  it('plain keys use raw chatId', () => {
    const keys = ud.plainKeys(CHAT);
    expect(keys).toContain(`buddy-optin:${CHAT}`);
    expect(keys).toContain(`buddy-blocks:${CHAT}`);
    expect(keys).toContain(`recent-picks:${CHAT}`);
  });

  it('hashed keys use hashChatId(chatId)', () => {
    const keys = ud.hashedKeys(CHAT);
    expect(keys).toContain(`loc:${HASHED}`);
    expect(keys).toContain(`loc:pending:${HASHED}`);
    expect(keys).toContain(`proc:${HASHED}`);
  });
});

describe('forgetUserData', () => {
  let r;
  beforeEach(() => {
    r = mockRedis({
      [`loc:${HASHED}`]: '{"lat":1.3,"lng":103.8,"setAt":12345}',
      [`buddy-optin:${CHAT}`]: '1',
      [`buddy-blocks:${CHAT}`]: 'set-data',
      [`recent-picks:${CHAT}`]: 'list-data',
      [`buddy-day:${CHAT}:20260504`]: '3',
      [`buddy-day:${CHAT}:20260503`]: '2',
      // Some unrelated user's data — must NOT be touched.
      [`buddy-optin:99999999`]: '1',
      [`loc:${hashChatId(99999999)}`]: '{}'
    });
  });

  it('wipes all chatId-keyed entries', async () => {
    const { deleted, keys } = await ud.forgetUserData(r, CHAT);
    // 4 plain + 1 hashed loc + 2 daily counters = 6 (the seed has
    // no `loc:pending` or `proc` for CHAT — those would push it
    // higher in real usage).
    expect(deleted).toBe(6);
    expect(keys).toContain(`loc:${HASHED}`);
    expect(keys).toContain(`buddy-optin:${CHAT}`);
    expect(keys).toContain(`buddy-blocks:${CHAT}`);
    expect(keys).toContain(`recent-picks:${CHAT}`);
    // SCAN'd daily counters
    expect(keys.some((k) => k.startsWith(`buddy-day:${CHAT}:`))).toBe(true);
  });

  it('does NOT touch other users\' data', async () => {
    await ud.forgetUserData(r, CHAT);
    expect(r._store.has(`buddy-optin:99999999`)).toBe(true);
    expect(r._store.has(`loc:${hashChatId(99999999)}`)).toBe(true);
  });

  it('returns deleted: 0 for an already-empty chat (idempotent)', async () => {
    const { deleted, keys } = await ud.forgetUserData(r, 77777777);
    expect(deleted).toBe(0);
    expect(keys).toEqual([]);
  });

  it('handles a fully-populated chat then a re-run cleanly', async () => {
    const first = await ud.forgetUserData(r, CHAT);
    expect(first.deleted).toBeGreaterThan(0);
    const second = await ud.forgetUserData(r, CHAT);
    expect(second.deleted).toBe(0);
  });

  it('skips when chatId is null/undefined', async () => {
    const a = await ud.forgetUserData(r, null);
    const b = await ud.forgetUserData(r, undefined);
    expect(a.deleted).toBe(0);
    expect(b.deleted).toBe(0);
  });
});

describe('touchActivity', () => {
  it('refreshes TTL on existing buddy-blocks key', async () => {
    const r = mockRedis({ [`buddy-blocks:${CHAT}`]: 'set' });
    await ud.touchActivity(r, CHAT);
    expect(r._ttls.get(`buddy-blocks:${CHAT}`)).toBe(ud.ACTIVITY_TTL_S);
  });

  it('is a no-op when buddy-blocks does not exist', async () => {
    const r = mockRedis({});
    await ud.touchActivity(r, CHAT);
    expect(r._ttls.size).toBe(0);
  });

  it('TTL is exactly 90 days', () => {
    expect(ud.ACTIVITY_TTL_S).toBe(90 * 24 * 60 * 60);
  });

  it('handles missing chatId gracefully', async () => {
    const r = mockRedis({});
    await expect(ud.touchActivity(r, null)).resolves.toBeUndefined();
  });
});
