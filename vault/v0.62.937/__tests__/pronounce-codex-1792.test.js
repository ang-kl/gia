// __tests__/pronounce-codex-1792.test.js — v0.62.851.
//
// Three P2 findings Codex raised on PR #1792, all verified against the source and the
// shipped data before acting, all real, all mine.
//
// P2-1 — THE MAP GUIDES ONLY WORKED ON A SECOND VISIT. `MapPanel`'s marker-sync effect
// depends on [venues, userLoc, searchCenter], none of which change when the pronunciation
// fetch resolves. So the popup HTML was built from a COLD cache and never rebuilt: the
// lines v0.62.850 added appeared only when localStorage happened to be warm. That is the
// worst shape of bug — it works for whoever tests it twice.
//
// P2-2 — THE STREET RECOGNISER WAS WRITTEN FROM MEMORY, NOT FROM THE DATA. It listed what
// a street "usually" ends in. Codex named two real shipped addresses it dropped silently
// ("925 Yishun Central 1", "19 Riverina View"); counting the corpus found the problem was
// bigger than the two examples — Wy 476, Central 355, Lp 324, Rise 184. Every venue on
// those roads was getting no address guide at all.
//
// P2-3 — "FIXED AT THE ROOT" WAS NOT TRUE. v0.62.848 removed the join('|')/split('|')
// round-trip from the HOOK's dependency key and said the class was closed. The CLIENT's
// in-flight key was still `batch.join('|')`, so ['a|b'] and ['a','b'] still collapsed into
// one shared request and the second caller read the first's answers under different names.
// The claim needed a grep for every other instance and did not get one.
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
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

describe('P2-3 — the in-flight key must not collide either', () => {
  it('two different name lists that JOIN to the same string get separate requests', async () => {
    // ['a|b'] and ['a','b'] join to "a|b" identically. Under the old key they shared one
    // in-flight promise and the second caller read the first's response under the wrong
    // names — caching a guide against a name that never asked for one.
    const bodies = [];
    const fetchImpl = async (url, opts) => {
      bodies.push(JSON.parse(opts.body).names);
      // Deliberately slow, so both calls are genuinely in flight together.
      await new Promise((r) => setTimeout(r, 5));
      return { ok: true, json: async () => ({ readings: {} }) };
    };
    await Promise.all([
      client.fetchPronunciations(['a|b'], 'ja', { initData: 'x', fetchImpl }),
      client.fetchPronunciations(['a', 'b'], 'ja', { initData: 'x', fetchImpl }),
    ]);
    expect(bodies, 'the two lists shared one in-flight request').toHaveLength(2);
    expect(bodies).toContainEqual(['a|b']);
    expect(bodies).toContainEqual(['a', 'b']);
  });

  it('and the key itself is JSON, not a delimiter join', () => {
    const src = read('web/_shared/lib/pronounce-client.js')
      .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
    expect(src).toMatch(/const batchKey = `\$\{lang\}::\$\{JSON\.stringify\(batch\)\}`/);
    expect(src, 'the pipe join is back in the in-flight key').not.toMatch(/batch\.join\('\|'\)/);
  });

  it('an identical list still shares one request — dedup must survive the fix', async () => {
    let calls = 0;
    const fetchImpl = async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return { ok: true, json: async () => ({ readings: {} }) };
    };
    await Promise.all([
      client.fetchPronunciations(['a', 'b'], 'ja', { initData: 'x', fetchImpl }),
      client.fetchPronunciations(['a', 'b'], 'ja', { initData: 'x', fetchImpl }),
    ]);
    expect(calls, 'the collision fix broke legitimate de-duplication').toBe(1);
  });
});

