// cuisine-search-cache.test.js — v0.62.893
//
// THE CACHE ON THE APP'S HIGHEST-VOLUME PAID ENDPOINT WAS OFF, AND THE COMMENT
// EXPLAINING WHY WAS RIGHT. `const skipCache = true;` disabled both the read and
// the write on /api/cuisine/search. It was put there at v0.60.11 because the
// operator reported a real regression: "the 3 search buttons can't refresh after
// the first list" — tapping 🔍 Search, the search FAB or the Tell-Me arrow inside
// 30 s served the SAME list. Simply deleting the line reinstates that bug.
//
// What v0.60.11 threw away with it: `cacheKey` has NO chatId in it — region,
// rounded coords, radius, cuisines, filters, prices, locale. It is a POOL key, so
// two different people searching the same thing in the same place share it. The
// flag was aimed at one person tapping twice and hit everybody else as collateral:
// every tap re-bought ~3 searchText pages, Place Details, a Routes matrix, the
// Gemini dish pass and N Claude calls.
//
// So the bypass is scoped to the thing that actually regressed — the same chat
// asking for the same key again — and this file exists to make sure it stays
// scoped that way in both directions.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const SRC = readFileSync(join(__dirname, '..', 'index.js'), 'utf8');

// SEVENTH occurrence of this trap in this repo, and it caught this very file: the
// comment above the write block mentions `skipCacheRead` in order to say the write
// does NOT consult it, so a negative scan matched the explanation rather than the
// code. Lifted verbatim from bot-ternary-sweep.test.js.
function maskComments(src) {
  let out = '', i = 0; const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = src.indexOf('\n', i); if (j < 0) j = n; out += ' '.repeat(j - i); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i); j = j < 0 ? n : j + 2; out += src.slice(i, j).replace(/[^\n]/g, ' '); i = j; continue; }
    if (c === '"' || c === "'" || c === '`') {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === '\\') j++; j++; }
      out += src.slice(i, Math.min(j + 1, n)); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}
// The /api/cuisine/search body, so an unrelated `skipCache` elsewhere cannot
// satisfy or break these assertions by accident.
const REGION = SRC.slice(SRC.indexOf('const cacheKey = `cuisine:search:v3:'), SRC.indexOf("[Cuisine-Search] cache write failed"));

describe('the pool cache is on, and a repeat tap still gets a fresh list', () => {
  it('the unconditional kill switch is gone', () => {
    expect(REGION, 'v0.60.11 unconditional skip').not.toMatch(/const skipCache = true;/);
    expect(SRC).not.toMatch(/const skipCache = true;/);
  });

  it('the read is bypassed only for a chat that has already seen this exact key', () => {
    expect(REGION).toMatch(/let skipCacheRead = true;/);
    expect(REGION, 'the per-chat seen key').toMatch(
      /seenKey = `cuisine:seen:\$\{csChatId\}:\$\{crypto\.createHash\('sha1'\)\.update\(cacheKey\)\.digest\('hex'\)\}`/,
    );
    expect(REGION, 'a repeat sets skipCacheRead').toMatch(/skipCacheRead = Boolean\(repeatTap\);/);
    expect(REGION, 'and the marker is re-stamped so the window slides').toMatch(
      /await redis\.setEx\(seenKey, SEARCH_CACHE_TTL_S, '1'\);/,
    );
    expect(REGION).toMatch(/if \(redis\.isOpen && !skipCacheRead\) \{/);
  });

  it('IT FAILS TO FRESH, never to stale — the direction that matters', () => {
    // No Redis, no chatId, or a Redis error must all leave the read bypassed. The
    // cost of guessing wrong here is showing someone a stale list, which is the
    // exact thing this endpoint has already been punished for once.
    expect(REGION, 'default before any probe').toMatch(/let skipCacheRead = true;\n\s*let seenKey = null;/);
    expect(REGION, 'the probe only runs with BOTH redis and a chatId')
      .toMatch(/if \(redis\.isOpen && csChatId\) \{/);
    expect(REGION, 'a probe failure falls back to fresh')
      .toMatch(/catch \(err\) \{[\s\S]*?skipCacheRead = true;\n\s*\}/);
  });

  it('the WRITE is not gated on the repeat bypass — that is the saving', () => {
    // A repeat tap skips the read, re-runs Places, and writes the fresh result
    // back. The next person's first tap is then free. Gating the write on
    // skipCacheRead would quietly halve the benefit and nothing would show it.
    const write = SRC.slice(SRC.indexOf('const cacheableResult = top.length >= 3;'), SRC.indexOf("[Cuisine-Search] cache write failed"));
    expect(write).toMatch(/if \(redis\.isOpen && cacheableResult\) \{/);
    expect(maskComments(write), 'the write must NOT consult skipCacheRead').not.toMatch(/skipCacheRead/);
    expect(write, 'thin result sets still bypass the write, as before').toContain('cacheableResult');
  });

  it('the key is still a POOL key — adding a chatId would delete the whole benefit', () => {
    // If the cache key ever gains a per-user dimension, the cross-user hit rate
    // goes to zero and this change becomes pure complexity. The seen-marker is the
    // only thing that should be per-chat.
    const key = SRC.slice(SRC.indexOf('const cacheKey = `cuisine:search:v3:'), SRC.indexOf('const skipCacheForSingaporean'));
    expect(key).not.toMatch(/csChatId/);
    expect(key).toMatch(/\$\{region\}/);
    expect(key).toMatch(/l\$\{csLang\}/);
  });

  it('the 30-second window is unchanged', () => {
    expect(REGION).toMatch(/const SEARCH_CACHE_TTL_S = 30;/);
  });
});
