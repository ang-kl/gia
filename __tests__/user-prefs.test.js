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
  it('exposes en, fr, id, ru, de', () => {
    // v0.62.309 — extended from en/fr to add id (Indonesian), ru (Russian),
    // de (German) as supported UI + translation-target locales.
    expect(SUPPORTED).toEqual(['en', 'fr', 'id', 'ru', 'de']);
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
    const r = await setUserLang(redis, 42, 'zh');
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
    expect(await resolveLang(redis, 7, null)).toBe('en');
    expect(await resolveLang(redis, 7, { from: { language_code: 'zh' } })).toBe('en');
  });

  // v0.62.309 — locale boundary guard. The supported non-en/fr locales must
  // resolve from the device language_code…
  it('resolves the supported locales (id/ru/de) from the device language', async () => {
    expect(await resolveLang(redis, 7, { from: { language_code: 'id' } })).toBe('id');
    expect(await resolveLang(redis, 7, { from: { language_code: 'ru-RU' } })).toBe('ru');
    expect(await resolveLang(redis, 7, { from: { language_code: 'de-AT' } })).toBe('de');
  });

  // …and ANY language outside the supported set must fall back to English,
  // never leak through. (Operator: "default is EN if none of the other
  // language is part of device language.")
  it('defaults to en for every UNsupported device language', async () => {
    for (const code of ['zh', 'zh-Hans', 'ja', 'es', 'pt-BR', 'ar', 'th', 'vi', 'ko', 'it', 'xx']) {
      expect(await resolveLang(redis, 7, { from: { language_code: code } })).toBe('en');
    }
  });

  it('clears with del() reverts to fallback chain', async () => {
    await setUserLang(redis, 7, 'fr');
    expect(await resolveLang(redis, 7, 'en')).toBe('fr');
    await redis.del('user:7:lang');
    expect(await resolveLang(redis, 7, 'en')).toBe('en');
  });
});
