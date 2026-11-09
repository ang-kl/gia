// __tests__/freetext-history.test.js — v0.62.964.
//
// Spec: doc/Feature/2026-10-31-tellme-keyboard-toggle-and-history.spec.md, C4, C5, C8 and invariants I4-I6.
//
// The last 30 searches typed into Cuisine's free-text box, kept in the user's own Telegram CloudStorage (operator,
// A3: "Telegram account"), with localStorage where CloudStorage is missing. CloudStorage holds values of at most
// 4,096 characters, so the stored JSON is kept under that by dropping the oldest entries. The module has no React,
// so it is imported directly.
import { describe, it, expect } from 'vitest';
import {
  HISTORY_KEY, MAX_ENTRIES, MAX_LEN, MAX_VALUE, addEntry, removeEntry, serialise, parse, createHistoryStore,
  resolveCloudStorage, FREETEXT_STRINGS, FREETEXT_LOCALES, ft,
} from '../web/cuisine/src/v2/lib/freetext-history.js';

// CloudStorage's callback API, as Telegram documents it: getItem(key, cb(err, value)), setItem(key, value, cb(err, ok)).
function fakeCloud({ fail = false, value = null } = {}) {
  const m = new Map(value == null ? [] : [[HISTORY_KEY, value]]);
  return {
    m,
    getItem(k, cb) { setTimeout(() => (fail ? cb(new Error('down')) : cb(null, m.has(k) ? m.get(k) : ''))); },
    setItem(k, v, cb) { setTimeout(() => { if (fail) return cb?.(new Error('down')); if (v.length >= 4096) return cb?.(new Error('VALUE_TOO_LONG')); m.set(k, v); cb?.(null, true); }); },
  };
}
function fakeLocal(init = {}) {
  const m = new Map(Object.entries(init));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); } };
}

describe('I4 — at most 30, each at most 120 characters, newest first, repeats moved up regardless of case', () => {
  it('the limits the spec names', () => {
    expect(HISTORY_KEY).toBe('gia.freetext.v1');
    expect(MAX_ENTRIES).toBe(30);
    expect(MAX_LEN).toBe(120);
    expect(MAX_VALUE).toBe(4096);
  });
  it('newest first, trimmed, cut to 120', () => {
    let l = addEntry([], '  laksa  ');
    l = addEntry(l, 'x'.repeat(150));
    expect(l).toEqual(['x'.repeat(120), 'laksa']);
  });
  it('a repeat is moved to the top, matched regardless of case, never added twice', () => {
    let l = ['chicken rice', 'Laksa', 'satay'];
    l = addEntry(l, 'LAKSA');
    expect(l).toEqual(['LAKSA', 'chicken rice', 'satay']);
    expect(l.filter((s) => s.toLowerCase() === 'laksa')).toHaveLength(1);
  });
  it('the 31st entry pushes the oldest out', () => {
    let l = [];
    for (let i = 1; i <= 31; i++) l = addEntry(l, `dish ${i}`);
    expect(l).toHaveLength(30);
    expect(l[0]).toBe('dish 31');
    expect(l).not.toContain('dish 1');
  });
  // Thirty plain 120-character entries serialise to about 3,690 characters, under the cap, so only JSON escaping can
  // push a full list past 4,096: a quote is stored as two characters. Measured when this test's first fixture (plain
  // letters) dropped nothing and the assertion below correctly failed.
  it('the stored value stays under 4,096 characters, dropping the oldest entries', () => {
    let l = [];
    for (let i = 0; i < 30; i++) l = addEntry(l, `${String(i).padStart(2, '0')} ${'"'.repeat(110)}`);
    expect(JSON.stringify(l).length).toBeGreaterThan(4096);
    const v = serialise(l);
    expect(v.length).toBeLessThan(4096);
    const back = JSON.parse(v);
    expect(back[0]).toBe(l[0]); // newest kept
    expect(back.length).toBeLessThan(30); // oldest dropped
    expect(l.slice(0, back.length)).toEqual(back);
  });
  it('removing one entry', () => {
    expect(removeEntry(['a', 'b', 'c'], 'b')).toEqual(['a', 'c']);
  });
});

