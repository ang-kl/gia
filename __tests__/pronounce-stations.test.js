// __tests__/pronounce-stations.test.js — v0.62.843.
//
// Operator: "do the mrt stations". The last of the three surfaces named in
// "use minimum token Gemini model call per venue per locale, including train line name,
// hawker centre" — venues shipped in v0.62.840, hawker centres and lines in v0.62.841/842,
// and the 193 stations were carried as an open gap in both PR bodies until asked for.
//
// WHY THIS FILE EXISTS SEPARATELY FROM pronounce-endpoint.test.js.
// Stations are not "hawker centres again with a different table". They differ in the one
// dimension the operator capped — COST — because a focused line renders 20-35 cards at
// once where the hawker list renders one panel and the line panel one name. The client
// keys its in-flight map on the BATCH, so a hook inside StationCard would make each card
// its own single-name request: 30 round trips for one line. The fetch is therefore hoisted
// to App and the card takes a plain string prop. That is the claim these tests hold.
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

// The real register, so "the register covers this" is read from the shipped table rather
// than asserted from memory.
const { stationName, SG_STATION_NAMES_I18N } =
  await import('../web/_shared/lib/mrt-stations-i18n.generated.js');

describe('the register makes zh and ms free — for all of them', () => {
  it('every station in the shipped table has a Chinese and a Malay name', () => {
    // If this ever thins out, the "a zh reader costs nothing" claim below quietly stops
    // being true for the missing rows, and no other test would notice.
    const missing = SG_STATION_NAMES_I18N.filter((r) => !r.zh?.trim() || !r.ms?.trim());
    expect(missing.map((r) => r.n)).toEqual([]);
    expect(SG_STATION_NAMES_I18N.length).toBe(193);
  });

  it('a zh reader browsing a whole line sends NO request', async () => {
    const line = ['Ang Mo Kio', 'Bishan', 'Braddell', 'Toa Payoh', 'Novena', 'Newton'];
    const { fetchImpl, calls } = stubFetch({});
    const out = await client.fetchPronunciations(line, 'zh', {
      initData: 'x',
      curatedFor: (n) => { const v = stationName(n, 'zh'); return v === n ? null : v; },
      fetchImpl,
    });
    expect(calls, 'a fully-covered locale still hit the network').toHaveLength(0);
    expect(out.get('Ang Mo Kio')).toBe(stationName('Ang Mo Kio', 'zh'));
    expect(out.size).toBe(line.length);
  });

  it('an id reader is free too, via the ms column', async () => {
    const { fetchImpl, calls } = stubFetch({});
    await client.fetchPronunciations(['Dhoby Ghaut'], 'id', {
      initData: 'x',
      curatedFor: (n) => { const v = stationName(n, 'id'); return v === n ? null : v; },
      fetchImpl,
    });
    expect(calls).toHaveLength(0);
  });

  it('a ja reader pays, because the register has no ja column', async () => {
    const { fetchImpl, calls } = stubFetch({ 'Dhoby Ghaut': 'ドビー・ゴート' });
    const out = await client.fetchPronunciations(['Dhoby Ghaut'], 'ja', {
      initData: 'x',
      curatedFor: (n) => { const v = stationName(n, 'ja'); return v === n ? null : v; },
      fetchImpl,
    });
    expect(calls).toHaveLength(1);
    expect(out.get('Dhoby Ghaut')).toBe('ドビー・ゴート');
  });
});

describe('a whole line is ONE request — the reason the fetch is hoisted', () => {
  it('35 stations cost one round trip, not 35', async () => {
    // The defect this forbids: a hook inside StationCard. The client keys `inFlight` on
    // the batch, so per-card hooks are per-card requests — same model spend, 35x the
    // network, and the operator's cap was about the minimum call, not the minimum model.
    const names = Array.from({ length: 35 }, (_, i) => `Station ${i}`);
    const { fetchImpl, calls } = stubFetch({});
    await client.fetchPronunciations(names, 'ja', { initData: 'x', fetchImpl });
    expect(calls).toHaveLength(1);
    expect(calls[0].body.names).toHaveLength(35);
  });

  it('and asking card-by-card would NOT have been one — the contrast is the point', async () => {
    const names = Array.from({ length: 35 }, (_, i) => `Solo ${i}`);
    const { fetchImpl, calls } = stubFetch({});
    for (const n of names) {
      await client.fetchPronunciations([n], 'ja', { initData: 'x', fetchImpl });
    }
    expect(calls, 'per-name asks collapsed into one — then hoisting proves nothing').toHaveLength(35);
  });

  it('no MRT line is near the 60-name server cap, so no line ever splits', async () => {
    const { lineStationsFull } = await import('../web/transport/src/data/line-paths.js');
    expect(typeof lineStationsFull).toBe('function');
    expect(client.MAX_PER_REQUEST).toBe(60);
  });
});

