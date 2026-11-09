// results-origin-removed.test.js — v0.62.973. Spec: doc/Feature/2026-11-04-remove-non-ai-results-line.spec.md.
//
// Operator, 04-11 '26, asked of the Cuisine footer line "Traditional / Non-AI results": "Is this line necessary ? …
// how does it help user", and chose "Remove it (recommended)." It flagged the default mode on almost every search, in
// builder language, with nothing to act on. v0.62.943 added it (spec 2026-10-26-lever-inside-bar-and-results-origin-
// flag, I3/I4) together with plumbing that existed only to feed it. This file replaces results-origin-flag.test.js
// and guards that neither the line nor its plumbing comes back. The layout itself is proved by a render of the built
// app; React is not installed where these tests run.
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// Code only: block comments and whole-line comments removed, so a history note naming the old line is not a hit.
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') out.push(...walk(rel)); } else if (/\.(js|jsx)$/.test(e.name)) out.push(rel);
  }
  return out;
}

describe('I1 — the line and everything that fed it are gone from Cuisine', () => {
  const files = walk('web/cuisine/src');
  it('the census reads real files', () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files).toContain(path.join('web/cuisine/src/v2/App.jsx'));
  });
  for (const needle of ['footer.nonAi', 'resultsOrigin', 'setResultsOrigin', 'RESULTS_ORIGIN', 'resultsFlagKey', 'results-origin', 'Non-AI results']) {
    it(`no code in web/cuisine/src mentions ${needle}`, () => {
      const hits = files.filter((f) => code(read(f)).includes(needle));
      expect(hits, needle).toEqual([]);
    });
  }
  it('the module that decided the flag is deleted', () => {
    expect(fs.existsSync(path.join(ROOT, 'web/cuisine/src/v2/lib/results-origin.js'))).toBe(false);
  });
});

describe('I3 — no locale still holds the string', () => {
  it('i18n.js has no footer.nonAi line in any of its nine locale blocks', () => {
    const lines = read('web/cuisine/src/v2/lib/i18n.js').split('\n').filter((l) => l.includes('footer.nonAi'));
    expect(lines).toEqual([]);
  });
});

describe('I4 — a language reload no longer carries the origin', () => {
  it('LOCALE_STASH.carried does not list resultsOrigin; the other carried fields stay', () => {
    const src = read('web/cuisine/src/v2/lib/state.js');
    const at = src.indexOf('carried: [');
    const carried = src.slice(at, src.indexOf(']', at));
    expect(carried).not.toMatch(/resultsOrigin/);
    for (const k of ['venues', 'searchCenter', 'userLoc', 'selectedCityLocation', 'locationAnchor', 'searchLocName']) expect(carried).toContain(`'${k}'`);
  });
});

describe('I2 — the neighbours of the removed line stay', () => {
  it('the footer still has the run buttons and the Experimental tag', () => {
    const app = code(read('web/cuisine/src/v2/App.jsx'));
    expect(app).toMatch(/<FooterRunButtons /);
    expect(app).toMatch(/\{t\('footer\.experimental', lang\)\} · v\{BUILD_VERSION\}/);
  });
});
