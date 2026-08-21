// gemini-models.test.js — v0.62.722
//
// Google retired the whole Gemini 2.5 line on 21-08 '26 ("no longer available
// to new users", HTTP 404). Eleven files in this repo carried hardcoded 2.5
// names, so every Gemini feature failed at once and each site had to be found
// by grep. The point of gemini-models.js is that there is now one site.
//
// The test that matters here is the last one: it fails if anyone reintroduces a
// retired model name as a literal in live source. A unit test for the constants
// alone would not have caught the original outage — the constants were fine in
// their own file; the copies elsewhere were the problem.

import { describe, it, expect, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import { FLASH, LITE, LATEST, MODEL_CHAIN, RETIRED, defaultModel } from '../gemini-models.js';

describe('gemini-models', () => {
  it('names Google\'s published replacements for the two models this repo was pinned to', () => {
    // Verbatim from the 404 bodies in the operator's Railway logs, 21-08 '26.
    expect(RETIRED['gemini-2.5-flash']).toBe('gemini-3.6-flash');
    expect(RETIRED['gemini-2.5-flash-lite']).toBe('gemini-3.5-flash-lite');
    expect(FLASH).toBe('gemini-3.6-flash');
    expect(LITE).toBe('gemini-3.5-flash-lite');
  });

  it('puts the proven-resolving alias first in the chain', () => {
    // LATEST answered 429 (billing) rather than 404 in the same logs, so it is
    // the only entry with live evidence that the name still resolves at all.
    expect(MODEL_CHAIN[0]).toBe(LATEST);
    expect(MODEL_CHAIN).toEqual([LATEST, FLASH, LITE]);
  });

  it('contains no retired name', () => {
    for (const m of MODEL_CHAIN) expect(RETIRED[m]).toBeUndefined();
  });

  it('is every-entry-flash — a fallback must never be a slow model', () => {
    for (const m of MODEL_CHAIN) expect(m).toMatch(/flash/);
  });

  it('honours GEMINI_MODEL even when the name is retired, but says so', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // Honouring beats rewriting: the operator sets this var in Railway, and a
    // module that silently disagrees with the environment makes the next
    // outage harder to read, not easier.
    expect(defaultModel({ GEMINI_MODEL: 'gemini-2.5-flash-lite' })).toBe('gemini-2.5-flash-lite');
    expect(warn.mock.calls[0][0]).toContain('gemini-3.5-flash-lite');
    warn.mockRestore();
  });

  it('does not warn for a live model, and falls back to FLASH when unset', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(defaultModel({ GEMINI_MODEL: LITE })).toBe(LITE);
    expect(defaultModel({})).toBe(FLASH);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('no live source file hardcodes a retired model name', () => {
    // Comments are allowed to name retired models — the history is the reason
    // this file exists — so only non-comment lines are considered.
    const names = Object.keys(RETIRED).concat(['gemini-2.5-pro', 'gemini-2.0-flash']);
    let out = '';
    try {
      // -a matters: name-gloss.js holds raw CJK gloss data and git classifies
      // it as binary, so without it that file is skipped — which is exactly how
      // its copy of the dead chain survived the manual sweep.
      out = execFileSync('git', ['grep', '-n', '-a', '-E', names.join('|'), '--',
        '*.js', '*.mjs',
        ':(exclude)__tests__/*', ':(exclude)node_modules/*',
        ':(exclude)log/*', ':(exclude)data/*',
        ':(exclude)gemini-models.js',
        // api-cost.js keeps retired names ON PURPOSE: Redis holds per-day
        // receipts stamped with them and /cost must price history correctly.
        ':(exclude)api-cost.js'], { encoding: 'utf8' });
    } catch (err) {
      if (err.status !== 1) throw err;   // 1 = no matches, which is the pass case
    }
    const offenders = out.split('\n').filter((l) => {
      if (!l) return false;
      // git grep emits "path:lineno:code".
      const code = l.slice(l.indexOf(':', l.indexOf(':') + 1) + 1);
      const stripped = code.replace(/\/\/.*$/, '');   // drop trailing comments too
      if (/^\s*(\/\/|\*|\/\*)/.test(code)) return false;
      return new RegExp(names.join('|')).test(stripped);
    });
    expect(offenders, `retired model names in live code:\n${offenders.join('\n')}`).toEqual([]);
  });
});
