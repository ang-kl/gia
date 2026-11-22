// __tests__/user-prefs.test.js — v0.59.0
//
// In-memory Redis double for the user-prefs module. Verifies the
// resolution chain: Redis pref > Telegram language_code > 'en'.

import { describe, it, expect, beforeEach } from 'vitest';
import { getUserLang, setUserLang, resolveLang, SUPPORTED } from '../user-prefs.js';

function makeRedis() {
  const store = new Map();
  return {
    isOpen: true,
    async get(k) { return store.has(k) ? store.get(k) : null; },
    async setEx(k, _ttl, v) { store.set(k, v); return 'OK'; },
    async del(k) { return store.delete(k) ? 1 : 0; },
    _store: store
  };
}

describe('user-prefs.SUPPORTED', () => {
  it('exposes en, fr, id, ru, de, zh, ja, es', () => {
    // v0.62.309 — extended from en/fr to add id (Indonesian), ru (Russian),
    // de (German) as supported UI + translation-target locales.
    // v0.62.480 — operator: "/language only has 2 language, please include the
    // rest". Extended to the Cuisine TMA's full set (added zh, ja, es).
    expect(SUPPORTED).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });
});

describe('setUserLang / getUserLang', () => {
  let redis;
  beforeEach(() => { redis = makeRedis(); });

  it('round-trips a valid lang', async () => {
    await setUserLang(redis, 42, 'fr');
    expect(await getUserLang(redis, 42)).toBe('fr');
  });

  it('rejects unsupported lang', async () => {
    // v0.62.480 — zh/ja/es are now supported; use ko (Korean, not in the set).
    // v0.62.883 (K6) — 'ko' was this file's example of an unsupported code and is now
    // the opposite of one. 'pt' takes its place: a real ISO code the app does not ship,
    // which tests the same thing 'xx' cannot — that the guard rejects a PLAUSIBLE locale.
    const r = await setUserLang(redis, 42, 'pt');
    expect(r).toBeNull();
    expect(await getUserLang(redis, 42)).toBeNull();
  });

  it('returns null when redis is offline', async () => {
    const offline = { ...makeRedis(), isOpen: false };
    expect(await getUserLang(offline, 42)).toBeNull();
    expect(await setUserLang(offline, 42, 'fr')).toBeNull();
  });

  it('returns null when chatId is missing', async () => {
    expect(await getUserLang(redis, null)).toBeNull();
    expect(await setUserLang(redis, undefined, 'fr')).toBeNull();
  });
});

describe('resolveLang', () => {
  let redis;
  beforeEach(() => { redis = makeRedis(); });

  it('prefers explicit Redis pref over Telegram locale', async () => {
    await setUserLang(redis, 7, 'fr');
    expect(await resolveLang(redis, 7, { from: { language_code: 'en' } })).toBe('fr');
  });

  it('falls back to Telegram language_code when no explicit pref', async () => {
    expect(await resolveLang(redis, 7, { from: { language_code: 'fr-CA' } })).toBe('fr');
  });

  it('accepts a bare language_code string as the fallback', async () => {
    expect(await resolveLang(redis, 7, 'fr')).toBe('fr');
  });

  it('defaults to en when nothing else resolves', async () => {
    // v0.62.480 — zh is now supported (a zh Telegram locale resolves to zh);
    // use ko (unsupported) to exercise the en fallback path.
    expect(await resolveLang(redis, 7, null)).toBe('en');
    // v0.62.883 (K6) — 'ko' was this file's example of an unsupported code and is now
    // the opposite of one. 'pt' takes its place: a real ISO code the app does not ship,
    // which tests the same thing 'xx' cannot — that the guard rejects a PLAUSIBLE locale.
    expect(await resolveLang(redis, 7, { from: { language_code: 'pt' } })).toBe('en');
  });

  it('clears with del() reverts to fallback chain', async () => {
    await setUserLang(redis, 7, 'fr');
    expect(await resolveLang(redis, 7, 'en')).toBe('fr');
    await redis.del('user:7:lang');
    expect(await resolveLang(redis, 7, 'en')).toBe('en');
  });
});
