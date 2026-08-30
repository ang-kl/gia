// __tests__/pronounce-reactive.test.js — v0.62.846.
//
// Operator: "the second line translation as I change the language".
//
// v0.62.845 fixed WHICH language the server is told. It did not make the answer REACTIVE,
// and those are different bugs with the same symptom. The guide is computed server-side
// and baked into the search payload; toggling the locale does not re-run the search. So
// the chrome re-rendered in the new language while the card's second line kept the answer
// for the language the search ran under — which is what was reported, one fix later.
//
// The fix routes the cuisine cards through the same `/api/pronounce` client the Hawker and
// Transport apps already use, with `lang` in the dependency list. What these tests hold is
// the part that is easy to get wrong: the THREE-STATE read.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

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

const stubFetch = (readings) => {
  const calls = [];
  return {
    calls,
    fetchImpl: async (url, opts) => {
      calls.push(JSON.parse(opts.body));
      return { ok: true, json: async () => ({ readings }) };
    },
  };
};

describe('switching locale asks again for the new locale', () => {
  it('the same name in two locales is two answers, not one cached one', async () => {
    const ja = stubFetch({ 'The Canteen by Enjoy': 'ザ・キャンティーン・バイ・エンジョイ' });
    await client.fetchPronunciations(['The Canteen by Enjoy'], 'ja', { initData: 'x', fetchImpl: ja.fetchImpl });
    const ru = stubFetch({ 'The Canteen by Enjoy': 'Зэ Кантин бай Энджой' });
    await client.fetchPronunciations(['The Canteen by Enjoy'], 'ru', { initData: 'x', fetchImpl: ru.fetchImpl });

    expect(client.cachedPronunciation('The Canteen by Enjoy', 'ja')).toBe('ザ・キャンティーン・バイ・エンジョイ');
    expect(client.cachedPronunciation('The Canteen by Enjoy', 'ru')).toBe('Зэ Кантин бай Энджой');
    expect(ja.calls).toHaveLength(1);
    expect(ru.calls, 'the ja answer was reused for ru').toHaveLength(1);
  });

  it('a locale never asked for reads undefined — NOT another locale’s answer', async () => {
    const { fetchImpl } = stubFetch({ X: 'エックス' });
    await client.fetchPronunciations(['X'], 'ja', { initData: 'x', fetchImpl });
    expect(client.cachedPronunciation('X', 'de')).toBeUndefined();
  });
});

describe('the card’s three-state read — the part that is easy to get wrong', () => {
  const card = () => read('web/cuisine/src/v2/components/ResultCard.jsx');

  it('a live answer for THIS locale wins over the search payload', () => {
    expect(card()).toMatch(/const said = cachedPronunciation\(venue\.name, lang\);/);
    expect(card()).toMatch(/const sayNow = said !== undefined \? said : venue\.namePronounce;/);
  });

  it('an explicit null suppresses the payload rather than falling back to it', () => {
    // `said !== undefined` and not `said || venue.namePronounce`. With `||`, a locale that
    // legitimately needs NO guide would fall through and show the guide for whichever
    // locale the search happened to run under — the original bug, re-expressed.
    expect(card(), 'a truthiness fallback would resurrect the stale line')
      .not.toMatch(/said \|\| venue\.namePronounce/);
  });

  it('and the payload is still used before the fetch lands, so nothing flickers empty', () => {
    expect(card()).toContain('venue.namePronounce');
  });

  it('the rendered value is sayNow, not the raw payload field', () => {
    expect(card()).toMatch(/\{sayNow && \(/);
    expect(card(), 'the card still renders the payload field directly')
      .not.toMatch(/\{venue\.namePronounce && \(/);
  });
});

describe('one request per page, not one per card', () => {
  it('App batches, and the card holds no hook', () => {
    const app = read('web/cuisine/src/v2/App.jsx');
    expect(app).toMatch(/usePronunciations\(venueSayNames, lang, \{ initData \}\)/);
    // v0.62.847 — the batch key moved out of the memo (Codex P2 on #1790: a placeId-based
    // key is identical across Michelin fallback pages). The REQUIREMENT is unchanged —
    // App batches the visible venue NAMES — so this asserts that, not the expression.
    expect(app).toMatch(/const venueSayKey = \(venues \|\| \[\]\)\.map\(\(v\) => \(v && v\.name\) \|\| ''\)/);
    expect(app).toMatch(/venueSayKey \? venueSayKey\.split\('\|'\) : \[\]/);
    expect(card(), 'a hook in the card is one request per card')
      .not.toContain('usePronunciations');
    function card() { return read('web/cuisine/src/v2/components/ResultCard.jsx'); }
  });

  it('lang is in the hook call, which is what makes the toggle re-resolve', () => {
    const app = read('web/cuisine/src/v2/App.jsx');
    const i = app.search(/usePronunciations\(venueSayNames, lang/);
    expect(i, 'the hook does not depend on lang — the toggle would do nothing').toBeGreaterThan(-1);
  });

  it('the hook sits below every const it reads and above the single return', () => {
    // Both ordering crashes this session (TDZ, then React #310) were in this shape.
    const app = read('web/cuisine/src/v2/App.jsx');
    const hook = app.search(/const venueSayNames = React\.useMemo/);
    expect(hook).toBeGreaterThan(-1);
    expect(app.search(/const \[lang\] = useLocale\(\)/)).toBeLessThan(hook);
    expect(app.search(/const \[venues, setVenues\] = useState\(\[\]\)/)).toBeLessThan(hook);
    // Anchored to App's OWN return. The first draft searched the whole file for
    // `\n  return (` and matched a helper defined above the component — the assertion
    // failed while the code was correct, which is a wrong test, not a wrong hook.
    const appStart = app.indexOf('export default function App() {');
    expect(appStart).toBeGreaterThan(-1);
    const appReturn = app.indexOf('\n  return (', appStart);
    expect(appReturn, "App's render return not found").toBeGreaterThan(-1);
    expect(appReturn, 'the hook is below the render return — it would never run').toBeGreaterThan(hook);
    // And no conditional early return may appear between them (React #310, v0.62.843).
    expect(app.slice(hook, appReturn), 'an early return now sits between the hook and the render')
      .not.toMatch(/\n  if \([^)]*\) return /);
  });
});