describe('P2-2 — the street recogniser is checked against the SHIPPED data', () => {
  it("resolves the two addresses Codex named", () => {
    expect(client.streetOf('925 Yishun Central 1, #01-239, Singapore 760925')).toBe('Yishun Central 1');
    expect(client.streetOf('19 Riverina View, Singapore 518371')).toBe('Riverina View');
  });

  it('covers the suffixes that actually occur, counted from the corpus', () => {
    // Measured in data/**: Wy 476, Central 355, Lp 324, Rise 184. Every one of these was
    // returning '' before, so those venues got no address line at all.
    for (const [addr, want] of [
      ['10 Sinaran Wy, Singapore', 'Sinaran Wy'],
      ['2 Yishun Central, Singapore', 'Yishun Central'],
      ['5 Simei Lp, Singapore', 'Simei Lp'],
      ['8 Serangoon Rise, Singapore', 'Serangoon Rise'],
      ['3 Bedok Rise, Singapore', 'Bedok Rise'],
    ]) expect(client.streetOf(addr), addr).toBe(want);
  });

  it('the recogniser is exercised over REAL addresses from the repo, not invented ones', () => {
    // The point of this test, and the reason P2-2 existed: the original suite used
    // addresses I made up, so it proved the recogniser handled the cases I had thought of.
    // This walks the shipped corpus instead and requires most real addresses to resolve.
    const addrs = [];
    const walk = (dir) => {
      for (const e of readdirSync(join(ROOT, dir))) {
        const rel = `${dir}/${e}`;
        const st = statSync(join(ROOT, rel));
        if (st.isDirectory()) walk(rel);
        else if (e.endsWith('.json') && st.size < 8 * 1024 * 1024) {
          const raw = readFileSync(join(ROOT, rel), 'utf8');
          for (const m of raw.matchAll(/"(?:address|formattedAddress|area)"\s*:\s*"([^"]{8,120})"/g)) {
            addrs.push(m[1]);
          }
        }
      }
    };
    try { walk('data'); } catch { /* no data dir in this checkout */ }
    if (addrs.length < 50) return;   // nothing to measure against; not a failure

    const sample = addrs.slice(0, 4000);
    const sg = sample.filter((a) => /singapore/i.test(a));
    const resolved = sg.filter((a) => client.streetOf(a));
    // Not 100%: some rows are building-only or postcode-only, and those SHOULD return ''.
    // But a large silent gap is exactly what P2-2 was, so the floor is high.
    const rate = sg.length ? resolved.length / sg.length : 1;
    expect(rate, `only ${(rate * 100).toFixed(1)}% of ${sg.length} real SG addresses resolved`)
      .toBeGreaterThan(0.8);
  });

  it('still refuses a postcode-only address — widening must not become matching everything', () => {
    expect(client.streetOf('Singapore 059291')).toBe('');
    expect(client.streetOf('')).toBe('');
  });

  it('and does not treat building words as streets', () => {
    // Plaza/Mall/Centre/Tower are buildings. Matching them would key the cache on a
    // building rather than a road, fragmenting it for no gain.
    const src = read('web/_shared/lib/pronounce-client.js');
    const m = src.match(/const STREET_TYPE = \/\\b\(([^)]*)\)/);
    expect(m, 'STREET_TYPE not found').toBeTruthy();
    const types = m[1].split('|');
    for (const banned of ['plaza', 'mall', 'centre', 'center', 'tower', 'building']) {
      expect(types, `${banned} is a building, not a street`).not.toContain(banned);
    }
  });
});

describe('P2-1 — the map markers rebuild when the guides arrive', () => {
  it('MapPanel takes the projection and keys its marker sync on it', () => {
    const src = read('web/cuisine/src/v2/components/MapPanel.jsx');
    expect(src).toMatch(/export default function MapPanel\(\{ venues, pronunciations = null,/);
    expect(src, 'the sync effect still ignores pronunciations — guides appear only on a revisit')
      .toMatch(/syncMarkers\(\); \}, \[venues, userLoc, searchCenter\?\.lat, searchCenter\?\.lng, pronunciations\]/);
  });

  it('and the popup reads the same projection the cards use', () => {
    const src = read('web/cuisine/src/v2/components/MapPanel.jsx');
    expect(src).toMatch(/const sayOf = \(n\) => \(pronunciations && pronunciations\.get\(n\)\) \|\| cachedPronunciation\(n, lang\)/);
    expect(src).toMatch(/const nameSay = sayOf\(v\.name \|\| ''\)/);
    expect(src).toMatch(/const vStreetSay = vStreet \? sayOf\(vStreet\) : null/);
  });

  it('App keeps the hook result instead of discarding it, and passes it down', () => {
    const src = read('web/cuisine/src/v2/App.jsx');
    expect(src).toMatch(/const venueSay = usePronunciations\(venueSayNames, lang, \{ initData \}\)/);
    expect(src).toMatch(/pronunciations=\{venueSay\}/);
  });
});
