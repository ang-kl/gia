// __tests__/pronounce-pipe-names.test.js — v0.62.848.
//
// Codex, PR #1791 (P1), and it was right: the pronunciation path round-tripped the name
// list through a pipe — `names.join('|')` then `dep.split('|')`. A venue whose NAME
// contains a pipe was therefore torn into two unrelated names. The cache filled up under
// the fragments while `ResultCard` looked up the WHOLE name, so the guide never appeared
// and the stale search-payload line survived a locale change.
//
// That is the exact symptom the previous three versions were spent chasing, arriving by a
// fourth route: v0.62.845 fixed which language the server was told, v0.62.846 made the
// answer reactive, v0.62.847 stopped the map accumulating — and a pipe in a name would
// still have shown the operator a stale line.
//
// THE DATA IS REAL, and was re-read before acting rather than taken from the review:
// `data/durian-variance/durian-pastry-gemini-verified-2026-05-30_1143.json` carries
// "Ji De Chi 记得吃甜品 | Square 2 Novena" and "Ji De Chi 记得吃甜品 | 321 Clementi Ave 3".
//
// AND THE FIX IS NOT A RARER DELIMITER. Any character can occur in a name, so a "safer"
// separator only moves the failure somewhere less testable. The list is no longer rebuilt
// from a string at all; JSON is used solely as a dependency key, where escaping makes
// collisions impossible.
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

const PIPED = 'Ji De Chi 记得吃甜品 | Square 2 Novena';

describe('a pipe in a venue name is data, not a separator', () => {
  it('the name reaches the server WHOLE', async () => {
    const calls = [];
    await client.fetchPronunciations([PIPED, 'Maxwell Food Centre'], 'ja', {
      initData: 'x',
      fetchImpl: async (url, opts) => {
        calls.push(JSON.parse(opts.body));
        return { ok: true, json: async () => ({ [PIPED]: 'ジ・デ・チー' }) };
      },
    });
    expect(calls[0].names, 'the name was split into fragments').toContain(PIPED);
    expect(calls[0].names).toHaveLength(2);
  });

  it('and the answer is retrievable under the whole name, which is what the card looks up', async () => {
    await client.fetchPronunciations([PIPED], 'ja', {
      initData: 'x',
      fetchImpl: async () => ({ ok: true, json: async () => ({ readings: { [PIPED]: 'ジ・デ・チー' } }) }),
    });
    expect(client.cachedPronunciation(PIPED, 'ja')).toBe('ジ・デ・チー');
    // The fragments must NOT be what got cached.
    expect(client.cachedPronunciation('Ji De Chi 记得吃甜品 ', 'ja')).toBeUndefined();
    expect(client.cachedPronunciation(' Square 2 Novena', 'ja')).toBeUndefined();
  });

  it('the projection returns it under the whole name too', async () => {
    await client.fetchPronunciations([PIPED], 'ja', {
      initData: 'x',
      fetchImpl: async () => ({ ok: true, json: async () => ({ readings: { [PIPED]: 'ジ・デ・チー' } }) }),
    });
    const m = client.projectPronunciations([PIPED], 'ja');
    expect(m.get(PIPED)).toBe('ジ・デ・チー');
    expect(m.size).toBe(1);
  });

  it('two names that would collide once joined stay distinct', async () => {
    // ['a|b'] and ['a','b'] join to the SAME string. Any delimiter has this property,
    // which is why the list is no longer reconstructed from one.
    expect(JSON.stringify(['a|b'])).not.toBe(JSON.stringify(['a', 'b']));
    expect(['a|b'].join('|'), 'the old key could not tell these apart').toBe(['a', 'b'].join('|'));
  });
});

describe('the list is never rebuilt from a delimiter', () => {
  // Comments are stripped before the negative assertions. The first draft did not, and
  // failed on this module's OWN comment explaining the bug it fixed — the same shape as
  // the bare-`fr` guard that once flagged a comment listing locale codes. Fix the check,
  // not the prose: a guard that cries wolf on documentation gets ignored, and that is how
  // the next real hit is missed.
  const codeOf = (p) => read(p)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');

  it('the hook passes the array through and keys on JSON', () => {
    const src = codeOf('web/_shared/lib/use-pronounce.js');
    expect(src).toMatch(/const dep = JSON\.stringify\(list\);/);
    expect(src).toMatch(/projectPronunciations\(stableList, lang, curatedFor\)/);
    expect(src).toMatch(/fetchPronunciations\(stableList, lang/);
    expect(src, "the list is still being reconstructed by splitting").not.toMatch(/dep\.split\('\|'\)/);
    expect(src, 'the pipe join is back').not.toMatch(/names\.filter\(Boolean\)\.join\('\|'\)/);
  });

  it('the cuisine App does the same', () => {
    const src = codeOf('web/cuisine/src/v2/App.jsx');
    expect(src).toMatch(/const venueSayKey = JSON\.stringify\(venueNamesRaw\);/);
    expect(src).toMatch(/\[\.\.\.new Set\(venueNamesRaw\)\]/);
    expect(src, 'the cuisine key still splits on a pipe').not.toMatch(/venueSayKey\.split\('\|'\)/);
  });

  it('the repo really does contain a piped venue name — the premise, re-read', () => {
    const raw = read('data/durian-variance/durian-pastry-gemini-verified-2026-05-30_1143.json');
    expect(raw, 'the premise is gone; re-check before trusting this test')
      .toContain('Ji De Chi 记得吃甜品 | Square 2 Novena');
  });
});
