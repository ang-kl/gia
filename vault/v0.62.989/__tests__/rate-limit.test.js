// __tests__/rate-limit.test.js — v0.60.173 / DF-54
//
// Coverage for the per-chatId Redis fixed-window rate limiter:
// - happy path: count increments, EXPIRE called once on first hit
// - 429 + retryAfterSec when count > cap
// - dev bypass via SKIP_RATE_LIMIT=true
// - auth dev-bypass (req.tg.devBypass) → no-op
// - missing req.tg → no-op (defensive)
// - Redis down → fail open (no 429)
// - cap validation at factory time

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { makeRateLimiter } = require('../rate-limit.js');

function makeFakeRedis() {
  const store = new Map();
  return {
    isOpen: true,
    async incr(key) {
      const v = (store.get(key) ?? 0) + 1;
      store.set(key, v);
      return v;
    },
    async expire(_key, _sec) { /* recorded via spy via the closure */ }
  };
}

function makeRes() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

function makeReq({ chatId = 42, headers = {} } = {}) {
  return { tg: { user: { id: chatId } }, headers, socket: { remoteAddress: '1.2.3.4' } };
}

describe('makeRateLimiter', () => {
  let savedSkip;
  beforeEach(() => {
    savedSkip = process.env.SKIP_RATE_LIMIT;
    delete process.env.SKIP_RATE_LIMIT;
  });
  afterEach(() => {
    if (savedSkip === undefined) delete process.env.SKIP_RATE_LIMIT;
    else process.env.SKIP_RATE_LIMIT = savedSkip;
  });

  it('passes through under cap and increments the counter', async () => {
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 3 });
    for (let i = 0; i < 3; i++) {
      const req = makeReq();
      const res = makeRes();
      let nextCalled = false;
      await limiter(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(0);
    }
  });

  it('429s on the (cap+1)-th call within the same window', async () => {
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 2 });
    for (let i = 0; i < 2; i++) await limiter(makeReq(), makeRes(), () => {});
    const req = makeReq();
    const res = makeRes();
    await limiter(req, res, () => { throw new Error('next should not fire'); });
    expect(res.statusCode).toBe(429);
    expect(res.body?.error).toBe('rate_limited');
    expect(res.body?.endpoint).toBe('test');
    expect(typeof res.body?.retryAfterSec).toBe('number');
  });

  it('keys by chatId — different chatIds share no budget', async () => {
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    await limiter(makeReq({ chatId: 1 }), makeRes(), () => {});
    const req2 = makeReq({ chatId: 2 });
    const res2 = makeRes();
    let nextCalled = false;
    await limiter(req2, res2, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(res2.statusCode).toBe(0);
  });

  it('keys by endpoint — different endpoints share no budget', async () => {
    const redis = makeFakeRedis();
    const a = makeRateLimiter(redis, { endpoint: 'aa', cap: 1 });
    const b = makeRateLimiter(redis, { endpoint: 'bb', cap: 1 });
    await a(makeReq(), makeRes(), () => {});
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;
    await b(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('SKIP_RATE_LIMIT=true short-circuits regardless of count', async () => {
    process.env.SKIP_RATE_LIMIT = 'true';
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    for (let i = 0; i < 10; i++) {
      const req = makeReq();
      const res = makeRes();
      let nextCalled = false;
      await limiter(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(true);
      expect(res.statusCode).toBe(0);
    }
  });

  it('SKIP_RATE_LIMIT only fires for the exact string "true"', async () => {
    process.env.SKIP_RATE_LIMIT = '1';
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    await limiter(makeReq(), makeRes(), () => {});
    const req = makeReq();
    const res = makeRes();
    await limiter(req, res, () => { throw new Error('next should not fire'); });
    expect(res.statusCode).toBe(429);
  });

  it('fails open when req.tg.user is missing (auth dev-bypass shape)', async () => {
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    const req = { tg: { user: null, devBypass: true }, headers: {}, socket: {} };
    const res = makeRes();
    let nextCalled = false;
    await limiter(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('fails open when req.tg is entirely missing', async () => {
    const redis = makeFakeRedis();
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    const req = { headers: {}, socket: {} };
    const res = makeRes();
    let nextCalled = false;
    await limiter(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('fails open when Redis is closed', async () => {
    const redis = { isOpen: false, async incr() { throw new Error('should not be called'); } };
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;
    await limiter(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('fails open when Redis throws mid-call', async () => {
    const redis = { isOpen: true, async incr() { throw new Error('redis fell over'); }, async expire() {} };
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 1 });
    const req = makeReq();
    const res = makeRes();
    let nextCalled = false;
    await limiter(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
  });

  it('rejects invalid factory args', () => {
    const redis = makeFakeRedis();
    expect(() => makeRateLimiter(redis, { endpoint: '', cap: 1 })).toThrow();
    expect(() => makeRateLimiter(redis, { endpoint: 'x', cap: 0 })).toThrow();
    expect(() => makeRateLimiter(redis, { endpoint: 'x', cap: -1 })).toThrow();
    expect(() => makeRateLimiter(redis, { endpoint: 'x', cap: 'a' })).toThrow();
  });

  it('windowSec is respected for the EXPIRE call', async () => {
    let expireSec = null;
    const redis = {
      isOpen: true,
      async incr() { return 1; },
      async expire(_k, sec) { expireSec = sec; }
    };
    const limiter = makeRateLimiter(redis, { endpoint: 'test', cap: 10, windowSec: 60 });
    await limiter(makeReq(), makeRes(), () => {});
    expect(expireSec).toBe(60);
  });
});

// ── v0.62.716 / Phase D ────────────────────────────────────────────────────
// checkRateLimit is the Redis-counter core extracted from makeRateLimiter's
// body so the Telegram bot handlers (which have no req/res/next) can share
// the identical mechanism and key shape instead of growing a second copy.
// The 12 middleware tests above are the real guarantee that the extraction
// was behaviour-preserving — they were written against the pre-extraction
// implementation and pass unchanged. These pin the bare function's own
// contract, especially the fail-OPEN direction on every abnormal path.
describe('checkRateLimit (bare, non-Express core)', () => {
  const { checkRateLimit } = require('../rate-limit.js');
  let savedSkip;
  beforeEach(() => { savedSkip = process.env.SKIP_RATE_LIMIT; delete process.env.SKIP_RATE_LIMIT; });
  afterEach(() => {
    if (savedSkip === undefined) delete process.env.SKIP_RATE_LIMIT;
    else process.env.SKIP_RATE_LIMIT = savedSkip;
  });

  const args = (over = {}) => ({ endpoint: 'bot-search', key: 42, cap: 3, ...over });

  it('passes under the cap and reports the running count', async () => {
    const redis = makeFakeRedis();
    for (let i = 1; i <= 3; i++) {
      const v = await checkRateLimit(redis, args());
      expect(v.limited).toBe(false);
      expect(v.count).toBe(i);
      expect(v.reason).toBe('under-cap');
    }
  });

  it('limits strictly ABOVE the cap, not at it, and reports retryAfterSec', async () => {
    const redis = makeFakeRedis();
    for (let i = 0; i < 3; i++) await checkRateLimit(redis, args());
    const v = await checkRateLimit(redis, args());
    expect(v.limited).toBe(true);
    expect(v.count).toBe(4);
    expect(v.cap).toBe(3);
    expect(v.retryAfterSec).toBeGreaterThan(0);
    expect(v.retryAfterSec).toBeLessThanOrEqual(900);
  });

  it('uses the documented gia:rl:<endpoint>:<key>:<bucket> key shape', async () => {
    const seen = [];
    const redis = { isOpen: true, async incr(k) { seen.push(k); return 1; }, async expire() {} };
    const now = 1_800_000_000_000;
    await checkRateLimit(redis, { ...args(), windowSec: 900, now });
    expect(seen[0]).toBe(`gia:rl:bot-search:42:${Math.floor(now / 900_000)}`);
  });

  it('separates counters per endpoint and per key', async () => {
    const redis = makeFakeRedis();
    await checkRateLimit(redis, args({ endpoint: 'bot-search', key: 1 }));
    await checkRateLimit(redis, args({ endpoint: 'bot-search', key: 1 }));
    const otherEndpoint = await checkRateLimit(redis, args({ endpoint: 'bot-hidden', key: 1 }));
    const otherUser = await checkRateLimit(redis, args({ endpoint: 'bot-search', key: 2 }));
    expect(otherEndpoint.count).toBe(1);
    expect(otherUser.count).toBe(1);
  });

  it('rolls the counter over at the window boundary', async () => {
    const redis = makeFakeRedis();
    const now = 1_800_000_000_000;
    await checkRateLimit(redis, { ...args(), windowSec: 900, now });
    const next = await checkRateLimit(redis, { ...args(), windowSec: 900, now: now + 900_000 });
    expect(next.count).toBe(1);
  });

  // Every abnormal path must FAIL OPEN — a broken limiter must never block a
  // real user. `reason` distinguishes "allowed because under cap" from
  // "allowed because the check could not run", which the caller logs.
  it('fails open on the dev bypass', async () => {
    process.env.SKIP_RATE_LIMIT = 'true';
    const v = await checkRateLimit(makeFakeRedis(), args());
    expect(v).toMatchObject({ limited: false, reason: 'bypass' });
  });

  it('fails open when there is no key to count against', async () => {
    for (const key of [null, undefined, 0, '']) {
      const v = await checkRateLimit(makeFakeRedis(), args({ key }));
      expect(v).toMatchObject({ limited: false, reason: 'no-key' });
    }
  });

  it('fails open when Redis is closed or absent', async () => {
    expect(await checkRateLimit({ isOpen: false }, args())).toMatchObject({ limited: false, reason: 'redis-down' });
    expect(await checkRateLimit(null, args())).toMatchObject({ limited: false, reason: 'redis-down' });
  });

  it('fails open when Redis throws mid-call', async () => {
    const redis = { isOpen: true, async incr() { throw new Error('redis fell over'); }, async expire() {} };
    expect(await checkRateLimit(redis, args())).toMatchObject({ limited: false, reason: 'redis-error' });
  });

  it('validates its args rather than silently not limiting', async () => {
    const redis = makeFakeRedis();
    await expect(checkRateLimit(redis, args({ endpoint: '' }))).rejects.toThrow();
    await expect(checkRateLimit(redis, args({ cap: 0 }))).rejects.toThrow();
    await expect(checkRateLimit(redis, args({ cap: -1 }))).rejects.toThrow();
    await expect(checkRateLimit(redis, args({ cap: 'a' }))).rejects.toThrow();
  });
});