describe('I5 — only text is remembered; reading never throws; a bad value is an empty list', () => {
  it('empty or blank text adds nothing', () => {
    expect(addEntry(['a'], '   ')).toEqual(['a']);
    expect(addEntry(['a'], '')).toEqual(['a']);
    expect(addEntry(['a'], null)).toEqual(['a']);
  });
  it('a corrupt, wrong-typed or oversized value parses to a safe list', () => {
    expect(parse('{not json')).toEqual([]);
    expect(parse('"a string"')).toEqual([]);
    expect(parse('{"a":1}')).toEqual([]);
    expect(parse('')).toEqual([]);
    expect(parse(null)).toEqual([]);
    expect(parse(JSON.stringify(['ok', 5, null, '', 'OK', 'z'.repeat(200)]))).toEqual(['ok', 'z'.repeat(120)]);
    expect(parse(JSON.stringify(Array.from({ length: 40 }, (_, i) => `e${i}`)))).toHaveLength(30);
  });
});

describe('C5 — Telegram CloudStorage first, localStorage where it is missing', () => {
  it('CloudStorage is used only from Bot API 6.9', () => {
    const cloud = fakeCloud();
    expect(resolveCloudStorage({ CloudStorage: cloud, isVersionAtLeast: (v) => v === '6.9' })).toBe(cloud);
    expect(resolveCloudStorage({ CloudStorage: cloud, isVersionAtLeast: () => false })).toBeNull();
    expect(resolveCloudStorage({ CloudStorage: cloud })).toBeNull();
    expect(resolveCloudStorage(undefined)).toBeNull();
  });
  it('saves to and loads from CloudStorage, under the key', async () => {
    const cloud = fakeCloud(); const local = fakeLocal();
    const s = createHistoryStore({ cloud, local });
    await s.save(['laksa', 'satay']);
    expect(cloud.m.get(HISTORY_KEY)).toBe('["laksa","satay"]');
    expect(local.m.size).toBe(0);
    expect(await s.load()).toEqual(['laksa', 'satay']);
  });
  it('falls back to localStorage without CloudStorage', async () => {
    const local = fakeLocal();
    const s = createHistoryStore({ cloud: null, local });
    await s.save(['laksa']);
    expect(local.m.get(HISTORY_KEY)).toBe('["laksa"]');
    expect(await s.load()).toEqual(['laksa']);
  });
  it('a failing or throwing store reads as an empty list and a failed save does not throw', async () => {
    expect(await createHistoryStore({ cloud: fakeCloud({ fail: true }), local: fakeLocal() }).load()).toEqual([]);
    const throwing = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceeded'); } };
    const s = createHistoryStore({ cloud: null, local: throwing });
    expect(await s.load()).toEqual([]);
    await expect(s.save(['a'])).resolves.toBeUndefined();
    expect(await createHistoryStore({ cloud: fakeCloud({ value: '{bad' }), local: fakeLocal() }).load()).toEqual([]);
  });
  it('a full list fits CloudStorage\'s 4,096-character limit', async () => {
    const cloud = fakeCloud();
    let l = [];
    for (let i = 0; i < 30; i++) l = addEntry(l, `${i} ${'w'.repeat(118)}`);
    await createHistoryStore({ cloud, local: fakeLocal() }).save(l);
    expect(cloud.m.get(HISTORY_KEY).length).toBeLessThan(4096);
  });
});

describe('I6 — the four strings, in 9 locales, translated rather than copied, kept out of i18n.js', () => {
  const KEYS = ['kb.hide', 'kb.show', 'list.clearAll', 'list.remove'];
  it('the nine locales', () => {
    expect(FREETEXT_LOCALES).toEqual(['en', 'fr', 'id', 'ru', 'de', 'zh', 'ja', 'es', 'ko']);
  });
  for (const k of KEYS) {
    it(k, () => {
      for (const l of FREETEXT_LOCALES) expect(FREETEXT_STRINGS[k]?.[l], `${k}.${l}`).toMatch(/\S/);
      for (const l of ['fr', 'ru', 'zh', 'ja', 'ko']) expect(FREETEXT_STRINGS[k][l], `${k}.${l}`).not.toBe(FREETEXT_STRINGS[k].en);
    });
  }
  it('English as the spec names it; an unknown locale falls back to English', () => {
    expect(ft('kb.hide', 'en')).toBe('Hide keyboard');
    expect(ft('kb.show', 'en')).toBe('Show keyboard');
    expect(ft('list.clearAll', 'en')).toBe('Clear all');
    expect(ft('list.remove', 'en')).toBe('Remove');
    expect(ft('kb.hide', 'xx')).toBe('Hide keyboard');
  });
});
