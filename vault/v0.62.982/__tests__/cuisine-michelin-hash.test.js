// cuisine-michelin-hash.test.js — v0.62.700 (Register O-124)
//
// The Michelin ticks survive a refresh through the URL hash. Before v0.62.700
// that used one param per year (`michY26`, `michY25`), which is the same
// hardcoding as the server's 2026/2025 pair and fails the same way: a '27
// edition has no param, so switching it off would not survive a reload and
// nothing would say why.
//
// v0.62.700 replaces the pair with one `michYoff` list. These tests cover the
// round trip, the legacy links that are still out there, and the convention
// that makes the whole thing work — only OFF is ever written, so absence means
// ON for editions that do not exist yet.
//
// Node-only, per vitest.config.js: state.js touches `window`/`history` behind
// guards, so the test installs the two globals it reads rather than pulling in
// jsdom for three properties.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

let readFromHash;
let writeToHash;
let defaultState;

beforeEach(async () => {
  globalThis.window = { location: { hash: '' } };
  globalThis.history = {
    replaceState: (_s, _t, url) => { globalThis.window.location.hash = String(url); }
  };
  ({ readFromHash, writeToHash, defaultState } = await import('../web/cuisine/src/v2/lib/state.js'));
});

afterEach(() => {
  delete globalThis.window;
  delete globalThis.history;
});

const withHash = (h) => { globalThis.window.location.hash = h; return readFromHash(); };
const hashOf = (mf) => {
  const s = defaultState();
  s.michelinFilter = mf;
  writeToHash(s);
  return globalThis.window.location.hash.replace(/^#/, '');
};

describe('default michelinFilter', () => {
  it('is empty — absence means every edition is on', () => {
    expect(defaultState().michelinFilter).toEqual({});
  });

  it('writes nothing to the hash', () => {
    expect(hashOf({})).toBe('');
  });
});

describe('writeToHash', () => {
  it('lists only the years switched OFF, newest first', () => {
    expect(hashOf({ year2025: false, year2026: false })).toBe('michYoff=2026%2C2025');
  });

  it('writes bib separately — it is its own bucket', () => {
    expect(hashOf({ bib: false })).toBe('michBib=0');
  });

  it('never writes a year that is ON', () => {
    expect(hashOf({ year2026: true, year2025: false })).toBe('michYoff=2025');
  });

  it('carries a year no code has ever named', () => {
    expect(hashOf({ year2027: false })).toBe('michYoff=2027');
  });
});

describe('readFromHash', () => {
  it('round-trips a multi-year list', () => {
    expect(withHash('#michYoff=2026,2025').michelinFilter)
      .toEqual({ year2026: false, year2025: false });
  });

  it('round-trips a future edition', () => {
    expect(withHash('#michYoff=2027').michelinFilter).toEqual({ year2027: false });
  });

  it('ignores malformed year entries rather than inventing keys', () => {
    expect(withHash('#michYoff=20xx,,2026,26').michelinFilter).toEqual({ year2026: false });
  });

  it('still honours links shared while v0.62.676–699 were live', () => {
    expect(withHash('#michY26=0&michBib=0').michelinFilter)
      .toEqual({ year2026: false, bib: false });
    expect(withHash('#michY25=0').michelinFilter).toEqual({ year2025: false });
  });

  it('merges a legacy param with the new list', () => {
    expect(withHash('#michYoff=2027&michY25=0').michelinFilter)
      .toEqual({ year2027: false, year2025: false });
  });

  it('leaves the filter empty when the hash says nothing about Michelin', () => {
    expect(withHash('#region=SG').michelinFilter).toEqual({});
  });
});

describe('round trip', () => {
  it('survives write → read unchanged', () => {
    const mf = { year2026: false, year2027: false, bib: false };
    const back = withHash('#' + hashOf(mf)).michelinFilter;
    expect(back).toEqual(mf);
  });
});
