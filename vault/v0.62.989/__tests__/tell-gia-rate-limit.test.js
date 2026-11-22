// __tests__/tell-gia-rate-limit.test.js — v0.62.941.
//
// Spec: doc/Feature/2026-10-25-ai-switch-and-ai-route.spec.md, invariant I4.
//
// The operator chose ONE hourly counter for AI calls from both the Mini App and the
// bot chat ("Share the 60/hour cap"). Two counters would double the real cap while
// each still read as 60. So the counter lives in one module, both callers use it,
// and the key is the one the Mini App route has written since v0.58.19 — a user who
// spent 40 calls in the Mini App this hour has 20 left in chat, not 60.
import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import { readFileSync } from 'fs';
import { join } from 'path';
import { RedisStub } from './redis-stub.js';

const require = createRequire(import.meta.url);
const rl = require('../tell-gia-rate-limit.js');
const HOUR = 3_600_000;
const NOW = 1_792_900_000_000;

describe('consumeTellGiaQuota', () => {
  it('cap is 60 per user per epoch hour', () => {
    expect(rl.TELL_GIA_HOURLY_CAP).toBe(60);
  });

  it('keeps the Mini App route\'s historical key, so existing counters carry over', () => {
    expect(rl.tellGiaRateKey('123', NOW)).toBe(`tell-gia:rl:123:${Math.floor(NOW / HOUR)}`);
  });

  it('allows 60 calls, refuses the 61st, and expires the counter with the hour', async () => {
    const redis = new RedisStub();
    // Expiry is set on the FIRST call of the hour (the stub's incr rewrites the
    // entry, so it is read here rather than after the 61st call).
    const expires = [];
    const realExpire = redis.expire.bind(redis);
    redis.expire = async (k, s) => { expires.push([k, s]); return realExpire(k, s); };
    for (let i = 1; i <= 60; i += 1) {
      const r = await rl.consumeTellGiaQuota(redis, '123', { now: NOW });
      expect(r.allowed, `call ${i}`).toBe(true);
      expect(r.count).toBe(i);
    }
    const over = await rl.consumeTellGiaQuota(redis, '123', { now: NOW });
    expect(over.allowed).toBe(false);
    expect(over.count).toBe(61);
    expect(expires).toEqual([[rl.tellGiaRateKey('123', NOW), 3600]]);
  });

  it('a new hour is a fresh budget', async () => {
    const redis = new RedisStub();
    for (let i = 0; i < 61; i += 1) await rl.consumeTellGiaQuota(redis, '9', { now: NOW });
    const next = await rl.consumeTellGiaQuota(redis, '9', { now: NOW + HOUR });
    expect(next.allowed).toBe(true);
    expect(next.count).toBe(1);
  });

  it('users do not share a budget', async () => {
    const redis = new RedisStub();
    for (let i = 0; i < 61; i += 1) await rl.consumeTellGiaQuota(redis, 'a', { now: NOW });
    expect((await rl.consumeTellGiaQuota(redis, 'b', { now: NOW })).allowed).toBe(true);
  });

  it('Redis closed or throwing: allows, as the route always has (the cache + token cap still bound spend)', async () => {
    const closed = new RedisStub(); closed.isOpen = false;
    expect((await rl.consumeTellGiaQuota(closed, '1', { now: NOW })).allowed).toBe(true);
    const broken = { isOpen: true, incr: async () => { throw new Error('ETIMEDOUT'); }, expire: async () => {} };
    expect((await rl.consumeTellGiaQuota(broken, '1', { now: NOW })).allowed).toBe(true);
    expect((await rl.consumeTellGiaQuota(null, '1', { now: NOW })).allowed).toBe(true);
  });
});

describe('both callers use the one counter', () => {
  const src = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');
  it('the Mini App AI route calls consumeTellGiaQuota and no longer builds its own key', () => {
    const at = src.indexOf("app.post('/api/cuisine/nl-query'");
    const body = src.slice(at, src.indexOf("app.get('/api/oversight/stats'", at));
    expect(body).toMatch(/consumeTellGiaQuota\(/);
    expect(body).not.toMatch(/tell-gia:rl:/);
    // The 429 the Mini App already understands is kept, word for word.
    expect(body).toMatch(/Too many Tell Soleat calls this hour\. Try again next hour\./);
  });
  it('the chat question path calls consumeTellGiaQuota', () => {
    expect(src).toMatch(/consumeQuota:\s*[\s\S]{0,120}consumeTellGiaQuota\(/);
  });
  it('index.js builds the key nowhere', () => {
    expect(src).not.toMatch(/tell-gia:rl:/);
  });
});
