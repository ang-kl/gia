// __tests__/twa-auth.test.js — v0.60.167
//
// Telegram WebApp initData verification + middleware coverage for the
// new /api/cuisine/* chokepoint. Pins the verifyInitData crypto path
// (happy / tampered / expired / missing-hash) and the two middlewares
// (header-only requireInitData and the new
// requireInitDataFromBodyOrHeader with body / header / dev-bypass).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { verifyInitData, requireInitData, requireInitDataFromBodyOrHeader } = require('../twa-auth.js');

const BOT_TOKEN = '123456789:ABCDEF_test_bot_token_for_unit_tests';

// Build a valid initData string signed with the test bot token. The
// fields mirror the Telegram WebApp payload shape (user + auth_date +
// query_id + hash) so the verifier sees realistic input.
function signInitData({ token = BOT_TOKEN, authDate = Math.floor(Date.now() / 1000), userId = 42, extra = {} } = {}) {
  const params = new URLSearchParams();
  params.set('auth_date', String(authDate));
  params.set('query_id', 'AAEgAAA');
  params.set('user', JSON.stringify({ id: userId, first_name: 'Test', username: 'tester' }));
  for (const [k, v] of Object.entries(extra)) params.set(k, v);

  const dataCheckString = [...params.entries()]
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join('\n');

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(token).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

function makeRes() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

describe('verifyInitData', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
  });

  it('accepts a freshly-signed payload and returns the user', () => {
    const initData = signInitData({ userId: 123 });
    const verified = verifyInitData(initData, BOT_TOKEN);
    expect(verified).toBeTruthy();
    expect(verified.user?.id).toBe(123);
    expect(typeof verified.authDate).toBe('number');
  });

  it('rejects a tampered hash (constant-time compare)', () => {
    const initData = signInitData();
    // Flip a character in the hash without changing length so the
    // constant-time compare path is exercised (not the length-mismatch
    // try/catch).
    const params = new URLSearchParams(initData);
    const orig = params.get('hash');
    const flipped = orig[0] === '0' ? '1' + orig.slice(1) : '0' + orig.slice(1);
    params.set('hash', flipped);
    expect(verifyInitData(params.toString(), BOT_TOKEN)).toBeNull();
  });

  it('rejects a hash signed with the wrong bot token', () => {
    const initData = signInitData({ token: 'attacker_token_pretending_to_be_us' });
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects when hash field is missing entirely', () => {
    const params = new URLSearchParams(signInitData());
    params.delete('hash');
    expect(verifyInitData(params.toString(), BOT_TOKEN)).toBeNull();
  });

  it('rejects when auth_date is older than 24h', () => {
    const old = Math.floor(Date.now() / 1000) - (25 * 60 * 60);
    const initData = signInitData({ authDate: old });
    expect(verifyInitData(initData, BOT_TOKEN)).toBeNull();
  });

  it('rejects when auth_date is missing', () => {
    // Re-sign WITHOUT auth_date so the hash matches the malformed
    // payload — the auth_date check should still reject.
    const params = new URLSearchParams();
    params.set('query_id', 'AAEgAAA');
    params.set('user', JSON.stringify({ id: 1 }));
    const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    params.set('hash', crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex'));
    expect(verifyInitData(params.toString(), BOT_TOKEN)).toBeNull();
  });

  it('returns null when initData or botToken missing', () => {
    expect(verifyInitData('', BOT_TOKEN)).toBeNull();
    expect(verifyInitData(signInitData(), '')).toBeNull();
    expect(verifyInitData(null, BOT_TOKEN)).toBeNull();
  });

  it('tolerates malformed user JSON (returns user:null)', () => {
    // Build a payload whose `user` field is not JSON, sign it, verify
    // it still passes the HMAC check but user is null.
    const params = new URLSearchParams();
    params.set('auth_date', String(Math.floor(Date.now() / 1000)));
    params.set('user', 'not-json-{{}}');
    const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    params.set('hash', crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex'));
    const verified = verifyInitData(params.toString(), BOT_TOKEN);
    expect(verified).toBeTruthy();
    expect(verified.user).toBeNull();
  });
});

describe('requireInitData (header-only)', () => {
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
  });

  it('passes through valid header initData and attaches req.tg', () => {
    const req = { headers: { 'x-telegram-init-data': signInitData({ userId: 7 }) } };
    const res = makeRes();
    let nextCalled = false;
    requireInitData(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.tg?.user?.id).toBe(7);
    expect(res.statusCode).toBe(0);
  });

  it('401s when header is missing', () => {
    const req = { headers: {} };
    const res = makeRes();
    requireInitData(req, res, () => { throw new Error('next should not fire'); });
    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'invalid initData' });
  });
});

describe('requireInitDataFromBodyOrHeader', () => {
  let savedSkip;
  beforeEach(() => {
    process.env.TELEGRAM_BOT_TOKEN = BOT_TOKEN;
    savedSkip = process.env.SKIP_INIT_DATA_AUTH;
    delete process.env.SKIP_INIT_DATA_AUTH;
  });
  afterEach(() => {
    if (savedSkip === undefined) delete process.env.SKIP_INIT_DATA_AUTH;
    else process.env.SKIP_INIT_DATA_AUTH = savedSkip;
  });

  it('accepts header-passed initData', () => {
    const req = { headers: { 'x-telegram-init-data': signInitData({ userId: 11 }) }, body: {} };
    const res = makeRes();
    let nextCalled = false;
    requireInitDataFromBodyOrHeader(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.tg?.user?.id).toBe(11);
  });

  it('accepts body-stuffed initData (v2 TMA postJson pattern)', () => {
    const req = { headers: {}, body: { initData: signInitData({ userId: 22 }) } };
    const res = makeRes();
    let nextCalled = false;
    requireInitDataFromBodyOrHeader(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.tg?.user?.id).toBe(22);
  });

  it('prefers header over body when both present', () => {
    const req = {
      headers: { 'x-telegram-init-data': signInitData({ userId: 33 }) },
      body: { initData: signInitData({ userId: 44 }) }
    };
    const res = makeRes();
    requireInitDataFromBodyOrHeader(req, res, () => {});
    expect(req.tg?.user?.id).toBe(33);
  });

  it('401s when neither header nor body has initData', () => {
    const req = { headers: {}, body: {} };
    const res = makeRes();
    requireInitDataFromBodyOrHeader(req, res, () => { throw new Error('next should not fire'); });
    expect(res.statusCode).toBe(401);
  });

  it('401s when header value is invalid AND body value is invalid', () => {
    const req = {
      headers: { 'x-telegram-init-data': 'garbage' },
      body: { initData: 'also-garbage' }
    };
    const res = makeRes();
    requireInitDataFromBodyOrHeader(req, res, () => { throw new Error('next should not fire'); });
    expect(res.statusCode).toBe(401);
  });

  it('dev bypass: SKIP_INIT_DATA_AUTH=true passes through with synthetic req.tg', () => {
    process.env.SKIP_INIT_DATA_AUTH = 'true';
    const req = { headers: {}, body: {} };
    const res = makeRes();
    let nextCalled = false;
    requireInitDataFromBodyOrHeader(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.tg).toEqual({ user: null, devBypass: true });
    expect(res.statusCode).toBe(0);
  });

  it('dev bypass only fires for the exact string "true" (no other truthy values)', () => {
    process.env.SKIP_INIT_DATA_AUTH = '1';
    const req = { headers: {}, body: {} };
    const res = makeRes();
    requireInitDataFromBodyOrHeader(req, res, () => { throw new Error('next should not fire'); });
    expect(res.statusCode).toBe(401);
  });
});
