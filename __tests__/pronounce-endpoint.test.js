// __tests__/pronounce-endpoint.test.js — v0.62.841.
//
// Operator: "do the hawker centre and train line endpoint".
//
// v0.62.840 gave venue cards a "how to say it" line, and O-348 recorded what it did
// NOT reach: the Hawker and Transport Mini Apps read their names from BUNDLED tables
// with no server round-trip, so there was no path from them to Gemini and those two
// surfaces stayed silent for ja/es/de/ru/fr. This is that path, and the tests below
// are mostly about the thing that could go wrong with it — cost.
//
// WHERE THE COST CONTROL LIVES, AND WHY IT IS ON THE CLIENT.
// The government register already covers Chinese and Malay for all 123 hawker
// centres, 193 MRT/LRT stations and the MRT lines, and those tables are bundled in
// the apps. So the CLIENT resolves its own curated answer and only asks for what it
// genuinely lacks. A zh or id reader therefore issues NO request at all — the saving
// is made before the network, let alone before the model. Doing that lookup on the
// server instead would also mean requiring ESM `web/_shared` modules from a
// CommonJS index.js, which is the constraint that killed the client-side open-hours
// plan earlier in this arc.
//
// `pronounce-client.js` imports nothing, so it is exercised for real here. The React
// hook lives in a separate file (`use-pronounce.js`) precisely so this test does not
// drag React into the root vitest run — the failure mode `test-import-graph-guard`
// exists for, and which this session already shipped once.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// A localStorage stub, since the client persists its answers across launches.
function installStorage() {
  const store = {};
  globalThis.window = {
    localStorage: {
      getItem: (k) => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: (k) => { delete store[k]; },
    },
  };
  return store;
}

let client;
beforeEach(async () => {
  installStorage();
  vi.resetModules();
  client = await import('../web/_shared/lib/pronounce-client.js');
  client.__resetPronounceCache();
  installStorage();
});

function stubFetch(readings) {
  const calls = [];
  const fetchImpl = async (url, opts) => {
    calls.push({ url, body: JSON.parse(opts.body) });
    return { ok: true, json: async () => ({ readings }) };
  };
  return { fetchImpl, calls };
}

describe('the curated answer never reaches the network', () => {
  it('a zh reader asking for hawker centres sends NO request', async () => {
    // The register has all 123 in Chinese. If this ever costs a call, the whole
    // cost argument for the endpoint collapses.
    const { fetchImpl, calls } = stubFetch({});
    const out = await client.fetchPronunciations(
      ['Maxwell Food Centre', 'Tekka Centre'], 'zh',
      { initData: 'x', curatedFor: (n) => ({ 'Maxwell Food Centre': '麦士威熟食中心', 'Tekka Centre': '竹脚中心' }[n] || null), fetchImpl },
    );
    expect(calls, 'a curated locale still hit the network').toHaveLength(0);
    expect(out.get('Maxwell Food Centre')).toBe('麦士威熟食中心');
  });

  it('a ja reader asks only for the names the register does not cover', async () => {
    const { fetchImpl, calls } = stubFetch({ 'Tekka Centre': 'テッカ・センター' });
    await client.fetchPronunciations(
      ['Maxwell Food Centre', 'Tekka Centre'], 'ja',
      { initData: 'x', curatedFor: (n) => (n === 'Maxwell Food Centre' ? 'マックスウェル' : null), fetchImpl },
    );
    expect(calls).toHaveLength(1);
    expect(calls[0].body.names, 'a curated name was sent anyway').toEqual(['Tekka Centre']);
  });

  it('a curated value equal to the name is not an answer', async () => {
    const { fetchImpl, calls } = stubFetch({ 'Thomson-East Coast Line': 'トムソン' });
    await client.fetchPronunciations(['Thomson-East Coast Line'], 'ja',
      { initData: 'x', curatedFor: (n) => n, fetchImpl });
    expect(calls, 'an echo of the name was treated as a translation').toHaveLength(1);
  });
});

