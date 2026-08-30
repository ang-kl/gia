// __tests__/pronounce-locale-switch.test.js — v0.62.847.
//
// Two findings Codex raised on PR #1790, both verified against the source and both real.
// They merged before the review finished, so this is the follow-up.
//
// P1 — the hook's map never dropped the previous locale's answers.
// `usePronunciations` kept its own accumulating Map: a `useState` initializer (runs ONCE,
// so it never re-seeded for a new locale) plus an effect that MERGED each fetch into the
// previous map and returned early when a fetch came back empty. So switching from a
// locale with guides (ja) to one that needs none (en) left every Japanese guide on screen
// under the English UI, indefinitely.
//
// That is the operator's own complaint — "the map/second line doesn't change when I change
// language" — living one layer below the fix that was supposed to close it. v0.62.846 made
// the CACHE locale-correct and left the CONSUMER accumulating.
//
// The fix is structural rather than a patch: the map is now a pure PROJECTION of the
// (name, locale)-keyed cache, so it cannot carry another locale's answer. The projection
// lives in `pronounce-client.js` — which imports nothing — precisely so this is a real
// behavioural test and not a grep over a React file the root suite cannot import.
import { describe, it, expect, beforeEach, vi } from 'vitest';

function installStorage() {
  const store = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
  };
}

let client;
beforeEach(async () => {
  installStorage();
  vi.resetModules();
  client = await import('../web/_shared/lib/pronounce-client.js');
  client.__resetPronounceCache();
  installStorage();
});

const stubFetch = (readings) => async (url, opts) => ({ ok: true, json: async () => ({ readings }) });

describe('P1 — switching locale must not keep the old locale’s guides', () => {
  const NAMES = ['Bendemeer', 'Farrer Park'];

  it('ja guides do NOT survive a switch to a locale that needs none', async () => {
    // The exact reported shape: ja produces guides, en produces none, and the English UI
    // used to keep showing the Japanese ones.
    await client.fetchPronunciations(NAMES, 'ja', {
      initData: 'x', fetchImpl: stubFetch({ Bendemeer: 'ベンデミア', 'Farrer Park': 'ファーラー・パーク' }),
    });
    expect(client.projectPronunciations(NAMES, 'ja').get('Bendemeer')).toBe('ベンデミア');

    await client.fetchPronunciations(NAMES, 'en', {
      initData: 'x', fetchImpl: stubFetch({ Bendemeer: null, 'Farrer Park': null }),
    });
    const en = client.projectPronunciations(NAMES, 'en');
    expect(en.size, 'the previous locale’s guides survived the switch').toBe(0);
  });

  it('an all-null answer is a RESULT, not a no-op to be skipped', async () => {
    // The old effect did `if (!got.size) return`, so the very case that must clear the
    // map was the one case that never updated it.
    await client.fetchPronunciations(['X'], 'ja', { initData: 'x', fetchImpl: stubFetch({ X: 'エックス' }) });
    await client.fetchPronunciations(['X'], 'de', { initData: 'x', fetchImpl: stubFetch({ X: null }) });
    expect(client.cachedPronunciation('X', 'de'), 'the null was not recorded').toBeNull();
    expect(client.projectPronunciations(['X'], 'de').has('X')).toBe(false);
    expect(client.projectPronunciations(['X'], 'ja').get('X')).toBe('エックス');
  });

  it('a locale never asked for projects EMPTY, not another locale’s answers', async () => {
    await client.fetchPronunciations(NAMES, 'ja', {
      initData: 'x', fetchImpl: stubFetch({ Bendemeer: 'ベンデミア', 'Farrer Park': 'ファーラー・パーク' }),
    });
    expect(client.projectPronunciations(NAMES, 'ru').size).toBe(0);
  });

  it('dropping a name from the list drops it from the projection', async () => {
    await client.fetchPronunciations(NAMES, 'ja', {
      initData: 'x', fetchImpl: stubFetch({ Bendemeer: 'ベンデミア', 'Farrer Park': 'ファーラー・パーク' }),
    });
    const one = client.projectPronunciations(['Bendemeer'], 'ja');
    expect(one.size).toBe(1);
    expect(one.has('Farrer Park'), 'a name no longer on screen is still projected').toBe(false);
  });

  it('curated still wins, and an echo of the name is not an answer', () => {
    expect(client.projectPronunciations(['Maxwell'], 'zh', () => '麦士威').get('Maxwell')).toBe('麦士威');
    expect(client.projectPronunciations(['Maxwell'], 'zh', (n) => n).size).toBe(0);
  });

  it('the hook projects rather than accumulates — no merge into a previous map', () => {
    const { readFileSync } = require('fs');
    const src = readFileSync(require('path').join(__dirname, '..', 'web/_shared/lib/use-pronounce.js'), 'utf8');
    expect(src).toContain('projectPronunciations(');
    expect(src, 'the accumulating merge is back').not.toMatch(/const next = new Map\(prev\)/);
    expect(src, 'the empty-result early return is back — the clearing case would be skipped')
      .not.toMatch(/if \(cancelled \|\| !got\.size\) return/);
  });
});

describe('P2 — the memo key must track the names it returns', () => {
  it('the cuisine dependency is the names, not placeIds', () => {
    // A Michelin entry whose Places lookup fails is emitted with `placeId: ''` and a real
    // name, so two pages of N such venues gave the SAME separator-only dependency while
    // every name changed — pinning the memo to the previous page.
    const { readFileSync } = require('fs');
    const src = readFileSync(require('path').join(__dirname, '..', 'web/cuisine/src/v2/App.jsx'), 'utf8');
    expect(src).toMatch(/const venueSayKey = \(venues \|\| \[\]\)\.map\(\(v\) => \(v && v\.name\) \|\| ''\)/);
    expect(src).toMatch(/\[venueSayKey\]/);
    expect(src, 'the dependency is back on placeId, which fallback venues do not have')
      .not.toMatch(/map\(\(v\) => v && v\.placeId\)\.join/);
  });

  it('and the premise is real: a failed Places lookup emits placeId: \'\' with a name', () => {
    const { readFileSync } = require('fs');
    const idx = readFileSync(require('path').join(__dirname, '..', 'index.js'), 'utf8');
    const i = idx.indexOf('Places lookup failed — return curated entry only.');
    expect(i, 'the curated-fallback branch is gone; re-check the P2 premise').toBeGreaterThan(-1);
    const block = idx.slice(i, i + 200);
    expect(block).toMatch(/placeId: ''/);
    expect(block).toMatch(/name: entry\.name/);
  });
});