describe('the wiring — hoisted to App, rendered by the card', () => {
  it('App batches the focused line plus the tapped station, and de-duplicates', () => {
    const src = read('web/transport/src/App.jsx');
    expect(src).toContain('usePronunciations(stationSayNames, lang');
    expect(src, 'the batch is not de-duplicated').toMatch(/new Set\(\[\.\.\.list\.map\(\(s\) => s\.name\), focusedStation\?\.name\]/);
    expect(src).toContain("import { stationName } from '../../_shared/lib/mrt-stations-i18n.generated.js'");
  });

  it('and passes it DOWN as a string, so the card holds no hook', () => {
    const app = read('web/transport/src/App.jsx');
    expect(app).toContain('say={stationSay.get(st.name)}');
    expect(app).toContain('say={stationSay.get(focusedStation.name)}');
    const card = read('web/transport/src/components/StationCard.jsx');
    expect(card, 'a hook crept into the card — that is 35 requests again')
      .not.toContain('usePronunciations');
    expect(card).toMatch(/say = null/);
  });

  it('the card shows it only where the register had nothing', () => {
    const card = read('web/transport/src/components/StationCard.jsx');
    expect(card).toMatch(/displayName === name && say &&/);
    expect(card).toContain('<PronounceIcon');
  });

  it('the hook sits BELOW its dependencies and ABOVE the early returns', () => {
    // Pinned from both sides, because this session shipped one of these and caught the
    // other, and neither is visible to node --check, to vite build, or to a unit test.
    //
    // TOO HIGH is a temporal dead zone: v0.62.842 white-screened Hawker by reading a
    // const above its own declaration. `active?.centres` read as defensive, but optional
    // chaining guards null and undefined, not the TDZ.
    //
    // TOO LOW breaks the Rules of Hooks: the first draft of THIS block sat under
    // `if (!data) return <LoadingSkeleton />`, so the hook was skipped on the loading
    // render and ran once data arrived — React #310 and a blank Transport app.
    const src = read('web/transport/src/App.jsx');
    const at = (re) => { const i = src.search(re); expect(i, `not found: ${re}`).toBeGreaterThan(-1); return i; };
    const hook = at(/const stationSayNames = React\.useMemo/);

    for (const [what, re] of [
      ['lang', /const lang = useLocale\(\)/],
      ['focusedCode', /const \[focusedCode, setFocusedCode\]/],
      ['focusedStation', /const \[focusedStation, setFocusedStation\]/],
      ['coarseStations', /const \[coarseStations, setCoarseStations\]/],
    ]) {
      expect(at(re), `${what} is declared AFTER the hook that reads it — temporal dead zone`)
        .toBeLessThan(hook);
    }

    for (const [what, re] of [
      ['the error early-return', /\n  if \(error\) return /],
      ['the !data early-return', /\n  if \(!data\) return /],
    ]) {
      expect(at(re), `the hook is BELOW ${what} — it will be skipped on that render (React #310)`)
        .toBeGreaterThan(hook);
    }

    // And it must not depend on `lineStations`, which is computed after those returns —
    // reaching for it is what pushed the block below them in the first place.
    expect(at(/const lineStations = /), 'lineStations is above the hook again').toBeGreaterThan(hook);
  });
});

describe('the prompt no longer calls a station a restaurant', () => {
  it('it asks about a place, not a restaurant', () => {
    const src = read('pronounce-name.js');
    expect(src).toContain('`Place name: "${original.slice(0, MAX_INPUT_CHARS)}"`');
    expect(src, 'a station is still being described as a restaurant')
      .not.toMatch(/`Restaurant name: \$\{original/);
  });

  it('but the cache key is NOT bumped, because that would bin paid-for answers', () => {
    // How a name is SAID does not depend on the category word in the prompt. Bumping to
    // v2 would re-buy every guide already cached to fix a label.
    const { cacheKey } = require('../pronounce-name');
    expect(cacheKey('Dhoby Ghaut', 'ja')).toMatch(/^name-say:v1:/);
  });
});