describe('nothing is asked twice — including the nulls', () => {
  it('a second call for the same name does not re-request', async () => {
    const { fetchImpl, calls } = stubFetch({ A: 'エー' });
    await client.fetchPronunciations(['A'], 'ja', { initData: 'x', fetchImpl });
    await client.fetchPronunciations(['A'], 'ja', { initData: 'x', fetchImpl });
    expect(calls).toHaveLength(1);
  });

  it('a "needs no guide" answer is remembered, not re-asked', async () => {
    // The expensive mistake: caching only successes means every already-sayable
    // name is re-requested on every render, forever.
    const { fetchImpl, calls } = stubFetch({ B: null });
    await client.fetchPronunciations(['B'], 'ja', { initData: 'x', fetchImpl });
    await client.fetchPronunciations(['B'], 'ja', { initData: 'x', fetchImpl });
    expect(calls, 'the null was not cached').toHaveLength(1);
  });

  it('and it survives a relaunch, because it is in localStorage', async () => {
    const { fetchImpl, calls } = stubFetch({ C: null });
    await client.fetchPronunciations(['C'], 'ja', { initData: 'x', fetchImpl });
    // A fresh module instance, same storage — i.e. the app reopened.
    vi.resetModules();
    const fresh = await import('../web/_shared/lib/pronounce-client.js');
    await fresh.fetchPronunciations(['C'], 'ja', { initData: 'x', fetchImpl });
    expect(calls, 'the relaunch paid for an answer it already had').toHaveLength(1);
  });

  it('cachedPronunciation distinguishes never-asked from needs-none', async () => {
    // undefined / null / string are three different states, and collapsing the
    // first two is how a cache starts re-asking answered questions.
    expect(client.cachedPronunciation('never', 'ja')).toBeUndefined();
    const { fetchImpl } = stubFetch({ D: null });
    await client.fetchPronunciations(['D'], 'ja', { initData: 'x', fetchImpl });
    expect(client.cachedPronunciation('D', 'ja')).toBeNull();
  });

  it('two locales are separate answers for the same name', async () => {
    const { fetchImpl, calls } = stubFetch({ E: 'x' });
    await client.fetchPronunciations(['E'], 'ja', { initData: 'x', fetchImpl });
    await client.fetchPronunciations(['E'], 'de', { initData: 'x', fetchImpl });
    expect(calls).toHaveLength(2);
  });
});

describe('it fails soft, and stays bounded', () => {
  it('no initData means no request rather than an unauthenticated one', async () => {
    const { fetchImpl, calls } = stubFetch({ A: 'x' });
    const out = await client.fetchPronunciations(['A'], 'ja', { initData: '', fetchImpl });
    expect(calls).toHaveLength(0);
    expect(out.size).toBe(0);
  });

  it('a failed request yields no line, never an exception', async () => {
    const out = await client.fetchPronunciations(['A'], 'ja', {
      initData: 'x', fetchImpl: async () => { throw new Error('offline'); },
    });
    expect(out.size).toBe(0);
  });

  it('a non-ok response is treated as empty', async () => {
    const out = await client.fetchPronunciations(['A'], 'ja', {
      initData: 'x', fetchImpl: async () => ({ ok: false, json: async () => ({}) }),
    });
    expect(out.size).toBe(0);
  });

  it('requests are chunked to the server’s cap', async () => {
    const names = Array.from({ length: 140 }, (_, i) => `n${i}`);
    const { fetchImpl, calls } = stubFetch({});
    await client.fetchPronunciations(names, 'ja', { initData: 'x', fetchImpl });
    expect(calls).toHaveLength(3);                       // 60 + 60 + 20
    expect(calls[0].body.names).toHaveLength(client.MAX_PER_REQUEST);
    expect(calls.every((c) => c.body.names.length <= client.MAX_PER_REQUEST)).toBe(true);
  });
});

describe('the route and the two surfaces are wired', () => {
  it('the endpoint is AUTHENTICATED, not another open route', () => {
    // An open endpoint that spends Gemini per call is a bill anyone could run up.
    const src = read('index.js');
    const i = src.indexOf("app.post('/api/pronounce'");
    expect(i, 'the route is missing').toBeGreaterThan(-1);
    const body = src.slice(i, i + 2600);
    expect(body).toContain('verifyInitData(req.body?.initData');
    expect(body).toContain("res.status(401)");
    expect(body, 'the locale is not validated').toContain('APP_LOCALES.includes(lang)');
    expect(body, 'the batch is unbounded').toMatch(/slice\(0, 60\)/);
  });

  it('the hawker app shows it only where the register has nothing', () => {
    const src = read('web/hawker/src/App.jsx');
    expect(src).toContain('usePronunciations(centreNames, lang');
    expect(src).toContain('curatedFor: (n) => hawkerNameLocal(n, lang)');
    // Guarded on the curated line's ABSENCE: with a Chinese name present, that line
    // already is the answer and a second one would be noise.
    expect(src).toMatch(/!hawkerNameLocal\(c\.displayName \|\| c\.name, lang\) && centreSay\.get/);
    expect(src).toContain('<PronounceIcon');
  });

  it('the transport line panel does the same for line names', () => {
    const src = read('web/transport/src/components/LineStatusPanel.jsx');
    expect(src).toContain('usePronunciations([line.name]');
    expect(src).toMatch(/lineName\(line\.code, line\.name, lang\) === line\.name && lineSay\.get/);
    expect(src).toContain('<PronounceIcon');
  });

  it('the React hook is in its OWN file, so this test never pulls in React', () => {
    // pronounce-client.js is imported for real above. If the hook lived in it, that
    // import would drag React into the root vitest run and fail in CI, where
    // web/*/node_modules does not exist — the exact defect v0.62.834 shipped.
    expect(read('web/_shared/lib/pronounce-client.js')).not.toMatch(/from 'react'/);
    expect(read('web/_shared/lib/use-pronounce.js')).toMatch(/from 'react'/);
  });
});
