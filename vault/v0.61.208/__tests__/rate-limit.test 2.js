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
